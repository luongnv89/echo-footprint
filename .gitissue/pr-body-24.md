Closes #24

## Summary

Replace the archived `actions/upload-release-asset@v1` step in the release job with `softprops/action-gh-release` (SHA-pinned to v3.0.3), the maintained, widely-used drop-in. The asset filename parity is preserved by renaming the downloaded ZIP before upload, and the release job gains the `contents: write` permission the new action requires. Closes F-CI-003.

## Approach

**Option 1 — Swap to softprops/action-gh-release (SHA-pinned).** One-step replacement of the archived action with `softprops/action-gh-release@efb35369e0ad2afab669f228072c1b0d510eae64` (v3.0.3, SHA-pinned for supply-chain hygiene — same pattern as the existing TruffleHog pin in this file). The new action takes `tag_name` + `files` instead of the raw `upload_url`, so `upload_url` plumbing is dropped. Asset filename `echofootprint-<tag>.zip` is preserved by renaming the file via `mv` before the upload step.

## Decision Record

- **Root cause:** The release job still used the archived `actions/upload-release-asset@v1`, which consumes the raw release `upload_url` and is no longer maintained.
- **Options considered:** Option 1 — Swap to softprops/action-gh-release (SHA-pinned); Option 2 — `gh release upload` CLI step.
- **Options rejected:** Option 2 — more shell and token wiring for the same result; the pinned action is the standard drop-in and aligns with the TruffleHog pinning pattern already in the file.
- **Selected option:** Option 1 — Swap to softprops/action-gh-release (SHA-pinned).
- **Residual risk:** Third-party action supply chain — mitigated by SHA pinning. Verify asset name parity on the next real release.
- **Effort profile:** light — fast path (pre-work Effort S); synthesis skipped, QA capped at 1 cycle.
- **Design-confirm:** auto-selected Option 1 (complexity: XS).
- **Reproduction:** not applicable — improvement issue, not a bug.

Analyzed at: `refactor/24-1-10-replace-upload-release-asset-v1 @ 418a315` (2026-09-01)

## Changes

| File                       | Change                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml` | Replace `actions/upload-release-asset@v1` step with `softprops/action-gh-release@efb35369 # v3.0.3` (SHA-pinned); add `mv` step to rename asset to `echofootprint-<tag>.zip`; add `permissions: contents: write` to release job. |

## Test Results

- Unit tests: 215 passed | 1 skipped (216)
- Build: passed
- QA cycles: 1 (clean)

## Acceptance Criteria Verification

| Criterion                                                                   | Status | Evidence                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `.github/workflows/ci.yml` does not `uses: actions/upload-release-asset@v1` | pass   | `grep upload-release-asset .github/workflows/ci.yml` exits 1; replaced with `softprops/action-gh-release@efb35369e0ad2afab669f228072c1b0d510eae64 # v3.0.3` |
| `npm run test:run` passes at ≥ the recorded rate                            | pass   | `Test Files 11 passed (11)`, `Tests 215 passed                                                                                                              | 1 skipped (216)` (matches recorded rate) |

<!-- gitissue:qa v1 head=418a315ac81f500168cc94b6a26dccf6d56c3223 profile=light cycles=1 review=clean tests=215@418a315ac81f500168cc94b6a26dccf6d56c3223 ui=none -->
