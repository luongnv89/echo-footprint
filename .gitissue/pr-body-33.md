Closes #33

## Summary

Splits `App.jsx` so it falls comfortably under the 400-line target and moves the
static `TRACKING_PLATFORMS` catalog out of `src/lib/pixel-detector.js` into a
pure data module. Closes F-CLEAN-002 (catalog separation) and F-CLEAN-003
(`App.jsx` shell extraction).

## Approach

Selected: **Option 2 — Full split: catalog + insights + tab shell.** The
acceptance criterion "App.jsx <400 lines" cannot be met by a minimal
catalog-only move, so the dashboard insights (`useMemo` blocks), the
view-tabs `<nav>`, and the insights banner JSX each move to their own
module. App.jsx becomes pure orchestration: state, queries, view switching.

## Decision Record

- **Root cause:** `TRACKING_PLATFORMS` was co-located with detection logic
  in `src/lib/pixel-detector.js`, forcing 7 dashboard files and 1 test to
  import a library module for a pure data structure. `App.jsx` (643 lines)
  mixed orchestration, data reduction, JSX composition, and presentation
  in a single file, far above the 400-line target.
- **Options considered:** Option 1 — Minimal catalog move + tab shell
  extract; Option 2 — Full split: catalog + insights + tab shell.
- **Options rejected:** Option 1 — does not meet the "App.jsx <400 lines"
  acceptance criterion; insights reduction would have to come back as a
  follow-up.
- **Selected option:** Option 2 — Full split.
- **Residual risk:** Pixel detector still re-exports `TRACKING_PLATFORMS`
  for back-compat with any external consumer (and for its internal
  `DOMAIN_TO_PLATFORM_MAP` lookup). The new `useDashboardInsights` hook
  mirrors the original `useMemo` reducer logic exactly; a characterization
  test (`tests/unit/insights-hook.test.js`) locks the contract.
- **Effort profile:** `full` (Effort M, Priority medium).
- **Design-confirm:** auto-selected Option 2 (complexity: M).

Analyzed at: `refactor/33-3-5-split-app-jsx-and-the-pixel @ 09589cd` (2026-09-02)

## Changes

| File | Change |
|------|--------|
| `src/lib/tracking-platforms.js` | New: pure data module holding `TRACKING_PLATFORMS` (50-platform catalog). |
| `src/lib/pixel-detector.js` | Drop the inline `TRACKING_PLATFORMS` definition; import + re-export from `./tracking-platforms.js` (back-compat for any external consumer). 800 → 250 lines. |
| `src/dashboard/App.jsx` | Import the catalog from the new module. Use `useOverviewInsights` / `useBipartiteInsights` / `useMapInsights` and the `selectDisplayedInsights` selector. Replace inline `<nav class="view-tabs">` and the insights banner JSX with `<ViewTabs>` and `<InsightsBanner>`. 643 → 272 lines. |
| `src/dashboard/hooks/useDashboardInsights.js` | New: three `useMemo` hooks (`useOverviewInsights`, `useBipartiteInsights`, `useMapInsights`) and a small `selectDisplayedInsights` selector. |
| `src/dashboard/components/ViewTabs.jsx` | New: the four-button view-tabs nav. SVGs are byte-for-byte the originals. |
| `src/dashboard/components/InsightsBanner.jsx` | New: the top-of-dashboard insight banner with dismiss button. |
| `src/dashboard/components/{BipartiteGraph,DataTable,HelpSheet,PlatformStats,RadialGraph}.jsx` | Switch `TRACKING_PLATFORMS` import to `../../lib/tracking-platforms.js`. |
| `src/dashboard/utils/bipartiteData.js` | Switch `TRACKING_PLATFORMS` import to `../../lib/tracking-platforms.js`. |
| `tests/unit/pixel-detector.test.js` | Repoint `TRACKING_PLATFORMS Configuration` describe to import from `tracking-platforms.js`; add back-compat assertion that `pixel-detector.TRACKING_PLATFORMS === tracking-platforms.TRACKING_PLATFORMS`. |
| `tests/unit/insights-hook.test.js` | New: characterization tests for the three insights hooks and the `selectDisplayedInsights` selector. |

## Test Results

- Unit tests: 230 passed (baseline 220 → +1 back-compat test + 9 insights-hook tests = 230)
- Integration tests: 0 (none exist for this project)
- E2e tests: 0 (none exist for this project)
- Build: passed (vite build OK, no warnings introduced)
- QA cycles: 1 (cycle 1 was clean — no findings to fix; cycle 2 reconfirmed clean)
- Lint: 0 errors (only pre-existing `no-console` warnings in unrelated files)
- Format: prettier clean
- Secscan: clean (14 files scanned, 0 blocking, 0 warnings)

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `App.jsx` <400 lines; catalog is a data module | pass | `wc -l src/dashboard/App.jsx` → 272 lines; `src/lib/tracking-platforms.js` is a pure data module (`export const TRACKING_PLATFORMS = { … }`) with no imports. |
| `npm run test:run` passes at ≥ the recorded rate | pass | 230 / 230 tests pass (baseline 220). |

<!-- gitissue:qa v1 head=09589cd56a646095f60c5271890fb0aaa8ca6668 profile=full cycles=1 review=clean tests=230@09589cd56a646095f60c5271890fb0aaa8ca6668 ui=none:clean@09589cd56a646095f60c5271890fb0aaa8ca6668 -->
