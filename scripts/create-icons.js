/**
 * Create PNG icons for the Echo Footprint extension
 * Matches the logo design with footprint + network visualization
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

// Brand colors
const primaryColor = '#00d4aa';
const bgColor = '#0D1117';

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = bgColor;
  const cornerRadius = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();
  ctx.fill();

  const centerX = size / 2;
  const centerY = size / 2;

  // Outer ring with glow effect
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.38, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.38, 0, 2 * Math.PI);
  ctx.stroke();

  // Network connection lines
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = size * 0.015;

  const nodeDistance = size * 0.2;
  const nodePositions = [
    { x: centerX + nodeDistance, y: centerY - nodeDistance },
    { x: centerX - nodeDistance, y: centerY - nodeDistance },
    { x: centerX + nodeDistance, y: centerY + nodeDistance },
    { x: centerX - nodeDistance, y: centerY + nodeDistance },
  ];

  nodePositions.forEach(pos => {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  ctx.globalAlpha = 1;

  // Network nodes
  const nodeRadius = size * 0.04;
  ctx.fillStyle = primaryColor;
  nodePositions.forEach(pos => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Footprint (simplified for small icon)
  const footScale = size / 128; // Scale based on size
  const footX = centerX - size * 0.05;
  const footY = centerY - size * 0.05;

  // Main foot shape
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.ellipse(footX, footY + size * 0.08, size * 0.08, size * 0.12, 0, 0, 2 * Math.PI);
  ctx.fill();

  // Toes
  if (size >= 48) {
    const toeRadius = size * 0.03;
    const toeY = footY;
    [
      { x: footX - size * 0.06, r: toeRadius * 0.8 },
      { x: footX - size * 0.02, r: toeRadius },
      { x: footX + size * 0.02, r: toeRadius * 0.8 },
      { x: footX + size * 0.05, r: toeRadius * 0.7 },
    ].forEach(toe => {
      ctx.beginPath();
      ctx.arc(toe.x, toeY, toe.r, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  // Center pulse
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.05, 0, 2 * Math.PI);
  ctx.fill();

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.08, 0, 2 * Math.PI);
  ctx.stroke();

  // Radar sweep line
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + size * 0.32, centerY - size * 0.32);
  ctx.stroke();

  ctx.globalAlpha = 1;

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
