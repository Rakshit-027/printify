import { contextBridge, ipcRenderer } from "electron";

export interface PrintAgentApi {
  getStatus: () => Promise<any>;
  login: (params: { backendUrl?: string; email: string; password: string; deviceName?: string }) => Promise<any>;
  quickDemoMode: () => Promise<any>;
  enrollDevice: (params: { backendUrl?: string; enrollmentCode: string; deviceName?: string }) => Promise<any>;
  logout: () => Promise<any>;
  syncPrinters: () => Promise<any>;
  setPrinterPreference: (params: { defaultBwPrinter?: string; defaultColorPrinter?: string }) => Promise<any>;
  testPrint: (printerName: string) => Promise<any>;
  printOrderDirect: (params: { orderId: string; orderNumber?: string; printerName?: string; copies?: number }) => Promise<any>;
  togglePolling: (active: boolean) => Promise<boolean>;
  getOrders: (status?: string) => Promise<any>;
  updateOrderStatus: (params: { orderId: string; action: string }) => Promise<any>;
  getPricing: () => Promise<any>;
  updatePricing: (params: { pricing: any[]; minimumOrderMinor?: number }) => Promise<any>;
  openPrintsFolder: () => Promise<any>;
  openExternalUrl: (url: string) => Promise<any>;
  onLog: (callback: (log: any) => void) => () => void;
}

const printAgentApi: PrintAgentApi = {
  getStatus: () => ipcRenderer.invoke("agent:get-status"),
  login: (params) => ipcRenderer.invoke("agent:login", params),
  quickDemoMode: () => ipcRenderer.invoke("agent:quick-demo-mode"),
  enrollDevice: (params) => ipcRenderer.invoke("agent:enroll-device", params),
  logout: () => ipcRenderer.invoke("agent:logout"),
  syncPrinters: () => ipcRenderer.invoke("agent:sync-printers"),
  setPrinterPreference: (params) => ipcRenderer.invoke("agent:set-printer-preference", params),
  testPrint: (printerName) => ipcRenderer.invoke("agent:test-print", printerName),
  printOrderDirect: (params) => ipcRenderer.invoke("agent:print-order-direct", params),
  togglePolling: (active) => ipcRenderer.invoke("agent:toggle-polling", active),
  getOrders: (status) => ipcRenderer.invoke("agent:get-orders", status),
  updateOrderStatus: (params) => ipcRenderer.invoke("agent:update-order-status", params),
  getPricing: () => ipcRenderer.invoke("agent:get-pricing"),
  updatePricing: (params) => ipcRenderer.invoke("agent:update-pricing", params),
  openPrintsFolder: () => ipcRenderer.invoke("agent:open-prints-folder"),
  openExternalUrl: (url) => ipcRenderer.invoke("agent:open-external-url", url),
  onLog: (callback) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on("agent:log", subscription);
    return () => ipcRenderer.removeListener("agent:log", subscription);
  },
};

contextBridge.exposeInMainWorld("printAgentApi", printAgentApi);
