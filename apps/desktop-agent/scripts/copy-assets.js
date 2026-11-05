const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'renderer');
const dest = path.join(__dirname, '..', 'dist', 'renderer');

try {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log('✓ Renderer assets copied to dist/renderer');
} catch (err) {
  console.error('Failed to copy renderer assets:', err);
  process.exit(1);
}
