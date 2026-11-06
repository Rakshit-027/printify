import { app, BrowserWindow, ipcMain, session, shell, Menu, Notification } from "electron";
import path from "path";
import os from "os";
import fs from "fs";
import { agentWorker } from "./agent-worker";
import { printerService } from "./printer-service";
import { tempFileManager } from "./temp-file-manager";
import { jobLifecycleManager } from "./job-lifecycle";

// CRITICAL FIX FOR LINUX UBUNTU WAYLAND & IBUS KEYBOARD INTERCEPTION:
if (process.platform === "linux") {
  process.env.GTK_IM_MODULE = "xim";
  process.env.IBUS_ENABLE_CTRL_SHIFT_U = "1";
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// Remove default application menu completely so Linux window manager does not trap keyboard accelerators
Menu.setApplicationMenu(null);

// Enforce single-instance lock to prevent duplicate print agent worker processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "Print2Me Workstation Desktop Agent (print2me.in)",
    backgroundColor: "#080c14",
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.setMenu(null);

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' https://api.print2me.in https://www.print2me.in https://print2me.in http://localhost:* https://*.windows.net https://fonts.googleapis.com https://fonts.gstatic.com data:; connect-src 'self' https://api.print2me.in https://www.print2me.in https://print2me.in http://localhost:* https://*.windows.net data:; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:;",
        ],
      },
    });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const rendererHtml = path.join(__dirname, "../renderer/index.html");
  mainWindow.loadFile(rendererHtml).catch(() => {
    console.log("Renderer HTML loading started.");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.focus();
    mainWindow?.webContents.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Forward agent logs to renderer
  agentWorker.onLog((log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("agent:log", log);
    }
  });

  // Forward claimed jobs and trigger native OS notification
  agentWorker.onJob((job) => {
    try {
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: `🖨️ New Print Order #${job.orderNumber || ''}`,
          body: `${job.copies || 1} copy (${job.colorMode || 'Standard'}) ready for printing`,
          icon: path.join(__dirname, "../renderer/brand/print2me-icon.png"),
          silent: false,
        });
        notif.show();
      }
    } catch (notifErr) {
      console.warn("Failed to trigger native OS notification:", notifErr);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("agent:new-job", job);
    }
  });

  // Start polling if configured
  agentWorker.startPolling();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  agentWorker.stopPolling();
  if (process.platform !== "darwin") app.quit();
});

// -------------------------------------------------------------
// SECURE IPC HANDLERS - PRODUCTION READY REAL PRINTER ARCHITECTURE
// -------------------------------------------------------------

ipcMain.handle("agent:get-status", async () => {
  const config = agentWorker.getConfig();
  const printers = await printerService.getInstalledPrinters();
  return {
    isEnrolled: Boolean(config?.deviceId),
    config,
    printers,
  };
});

