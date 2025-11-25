#!/usr/bin/env node
/**
 * Resize an input image (or all images in a directory) to 1280x800.
 * Usage:
 *   node scripts/resize-image.js path/to/image.png
 *   node scripts/resize-image.js path/to/dir
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 800;
const INPUT = process.argv[2];

if (!INPUT) {
  console.error('Usage: node scripts/resize-image.js <file|directory>');
  process.exit(1);
}

async function resizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);
  const outPath = path.join(dir, `${base}-1280x800${ext}`);

  console.log(`Resizing ${filePath} -> ${outPath}`);
  await sharp(filePath).resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover' }).toFile(outPath);
}

async function run() {
  const stat = fs.statSync(INPUT);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(INPUT).map(f => path.join(INPUT, f));
    for (const file of files) {
      await resizeFile(file);
    }
  } else {
    await resizeFile(INPUT);
  }
}

run().catch(err => {
  console.error('Resize failed:', err);
  process.exit(1);
});
