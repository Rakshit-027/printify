// ==============================================================
// NAVIGATION, SIDEBAR TOGGLE & SHORTCUTS
// ==============================================================

// Sidebar Collapse / Expand Toggle
function toggleSidebarCollapse() {
  const app = document.getElementById("app-container");
  if (!app) return;
  const isCollapsed = app.classList.toggle("sidebar-collapsed");
  const tip = isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)";

  const sbBtn = document.getElementById("sidebar-toggle");
  if (sbBtn) sbBtn.setAttribute("title", tip);

  const hdrBtn = document.getElementById("header-sidebar-toggle");
  if (hdrBtn) hdrBtn.setAttribute("title", tip);

  try {
    localStorage.setItem("print2me_sidebar_collapsed", isCollapsed ? "1" : "0");
  } catch (e) {}
}

// Restore user's sidebar preference on boot
try {
  if (localStorage.getItem("print2me_sidebar_collapsed") === "1") {
    document.getElementById("app-container")?.classList.add("sidebar-collapsed");
  }
} catch (e) {}

// Universal Keyboard Shortcut: Ctrl+B or Cmd+B to toggle sidebar
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    toggleSidebarCollapse();
  }
});

// Switch Navigation Panes
function switchNavPane(paneName) {
  currentPaneId = paneName;

  // Update sidebar nav items
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const navBtn = document.getElementById("tab-" + paneName);
  if (navBtn) navBtn.classList.add("active");

  // Update view panes
  document.querySelectorAll(".view-pane").forEach(pane => pane.classList.remove("active"));
  const targetPane = document.getElementById("pane-" + paneName);
  if (targetPane) targetPane.classList.add("active");

  // Update Top Header Page Title & Subtitle
  const meta = pageMeta[paneName] || { title: "Workstation", subtitle: "" };
  const titleEl = document.getElementById("page-title");
  const subEl = document.getElementById("page-subtitle");
  if (titleEl) titleEl.innerHTML = `<span>${meta.title}</span>`;
  if (subEl) subEl.innerText = meta.subtitle;

  // Specific view triggers
  if (paneName === "pricing" && typeof loadPricingData === "function") {
    loadPricingData();
  } else if (paneName === "history" && typeof renderHistoryTable === "function") {
    renderHistoryTable();
  } else if (paneName === "overview" && typeof renderOverview === "function") {
    renderOverview();
  }
}

function setQueueFilterAndNavigate(filter) {
  currentFilter = filter;
  switchNavPane("orders");
  updateQueueFilterPills();
  if (typeof renderOrders === "function") renderOrders();
}

function setQueueFilter(filter) {
  currentFilter = filter;
  updateQueueFilterPills();
  if (typeof renderOrders === "function") renderOrders();
}

function updateQueueFilterPills() {
  document.querySelectorAll(".queue-pill").forEach(p => {
    const text = p.innerText.trim();
    const isActive = 
      text.startsWith(currentFilter) ||
      (currentFilter === "ALL" && text.startsWith("ALL")) ||
      (currentFilter === "PENDING" && text.includes("PENDING")) ||
      (currentFilter === "CONFIRMED" && text.includes("PRINTING")) ||
      (currentFilter === "READY" && text.includes("READY")) ||
      (currentFilter === "COMPLETED" && text.includes("COMPLETED"));
    p.classList.toggle("active", isActive);
  });
}

function filterOrders() {
  if (typeof renderOrders === "function") renderOrders();
}

// Inline Auth View Handlers
function setAuthTab(tab) {
  const btnLogin = document.getElementById("btn-tab-login");
  const btnCode = document.getElementById("btn-tab-code");
  const formLogin = document.getElementById("auth-form-login");
  const formCode = document.getElementById("auth-form-code");
  const errBox = document.getElementById("auth-error-box");

  if (btnLogin) btnLogin.classList.toggle("active", tab === "login");
  if (btnCode) btnCode.classList.toggle("active", tab === "code");
  if (formLogin) formLogin.style.display = tab === "login" ? "block" : "none";
  if (formCode) formCode.style.display = tab === "code" ? "block" : "none";
  if (errBox) errBox.style.display = "none";
}

function showAuthView() {
  const v = document.getElementById("auth-view");
  if (v) v.style.display = "flex";
}

function hideAuthView() {
  const v = document.getElementById("auth-view");
  if (v) v.style.display = "none";
}

function showAuthError(msg) {
  const box = document.getElementById("auth-error-box");
  if (!box) return;
  box.innerText = msg;
  box.style.display = "block";
}