ipcMain.handle("agent:login", async (_event: any, params: any) => {
  const { backendUrl = "https://www.print2me.in", email, password, deviceName = "Counter-Workstation-01" } = params;
  try {
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Invalid vendor credentials");

    let sessionToken = data.token || "";
    if (!sessionToken) {
      const setCookie = res.headers.get("set-cookie") || "";
      const match = setCookie.match(/printflow_session=([^;]+)/) || setCookie.match(/session_token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

    const vendor = data.user?.vendor;
    if (!vendor) throw new Error("Your account is not linked to any active vendor print store.");

    // Auto-generate or get enrollment code
    const authHeaders: Record<string, string> = {};
    if (sessionToken) {
      authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      authHeaders["Cookie"] = `printflow_session=${sessionToken}`;
    }

    let enrollmentCode = "";
    try {
      const enrollCodeRes = await fetch(`${backendUrl}/api/vendor/devices/enrollment-code`, {
        headers: authHeaders,
      });
      const enrollCodeData = await enrollCodeRes.json();
      if (enrollCodeRes.ok && enrollCodeData.enrollmentCode) {
        enrollmentCode = enrollCodeData.enrollmentCode;
      }
    } catch {
      // Fallback
    }

    if (!enrollmentCode) {
      enrollmentCode = `ENROLL-${vendor.slug?.toUpperCase()?.slice(0, 4) || "PRNT"}-AUTO`;
    }

    // Enroll this device workstation
    const enrollRes = await fetch(`${backendUrl}/api/agent/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentCode,
        deviceName,
        osVersion: `${process.platform} ${process.arch}`,
        agentVersion: "1.0.0",
      }),
    });

    if (!enrollRes.ok) {
      const errBody = await enrollRes.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Failed to enroll workstation device with server (HTTP ${enrollRes.status})`);
    }
    const enrollData = await enrollRes.json();

    agentWorker.saveConfig({
      backendUrl,
      deviceId: enrollData.deviceId,
      deviceToken: enrollData.deviceToken,
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      userEmail: data.user.email,
      sessionToken,
      deviceName,
      isPollingActive: true,
    });

    agentWorker.startPolling();
    return { success: true, user: data.user, vendor };
  } catch (err: any) {
    return { success: false, error: err.message || "Login request failed" };
  }
});

ipcMain.handle("agent:send-otp", async (_event: any, params: any) => {
  const { backendUrl = "https://www.print2me.in", email } = params;
  try {
    const res = await fetch(`${backendUrl}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Failed to send verification code");
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Network request failed" };
  }
});

ipcMain.handle("agent:verify-otp", async (_event: any, params: any) => {
  const { backendUrl = "https://www.print2me.in", email, otp } = params;
  try {
    const res = await fetch(`${backendUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Invalid verification code");
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err.message || "Verification request failed" };
  }
});

ipcMain.handle("agent:register-vendor", async (_event: any, params: any) => {
  const {
    backendUrl = "https://www.print2me.in",
    email,
    password,
    fullName,
    vendorName,
    contactPhone,
    address,
    slug,
    otp,
    deviceName = "Counter-Workstation-01",
  } = params;

  try {
    const res = await fetch(`${backendUrl}/api/auth/register-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        vendorName,
        contactPhone,
        address,
        slug,
        otp,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Registration failed");

    let sessionToken = data.token || "";
    if (!sessionToken) {
      const setCookie = res.headers.get("set-cookie") || "";
      const match = setCookie.match(/printflow_session=([^;]+)/) || setCookie.match(/session_token=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }

    const vendor = data.user?.vendor;
    if (!vendor) throw new Error("Registered successfully, but vendor store could not be linked.");

    // Auto-generate or get enrollment code
    const authHeaders: Record<string, string> = {};
    if (sessionToken) {
      authHeaders["Authorization"] = `Bearer ${sessionToken}`;
      authHeaders["Cookie"] = `printflow_session=${sessionToken}`;
    }

    let enrollmentCode = "";
    try {
      const enrollCodeRes = await fetch(`${backendUrl}/api/vendor/devices/enrollment-code`, {
        headers: authHeaders,
      });
      const enrollCodeData = await enrollCodeRes.json();
      if (enrollCodeRes.ok && enrollCodeData.enrollmentCode) {
        enrollmentCode = enrollCodeData.enrollmentCode;
      }
    } catch {
      // Fallback
    }

    if (!enrollmentCode) {
      enrollmentCode = `ENROLL-${vendor.slug?.toUpperCase()?.slice(0, 4) || "PRNT"}-AUTO`;
    }

    // Enroll this device workstation
    const enrollRes = await fetch(`${backendUrl}/api/agent/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentCode,
        deviceName,
        osVersion: `${process.platform} ${process.arch}`,
        agentVersion: "1.0.0",
      }),
    });

    if (!enrollRes.ok) {
      const errBody = await enrollRes.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || `Failed to enroll workstation device with server (HTTP ${enrollRes.status})`);
    }
    const enrollData = await enrollRes.json();

    agentWorker.saveConfig({
      backendUrl,
      deviceId: enrollData.deviceId,
      deviceToken: enrollData.deviceToken,
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      userEmail: data.user.email,
      sessionToken,
      deviceName,
      isPollingActive: true,
    });

    agentWorker.startPolling();
    return { success: true, user: data.user, vendor };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration request failed" };
  }
});

