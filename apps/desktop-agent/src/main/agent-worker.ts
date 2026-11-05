import fs from 'fs';
import path from 'path';
import os from 'os';
import { printerService } from './printer-service';
import { tempFileManager } from './temp-file-manager';
import { jobLifecycleManager } from './job-lifecycle';

export interface AgentConfig {
  backendUrl: string;
  deviceId: string;
  deviceToken: string;
  vendorName: string;
  vendorSlug: string;
  isPollingActive: boolean;
  defaultBwPrinter?: string;
  defaultColorPrinter?: string;
  userEmail?: string;
  sessionToken?: string;
  deviceName?: string;
}

export type LogListener = (log: { timestamp: string; level: 'info' | 'warn' | 'error'; message: string }) => void;
export type JobListener = (job: any) => void;

export class AgentWorker {
  private config: AgentConfig | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isBusy = false;
  private logListeners: LogListener[] = [];
  private jobListeners: JobListener[] = [];
  private currentIntervalMs = 10000;
  private consecutiveErrors = 0;
  private wasOffline = false;

  constructor() {
    this.loadSavedConfig();
  }

  public onLog(listener: LogListener) {
    this.logListeners.push(listener);
  }

  public onJob(listener: JobListener) {
    this.jobListeners.push(listener);
  }

  public emitJob(job: any) {
    for (const listener of this.jobListeners) {
      try {
        listener(job);
      } catch (e) {
        console.error('Job listener error:', e);
      }
    }
  }

