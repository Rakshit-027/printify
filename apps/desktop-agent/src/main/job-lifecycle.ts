import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "./logger";

export type JobLifecycleState =
  | "RECEIVED"
  | "VALIDATING"
  | "DOWNLOADING"
  | "READY_TO_PRINT"
  | "SUBMITTING"
  | "SUBMITTED_TO_SPOOLER"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED"
  | "NEEDS_ATTENTION"
  | "CANCELLED";

export interface PrintJobRecord {
  jobId: string;
  orderId: string;
  orderNumber: string;
  idempotencyKey: string;
  state: JobLifecycleState;
  printerName: string;
  windowsJobId?: number;
  totalCopies: number;
  colorMode: string;
  paperSize: string;
  duplexMode: string;
  pageRange?: string;
  documentName: string;
  fileSizeBytes?: number;
  sha256Hash?: string;
  totalPages?: number;
  pagesPrinted?: number;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  completedAt?: string;
  lastErrorMessage?: string;
  retryCount: number;
  requiresVendorReview?: boolean;
}

export class JobLifecycleManager {
  private historyFile: string;
  private jobs: Map<string, PrintJobRecord> = new Map();

  constructor(customHistoryFile?: string) {
    this.historyFile = customHistoryFile || this.resolveHistoryPath();
    this.loadHistory();
    this.reconcileInterruptedJobsOnStartup();
  }

  private resolveHistoryPath(): string {
    try {
      const { app } = require("electron");
      if (app && typeof app.getPath === "function") {
        return path.join(app.getPath("userData"), "jobs-history.json");
      }
    } catch {
      // Not in Electron
    }

    const appData =
      process.env.APPDATA ||
      (process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : path.join(os.homedir(), ".config"));
    return path.join(appData, "Print2Me Desktop Agent", "jobs-history.json");
  }

  private loadHistory() {
    if (!fs.existsSync(this.historyFile)) {
      // Check legacy path in homedir for backward compatibility migration
      const legacyPath = path.join(os.homedir(), ".printflow", "jobs-history.json");
      if (fs.existsSync(legacyPath)) {
        try {
          const raw = fs.readFileSync(legacyPath, "utf-8");
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            for (const j of list) {
              if (j.idempotencyKey) this.jobs.set(j.idempotencyKey, j);
            }
            this.persist();
            try { fs.unlinkSync(legacyPath); } catch {}
            return;
          }
        } catch {
          // ignore legacy failure
        }
      }
      return;
    }

