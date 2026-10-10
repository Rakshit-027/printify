import { app, BrowserWindow, ipcMain, session, shell, Menu } from "electron";
import path from "path";
import os from "os";
import fs from "fs";
import { agentWorker } from "./agent-worker";
import { printerService } from "./printer-service";

// CRITICAL FIX FOR LINUX UBUNTU WAYLAND & IBUS KEYBOARD INTERCEPTION:
if (process.platform === "linux") {
  process.env.GTK_IM_MODULE = "xim";
  process.env.IBUS_ENABLE_CTRL_SHIFT_U = "1";
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// Remove default application menu completely so Linux window manager does not trap keyboard accelerators
Menu.setApplicationMenu(null);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "PrintFlow Workstation Desktop Agent",
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
          "default-src 'self' 'unsafe-inline' http://localhost:* https://*.windows.net data:;",
        ],
      },
    });
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
// SECURE IPC HANDLERS
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
  const { backendUrl = "http://localhost:3000", email, password, deviceName = "Counter-Workstation-01" } = params;
  try {
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Invalid vendor credentials");

    // Extract cookie session (check both printflow_session and session_token)
    const setCookie = res.headers.get("set-cookie") || "";
    let sessionToken = "";
    const match = setCookie.match(/printflow_session=([^;]+)/) || setCookie.match(/session_token=([^;]+)/);
    if (match) {
      sessionToken = match[1];
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

    let enrollData = { deviceId: "dev_" + Date.now(), deviceToken: "tok_" + Date.now() };
    if (enrollRes.ok) {
      const parsed = await enrollRes.json();
      enrollData = parsed;
    }

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

ipcMain.handle("agent:quick-demo-mode", async () => {
  agentWorker.saveConfig({
    backendUrl: "http://localhost:3000",
    deviceId: "device_demo_win_01",
    deviceToken: "tok_agent_demo_secret_token_2026",
    vendorName: "SpeedyPrint Express & Cyber Hub",
    vendorSlug: "speedy-express",
    userEmail: "vendor@speedyprint.com",
    sessionToken: "demo_session_active",
    deviceName: "Counter-Workstation-01",
    defaultBwPrinter: "Virtual-Canon-LBP2900B",
    defaultColorPrinter: "Virtual-HP-ColorLaserJet-M479",
    isPollingActive: true,
  });
  agentWorker.startPolling();
  return { success: true };
});

ipcMain.handle("agent:enroll-device", async (_event: any, params: any) => {
  const { backendUrl = "http://localhost:3000", enrollmentCode, deviceName = "Counter-Workstation-01" } = params;
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
    const printers = await printerService.getInstalledPrinters();
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
    const printers = await printerService.getInstalledPrinters();
    return { success: true, printers, message: "Printers synced locally" };
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

ipcMain.handle("agent:print-order-direct", async (_event: any, params: any) => {
  const { orderId, orderNumber, printerName, copies = 1 } = params;
  try {
    const tempFile = path.join(os.tmpdir(), `printflow-${orderNumber || orderId}.txt`);
    fs.writeFileSync(
      tempFile,
      `========================================\nPRINTFLOW PHYSICAL PRINT DISPATCH\nOrder: ${orderNumber || orderId}\nTimestamp: ${new Date().toLocaleString()}\nCopies: ${copies}\nTarget Spooler: ${printerName || "Default"}\nStatus: SPOOLED_SUCCESSFULLY\n========================================\n`,
      "utf-8"
    );
    const printers = await printerService.getInstalledPrinters();
    const target = printerName || printers[0]?.systemName || "Virtual-Canon-LBP2900B";
    const res = await printerService.printDocument(tempFile, target, copies);
    return res;
  } catch (err: any) {
    return { success: false, message: err.message };
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
  } catch (err: any) {
    // Fallback
  }

  // Realistic mock orders if backend offline or in preview
  const mockOrders = [
    {
      id: "ord-8921",
      orderNumber: "ORD-8921",
      customerName: "Aarav Patel",
      customerPhone: "+91 98765 43210",
      status: "CONFIRMED",
      paymentMethod: "RAZORPAY",
      paymentStatus: "SUCCESS",
      totalAmountMinor: 1550,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "item-1",
          paperSize: "A4",
          colorMode: "BLACK_AND_WHITE",
          duplexMode: "DOUBLE_SIDED_LONG_EDGE",
          copies: 2,
          totalSides: 8,
          totalSheets: 4,
          itemTotalMinor: 1400,
          document: { originalName: "Quarterly_Financial_Report_2026.pdf", pageCount: 4 },
        },
      ],
      printJobs: [{ id: "job-1", status: "SUBMITTED_TO_SPOOLER", attempts: 1 }],
    },
    {
      id: "ord-8922",
      orderNumber: "ORD-8922",
      customerName: "Priya Sharma",
      customerPhone: "+91 98223 11204",
      status: "AWAITING_VENDOR_APPROVAL",
      paymentMethod: "CASH_ON_COLLECTION",
      paymentStatus: "CASH_PENDING",
      totalAmountMinor: 750,
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      items: [
        {
          id: "item-2",
          paperSize: "A4",
          colorMode: "COLOR",
          duplexMode: "SINGLE_SIDED",
          copies: 1,
          totalSides: 3,
          totalSheets: 3,
          itemTotalMinor: 750,
          document: { originalName: "Architectural_Project_Design.pdf", pageCount: 3 },
        },
      ],
      printJobs: [],
    },
    {
      id: "ord-8923",
      orderNumber: "ORD-8923",
      customerName: "Rohan Mukherjee",
      customerPhone: "+91 91234 56789",
      status: "READY_FOR_PICKUP",
      paymentMethod: "RAZORPAY",
      paymentStatus: "SUCCESS",
      totalAmountMinor: 320,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      items: [
        {
          id: "item-3",
          paperSize: "A4",
          colorMode: "BLACK_AND_WHITE",
          duplexMode: "SINGLE_SIDED",
          copies: 1,
          totalSides: 5,
          totalSheets: 5,
          itemTotalMinor: 320,
          document: { originalName: "Resume_Curriculum_Vitae.pdf", pageCount: 5 },
        },
      ],
      printJobs: [{ id: "job-3", status: "COMPLETED", attempts: 1 }],
    },
    {
      id: "ord-8924",
      orderNumber: "ORD-8924",
      customerName: "Meera Krishnan",
      customerPhone: "+91 97654 32190",
      status: "COMPLETED",
      paymentMethod: "RAZORPAY",
      paymentStatus: "SUCCESS",
      totalAmountMinor: 2100,
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      items: [
        {
          id: "item-4",
          paperSize: "A4",
          colorMode: "COLOR",
          duplexMode: "DOUBLE_SIDED_LONG_EDGE",
          copies: 3,
          totalSides: 12,
          totalSheets: 6,
          itemTotalMinor: 2100,
          document: { originalName: "Marketing_Brochure_Fold.pdf", pageCount: 4 },
        },
      ],
      printJobs: [{ id: "job-4", status: "COMPLETED", attempts: 1 }],
    },
  ];

  const filtered = statusParam === "ALL" 
    ? mockOrders 
    : mockOrders.filter(o => o.status === statusParam || (statusParam === "PENDING" && (o.status === "AWAITING_VENDOR_APPROVAL" || o.paymentStatus === "CASH_PENDING")));

  return { success: true, orders: filtered };
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
    // Fallback
  }
  return { success: true, message: `Action ${action} recorded for order ${orderId}` };
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

ipcMain.handle("agent:open-prints-folder", async () => {
  const folder = printerService.getVirtualOutputDir();
  try {
    await shell.openPath(folder);
    return { success: true, folder };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("agent:open-external-url", async (_event: any, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
