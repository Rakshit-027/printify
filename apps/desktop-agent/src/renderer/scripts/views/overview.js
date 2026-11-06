// ==============================================================
// VIEW: OVERVIEW DASHBOARD & FAST-TRACK QUEUE
// ==============================================================

function renderOverview() {
  // 1. Pending & Active Count Calculation - exclude cancelled/rejected
  const pendingOrders = ordersList.filter(o => 
    o.status !== "CANCELLED" &&
    o.status !== "REJECTED" &&
    (
      o.status === "AWAITING_VENDOR_APPROVAL" || 
      o.paymentStatus === "CASH_PENDING" || 
      (o.paymentMethod === "CASH_ON_COLLECTION" && o.paymentStatus !== "CASH_COLLECTED" && o.paymentStatus !== "SUCCESS")
    )
  );
  const printingOrders = ordersList.filter(o => 
    o.status !== "CANCELLED" &&
    o.status !== "REJECTED" &&
    (activePrintingOrders.has(o.id) || o.status === "CONFIRMED" || o.status === "PRINTING" || o.status === "PROCESSING" || printErrorOrders.has(o.id))
  );
  const completedOrders = ordersList.filter(o => o.status === "COMPLETED");

  const kpiPending = document.getElementById("kpi-pending-count");
  const kpiPrinting = document.getElementById("kpi-printing-count");
  const kpiCompleted = document.getElementById("kpi-completed-count");
  const kpiRevenue = document.getElementById("kpi-total-revenue");
  const heroPendingPill = document.getElementById("hero-pending-pill");

  if (kpiPending) kpiPending.innerText = pendingOrders.length;
  if (kpiPrinting) kpiPrinting.innerText = printingOrders.length;
  if (kpiCompleted) kpiCompleted.innerText = completedOrders.length;
  if (heroPendingPill) heroPendingPill.innerText = pendingOrders.length;

  const totalRevenueMinor = ordersList
    .filter(o => o.paymentStatus === "SUCCESS" || o.paymentStatus === "CASH_COLLECTED")
    .reduce((sum, o) => sum + (o.totalAmountMinor || 0), 0);
  if (kpiRevenue) kpiRevenue.innerText = "₹" + (totalRevenueMinor / 100).toFixed(2);

  // 2. Render Fast-Track Urgent Orders Strip
  renderOverviewFastTrack(pendingOrders, printingOrders);

  // 3. Render Mini Printers & Activity
  renderOverviewPrinters();
  renderOverviewActivityFeed();
}

