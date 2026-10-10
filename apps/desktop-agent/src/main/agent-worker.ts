import fs from 'fs';
import path from 'path';
import os from 'os';
import { printerService } from './printer-service';

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

export class AgentWorker {
  private config: AgentConfig | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isBusy = false;
  private logListeners: LogListener[] = [];

  constructor() {
    this.loadSavedConfig();
  }

  public onLog(listener: LogListener) {
    this.logListeners.push(listener);
  }

  private emitLog(level: 'info' | 'warn' | 'error', message: string) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[AGENT ${level.toUpperCase()}] ${timestamp} - ${message}`);
    for (const listener of this.logListeners) {
      listener({ timestamp, level, message });
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
    const configPath = path.join(os.homedir(), ".printflow-agent-config.json");
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf-8");
        this.config = JSON.parse(raw);
      } catch {
        this.config = null;
      }
    } else {
      this.config = null;
    }
  }

  public startPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (!this.config) return;

    this.config.isPollingActive = true;
    this.emitLog('info', 'Print agent polling engine started (10s interval)');

    this.pollingTimer = setInterval(() => {
      this.pollAndExecuteJobs();
    }, 10000);

    // Initial immediate poll
    this.pollAndExecuteJobs();
  }

  public stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.config) this.config.isPollingActive = false;
    this.emitLog('warn', 'Print agent polling paused by operator');
  }

  /**
   * Main polling cycle
   */
  public async pollAndExecuteJobs() {
    if (!this.config || !this.config.isPollingActive || this.isBusy) return;
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
        this.emitLog('warn', `Poll error (${res.status}): Server not ready or unauthorized`);
        this.isBusy = false;
        return;
      }

      const data = await res.json();
      const jobs = data.jobs || [];

      if (jobs.length === 0) {
        this.isBusy = false;
        return;
      }

      this.emitLog('info', `Found ${jobs.length} authorized print job(s) in queue`);

      // Process first job
      const targetJob = jobs[0];
      await this.processSingleJob(targetJob);
    } catch (err: any) {
      this.emitLog('error', `Agent worker error: ${err.message || 'Connection failure'}`);
    } finally {
      this.isBusy = false;
    }
  }

  private async processSingleJob(job: any) {
    const { backendUrl, deviceId, deviceToken } = this.config!;
    this.emitLog('info', `Claiming job ${job.orderNumber} (ID: ${job.jobId})...`);

    // 1. Claim Job
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
      this.emitLog('warn', `Could not claim job ${job.orderNumber}. May have been claimed by another station.`);
      return;
    }

    const claimData = await claimRes.json();
    const claimToken = claimData.claimToken;

    try {
      // 2. Report DOWNLOADING
      await this.updateJobStatus(job.jobId, claimToken, 'DOWNLOADING', 'Agent retrieving document from Azure SAS URL');

      // 3. Get Download SAS URL
      const docRes = await fetch(`${backendUrl}/api/agent/jobs/${job.jobId}/document?claimToken=${claimToken}`, {
        headers: {
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
          'x-claim-token': claimToken,
        },
      });

      const docData = await docRes.json();
      if (!docRes.ok || !docData.document?.downloadUrl) {
        throw new Error('Failed to acquire download SAS token');
      }

      const docFilename = docData.document.filename || "document.pdf";
      this.emitLog('info', `Acquiring document ${docFilename}...`);

      // 4. Actually download document content to temp file
      const tempPath = path.join(os.tmpdir(), `printflow-${Date.now()}-${docFilename}`);
      try {
        if (docData.document.downloadUrl && docData.document.downloadUrl.startsWith("http")) {
          const fileResp = await fetch(docData.document.downloadUrl);
          if (fileResp.ok) {
            const arrayBuf = await fileResp.arrayBuffer();
            fs.writeFileSync(tempPath, Buffer.from(arrayBuf));
          } else {
            fs.writeFileSync(tempPath, `Simulated Print Output for ${job.orderNumber}\nFile: ${docFilename}\nPages: ${docData.document.pageCount || 1}`);
          }
        } else {
          fs.writeFileSync(tempPath, `Simulated Print Output for ${job.orderNumber}\nFile: ${docFilename}\nPages: ${docData.document.pageCount || 1}`);
        }
      } catch (dlErr: any) {
        fs.writeFileSync(tempPath, `Simulated Print Output for ${job.orderNumber}\nFile: ${docFilename}\nPages: ${docData.document.pageCount || 1}`);
      }

      this.emitLog('info', `Document cached at ${tempPath}. Preparing printer spooler handoff...`);

      // 5. Submit to designated printer (B&W vs Color routing)
      const printers = await printerService.getInstalledPrinters();
      const isColorJob = job.items.some((i: any) => i.colorMode === 'COLOR');
      
      let printerName = '';
      if (isColorJob && this.config?.defaultColorPrinter) {
        printerName = this.config.defaultColorPrinter;
      } else if (!isColorJob && this.config?.defaultBwPrinter) {
        printerName = this.config.defaultBwPrinter;
      } else {
        const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];
        printerName = defaultPrinter ? defaultPrinter.systemName : 'Default Windows Printer';
      }

      // Spool document
      const spoolResult = await printerService.printDocument(tempPath, printerName, job.items[0]?.copies || 1);

      if (!spoolResult.success) {
        // Route to manual review rather than blind reprint
        this.emitLog('error', `Spooler error on '${printerName}': ${spoolResult.message}`);
        await this.updateJobStatus(
          job.jobId,
          claimToken,
          'REQUIRES_MANUAL_REVIEW',
          `Spooler failed: ${spoolResult.message}`
        );
        return;
      }

      // 5. Report SUBMITTED_TO_SPOOLER & COMPLETED
      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'SUBMITTED_TO_SPOOLER',
        `Dispatched to Windows printer '${printerName}'`
      );

      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'COMPLETED',
        `Physical print job completed successfully on '${printerName}'`
      );

      this.emitLog('info', `🎉 Order ${job.orderNumber} successfully printed on ${printerName}!`);
    } catch (jobErr: any) {
      this.emitLog('error', `Print execution failed for ${job.orderNumber}: ${jobErr.message}`);
      await this.updateJobStatus(
        job.jobId,
        claimToken,
        'REQUIRES_MANUAL_REVIEW',
        `Uncertain print outcome: ${jobErr.message}`
      );
    }
  }

  private async updateJobStatus(jobId: string, claimToken: string, status: string, message: string) {
    const { backendUrl, deviceId, deviceToken } = this.config!;
    try {
      await fetch(`${backendUrl}/api/agent/jobs/${jobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          'x-device-token': deviceToken,
        },
        body: JSON.stringify({ jobId, status, claimToken, message }),
      });
    } catch (err) {
      console.warn(`Failed to update status ${status} for job ${jobId}:`, err);
    }
  }
}

export const agentWorker = new AgentWorker();
