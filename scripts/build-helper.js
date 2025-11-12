import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Copy manifest.json to dist
const manifestSrc = path.join(rootDir, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✓ Copied manifest.json to dist/');

// Create PNG icons using the dedicated create-icons.js script
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Import and run the create-icons script
try {
  const createIconsPath = path.join(__dirname, 'create-icons.js');
  await import(createIconsPath);
  console.log('✓ Created extension icons (16, 48, 128)');
} catch (error) {
  console.warn('⚠ Could not create icons with canvas:', error.message);
  console.log('⚠ Icons may not display properly. Install canvas module: npm install canvas');
}

console.log('✓ Build helper complete');