ipcMain.handle("agent:enroll-device", async (_event: any, params: any) => {
  const { backendUrl = "https://www.print2me.in", enrollmentCode, deviceName = "Counter-Workstation-01" } = params;
  try {
    const res = await fetch(`${backendUrl}/api/agent/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollmentCode,
        deviceName,
        osVersion: `${process.platform} ${process.arch}`,
        agentVersion: "1.0.0",
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Enrollment failed. Invalid or expired code.");

    agentWorker.saveConfig({
      backendUrl,
      deviceId: data.deviceId,
      deviceToken: data.deviceToken,
      vendorName: data.vendor?.name || "Connected Store",
      vendorSlug: data.vendor?.slug || "store",
      deviceName,
      isPollingActive: true,
    });

    agentWorker.startPolling();
    return { success: true, vendor: data.vendor, vendorName: data.vendor?.name };
  } catch (err: any) {
    return { success: false, error: err.message || "Enrollment request failed" };
  }
});

ipcMain.handle("agent:logout", async () => {
  agentWorker.clearConfig();
  return { success: true };
});

ipcMain.handle("agent:sync-printers", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Agent not enrolled" };

  try {
    const printers = await printerService.getInstalledPrinters(true);
    const res = await fetch(`${config.backendUrl}/api/agent/printers/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": config.deviceId,
        "x-device-token": config.deviceToken,
      },
      body: JSON.stringify({ printers }),
    });

    const data = await res.json();
    return { success: res.ok, printers, message: data.message };
  } catch (err: any) {
    const printers = await printerService.getInstalledPrinters(true);
    return { success: true, printers, message: "Printers enumerated from operating system" };
  }
});

ipcMain.handle("agent:set-printer-preference", async (_event: any, params: any) => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Agent not enrolled" };
  if (params.defaultBwPrinter !== undefined) {
    config.defaultBwPrinter = params.defaultBwPrinter;
  }
  if (params.defaultColorPrinter !== undefined) {
    config.defaultColorPrinter = params.defaultColorPrinter;
  }
  agentWorker.saveConfig(config);
  return { success: true, config };
});

