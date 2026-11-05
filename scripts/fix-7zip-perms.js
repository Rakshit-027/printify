/**
 * Ensures 7zip-bin binaries have executable permissions.
 * Runs automatically as part of postinstall to avoid ENOENT chmod errors
 * when cross-compiling Windows builds with electron-builder on Linux/macOS.
 */
const fs = require('fs');
const path = require('path');

const sevenZipBinDir = path.join(__dirname, '..', 'node_modules', '7zip-bin');

if (!fs.existsSync(sevenZipBinDir)) {
  console.log('ℹ 7zip-bin not found, skipping permission fix.');
  process.exit(0);
}

const platforms = ['linux', 'mac'];
let fixed = 0;

for (const platform of platforms) {
  const platformDir = path.join(sevenZipBinDir, platform);
  if (!fs.existsSync(platformDir)) continue;

  const archs = fs.readdirSync(platformDir);
  for (const arch of archs) {
    const binary = path.join(platformDir, arch, '7za');
    if (fs.existsSync(binary)) {
      try {
        fs.chmodSync(binary, 0o755);
        fixed++;
      } catch (e) {
        // Ignore permission errors (e.g. read-only filesystems)
      }
    }
  }
}

if (fixed > 0) {
  console.log(`✓ Fixed permissions on ${fixed} 7zip-bin binary(ies)`);
}
