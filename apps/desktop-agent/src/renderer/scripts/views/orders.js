// ==============================================================
// VIEW: LIVE PRINT QUEUE & PRINT DISPATCH
// ==============================================================

async function fetchOrders() {
  if (!api || !appStatus?.isEnrolled) return;
  try {
    const res = await api.getOrders(currentFilter);
    if (res && res.success) {
      const freshOrders = res.orders || [];
      ordersList = freshOrders;
      renderOrders();
      if (typeof renderOverview === "function") renderOverview();

      // Clean up active sets for orders that transitioned to completed
      for (const o of freshOrders) {
        if (o.status === "COMPLETED" || o.status === "READY_FOR_PICKUP") {
          activePrintingOrders.delete(o.id);
        }
      }
    }
  } catch (err) {
    console.error("Order fetch err:", err);
  }
}

function renderOrders() {
  const wrap = document.getElementById("orders-list-wrap");
  const searchVal = document.getElementById("queue-search")?.value.toLowerCase().trim() || "";
  if (!wrap) return;

  let filtered = ordersList;
  if (currentFilter !== "ALL") {
    if (currentFilter === "PENDING") {
      filtered = filtered.filter(o => 
        o.status !== "CANCELLED" && 
        o.status !== "REJECTED" &&
        (
          o.status === "AWAITING_VENDOR_APPROVAL" || 
          o.paymentStatus === "CASH_PENDING" || 
          (o.paymentMethod === "CASH_ON_COLLECTION" && o.paymentStatus !== "CASH_COLLECTED" && o.paymentStatus !== "SUCCESS")
        )
      );
    } else if (currentFilter === "CONFIRMED" || currentFilter === "PRINTING") {
      filtered = filtered.filter(o => 
        o.status !== "CANCELLED" &&
        o.status !== "REJECTED" &&
        (
          activePrintingOrders.has(o.id) || 
          o.status === "CONFIRMED" || 
          o.status === "PRINTING" || 
          o.status === "PROCESSING" ||
          printErrorOrders.has(o.id)
        )
      );
    } else if (currentFilter === "READY") {
      filtered = filtered.filter(o => o.status === "READY_FOR_PICKUP");
    } else if (currentFilter === "COMPLETED") {
      filtered = filtered.filter(o => o.status === "COMPLETED");
    }
  }

  if (searchVal) {
    filtered = filtered.filter(o => 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchVal)) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchVal)) ||
      (o.items && o.items.some(i => i.document && i.document.originalName && i.document.originalName.toLowerCase().includes(searchVal)))
    );
  }

  // Calculate Counters - exclude CANCELLED and REJECTED orders from active pending
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
  const readyOrders = ordersList.filter(o => o.status === "READY_FOR_PICKUP");
  const completedOrders = ordersList.filter(o => o.status === "COMPLETED");

  const badgeOrders = document.getElementById("badge-sidebar-orders");
  if (badgeOrders) badgeOrders.innerText = pendingOrders.length;

  // Filter Pill Counters
  const pAll = document.getElementById("pill-count-all");
  const pPending = document.getElementById("pill-count-pending");
  const pPrinting = document.getElementById("pill-count-printing");
  const pReady = document.getElementById("pill-count-ready");
  const pCompleted = document.getElementById("pill-count-completed");
  if (pAll) pAll.innerText = ordersList.length;
  if (pPending) pPending.innerText = pendingOrders.length;
  if (pPrinting) pPrinting.innerText = printingOrders.length;
  if (pReady) pReady.innerText = readyOrders.length;
  if (pCompleted) pCompleted.innerText = completedOrders.length;

  if (filtered.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-title">No orders in this queue</div>
        <div class="empty-state-desc">Incoming walk-up and online orders appear here automatically.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = "";
  filtered.forEach(o => {
    const card = document.createElement("div");
    const isPrinting = activePrintingOrders.has(o.id) || o.status === "PRINTING" || o.status === "PROCESSING";
    const hasError = printErrorOrders.has(o.id);
    const errInfo = printErrorOrders.get(o.id);
    const isCompleted = o.status === "COMPLETED";
    const isCancelled = o.status === "CANCELLED" || o.status === "REJECTED";
    const isOnlineAwaiting = !isCancelled && (o.paymentMethod === "RAZORPAY" || o.paymentMethod === "ONLINE") && 
                             (o.status === "AWAITING_PAYMENT" || o.paymentStatus === "PENDING");

    card.className = "order-card" + 
      (isPrinting ? " printing-active" : "") + 
      (hasError ? " error-active" : "") +
      (isCancelled ? " cancelled-card" : "");

    const isCashPending = !isCancelled && (
      o.paymentStatus === "CASH_PENDING" || 
      (o.paymentMethod === "CASH_ON_COLLECTION" && o.paymentStatus !== "CASH_COLLECTED" && o.paymentStatus !== "SUCCESS")
    );
    const isPaid = o.paymentStatus === "SUCCESS" || o.paymentStatus === "CASH_COLLECTED";

    let badgeHtml = "";
    if (o.status === "CANCELLED") {
      badgeHtml = `<span class="status-badge badge-danger">Cancelled</span>`;
    } else if (o.status === "REJECTED") {
      badgeHtml = `<span class="status-badge badge-danger">Rejected</span>`;
    } else if (isPrinting) {
      badgeHtml = `<span class="status-badge badge-printing">Printing</span>`;
    } else if (hasError) {
      badgeHtml = `<span class="status-badge badge-danger">Spooler error / Out of paper</span>`;
    } else if (isCompleted) {
      badgeHtml = `<span class="status-badge badge-completed">Completed</span>`;
    } else if (o.status === "AWAITING_VENDOR_APPROVAL") {
      badgeHtml = `<span class="status-badge badge-amber">Awaiting approval</span>`;
    } else if (o.status === "AWAITING_PAYMENT") {
      badgeHtml = `<span class="status-badge badge-amber">Online checkout</span>`;
    } else if (o.status === "CONFIRMED") {
      badgeHtml = `<span class="status-badge badge-printing">Queued</span>`;
    } else if (o.status === "READY_FOR_PICKUP") {
      badgeHtml = `<span class="status-badge badge-completed">Ready for pickup</span>`;
    } else {
      badgeHtml = `<span class="status-badge badge-neutral">${o.status}</span>`;
    }

    if (isCashPending) {
      badgeHtml += ` <span class="status-badge badge-amber">Cash due</span>`;
    } else if (o.paymentStatus === "CASH_COLLECTED") {
      badgeHtml += ` <span class="status-badge badge-completed">Cash collected</span>`;
    }

    const firstItem = (o.items && o.items[0]) || {};
    const docName = (firstItem.document && firstItem.document.originalName) || "Document.pdf";
    const pageCount = (firstItem.document && firstItem.document.pageCount) || firstItem.totalSheets || 1;
    const colorMode = firstItem.colorMode === "COLOR" ? "Color" : "B&W";
    const duplex = (firstItem.duplexMode && firstItem.duplexMode.includes("DOUBLE")) ? "Double-Sided" : "Single-Sided";
    const copies = firstItem.copies || 1;
    const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now";
    const priceStr = "₹" + ((o.totalAmountMinor || 0) / 100).toFixed(2);

    let actionsHtml = "";

    if (isCancelled) {
      actionsHtml = `
        <span style="font-size:11px;font-weight:600;color:var(--text-muted);">
          Order was cancelled by ${o.status === "REJECTED" ? "vendor" : "customer"}
        </span>
      `;
    } else if (isPrinting) {
      actionsHtml = `
        <div class="printing-live-indicator">
          <div class="pulsing-dots"><span></span><span></span><span></span></div>
          <div style="font-size:11px;font-weight:700;color:var(--info);">SPOOLING TO PRINTER</div>
        </div>
      `;
    } else if (hasError) {
      actionsHtml = `
        <button class="btn btn-warning btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', true)">
          Print manually
        </button>
        <button class="btn btn-secondary btn-sm" onclick="handleStatusAction('${o.id}', 'MARK_READY')">
          Mark ready
        </button>
      `;
    } else if (isCompleted) {
      actionsHtml = `
        <button class="btn btn-outline btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', true)">
          Reprint
        </button>
      `;
    } else if (isOnlineAwaiting) {
      actionsHtml = `
        <button class="btn btn-warning btn-sm" onclick="handleConvertToCash('${o.id}', '${o.orderNumber || o.id}', ${o.totalAmountMinor || 0})">
          Collect cash (${priceStr})
        </button>
        <button class="btn btn-outline btn-sm" onclick="handleStatusAction('${o.id}', 'CANCEL')">
          Cancel order
        </button>
      `;
    } else {
      if (isCashPending) {
        actionsHtml += `
          <button class="btn btn-warning btn-sm" onclick="handleCollectCash('${o.id}', '${o.orderNumber || o.id}', ${o.totalAmountMinor || 0})">
            Approve cash (${priceStr})
          </button>
        `;
      }

      if (o.status === "AWAITING_VENDOR_APPROVAL") {
        actionsHtml += `
          <button class="btn btn-primary btn-sm" onclick="handleStatusAction('${o.id}', 'APPROVE')">
            Approve order
          </button>
          <button class="btn btn-outline btn-sm" onclick="handleStatusAction('${o.id}', 'REJECT')">
            Reject
          </button>
        `;
      } else if (o.status === "CONFIRMED") {
        actionsHtml += `
          <button class="btn btn-primary btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', false)">
            Print now
          </button>
          <button class="btn btn-secondary btn-sm" onclick="handleStatusAction('${o.id}', 'MARK_READY')">
            Mark ready
          </button>
        `;
      } else if (o.status === "READY_FOR_PICKUP") {
        actionsHtml += `
          <button class="btn btn-primary btn-sm" onclick="handleStatusAction('${o.id}', 'MARK_COMPLETED')">
            Completed
          </button>
          <button class="btn btn-outline btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', true)">
            Print manually
          </button>
        `;
      }
    }

    let errorBannerHtml = "";
    if (hasError) {
      errorBannerHtml = `
        <div class="error-alert-banner">
          <div>
            <strong>Out of paper or spooler halted:</strong> ${errInfo?.message || "Check printer tray and click Print manually."}
          </div>
          <button class="btn btn-warning btn-sm" onclick="executeOrderPrint('${o.id}', '${o.orderNumber || o.id}', true)">
            Print manually
          </button>
        </div>
      `;
    }

    let paymentLabel = "";
    let paymentClass = "pending";

    if (isCancelled) {
      paymentLabel = "● Order Cancelled";
      paymentClass = "cancelled";
    } else if (o.paymentStatus === "SUCCESS") {
      paymentLabel = "● Online Paid (Razorpay)";
      paymentClass = "paid";
    } else if (o.paymentStatus === "CASH_COLLECTED") {
      paymentLabel = "● Cash Collected (Paid)";
      paymentClass = "paid";
    } else if (o.paymentStatus === "FAILED") {
      paymentLabel = "● Online Payment Failed";
      paymentClass = "danger";
    } else if (o.paymentMethod === "RAZORPAY" || o.paymentMethod === "ONLINE") {
      paymentLabel = "● Online Checkout Pending";
      paymentClass = "pending";
    } else if (o.paymentMethod === "CASH_ON_COLLECTION" || o.paymentMethod === "CASH") {
      paymentLabel = "● Cash Due at Desk";
      paymentClass = "pending";
    } else {
      paymentLabel = `● ${o.paymentStatus || "Unpaid"}`;
      paymentClass = isPaid ? "paid" : "pending";
    }

    card.innerHTML = `
      <div class="order-top-bar">
        <div class="order-id-group">
          <span class="order-id-text">${o.orderNumber || o.id}</span>
          ${badgeHtml}
        </div>
        <div class="order-time-text">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" style="width:13px;height:13px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>${timeStr}</span>
        </div>
      </div>

      ${errorBannerHtml}

      <div class="order-body-grid">
        <div class="doc-preview-cell">
          <div class="doc-icon-box">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
          </div>
          <div class="doc-meta-wrap">
            <div class="doc-name-text" title="${docName}">${docName}</div>
            <div class="doc-spec-chips">
              <span class="spec-pill">${pageCount} pgs</span>
              <span class="spec-pill">${copies} cop${copies > 1 ? "ies" : "y"}</span>
              <span class="spec-pill">${colorMode}</span>
              <span class="spec-pill">${duplex}</span>
            </div>
          </div>
        </div>

        <div class="customer-cell">
          <div class="customer-name-text">${o.customerName || "Walk-up Customer"}</div>
          <div class="customer-phone-text">${o.customerPhone || "Mobile Upload"}</div>
        </div>

        <div class="payment-cell">
          <div class="price-amount-text">${priceStr}</div>
          <div class="payment-status-tag ${paymentClass}">${paymentLabel}</div>
        </div>

        <div class="actions-cell">
          ${actionsHtml}
        </div>
      </div>
    `;

    wrap.appendChild(card);
  });
}

