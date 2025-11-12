/**
 * Build script for content-script and service-worker
 * These need to be self-contained with no external imports
 * Uses esbuild for proper bundling
 */

import * as esbuild from 'esbuild';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { mkdirSync, existsSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, '..');
const distDir = resolve(rootDir, 'dist');

async function buildExtensionScripts() {
  try {
    console.log('Building extension scripts...');

    // Create dist directory if it doesn't exist, or clean it
    if (existsSync(distDir)) {
      console.log('Cleaning dist directory...');
      // Remove old extension script files
      const filesToRemove = ['content-script.js', 'service-worker.js'];
      filesToRemove.forEach(file => {
        const filePath = resolve(distDir, file);
        if (existsSync(filePath)) {
          rmSync(filePath);
        }
      });
      // Clean assets directory to ensure fresh build
      const assetsDir = resolve(distDir, 'assets');
      if (existsSync(assetsDir)) {
        rmSync(assetsDir, { recursive: true, force: true });
      }
    } else {
      mkdirSync(distDir, { recursive: true });
    }

    // Build content-script (must be self-contained)
    await esbuild.build({
      entryPoints: [resolve(rootDir, 'src/content/content-script.js')],
      bundle: true,
      outfile: resolve(rootDir, 'dist/content-script.js'),
      format: 'iife', // Self-contained, no imports
      target: 'es2022',
      minify: true,
      sourcemap: false,
    });
    console.log('✓ content-script.js bundled');

    // Build service-worker (must be self-contained)
    await esbuild.build({
      entryPoints: [resolve(rootDir, 'src/background/service-worker.js')],
      bundle: true,
      outfile: resolve(rootDir, 'dist/service-worker.js'),
      format: 'iife', // Self-contained, no imports
      target: 'es2022',
      minify: true,
      sourcemap: false,
    });
    console.log('✓ service-worker.js bundled');

    console.log('✓ Extension scripts built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildExtensionScripts();