  public emitLog(level: 'info' | 'warn' | 'error', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AGENT ${level.toUpperCase()}] ${timestamp} - ${message}`);
    for (const listener of this.logListeners) {
      try {
        listener({ timestamp, level, message });
      } catch (e) {
        // Listener error
      }
    }
  }

  public getConfig(): AgentConfig | null {
    return this.config;
  }

  public clearConfig() {
    this.stopPolling();
    this.config = null;
    const configPath = path.join(os.homedir(), '.printflow-agent-config.json');
    if (fs.existsSync(configPath)) {
      try {
        fs.unlinkSync(configPath);
      } catch (err) {
        console.error('Failed to remove config file:', err);
      }
    }
    this.emitLog('info', 'Device logged out and unlinked.');
  }

  public saveConfig(config: AgentConfig) {
    this.config = config;
    const configPath = path.join(os.homedir(), '.printflow-agent-config.json');
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.emitLog('info', `Device credentials saved for ${config.vendorName}`);
    } catch (err) {
      console.error('Failed to save config file:', err);
    }
  }

  private loadSavedConfig() {
    const configPath = path.join(os.homedir(), '.printflow-agent-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(raw);
      } catch {
        this.config = null;
      }
    } else {
      this.config = null;
    }
  }

  public startPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (!this.config) return;

    this.config.isPollingActive = true;
    this.currentIntervalMs = 10000;
    this.consecutiveErrors = 0;
    this.emitLog('info', 'Print agent polling engine started (10s adaptive interval)');

    this.pollAndExecuteJobs();
  }

  public stopPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.config) this.config.isPollingActive = false;
    this.emitLog('warn', 'Print agent polling paused by operator');
  }

  private scheduleNextPoll() {
    if (!this.config || !this.config.isPollingActive) return;
    if (this.pollingTimer) clearTimeout(this.pollingTimer);

    this.pollingTimer = setTimeout(() => {
      this.pollAndExecuteJobs();
    }, this.currentIntervalMs);
  }

  /**
   * Main polling cycle with adaptive backoff
   */
  public async pollAndExecuteJobs() {
    if (!this.config || !this.config.isPollingActive || this.isBusy) {
      return;
    }
    this.isBusy = true;

    try {
      const { backendUrl, deviceId, deviceToken } = this.config;

      // 1. Fetch available jobs
      const res = await fetch(`${backendUrl}/api/agent/jobs`, {
        headers: {
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
        },
      });

      if (!res.ok) {
        this.emitLog('warn', `Poll response (${res.status}): Server not ready or unauthorized`);
        this.handlePollError();
        return;
      }

      const data = await res.json();
      const jobs = data.jobs || [];

      // Connection is healthy - reset error count
      if (this.wasOffline) {
        this.emitLog('info', '✅ Connection to Print2Me server restored.');
        this.wasOffline = false;
      }
      this.consecutiveErrors = 0;
      this.currentIntervalMs = 10000;

      if (jobs.length > 0) {
        this.emitLog('info', `Found ${jobs.length} authorized print job(s) in queue`);

        // Process queued jobs sequentially
        for (const targetJob of jobs) {
          await this.processSingleJob(targetJob);
        }
      }
    } catch (err: any) {
      this.handlePollError(err.message || 'Connection failure');
    } finally {
      this.isBusy = false;
      this.scheduleNextPoll();
    }
  }

  private handlePollError(details?: string) {
    this.consecutiveErrors++;
    this.currentIntervalMs = Math.min(60000, Math.round(10000 * Math.pow(1.5, Math.min(this.consecutiveErrors, 5))));

    if (!this.wasOffline) {
      this.emitLog('warn', `Network connection offline (${details || 'server unreachable'}). Retrying with backoff in ${(this.currentIntervalMs / 1000).toFixed(0)}s...`);
      this.wasOffline = true;
    }
  }

  public async processSingleJob(job: any) {
    const { backendUrl, deviceId, deviceToken } = this.config!;
    const idempotencyKey = jobLifecycleManager.generateIdempotencyKey(
      job.orderId || job.orderNumber,
      job.jobId,
      job.items?.[0]?.document?.id
    );

    // Guard against duplicate prints
    if (jobLifecycleManager.isAlreadyDispatched(idempotencyKey)) {
      this.emitLog(
        'warn',
        `Order ${job.orderNumber} (Job: ${job.jobId}) was already spooled. Skipping duplicate dispatch.`
      );
      return;
    }

    const firstItem = job.items?.[0] || {};
    const docMeta = firstItem.document || {};
    const targetCopies = firstItem.copies || 1;
    const isColorJob = job.items.some((i: any) => i.colorMode === 'COLOR');

    // 1. Resolve Target Printer
    const realPrinters = await printerService.getInstalledPrinters();
    let selectedPrinterName = '';

    if (isColorJob && this.config?.defaultColorPrinter) {
      selectedPrinterName = this.config.defaultColorPrinter;
    } else if (!isColorJob && this.config?.defaultBwPrinter) {
      selectedPrinterName = this.config.defaultBwPrinter;
    } else {
      const defaultPrinter = realPrinters.find((p) => p.isDefault) || realPrinters[0];
      selectedPrinterName = defaultPrinter ? defaultPrinter.systemName : '';
    }

    if (!selectedPrinterName) {
      const msg = 'No physical or virtual Windows printer is available. Please install a printer.';
      this.emitLog('error', msg);
      return;
    }

    // Register job in lifecycle state machine
    jobLifecycleManager.registerJob({
      jobId: job.jobId,
      orderId: job.orderId || job.orderNumber,
      orderNumber: job.orderNumber,
      idempotencyKey,
      printerName: selectedPrinterName,
      totalCopies: targetCopies,
      colorMode: isColorJob ? 'COLOR' : 'BLACK_AND_WHITE',
      paperSize: firstItem.paperSize || 'A4',
      duplexMode: firstItem.duplexMode || 'SINGLE_SIDED',
      pageRange: firstItem.pageRange || 'ALL',
      documentName: docMeta.filename || 'customer_document.pdf',
    });

    jobLifecycleManager.transition(idempotencyKey, 'VALIDATING');
    this.emitLog('info', `Claiming job ${job.orderNumber} (ID: ${job.jobId})...`);

    // 2. Claim Job
    let claimToken = '';
    try {
      const claimRes = await fetch(`${backendUrl}/api/agent/jobs/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
        },
        body: JSON.stringify({ jobId: job.jobId, leaseSeconds: 180 }),
      });

      if (!claimRes.ok) {
        throw new Error(`Server returned HTTP ${claimRes.status}`);
      }

      const claimData = await claimRes.json();
      claimToken = claimData.claimToken;
      this.emitJob({ ...job, claimToken });
    } catch (claimErr: any) {
      const errMsg = `Could not claim job ${job.orderNumber}: ${claimErr.message}`;
      this.emitLog('warn', errMsg);
      jobLifecycleManager.transition(idempotencyKey, 'FAILED', { errorMessage: errMsg });
      return;
    }

    let tempFilePath: string | undefined;

    try {
      // 3. Report DOWNLOADING
      jobLifecycleManager.transition(idempotencyKey, 'DOWNLOADING');
      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'DOWNLOADING',
        'Workstation downloading document securely'
      );

      // 4. Retrieve Document Download URL
      const docRes = await fetch(`${backendUrl}/api/agent/jobs/${job.jobId}/document?claimToken=${claimToken}`, {
        headers: {
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
          'x-claim-token': claimToken,
        },
      });

      if (!docRes.ok) {
        throw new Error(`Failed to acquire download SAS URL from backend (HTTP ${docRes.status})`);
      }

      const docData = await docRes.json();
      if (!docData.document?.downloadUrl) {
        throw new Error('Backend response did not provide a valid document download URL');
      }

      const rawDownloadUrl: string = docData.document.downloadUrl;
      const docFilename: string = docData.document.filename || docMeta.filename || 'document.pdf';
      const claimedMime: string = docData.document.mimeType || docMeta.mimeType;

      // Construct full URL if relative
      const fullDownloadUrl = rawDownloadUrl.startsWith('http')
        ? rawDownloadUrl
        : `${backendUrl}${rawDownloadUrl.startsWith('/') ? '' : '/'}${rawDownloadUrl}`;

      this.emitLog('info', `Downloading actual document ${docFilename} securely...`);

      // 5. Download binary stream
      const fileHeaders: Record<string, string> = {};
      if (fullDownloadUrl.startsWith(backendUrl)) {
        fileHeaders['x-device-id'] = deviceId;
        fileHeaders['x-device-token'] = deviceToken;
        fileHeaders['x-claim-token'] = claimToken;
      }

      const fileResp = await fetch(fullDownloadUrl, { headers: fileHeaders });
      if (!fileResp.ok) {
        throw new Error(`Failed to download document content (HTTP ${fileResp.status})`);
      }

      const arrayBuf = await fileResp.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuf);

      // 6. Validate magic bytes, mime type, and integrity
      const validated = await tempFileManager.writeAndValidateBuffer(
        fileBuffer,
        docFilename,
        claimedMime
      );
      tempFilePath = validated.filePath;

      jobLifecycleManager.transition(idempotencyKey, 'READY_TO_PRINT', {
        fileSizeBytes: validated.fileSizeBytes,
        sha256Hash: validated.sha256Hash,
      });

      this.emitLog(
        'info',
        `Document verified (${(validated.fileSizeBytes / 1024).toFixed(1)} KB, ${validated.mimeType}). Submitting to '${selectedPrinterName}'...`
      );

      // 7. Submit to Windows Printer Spooler
      jobLifecycleManager.transition(idempotencyKey, 'SUBMITTING');

      const spoolResult = await printerService.printDocument(tempFilePath, {
        printerName: selectedPrinterName,
        copies: targetCopies,
        colorMode: isColorJob ? 'COLOR' : 'BLACK_AND_WHITE',
        duplexMode: firstItem.duplexMode,
        paperSize: firstItem.paperSize,
        pageRange: firstItem.pageRange,
      });

      if (!spoolResult.success) {
        const errorMsg = `Spooler failed: ${spoolResult.message}`;
        this.emitLog('error', errorMsg);
        jobLifecycleManager.transition(idempotencyKey, 'NEEDS_ATTENTION', { errorMessage: errorMsg });

        await this.updateJobStatus(
          job.jobId,
          claimToken,
          'REQUIRES_MANUAL_REVIEW',
          errorMsg
        );
        return;
      }

      // 8. Record SUBMITTED_TO_SPOOLER with native Job ID
      jobLifecycleManager.transition(idempotencyKey, 'SUBMITTED_TO_SPOOLER', {
        windowsJobId: spoolResult.windowsJobId,
      });

      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'SUBMITTED_TO_SPOOLER',
        `Dispatched to Windows printer '${selectedPrinterName}'`,
        {
          windowsJobId: spoolResult.windowsJobId,
          printerName: selectedPrinterName,
          spoolStatus: spoolResult.spoolStatus,
        }
      );

      // 9. Report Spooler Completion
      jobLifecycleManager.transition(idempotencyKey, 'COMPLETED', {
        windowsJobId: spoolResult.windowsJobId,
      });

      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'COMPLETED',
        `Windows spooler finished processing document for '${selectedPrinterName}'`,
        {
          windowsJobId: spoolResult.windowsJobId,
          printerName: selectedPrinterName,
        }
      );

      this.emitLog(
        'info',
        `🎉 Order ${job.orderNumber} successfully spooled to ${selectedPrinterName}! (Spooler Job #${spoolResult.windowsJobId || 'Active'})`
      );
    } catch (jobErr: any) {
      const errMsg = jobErr.message || 'Unknown print error';
      this.emitLog('error', `Print execution failed for ${job.orderNumber}: ${errMsg}`);
      jobLifecycleManager.transition(idempotencyKey, 'NEEDS_ATTENTION', { errorMessage: errMsg });

      if (claimToken) {
        await this.updateJobStatus(
          job.jobId,
          claimToken,
          'REQUIRES_MANUAL_REVIEW',
          `Print submission halted: ${errMsg}`
        );
      }
    } finally {
      // Security: Always delete temporary customer document immediately after spooling handoff
      if (tempFilePath) {
        tempFileManager.cleanupFile(tempFilePath);
      }
    }
  }

  public async updateJobStatus(
    jobId: string,
    claimToken: string,
    status: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    if (!this.config) return;
    const { backendUrl, deviceId, deviceToken } = this.config;
    try {
      await fetch(`${backendUrl}/api/agent/jobs/${jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
        },
        body: JSON.stringify({ jobId, status, claimToken, message, metadata }),
      });
    } catch (err) {
      console.warn(`[AGENT] Failed to update status ${status} for job ${jobId}:`, err);
    }
  }
}

export const agentWorker = new AgentWorker();
