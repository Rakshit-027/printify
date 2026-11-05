import { contextBridge, ipcRenderer } from "electron";

export interface PrintAgentApi {
  getStatus: () => Promise<any>;
  login: (params: { backendUrl?: string; email: string; password: string; deviceName?: string }) => Promise<any>;
  enrollDevice: (params: { backendUrl?: string; enrollmentCode: string; deviceName?: string }) => Promise<any>;
  logout: () => Promise<any>;
  syncPrinters: () => Promise<any>;
  setPrinterPreference: (params: { defaultBwPrinter?: string; defaultColorPrinter?: string }) => Promise<any>;
  testPrint: (printerName: string) => Promise<any>;
  openPrinterQueue: (printerName: string) => Promise<any>;
  openWindowsPrinterSettings: () => Promise<any>;
  getDiagnostics: () => Promise<any>;
  retryJob: (params: { idempotencyKey: string }) => Promise<any>;
  getJobHistory: () => Promise<any>;
  printOrderDirect: (params: { orderId: string; orderNumber?: string; printerName?: string; copies?: number; forceRetry?: boolean }) => Promise<any>;
  togglePolling: (active: boolean) => Promise<boolean>;
  getOrders: (status?: string) => Promise<any>;
  updateOrderStatus: (params: { orderId: string; action: string }) => Promise<any>;
  getPricing: () => Promise<any>;
  updatePricing: (params: { pricing: any[]; minimumOrderMinor?: number }) => Promise<any>;
  sendOtp: (params: { backendUrl?: string; email: string }) => Promise<any>;
  verifyOtp: (params: { backendUrl?: string; email: string; otp: string }) => Promise<any>;
  registerVendor: (params: {
    backendUrl?: string;
    email: string;
    password: string;
    fullName: string;
    vendorName: string;
    contactPhone: string;
    address: string;
    slug?: string;
    otp?: string;
    deviceName?: string;
  }) => Promise<any>;
  openExternalUrl: (url: string) => Promise<any>;
  onLog: (callback: (log: any) => void) => () => void;
  onNewJob: (callback: (job: any) => void) => () => void;
}

const printAgentApi: PrintAgentApi = {
  getStatus: () => ipcRenderer.invoke("agent:get-status"),
  login: (params) => ipcRenderer.invoke("agent:login", params),
  sendOtp: (params) => ipcRenderer.invoke("agent:send-otp", params),
  verifyOtp: (params) => ipcRenderer.invoke("agent:verify-otp", params),
  registerVendor: (params) => ipcRenderer.invoke("agent:register-vendor", params),
  enrollDevice: (params) => ipcRenderer.invoke("agent:enroll-device", params),
  logout: () => ipcRenderer.invoke("agent:logout"),
  syncPrinters: () => ipcRenderer.invoke("agent:sync-printers"),
  setPrinterPreference: (params) => ipcRenderer.invoke("agent:set-printer-preference", params),
  testPrint: (printerName) => ipcRenderer.invoke("agent:test-print", printerName),
  openPrinterQueue: (printerName) => ipcRenderer.invoke("agent:open-printer-queue", printerName),
  openWindowsPrinterSettings: () => ipcRenderer.invoke("agent:open-windows-printer-settings"),
  getDiagnostics: () => ipcRenderer.invoke("agent:get-diagnostics"),
  retryJob: (params) => ipcRenderer.invoke("agent:retry-job", params),
  getJobHistory: () => ipcRenderer.invoke("agent:get-job-history"),
  printOrderDirect: (params) => ipcRenderer.invoke("agent:print-order-direct", params),
  togglePolling: (active) => ipcRenderer.invoke("agent:toggle-polling", active),
  getOrders: (status) => ipcRenderer.invoke("agent:get-orders", status),
  updateOrderStatus: (params) => ipcRenderer.invoke("agent:update-order-status", params),
  getPricing: () => ipcRenderer.invoke("agent:get-pricing"),
  updatePricing: (params) => ipcRenderer.invoke("agent:update-pricing", params),
  openExternalUrl: (url) => ipcRenderer.invoke("agent:open-external-url", url),
  onLog: (callback) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on("agent:log", subscription);
    return () => ipcRenderer.removeListener("agent:log", subscription);
  },
  onNewJob: (callback) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on("agent:new-job", subscription);
    return () => ipcRenderer.removeListener("agent:new-job", subscription);
  },
};

contextBridge.exposeInMainWorld("printAgentApi", printAgentApi);
