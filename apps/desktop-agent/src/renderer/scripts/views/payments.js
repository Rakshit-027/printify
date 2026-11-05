// ==============================================================
// VIEW: RAZORPAY ONBOARDING & VENDOR PAYMENT GATEWAY
// ==============================================================

let currentPaymentAccount = null;
let currentVendorPaymentSettings = null;
let isPaymentLoading = false;

async function loadPaymentsData() {
  if (!api || !appStatus?.isEnrolled) return;
  const container = document.getElementById("pane-payments");
  if (!container) return;

  isPaymentLoading = true;
  const syncBtn = document.getElementById("btn-sync-payments");
  if (syncBtn) syncBtn.disabled = true;

  try {
    const res = await api.getRazorpayStatus();
    if (res && res.success) {
      currentPaymentAccount = res.account;
      currentVendorPaymentSettings = res.vendor;
      renderPaymentsView();
    } else {
      console.warn("Razorpay status response:", res);
      renderPaymentsView();
    }
  } catch (err) {
    console.error("loadPaymentsData err:", err);
    showToast("Could not reach payment services");
  } finally {
    isPaymentLoading = false;
    if (syncBtn) syncBtn.disabled = false;
  }
}

function renderPaymentsView() {
  const container = document.getElementById("pane-payments");
  if (!container) return;

  const isConnected = currentPaymentAccount && currentPaymentAccount.authStatus === "AUTHORIZED";
  const activation = currentPaymentAccount?.activationStatus || "NOT_ACTIVATED";
  const isActivated = isConnected && (activation === "ACTIVATED" || activation === "ACTIVE");
  const isUnderReview = isConnected && (activation === "UNDER_REVIEW" || activation === "IN_REVIEW");

  let statusBadgeClass = "disconnected";
  let statusBadgeText = "Not Connected";
  let statusIconClass = "";

  if (isActivated) {
    statusBadgeClass = "active";
    statusBadgeText = "Active";
    statusIconClass = "connected";
  } else if (isUnderReview || isConnected) {
    statusBadgeClass = "review";
    statusBadgeText = "In Review";
    statusIconClass = "pending";
  }

  container.innerHTML = `
    <div class="payments-workspace-grid">
      <!-- 1. Top Status Banner Card -->
      <div class="payment-status-card">
        <div class="payment-status-info">
          <div class="payment-status-icon-box ${statusIconClass}">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:28px;height:28px;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <div class="payment-status-title-row">
              <span class="payment-status-title">Razorpay Merchant Gateway</span>
              <span class="payment-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
            </div>
            <div class="payment-status-desc">
              ${isConnected 
                ? "Razorpay account linked. Customer payments are deposited into your bank account." 
                : "Connect a Razorpay account to accept UPI, card, and Netbanking payments from the store QR."}
            </div>
          </div>
        </div>

        <div class="payment-status-actions">
          ${isConnected ? `
            <button class="btn btn-outline" id="btn-sync-payments" onclick="syncRazorpayStatus()">
              Sync status
            </button>
            <button class="btn btn-outline" style="color:var(--danger);border-color:#FCA5A5;" onclick="disconnectRazorpayAccount()">
              Disconnect
            </button>
          ` : `
            <button class="btn btn-primary" onclick="startRazorpayOnboarding()">
              Connect Razorpay
            </button>
          `}
        </div>
      </div>

      ${!isConnected ? `
        <!-- CTA Box for Instant Onboarding -->
        <div class="razorpay-connect-cta-box">
          <div class="cta-text-wrap">
            <div class="cta-headline">Accept Online Payments at Your Print Counter</div>
            <div class="cta-subtext">
              Complete Razorpay partner onboarding to start receiving UPI and card payments in your store's bank account.
            </div>
          </div>
          <button class="btn-razorpay-connect" onclick="startRazorpayOnboarding()">
            <span>Start Razorpay Onboarding</span>
          </button>
        </div>
      ` : ""}

      <!-- 2. Two-Column Detailed Configuration Grid -->
      <div class="payment-details-grid">
        <!-- Left: Account Details -->
        <div class="payment-account-card">
          <div class="card-section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;color:var(--brand-navy);">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            <span>Linked Merchant Profile</span>
          </div>

          <table class="payment-meta-table">
            <tr>
              <td class="payment-meta-label">Razorpay Merchant ID</td>
              <td class="payment-meta-value">${currentPaymentAccount?.razorpayAccountId || "Not assigned"}</td>
            </tr>
            <tr>
              <td class="payment-meta-label">Onboarding Partner</td>
              <td class="payment-meta-value">${currentPaymentAccount?.partnerApp || "Print2me"}</td>
            </tr>
            <tr>
              <td class="payment-meta-label">Authorization Status</td>
              <td class="payment-meta-value">${currentPaymentAccount?.authStatus || "NOT_CONNECTED"}</td>
            </tr>
            <tr>
              <td class="payment-meta-label">KYC / Activation State</td>
              <td class="payment-meta-value">${currentPaymentAccount?.activationStatus || "NOT_ACTIVATED"}</td>
            </tr>
            <tr>
              <td class="payment-meta-label">Customer Online Checkout</td>
              <td class="payment-meta-value">
                <span style="font-weight:700;color:${currentVendorPaymentSettings?.allowOnlinePayment ? '#059669' : '#D97706'};">
                  ${currentVendorPaymentSettings?.allowOnlinePayment ? "Enabled on QR standee" : "Disabled (Desk cash only)"}
                </span>
              </td>
            </tr>
            <tr>
              <td class="payment-meta-label">Settlement Mode</td>
              <td class="payment-meta-value">Direct Bank Route (Daily T+1 settlements)</td>
            </tr>
            <tr>
              <td class="payment-meta-label">Last Synced</td>
              <td class="payment-meta-value">${currentPaymentAccount?.lastSyncedAt ? new Date(currentPaymentAccount.lastSyncedAt).toLocaleString() : "Never"}</td>
            </tr>
          </table>

          ${currentPaymentAccount?.lastError ? `
            <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:var(--radius-md);padding:12px 16px;color:#B91C1C;font-size:12px;font-weight:600;">
              Notice: ${currentPaymentAccount.lastError}
            </div>
          ` : ""}
        </div>

        <!-- Right: How it works & Onboarding Steps -->
        <div class="payment-benefits-card">
          <div class="card-section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;color:var(--brand-orange);">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <span>Onboarding Steps</span>
          </div>

          <div class="onboarding-step-item">
            <div class="step-num-bubble">1</div>
            <div class="step-body">
              <div class="step-title">Click 'Start Razorpay Onboarding'</div>
              <div class="step-desc">A secure Razorpay authorization page opens in your browser.</div>
            </div>
          </div>

          <div class="onboarding-step-item">
            <div class="step-num-bubble">2</div>
            <div class="step-body">
              <div class="step-title">Enter Bank Account Details</div>
              <div class="step-desc">Enter your store's bank account number, IFSC code, and business PAN.</div>
            </div>
          </div>

          <div class="onboarding-step-item">
            <div class="step-num-bubble">3</div>
            <div class="step-body">
              <div class="step-title">Receive Customer Payments</div>
              <div class="step-desc">Customers can pay by UPI, card, or QR. Funds settle directly to your bank account.</div>
            </div>
          </div>

          <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px;margin-top:4px;">
            <div style="font-size:12px;font-weight:700;color:var(--brand-navy);margin-bottom:4px;">Verification Help</div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.4;">
              If your account shows In Review, click <strong>Sync status</strong> to refresh verification progress.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 1. Initiate Razorpay Onboarding
async function startRazorpayOnboarding() {
  if (!api) return;
  showToast("Opening Razorpay onboarding...");
  logActivity("Initiating Razorpay Onboarding", "Gateway OAuth", "info");

  try {
    const res = await api.connectRazorpay();
    if (res && res.authorizeUrl) {
      // Open in default OS browser
      await api.openExternalUrl(res.authorizeUrl);
      showToast("Razorpay authorization opened in browser");
      logActivity("Razorpay Window Opened", "Browser Redirect", "success");
    } else {
      showToast("Could not generate authorization URL: " + (res?.error || "Unknown"));
    }
  } catch (err) {
    console.error("startRazorpayOnboarding error:", err);
    showToast("Failed to launch onboarding: " + (err.message || "Network error"));
  }
}

// 2. Sync Verification Status
async function syncRazorpayStatus() {
  if (!api) return;
  showToast("Syncing status from Razorpay...");
  logActivity("Syncing Razorpay Status", "Route API", "info");

  try {
    const res = await api.syncRazorpay();
    if (res && res.success !== false) {
      showToast("Razorpay status updated.");
      logActivity("Razorpay Status Synced", "Success", "success");
      await loadPaymentsData();
    } else {
      showToast("Sync result: " + (res?.message || res?.error || "No active account"));
    }
  } catch (err) {
    console.error("syncRazorpayStatus err:", err);
    showToast("Sync failed: " + (err.message || "Network error"));
  }
}

// 3. Disconnect Account
async function disconnectRazorpayAccount() {
  if (!api) return;
  const confirmed = confirm("Are you sure you want to disconnect your Razorpay account?\n\nCustomers will only be able to pay in cash until you reconnect.");
  if (!confirmed) return;

  showToast("Disconnecting Razorpay account...");
  logActivity("Disconnecting Razorpay Account", "Vendor Request", "warning");

  try {
    const res = await api.disconnectRazorpay();
    if (res && res.success !== false) {
      showToast("Razorpay account disconnected.");
      logActivity("Razorpay Disconnected", "Success", "info");
      await loadPaymentsData();
    } else {
      showToast("Could not disconnect: " + (res?.error || "Error"));
    }
  } catch (err) {
    console.error("disconnectRazorpayAccount err:", err);
    showToast("Error disconnecting account");
  }
}

