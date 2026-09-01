/**
 * Self-check for package.json build/CI scripts (P0 batch #10-#14).
 * Guards against the local-vs-CI config drift these issues fixed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'),
    'utf8'
  )
);

describe('package.json P0 config', () => {
  it('declares engines.node >= 24 (issue #25 acceptance criteria)', () => {
    expect(pkg.engines.node).toMatch(/^>=24/);
  });

  it('format script never writes; format:check and format:write exist', () => {
    expect(pkg.scripts.format).not.toContain('--write');
    expect(pkg.scripts['format:check']).toContain('--check');
    expect(pkg.scripts['format:write']).toContain('--write');
  });

  it('zip output matches the CI upload path (dist/echofootprint.zip)', () => {
    expect(pkg.scripts.zip).toContain('dist/echofootprint.zip');
  });

  it('has a vitest coverage provider for test:coverage', () => {
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBeTruthy();
  });
});
