import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { logger } from "./logger";

export interface ValidatedFile {
  filePath: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  pageCount?: number;
}

export class TempFileManager {
  private tempDir: string;
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size limit
  private readonly ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ]);
  private activeFiles = new Set<string>();

  constructor(customTempDir?: string) {
    this.tempDir = customTempDir || this.resolveTempDir();
    this.ensureDirectory();
    this.cleanupOrphanFiles();
  }

  private resolveTempDir(): string {
    try {
      const { app } = require("electron");
      if (app && typeof app.getPath === "function") {
        return path.join(app.getPath("userData"), "spool");
      }
    } catch {
      // Not in Electron
    }
    return path.join(os.tmpdir(), "print2me-workstation-spool");
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
      }
    } catch (err) {
      logger.error(`Failed to create temp spool directory: ${err}`);
    }
  }

  /**
   * Generates a safe, unguessable temporary file path preventing directory traversal
   */
  public generateSecureTempPath(originalFilename: string, prefix = "job"): string {
    this.ensureDirectory();
    const rawExt = path.extname(originalFilename || "").toLowerCase();
    const safeExt = [".pdf", ".jpg", ".jpeg", ".png"].includes(rawExt) ? rawExt : ".bin";
    const randomHex = crypto.randomBytes(12).toString("hex");
    const safeBaseName = `${prefix}_${Date.now()}_${randomHex}${safeExt}`;
    const resolvedPath = path.resolve(this.tempDir, safeBaseName);

    // Guard against directory traversal
    if (!resolvedPath.startsWith(path.resolve(this.tempDir))) {
      throw new Error("Security alert: Illegal path traversal detected in file generation");
    }

    return resolvedPath;
  }

  /**
   * Validates document payload (magic bytes, size, PDF integrity, encryption) and writes securely to disk
   */
  public async writeAndValidateBuffer(
    buffer: Buffer,
    expectedFilename: string,
    claimedMimeType?: string
  ): Promise<ValidatedFile> {
    if (!buffer || buffer.length === 0) {
      throw new Error("Downloaded document payload is empty (0 bytes)");
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(
        `Document exceeds maximum allowable size of ${(this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`
      );
    }

    // Inspect Magic Bytes to confirm authentic file type
    const detectedMime = this.detectMimeFromMagicBytes(buffer);
    if (!detectedMime) {
      throw new Error("Security rejection: Document file format is unrecognized or unsupported");
    }

    if (!this.ALLOWED_MIME_TYPES.has(detectedMime)) {
      throw new Error(`Security rejection: MIME type '${detectedMime}' is not permitted for printing`);
    }

    // Additional deep validation for PDF documents
    if (detectedMime === "application/pdf") {
      this.validatePdfStructure(buffer);
    }

    // Compute SHA-256 for integrity auditing
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

    const tempFilePath = this.generateSecureTempPath(expectedFilename);
    await fs.promises.writeFile(tempFilePath, buffer, { mode: 0o600 });
    this.activeFiles.add(tempFilePath);

    logger.info(
      `Validated and written temporary document: ${path.basename(tempFilePath)} (${(buffer.length / 1024).toFixed(1)} KB, ${detectedMime})`
    );

    return {
      filePath: tempFilePath,
      filename: path.basename(expectedFilename || "document.pdf"),
      fileSizeBytes: buffer.length,
      mimeType: detectedMime,
      sha256Hash,
    };
  }

  /**
   * Inspects basic PDF structure and checks for encryption / corruption
   */
  private validatePdfStructure(buf: Buffer): void {
    // 1. Minimum valid PDF size is ~20 bytes (e.g. %PDF-1.0\n%%EOF)
    if (buf.length < 20) {
      throw new Error("Corrupted document: PDF file is too small to contain valid structure.");
    }

    // 2. Check for PDF header (%PDF-1.x)
    const headerSlice = buf.subarray(0, 1024).toString("latin1");
    if (!headerSlice.includes("%PDF-")) {
      throw new Error("Corrupted document: Missing valid %PDF header.");
    }

    // 3. Check for PDF trailer / EOF marker in the last 4096 bytes
    const tailSlice = buf.subarray(Math.max(0, buf.length - 4096)).toString("latin1");
    if (!tailSlice.includes("%%EOF") && !buf.toString("latin1").includes("%%EOF")) {
      throw new Error("Corrupted document: Missing %%EOF marker (file may be truncated or incomplete).");
    }

    // 4. Check for Password Protection / Encryption (/Encrypt)
    // Fast binary search for /Encrypt token in PDF dictionary
    const entireContent = buf.toString("latin1");
    const encryptMatch = entireContent.match(/\/Encrypt\s+(\d+\s+\d+\s+R|[<\[{])/);
    if (encryptMatch) {
      throw new Error(
        "Document is password-protected or encrypted. Print2Me cannot print password-locked PDFs."
      );
    }
  }

  /**
   * Detects real file format using header magic numbers
   */
  public detectMimeFromMagicBytes(buf: Buffer): string | null {
    if (buf.length >= 4) {
      // PDF: %PDF (0x25 0x50 0x44 0x46)
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return "application/pdf";
      }
      // PNG: 0x89 0x50 0x4E 0x47
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return "image/png";
      }
      // JPEG: 0xFF 0xD8 0xFF
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return "image/jpeg";
      }
    }
    return null;
  }

  /**
   * Safely deletes temporary file after spooling with optional delay
   * Delayed deletion ensures Windows Print Spooler finishes reading before file is unlinked!
   */
  public cleanupFile(filePath?: string, delayMs = 30000): void {
    if (!filePath) return;
    this.activeFiles.delete(filePath);

    const doDelete = () => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up temporary document: ${path.basename(filePath)}`);
        }
      } catch (err) {
        logger.warn(`Could not remove temp file ${filePath}: ${err}`);
      }
    };

    if (delayMs <= 0) {
      doDelete();
    } else {
      setTimeout(doDelete, delayMs);
    }
  }

  /**
   * Scans and purges any leftover spool files older than 30 minutes on agent start
   */
  public cleanupOrphanFiles(): void {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAgeMs = 30 * 60 * 1000; // 30 minutes

      for (const file of files) {
        const fullPath = path.join(this.tempDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
            logger.info(`Purged orphaned spool file: ${file}`);
          }
        } catch {
          // Ignore individual file error
        }
      }
    } catch (err) {
      logger.warn(`Orphan cleanup notice: ${err}`);
    }
  }
}

export const tempFileManager = new TempFileManager();
