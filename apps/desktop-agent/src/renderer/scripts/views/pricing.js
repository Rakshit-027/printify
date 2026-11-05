// ==============================================================
// VIEW: PRINT RATES & PAPER SIZES
// ==============================================================

let desktopPricingData = [
  { paperSize: "A4", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 200, isActive: true },
  { paperSize: "A4", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 175, isActive: true },
  { paperSize: "A4", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1000, isActive: true },
  { paperSize: "A4", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 900, isActive: true },
  { paperSize: "A3", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 500, isActive: false },
  { paperSize: "A3", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 450, isActive: false },
  { paperSize: "A3", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 2000, isActive: false },
  { paperSize: "A3", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 1800, isActive: false },
  { paperSize: "LEGAL", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 300, isActive: false },
  { paperSize: "LEGAL", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 250, isActive: false },
  { paperSize: "LEGAL", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1200, isActive: false },
  { paperSize: "LEGAL", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 1100, isActive: false },
  { paperSize: "LETTER", colorMode: "BLACK_AND_WHITE", isDuplex: false, pricePerSideMinor: 200, isActive: false },
  { paperSize: "LETTER", colorMode: "BLACK_AND_WHITE", isDuplex: true, pricePerSideMinor: 175, isActive: false },
  { paperSize: "LETTER", colorMode: "COLOR", isDuplex: false, pricePerSideMinor: 1000, isActive: false },
  { paperSize: "LETTER", colorMode: "COLOR", isDuplex: true, pricePerSideMinor: 900, isActive: false },
];
let desktopMinOrder = 5;

async function loadPricingData() {
  if (api && api.getPricing) {
    try {
      const res = await api.getPricing();
      if (res && res.success && res.pricing) {
        desktopPricingData = res.pricing;
        if (res.minimumOrderMinor !== undefined) {
          desktopMinOrder = res.minimumOrderMinor / 100;
        }
      }
    } catch (err) {
      console.error("loadPricingData err:", err);
    }
  }
  renderDesktopPricingMatrix();
}