// Print Dispatch Execution with Double-Click Guard
async function executeOrderPrint(orderId, orderNum, isRetry = false) {
  if (!api) return;

  // Prevent double-clicking from submitting duplicate jobs
  if (activePrintingOrders.has(orderId)) {
    console.warn("Print already in progress for order:", orderNum);
    return;
  }

  const ord = ordersList.find(o => o.id === orderId);
  const copies = (ord?.items && ord.items[0]?.copies) || 1;

  printErrorOrders.delete(orderId);
  activePrintingOrders.add(orderId);
  renderOrders();
  if (typeof renderOverview === "function") renderOverview();

  showToast(`${isRetry ? "Retrying print" : "Printing"} order ${orderNum}...`);
  logActivity(isRetry ? "Manual Print Started" : "Print Dispatched", orderNum, "info");

  try {
    api.updateOrderStatus({ orderId, action: "START_PRINTING" }).catch(() => {});

    const res = await api.printOrderDirect({
      orderId,
      orderNumber: orderNum,
      copies,
      forceRetry: isRetry,
    });

    if (res && res.success) {
      activePrintingOrders.delete(orderId);
      autoPrintedOrderIds.add(orderId);

      if (ord) ord.status = "READY_FOR_PICKUP";
      renderOrders();
      if (typeof renderOverview === "function") renderOverview();

      showToast(`Submitted to Windows spooler: order ${orderNum} (${res.windowsJobId ? 'Job #' + res.windowsJobId : 'Active'})`);
      logActivity("Order Spooled to Windows", orderNum, "success");

      // Mark order as ready for pickup so vendor knows it's printed and waiting for customer handover
      await api.updateOrderStatus({ orderId, action: "MARK_READY" });
      await fetchOrders();
    } else {
      activePrintingOrders.delete(orderId);
      const errMsg = res?.message || "Spooler rejected document";
      
      printErrorOrders.set(orderId, { message: errMsg, timestamp: Date.now() });
      renderOrders();
      if (typeof renderOverview === "function") renderOverview();

      showToast(`Print error on ${orderNum}: ${errMsg}`);
      logActivity("Spooler Rejection", orderNum, "error");
      api.updateOrderStatus({ orderId, action: "REPORT_ERROR", message: errMsg }).catch(() => {});
    }
  } catch (err) {
    console.error("executeOrderPrint error:", err);
    activePrintingOrders.delete(orderId);
    printErrorOrders.set(orderId, {
      message: err.message || "Hardware connection issue. Check printer and click Print manually.",
      timestamp: Date.now(),
    });
    renderOrders();
    if (typeof renderOverview === "function") renderOverview();
    showToast(`Print error. Check printer and click Print manually.`);
    logActivity("Print Dispatch Failed", orderNum, "error");
  }
}

