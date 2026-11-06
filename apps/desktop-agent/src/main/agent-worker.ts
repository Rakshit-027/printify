import os from "os";
import { configStore, AgentConfig } from "./config-store";
import { printerService } from "./printer-service";
import { tempFileManager } from "./temp-file-manager";
import { jobLifecycleManager } from "./job-lifecycle";
import { logger } from "./logger";

export type LogListener = (log: { timestamp: string; level: "info" | "warn" | "error"; message: string }) => void;
export type JobListener = (job: any) => void;

export class AgentWorker {
  private pollingTimer: NodeJS.Timeout | null = null;
  private isBusy = false;
  private jobListeners: JobListener[] = [];
  private currentIntervalMs = 10000;
  private consecutiveErrors = 0;
  private wasOffline = false;

  constructor() {
    // Config is loaded through configStore
  }

  public onLog(listener: LogListener) {
    logger.addListener((entry) => {
      listener({
        timestamp: new Date(entry.timestamp).toLocaleTimeString(),
        level: entry.level === "ERROR" || entry.level === "FATAL" ? "error" : entry.level === "WARN" ? "warn" : "info",
        message: entry.message,
      });
    });
  }

  public onJob(listener: JobListener) {
    this.jobListeners.push(listener);
  }

  public emitJob(job: any) {
    for (const listener of this.jobListeners) {
      try {
        listener(job);
      } catch (e) {
        logger.error(`Job listener error: ${e}`);
      }
    }
  }

  public getConfig(): AgentConfig | null {
    return configStore.getConfig();
  }

  public saveConfig(config: AgentConfig) {
    configStore.saveConfig(config);
  }

  public clearConfig() {
    this.stopPolling();
    configStore.clearConfig();
    logger.info("Device logged out and unlinked.");
  }

  public startPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    const config = configStore.getConfig();
    if (!config) return;

    config.isPollingActive = true;
    configStore.saveConfig(config);
    this.currentIntervalMs = 10000;
    this.consecutiveErrors = 0;
    logger.info("Print agent polling engine started (10s adaptive interval)");

