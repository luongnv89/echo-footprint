/**
 * Guards the doc/manifest alignment fixed in issue #43 (F-DOCS-001/002/003/
 * 005/006/007). These files drift silently because nothing builds them, so the
 * version, the license string and the stale "not implemented" wording are
 * asserted here instead of being rechecked by hand at release time.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const read = name => readFileSync(resolve(rootDir, name), 'utf8');

const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('manifest.json'));
const readme = read('README.md');
const claude = read('CLAUDE.md');
const privacyPolicy = read('privacy-policy.md');

describe('docs stay aligned with package.json', () => {
  it('README status version equals the package.json version', () => {
    const match = readme.match(/\*\*Current Version\*\*:\s*(\S+)/);
    expect(match, 'README has no "**Current Version**:" line').toBeTruthy();
    expect(match[1]).toBe(pkg.version);
  });

  it('manifest.json version equals the package.json version', () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it('README states the package.json license string verbatim', () => {
    const licenseSection = readme.split('## License')[1] || '';
    expect(licenseSection).toContain(pkg.license);
  });

  it('CLAUDE.md states the same license and never claims MIT', () => {
    expect(claude).toContain(pkg.license);
    expect(claude).not.toMatch(/MIT/);
  });
});

describe('docs describe the shipped extension', () => {
  it('CLAUDE.md does not claim the project is unimplemented', () => {
    expect(claude).not.toMatch(/no implementation yet/i);
    expect(claude).not.toMatch(/pre-development/i);
  });

  it('CLAUDE.md does not document removed cookie or hashing capture', () => {
    expect(claude).not.toMatch(/c_user/);
    expect(claude).not.toMatch(/Hashes Facebook IDs/i);
  });

  it('README and CLAUDE.md name npm, mentioning pnpm only to rule it out', () => {
    expect(readme).not.toMatch(/pnpm/);
    for (const line of claude.split('\n').filter(l => /pnpm/.test(l))) {
      expect(line).toMatch(/not pnpm/);
    }
  });

  it('privacy policy no longer denies the existence of a website', () => {
    expect(privacyPolicy).not.toMatch(/no accompanying website/i);
  });
});
