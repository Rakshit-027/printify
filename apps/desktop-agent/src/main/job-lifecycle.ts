import fs from 'fs';
import path from 'path';
import os from 'os';

export type JobLifecycleState =
  | 'RECEIVED'
  | 'VALIDATING'
  | 'DOWNLOADING'
  | 'READY_TO_PRINT'
  | 'SUBMITTING'
  | 'SPOOLING'
  | 'SUBMITTED_TO_SPOOLER'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_ATTENTION'
  | 'CANCELLED';

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

  constructor() {
    const dataDir = path.join(os.homedir(), '.printflow');
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[LIFECYCLE] Failed to create data dir:', err);
    }
    this.historyFile = path.join(dataDir, 'jobs-history.json');
    this.loadHistory();
    this.reconcileInterruptedJobsOnStartup();
  }

  private loadHistory() {
    if (!fs.existsSync(this.historyFile)) return;
    try {
      const raw = fs.readFileSync(this.historyFile, 'utf-8');
      const list: PrintJobRecord[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const j of list) {
          if (j.idempotencyKey) {
            this.jobs.set(j.idempotencyKey, j);
          }
        }
      }
    } catch (err) {
      console.error('[LIFECYCLE] Error reading job history:', err);
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
      fs.writeFileSync(tmpFile, JSON.stringify(list, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.historyFile);
    } catch (err) {
      console.error('[LIFECYCLE] Failed to persist job history:', err);
    }
  }

  /**
   * On application startup, safely reconcile jobs that were in-flight when app crashed or shutdown
   */
  private reconcileInterruptedJobsOnStartup() {
    let modified = false;
    for (const job of this.jobs.values()) {
      if (job.state === 'SUBMITTING' || job.state === 'SPOOLING') {
        // We cannot guarantee whether Windows Spooler accepted it completely or printed paper
        job.state = 'NEEDS_ATTENTION';
        job.requiresVendorReview = true;
        job.lastErrorMessage =
          'Workstation restarted while job was being spooled. Please check printer output tray before retrying.';
        job.updatedAt = new Date().toISOString();
        modified = true;
        console.warn(
          `[LIFECYCLE] Job ${job.orderNumber} flagged as NEEDS_ATTENTION following workstation restart.`
        );
      } else if (job.state === 'DOWNLOADING' || job.state === 'VALIDATING') {
        // File was not yet sent to printer spooler, safe to set FAILED or allow retry
        job.state = 'FAILED';
        job.lastErrorMessage = 'Interrupted during download/validation by workstation restart.';
        job.updatedAt = new Date().toISOString();
        modified = true;
      }
    }
    if (modified) this.persist();
  }

  /**
   * Generates a stable, canonical idempotency key
   */
  public generateIdempotencyKey(orderId: string, jobId?: string, docId?: string): string {
    return `${orderId}_${jobId || 'direct'}_${docId || 'doc1'}`;
  }

  /**
   * Checks whether this job has already been printed or spooled to prevent duplicate physical prints
   */
  public isAlreadyDispatched(idempotencyKey: string): boolean {
    const record = this.jobs.get(idempotencyKey);
    if (!record) return false;
    return record.state === 'SUBMITTED_TO_SPOOLER' || record.state === 'COMPLETED';
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
      if (existing.state === 'SUBMITTED_TO_SPOOLER' || existing.state === 'COMPLETED') {
        console.warn(
          `[LIFECYCLE] Guarded against duplicate submission for order ${params.orderNumber} (State: ${existing.state})`
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
      state: 'RECEIVED',
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

    if (nextState === 'SUBMITTED_TO_SPOOLER') {
      record.submittedAt = new Date().toISOString();
    } else if (nextState === 'COMPLETED') {
      record.completedAt = new Date().toISOString();
    }

    console.log(
      `[LIFECYCLE] Job ${record.orderNumber} (${record.jobId}): ${prevState} -> ${nextState}${
        meta?.windowsJobId ? ` [WinSpooler Job #${meta.windowsJobId}]` : ''
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
    record.state = 'RECEIVED';
    record.retryCount += 1;
    record.requiresVendorReview = false;
    record.updatedAt = new Date().toISOString();
    this.persist();
    return record;
  }
}

export const jobLifecycleManager = new JobLifecycleManager();
