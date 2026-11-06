// ==============================================================
// VIEW: PRINTERS & HARDWARE - PRODUCTION REAL PRINTER MANAGEMENT
// Supports USB, Wi-Fi, Ethernet, Windows Shared, and IPP Printers
// ==============================================================

let currentPrinterFilter = "ALL";
const openDetailsPrinters = new Set();
let isTroubleshootGuideOpen = false;

function setPrinterFilter(filter) {
  currentPrinterFilter = filter;
  renderPrinters();
}

function togglePrinterDetails(printerName) {
  if (openDetailsPrinters.has(printerName)) {
    openDetailsPrinters.delete(printerName);
  } else {
    openDetailsPrinters.add(printerName);
  }
  renderPrinters();
}

function toggleTroubleshootGuide() {
  isTroubleshootGuideOpen = !isTroubleshootGuideOpen;
  const guideContent = document.getElementById("troubleshoot-guide-body");
  const guideIcon = document.getElementById("troubleshoot-toggle-icon");
  if (guideContent) {
    guideContent.style.display = isTroubleshootGuideOpen ? "block" : "none";
  }
  if (guideIcon) {
    guideIcon.style.transform = isTroubleshootGuideOpen ? "rotate(180deg)" : "rotate(0deg)";
  }
}

async function quickAssignPrinter(printerName, type) {
  if (!api || !api.setPrinterPreference) return;
  const currentBw = appStatus?.config?.defaultBwPrinter || "";
  const currentColor = appStatus?.config?.defaultColorPrinter || "";

  if (type === "BW") {
    await api.setPrinterPreference({ defaultBwPrinter: printerName, defaultColorPrinter: currentColor });
    showToast(`Assigned '${printerName}' as Default B&W Printer`);
  } else if (type === "COLOR") {
    await api.setPrinterPreference({ defaultBwPrinter: currentBw, defaultColorPrinter: printerName });
    showToast(`Assigned '${printerName}' as Default Color Printer`);
  }

  if (typeof refreshAll === "function") {
    refreshAll();
  } else {
    if (appStatus && appStatus.config) {
      if (type === "BW") appStatus.config.defaultBwPrinter = printerName;
      if (type === "COLOR") appStatus.config.defaultColorPrinter = printerName;
    }
    renderPrinters();
  }
}

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

  // Populate Select Dropdowns with Connection Type Labels
  let optionsHtml = `<option value="">System Default Printer</option>`;
  printersList.forEach((p) => {
    const isOnlineTag = p.isOnline ? "" : " (OFFLINE)";
    const connLabel = p.connectionType ? ` [${p.connectionType}]` : "";
    optionsHtml += `<option value="${escapeHtml(p.systemName)}">${escapeHtml(p.systemName)}${connLabel}${isOnlineTag}</option>`;
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
      bwWarningEl.innerHTML = `<strong>Missing Printer:</strong> Saved B&amp;W printer '<strong>${escapeHtml(savedBw)}</strong>' is not currently found in Windows. Please select an available printer.`;
    } else if (savedColor && !printersList.some((p) => p.systemName.toLowerCase() === savedColor.toLowerCase())) {
      bwWarningEl.style.display = "block";
      bwWarningEl.innerHTML = `<strong>Missing Printer:</strong> Saved Color printer '<strong>${escapeHtml(savedColor)}</strong>' is not currently found in Windows. Please select an available printer.`;
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
        <div style="width:36px;height:36px;border-radius:10px;background:#FEF3C7;color:#D97706;display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div style="font-size:15px;font-weight:800;color:#92400E;margin-bottom:6px;">No printers were found on this computer.</div>
        <div style="font-size:12px;color:#B45309;margin-bottom:18px;max-width:440px;line-height:1.6;">
          Connect or install a printer in Windows (USB cable, Wi-Fi wireless network, Ethernet LAN, or Windows Share), then refresh the printer list.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-primary btn-sm" onclick="syncAllPrinters()">
            Refresh Printers
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openWindowsSettings()">
            Open Windows Printer Settings
          </button>
        </div>
      </div>
    `;
    return;
  }

  // CONNECTION FILTER BAR
  const wifiCount = printersList.filter((p) => p.connectionType === "WIFI").length;
  const ethCount = printersList.filter((p) => p.connectionType === "ETHERNET").length;
  const usbCount = printersList.filter((p) => p.connectionType === "USB").length;
  const sharedCount = printersList.filter((p) => p.connectionType === "SHARED").length;
  const ippCount = printersList.filter((p) => p.connectionType === "IPP").length;
  const otherCount = printersList.filter((p) => p.connectionType === "OTHER" || !p.connectionType).length;

  const filterBar = document.createElement("div");
  filterBar.className = "printer-filter-bar";
  filterBar.innerHTML = `
    <button class="printer-filter-pill ${currentPrinterFilter === 'ALL' ? 'active' : ''}" onclick="setPrinterFilter('ALL')">
      All (${printersList.length})
    </button>
    ${wifiCount > 0 ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'WIFI' ? 'active' : ''}" onclick="setPrinterFilter('WIFI')">
        Wi-Fi (${wifiCount})
      </button>
    ` : ''}
    ${ethCount > 0 ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'ETHERNET' ? 'active' : ''}" onclick="setPrinterFilter('ETHERNET')">
        Ethernet (${ethCount})
      </button>
    ` : ''}
    ${usbCount > 0 ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'USB' ? 'active' : ''}" onclick="setPrinterFilter('USB')">
        USB (${usbCount})
      </button>
    ` : ''}
    ${sharedCount > 0 ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'SHARED' ? 'active' : ''}" onclick="setPrinterFilter('SHARED')">
        Shared (${sharedCount})
      </button>
    ` : ''}
    ${ippCount > 0 ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'IPP' ? 'active' : ''}" onclick="setPrinterFilter('IPP')">
        IPP (${ippCount})
      </button>
    ` : ''}
    ${otherCount > 0 && otherCount !== printersList.length ? `
      <button class="printer-filter-pill ${currentPrinterFilter === 'OTHER' ? 'active' : ''}" onclick="setPrinterFilter('OTHER')">
        Other (${otherCount})
      </button>
    ` : ''}
  `;
  hwWrap.appendChild(filterBar);

  // FILTERED PRINTERS LIST
  const displayedPrinters = printersList.filter((p) => {
    if (currentPrinterFilter === "ALL") return true;
    if (currentPrinterFilter === "WIFI") return p.connectionType === "WIFI";
    if (currentPrinterFilter === "ETHERNET") return p.connectionType === "ETHERNET";
    if (currentPrinterFilter === "USB") return p.connectionType === "USB";
    if (currentPrinterFilter === "SHARED") return p.connectionType === "SHARED";
    if (currentPrinterFilter === "IPP") return p.connectionType === "IPP";
    if (currentPrinterFilter === "OTHER") return p.connectionType === "OTHER" || !p.connectionType;
    return true;
  });

  if (displayedPrinters.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.cssText = "padding:20px;text-align:center;color:var(--text-muted);font-size:12px;background:#F8FAFC;border:1px dashed var(--border-color);border-radius:8px;";
    emptyNotice.innerText = `No printers found matching filter '${currentPrinterFilter}'.`;
    hwWrap.appendChild(emptyNotice);
    return;
  }

  // RENDER DETECTED PRINTERS
  displayedPrinters.forEach((p) => {
    const isBw = p.systemName === savedBw || (!savedBw && p.isDefault);
    const isCol = p.systemName === savedColor;
    const isDetailsOpen = openDetailsPrinters.has(p.systemName);

    // Status Badge
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
    } else if (p.status === "SPOOLER_STOPPED") {
      statusBadge = `<span class="status-badge badge-error" style="font-size:10px;background:#FEE2E2;color:#DC2626;">SPOOLER STOPPED</span>`;
    }

    // Connection Type Badge with Icon
    let connBadge = `<span class="printer-conn-badge conn-other">Other</span>`;
    if (p.connectionType === "WIFI") {
      connBadge = `
        <span class="printer-conn-badge conn-wifi" title="${escapeHtml(p.connectionDetails || 'Wi-Fi Wireless Printer')}">
          <svg style="width:11px;height:11px;" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>
          Wi-Fi
        </span>
      `;
    } else if (p.connectionType === "ETHERNET") {
      connBadge = `
        <span class="printer-conn-badge conn-ethernet" title="${escapeHtml(p.connectionDetails || 'Ethernet LAN Printer')}">
          <svg style="width:11px;height:11px;" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.7 4.95a2.25 2.25 0 011.8-1.2h9a2.25 2.25 0 011.8 1.2l2.55 3.6a4.5 4.5 0 01.9 2.7" /></svg>
          Ethernet
        </span>
      `;
    } else if (p.connectionType === "USB") {
      connBadge = `
        <span class="printer-conn-badge conn-usb" title="${escapeHtml(p.connectionDetails || 'USB Hardware Connection')}">
          <svg style="width:11px;height:11px;" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
          USB
        </span>
      `;
    } else if (p.connectionType === "SHARED") {
      connBadge = `
        <span class="printer-conn-badge conn-shared" title="${escapeHtml(p.connectionDetails || 'Windows Shared Network Printer')}">
          <svg style="width:11px;height:11px;" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
          Shared
        </span>
      `;
    } else if (p.connectionType === "IPP") {
      connBadge = `
        <span class="printer-conn-badge conn-ipp" title="${escapeHtml(p.connectionDetails || 'Internet Printing Protocol')}">
          <svg style="width:11px;height:11px;" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
          IPP
        </span>
      `;
    }

    // Top paper sizes
    const sizes = Array.isArray(p.supportedSizes) ? p.supportedSizes : [];
    const sizesPreview = sizes.slice(0, 3).join(", ") + (sizes.length > 3 ? ` +${sizes.length - 3} more` : "");

    const card = document.createElement("div");
    card.className = "printer-hardware-card";
    card.style.cssText = "display:flex;flex-direction:column;padding:14px;border:1px solid var(--border-color);border-radius:10px;background:#fff;gap:10px;margin-bottom:10px;";

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;width:100%;">
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1;">
          
          <!-- Top Row: Name, Connection Badge, Status, Default Badges -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:800;color:var(--brand-navy);">${escapeHtml(p.systemName)}</span>
            ${connBadge}
            ${statusBadge}
            ${p.isDefault ? '<span class="status-badge badge-neutral" style="font-size:9px;background:#F1F5F9;font-weight:800;">WINDOWS DEFAULT</span>' : ''}
            ${isBw ? '<span class="printer-chip chip-cyan" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:#ECFEFF;color:#0891B2;">Assigned B&amp;W</span>' : ''}
            ${isCol ? '<span class="printer-chip chip-purple" style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:#FAF5FF;color:#9333EA;">Assigned Color</span>' : ''}
          </div>

          <!-- Metadata Summary Row -->
          <div style="font-size:11px;color:var(--text-muted);display:flex;gap:10px;flex-wrap:wrap;line-height:1.5;">
            <span><strong>Connection:</strong> ${escapeHtml(p.connectionDetails || p.connectionType || 'Standard')}</span>
            <span>•</span>
            <span><strong>Driver:</strong> ${escapeHtml(p.driverName || 'Windows System Driver')}</span>
            <span>•</span>
            <span><strong>Port:</strong> ${escapeHtml(p.portName || 'Local')}</span>
          </div>

          <!-- Capabilities Row -->
          <div style="font-size:11px;color:#475569;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <span style="font-weight:600;">Paper: <span style="font-weight:700;color:var(--brand-navy);">${escapeHtml(sizesPreview || 'A4')}</span></span>
            <span>•</span>
            <span style="font-weight:600;">Color: <span style="font-weight:700;color:var(--brand-navy);">${p.supportsColor ? "Color Supported" : "Monochrome Only"}</span></span>
            <span>•</span>
            <span style="font-weight:600;">Duplex: <span style="font-weight:700;color:var(--brand-navy);">${p.supportsDuplex ? "Supported (Two-Sided)" : "Single-Sided Only"}</span></span>
          </div>

          <!-- Troubleshooting Alert Box if Offline or Error -->
          ${p.statusDetails && p.status !== 'READY' && p.status !== 'PRINTING' ? `
            <div style="font-size:11px;color:#92400E;background:#FFFBEB;border:1px solid #FDE68A;padding:6px 10px;border-radius:6px;margin-top:4px;line-height:1.5;">
              <strong>${p.status === 'OFFLINE' ? 'Offline Notice:' : 'Alert:'}</strong> ${escapeHtml(p.statusDetails)}
            </div>
          ` : ''}

        </div>

        <!-- Action Buttons -->
        <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">
          ${!isBw ? `
            <button class="btn btn-secondary btn-sm" onclick="quickAssignPrinter('${escapeJs(p.systemName)}', 'BW')" title="Set as default black &amp; white laser printer">
              Set B&amp;W
            </button>
          ` : ''}
          ${!isCol ? `
            <button class="btn btn-secondary btn-sm" onclick="quickAssignPrinter('${escapeJs(p.systemName)}', 'COLOR')" title="Set as default color printer">
              Set Color
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="openPrinterNativeQueue('${escapeJs(p.systemName)}')" title="Open native Windows Print Spooler Queue">
            Windows Queue
          </button>
          <button class="btn btn-secondary btn-sm" onclick="testPrintPrinter('${escapeJs(p.systemName)}')">
            Test Print
          </button>
          <button class="btn btn-secondary btn-sm" onclick="togglePrinterDetails('${escapeJs(p.systemName)}')" title="View driver and hardware details">
            ${isDetailsOpen ? 'Hide Info' : 'Details'}
          </button>
        </div>
      </div>

      <!-- Expandable Details Drawer -->
      ${isDetailsOpen ? `
        <div class="printer-details-drawer">
          <div class="printer-details-grid">
            <div><strong>Windows Name:</strong> ${escapeHtml(p.systemName)}</div>
            <div><strong>Connection:</strong> ${escapeHtml(p.connectionType)} (${escapeHtml(p.connectionDetails)})</div>
            <div><strong>Assigned Port:</strong> ${escapeHtml(p.portName || 'Unknown')}</div>
            <div><strong>Installed Driver:</strong> ${escapeHtml(p.driverName || 'Standard')}</div>
            <div><strong>Spooler Status:</strong> ${escapeHtml(p.status)}</div>
            <div><strong>Default Printer:</strong> ${p.isDefault ? 'Yes (Windows Default)' : 'No'}</div>
            <div><strong>Two-Sided (Duplex):</strong> ${p.supportsDuplex ? 'Hardware Duplex Supported' : 'Manual / Single-Sided'}</div>
            <div><strong>Color Capability:</strong> ${p.supportsColor ? 'Full Color Supported' : 'Monochrome Only'}</div>
            ${p.serverName ? `<div><strong>Remote Server:</strong> ${escapeHtml(p.serverName)}</div>` : ''}
            ${p.shareName ? `<div><strong>Share Name:</strong> ${escapeHtml(p.shareName)}</div>` : ''}
            ${p.location ? `<div><strong>Location:</strong> ${escapeHtml(p.location)}</div>` : ''}
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #E2E8F0;">
            <strong>Driver Paper Sizes (${sizes.length}):</strong>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">
              ${sizes.map(s => `<span class="capability-badge">${escapeHtml(s)}</span>`).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    `;

    hwWrap.appendChild(card);
  });

  // RENDER NETWORK PRINTER TROUBLESHOOTING GUIDE AT THE BOTTOM
  const guideCard = document.createElement("div");
  guideCard.className = "troubleshooting-card";
  guideCard.innerHTML = `
    <div class="troubleshooting-header" onclick="toggleTroubleshootGuide()">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;color:#0284C7;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
        <span>Wi-Fi &amp; Network Printer Setup &amp; Troubleshooting Guide</span>
      </div>
      <svg id="troubleshoot-toggle-icon" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;transition:transform 0.2s;transform:${isTroubleshootGuideOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
    </div>
    <div id="troubleshoot-guide-body" class="troubleshooting-content" style="display:${isTroubleshootGuideOpen ? 'block' : 'none'};">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:14px;">
        
        <div>
          <div style="font-weight:800;color:var(--brand-navy);margin-bottom:4px;">1. Connecting a Wi-Fi Printer in Windows</div>
          <ol style="padding-left:18px;margin:0;">
            <li>Ensure the printer and this computer are connected to the <strong>same Wi-Fi network</strong> (SSID).</li>
            <li>In Windows, open <strong>Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners</strong>.</li>
            <li>Click <strong>Add device</strong> and select your wireless printer from the discovered list.</li>
            <li>Once installed, click <strong>Refresh Printers</strong> above in Print2Me.</li>
          </ol>
        </div>

        <div>
          <div style="font-weight:800;color:var(--brand-navy);margin-bottom:4px;">2. Connecting an Ethernet / LAN Printer</div>
          <ol style="padding-left:18px;margin:0;">
            <li>Connect the printer via Ethernet cable directly to your network switch or Wi-Fi router.</li>
            <li>Print a network configuration sheet from the printer to obtain its IP address (e.g. <code>192.168.1.100</code>).</li>
            <li>In Windows Settings, choose <em>Add manually &rarr; Add a printer using an IP address or hostname</em>.</li>
            <li>Select <strong>Standard TCP/IP Port</strong> and complete the driver wizard.</li>
          </ol>
        </div>

        <div>
          <div style="font-weight:800;color:var(--brand-navy);margin-bottom:4px;">3. Connecting a Windows Shared Printer</div>
          <ol style="padding-left:18px;margin:0;">
            <li>On the host computer sharing the printer, ensure <em>Printer Properties &rarr; Sharing &rarr; Share this printer</em> is enabled.</li>
            <li>On this workstation, press <code>Win + R</code> and type <code>\\\\ComputerName</code> to browse the shared printer.</li>
            <li>Right-click the shared printer and choose <strong>Connect</strong> to install the network driver.</li>
          </ol>
        </div>

        <div>
          <div style="font-weight:800;color:var(--brand-navy);margin-bottom:4px;">4. Resolving "Offline" Network Printers</div>
          <ul style="padding-left:18px;margin:0;">
            <li><strong>Printer in Sleep Mode:</strong> Press any button on the printer control panel to wake it up.</li>
            <li><strong>Router Reboot / Changed IP:</strong> If the router assigned a new DHCP address, turn the printer off and on.</li>
            <li><strong>Network Profile:</strong> Ensure Windows Network connection is set to <strong>Private network</strong> (Settings &rarr; Network &rarr; Wi-Fi/Ethernet).</li>
            <li><strong>Windows Network Discovery:</strong> Enable Network Discovery in Windows Control Panel &rarr; Network and Sharing Center.</li>
          </ul>
        </div>

      </div>
    </div>
  `;
  hwWrap.appendChild(guideCard);
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
  showToast("Scanning Windows printer spoolers, network interfaces & registered drivers...");
  try {
    const res = await api.syncPrinters();
    if (res && res.success) {
      printersList = res.printers || [];
      renderPrinters();
      showToast(`Discovered ${printersList.length} Windows printer(s)!`);
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
  showToast("Printer routing preferences saved");
  if (typeof refreshAll === "function") refreshAll();
}

async function testPrintPrinter(name) {
  if (!api) return;
  showToast(`Sending hardware verification test page to '${name}'...`);
  try {
    const res = await api.testPrint(name);
    if (res && res.success) {
      showToast(`Test page submitted to Windows print spooler for '${name}'`);
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
    const netDiag = diag.networkDiagnostics;

    let networkStatusHtml = "";
    if (netDiag) {
      const wifiStatus = netDiag.hasActiveWifi ? '<span style="color:#16A34A;font-weight:800;">ACTIVE (Wireless)</span>' : '<span style="color:#64748B;">Inactive / Not connected</span>';
      const ethStatus = netDiag.hasActiveEthernet ? '<span style="color:#16A34A;font-weight:800;">ACTIVE (Wired)</span>' : '<span style="color:#64748B;">Not connected</span>';
      const counts = netDiag.printersByConnection || {};

      networkStatusHtml = `
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">HOST NETWORK ADAPTERS</div>
          <div style="font-size:11px;margin-top:2px;">
            <div>Wi-Fi: ${wifiStatus}</div>
            <div>Ethernet: ${ethStatus}</div>
          </div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">DISCOVERED PRINTER TYPES</div>
          <div style="font-size:11px;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;">
            <span>Wi-Fi: <strong>${counts.WIFI || 0}</strong></span>
            <span>Ethernet: <strong>${counts.ETHERNET || 0}</strong></span>
            <span>USB: <strong>${counts.USB || 0}</strong></span>
            <span>Shared: <strong>${counts.SHARED || 0}</strong></span>
            <span>IPP: <strong>${counts.IPP || 0}</strong></span>
          </div>
        </div>
      `;
    }

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:12px;">
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">OS / PLATFORM</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${escapeHtml(diag.platform)}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">WINDOWS SPOOLER STATUS</div>
          <div style="font-size:12px;font-weight:800;color:${diag.networkDiagnostics?.spoolerRunning !== false ? '#16A34A' : '#DC2626'};margin-top:2px;">
            ${diag.networkDiagnostics?.spoolerRunning !== false ? 'ONLINE &amp; ACTIVE' : 'STOPPED'} (${spoolJobs.length} queued)
          </div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">SELECTED B&amp;W PRINTER</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${escapeHtml(diag.selectedBwPrinter)}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);">SELECTED COLOR PRINTER</div>
          <div style="font-size:12px;font-weight:800;color:var(--brand-navy);margin-top:2px;">${escapeHtml(diag.selectedColorPrinter)}</div>
        </div>
        ${networkStatusHtml}
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
                  <td style="padding:6px 8px;font-weight:700;">${escapeHtml(r.orderNumber)}</td>
                  <td style="padding:6px 8px;">${escapeHtml(r.printerName)}</td>
                  <td style="padding:6px 8px;">
                    <span style="font-weight:800;color:${r.state === 'COMPLETED' ? '#16A34A' : r.state === 'SUBMITTED_TO_SPOOLER' ? '#2563EB' : r.state === 'NEEDS_ATTENTION' || r.state === 'FAILED' ? '#DC2626' : '#D97706'};">
                      ${escapeHtml(r.state)}
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
