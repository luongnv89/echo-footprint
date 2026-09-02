## Summary

Two independent XS fixes from the P3 Clean & Harden phase, shipped together because they touch unrelated files.

### #35 (F-BUG-003) — SmartyAds/Criteo misclassification

`TRACKING_PLATFORMS.smartyads.domains` listed `as.us.criteo.com`, a Criteo CDN endpoint. The pre-computed `DOMAIN_TO_PLATFORM_MAP` is a literal-key, first-encountered map, so every URL containing that host resolved to `smartyads` instead of being unclassified (or, with a fuller Criteo entry, `criteo`). This bug masked real Criteo traffic in the dashboard.

- Removed `'as.us.criteo.com'` from `TRACKING_PLATFORMS.smartyads.domains` in `src/lib/pixel-detector.js`.
- Added a regression test in `tests/unit/pixel-detector.test.js` (`should not misclassify as.us.criteo.com as smartyads`).
- Verified: `rg -n "as.us.criteo.com" src/lib/pixel-detector.js` exits 1.
- Red-capable: the new test fails before the fix (`expected [ 'smartyads' ] to not include 'smartyads'`) and passes after.

### #36 (F-CI-005) — CI test job pointed at nonexistent coverage

The CI `test` job ran `npm run test:run` (= `vitest --run`, no coverage provider) and then uploaded `path: coverage/`. That directory is never written by `test:run`, so every run shipped an empty `test-results` artifact.

- Switched the test step to `npm run test:coverage` (= `vitest --run --coverage`) in `.github/workflows/ci.yml`.
- The `coverage/` upload now contains a real coverage report (`coverage-final.json` + per-file HTML/LCov).
- `@vitest/coverage-v8` is already a devDependency (added in PR #49 for P0); no install changes needed.

## Decision Record

| Field | Value |
|---|---|
| Root cause (#35) | Catalog error: `as.us.criteo.com` is a Criteo CDN host, not SmartyAds. The literal-key map has no way to fix this — only catalog hygiene. |
| Root cause (#36) | Wiring bug: the upload step was authored without matching the package.json scripts. |
| Options considered | #35: remove the bogus host (chosen). #36: switch to `test:coverage` (chosen) vs. drop the upload step (rejected — loses the coverage signal the project clearly wanted). |
| Risks | Both low. One-line catalog change and one-line CI change, each independently revertable. |
| Rollback | Revert this single commit. |

## Test Results

- `npm run test:coverage` locally: **12 files, 212 passed, 1 skipped (213 total)** — matches recorded rate (was 211 passed before; +1 from the new regression test for #35).
- `npm run lint`: 0 errors, 12 pre-existing warnings (all `no-console` in unrelated test files).
- `npm run format:check`: clean.
- Pre-commit security audit: 0 vulnerabilities.

## Acceptance Criteria

### #35
- [x] `detectPlatformFromUrl` (or successor) maps `as.us.criteo.com` to `criteo` or `null`, not `smartyads` — host is no longer in any catalog, so `detectPlatformFromUrl` returns `null`, which propagates to an empty detections array.
- [x] `npm run test:run` passes at >= the recorded rate (212 >= 211, plus the new test).

### #36
- [x] Artifact path matches a directory the test job actually writes — `coverage/` is now produced by `test:coverage`.
- [x] `npm run test:run` passes at >= the recorded rate (212 >= 211).

Closes #35
Closes #36
