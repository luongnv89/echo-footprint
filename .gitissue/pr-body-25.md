Closes #25

## Summary

Move the CI runtime and the project engines declaration from Node 20 to Node 24 LTS, the Active LTS line that runs through 2028-04-30. All four jobs in `.github/workflows/ci.yml` (`lint`, `test`, `build`, `security`) now use `actions/setup-node@v4` with `node-version: '24'`, and `package.json` now declares `engines.node: ">=24"` so local installs and CI agree. The P0 self-check that locked the floor at `>=22` (issue #11) is updated to `>=24` so it stays accurate.

## Approach

Selected option: **Bump all four jobs to Node 24 and tighten engines.node to >=24** (light profile, direct plan).

The change is mechanical: 4 substitutions of `node-version: '20'` with `'24'`, one bump of `engines.node` from `">=22"` to `">=24"`, and one matching update of the regex in `tests/unit/config-scripts.test.js`. The `>=22` floor was set in the P0 batch by #11; the team explicitly wanted the manifest and CI to match, and the AC for this issue says engines.node "covers 24 LTS", which `">=24"` satisfies most cleanly.

Verified locally on Node 24.18.0 (the project's local Node 24 — `node -v` is 26.7.0 by default; 24.18.0 is the brew formula). `npm ci` succeeded with 500 packages, no install errors. Canvas 3.2.0 and sharp 0.35.4 both have Node 24 prebuilts, so the documented fallback to Node 22 (Maintenance LTS) with a written rationale is not needed.

## Decision Record

- **Root cause:** All four CI jobs pin the EOL-bound Node 20 while the project's own engines.node already declares `>=22`, leaving the project on an out-of-support runtime in CI.
- **Options considered:** Option 1 — Bump all four jobs to Node 24 and tighten engines.node to >=24; Option 2 — Bump to Node 24 with deferred-rationale fallback path.
- **Options rejected:** Option 2 (deferred-rationale fallback) — not needed: native modules (canvas 3.2.0, sharp 0.35.4) install cleanly on Node 24 and the pre-approved fallback would only add a rationale file the team would then have to remove later.
- **Selected option:** Option 1 — Bump all four jobs to Node 24 and tighten engines.node to >=24.
- **Residual risk:** None identified. Node 24 is Active LTS; canvas and sharp have prebuilt binaries; the audit-gate still gates the security job. If a future native module regresses, the deferred-rationale path is still open as a follow-up.
- **Effort profile:** light — fast path (pre-work Effort S, adaptive_effort on); synthesis skipped, QA capped at 1 cycle.
- **Design-confirm:** auto-selected Option 1 (complexity: S, risk: Low).

Analyzed at: `main @ b4d8172` (2026-09-01)

## Changes

| File                                | Change                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`          | `node-version: '20'` → `'24'` in all 4 setup-node steps (lint, test, build, security) |
| `package.json`                      | `engines.node: ">=22"` → `">=24"`                                                     |
| `tests/unit/config-scripts.test.js` | self-check regex updated to `^>=24`; test description now references issue #25        |
| `INSTALL.md`                        | documented Node version in the environment section updated to `>=24` / CI 24          |
| `CLAUDE.md`                         | local-vs-CI node-version note updated to reflect CI now matches local Node 24         |
| `AGENTS.md`                         | agent-operating-rules note updated to match                                           |

## Test Results

- Unit tests: 233 passed, 1 skipped (234 total) — matches the recorded 233-pass rate on the latest `main` CI run (`gh api .../actions/jobs/100042589238/logs`)
- Lint: 0 errors, 16 warnings (pre-existing, unrelated to this change)
- Format check: passed
- Build: passed (`npm run build` produced `dist/echofootprint.zip` and the icon set)
- Audit-gate: clean — only the allowlisted `vite@high` Windows path-traversal advisory remains; expected (P2 vite 8 major bump is tracked in #2.2)
- QA cycles: 1 (light profile ceiling)

## Acceptance Criteria Verification

| Criterion                                                                              | Status | Evidence                                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All CI jobs use `node-version: 24` (or `actions/setup-node@v4` matrix covering 24 LTS) | pass   | `grep -n "node-version" .github/workflows/ci.yml` shows `'24'` on lines 23, 46, 83, 148 (lint, test, build, security)                                                       |
| `engines.node` in `package.json` covers 24 LTS (e.g. `>=22` or `>=24`)                 | pass   | `package.json:60` reads `"node": ">=24"`; `tests/unit/config-scripts.test.js` `package.json P0 config > declares engines.node >= 24 (issue #25 acceptance criteria)` passes |
| `npm run test:run` passes at ≥ the recorded rate on Node 24                            | pass   | 233 tests passed on Node 24.18.0 (recorded 233 on main with Node 20)                                                                                                        |

<!-- gitissue:qa v1 head=d6e4bf0ddcbd0c2282313a5f0d7f65ad953f05dc profile=light cycles=1 review=clean tests=233@d6e4bf0ddcbd0c2282313a5f0d7f65ad953f05dc ui=none -->