function renderDesktopPricingMatrix() {
  const container = document.getElementById("desktop-pricing-matrix");
  if (!container) return;
  const minInput = document.getElementById("inp-desktop-min-order");
  if (minInput) minInput.value = desktopMinOrder;

  const sizes = [
    { key: "A4", name: "A4 (Standard 210 × 297 mm)", desc: "Standard college & office prints" },
    { key: "A3", name: "A3 (Large Format 297 × 420 mm)", desc: "Drawings, posters, large spreadsheets" },
    { key: "LEGAL", name: "Legal (8.5 × 14 in)", desc: "Stamp papers, affidavits, court contracts" },
    { key: "LETTER", name: "Letter (8.5 × 11 in)", desc: "Corporate documents & invoices" },
  ];

  container.innerHTML = "";
  sizes.forEach(s => {
    const sizeItems = desktopPricingData.filter(p => p.paperSize === s.key);
    const isActive = sizeItems.some(p => p.isActive !== false);

    const bw1 = (sizeItems.find(p => p.colorMode === "BLACK_AND_WHITE" && !p.isDuplex)?.pricePerSideMinor || 200) / 100;
    const bw2 = (sizeItems.find(p => p.colorMode === "BLACK_AND_WHITE" && p.isDuplex)?.pricePerSideMinor || 175) / 100;
    const col1 = (sizeItems.find(p => p.colorMode === "COLOR" && !p.isDuplex)?.pricePerSideMinor || 1000) / 100;
    const col2 = (sizeItems.find(p => p.colorMode === "COLOR" && p.isDuplex)?.pricePerSideMinor || 900) / 100;

    const card = document.createElement("div");
    card.className = "matrix-card" + (isActive ? "" : " disabled");
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:12px;">
        <div>
          <div style="font-size:14px;font-weight:800;color:var(--brand-navy);">${s.name}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${s.desc}</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <span style="font-size:10px;font-weight:800;color:${isActive ? 'var(--brand-orange)' : 'var(--text-dim)'};letter-spacing:0.5px;">
            ${isActive ? '● ACTIVE AT COUNTER' : '○ DISABLED'}
          </span>
          <input type="checkbox" id="chk-${s.key}-active" ${isActive ? 'checked' : ''} onchange="toggleDesktopSize('${s.key}', this.checked)" style="width:16px;height:16px;accent-color:var(--brand-orange);cursor:pointer;" />
        </label>
      </div>

      <div class="matrix-prices-grid">
        <div class="price-input-box">
          <span class="price-field-label">B&amp;W 1-SIDED (₹/SIDE)</span>
          <div class="price-field-input-wrap">
            <span>₹</span>
            <input type="number" class="price-num-input" id="inp-${s.key}-bw-single" step="0.25" min="0.5" value="${bw1}" oninput="updateDesktopPriceField('${s.key}', 'BLACK_AND_WHITE', false, this.value)" />
          </div>
        </div>

        <div class="price-input-box">
          <span class="price-field-label">B&amp;W DUPLEX (₹/SIDE)</span>
          <div class="price-field-input-wrap">
            <span>₹</span>
            <input type="number" class="price-num-input" id="inp-${s.key}-bw-duplex" step="0.25" min="0.5" value="${bw2}" oninput="updateDesktopPriceField('${s.key}', 'BLACK_AND_WHITE', true, this.value)" />
          </div>
        </div>

        <div class="price-input-box color-box">
          <span class="price-field-label" style="color:var(--purple-text);">COLOR 1-SIDED (₹/SIDE)</span>
          <div class="price-field-input-wrap">
            <span style="color:var(--purple-text);">₹</span>
            <input type="number" class="price-num-input" style="color:var(--purple-text);" id="inp-${s.key}-col-single" step="0.5" min="1" value="${col1}" oninput="updateDesktopPriceField('${s.key}', 'COLOR', false, this.value)" />
          </div>
        </div>

        <div class="price-input-box color-box">
          <span class="price-field-label" style="color:var(--purple-text);">COLOR DUPLEX (₹/SIDE)</span>
          <div class="price-field-input-wrap">
            <span style="color:var(--purple-text);">₹</span>
            <input type="number" class="price-num-input" style="color:var(--purple-text);" id="inp-${s.key}-col-duplex" step="0.5" min="1" value="${col2}" oninput="updateDesktopPriceField('${s.key}', 'COLOR', true, this.value)" />
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleDesktopSize(paperSize, active) {
  desktopPricingData = desktopPricingData.map(p => {
    if (p.paperSize === paperSize) return { ...p, isActive: active };
    return p;
  });
  renderDesktopPricingMatrix();
}

function updateDesktopPriceField(paperSize, colorMode, isDuplex, value) {
  const minor = Math.max(10, Math.round((parseFloat(value) || 1) * 100));
  let found = false;
  desktopPricingData = desktopPricingData.map(p => {
    if (p.paperSize === paperSize && p.colorMode === colorMode && p.isDuplex === isDuplex) {
      found = true;
      return { ...p, pricePerSideMinor: minor };
    }
    return p;
  });
  if (!found) {
    desktopPricingData.push({
      paperSize,
      colorMode,
      isDuplex,
      pricePerSideMinor: minor,
      isActive: true
    });
  }
}

function applyDesktopPreset(bw1, bw2, c1, c2, minOrder) {
  desktopMinOrder = minOrder;
  desktopPricingData = desktopPricingData.map(p => {
    let price = p.pricePerSideMinor;
    if (p.paperSize === "A4" || p.paperSize === "LETTER") {
      if (p.colorMode === "BLACK_AND_WHITE") price = (p.isDuplex ? bw2 : bw1) * 100;
      else price = (p.isDuplex ? c2 : c1) * 100;
    } else if (p.paperSize === "A3") {
      if (p.colorMode === "BLACK_AND_WHITE") price = (p.isDuplex ? bw2 * 2.5 : bw1 * 2.5) * 100;
      else price = (p.isDuplex ? c2 * 2 : c1 * 2) * 100;
    } else if (p.paperSize === "LEGAL") {
      if (p.colorMode === "BLACK_AND_WHITE") price = (p.isDuplex ? bw2 + 0.5 : bw1 + 0.5) * 100;
      else price = (p.isDuplex ? c2 + 2 : c1 + 2) * 100;
    }
    return { ...p, pricePerSideMinor: Math.round(price) };
  });
  showToast("Applied preset rates! Click 'Save Rates & Sizes' to publish.");
  renderDesktopPricingMatrix();
}

async function savePricingMatrix() {
  if (!api) return;
  const minInput = document.getElementById("inp-desktop-min-order");
  const minOrderMinor = Math.round((parseFloat(minInput?.value) || 5) * 100);

  const sizes = ["A4", "A3", "LEGAL", "LETTER"];
  sizes.forEach(size => {
    const chk = document.getElementById(`chk-${size}-active`);
    const isActive = chk ? chk.checked : true;

    const bw1El = document.getElementById(`inp-${size}-bw-single`);
    const bw2El = document.getElementById(`inp-${size}-bw-duplex`);
    const c1El = document.getElementById(`inp-${size}-col-single`);
    const c2El = document.getElementById(`inp-${size}-col-duplex`);

    if (bw1El) updateDesktopPriceField(size, "BLACK_AND_WHITE", false, bw1El.value);
    if (bw2El) updateDesktopPriceField(size, "BLACK_AND_WHITE", true, bw2El.value);
    if (c1El) updateDesktopPriceField(size, "COLOR", false, c1El.value);
    if (c2El) updateDesktopPriceField(size, "COLOR", true, c2El.value);

    desktopPricingData = desktopPricingData.map(p => {
      if (p.paperSize === size) return { ...p, isActive };
      return p;
    });
  });

  showToast("Publishing custom rates to cloud...");
  try {
    const res = await api.updatePricing({
      pricing: desktopPricingData,
      minimumOrderMinor: minOrderMinor
    });
    if (res && res.success !== false) {
      showToast("✓ Rates & Paper Sizes published successfully!");
    } else {
      showToast("Update error: " + (res?.error || "Failed"));
    }
  } catch (err) {
    console.error("savePricingMatrix err:", err);
    showToast("Error updating pricing");
  }
}
