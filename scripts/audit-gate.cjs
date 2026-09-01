#!/usr/bin/env node
/**
 * npm-audit gate for the CI security job.
 *
 * Reads `npm audit --json` output from stdin, filters out known-and-deferred
 * packages listed in the ALLOWLIST below, and exits non-zero if any
 * high/critical vulnerability remains. This makes the security job a real
 * gate (no `continue-on-error: true`) while tolerating a small, documented
 * set of deferred findings.
 *
 * Allowlist entries are npm package names whose every high/critical advisory
 * is known and accepted as deferred risk. The `ghsa` field is a
 * representative advisory (a maintenance hint, not a key — the script keys
 * by package name so a *new* advisory against an allowlisted package is
 * also deferred, which is the documented contract). Each entry must carry
 * an `owner` and `reason` so future maintainers can prune without
 * archeology.
 *
 * Usage (CI):
 *   npm audit --json --audit-level=low | node scripts/audit-gate.cjs
 *
 * Exit codes:
 *   0  No non-allowlisted high/critical finding
 *   1  At least one non-allowlisted high/critical finding
 *   2  Could not read or parse npm audit JSON (broken input — fail closed)
 */

'use strict';

function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buf += chunk;
    });
    process.stdin.on('end', () => resolve(buf));
    process.stdin.on('error', (err) => reject(err));
  });
}

// Single source of truth for the deferred packages. Each entry is a
// package name whose every high/critical advisory is accepted as
// deferred risk. Reasons point at the modernization task that will
// clear the entry. Keep this list narrow — every entry is a hole in
// the gate, and stale entries become permanent suppressions.
//
// IMPORTANT: the script keys by `package` (npm name), not by GHSA.
// A new advisory against an allowlisted package is also deferred —
// that is the documented contract. The `ghsa` field is a maintenance
// hint, not a precise key. This is intentional: a package-level
// allowlist matches a real-world fix (e.g. one major bump clears all
// of a package's advisories at once) and avoids the brittle
// "I forgot to add a new advisory to the list" failure mode.
const ALLOWLIST = [
  {
    package: 'vite',
    ghsa: 'GHSA-4w7w-66w2-5vf9',
    owner: 'see task #2.2 (P2) — vite 8 major bump',
    reason: 'vite <=6.4.2 has multiple Windows path-traversal and dev-server advisories; fixed in vite 7+, scheduled for the P2 vite major bump (#2.2).',
  },
  // Note: esbuild is intentionally NOT in this allowlist. Its current
  // advisory (GHSA-67mh-4wv8-2f99) is `moderate`, and the gate only
  // acts on `high`/`critical` — so an esbuild entry would be a no-op
  // that bloats the list and risks future drift if a new high/critical
  // appears under the same package name. If a future advisory escalates
  // esbuild to high/critical, add a one-line entry here with an owner
  // and reason; until then, the moderate advisory is visible in the
  // job log and stays out of this gate per issue #22.
];

const ALLOWLIST_BY_PACKAGE = new Map(
  ALLOWLIST.map((entry) => [entry.package, entry])
);

function isAllowlisted(packageName) {
  return ALLOWLIST_BY_PACKAGE.has(packageName);
}

function allowlistEntryFor(packageName) {
  return ALLOWLIST_BY_PACKAGE.get(packageName);
}

async function main() {
  let raw;
  try {
    raw = await readStdin();
  } catch (err) {
    console.error('✗ audit-gate: failed to read stdin:', err.message);
    process.exit(2);
  }

  let audit;
  try {
    audit = JSON.parse(raw);
  } catch (err) {
    console.error('✗ audit-gate: npm audit JSON could not be parsed:', err.message);
    process.exit(2);
  }

  const vulnerabilities = (audit && audit.vulnerabilities) || {};
  /** @type {{package: string, severity: string, entry: any}[]} */
  const blocking = [];
  /** @type {{package: string, severity: string, entry: any}[]} */
  const deferred = [];

  for (const [pkgName, info] of Object.entries(vulnerabilities)) {
    if (!info || typeof info !== 'object') continue;
    const severity = info.severity || 'unknown';
    if (severity !== 'high' && severity !== 'critical') continue;

    if (isAllowlisted(pkgName)) {
      deferred.push({ package: pkgName, severity, entry: allowlistEntryFor(pkgName) });
      continue;
    }

    blocking.push({ package: pkgName, severity, info });
  }

  if (deferred.length > 0) {
    console.log(`○ audit-gate: ${deferred.length} deferred high/critical package(s) on the allowlist:`);
    for (const d of deferred) {
      console.log(`  - ${d.package}@${d.severity} — ${d.entry.reason}`);
      console.log(`    owner: ${d.entry.owner} (sample advisory: ${d.entry.ghsa})`);
    }
  }

  if (blocking.length > 0) {
    console.error('');
    console.error(`✗ audit-gate: ${blocking.length} non-allowlisted high/critical package(s) — PR blocked:`);
    for (const b of blocking) {
      console.error(`  - ${b.package}@${b.severity}`);
    }
    console.error('');
    console.error('  To clear: bump or replace the affected package, or add a narrow allowlist entry to');
    console.error('  scripts/audit-gate.cjs with an owner and reason (see ALLOWLIST).');
    process.exit(1);
  }

  console.log('✓ audit-gate: no non-allowlisted high/critical vulnerabilities.');
  process.exit(0);
}

// Allow `node scripts/audit-gate.cjs < path/to/audit.json` for local testing.
if (require.main === module) {
  main().catch((err) => {
    console.error('✗ audit-gate: unexpected error:', err && err.stack ? err.stack : err);
    process.exit(2);
  });
}

module.exports = { ALLOWLIST, isAllowlisted, allowlistEntryFor };