    try {
      const raw = fs.readFileSync(this.historyFile, "utf-8");
      const list: PrintJobRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const j of list) {
          if (j.idempotencyKey) {
            this.jobs.set(j.idempotencyKey, j);
          }
        }
      }
      logger.info(`Loaded ${this.jobs.size} print job records from durable history.`);
    } catch (err: any) {
      logger.error(`Error reading job history: ${err.message}`);
    }
  }

  private persist() {
    try {
      const dataDir = path.dirname(this.historyFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.jobs.values())
        // Keep the latest 500 records
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 500);

      const tmpFile = `${this.historyFile}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), "utf-8");
      fs.renameSync(tmpFile, this.historyFile);
    } catch (err: any) {
      logger.error(`Failed to persist job history: ${err.message}`);
    }
  }

  /**
   * On application startup, safely reconcile jobs that were in-flight when app crashed or was shut down
   */
  private reconcileInterruptedJobsOnStartup() {
    let modified = false;
    for (const job of this.jobs.values()) {
      if (job.state === "SUBMITTING" || job.state === "PRINTING") {
        // We cannot guarantee whether Windows Spooler accepted it completely or printed paper
        job.state = "NEEDS_ATTENTION";
        job.requiresVendorReview = true;
        job.lastErrorMessage =
          "Workstation restarted while job was being spooled/printed. Please check physical printer tray before retrying.";
        job.updatedAt = new Date().toISOString();
        modified = true;
        logger.warn(
          `Job ${job.orderNumber} flagged as NEEDS_ATTENTION following workstation restart.`
        );
      } else if (job.state === "DOWNLOADING" || job.state === "VALIDATING") {
        // File was not yet sent to printer spooler, safe to set FAILED or allow retry
        job.state = "FAILED";
        job.lastErrorMessage = "Interrupted during download/validation by workstation restart.";
        job.updatedAt = new Date().toISOString();
        modified = true;
      }
    }
    if (modified) this.persist();
  }

  /**
   * Generates a stable, canonical idempotency key
   * Format: order_{orderId}_doc_{resolvedDocId}
   */
  public generateIdempotencyKey(orderId: string, param2?: string, param3?: string): string {
    const cleanOrderId = String(orderId || "").trim().toLowerCase();
    const resolvedDocId = String(param3 || param2 || "default").trim().toLowerCase();
    return `order_${cleanOrderId}_doc_${resolvedDocId}`;
  }

  /**
   * Checks whether this job has already been printed or spooled to prevent duplicate physical prints
   */
  public isAlreadyDispatched(idempotencyKey: string): boolean {
    const record = this.jobs.get(idempotencyKey);
    if (record) {
      if (
        record.state === "SUBMITTING" ||
        record.state === "SUBMITTED_TO_SPOOLER" ||
        record.state === "PRINTING" ||
        record.state === "COMPLETED"
      ) {
        return true;
      }
    }

    // Cross-check: prevent duplicates when one caller used orderId (UUID) and another used orderNumber (e.g. ORD-XXXX)
    // CRITICAL: Extract document portion so different documents in the same multi-doc order NEVER block each other!
    const cleanKey = idempotencyKey.toLowerCase();
    const docMatch = cleanKey.match(/_doc_(.+)$/);
    const targetDocId = docMatch ? docMatch[1] : "";

    for (const job of this.jobs.values()) {
      const matchOrder =
        (job.orderId && cleanKey.includes(job.orderId.toLowerCase())) ||
        (job.orderNumber && cleanKey.includes(job.orderNumber.toLowerCase()));

      const jobDocMatch = job.idempotencyKey.toLowerCase().match(/_doc_(.+)$/);
      const jobDocId = jobDocMatch ? jobDocMatch[1] : "";
      const matchDoc = !targetDocId || !jobDocId || targetDocId === jobDocId;

      if (matchOrder && matchDoc) {
        if (
          job.state === "SUBMITTING" ||
          job.state === "SUBMITTED_TO_SPOOLER" ||
          job.state === "PRINTING" ||
          job.state === "COMPLETED"
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks whether an order and specific document has already been dispatched/printed
   */
  public isOrderAlreadyDispatched(orderIdentifier: string, docId?: string): boolean {
    const cleanOrder = String(orderIdentifier || "").trim().toLowerCase();
    const cleanDoc = docId ? String(docId).trim().toLowerCase() : "";
    if (!cleanOrder) return false;

    for (const job of this.jobs.values()) {
      const matchOrder =
        job.orderId.toLowerCase() === cleanOrder ||
        job.orderNumber.toLowerCase() === cleanOrder ||
        job.idempotencyKey.toLowerCase().includes(cleanOrder);

      if (matchOrder) {
        if (cleanDoc) {
          const jobDocMatch = job.idempotencyKey.toLowerCase().match(/_doc_(.+)$/);
          const jobDocId = jobDocMatch ? jobDocMatch[1] : "";
          if (jobDocId && jobDocId !== cleanDoc) {
            continue; // Different document in the same order — allow it!
          }
        }

        if (
          job.state === "SUBMITTING" ||
          job.state === "SUBMITTED_TO_SPOOLER" ||
          job.state === "PRINTING" ||
          job.state === "COMPLETED"
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks whether this job is actively in-flight
   */
  public isCurrentlyProcessing(idempotencyKey: string): boolean {
    const record = this.jobs.get(idempotencyKey);
    if (record) {
      if (
        record.state === "VALIDATING" ||
        record.state === "DOWNLOADING" ||
        record.state === "READY_TO_PRINT" ||
        record.state === "SUBMITTING"
      ) {
        return true;
      }
    }

    const cleanKey = idempotencyKey.toLowerCase();
    const docMatch = cleanKey.match(/_doc_(.+)$/);
    const targetDocId = docMatch ? docMatch[1] : "";

    for (const job of this.jobs.values()) {
      const matchOrder =
        (job.orderId && cleanKey.includes(job.orderId.toLowerCase())) ||
        (job.orderNumber && cleanKey.includes(job.orderNumber.toLowerCase()));

      const jobDocMatch = job.idempotencyKey.toLowerCase().match(/_doc_(.+)$/);
      const jobDocId = jobDocMatch ? jobDocMatch[1] : "";
      const matchDoc = !targetDocId || !jobDocId || targetDocId === jobDocId;

      if (matchOrder && matchDoc) {
        if (
          job.state === "VALIDATING" ||
          job.state === "DOWNLOADING" ||
          job.state === "READY_TO_PRINT" ||
          job.state === "SUBMITTING"
        ) {
          return true;
        }
      }
    }

    return false;
  }

  public getRecord(idempotencyKey: string): PrintJobRecord | undefined {
    return this.jobs.get(idempotencyKey);
  }

  public getAllRecords(): PrintJobRecord[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Creates or registers a new print job in the lifecycle system
   */
  public registerJob(params: {
    jobId: string;
    orderId: string;
    orderNumber: string;
    idempotencyKey: string;
    printerName: string;
    totalCopies: number;
    colorMode: string;
    paperSize: string;
    duplexMode: string;
    pageRange?: string;
    documentName: string;
  }): PrintJobRecord {
    const existing = this.jobs.get(params.idempotencyKey);
    if (existing) {
      if (this.isAlreadyDispatched(params.idempotencyKey)) {
        logger.warn(
          `Guarded against duplicate submission for order ${params.orderNumber} (State: ${existing.state})`
        );
        return existing;
      }
      existing.retryCount += 1;
      existing.updatedAt = new Date().toISOString();
      this.persist();
      return existing;
    }

    const record: PrintJobRecord = {
      ...params,
      state: "RECEIVED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.jobs.set(params.idempotencyKey, record);
    this.persist();
    return record;
  }

  /**
   * Atomically transitions a job to a new lifecycle state
   */
  public transition(
    idempotencyKey: string,
    nextState: JobLifecycleState,
    meta?: {
      windowsJobId?: number;
      fileSizeBytes?: number;
      sha256Hash?: string;
      errorMessage?: string;
      totalPages?: number;
      pagesPrinted?: number;
    }
  ): PrintJobRecord {
    const record = this.jobs.get(idempotencyKey);
    if (!record) {
      throw new Error(`[LIFECYCLE] Cannot transition unknown job with key ${idempotencyKey}`);
    }

    const prevState = record.state;
    record.state = nextState;
    record.updatedAt = new Date().toISOString();

    if (meta?.windowsJobId !== undefined) record.windowsJobId = meta.windowsJobId;
    if (meta?.fileSizeBytes !== undefined) record.fileSizeBytes = meta.fileSizeBytes;
    if (meta?.sha256Hash !== undefined) record.sha256Hash = meta.sha256Hash;
    if (meta?.errorMessage) record.lastErrorMessage = meta.errorMessage;
    if (meta?.totalPages !== undefined) record.totalPages = meta.totalPages;
    if (meta?.pagesPrinted !== undefined) record.pagesPrinted = meta.pagesPrinted;

    if (nextState === "SUBMITTED_TO_SPOOLER") {
      record.submittedAt = new Date().toISOString();
    } else if (nextState === "COMPLETED") {
      record.completedAt = new Date().toISOString();
    }

    logger.info(
      `Job ${record.orderNumber} (${record.jobId}): ${prevState} -> ${nextState}${
        meta?.windowsJobId ? ` [WinSpooler Job #${meta.windowsJobId}]` : ""
      }`
    );

    this.persist();
    return record;
  }

  /**
   * Reset a failed/needs-attention job for vendor-controlled retry
   */
  public allowManualRetry(idempotencyKey: string): PrintJobRecord {
    const record = this.jobs.get(idempotencyKey);
    if (!record) {
      throw new Error(`[LIFECYCLE] Cannot retry unknown job with key ${idempotencyKey}`);
    }
    record.state = "RECEIVED";
    record.retryCount += 1;
    record.requiresVendorReview = false;
    record.updatedAt = new Date().toISOString();
    this.persist();
    logger.info(`Vendor allowed manual retry on job ${record.orderNumber} (attempt #${record.retryCount})`);
    return record;
  }
}

export const jobLifecycleManager = new JobLifecycleManager();