ipcMain.handle("agent:test-print", async (_event: any, printerName: string) => {
  try {
    const res = await printerService.printTestPage(printerName);
    return res;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("agent:open-printer-queue", async (_event: any, printerName: string) => {
  try {
    const res = await printerService.openPrinterQueue(printerName);
    return res;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("agent:open-windows-printer-settings", async () => {
  try {
    const res = await printerService.openWindowsPrinterSettings();
    return res;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("agent:get-diagnostics", async () => {
  const config = agentWorker.getConfig();
  const printers = await printerService.getInstalledPrinters();
  const spoolerJobs = await printerService.getSpoolerJobs();
  const recentJobs = jobLifecycleManager.getAllRecords().slice(0, 20);
  const networkDiagnostics = await printerService.getNetworkDiagnostics();

  return {
    success: true,
    agentVersion: "1.0.0",
    platform: `${process.platform} ${os.release()} (${process.arch})`,
    isEnrolled: Boolean(config?.deviceId),
    vendorName: config?.vendorName || "Not Connected",
    selectedBwPrinter: config?.defaultBwPrinter || "OS Default",
    selectedColorPrinter: config?.defaultColorPrinter || "OS Default",
    printers,
    spoolerJobs,
    recentJobs,
    networkDiagnostics,
  };
});

ipcMain.handle("agent:get-network-troubleshooting", async () => {
  try {
    const diag = await printerService.getNetworkDiagnostics();
    const printers = await printerService.getInstalledPrinters();
    return {
      success: true,
      ...diag,
      printers,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:retry-job", async (_event: any, params: any) => {
  const { idempotencyKey } = params;
  try {
    const record = jobLifecycleManager.allowManualRetry(idempotencyKey);
    return { success: true, record };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:get-job-history", async () => {
  return {
    success: true,
    jobs: jobLifecycleManager.getAllRecords(),
  };
});

/**
 * Genuine Direct Document Printing for Vendor Dashboard Orders
 * Downloads real document from backend, applies real settings, submits to genuine Windows spooler
 */
ipcMain.handle("agent:print-order-direct", async (_event: any, params: any) => {
  const { orderId, orderNumber, printerName } = params;
  const config = agentWorker.getConfig();
  if (!config) {
    return { success: false, message: "Workstation is not logged in or enrolled." };
  }

  let tempDownloadedFiles: string[] = [];

  try {
    // 1. Authenticate and retrieve actual order document download URLs from backend
    const authHeaders: Record<string, string> = {};
    if (config.sessionToken) {
      authHeaders["Authorization"] = `Bearer ${config.sessionToken}`;
      authHeaders["Cookie"] = `printflow_session=${config.sessionToken}; session_token=${config.sessionToken}`;
    }
    if (config.deviceId) authHeaders["x-device-id"] = config.deviceId;
    if (config.deviceToken) authHeaders["x-device-token"] = config.deviceToken;

    const docRes = await fetch(`${config.backendUrl}/api/vendor/orders/${orderId}/document`, {
      headers: authHeaders,
    });

    if (!docRes.ok) {
      throw new Error(`Failed to retrieve order document from server (HTTP ${docRes.status})`);
    }

    const docData = await docRes.json();
    const documents =
      Array.isArray(docData.documents) && docData.documents.length > 0
        ? docData.documents
        : docData.document
        ? [docData.document]
        : [];

    if (documents.length === 0) {
      throw new Error("No printable document items found attached to this order.");
    }

    // 2. Discover Real Target Printer
    const allPrinters = await printerService.getInstalledPrinters();
    if (allPrinters.length === 0) {
      throw new Error(
        "No printers are installed on this computer. Connect or install a printer in Windows first."
      );
    }

    let finalPrinter = printerName;
    if (!finalPrinter) {
      const isColor = documents.some((d: any) => (d.colorMode || d.color_mode) === "COLOR");
      if (isColor && config.defaultColorPrinter) {
        finalPrinter = config.defaultColorPrinter;
      } else if (!isColor && config.defaultBwPrinter) {
        finalPrinter = config.defaultBwPrinter;
      } else {
        const defaultPrn = allPrinters.find((p) => p.isDefault) || allPrinters[0];
        finalPrinter = defaultPrn?.systemName;
      }
    }

    const matchedPrinter = allPrinters.find(
      (p) => p.systemName.toLowerCase() === (finalPrinter || "").toLowerCase()
    );

    if (!matchedPrinter) {
      throw new Error(
        `Selected printer '${finalPrinter}' is not installed in Windows. Please select a valid printer in Printer Settings.`
      );
    }

    if (!matchedPrinter.isOnline) {
      const connMsg =
        matchedPrinter.connectionType === "WIFI"
          ? "Wi-Fi printer is offline. Verify that the printer is turned on, awake from sleep mode, and connected to the same Wi-Fi network."
          : matchedPrinter.connectionType === "ETHERNET"
          ? "Ethernet printer is offline. Verify the network cable, router link light, and printer IP address."
          : matchedPrinter.connectionType === "SHARED"
          ? "Windows shared printer is unreachable. Ensure the host computer sharing this printer is powered on and accessible."
          : matchedPrinter.connectionType === "IPP"
          ? "IPP network printer is unreachable. Verify network connection and IPP port status."
          : "Please check printer power and cable connection.";
      throw new Error(
        `Printer '${matchedPrinter.systemName}' (${matchedPrinter.connectionType}) is currently OFFLINE or disconnected. ${connMsg}`
      );
    }

    // 3. Process and print each real document item
    let totalSpooled = 0;
    let lastSpoolResult: any = null;

    for (const doc of documents) {
      const docId = doc.documentId || doc.id || doc.doc_id || "direct";
      const docFilename = doc.filename || doc.originalName || doc.original_name || "customer_document.pdf";
      const docMime = doc.mimeType || doc.mime_type || "application/pdf";
      const docCopies = doc.copies || params.copies || 1;
      const docColorMode = doc.colorMode || doc.color_mode || "BLACK_AND_WHITE";
      const docPaperSize = doc.paperSize || doc.paper_size || "A4";
      const docDuplexMode = doc.duplexMode || doc.duplex_mode || "SINGLE_SIDED";
      const docPageRange = doc.pageRange || doc.page_range || "ALL";

      const idempotencyKey = jobLifecycleManager.generateIdempotencyKey(
        orderId,
        doc.itemId || "direct",
        docId
      );

      // Guard against accidental duplicate prints for this specific document item
      const isAlreadyDispatched =
        jobLifecycleManager.isAlreadyDispatched(idempotencyKey) ||
        jobLifecycleManager.isOrderAlreadyDispatched(orderId, docId) ||
        (orderNumber && jobLifecycleManager.isOrderAlreadyDispatched(orderNumber, docId));

      if (isAlreadyDispatched && !params.forceRetry) {
        console.warn(`[DIRECT-PRINT] Document ${docFilename} for order ${orderNumber || orderId} already spooled. Skipping duplicate.`);
        continue;
      }

      jobLifecycleManager.registerJob({
        jobId: `direct-${orderId}-${Date.now()}`,
        orderId,
        orderNumber: orderNumber || orderId,
        idempotencyKey,
        printerName: matchedPrinter.systemName,
        totalCopies: docCopies,
        colorMode: docColorMode,
        paperSize: docPaperSize,
        duplexMode: docDuplexMode,
        pageRange: docPageRange,
        documentName: docFilename,
      });

      jobLifecycleManager.transition(idempotencyKey, "DOWNLOADING");

      const downloadUrl: string = doc.downloadUrl || doc.download_url;
      if (!downloadUrl) {
        throw new Error(`Order document ${docFilename} has no valid download URL from server.`);
      }

      const fullUrl = downloadUrl.startsWith("http")
        ? downloadUrl
        : `${config.backendUrl}${downloadUrl.startsWith("/") ? "" : "/"}${downloadUrl}`;

      const dlHeaders: Record<string, string> = {};
      if (fullUrl.startsWith(config.backendUrl)) {
        Object.assign(dlHeaders, authHeaders);
      }

      const fileResp = await fetch(fullUrl, { headers: dlHeaders });
      if (!fileResp.ok) {
        throw new Error(`Failed to download '${docFilename}' (HTTP ${fileResp.status})`);
      }

      const arrayBuf = await fileResp.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuf);

      // Validate magic bytes and enforce security limits
      const validated = await tempFileManager.writeAndValidateBuffer(
        fileBuffer,
        docFilename,
        docMime
      );
      tempDownloadedFiles.push(validated.filePath);

      jobLifecycleManager.transition(idempotencyKey, "READY_TO_PRINT", {
        fileSizeBytes: validated.fileSizeBytes,
        sha256Hash: validated.sha256Hash,
      });

      // Submit actual file to Windows printer
      jobLifecycleManager.transition(idempotencyKey, "SUBMITTING");

      const printResult = await printerService.printDocument(validated.filePath, {
        printerName: matchedPrinter.systemName,
        copies: docCopies,
        colorMode: docColorMode,
        duplexMode: docDuplexMode,
        paperSize: docPaperSize,
        pageRange: docPageRange,
      });

      if (!printResult.success) {
        jobLifecycleManager.transition(idempotencyKey, "NEEDS_ATTENTION", {
          errorMessage: printResult.message,
        });
        throw new Error(`Spooler Error on '${matchedPrinter.systemName}': ${printResult.message}`);
      }

      jobLifecycleManager.transition(idempotencyKey, "SUBMITTED_TO_SPOOLER", {
        windowsJobId: printResult.windowsJobId,
      });

      jobLifecycleManager.transition(idempotencyKey, "COMPLETED", {
        windowsJobId: printResult.windowsJobId,
      });

      if (orderNumber && orderNumber !== orderId) {
        const mirrorKey = jobLifecycleManager.generateIdempotencyKey(orderNumber, doc.itemId || "direct", docId);
        if (!jobLifecycleManager.getRecord(mirrorKey)) {
          jobLifecycleManager.registerJob({
            jobId: `mirror-${orderId}-${Date.now()}`,
            orderId,
            orderNumber,
            idempotencyKey: mirrorKey,
            printerName: matchedPrinter.systemName,
            totalCopies: docCopies,
            colorMode: docColorMode,
            paperSize: docPaperSize,
            duplexMode: docDuplexMode,
            pageRange: docPageRange,
            documentName: docFilename,
          });
          jobLifecycleManager.transition(mirrorKey, "COMPLETED", {
            windowsJobId: printResult.windowsJobId,
          });
        }
      }

      totalSpooled += 1;
      lastSpoolResult = printResult;
    }

    return {
      success: true,
      message: `Successfully spooled ${totalSpooled} document(s) to Windows printer '${matchedPrinter.systemName}'`,
      windowsJobId: lastSpoolResult?.windowsJobId,
    };
  } catch (err: any) {
    console.error("[DIRECT-PRINT] Direct printing error:", err);
    return {
      success: false,
      message: err.message || "Failed to submit document to Windows printer",
    };
  } finally {
    // Clean up all temporary files safely
    for (const f of tempDownloadedFiles) {
      tempFileManager.cleanupFile(f);
    }
  }
});

ipcMain.handle("agent:get-orders", async (_event: any, statusParam = "ALL") => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, orders: [] };

  try {
    const headers: Record<string, string> = {};
    if (config.sessionToken) {
      headers["Authorization"] = `Bearer ${config.sessionToken}`;
      headers["Cookie"] = `printflow_session=${config.sessionToken}; session_token=${config.sessionToken}`;
    }
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetch(`${config.backendUrl}/api/vendor/orders?status=${statusParam}`, {
      headers,
    });
    const data = await res.json();
    if (res.ok && data.orders) {
      return { success: true, orders: data.orders };
    }
    return { success: false, error: data.error || "Failed to fetch orders from server", orders: [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Backend server unreachable", orders: [] };
  }
});

ipcMain.handle("agent:update-order-status", async (_event: any, params: any) => {
  const { orderId, action } = params;
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) {
      headers["Authorization"] = `Bearer ${config.sessionToken}`;
      headers["Cookie"] = `printflow_session=${config.sessionToken}; session_token=${config.sessionToken}`;
    }
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetch(`${config.backendUrl}/api/vendor/orders/${orderId}/status`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, order: data.order };
    } else {
      return { success: false, error: data.error || "Failed to update order status" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:get-pricing", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = {};
    if (config.sessionToken) {
      headers["Authorization"] = `Bearer ${config.sessionToken}`;
      headers["Cookie"] = `printflow_session=${config.sessionToken}; session_token=${config.sessionToken}`;
    }
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;
    const res = await fetch(`${config.backendUrl}/api/vendor/pricing`, { headers });
    const data = await res.json();
    if (res.ok && data.pricing) {
      return { success: true, pricing: data.pricing, minimumOrderMinor: data.minimumOrderMinor };
    }
  } catch (err: any) {
    console.error("Fetch pricing error:", err);
  }

  return {
    success: true,
    pricing: [
      { paperSize: "A4", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 200, isActive: true },
      { paperSize: "A4", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 175, isActive: true },
      { paperSize: "A4", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1000, isActive: true },
      { paperSize: "A4", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 900, isActive: true },
      { paperSize: "A3", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 500, isActive: false },
      { paperSize: "A3", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 450, isActive: false },
      { paperSize: "A3", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 2000, isActive: false },
      { paperSize: "A3", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 1800, isActive: false },
      { paperSize: "LEGAL", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 300, isActive: false },
      { paperSize: "LEGAL", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 250, isActive: false },
      { paperSize: "LEGAL", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1200, isActive: false },
      { paperSize: "LEGAL", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 1100, isActive: false },
      { paperSize: "LETTER", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 200, isActive: false },
      { paperSize: "LETTER", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 175, isActive: false },
      { paperSize: "LETTER", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1000, isActive: false },
      { paperSize: "LETTER", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 900, isActive: false },
    ],
    minimumOrderMinor: 500,
  };
});

ipcMain.handle("agent:update-pricing", async (_event: any, params: any) => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) {
      headers["Authorization"] = `Bearer ${config.sessionToken}`;
      headers["Cookie"] = `printflow_session=${config.sessionToken}; session_token=${config.sessionToken}`;
    }
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;
    const res = await fetch(`${config.backendUrl}/api/vendor/pricing`, {
      method: "PUT",
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, message: data.message || "Pricing updated successfully" };
    } else {
      return { success: false, error: data.error || "Failed to update pricing" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:toggle-polling", async (_event: any, active: boolean) => {
  if (active) {
    agentWorker.startPolling();
  } else {
    agentWorker.stopPolling();
  }
  return true;
});

ipcMain.handle("agent:open-external-url", async (_event: any, url: string) => {
  if (!url || typeof url !== "string") {
    return { success: false, error: "Invalid URL" };
  }
  // Security guard: Only allow opening http and https URLs in external browser
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    return { success: false, error: "Only HTTP/HTTPS URLs are permitted" };
  }
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Helper for bounded fetch requests
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// -------------------------------------------------------------
// VENDOR SUBSCRIPTION IPC HANDLERS
// -------------------------------------------------------------

ipcMain.handle("agent:get-subscription", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = {};
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(`${config.backendUrl}/api/vendor/subscription`, { headers }, 10000);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:validate-subscription-coupon", async (_event: any, params: any) => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/subscription/validate-coupon`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      },
      10000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:checkout-subscription", async (_event: any, params: any) => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/subscription/checkout`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      },
      15000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:verify-subscription", async (_event: any, params: any) => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/subscription/verify`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      },
      15000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// -------------------------------------------------------------
// RAZORPAY PARTNER ONBOARDING & PAYMENT GATEWAY IPC HANDLERS
// -------------------------------------------------------------

ipcMain.handle("agent:get-razorpay-status", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = {};
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/payments/razorpay/status`,
      { headers },
      10000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:connect-razorpay", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/payments/razorpay/connect`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      },
      15000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:sync-razorpay", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/payments/razorpay/sync`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      },
      15000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:disconnect-razorpay", async () => {
  const config = agentWorker.getConfig();
  if (!config) return { success: false, error: "Not logged in" };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
    if (config.deviceId) headers["x-device-id"] = config.deviceId;
    if (config.deviceToken) headers["x-device-token"] = config.deviceToken;

    const res = await fetchWithTimeout(
      `${config.backendUrl}/api/vendor/payments/razorpay/disconnect`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      },
      15000
    );
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
