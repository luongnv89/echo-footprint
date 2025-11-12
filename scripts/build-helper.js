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

// Create placeholder PNG icons
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create SVG-based PNG icons
// Brand colors: primary #00d4aa, bg #1a1a1a
const canvasModule = await import('canvas').catch(() => null);

if (canvasModule && canvasModule.createCanvas) {
  const { createCanvas } = canvasModule;
  // Use canvas if available
  const createIcon = (size) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    // Circle
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;

    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#00d4aa';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.08, 0, 2 * Math.PI);
    ctx.fill();

    // Small dots around
    const smallRadius = size * 0.05;
    const positions = [
      { x: centerX - radius * 0.7, y: centerY - radius * 0.7 },
      { x: centerX + radius * 0.7, y: centerY - radius * 0.7 },
      { x: centerX - radius * 0.7, y: centerY + radius * 0.7 },
      { x: centerX + radius * 0.7, y: centerY + radius * 0.7 },
    ];

    ctx.fillStyle = '#666';
    positions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, smallRadius, 0, 2 * Math.PI);
      ctx.fill();
    });

    return canvas;
  };

  const iconSizes = [16, 48, 128];
  iconSizes.forEach(size => {
    const canvas = createIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const iconPath = path.join(assetsDir, `icon-${size}.png`);
    fs.writeFileSync(iconPath, buffer);
  });

  console.log('✓ Created brand icons (16, 48, 128) with canvas');
} else {
  // Fallback: create basic colored PNG from base64
  // This is a 16x16 teal square icon
  const basicIcon16 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAARklEQVQ4T2NkYGD4/x8I/v//z4jMZ8SiB0UDLR1ACVxGDzFJAyMxBjBiCwNqGQAzgFJvMxLjAkYcUTAyHGBkZPz/HwBM4Q4RMp3s3AAAAABJRU5ErkJggg==',
    'base64'
  );

  const iconSizes = [16, 48, 128];
  iconSizes.forEach(size => {
    const iconPath = path.join(assetsDir, `icon-${size}.png`);
    fs.writeFileSync(iconPath, basicIcon16); // Use same icon for all sizes as fallback
  });

  console.log('✓ Created fallback icons (16, 48, 128)');
}

console.log('✓ Build helper complete');
