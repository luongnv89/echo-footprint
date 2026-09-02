Closes #22

## Summary

Turn the security job's `npm audit` step from a no-op into a real CI gate. The `continue-on-error: true` line is removed, the step now pipes `npm audit --json` into a new CommonJS filter (`scripts/audit-gate.cjs`) that defers only the two known-and-deferred packages (`vite`, `esbuild`) and exits non-zero on any other high/critical finding. Each allowlist entry carries an owner and a reason so future maintainers can prune without archeology. The change closes `F-CI-004` and the modernization task 1.8 acceptance criteria.

## Approach

Drop `continue-on-error: true` and add a minimal inline allowlist (keyed by **package name**, with a representative `ghsa` as a maintenance hint) that documents the two known-and-deferred findings. The allowlist keys by package on purpose: a real-world fix (e.g. the planned vite 8 major bump) clears every advisory on a package at once, so a package-level key matches the way the debt is actually paid down.

## Decision Record

- **Root cause:** `continue-on-error: true` on the `Run npm audit` step made the security gate a no-op; no new high/critical dependency vulnerability could fail a PR.
- **Options considered:** Option 1 — drop `continue-on-error` only; Option 2 — high+ gate with package-level allowlist covering `vite` and `esbuild`.
- **Options rejected:** Option 1 alone — the current `vite` finding is `high` and the current `esbuild` finding is `moderate`; a strict gate with no allowlist would go red on every PR until task 2.2 lands, which is sequenced strictly after P1. A partial allowlist that only listed the originally-reported `GHSA-4w7w-66w2-5vf9` would have been silently permissive: npm groups multiple advisories under the same package key, and vite now carries three distinct advisories (the original path-traversal plus two Windows-side ones), so a per-GHSA key would hide the new findings and miss the spirit of the task.
- **Selected option:** Option 2 — drop `continue-on-error` AND add a minimal package-level allowlist covering only `vite` and `esbuild`, the two remaining known-and-deferred findings.
- **Residual risk:** A _new_ high/critical advisory against `vite` or `esbuild` will be silently deferred by the package-level allowlist. This is the documented contract and matches the real-world fix surface (one major bump clears all of a package's advisories). The risk is bounded by the two allowlist entries today and the `<= 3` soft cap enforced by `tests/unit/audit-gate.test.js`. Pruning depends on: the P2 vite 8 major bump (#2.2) for the `vite` entry; for `esbuild`, the dev-only accepted risk is permanent unless a future audit or a new advisory against a non-allowlisted transitive dep forces a re-look. The `owner` field on every entry names the trigger.
- **Effort profile:** light — fast path (pre-work Effort S); synthesis skipped, QA capped at 1 cycle.

Analyzed at: `main @ 963bbb7` (2026-09-01)

## Changes

| File                            | Change                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`      | Drop `continue-on-error: true` from the `Run npm audit` step; replace the step with a `Run npm audit gate` step that pipes `npm audit --json --audit-level=low` into `node scripts/audit-gate.cjs`.                                              |
| `scripts/audit-gate.cjs`        | New CommonJS filter. Reads `npm audit --json` from stdin, defers packages on the small documented allowlist, and exits non-zero on any remaining high/critical finding. CLI exit codes: 0 = clean, 1 = blocking, 2 = broken input (fail closed). |
| `tests/unit/audit-gate.test.js` | New test file. 17 unit tests covering the allowlist shape, the `isAllowlisted` / `allowlistEntryFor` lookups, and the `npm audit --json` JSON contract the gate reads.                                                                           |

## Test Results

- Unit tests: 232 passed (1 skipped)
- Integration tests: skipped
- E2e tests: skipped
- Build: passed (no app code changes)
- QA cycles: 1

The recorded rate before this change was 215 passed | 1 skipped (216) in 11 test files; the new `audit-gate` test file adds 17 passing tests, so the suite now reports 232 passed | 1 skipped (233) in 12 test files — strictly above the recorded rate, meeting acceptance criterion 2. The full suite ran clean on commit `4445b48` and a local end-to-end run of `npm audit --json --audit-level=low | node scripts/audit-gate.cjs` exits 0 against the current dependency tree.

## Acceptance Criteria Verification

| Criterion                                                | Status | Evidence                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Security job fails the PR if a new high/critical appears | pass   | `.github/workflows/ci.yml` security job no longer sets `continue-on-error: true` on the audit step; `scripts/audit-gate.cjs` exits 1 on any non-allowlisted high/critical finding (verified with a synthetic `lodash@high` payload piped into the script during development). |
| `npm run test:run` passes at ≥ the recorded rate         | pass   | 232 passed                                                                                                                                                                                                                                                                    | 1 skipped (233) in 12 test files on commit `4445b48`, up from the recorded 215 passed | 1 skipped (216) in 11 test files. The 17-test `audit-gate` test file is the only new test surface. |

<!-- gitissue:qa v1 head=4445b482a44fea6513f704398b2dd71521d43acb profile=light cycles=1 review=clean tests=232@4445b482a44fea6513f704398b2dd71521d43acb ui=none -->
