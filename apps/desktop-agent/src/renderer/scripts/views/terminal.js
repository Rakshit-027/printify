// ==============================================================
// VIEW: TERMINAL DIAGNOSTICS, STANDEE & AUDIT HISTORY
// ==============================================================

function addTerminalLog(time, level, msg) {
  logCounter++;
  const badge = document.getElementById("badge-sidebar-logs");
  if (badge) badge.innerText = logCounter;
  const body = document.getElementById("term-logs-body");
  if (!body) return;
  const row = document.createElement("div");
  row.className = "log-line";
  let tagClass = "log-tag-info";
  if (level === "warn") tagClass = "log-tag-warn";
  if (level === "error") tagClass = "log-tag-error";
  if (level === "system") tagClass = "log-tag-sys";

  row.innerHTML = `<span class="log-time">[${time}]</span> <span class="${tagClass}">[${(level || "INFO").toUpperCase()}]</span> <span>${msg}</span>`;
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
}

function clearLogs() {
  const body = document.getElementById("term-logs-body");
  if (body) body.innerHTML = "";
  logCounter = 0;
  const badge = document.getElementById("badge-sidebar-logs");
  if (badge) badge.innerText = 0;
}

if (api && api.onLog) {
  api.onLog(log => {
    addTerminalLog(
      log.timestamp || new Date().toLocaleTimeString(),
      log.level || "info",
      log.message || ""
    );
  });
}

function renderHistoryTable() {
  const tbody = document.getElementById("history-table-body");
  if (!tbody) return;
  if (ordersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">No orders recorded in workstation history.</td></tr>`;
    return;
  }
  tbody.innerHTML = "";
  ordersList.forEach(o => {
    const tr = document.createElement("tr");
    const docName = (o.items && o.items[0]?.document?.originalName) || "Document.pdf";
    const pages = (o.items && o.items[0]?.document?.pageCount) || 1;
    const color = o.items && o.items[0]?.colorMode === "COLOR" ? "Color" : "B&W";
    const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recent";
    const amount = "₹" + ((o.totalAmountMinor || 0) / 100).toFixed(2);

    tr.innerHTML = `
      <td style="font-weight:700;">${o.orderNumber || o.id}</td>
      <td>${o.customerName || "Walk-up"}</td>
      <td>${docName} (${pages} pgs, ${color})</td>
      <td><span style="font-weight:700;">${amount}</span> • <span style="font-size:11px;color:var(--text-muted);">${o.paymentStatus}</span></td>
      <td><span class="status-badge badge-neutral">${o.status}</span></td>
      <td style="color:var(--text-muted);font-size:11px;">${timeStr}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', true)">
          Reprint
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openStoreCustomerPage() {
  const slug = appStatus?.config?.vendorSlug || "speedy-express";
  const url = (appStatus?.config?.backendUrl || "https://www.print2me.in") + "/v/" + slug;
  if (api && api.openExternalUrl) {
    api.openExternalUrl(url);
  } else {
    window.open(url, "_blank");
  }
}

async function printStandeeCard() {
  if (!api) return;
  showToast("Sending countertop QR Standee to Default Color Printer...");
  const targetPrinter = appStatus?.config?.defaultColorPrinter || (printersList[0] && printersList[0].systemName) || "Default";
  await api.printOrderDirect({ orderId: "STANDEE-CARD", orderNumber: "STORE-QR-STANDEE", printerName: targetPrinter, copies: 1 });
  showToast("Countertop Standee sent to spooler!");
  logActivity("Standee Print Job", "Store QR Printed", "success");
}