    this.pollAndExecuteJobs();
  }

  public stopPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    const config = configStore.getConfig();
    if (config) {
      config.isPollingActive = false;
      configStore.saveConfig(config);
    }
    logger.warn("Print agent polling paused by operator");
  }

  private scheduleNextPoll() {
    const config = configStore.getConfig();
    if (!config || !config.isPollingActive) return;
    if (this.pollingTimer) clearTimeout(this.pollingTimer);

    // Add jitter: +/- 15% to prevent synchronized retry spikes
    const jitter = (Math.random() - 0.5) * 0.3 * this.currentIntervalMs;
    const finalInterval = Math.max(3000, Math.round(this.currentIntervalMs + jitter));

    this.pollingTimer = setTimeout(() => {
      this.pollAndExecuteJobs();
    }, finalInterval);
  }

  /**
   * Main polling cycle with adaptive backoff and bounded retries
   */
  public async pollAndExecuteJobs() {
    const config = configStore.getConfig();
    if (!config || !config.isPollingActive || this.isBusy) {
      return;
    }
    this.isBusy = true;

    try {
      const { backendUrl, deviceId, deviceToken } = config;

      // 1. Fetch available jobs with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      let res: Response;
      try {
        res = await fetch(`${backendUrl}/api/agent/jobs`, {
          headers: {
            "x-device-id": deviceId,
            "x-device-token": deviceToken,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logger.error(`Workstation unauthorized (HTTP ${res.status}). Device credentials may be invalid or revoked.`);
          // Slow down polling significantly for auth errors
          this.currentIntervalMs = 60000;
          return;
        }
        logger.warn(`Poll response (${res.status}): Server not ready or busy`);
        this.handlePollError();
        return;
      }

      const data = await res.json();
      const jobs = data.jobs || [];

      // Connection healthy
      if (this.wasOffline) {
        logger.info("Connection to Print2Me server restored.");
        this.wasOffline = false;
      }
      this.consecutiveErrors = 0;
      this.currentIntervalMs = 10000;

      if (jobs.length > 0) {
        logger.info(`Found ${jobs.length} authorized print job(s) in queue`);

        // Process queued jobs sequentially
        for (const targetJob of jobs) {
          await this.processSingleJob(targetJob);
        }
      }
    } catch (err: any) {
      this.handlePollError(err.message || "Connection failure");
    } finally {
      this.isBusy = false;
      this.scheduleNextPoll();
    }
  }

  private handlePollError(details?: string) {
    this.consecutiveErrors++;
    // Exponential backoff with max 60s
    this.currentIntervalMs = Math.min(
      60000,
      Math.round(10000 * Math.pow(1.5, Math.min(this.consecutiveErrors, 5)))
    );

    if (!this.wasOffline) {
      logger.warn(
        `Network connection offline (${details || "server unreachable"}). Retrying with backoff in ${(
          this.currentIntervalMs / 1000
        ).toFixed(0)}s...`
      );
      this.wasOffline = true;
    }
  }

  public async processSingleJob(job: any) {
    const config = configStore.getConfig();
    if (!config) return;

    const { backendUrl, deviceId, deviceToken } = config;
    const firstItem = job.items?.[0] || {};
    const docMeta = firstItem.document || {};
    const docId = docMeta.id || "default";

    // Standardized idempotency key across all agent components
    const idempotencyKey = jobLifecycleManager.generateIdempotencyKey(
      job.orderId || job.orderNumber,
      firstItem.itemId || "job",
      docId
    );

    // Guard against duplicate prints: check if all documents in this order have already been dispatched
    const allItemsDispatched =
      Array.isArray(job.items) &&
      job.items.length > 0 &&
      job.items.every((it: any) => {
        const did = it.document?.id || it.documentId || it.id || "default";
        const ikey = jobLifecycleManager.generateIdempotencyKey(
          job.orderId || job.orderNumber,
          it.itemId || "job",
          did
        );
        return (
          jobLifecycleManager.isAlreadyDispatched(ikey) ||
          jobLifecycleManager.isOrderAlreadyDispatched(job.orderId || job.orderNumber, did)
        );
      });

    if (allItemsDispatched) {
      logger.info(
        `Order ${job.orderNumber} (Job: ${job.jobId}) all document items were already spooled/printed. Acknowledging with backend to clear queue.`
      );
      this.updateJobStatus(job.jobId, "COMPLETED", undefined, { duplicatePrevented: true }).catch(() => {});
      return;
    }

    const isProcessing =
      jobLifecycleManager.isCurrentlyProcessing(idempotencyKey) ||
      (job.orderNumber && jobLifecycleManager.isCurrentlyProcessing(`order_${job.orderNumber.toLowerCase()}_doc_${docId.toLowerCase()}`));

    if (isProcessing) {
      logger.warn(
        `Order ${job.orderNumber} (Job: ${job.jobId}) is currently being processed. Skipping.`
      );
      return;
    }

    const targetCopies = Math.max(1, Math.min(100, firstItem.copies || 1));
    const isColorJob = job.items.some((i: any) => i.colorMode === "COLOR");

    // 1. Resolve Target Printer
    const realPrinters = await printerService.getInstalledPrinters();
    let selectedPrinterName = "";

    if (isColorJob && config.defaultColorPrinter) {
      selectedPrinterName = config.defaultColorPrinter;
    } else if (!isColorJob && config.defaultBwPrinter) {
      selectedPrinterName = config.defaultBwPrinter;
    } else {
      const defaultPrinter = realPrinters.find((p) => p.isDefault) || realPrinters[0];
      selectedPrinterName = defaultPrinter ? defaultPrinter.systemName : "";
    }

    if (!selectedPrinterName) {
      const msg = "No physical or virtual Windows printer is available. Please install a printer.";
      logger.error(msg);
      return;
    }

    const matchedPrinter = realPrinters.find(
      (p) => p.systemName.toLowerCase() === selectedPrinterName.toLowerCase()
    );

    const existingRec = jobLifecycleManager.getRecord(idempotencyKey);
    if (existingRec && existingRec.state === "NEEDS_ATTENTION") {
      if (!matchedPrinter || !matchedPrinter.isOnline) {
        // Printer is still not ready, avoid flooding logs repeatedly
        return;
      }
      logger.info(`Target printer '${matchedPrinter.systemName}' is now READY and ONLINE. Resuming print for order ${job.orderNumber}...`);
      jobLifecycleManager.transition(idempotencyKey, "RECEIVED");
    }

    if (!matchedPrinter) {
      const msg = `Preferred printer '${selectedPrinterName}' is not installed in Windows. Please check printer connection or select an available printer in Settings.`;
      if (!existingRec || existingRec.state !== "NEEDS_ATTENTION") {
        logger.error(msg);
        jobLifecycleManager.registerJob({
          jobId: job.jobId,
          orderId: job.orderId || job.orderNumber,
          orderNumber: job.orderNumber,
          idempotencyKey,
          printerName: selectedPrinterName,
          totalCopies: targetCopies,
          colorMode: firstItem.colorMode === "COLOR" ? "COLOR" : "BLACK_AND_WHITE",
          paperSize: firstItem.paperSize || "A4",
          duplexMode: firstItem.duplexMode || "SINGLE_SIDED",
          pageRange: firstItem.pageRange || "ALL",
          documentName: docMeta.filename || "customer_document.pdf",
        });
        jobLifecycleManager.transition(idempotencyKey, "NEEDS_ATTENTION", { errorMessage: msg });
      }
      return;
    }

    if (!matchedPrinter.isOnline) {
      const msg = `Preferred printer '${matchedPrinter.systemName}' (${matchedPrinter.connectionType}) is currently OFFLINE. ${matchedPrinter.statusDetails}. Order held for vendor review.`;
      if (!existingRec || existingRec.state !== "NEEDS_ATTENTION") {
        logger.warn(msg);
        jobLifecycleManager.registerJob({
          jobId: job.jobId,
          orderId: job.orderId || job.orderNumber,
          orderNumber: job.orderNumber,
          idempotencyKey,
          printerName: matchedPrinter.systemName,
          totalCopies: targetCopies,
          colorMode: firstItem.colorMode === "COLOR" ? "COLOR" : "BLACK_AND_WHITE",
          paperSize: firstItem.paperSize || "A4",
          duplexMode: firstItem.duplexMode || "SINGLE_SIDED",
          pageRange: firstItem.pageRange || "ALL",
          documentName: docMeta.filename || "customer_document.pdf",
        });
        jobLifecycleManager.transition(idempotencyKey, "NEEDS_ATTENTION", { errorMessage: msg });
      }
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
      colorMode: firstItem.colorMode === "COLOR" ? "COLOR" : "BLACK_AND_WHITE",
      paperSize: firstItem.paperSize || "A4",
      duplexMode: firstItem.duplexMode || "SINGLE_SIDED",
      pageRange: firstItem.pageRange || "ALL",
      documentName: docMeta.filename || "customer_document.pdf",
    });

    jobLifecycleManager.transition(idempotencyKey, "VALIDATING");
    logger.info(`Claiming job ${job.orderNumber} (ID: ${job.jobId})...`);

    // 2. Claim Job
    let claimToken = "";
    try {
      const claimController = new AbortController();
      const claimTimeout = setTimeout(() => claimController.abort(), 10000);

      let claimRes: Response;
      try {
        claimRes = await fetch(`${backendUrl}/api/agent/jobs/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId,
            "x-device-token": deviceToken,
          },
          body: JSON.stringify({ jobId: job.jobId, leaseSeconds: 180 }),
          signal: claimController.signal,
        });
      } finally {
        clearTimeout(claimTimeout);
      }

      if (!claimRes.ok) {
        throw new Error(`Server returned HTTP ${claimRes.status}`);
      }

      const claimData = await claimRes.json();
      claimToken = claimData.claimToken;
      this.emitJob({ ...job, claimToken });
    } catch (claimErr: any) {
      const errMsg = `Could not claim job ${job.orderNumber}: ${claimErr.message}`;
      logger.warn(errMsg);
      jobLifecycleManager.transition(idempotencyKey, "FAILED", { errorMessage: errMsg });
      return;
    }

    const tempDownloadedFiles: string[] = [];

    try {
      // 3. Report DOWNLOADING to backend
      jobLifecycleManager.transition(idempotencyKey, "DOWNLOADING");
      await this.updateJobStatus(
        job.jobId,
        "DOWNLOADING",
        undefined,
        { details: "Workstation downloading document(s) securely" }
      );

      // 4. Retrieve Document Download SAS URL(s)
      const docController = new AbortController();
      const docTimeout = setTimeout(() => docController.abort(), 12000);

      let docRes: Response;
      try {
        docRes = await fetch(
          `${backendUrl}/api/agent/jobs/${job.jobId}/document?claimToken=${claimToken}`,
          {
            headers: {
              "x-device-id": deviceId,
              "x-device-token": deviceToken,
              "x-claim-token": claimToken,
            },
            signal: docController.signal,
          }
        );
      } finally {
        clearTimeout(docTimeout);
      }

      if (!docRes.ok) {
        throw new Error(`Failed to acquire download SAS URL from backend (HTTP ${docRes.status})`);
      }

      const docData = await docRes.json();
      const docList: any[] =
        Array.isArray(docData.documents) && docData.documents.length > 0
          ? docData.documents
          : docData.document
          ? [docData.document]
          : [];

      if (docList.length === 0) {
        throw new Error("Backend response did not provide any valid printable documents");
      }

      let totalSpooled = 0;
      let lastSpoolResult: any = null;

      // 5. Download and spool each document in the order sequentially
      for (let itemIdx = 0; itemIdx < docList.length; itemIdx++) {
        const itemDoc = docList[itemIdx];
        const rawDownloadUrl: string = itemDoc.downloadUrl;
        if (!rawDownloadUrl) {
          logger.warn(`Document #${itemIdx + 1} has no download URL, skipping`);
          continue;
        }

        const currentItemMeta = job.items?.[itemIdx] || {};
        const currentDocId = String(itemDoc.documentId || itemDoc.id || currentItemMeta.document?.id || `doc-${itemIdx}`);
        const currentItemId = String(itemDoc.itemId || currentItemMeta.itemId || `item-${itemIdx}`);
        const itemCopies = Math.max(1, Math.min(100, itemDoc.copies || currentItemMeta.copies || targetCopies));
        const itemColorMode = (itemDoc.colorMode || currentItemMeta.colorMode) === "COLOR" ? "COLOR" : "BLACK_AND_WHITE";
        const itemDuplexMode = itemDoc.duplexMode || currentItemMeta.duplexMode || firstItem.duplexMode || "SINGLE_SIDED";
        const itemPaperSize = itemDoc.paperSize || currentItemMeta.paperSize || firstItem.paperSize || "A4";
        const itemPageRange = itemDoc.pageRange || currentItemMeta.pageRange || firstItem.pageRange;
        const itemFilename = itemDoc.filename || currentItemMeta.document?.filename || `document_${itemIdx + 1}.pdf`;
        const itemMime = itemDoc.mimeType || currentItemMeta.document?.mimeType || "application/pdf";

        const itemKey = jobLifecycleManager.generateIdempotencyKey(
          job.orderId || job.orderNumber,
          currentItemId,
          currentDocId
        );

        if (
          jobLifecycleManager.isAlreadyDispatched(itemKey) ||
          jobLifecycleManager.isOrderAlreadyDispatched(job.orderId || job.orderNumber, currentDocId)
        ) {
          logger.info(`Document #${itemIdx + 1} (${itemFilename}) already spooled. Skipping duplicate.`);
          continue;
        }

        jobLifecycleManager.registerJob({
          jobId: `${job.jobId}-${itemIdx}`,
          orderId: job.orderId || job.orderNumber,
          orderNumber: job.orderNumber,
          idempotencyKey: itemKey,
          printerName: selectedPrinterName,
          totalCopies: itemCopies,
          colorMode: itemColorMode,
          paperSize: itemPaperSize,
          duplexMode: itemDuplexMode,
          pageRange: itemPageRange,
          documentName: itemFilename,
        });

        jobLifecycleManager.transition(itemKey, "DOWNLOADING");

        const fullDownloadUrl = rawDownloadUrl.startsWith("http")
          ? rawDownloadUrl
          : `${backendUrl}${rawDownloadUrl.startsWith("/") ? "" : "/"}${rawDownloadUrl}`;

        logger.info(`Downloading document #${itemIdx + 1} of ${docList.length} (${itemFilename}) securely...`);

        const fileHeaders: Record<string, string> = {};
        if (fullDownloadUrl.startsWith(backendUrl)) {
          fileHeaders["x-device-id"] = deviceId;
          fileHeaders["x-device-token"] = deviceToken;
          fileHeaders["x-claim-token"] = claimToken;
        }

        const dlController = new AbortController();
        const dlTimeout = setTimeout(() => dlController.abort(), 60000);

        let fileResp: Response;
        try {
          fileResp = await fetch(fullDownloadUrl, {
            headers: fileHeaders,
            signal: dlController.signal,
          });
        } finally {
          clearTimeout(dlTimeout);
        }

        if (!fileResp.ok) {
          throw new Error(`Failed to download document content (HTTP ${fileResp.status})`);
        }

        const arrayBuf = await fileResp.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuf);

        // Validate magic bytes, mime type, and integrity
        const validated = await tempFileManager.writeAndValidateBuffer(
          fileBuffer,
          itemFilename,
          itemMime
        );
        tempDownloadedFiles.push(validated.filePath);

        jobLifecycleManager.transition(itemKey, "READY_TO_PRINT", {
          fileSizeBytes: validated.fileSizeBytes,
          sha256Hash: validated.sha256Hash,
        });

        logger.info(
          `Document #${itemIdx + 1} verified (${(validated.fileSizeBytes / 1024).toFixed(1)} KB, ${validated.mimeType}). Submitting to '${selectedPrinterName}'...`
        );

        // Submit to Windows Printer Spooler
        jobLifecycleManager.transition(itemKey, "SUBMITTING");

        const spoolResult = await printerService.printDocument(validated.filePath, {
          printerName: selectedPrinterName,
          copies: itemCopies,
          colorMode: itemColorMode,
          duplexMode: itemDuplexMode,
          paperSize: itemPaperSize,
          pageRange: itemPageRange,
        });

        if (!spoolResult.success) {
          const errorMsg = `Spooler failed for '${itemFilename}': ${spoolResult.message}`;
          logger.error(errorMsg);
          jobLifecycleManager.transition(itemKey, "NEEDS_ATTENTION", {
            errorMessage: errorMsg,
          });

          await this.updateJobStatus(
            job.jobId,
            "REQUIRES_MANUAL_REVIEW",
            errorMsg
          );
          return;
        }

        // Record SUBMITTED_TO_SPOOLER with native Job ID
        jobLifecycleManager.transition(itemKey, "SUBMITTED_TO_SPOOLER", {
          windowsJobId: spoolResult.windowsJobId,
        });
        jobLifecycleManager.transition(itemKey, "COMPLETED", {
          windowsJobId: spoolResult.windowsJobId,
        });

        totalSpooled += 1;
        lastSpoolResult = spoolResult;

        logger.info(
          `Order ${job.orderNumber} (Doc #${itemIdx + 1}/${docList.length}): successfully submitted to Windows Spooler on ${selectedPrinterName}! (Spooler Job #${spoolResult.windowsJobId || "Active"})`
        );
      }

      await this.updateJobStatus(
        job.jobId,
        "COMPLETED",
        undefined,
        {
          windowsJobId: lastSpoolResult?.windowsJobId,
          printerName: selectedPrinterName,
          totalDocumentsPrinted: totalSpooled,
        }
      );

      logger.info(
        `Order ${job.orderNumber} successfully completed all ${totalSpooled} document(s) on ${selectedPrinterName}!`
      );
    } catch (jobErr: any) {
      const errMsg = jobErr.message || "Unknown print error";
      logger.error(`Print execution failed for ${job.orderNumber}: ${errMsg}`);
      jobLifecycleManager.transition(idempotencyKey, "NEEDS_ATTENTION", { errorMessage: errMsg });

      if (claimToken) {
        await this.updateJobStatus(
          job.jobId,
          "REQUIRES_MANUAL_REVIEW",
          `Print submission halted: ${errMsg}`
        );
      }
    } finally {
      // Safely schedule cleanup of all temporary documents (30-second delay so Windows Spooler finishes reading)
      for (const f of tempDownloadedFiles) {
        tempFileManager.cleanupFile(f, 30000);
      }
    }
  }

  /**
   * Monitors the Windows spooler for completion or errors after submission
   */
  private monitorSpoolerProgress(
    idempotencyKey: string,
    jobId: string,
    printerName: string,
    windowsJobId?: number
  ) {
    if (os.platform() !== "win32" || !windowsJobId) {
      // Mark as completed in lifecycle
      jobLifecycleManager.transition(idempotencyKey, "COMPLETED", { windowsJobId });
      this.updateJobStatus(jobId, "COMPLETED", undefined, { windowsJobId, printerName });
      return;
    }

    let pollCount = 0;
    const maxPolls = 30; // Check for up to 60 seconds

    const checkInterval = setInterval(async () => {
      pollCount++;
      try {
        const spoolJobs = await printerService.getSpoolerJobs(printerName);
        const activeJob = spoolJobs.find((j) => j.jobId === windowsJobId);

        if (activeJob) {
          // Job is still active in the Windows Spooler
          jobLifecycleManager.transition(idempotencyKey, "PRINTING", {
            windowsJobId,
            totalPages: activeJob.totalPages,
            pagesPrinted: activeJob.pagesPrinted,
          });

          // Check for errors in spool status
          const statusLower = activeJob.jobStatus.toLowerCase();
          if (statusLower.includes("error") || statusLower.includes("paper")) {
            clearInterval(checkInterval);
            jobLifecycleManager.transition(idempotencyKey, "NEEDS_ATTENTION", {
              errorMessage: `Spooler reports: ${activeJob.jobStatus}`,
            });
            await this.updateJobStatus(
              jobId,
              "REQUIRES_MANUAL_REVIEW",
              `Printer reported alert: ${activeJob.jobStatus}`
            );
          }
        } else {
          // Job left the spooler queue (spooling finished without error)
          clearInterval(checkInterval);
          jobLifecycleManager.transition(idempotencyKey, "COMPLETED", { windowsJobId });
          await this.updateJobStatus(
            jobId,
            "COMPLETED",
            undefined,
            { windowsJobId, printerName, completedSpooler: true }
          );
          logger.info(`Spooler job #${windowsJobId} completed processing successfully.`);
        }
      } catch (err) {
        // Non-fatal query error
      }

      if (pollCount >= maxPolls) {
        clearInterval(checkInterval);
        // Honest status: Still assume completed if no error reported
        const currentRecord = jobLifecycleManager.getRecord(idempotencyKey);
        if (currentRecord && currentRecord.state !== "COMPLETED") {
          jobLifecycleManager.transition(idempotencyKey, "COMPLETED", { windowsJobId });
          this.updateJobStatus(jobId, "COMPLETED", undefined, { windowsJobId, printerName });
        }
      }
    }, 2000);
  }

  /**
   * Update print job status on backend matching Rust backend UpdateJobStatusPayload contract
   */
  public async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string,
    metadata?: Record<string, any>
  ) {
    const config = configStore.getConfig();
    if (!config) return;
    const { backendUrl, deviceId, deviceToken } = config;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        await fetch(`${backendUrl}/api/agent/jobs/${jobId}/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id": deviceId,
            "x-device-token": deviceToken,
          },
          body: JSON.stringify({
            status,
            errorMessage: errorMessage || null,
            metadata: metadata || null,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err: any) {
      logger.warn(`Failed to update status ${status} for job ${jobId}: ${err.message}`);
    }
  }
}

export const agentWorker = new AgentWorker();
