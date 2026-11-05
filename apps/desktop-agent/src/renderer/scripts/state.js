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
    title: "Overview",
    subtitle: "Station status, pending queue, and printer readiness"
  },
  orders: {
    title: "Print Queue",
    subtitle: "Orders waiting for print or cash collection"
  },
  printers: {
    title: "Printers",
    subtitle: "Installed printers, routing defaults, and spool status"
  },
  pricing: {
    title: "Print Rates",
    subtitle: "Per-page pricing by color mode and paper size"
  },
  payments: {
    title: "Online Payments",
    subtitle: "Razorpay account connection and direct bank payout settings"
  },
  standee: {
    title: "Store QR Standee",
    subtitle: "Countertop standee and customer upload link"
  },
  terminal: {
    title: "Spooler Diagnostics",
    subtitle: "Windows print spooler log and error events"
  },
  history: {
    title: "History",
    subtitle: "Completed jobs, reprint log, and daily summary"
  },
  settings: {
    title: "Settings",
    subtitle: "Station preferences and cloud sync"
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
