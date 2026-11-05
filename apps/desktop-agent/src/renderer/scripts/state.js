// ==============================================================
// GLOBAL STATE & METADATA REGISTRY
// ==============================================================
const api = window.printAgentApi;

let appStatus = null;
let appSubscription = null;
let printersList = [];
let ordersList = [];
let currentFilter = "ALL";
let isPolling = true;
let isSyncing = false;
let logCounter = 0;
let currentPaneId = "overview";
let activities = [];

// Global Tracking Sets for Printing Spooler
const activePrintingOrders = new Set();
const printErrorOrders = new Map();
const autoPrintedOrderIds = new Set();

// Page Metadata Registry for Headers & Breadcrumbs
const pageMeta = {
  overview: {
    title: "Workstation Overview",
    subtitle: "High-level workstation health, pending orders summary, and printer availability"
  },
  orders: {
    title: "Live Print Queue",
    subtitle: "Manage incoming online orders and cash orders requiring approval"
  },
  printers: {
    title: "Printers & Hardware",
    subtitle: "Connected local spoolers, zero-touch page routing, and printer capabilities"
  },
  pricing: {
    title: "Print Rates & Paper Sizes",
    subtitle: "Configure per-page rates for B&W and color across all supported paper sizes"
  },
  standee: {
    title: "QR Kiosk & Store QR",
    subtitle: "Countertop QR standee generation, customer upload links, and kiosk preview"
  },
  terminal: {
    title: "Spooler & Diagnostics",
    subtitle: "Real-time print spooler telemetry stream, driver events, and diagnostic logs"
  },
  history: {
    title: "Activity & History",
    subtitle: "Audit trail of completed print jobs, payment collection, and reprint history"
  },
  settings: {
    title: "Agent Settings",
    subtitle: "Workstation counter preferences, cloud polling, and platform connection"
  }
};

// Toast Notification
let toastTimer = null;
function showToast(msg) {
  const banner = document.getElementById("toast-banner");
  const msgEl = document.getElementById("toast-msg");
  if (!banner || !msgEl) return;
  msgEl.innerText = msg;
  banner.style.display = "flex";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4500);
}

function hideToast() {
  const banner = document.getElementById("toast-banner");
  if (banner) banner.style.display = "none";
}

// Activity Logging Registry
function logActivity(action, details, type = "info") {
  const item = {
    action,
    details,
    type,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: Date.now()
  };
  activities.unshift(item);
  if (activities.length > 30) activities.pop();
  if (typeof renderOverviewActivityFeed === "function") renderOverviewActivityFeed();
  if (typeof renderHistoryTable === "function") renderHistoryTable();
}
