// ==============================================================
// VIEW: PRINTERS & HARDWARE - PRODUCTION REAL PRINTER MANAGEMENT
// ==============================================================

function renderPrinters() {
  const count = printersList.length;
  const badgePrinters = document.getElementById("badge-sidebar-printers");
  const hwCount = document.getElementById("hw-count-text");
  if (badgePrinters) badgePrinters.innerText = count;
  if (hwCount) hwCount.innerText = count;

  const bwSelect = document.getElementById("select-bw-printer");
  const colorSelect = document.getElementById("select-color-printer");
  const savedBw = appStatus?.config?.defaultBwPrinter || "";
  const savedColor = appStatus?.config?.defaultColorPrinter || "";

  // Populate Select Dropdowns
  let optionsHtml = `<option value="">System Default Printer</option>`;
  printersList.forEach((p) => {
    const isOnlineTag = p.isOnline ? "" : " (OFFLINE)";
    optionsHtml += `<option value="${p.systemName}">${p.systemName}${isOnlineTag}</option>`;
  });

  if (bwSelect) bwSelect.innerHTML = optionsHtml;
  if (colorSelect) colorSelect.innerHTML = optionsHtml;
  if (bwSelect && savedBw) bwSelect.value = savedBw;
  if (colorSelect && savedColor) colorSelect.value = savedColor;

  // Check if saved printers exist
  const bwWarningEl = document.getElementById("printer-selection-warning");
  if (bwWarningEl) {
    if (savedBw && !printersList.some((p) => p.systemName.toLowerCase() === savedBw.toLowerCase())) {
      bwWarningEl.style.display = "block";
      bwWarningEl.innerHTML = `⚠️ <strong>Missing Printer:</strong> Saved B&amp;W printer '<strong>${savedBw}</strong>' is not currently found in Windows. Please select an available printer.`;
    } else if (savedColor && !printersList.some((p) => p.systemName.toLowerCase() === savedColor.toLowerCase())) {
      bwWarningEl.style.display = "block";
      bwWarningEl.innerHTML = `⚠️ <strong>Missing Printer:</strong> Saved Color printer '<strong>${savedColor}</strong>' is not currently found in Windows. Please select an available printer.`;
    } else {
      bwWarningEl.style.display = "none";
    }
  }

  // 1. Overview mini printers list
  if (typeof renderOverviewPrinters === "function") {
    renderOverviewPrinters();
  }

  // 2. Full hardware list in Printers & Hardware pane
  const hwWrap = document.getElementById("printers-cards-list");
  if (!hwWrap) return;

  hwWrap.innerHTML = "";

  // EMPTY PRINTER LIST HANDLING
  if (printersList.length === 0) {
    hwWrap.innerHTML = `
      <div style="padding:28px 20px;text-align:center;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;display:flex;flex-direction:column;align-items:center;">
        <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
        <div style="font-size:15px;font-weight:800;color:#92400E;margin-bottom:6px;">No printers were found on this computer.</div>
        <div style="font-size:12px;color:#B45309;margin-bottom:18px;max-width:440px;line-height:1.6;">
          Connect or install a printer in Windows, then refresh the printer list. Make sure the printer is turned on and connected via USB or local network.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-primary btn-sm" onclick="syncAllPrinters()">
            🔄 Refresh Printers
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openWindowsSettings()">
            ⚙️ Open Windows Printer Settings
          </button>
        </div>
      </div>
    `;
    return;
  }

  // RENDER DETECTED REAL PRINTERS
  printersList.forEach((p) => {
    const isBw = p.systemName === savedBw || (!savedBw && p.isDefault);
    const isCol = p.systemName === savedColor;

    let statusBadge = `<span class="status-badge badge-success" style="font-size:10px;">ONLINE &amp; READY</span>`;
    if (p.status === "OFFLINE" || !p.isOnline) {
      statusBadge = `<span class="status-badge badge-neutral" style="font-size:10px;background:#F1F5F9;color:#64748B;">OFFLINE</span>`;
    } else if (p.status === "PAUSED") {
      statusBadge = `<span class="status-badge badge-warning" style="font-size:10px;background:#FEF3C7;color:#D97706;">PAUSED IN WINDOWS</span>`;
    } else if (p.status === "PAPER_JAM") {
      statusBadge = `<span class="status-badge badge-error" style="font-size:10px;background:#FEE2E2;color:#DC2626;">PAPER JAM</span>`;
    } else if (p.status === "OUT_OF_PAPER") {
      statusBadge = `<span class="status-badge badge-error" style="font-size:10px;background:#FEE2E2;color:#DC2626;">OUT OF PAPER</span>`;
    } else if (p.status === "ERROR") {
      statusBadge = `<span class="status-badge badge-error" style="font-size:10px;background:#FEE2E2;color:#DC2626;">DRIVER ERROR</span>`;
    } else if (p.status === "PRINTING") {
      statusBadge = `<span class="status-badge badge-info" style="font-size:10px;background:#EFF6FF;color:#2563EB;">PRINTING</span>`;
    }

    const card = document.createElement("div");
    card.className = "printer-hardware-card";
    card.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:14px;border:1px solid var(--border-color);border-radius:10px;background:#fff;gap:12px;margin-bottom:8px;";

    card.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:5px;min-width:0;flex:1;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:14px;font-weight:800;color:var(--brand-navy);">${escapeHtml(p.systemName)}</span>
          ${p.isDefault ? '<span class="status-badge badge-neutral" style="font-size:9px;background:#F1F5F9;font-weight:800;">WINDOWS DEFAULT</span>' : ''}
          ${isBw ? '<span class="printer-chip chip-cyan" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:#ECFEFF;color:#0891B2;">Assigned B&amp;W</span>' : ''}
          ${isCol ? '<span class="printer-chip chip-purple" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:#FAF5FF;color:#9333EA;">Assigned Color</span>' : ''}
          ${statusBadge}
        </div>

        <div style="font-size:11px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;">
          <span><strong>Driver:</strong> ${escapeHtml(p.driverName || 'Windows System Driver')}</span>
          <span>•</span>
          <span><strong>Port:</strong> ${escapeHtml(p.portName || 'System Port')}</span>
          <span>•</span>
          <span>${p.supportsColor ? "🎨 Color Supported" : "⬛ Monochrome"}</span>
          <span>•</span>
          <span>${p.supportsDuplex ? "Two-Sided (Duplex)" : "Single Sided"}</span>
        </div>

        ${p.statusDetails && p.status !== 'READY' ? `
          <div style="font-size:11px;color:#B45309;background:#FEF3C7;padding:3px 8px;border-radius:4px;margin-top:2px;display:inline-block;">
            ⚠️ ${escapeHtml(p.statusDetails)}
          </div>
        ` : ''}
      </div>

      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn btn-secondary btn-sm" onclick="openPrinterNativeQueue('${escapeJs(p.systemName)}')" title="Open real Windows Spooler Queue">
          📑 Windows Queue
        </button>
        <button class="btn btn-secondary btn-sm" onclick="testPrintPrinter('${escapeJs(p.systemName)}')">
          🖨️ Test Print
        </button>
      </div>
    `;

    hwWrap.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJs(str) {
  if (!str) return "";
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function syncAllPrinters() {
  if (!api) return;
  showToast("Scanning Windows printer spoolers & registered drivers...");
  try {
    const res = await api.syncPrinters();
    if (res && res.success) {
      printersList = res.printers || [];
      renderPrinters();
      showToast(`Discovered ${printersList.length} actual Windows printer(s)!`);
      if (typeof refreshDiagnostics === "function") refreshDiagnostics();
    } else {
      showToast("Printer scan warning: " + (res?.message || "Could not enumerate"));
    }
  } catch (err) {
    showToast("Printer scan failed: " + err.message);
  }
}

async function saveRoutingPrefs() {
  if (!api) return;
  const bwSelect = document.getElementById("select-bw-printer");
  const colSelect = document.getElementById("select-color-printer");
  const defaultBwPrinter = bwSelect ? bwSelect.value : "";
  const defaultColorPrinter = colSelect ? colSelect.value : "";

  await api.setPrinterPreference({ defaultBwPrinter, defaultColorPrinter });
  showToast("✓ Smart printer routing preferences saved!");
  if (typeof refreshAll === "function") refreshAll();
}

async function testPrintPrinter(name) {
  if (!api) return;
  showToast(`Sending hardware verification test page to '${name}'...`);
  try {
    const res = await api.testPrint(name);
    if (res && res.success) {
      showToast(`✓ Test page submitted to Windows print spooler for '${name}'!`);
      logActivity("Test Page Spooled", name, "success");
    } else {
      showToast(`Test print alert: ${res?.message || "Failed"}`);
      logActivity("Test Print Alert", res?.message || "Error", "error");
    }
  } catch (err) {
    showToast(`Test print error: ${err.message}`);
  }
}

async function openPrinterNativeQueue(printerName) {
  if (!api || !api.openPrinterQueue) return;
  showToast(`Opening Windows print queue for '${printerName}'...`);
  const res = await api.openPrinterQueue(printerName);
  if (res && !res.success) {
    showToast(`Notice: ${res.message}`);
  }
}

async function openWindowsSettings() {
  if (!api || !api.openWindowsPrinterSettings) return;
  showToast("Opening Windows Printer Settings...");
  await api.openWindowsPrinterSettings();
}

async function refreshDiagnostics() {
  if (!api || !api.getDiagnostics) return;
  try {
    const diag = await api.getDiagnostics();
    const wrap = document.getElementById("diagnostics-panel-content");
    if (!wrap || !diag) return;

    const spoolJobs = diag.spoolerJobs || [];
    const recent = diag.recentJobs || [];

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:12px;">
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">OS / PLATFORM</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${diag.platform}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">WINDOWS SPOOLER STATUS</div>
          <div style="font-size:12px;font-weight:800;color:#16A34A;margin-top:2px;">ONLINE &amp; ACTIVE (${spoolJobs.length} queued)</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">SELECTED B&amp;W PRINTER</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${diag.selectedBwPrinter}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">SELECTED COLOR PRINTER</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${diag.selectedColorPrinter}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-bottom:6px;">Recent Print2Me Spool Submissions &amp; Lifecycle:</div>
      ${recent.length === 0 ? '<div style="font-size:11px;color:var(--text-muted);">No print orders processed during this session.</div>' : `
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;">
          <table style="width:100%;font-size:11px;border-collapse:collapse;text-align:left;">
            <thead>
              <tr style="background:#F1F5F9;border-bottom:1px solid var(--border-color);">
                <th style="padding:6px 8px;">Order #</th>
                <th style="padding:6px 8px;">Printer</th>
                <th style="padding:6px 8px;">State</th>
                <th style="padding:6px 8px;">Win Spool Job #</th>
                <th style="padding:6px 8px;">Time</th>
              </tr>
            </thead>
            <tbody>
              ${recent.map(r => `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:6px 8px;font-weight:700;">${r.orderNumber}</td>
                  <td style="padding:6px 8px;">${r.printerName}</td>
                  <td style="padding:6px 8px;">
                    <span style="font-weight:800;color:${r.state === 'COMPLETED' ? '#16A34A' : r.state === 'SUBMITTED_TO_SPOOLER' ? '#2563EB' : r.state === 'NEEDS_ATTENTION' || r.state === 'FAILED' ? '#DC2626' : '#D97706'};">
                      ${r.state}
                    </span>
                  </td>
                  <td style="padding:6px 8px;">${r.windowsJobId ? '#' + r.windowsJobId : '—'}</td>
                  <td style="padding:6px 8px;color:var(--text-muted);">${new Date(r.updatedAt).toLocaleTimeString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  } catch (err) {
    console.warn("Diagnostics refresh error:", err);
  }
}
