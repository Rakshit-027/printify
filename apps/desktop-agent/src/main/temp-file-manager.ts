import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export interface ValidatedFile {
  filePath: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
}

export class TempFileManager {
  private tempDir: string;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max file size limit
  private readonly ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]);

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'print2me-workstation-spool');
    this.ensureDirectory();
    this.cleanupOrphanFiles();
  }

  /**
   * Ensures the isolated temp directory exists with restricted user-only permissions
   */
  private ensureDirectory() {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true, mode: 0o700 });
      }
    } catch (err) {
      console.error('[TEMP-MGR] Failed to create secure temp directory:', err);
    }
  }

  /**
   * Generates a safe, unguessable temporary file path preventing directory traversal
   */
  public generateSecureTempPath(originalFilename: string, prefix = 'job'): string {
    this.ensureDirectory();
    const rawExt = path.extname(originalFilename).toLowerCase();
    const safeExt = ['.pdf', '.jpg', '.jpeg', '.png'].includes(rawExt) ? rawExt : '.bin';
    const randomHex = crypto.randomBytes(12).toString('hex');
    const safeBaseName = `${prefix}_${Date.now()}_${randomHex}${safeExt}`;
    const resolvedPath = path.resolve(this.tempDir, safeBaseName);

    // Guard against directory traversal
    if (!resolvedPath.startsWith(path.resolve(this.tempDir))) {
      throw new Error('Security alert: Illegal path traversal detected in file generation');
    }

    return resolvedPath;
  }

  /**
   * Validates downloaded file buffer and writes securely to disk
   */
  public async writeAndValidateBuffer(
    buffer: Buffer,
    expectedFilename: string,
    claimedMimeType?: string
  ): Promise<ValidatedFile> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Downloaded document payload is empty (0 bytes)');
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`Document exceeds maximum allowable size of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Inspect Magic Bytes to confirm authentic file type
    const detectedMime = this.detectMimeFromMagicBytes(buffer);
    if (!detectedMime) {
      throw new Error('Security rejection: Document file format is unrecognized or unsupported');
    }

    if (!this.ALLOWED_MIME_TYPES.has(detectedMime)) {
      throw new Error(`Security rejection: MIME type '${detectedMime}' is not permitted for printing`);
    }

    // If a claimed MIME type was specified, verify compatibility
    if (claimedMimeType && claimedMimeType !== detectedMime) {
      const isBothJpeg =
        (claimedMimeType === 'image/jpeg' || claimedMimeType === 'image/jpg') &&
        (detectedMime === 'image/jpeg' || detectedMime === 'image/jpg');
      if (!isBothJpeg) {
        console.warn(`[TEMP-MGR] Claimed MIME (${claimedMimeType}) differs from detected (${detectedMime})`);
      }
    }

    // Compute SHA-256 for integrity auditing
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const tempFilePath = this.generateSecureTempPath(expectedFilename);
    await fs.promises.writeFile(tempFilePath, buffer, { mode: 0o600 });

    return {
      filePath: tempFilePath,
      filename: path.basename(expectedFilename),
      fileSizeBytes: buffer.length,
      mimeType: detectedMime,
      sha256Hash,
    };
  }

  /**
   * Detects real file format using header magic numbers
   */
  public detectMimeFromMagicBytes(buf: Buffer): string | null {
    if (buf.length >= 4) {
      // PDF: %PDF (0x25 0x50 0x44 0x46)
      if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return 'application/pdf';
      }
      // PNG: 0x89 0x50 0x4E 0x47
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
        return 'image/png';
      }
      // JPEG: 0xFF 0xD8 0xFF
      if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return 'image/jpeg';
      }
    }
    return null;
  }

  /**
   * Safely deletes temporary file after spooling
   */
  public cleanupFile(filePath?: string) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[TEMP-MGR] Cleaned up temporary document: ${path.basename(filePath)}`);
      }
    } catch (err) {
      console.warn(`[TEMP-MGR] Could not remove temp file ${filePath}:`, err);
    }
  }

  /**
   * Scans and purges any leftover spool files older than 2 hours on agent start
   */
  public cleanupOrphanFiles() {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      for (const file of files) {
        const fullPath = path.join(this.tempDir, file);
        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > twoHoursMs) {
            fs.unlinkSync(fullPath);
            console.log(`[TEMP-MGR] Purged orphaned spool file: ${file}`);
          }
        } catch {
          // Ignore individual file error
        }
      }
    } catch (err) {
      console.warn('[TEMP-MGR] Orphan cleanup notice:', err);
    }
  }
}

export const tempFileManager = new TempFileManager();
