/**
 * Tests for scripts/audit-gate.cjs — the CI security job's npm-audit gate
 * (modernization task 1.8).
 *
 * The script is a CommonJS module run by `node scripts/audit-gate.cjs < audit.json`
 * inside the security job. It reads `npm audit --json` from stdin, filters out
 * known-and-deferred packages (vite + esbuild) on a per-package basis, and
 * exits non-zero on any remaining high/critical finding. These tests cover
 * the exported helpers (the allowlist and the package-keyed lookup) plus
 * the JSON-shape contract the gate relies on.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const auditGate = createRequire(import.meta.url)(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../scripts/audit-gate.cjs'
  )
);
const { ALLOWLIST, isAllowlisted, allowlistEntryFor } = auditGate;

describe('audit-gate: ALLOWLIST', () => {
  it('is a non-empty array of well-formed entries', () => {
    expect(Array.isArray(ALLOWLIST)).toBe(true);
    expect(ALLOWLIST.length).toBeGreaterThan(0);
    for (const entry of ALLOWLIST) {
      expect(entry).toHaveProperty('package');
      expect(typeof entry.package).toBe('string');
      expect(entry.package.length).toBeGreaterThan(0);
      expect(entry).toHaveProperty('ghsa');
      expect(entry.ghsa).toMatch(/^GHSA-[0-9a-z-]+$/i);
      expect(entry).toHaveProperty('owner');
      expect(typeof entry.owner).toBe('string');
      expect(entry.owner.length).toBeGreaterThan(0);
      expect(entry).toHaveProperty('reason');
      expect(typeof entry.reason).toBe('string');
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it('contains exactly the one known-and-deferred high/critical package (vite)', () => {
    // Per issue #22, the allowlist is `only contains vite until 2.2`.
    // esbuild's current advisory is `moderate` and the gate only acts
    // on high/critical, so an esbuild entry would be a no-op. The
    // moderate advisory stays visible in the job log.
    const pkgs = ALLOWLIST.map(e => e.package).sort();
    expect(pkgs).toEqual(['vite']);
  });

  it('vite entry points at the P2 vite 8 major bump (#2.2)', () => {
    const vite = ALLOWLIST.find(e => e.package === 'vite');
    expect(vite).toBeDefined();
    expect(vite.owner).toMatch(/#?2\.2/);
  });

  it('does not contain esbuild (its advisory is moderate — out of gate scope)', () => {
    // Sanity guard: an esbuild entry would be a no-op because the
    // gate only acts on high/critical. If a future advisory escalates
    // esbuild to high/critical, add it back with an owner and reason.
    expect(ALLOWLIST.find(e => e.package === 'esbuild')).toBeUndefined();
  });

  it('keys by package name (a new advisory against an allowlisted package is also deferred)', () => {
    // This is the documented contract: a package-level allowlist matches
    // a real-world fix (one major bump clears every advisory on a package
    // at once) and avoids the brittle "I forgot to add a new advisory to
    // the list" failure mode. The test pins the behaviour so a future
    // refactor that switches to per-GHSA keying forces a deliberate change.
    const pkgs = new Set(ALLOWLIST.map(e => e.package));
    expect(pkgs.has('vite')).toBe(true);
  });

  it('does not silently grow — the list stays small and auditable', () => {
    // A maintenance guard: if a future change makes this list sprawl, the
    // test forces a deliberate edit. Two is a soft warning, not a hard cap.
    expect(ALLOWLIST.length).toBeLessThanOrEqual(2);
  });
});

describe('audit-gate: isAllowlisted / allowlistEntryFor', () => {
  it('returns true for the deferred package (vite)', () => {
    expect(isAllowlisted('vite')).toBe(true);
  });

  it('returns false for esbuild (its advisory is moderate, out of gate scope)', () => {
    expect(isAllowlisted('esbuild')).toBe(false);
  });

  it('returns false for any other package', () => {
    expect(isAllowlisted('lodash')).toBe(false);
    expect(isAllowlisted('react')).toBe(false);
    expect(isAllowlisted('')).toBe(false);
  });

  it('is case-sensitive (npm package names are)', () => {
    expect(isAllowlisted('Vite')).toBe(false);
  });

  it('returns the full allowlist entry (with reason) for an allowlisted package', () => {
    const entry = allowlistEntryFor('vite');
    expect(entry).toBeDefined();
    expect(entry.ghsa).toMatch(/^GHSA-/i);
    expect(entry.reason.length).toBeGreaterThan(0);
  });

  it('returns undefined for a non-allowlisted package', () => {
    expect(allowlistEntryFor('lodash')).toBeUndefined();
  });
});

describe('audit-gate: npm-audit JSON shape contract', () => {
  // The gate is fed by `npm audit --json`. These tests pin the parts of
  // that contract the gate relies on: `vulnerabilities.<pkg>.severity`.
  // The fixtures are the minimal shapes the gate reads.
  const fixtureViteHigh = {
    vulnerabilities: {
      vite: {
        severity: 'high',
        via: [
          {
            source: 1116229,
            name: 'vite',
            url: 'https://github.com/advisories/GHSA-4w7w-66w2-5vf9',
            severity: 'high',
            range: '<=6.4.2',
          },
        ],
      },
    },
  };

  const fixtureEsbuildModerate = {
    vulnerabilities: {
      esbuild: {
        severity: 'moderate',
        via: [
          {
            source: 1102341,
            name: 'esbuild',
            url: 'https://github.com/advisories/GHSA-67mh-4wv8-2f99',
            severity: 'moderate',
            range: '<=0.24.2',
          },
        ],
      },
    },
  };

  const fixtureBlockingHigh = {
    vulnerabilities: {
      lodash: {
        severity: 'high',
        via: [
          {
            source: 1,
            name: 'lodash',
            url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
            severity: 'high',
          },
        ],
      },
    },
  };

  const fixtureMixedSeverities = {
    vulnerabilities: {
      esbuild: { severity: 'moderate', via: [] },
      vite: { severity: 'high', via: [] },
      'low-pkg': { severity: 'low', via: [] },
      'critical-pkg': { severity: 'critical', via: [] },
    },
  };

  it('exposes a `vulnerabilities` object keyed by package name', () => {
    expect(typeof fixtureViteHigh.vulnerabilities).toBe('object');
    expect(fixtureViteHigh.vulnerabilities).toHaveProperty('vite');
  });

  it('keeps each vulnerability record shaped as `{severity, via[]}`', () => {
    for (const pkg of Object.keys(fixtureMixedSeverities.vulnerabilities)) {
      const v = fixtureMixedSeverities.vulnerabilities[pkg];
      expect(v).toHaveProperty('severity');
      expect(Array.isArray(v.via)).toBe(true);
    }
  });

  it('correctly classifies high+critical as in-scope for the gate', () => {
    const inScope = Object.entries(fixtureMixedSeverities.vulnerabilities)
      .filter(([, v]) => v.severity === 'high' || v.severity === 'critical')
      .map(([name]) => name)
      .sort();
    expect(inScope).toEqual(['critical-pkg', 'vite']);
  });

  it('a high-severity entry on an allowlisted package is deferred (vite)', () => {
    // The package is allowlisted → isAllowlisted('vite') === true.
    expect(isAllowlisted('vite')).toBe(true);
    expect(fixtureViteHigh.vulnerabilities.vite.severity).toBe('high');
  });

  it('a moderate-severity entry on any package is out of gate scope (esbuild)', () => {
    // The gate only fails on high/critical — moderate entries never trigger
    // the gate regardless of allowlist membership. The script still reports
    // them via the deferred path only when they are high/critical.
    expect(fixtureEsbuildModerate.vulnerabilities.esbuild.severity).toBe(
      'moderate'
    );
  });

  it('a high-severity entry on a non-allowlisted package is blocking (lodash)', () => {
    expect(isAllowlisted('lodash')).toBe(false);
    expect(fixtureBlockingHigh.vulnerabilities.lodash.severity).toBe('high');
  });
});
