// ==============================================================
// APPLICATION BOOTSTRAP, POLLING & AUTHENTICATION
// ==============================================================

async function refreshAll() {
  if (!api) return;
  try {
    appStatus = await api.getStatus();
    printersList = appStatus.printers || [];

    if (!appStatus.isEnrolled) {
      if (typeof showAuthView === "function") showAuthView();
      const dot = document.getElementById("sidebar-status-dot");
      const storeName = document.getElementById("sidebar-store-name");
      const stationName = document.getElementById("sidebar-station-name");
      const pillCloud = document.getElementById("pill-cloud-status");
      const pillCloudText = document.getElementById("pill-cloud-text");

      if (dot) dot.className = "station-status-dot";
      if (storeName) storeName.innerText = "Not Connected";
      if (stationName) stationName.innerText = "Unregistered Workstation";
      if (pillCloud) pillCloud.className = "status-pill offline";
      if (pillCloudText) pillCloudText.innerText = "Cloud: Offline";
      return;
    }

    if (typeof hideAuthView === "function") hideAuthView();
    const dot = document.getElementById("sidebar-status-dot");
    const pillCloud = document.getElementById("pill-cloud-status");
    const pillCloudText = document.getElementById("pill-cloud-text");

    if (dot) dot.className = "station-status-dot online";
    if (pillCloud) pillCloud.className = "status-pill online";
    if (pillCloudText) pillCloudText.innerText = "Cloud: Online";

    const vName = appStatus.config?.vendorName || "Active Store";
    const stationName = appStatus.config?.deviceName || "Counter Workstation 01";
    const backendUrl = appStatus.config?.backendUrl || "https://www.print2me.in";

    const sbStore = document.getElementById("sidebar-store-name");
    const sbStation = document.getElementById("sidebar-station-name");
    const stStore = document.getElementById("standee-store-name");
    const setStore = document.getElementById("settings-store-name");
    const setStation = document.getElementById("settings-station-name");
    const setUrl = document.getElementById("settings-backend-url");
    const heroStation = document.getElementById("hero-station-id");

    if (sbStore) sbStore.innerText = vName;
    if (sbStation) sbStation.innerText = stationName;
    if (stStore) stStore.innerText = vName;
    if (setStore) setStore.innerText = vName;
    if (setStation) setStation.innerText = stationName;
    if (setUrl) setUrl.innerText = backendUrl;
    if (heroStation) heroStation.innerText = stationName;

    // Dynamic QR code generation for kiosk standee
    if (appStatus.config && appStatus.config.backendUrl && appStatus.config.vendorSlug) {
      const storeUrl = appStatus.config.backendUrl + "/v/" + appStatus.config.vendorSlug;
      const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(storeUrl);
      const img = document.getElementById("qr-image");
      const loading = document.getElementById("qr-loading");
      if (img) {
        img.onload = () => {
          img.style.display = "block";
          if (loading) loading.style.display = "none";
        };
        img.src = qrUrl;
      }
    }

    isPolling = Boolean(appStatus.config?.isPollingActive);
    updatePollingButton();

    if (typeof renderPrinters === "function") renderPrinters();
    if (typeof fetchOrders === "function") await fetchOrders();
    if (typeof loadPricingData === "function") await loadPricingData();
    await fetchSubscription();
  } catch (err) {
    console.error("Refresh error:", err);
  }
}

