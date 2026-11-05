const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'renderer');
const dest = path.join(__dirname, '..', 'dist', 'renderer');

const assetsSrc = path.join(__dirname, '..', 'assets');
const assetsDest = path.join(__dirname, '..', 'dist', 'assets');

try {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log('✓ Renderer assets copied to dist/renderer');

  if (fs.existsSync(assetsSrc)) {
    fs.mkdirSync(assetsDest, { recursive: true });
    fs.cpSync(assetsSrc, assetsDest, { recursive: true });
    console.log('✓ Assets copied to dist/assets');
  }
} catch (err) {
  console.error('Failed to copy renderer assets:', err);
  process.exit(1);
}
