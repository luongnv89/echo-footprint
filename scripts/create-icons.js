/**
 * Create placeholder PNG icons for the extension
 * This is a temporary solution - proper icons should be designed later
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '..', 'dist', 'assets');

// Create assets directory if it doesn't exist
mkdirSync(distDir, { recursive: true });

// Icon sizes needed for Chrome extension
const sizes = [16, 48, 128];

// Brand color
const primaryColor = '#00d4aa';
const bgColor = '#1a1a1a';

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Circle
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = size * 0.08;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = primaryColor;
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
}

// Generate icons
sizes.forEach(size => {
  const canvas = createIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = join(distDir, `icon-${size}.png`);
  writeFileSync(filename, buffer);
  console.log(`✓ Created ${filename}`);
});

console.log('✓ All icons created successfully');
