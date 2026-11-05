const fs = require('fs');
const path = require('path');

function createBmp(width, height, pixelFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // File header (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10); // offset to pixels

  // DIB header (BITMAPINFOHEADER - 40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-to-top
  buf.writeUInt16LE(1, 26);     // planes
  buf.writeUInt16LE(24, 28);    // 24 bpp
  buf.writeUInt32LE(0, 30);     // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Render pixels (y=0 at top)
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = Math.min(255, Math.max(0, Math.round(b)));
      buf[pxOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      buf[pxOffset + 2] = Math.min(255, Math.max(0, Math.round(r)));
    }
  }
  return buf;
}

// 1. Generate installerSidebar.bmp (164 × 314 px)
// Brand Navy: #101B3B (16, 27, 59), Brand Orange: #FF8917 (255, 137, 23)
const sidebarBmp = createBmp(164, 314, (x, y, w, h) => {
  const normY = y / h;
  const normX = x / w;

  // Background gradient: Deep navy to rich indigo
  let r = 14 + normY * 18;
  let g = 24 + normY * 26;
  let b = 52 + normY * 45;

  // Radial orange ambient glow at bottom-right
  const dx = x - (w - 20);
  const dy = y - (h - 40);
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 110) {
    const glow = (1 - dist / 110) * 0.45;
    r = r * (1 - glow) + 255 * glow;
    g = g * (1 - glow) + 137 * glow;
    b = b * (1 - glow) + 23 * glow;
  }

  // Top orange accent band (y=0 to 4)
  if (y < 4) {
    return [255, 137, 23];
  }

  // Decorative stylized print badge / icon at (cx=82, cy=110, size=32)
  const icx = 82;
  const icy = 100;
  const pdx = Math.abs(x - icx);
  const pdy = Math.abs(y - icy);

  // Outer rounded square for icon
  if (pdx <= 28 && pdy <= 28) {
    // White icon container
    if (pdx <= 26 && pdy <= 26) {
      // Inside printer emblem
      // Printer top paper sheet
      if (pdx <= 14 && y >= icy - 22 && y <= icy - 10) {
        return [255, 137, 23]; // Orange paper
      }
      // Printer main body
      if (pdx <= 20 && y >= icy - 10 && y <= icy + 8) {
        return [16, 27, 59]; // Navy body
      }
      // Printer output tray
      if (pdx <= 16 && y >= icy + 8 && y <= icy + 18) {
        return [255, 137, 23]; // Orange tray
      }
      return [255, 255, 255]; // White container
    }
    return [255, 137, 23]; // Orange border
  }

  // Geometric subtle dot pattern
  if (x % 14 === 0 && y % 14 === 0 && y > 150) {
    r += 12; g += 14; b += 20;
  }

  return [r, g, b];
});

// 2. Generate installerHeader.bmp (150 × 57 px)
// Clean header bitmap shown at top-right of setup pages
const headerBmp = createBmp(150, 57, (x, y, w, h) => {
  // Pure clean white background with subtle brand accent border
  let r = 255;
  let g = 255;
  let b = 255;

  // Bottom orange border line
  if (y >= 54) {
    return [255, 137, 23];
  }

  // Right-aligned brand emblem (cx=115, cy=28)
  const icx = 115;
  const icy = 26;
  const pdx = Math.abs(x - icx);
  const pdy = Math.abs(y - icy);

  if (pdx <= 18 && pdy <= 18) {
    // Printer top paper
    if (pdx <= 9 && y >= icy - 14 && y <= icy - 6) {
      return [255, 137, 23];
    }
    // Printer body
    if (pdx <= 14 && y >= icy - 6 && y <= icy + 5) {
      return [16, 27, 59];
    }
    // Printer output tray
    if (pdx <= 11 && y >= icy + 5 && y <= icy + 12) {
      return [255, 137, 23];
    }
  }

  // Subtle separator line
  if (x === 65 && y >= 10 && y <= 45) {
    return [226, 232, 240];
  }

  return [r, g, b];
});

const assetsDir = path.join(__dirname, '..', 'assets');
fs.writeFileSync(path.join(assetsDir, 'installerSidebar.bmp'), sidebarBmp);
fs.writeFileSync(path.join(assetsDir, 'installerHeader.bmp'), headerBmp);

console.log('✓ NSIS Branded Bitmaps generated successfully:');
console.log('  - assets/installerSidebar.bmp (164x314 px - Navy #101B3B & Orange #FF8917)');
console.log('  - assets/installerHeader.bmp (150x57 px)');
