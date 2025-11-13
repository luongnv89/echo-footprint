import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Get git commit hash and build timestamp
let gitCommitHash = 'unknown';
let gitBranch = 'unknown';
let buildTimestamp = new Date().toISOString();

try {
  gitCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch (error) {
  console.warn('⚠ Could not get git information:', error.message);
}

// Read package.json for base version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const baseVersion = packageJson.version;
const versionWithCommit = `${baseVersion}+${gitCommitHash}`;

// Copy and update manifest.json with version info
const manifestSrc = path.join(rootDir, 'manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestSrc, 'utf-8'));

// Chrome extension version must be numeric (up to 4 dot-separated integers)
// Keep version numeric, add version_name for display
manifest.version = baseVersion;
manifest.version_name = versionWithCommit;

fs.writeFileSync(manifestDest, JSON.stringify(manifest, null, 2));
console.log(`✓ Copied manifest.json to dist/ (version: ${versionWithCommit})`);

// Create build-info.json with detailed build metadata
const buildInfo = {
  version: baseVersion,
  versionWithCommit: versionWithCommit,
  gitCommitHash: gitCommitHash,
  gitBranch: gitBranch,
  buildTimestamp: buildTimestamp,
  nodeVersion: process.version,
  platform: process.platform,
};

fs.writeFileSync(
  path.join(distDir, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log(`✓ Created build-info.json (${gitCommitHash} on ${gitBranch})`);

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