// Cash Collection Handling
async function handleCollectCash(orderId, orderNum, amountMinor) {
  if (!api) return;
  const priceDisplay = amountMinor ? "₹" + (amountMinor / 100).toFixed(2) : "";
  showToast("Approving cash payment " + priceDisplay + " for order " + orderNum + "...");

  const ord = ordersList.find(o => o.id === orderId);
  if (ord) {
    ord.paymentStatus = "CASH_COLLECTED";
    if (ord.status === "AWAITING_VENDOR_APPROVAL") ord.status = "CONFIRMED";
    renderOrders();
    if (typeof renderOverview === "function") renderOverview();
  }

  logActivity("Cash Payment Approved", `${orderNum} (${priceDisplay})`, "success");

  try {
    await api.updateOrderStatus({ orderId, action: "MARK_CASH_COLLECTED" });
  } catch (err) {
    console.error("handleCollectCash API error:", err);
  }

  await executeOrderPrint(orderId, orderNum, false);
}

// Convert Abandoned/Unpaid Online Order to Desk Cash & Print
async function handleConvertToCash(orderId, orderNum, amountMinor) {
  if (!api) return;
  const priceDisplay = amountMinor ? "₹" + (amountMinor / 100).toFixed(2) : "";
  showToast("Converting to desk cash " + priceDisplay + " for order " + orderNum + "...");

  const ord = ordersList.find(o => o.id === orderId);
  if (ord) {
    ord.paymentMethod = "CASH_ON_COLLECTION";
    ord.paymentStatus = "CASH_COLLECTED";
    ord.status = "CONFIRMED";
    renderOrders();
    if (typeof renderOverview === "function") renderOverview();
  }

  logActivity("Online Converted to Desk Cash", `${orderNum} (${priceDisplay})`, "success");

  try {
    await api.updateOrderStatus({ orderId, action: "CONVERT_TO_CASH" });
  } catch (err) {
    console.error("handleConvertToCash API error:", err);
  }

  await executeOrderPrint(orderId, orderNum, false);
}

async function handleStatusAction(orderId, action) {
  if (!api) return;
  const ord = ordersList.find(o => o.id === orderId);
  if (ord) {
    if (action === "APPROVE") ord.status = "CONFIRMED";
    else if (action === "REJECT") ord.status = "REJECTED";
    else if (action === "CANCEL" || action === "CANCEL_ORDER") ord.status = "CANCELLED";
    else if (action === "MARK_READY") ord.status = "READY_FOR_PICKUP";
    else if (action === "MARK_COMPLETED") ord.status = "COMPLETED";
    else if (action === "MARK_CASH_COLLECTED") ord.paymentStatus = "CASH_COLLECTED";
    renderOrders();
    if (typeof renderOverview === "function") renderOverview();
  }
  showToast("Updating order status...");
  logActivity("Status Updated: " + action, ord?.orderNumber || orderId, "info");

  const res = await api.updateOrderStatus({ orderId, action });
  if (res && res.success !== false) {
    showToast("Order status updated.");
    fetchOrders();
  } else {
    showToast("Status recorded.");
    fetchOrders();
  }
}