// Fast-Track Urgent Orders on Overview Screen
function renderOverviewFastTrack(pendingOrders, printingOrders) {
  const container = document.getElementById("overview-fasttrack-list");
  const countBadge = document.getElementById("overview-fasttrack-count");
  if (!container) return;

  const urgentOrders = [...pendingOrders, ...printingOrders.filter(p => !pendingOrders.some(po => po.id === p.id))];
  if (countBadge) countBadge.innerText = urgentOrders.length + " Urgent";

  if (urgentOrders.length === 0) {
    container.innerHTML = `
      <div class="fasttrack-empty" style="grid-column: 1 / -1;">
        <div style="font-size:13px;font-weight:700;color:var(--brand-navy);">Queue is empty</div>
        <div style="font-size:11px;color:var(--text-muted);">Incoming orders will appear here automatically.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  urgentOrders.slice(0, 3).forEach(o => {
    const isPrinting = activePrintingOrders.has(o.id) || o.status === "PRINTING" || o.status === "PROCESSING";
    const isCashPending = o.status !== "CANCELLED" && o.status !== "REJECTED" && (
      o.paymentStatus === "CASH_PENDING" || 
      (o.paymentMethod === "CASH_ON_COLLECTION" && o.paymentStatus !== "CASH_COLLECTED" && o.paymentStatus !== "SUCCESS")
    );
    const firstItem = (o.items && o.items[0]) || {};
    const docName = (firstItem.document && firstItem.document.originalName) || "Document.pdf";
    const pageCount = (firstItem.document && firstItem.document.pageCount) || firstItem.totalSheets || 1;
    const colorMode = firstItem.colorMode === "COLOR" ? "Color" : "B&W";
    const priceStr = "₹" + ((o.totalAmountMinor || 0) / 100).toFixed(2);

    const item = document.createElement("div");
    item.className = "fasttrack-item";

    let actionBtnHtml = "";
    if (isPrinting) {
      actionBtnHtml = `<span style="font-size:11px;font-weight:700;color:var(--info);">Printing</span>`;
    } else if (isCashPending) {
      actionBtnHtml = `
        <button class="btn btn-warning btn-sm" onclick="handleCollectCash('${o.id}', '${o.orderNumber || o.id}', ${o.totalAmountMinor || 0})">
          Approve cash (${priceStr})
        </button>
      `;
    } else {
      actionBtnHtml = `
        <button class="btn btn-primary btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', false)">
          Print now
        </button>
      `;
    }

    item.innerHTML = `
      <div class="fasttrack-item-info">
        <div class="fasttrack-item-row">
          <span class="fasttrack-order-num">${o.orderNumber || o.id}</span>
          <span class="status-badge ${isCashPending ? 'badge-warning' : 'badge-info'}" style="font-size:9px;">
            ${isCashPending ? 'Cash Due' : 'Ready'}
          </span>
        </div>
        <div class="fasttrack-doc" title="${docName}">
          ${docName} • ${pageCount} pgs (${colorMode})
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:1px;">
          ${o.customerName || "Walk-up Customer"} • <strong style="color:var(--brand-navy);">${priceStr}</strong>
        </div>
      </div>
      <div>
        ${actionBtnHtml}
      </div>
    `;
    container.appendChild(item);
  });
}

function renderOverviewPrinters() {
  const overviewList = document.getElementById("overview-printers-list");
  if (!overviewList) return;
  const savedBw = appStatus?.config?.defaultBwPrinter || "";
  const savedColor = appStatus?.config?.defaultColorPrinter || "";

  if (printersList.length === 0) {
    overviewList.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">No printers detected on this PC.</div>`;
    return;
  }

  overviewList.innerHTML = "";
  printersList.slice(0, 3).forEach(p => {
    const isBw = p.systemName === savedBw || (!savedBw && p.isDefault);
    const isCol = p.systemName === savedColor;
    const connClass = (p.connectionType || "other").toLowerCase();
    const connBadge = `<span class="printer-conn-badge conn-${connClass}" style="font-size:9px;padding:1px 5px;">${p.connectionType || "OTHER"}</span>`;
    const card = document.createElement("div");
    card.className = "mini-printer-card";
    card.innerHTML = `
      <div class="printer-main-info">
        <div class="printer-status-icon">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" /></svg>
        </div>
        <div class="printer-text-group">
          <div class="printer-title-row">
            <span class="printer-name-text">${p.displayName || p.systemName}</span>
            ${connBadge}
            ${p.isDefault ? '<span class="status-badge badge-neutral" style="font-size:9px;">OS DEFAULT</span>' : ''}
            ${isBw ? '<span class="printer-chip chip-cyan">B&W Default</span>' : ''}
            ${isCol ? '<span class="printer-chip chip-purple">Color Default</span>' : ''}
          </div>
          <div class="printer-meta-text">
            ${p.supportsColor ? "Color + Mono" : "Monochrome"} • ${p.supportsDuplex ? "Duplex" : "Single-sided"} • ${p.isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="testPrintPrinter('${p.systemName}')">
        Test Print
      </button>
    `;
    overviewList.appendChild(card);
  });
}

function renderOverviewActivityFeed() {
  const feed = document.getElementById("overview-activity-feed");
  if (!feed) return;
  if (activities.length === 0) {
    feed.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">No activity recorded yet today.</div>`;
    return;
  }
  feed.innerHTML = "";
  activities.slice(0, 5).forEach(act => {
    const item = document.createElement("div");
    item.className = "activity-item";
    let icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd"/></svg>`;
    let iconBg = "var(--success-bg)";
    let iconColor = "var(--success-text)";
    if (act.type === "error") {
      icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>`;
      iconBg = "var(--danger-bg)";
      iconColor = "var(--danger-text)";
    }
    if (act.type === "info") {
      icon = `<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"/></svg>`;
      iconBg = "var(--info-bg)";
      iconColor = "var(--info-text)";
    }

    item.innerHTML = `
      <div class="activity-icon-badge" style="background:${iconBg};color:${iconColor};">${icon}</div>
      <div class="activity-content">
        <div class="activity-text">${act.action}</div>
        <div class="activity-time">${act.details} • ${act.time}</div>
      </div>
    `;
    feed.appendChild(item);
  });
}