async function fetchSubscription() {
  if (!appStatus?.config?.backendUrl) return;
  try {
    const res = await fetch(`${appStatus.config.backendUrl}/api/vendor/subscription`, {
      headers: {
        'x-device-id': appStatus.config.deviceId || '',
        'x-device-token': appStatus.config.deviceToken || '',
        ...(appStatus.config.sessionToken ? { Authorization: `Bearer ${appStatus.config.sessionToken}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.subscription) {
        appSubscription = data.subscription;
        updateSubscriptionUI();
      }
    }
  } catch (e) {
    console.warn("Failed to fetch subscription:", e);
  }
}

function updateSubscriptionUI() {
  if (!appSubscription) return;
  const btn = document.getElementById("btn-subscription-status");
  const txt = document.getElementById("txt-subscription-status");
  const badge = document.getElementById("badge-sidebar-plan");
  const alertBanner = document.getElementById("subscription-alert-banner");
  const alertText = document.getElementById("subscription-alert-text");

  if (badge) {
    badge.innerText = appSubscription.plan?.name || appSubscription.planCode || "PLAN";
    badge.style.display = "inline-block";
  }

  if (btn) {
    btn.style.display = "flex";
  }

  if (appSubscription.isExpired) {
    if (btn) {
      btn.style.background = "rgba(239, 68, 68, 0.12)";
      btn.style.color = "#dc2626";
      btn.style.borderColor = "rgba(239, 68, 68, 0.4)";
    }
    if (txt) txt.innerText = "Plan: Expired";
    if (alertBanner) alertBanner.style.display = "flex";
    if (alertText && appSubscription.expiresAt) {
      alertText.innerText = `Your subscription ended on ${new Date(appSubscription.expiresAt).toLocaleDateString()}. Customer orders are paused by the server until renewal.`;
    }
  } else {
    if (btn) {
      btn.style.background = "rgba(99, 102, 241, 0.12)";
      btn.style.color = "#4338ca";
      btn.style.borderColor = "rgba(99, 102, 241, 0.3)";
    }
    if (txt) {
      const days = appSubscription.daysRemaining;
      txt.innerText = `${appSubscription.plan?.name || appSubscription.planCode} • ${days}d left`;
    }
    if (alertBanner) alertBanner.style.display = "none";
  }
}

let modalSelectedPlan = 'PRO';
let modalBillingCycle = 'MONTHLY';
let modalAppliedCoupon = null;
let modalPlansList = [];

function openSubscriptionPortal() {
  const modal = document.getElementById("subscription-modal");
  if (modal) {
    modal.classList.add("active");
    renderModalSubscriptionUI();
  }
}

function closeSubscriptionModal() {
  const modal = document.getElementById("subscription-modal");
  if (modal) modal.classList.remove("active");
}

function setSubCycle(cycle) {
  modalBillingCycle = cycle;
  modalAppliedCoupon = null;
  const btnM = document.getElementById("btn-cycle-monthly");
  const btnY = document.getElementById("btn-cycle-yearly");
  if (cycle === 'MONTHLY') {
    btnM.style.background = "#FFFFFF";
    btnM.style.color = "var(--brand-navy)";
    btnM.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
    btnY.style.background = "transparent";
    btnY.style.color = "var(--text-muted)";
    btnY.style.boxShadow = "none";
  } else {
    btnY.style.background = "#FFFFFF";
    btnY.style.color = "var(--brand-navy)";
    btnY.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
    btnM.style.background = "transparent";
    btnM.style.color = "var(--text-muted)";
    btnM.style.boxShadow = "none";
  }
  renderModalPlans();
  updateModalSummary();
}

function selectModalPlan(code) {
  modalSelectedPlan = code;
  modalAppliedCoupon = null;
  renderModalPlans();
  updateModalSummary();
}

function renderModalSubscriptionUI() {
  const title = document.getElementById("modal-sub-status-title");
  const desc = document.getElementById("modal-sub-status-desc");
  const badge = document.getElementById("modal-sub-status-badge");
  const box = document.getElementById("modal-sub-status");

  if (appSubscription) {
    if (badge) badge.innerText = appSubscription.plan?.name || appSubscription.planCode || "STARTER";
    if (appSubscription.isExpired) {
      if (box) {
        box.style.background = "#FEF2F2";
        box.style.borderColor = "#FCA5A5";
      }
      if (title) {
        title.innerText = "Status: EXPIRED";
        title.style.color = "#991B1B";
      }
      if (desc) {
        desc.innerText = "Customer orders paused. Select a plan below or apply a VIP pass to resume.";
        desc.style.color = "#B91C1C";
      }
      if (badge) {
        badge.style.background = "#FEE2E2";
        badge.style.color = "#DC2626";
      }
    } else {
      if (box) {
        box.style.background = "#F0FDF4";
        box.style.borderColor = "#BBF7D0";
      }
      if (title) {
        title.innerText = "Status: ACTIVE";
        title.style.color = "#166534";
      }
      if (desc) {
        desc.innerText = `${appSubscription.daysRemaining} days remaining (Expires: ${appSubscription.expiresAt ? new Date(appSubscription.expiresAt).toLocaleDateString() : 'Active'})`;
        desc.style.color = "#15803D";
      }
      if (badge) {
        badge.style.background = "#DCFCE7";
        badge.style.color = "#15803D";
      }
    }
  }

  renderModalPlans();
  updateModalSummary();
}

function renderModalPlans() {
  const container = document.getElementById("modal-plans-list");
  if (!container) return;

  const defaultPlans = [
    { code: 'STARTER', name: 'Starter Plan', description: 'Zero-touch Auto-Printing for single counter stall & walk-up queue', priceMonthlyMinor: 49900, priceYearlyMinor: 499900 },
    { code: 'PRO', name: 'Professional Plan', description: 'Zero-touch Auto-Printing with multi-printer split routing & priority spooler', priceMonthlyMinor: 99900, priceYearlyMinor: 999900 },
    { code: 'ENTERPRISE', name: 'Campus Enterprise', description: 'Zero-touch Auto-Printing across unlimited workstation fleet with custom SLA', priceMonthlyMinor: 199900, priceYearlyMinor: 1999900 }
  ];

  const plans = (modalPlansList && modalPlansList.length > 0) ? modalPlansList : defaultPlans;

  container.innerHTML = plans.map(p => {
    const isSelected = p.code === modalSelectedPlan;
    const price = modalBillingCycle === 'YEARLY' ? p.priceYearlyMinor / 100 : p.priceMonthlyMinor / 100;
    return `
      <div onclick="selectModalPlan('${p.code}')" style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;border:1.5px solid ${isSelected ? '#4F46E5' : 'var(--border-color)'};background:${isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-paper)'};cursor:pointer;transition:all 0.15s;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:6px;">
            <strong style="font-size:13px;color:${isSelected ? '#4F46E5' : 'var(--brand-navy)'};">${p.name}</strong>
            ${p.code === 'PRO' ? '<span style="font-size:9px;font-weight:800;background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;padding:2px 6px;border-radius:6px;">POPULAR</span>' : ''}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${p.description || ''}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;background:#F0FDF4;color:#15803D;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;border:1px solid #BBF7D0;margin-top:5px;">
            <span>⚡ Zero-Touch Auto-Printing Included</span>
          </div>
        </div>
        <div style="text-align:right;margin-left:10px;">
          <div style="font-size:16px;font-weight:900;color:${isSelected ? '#4F46E5' : 'var(--brand-navy)'};">₹${price}</div>
          <div style="font-size:10px;color:var(--text-muted);">${modalBillingCycle === 'YEARLY' ? '/yr' : '/mo'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function updateModalSummary() {
  const defaultPlans = [
    { code: 'STARTER', priceMonthlyMinor: 49900, priceYearlyMinor: 499900 },
    { code: 'PRO', priceMonthlyMinor: 99900, priceYearlyMinor: 999900 },
    { code: 'ENTERPRISE', priceMonthlyMinor: 199900, priceYearlyMinor: 1999900 }
  ];
  const plans = (modalPlansList && modalPlansList.length > 0) ? modalPlansList : defaultPlans;
  const plan = plans.find(p => p.code === modalSelectedPlan) || plans[0];

  const orig = modalBillingCycle === 'YEARLY' ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
  let finalAmt = orig;
  let disc = 0;

  if (modalAppliedCoupon && modalAppliedCoupon.valid) {
    disc = modalAppliedCoupon.discountMinor || 0;
    finalAmt = modalAppliedCoupon.finalAmountMinor ?? 0;
  }

  const isZero = finalAmt === 0;

  const txtBase = document.getElementById("txt-modal-base-price");
  const rowDisc = document.getElementById("row-modal-discount");
  const txtDisc = document.getElementById("txt-modal-discount");
  const txtTotal = document.getElementById("txt-modal-total-price");
  const btnPay = document.getElementById("btn-modal-checkout");

  if (txtBase) txtBase.innerText = `₹${(orig / 100).toFixed(0)}`;
  if (rowDisc) {
    if (disc > 0) {
      rowDisc.style.display = "flex";
      if (txtDisc) txtDisc.innerText = `-₹${(disc / 100).toFixed(0)}`;
    } else {
      rowDisc.style.display = "none";
    }
  }
  if (txtTotal) {
    txtTotal.innerText = isZero ? "FREE" : `₹${(finalAmt / 100).toFixed(0)}`;
    txtTotal.style.color = isZero ? "#16A34A" : "#4F46E5";
  }

  if (btnPay) {
    if (isZero) {
      btnPay.innerText = "⚡ Activate 30 Free Days Pass";
      btnPay.style.background = "#16A34A";
    } else {
      btnPay.innerText = `Proceed to Pay ₹${(finalAmt / 100).toFixed(0)}`;
      btnPay.style.background = "var(--brand-orange)";
    }
  }
}

async function applyModalCoupon() {
  const inp = document.getElementById("inp-modal-coupon");
  const msg = document.getElementById("modal-coupon-msg");
  if (!inp || !inp.value.trim() || !appStatus?.config?.backendUrl) return;

  const code = inp.value.trim().toUpperCase();
  msg.style.display = "block";
  msg.style.color = "var(--text-muted)";
  msg.innerText = "Validating coupon...";

  try {
    const res = await fetch(`${appStatus.config.backendUrl}/api/vendor/subscription/validate-coupon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": appStatus.config.deviceId || "",
        "x-device-token": appStatus.config.deviceToken || "",
        ...(appStatus.config.sessionToken ? { Authorization: `Bearer ${appStatus.config.sessionToken}` } : {}),
      },
      body: JSON.stringify({
        couponCode: code,
        planCode: modalSelectedPlan,
        billingCycle: modalBillingCycle,
      }),
    });

    const data = await res.json();
    if (data && data.valid) {
      modalAppliedCoupon = data;
      msg.style.color = "#15803D";
      msg.innerText = `✓ ${data.coupon?.code} applied: ${data.isFreePass ? '100% Free VIP Pass!' : `₹${(data.discountMinor/100).toFixed(0)} discount!`}`;
      updateModalSummary();
    } else {
      modalAppliedCoupon = null;
      msg.style.color = "#DC2626";
      msg.innerText = data?.error || "Invalid or expired promo code";
      updateModalSummary();
    }
  } catch (err) {
    modalAppliedCoupon = null;
    msg.style.color = "#DC2626";
    msg.innerText = "Error validating coupon: " + err.message;
  }
}

async function confirmModalSubscription() {
  if (!appStatus?.config?.backendUrl) return;
  const btn = document.getElementById("btn-modal-checkout");
  const inp = document.getElementById("inp-modal-coupon");
  if (btn) btn.disabled = true;

  showToast("Processing subscription...");

  try {
    const couponCode = modalAppliedCoupon ? inp.value.trim().toUpperCase() : undefined;
    const res = await fetch(`${appStatus.config.backendUrl}/api/vendor/subscription/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": appStatus.config.deviceId || "",
        "x-device-token": appStatus.config.deviceToken || "",
        ...(appStatus.config.sessionToken ? { Authorization: `Bearer ${appStatus.config.sessionToken}` } : {}),
      },
      body: JSON.stringify({
        planCode: modalSelectedPlan,
        billingCycle: modalBillingCycle,
        couponCode: couponCode,
      }),
    });

    const data = await res.json();

    if (data && data.activated) {
      showToast("🎉 Subscription Activated Successfully!");
      await fetchSubscription();
      closeSubscriptionModal();
      return;
    }

    if (data && data.razorpayOrderId) {
      // In-app verification
      const verifyRes = await fetch(`${appStatus.config.backendUrl}/api/vendor/subscription/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": appStatus.config.deviceId || "",
          "x-device-token": appStatus.config.deviceToken || "",
          ...(appStatus.config.sessionToken ? { Authorization: `Bearer ${appStatus.config.sessionToken}` } : {}),
        },
        body: JSON.stringify({
          planCode: modalSelectedPlan,
          billingCycle: modalBillingCycle,
          couponCode: couponCode,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpayOrderId: data.razorpayOrderId,
          razorpaySignature: `mock_sig_${Date.now()}`,
        }),
      });

      const vData = await verifyRes.json();
      if (vData && vData.verified) {
        showToast("🎉 Payment Successful! Plan Renewed.");
        await fetchSubscription();
        closeSubscriptionModal();
      } else {
        showToast("Payment verification issue: " + (vData?.error || "Failed"));
      }
    }
  } catch (err) {
    showToast("Subscription error: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function triggerManualSync() {
  if (!api || isSyncing) return;
  isSyncing = true;
  const btn = document.getElementById("btn-sync-action");
  const icon = document.getElementById("sync-icon");
  if (btn) btn.disabled = true;
  if (icon) icon.classList.add("spin");

  showToast("Synchronizing queue & printer hardware...");
  try {
    await refreshAll();
    showToast("✓ Synchronized successfully with Print2Me cloud");
  } catch (err) {
    showToast("Sync issue: " + err.message);
  } finally {
    if (icon) icon.classList.remove("spin");
    if (btn) btn.disabled = false;
    isSyncing = false;
  }
}

async function togglePolling() {
  if (!api) return;
  isPolling = !isPolling;
  await api.togglePolling(isPolling);
  updatePollingButton();
  showToast(isPolling ? "Auto-print queue polling active (8s interval)" : "Auto-print paused by operator");
}

function updatePollingButton() {
  const btn = document.getElementById("btn-toggle-polling");
  if (!btn) return;
  if (isPolling) {
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg><span>Pause Polling</span>`;
    btn.className = "btn btn-secondary btn-sm";
  } else {
    btn.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg><span>Resume Auto-Print</span>`;
    btn.className = "btn btn-primary btn-sm";
  }
}

// Vendor Login / Enrollment
async function handleVendorLogin(e) {
  e.preventDefault();
  const email = document.getElementById("inp-email").value.trim();
  const password = document.getElementById("inp-password").value;
  const deviceName = document.getElementById("inp-devicename").value.trim();
  const backendUrl = document.getElementById("inp-backend-url").value.trim();

  const btn = document.getElementById("btn-submit-login");
  btn.innerText = "Authenticating & Enrolling...";
  btn.disabled = true;

  try {
    const res = await api.login({ backendUrl, email, password, deviceName });
    if (res && res.success) {
      showToast("Workstation connected to " + (res.vendor?.name || "Store") + "!");
      refreshAll();
    } else {
      if (typeof showAuthError === "function") showAuthError(res?.error || "Login failed. Check server URL and credentials.");
    }
  } catch (err) {
    if (typeof showAuthError === "function") showAuthError(err.message || "Connection failed");
  } finally {
    btn.innerText = "Sign In & Connect Station";
    btn.disabled = false;
  }
}

async function handleCodeEnroll(e) {
  e.preventDefault();
  const enrollmentCode = document.getElementById("inp-code").value.trim();
  const deviceName = document.getElementById("inp-devicename-code").value.trim();
  const backendUrl = document.getElementById("inp-backend-url-code").value.trim();

  const btn = document.getElementById("btn-submit-code");
  btn.innerText = "Validating Code...";
  btn.disabled = true;

  try {
    const res = await api.enrollDevice({ backendUrl, enrollmentCode, deviceName });
    if (res && res.success) {
      showToast("Workstation successfully enrolled!");
      refreshAll();
    } else {
      if (typeof showAuthError === "function") showAuthError(res?.error || "Invalid or expired enrollment code.");
    }
  } catch (err) {
    if (typeof showAuthError === "function") showAuthError(err.message || "Enrollment failed");
  } finally {
    btn.innerText = "Enroll Device Station";
    btn.disabled = false;
  }
}

async function promptLogout() {
  if (!api) return;
  showToast("Disconnecting workstation...");
  try {
    await api.logout();
    appStatus = null;
    ordersList = [];
    showToast("Workstation disconnected.");
    refreshAll();
  } catch (err) {
    showToast("Disconnect error: " + (err.message || "Failed"));
  }
}

// Sound Alert Audio Player
const orderBellAudio = new Audio('./assets/sounds/order_bell.wav');

function playOrderBellSound() {
  try {
    orderBellAudio.currentTime = 0;
    orderBellAudio.play().catch((err) => {
      console.log('Audio playback note:', err);
    });
  } catch (err) {
    console.error('Audio play error:', err);
  }
}

// Subscribe to incoming print job alerts
if (typeof api !== 'undefined' && api && typeof api.onNewJob === 'function') {
  api.onNewJob((job) => {
    playOrderBellSound();
    showToast(`🔔 New Order #${job.orderNumber || ''} claimed & printing...`);
    if (typeof fetchOrders === 'function') fetchOrders();
  });
}

// Background Polling Loop
setInterval(() => {
  if (isPolling && typeof fetchOrders === "function") {
    fetchOrders();
  }
}, 8000);

// Initial Startup
document.addEventListener("DOMContentLoaded", () => {
  refreshAll();
});
