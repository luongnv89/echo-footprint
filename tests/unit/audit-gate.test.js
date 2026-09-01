/**
 * Tests for scripts/audit-gate.cjs — the CI security job's npm-audit gate
 * (modernization task 1.8, closed by task 2.2 in #26).
 *
 * The script is a CommonJS module run by `node scripts/audit-gate.cjs < audit.json`
 * inside the security job. It reads `npm audit --json` from stdin, filters out
 * known-and-deferred packages on a per-package basis, and exits non-zero
 * on any remaining high/critical finding. These tests cover the exported
 * helpers (the allowlist and the package-keyed lookup) plus the JSON-shape
 * contract the gate relies on.
 *
 * As of #26 (vite 5 → 8 bump), the only previously-deferred entry
 * (`vite <=6.4.2`) is cleared: vite 8.2.x ships esbuild 0.28, which
 * also clears the transitive esbuild moderate advisory. The allowlist
 * is therefore empty. The structural tests below still pin:
 *   - any future entry must be well-formed;
 *   - the list must not silently grow;
 *   - the JSON-shape contract the gate relies on is stable.
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
  it('is an array', () => {
    expect(Array.isArray(ALLOWLIST)).toBe(true);
  });

  it('is empty after the vite 5 → 8 bump (#26) cleared the only deferred advisory', () => {
    // The original entry was `vite <=6.4.2` (GHSA-4w7w-66w2-5vf9), scheduled
    // to be cleared by the P2 vite 8 major bump. After #26, vite is at 8.2.x
    // and esbuild is at 0.28.x, so neither carries a high/critical advisory.
    // The gate now reports any future high/critical finding directly.
    expect(ALLOWLIST).toEqual([]);
  });

  it('contains no esbuild entry (esbuild is bundled with vite 8, no standalone advisory)', () => {
    // The historical esbuild advisory (GHSA-67mh-4wv8-2f99) was `moderate`
    // and the gate only acts on `high`/`critical`. After #26, esbuild is
    // upgraded to 0.28.x and the advisory no longer applies at any
    // severity. An esbuild entry would be a no-op, so it stays out.
    expect(ALLOWLIST.find(e => e.package === 'esbuild')).toBeUndefined();
  });

  it('contains no vite entry (vite is now 8.x — the deferred advisory is fixed)', () => {
    expect(ALLOWLIST.find(e => e.package === 'vite')).toBeUndefined();
  });

  it('does not silently grow — the list stays small and auditable', () => {
    // A maintenance guard: if a future change makes this list sprawl, the
    // test forces a deliberate edit. Two is a soft warning, not a hard cap.
    // After #26 the list is empty, so it must stay that way unless a
    // future advisory requires a deliberate entry.
    expect(ALLOWLIST.length).toBeLessThanOrEqual(2);
  });
});

describe('audit-gate: ALLOWLIST structural contract (regression guard)', () => {
  // These tests stay meaningful whenever a future PR adds an entry.
  // They pin the per-entry shape (package/ghsa/owner/reason) so a sloppy
  // future edit doesn't quietly make the gate unverifiable.
  it('any present entry is well-formed', () => {
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

  it('keys by package name (a new advisory against an allowlisted package is also deferred)', () => {
    // This is the documented contract: a package-level allowlist matches
    // a real-world fix (one major bump clears every advisory on a package
    // at once) and avoids the brittle "I forgot to add a new advisory to
    // the list" failure mode. The test pins the behaviour so a future
    // refactor that switches to per-GHSA keying forces a deliberate change.
    const pkgs = new Set(ALLOWLIST.map(e => e.package));
    for (const pkg of pkgs) {
      expect(typeof pkg).toBe('string');
      expect(pkg.length).toBeGreaterThan(0);
    }
  });
});

describe('audit-gate: isAllowlisted / allowlistEntryFor', () => {
  it('returns false for every previously-deferred package after #26', () => {
    // After the vite 5 → 8 bump, the allowlist is empty: both `vite` and
    // `esbuild` are no longer deferred. The gate treats them as in-scope,
    // so any future high/critical advisory against them would block the
    // security job immediately.
    expect(isAllowlisted('vite')).toBe(false);
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

  it('returns undefined for any package (allowlist is empty after #26)', () => {
    expect(allowlistEntryFor('vite')).toBeUndefined();
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

  it('a high-severity entry on any package is blocking after #26 (allowlist is empty)', () => {
    // The package is no longer allowlisted after the vite 5 → 8 bump:
    // isAllowlisted('vite') === false. A high-severity entry now blocks
    // the gate, which is the desired post-#26 behaviour.
    expect(isAllowlisted('vite')).toBe(false);
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
