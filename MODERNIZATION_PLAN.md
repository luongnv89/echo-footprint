# Modernization Plan — EchoFootPrint

Derived from [`MODERNIZATION_REPORT.md`](./MODERNIZATION_REPORT.md) · **Baseline at audit:** RED
**Test command of record:** `npm run test:run` · **Pass rate at audit:** Not Assessed (vitest not on PATH)

Until Task 0.1 completes, P0–P4 tasks scheduled *before* 0.1 would be illegal — none are. Task 0.1 establishes install + a recorded `passed/total`. Every later P0–P4 task asserts `npm run test:run` at ≥ that recorded rate. Pre is exempt (RED).

## At a glance

| Phase | Sprints | Tasks | Closes | Milestone |
|---|---|---|---|---|
| Pre Agent environment | 1 | 3 | — (enables ME) | ME |
| P0 Stabilize | 1 | 5 | 2 High, 2 Medium | M0 |
| P1 Secure & Patch | 1 | 10 | 3 Critical, 10 High, 3 Medium, 2 Low | M1 |
| P2 Modernize | 1 | 4 | 1 Critical, 1 High, 2 Medium | M2 |
| P3 Clean & Harden | 1 | 9 | 2 High, 10 Medium, 1 Low | M3 |
| P4 Polish | 1 | 10 | 7 High, 11 Medium, 2 Low | M4 |

**Critical path:** Task Pre.1 → Pre.2 → 0.1 → 0.2 → 0.5 → 1.1 → 1.2 → 2.2 → 2.4 (~8.5 days; 0.3 and 0.4 are equivalent to 0.2 on this chain; 2.2 also waits on 2.1, which is shorter). Nothing in P0 starts before ME. Nothing in P1–P4 starts before M0 (Task 0.5 is the P0 gate: it depends on 0.2–0.4, which depend on 0.1).

**M3 bindings:** Coverage was Not Assessed — target is “a coverage tool is configured and reports a number” (then +20pp toward a later bar, floor 60%). Duplication threshold: no logic block repeated ≥ 3 times among the `DEAD`/`CLEAN` findings (schema twin + geo twin). Weak-type scope: none (`any` not used; JS).

**M4 bindings:** Perf budget = D3/Leaflet/html2canvas are not on the empty-state/dashboard-shell chunk (`F-PERF-003`). No measured kB at audit (static PERF). UX findings closed. Docs match `src/`.

## Phase Pre — Agent environment

**Goal:** An agent can install, build, and test from files alone. · **Milestone ME:** `CLAUDE.md` updated and `AGENTS.md` created via `/agent-config`; recorded commands live in `CLAUDE.md` and Pre.1 notes.

### Sprint Pre — Agent-runnable environment

#### Task Pre.1: Write install/run notes for a clean checkout

**Description**: Document that the tree has no `node_modules`, the package manager of record is npm + `package-lock.json` (not pnpm), Node should be 24 LTS (CI still says 20 until 2.1), and the commands are `npm ci`, `npm run build`, `npm run test:run`, `npm run lint`. Serves milestone ME. Do not run `npm ci` here.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:
- [ ] Notes name `npm ci`, `npm run build`, `npm run test:run`, and `npm run lint`
- [ ] Notes state baseline is RED until 0.1 and that Pre must not be used as a license to skip ME

**Dependencies**: None

**Effort**: S

**Verify**: `test -f CLAUDE.md` is not enough; a reviewer reads Pre.1 notes in the PR or issue that lands this task (commands also copied into `CLAUDE.md` by Pre.2)

#### Task Pre.2: Update CLAUDE.md via /agent-config

**Description**: File present → `/agent-config update` targeting `CLAUDE.md`. Replace the “pre-development / no implementation” status and pnpm-only command block with the recorded npm commands. Do not run the skill while planning.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:
- [ ] `CLAUDE.md` exists at the repo root
- [ ] `CLAUDE.md` names `npm ci`, `npm run build`, and `npm run test:run`

**Dependencies**: Pre.1

**Effort**: S

**Verify**: run `/agent-config update` targeting `CLAUDE.md`

#### Task Pre.3: Create AGENTS.md via /agent-config

**Description**: File absent → `/agent-config create` targeting `AGENTS.md`. Subagent definitions only; build/test commands stay on Pre.1 notes and `CLAUDE.md`.

**Closes**: — (milestone-enabling: ME)

**Acceptance Criteria**:
- [ ] `AGENTS.md` exists at the repo root
- [ ] `AGENTS.md` is created against agent-config checklists only (not a second copy of the PRD)

**Dependencies**: Pre.1

**Effort**: S

**Verify**: run `/agent-config create` targeting `AGENTS.md`

## Phase P0 — Stabilize

**Goal:** Clean checkout builds and the Vitest suite runs. · **Milestone M0:** `npm ci && npm run build && npm run test:run` succeed locally and in CI; zip artifact path exists.

### Sprint 0 — Restore baseline-green

#### Task 0.1: Install from the lockfile and record the pass rate

**Description**: Run `npm ci` (not `npm install`) on a clean checkout. Record `npm run test:run` passed/total/skipped. That number becomes the plan’s pass rate. Serves M0.

**Closes**: — (milestone-enabling: M0; suite exists but could not start)

**Acceptance Criteria**:
- [ ] `npm ci` exits 0 and `node_modules/vitest` exists
- [ ] `npm run test:run` produces a `passed/total` that is written into this plan’s header (or a follow-up note)

**Dependencies**: Pre.2, Pre.3

**Effort**: S

**Verify**: `npm ci && npm run test:run`

#### Task 0.2: Declare engines.node

**Description**: Add `engines.node` (and optionally `packageManager`) so local Current Node 26 and CI Node 20 cannot silently diverge.

**Closes**: `F-DEP-006`

**Acceptance Criteria**:
- [ ] `package.json` contains `"engines": { "node": ">=22" }` (or `>=24` once 2.1 lands — `>=22` is enough for M0)
- [ ] `npm run test:run` passes at ≥ the rate recorded in 0.1

**Dependencies**: 0.1

**Effort**: S

**Verify**: `node -e "const p=require('./package.json'); if(!p.engines||!p.engines.node) process.exit(1)"`

#### Task 0.3: Align zip output with the CI upload path

**Description**: `zip` writes `echofootprint.zip` at the repo root; CI uploads `dist/echofootprint.zip`.

**Closes**: `F-CI-001`

**Acceptance Criteria**:
- [ ] `npm run zip` produces a file at the path named in `.github/workflows/ci.yml` `path:`
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.1

**Effort**: S

**Verify**: `npm run zip && test -f dist/echofootprint.zip` (or the single path both sides agree on)

#### Task 0.4: Add the Vitest coverage provider

**Description**: `vitest.config.js` requests `v8` but the package is missing. Add `@vitest/coverage-v8` matching the installed vitest major (1.x until 1.2).

**Closes**: `F-TEST-001`

**Acceptance Criteria**:
- [ ] `@vitest/coverage-v8` is in `package.json` / lockfile
- [ ] `npm run test:coverage` prints a line/branch number
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.1

**Effort**: S

**Verify**: `npm run test:coverage`

#### Task 0.5: Split format write vs check

**Description**: `format` currently `--write`. CI and husky pass `--check`.

**Closes**: `F-CI-006`

**Acceptance Criteria**:
- [ ] `package.json` has a non-mutating check script (e.g. `format:check`)
- [ ] CI lint job and `.husky/pre-commit` call the check script
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.2, 0.3, 0.4

**Effort**: S

**Verify**: `npm run format:check`

*M0 gate:* 0.5 does not start until 0.1–0.4 are done. Every P1–P4 task depends on 0.5 (directly or transitively).

## Phase P1 — Secure & Patch

**Goal:** High/critical advisories gone or isolated to a scheduled major; pause/exclusion and first-match bugs fixed; ip-api no longer silent cleartext. · **Milestone M1:** `npm audit --json` reports 0 high+ on remaining W1 items; vitest advisory cleared; `npm run test:run` still green.

### Sprint 1 — Advisories and user-visible defects

#### Task 1.1: Apply non-force npm audit fix (W1)

**Description**: `npm audit fix` without `--force` for brace-expansion, flatted, js-yaml, minimatch, nanoid, picomatch, postcss, rollup, ws.

**Closes**: `F-DEP-011`

**Acceptance Criteria**:
- [ ] `npm audit --json` high count for those transitives is 0 or only remaining items require a major (vite/vitest/sharp)
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `npm audit --audit-level=high`

#### Task 1.2: Upgrade vitest and @vitest/ui to a patched release

**Description**: Smallest bump that clears `GHSA-5xrq-8626-4rwp` is vitest ≥3.2.5 (4.x line ≥4.1.0); audit recommends 4.1.11. Prefer 3.2.x if the suite stays green with Vite 5; if 3.x is unpublished or incompatible, take 4.x and treat remaining Vite coupling as a spike. Migration source: Context7 `/vitest-dev/vitest` — https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md

**Closes**: `F-DEP-002`, `F-DEP-003`

**Acceptance Criteria**:
- [ ] `npm audit` no longer reports `GHSA-5xrq-8626-4rwp` on vitest / `@vitest/ui`
- [ ] Migration guide (or spike note) is linked in the PR
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.1

**Effort**: M

**Verify**: `npm ls vitest @vitest/ui && npm audit --json | python3 -c "import json,sys; d=json.load(sys.stdin); v=d.get('vulnerabilities',{}); assert 'vitest' not in v or v['vitest']['severity'] not in ('critical','high')"`

#### Task 1.3: Upgrade sharp to ≥0.35.0

**Description**: Separate major (0.x). Clears `GHSA-f88m-g3jw-g9cj`. Rebuild native bindings.

**Closes**: `F-DEP-005`

**Acceptance Criteria**:
- [ ] `package-lock.json` `node_modules/sharp` version is ≥0.35.0
- [ ] `npm run build` still produces icons (or documents canvas fallback)
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `npm audit` no longer lists sharp / GHSA-f88m-g3jw-g9cj

#### Task 1.4: Pin TruffleHog off @main

**Description**: Pin `trufflesecurity/trufflehog` to a release SHA in both push and PR steps.

**Closes**: `F-CI-002`

**Acceptance Criteria**:
- [ ] No `uses: trufflesecurity/trufflehog@main` remains
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `grep -n 'trufflehog@' .github/workflows/ci.yml`

#### Task 1.5: Stop silent cleartext ip-api lookups

**Description**: Gate Map View geo behind opt-in, switch to HTTPS, or remove live lookups. Sanitize Leaflet popup HTML (no string interpolation of geo/domain). Update footer and privacy policy in the same change so copy cannot lie.

**Closes**: `F-SEC-001`, `F-UX-001`, `F-DOCS-004`, `F-BUG-005`

**Acceptance Criteria**:
- [ ] Leaflet popups do not interpolate unescaped geo/domain strings
- [ ] Default path does not `fetch` `http://ip-api.com`
- [ ] Privacy policy and dashboard footer match the remaining behavior
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: M

**Verify**: `rg -n 'ip-api.com' src/` and a geolocation unit test that the default path does not fetch

#### Task 1.6: Honor pause and exclusions in the MutationObserver

**Description**: Extract `shouldRecord()` and use it from `runPixelDetection` and `observeDynamicPixels`. Add `"storage"` to `manifest.json` `permissions` so pause/exclusions actually persist.

**Closes**: `F-BUG-002`, `F-TEST-004`, `F-BUG-006`

**Acceptance Criteria**:
- [ ] `manifest.json` `permissions` includes `storage`
- [ ] Observer callback does not `sendPixelDetection` when paused or excluded
- [ ] A unit test covers paused + excluded cases
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `npm run test:run tests/unit/content-script.test.js`

#### Task 1.7: Record every platform on a page, not the first match

**Description**: Change detectors to collect all matching platforms per scan without blowing the 100ms budget. Deduplicate observer vs delayed scan so a pixel in the first 3s is not stored twice.

**Closes**: `F-BUG-001`, `F-BUG-007`

**Acceptance Criteria**:
- [ ] A fixture with Facebook + Google scripts produces two footprints (or two events)
- [ ] A pixel seen by both the observer and the delayed scan is stored once
- [ ] Detection still logs a warning only if `performance.now` delta > 100ms
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: M

**Verify**: `npm run test:run tests/unit/pixel-detector.test.js`

#### Task 1.8: Make npm audit a real CI gate after W1/W4 security bumps

**Description**: Drop `continue-on-error: true` once 1.1–1.3 land, or fail on high+ with an allowlist that only contains vite until 2.2.

**Closes**: `F-CI-004`

**Acceptance Criteria**:
- [ ] Security job fails the PR if a new high/critical appears
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.1, 1.2, 1.3

**Effort**: S

**Verify**: inspect `.github/workflows/ci.yml` security job

#### Task 1.9: Dexie patch/minor wave (W2)

**Description**: dexie 4.2.1→4.4.5, dexie-react-hooks 4.2.0→4.4.0. Not a major.

**Closes**: `F-DEP-009`, `F-DEP-010`

**Acceptance Criteria**:
- [ ] `npm outdated` no longer lists those two as wanted>installed on the minor line
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `npm ls dexie dexie-react-hooks`

#### Task 1.10: Replace upload-release-asset@v1

**Description**: Legacy GitHub action on the release job.

**Closes**: `F-CI-003`

**Acceptance Criteria**:
- [ ] `.github/workflows/ci.yml` does not `uses: actions/upload-release-asset@v1`
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `grep upload-release-asset .github/workflows/ci.yml` exits 1

## Phase P2 — Modernize

**Goal:** Runtime and remaining majors, one task each. · **Milestone M2:** CI Node is a supported LTS; Vite 8 and React 19 current or deferred with written rationale; ESLint flat config.

### Sprint 2 — Runtime then majors

#### Task 2.1: Move CI (and engines) to Node 24 LTS (W3)

**Description**: Replace `node-version: '20'` in all four jobs. Target Active LTS 24 (EOL 2028-04-30). If a native module blocks 24, pin 22 Maintenance LTS with a written rationale.

**Closes**: `F-DEP-001`

**Acceptance Criteria**:
- [ ] No `node-version: '20'` remains in `.github/workflows/`
- [ ] `engines.node` allows the CI version
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5, 1.3

**Effort**: S

**Verify**: `grep -n "node-version" .github/workflows/ci.yml`

#### Task 2.2: Upgrade Vite 5 → 8

**Description**: One major. Migration source: Context7 `/vitejs/vite` — https://github.com/vitejs/vite/blob/main/docs/guide/migration.md (Rolldown compatibility layer; `future: 'warn'` on 7 if a two-step is needed). Keep `emptyOutDir: false` and the esbuild content-script step working.

**Closes**: `F-DEP-004`

**Acceptance Criteria**:
- [ ] `package-lock.json` vite is 8.x (or a deferred-rationale file if 8 breaks MV3)
- [ ] `npm run build` produces `dist/content-script.js`, `dist/service-worker.js`, and the dashboard
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 2.1, 1.2

**Effort**: M

**Verify**: `npm run build && npm audit` no longer lists vite ≤6.4.2

#### Task 2.3: ESLint 8 → 9 flat config

**Description**: One major. Migration source: Context7 `/eslint/eslint` — https://eslint.org/docs/latest/use/migrate-to-9.0.0 ; `npx @eslint/migrate-config .eslintrc.cjs`.

**Closes**: `F-DEP-008`

**Acceptance Criteria**:
- [ ] `eslint.config.js` (or `.mjs`) exists; `.eslintrc.cjs` removed or re-exported
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: M

**Verify**: `npm run lint`

#### Task 2.4: React 18 → 19

**Description**: One major (react + react-dom together — they are a single runtime). Migration source: Context7 `/reactjs/react.dev` — https://react.dev/blog/2024/04/25/react-19-upgrade-guide (`defaultProps` on functions, `ref` as prop, `forwardRef` optional). Blast: 12 dashboard files.

**Closes**: `F-DEP-007`

**Acceptance Criteria**:
- [ ] `react` and `react-dom` are 19.x in the lockfile
- [ ] Dashboard builds; no `defaultProps` on function components
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 2.2

**Effort**: M

**Verify**: `npm ls react react-dom`

## Phase P3 — Clean & Harden

**Goal:** Dead twins gone, god modules split, dashboard tests exist, coverage tool reports. · **Milestone M3:** `npm run test:coverage` prints a number; Dexie schema lives in one module; BipartiteGraph is not a 1300-line file.

### Sprint 3 — Tests then structure

#### Task 3.1: Generate dashboard characterization tests

**Description**: Run `test-coverage` on `src/dashboard/` (empty state, settings DELETE confirm, CSV `escapeCSV`, tab rendering). Serves M3. Do this before the BipartiteGraph split.

**Closes**: `F-TEST-002`

**Acceptance Criteria**:
- [ ] At least one test file imports `EmptyState`, `SettingsSheet` (or `escapeCSV`), and `App` or a tab shell
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: M

**Verify**: `npm run test:run` includes a dashboard test file

#### Task 3.2: Split BipartiteGraph

**Description**: `code-review` mode `clean` then `cleanup` for this file only. Extract filters, export, and layout.

**Closes**: `F-CLEAN-001`

**Acceptance Criteria**:
- [ ] `BipartiteGraph.jsx` is <400 lines or the extracted modules are listed in the PR
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.1

**Effort**: M

**Verify**: `wc -l src/dashboard/components/BipartiteGraph.jsx`

#### Task 3.3: Unify Dexie schema

**Description**: One schema module imported by `db-sw.js` and `db.js`.

**Closes**: `F-CLEAN-004`

**Acceptance Criteria**:
- [ ] Version 1/2 store strings exist in a single file
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: M

**Verify**: `rg -n "db.version\\(1\\)" src/` shows one definition site

#### Task 3.4: Remove unused crypto and the SW geo-queue twin

**Description**: `code-review` mode `cleanup`. Delete or wire `hashFacebookID`; delete `geo-queue.js` or the dashboard duplicate — keep one geo client. `DEBUG_MODE = true` goes away with the file.

**Closes**: `F-DEAD-001`, `F-DEAD-002`, `F-DEAD-003`, `F-SEC-002`

**Acceptance Criteria**:
- [ ] `hashFacebookID` is either called from production or removed with its tests
- [ ] Only one `GEO_API_URL` remains (or none, if 1.5 removed lookups)
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.5

**Effort**: M

**Verify**: `rg -n "hashFacebookID|geo-queue" src tests`

#### Task 3.5: Split App.jsx and the pixel catalog

**Description**: Extract insights/tab shell from `App.jsx`; move `TRACKING_PLATFORMS` out of `pixel-detector.js`.

**Closes**: `F-CLEAN-002`, `F-CLEAN-003`

**Acceptance Criteria**:
- [ ] `App.jsx` <400 lines; catalog is a data module
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.1

**Effort**: M

**Verify**: `wc -l src/dashboard/App.jsx src/lib/pixel-detector.js`

#### Task 3.6: Rename detectFacebookPixel*

**Description**: Names that lie. Update imports and tests.

**Closes**: `F-CLEAN-005`

**Acceptance Criteria**:
- [ ] No exported `detectFacebookPixel` that detects 50 networks
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.7

**Effort**: S

**Verify**: `rg -n "export function detectFacebookPixel" src/`

#### Task 3.7: Fix SmartyAds Criteo domain

**Description**: Remove `'as.us.criteo.com'` from smartyads; add a mapping test.

**Closes**: `F-BUG-003`

**Acceptance Criteria**:
- [ ] `detectPlatformFromUrl` (or successor) maps that host to `criteo` or null, not `smartyads`
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `rg -n "as.us.criteo.com" src/lib/pixel-detector.js` exits 1

#### Task 3.8: Point CI test job at coverage output

**Description**: Either run `test:coverage` or stop uploading `coverage/`.

**Closes**: `F-CI-005`

**Acceptance Criteria**:
- [ ] Artifact path matches a directory the test job actually writes, or the upload step is removed
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `.github/workflows/ci.yml` test job

#### Task 3.9: Un-skip or replace the iframe pixel test

**Description**: `it.skip` at `pixel-detector.test.js:115`.

**Closes**: `F-TEST-003`

**Acceptance Criteria**:
- [ ] The skip is gone, or the test is deleted with a comment pointing at a replacement
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.7

**Effort**: S

**Verify**: `rg "it.skip" tests/unit/pixel-detector.test.js`

## Phase P4 — Polish

**Goal:** Lazy graphs, indexed counts, honest docs, scannable empty state. · **Milestone M4:** D3/Leaflet not on the shell chunk; `F-UX-*` closed; docs match code.

### Sprint 4 — Load, copy, docs

#### Task 4.1: Lazy-load graph, map, and table views

**Description**: `React.lazy` the four visualization components from `App.jsx`.

**Closes**: `F-PERF-003`

**Acceptance Criteria**:
- [ ] `App.jsx` does not statically import `d3`, `leaflet`, or `html2canvas`
- [ ] Empty state still renders without those chunks
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.1

**Effort**: M

**Verify**: `rg -n "from 'd3'|from 'leaflet'|html2canvas" src/dashboard/App.jsx` exits 1

#### Task 4.2: Replace full-table toArray aggregations

**Description**: Badge unique-domain count and dashboard stats must not load every row.

**Closes**: `F-PERF-001`, `F-PERF-002`

**Acceptance Criteria**:
- [ ] `getUniqueDomainCount` does not call `toArray()`
- [ ] `getStats` does not scan footprints solely to recount platforms if an index exists
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.3

**Effort**: M

**Verify**: `rg -n "toArray" src/lib/db-sw.js src/dashboard/utils/db.js`

#### Task 4.3: Rebuild the radial graph incrementally

**Description**: Stop `selectAll('*').remove()` on every footprints tick; debounce or diff.

**Closes**: `F-PERF-005`

**Acceptance Criteria**:
- [ ] `src/dashboard/components/RadialGraph.jsx` no longer contains `selectAll('*').remove()` (or it is confined to unmount cleanup, not the footprints `useEffect`)
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.1

**Effort**: M

**Verify**: `rg -n "selectAll\\('\\*'\\)" src/dashboard/components/RadialGraph.jsx`

#### Task 4.4: Parallelize MapView cache reads and URL scan

**Description**: `Promise.all` for `getGeoCache`; hostname `Map` for `detectPlatformFromUrl`.

**Closes**: `F-PERF-004`, `F-PERF-006`, `F-BUG-008`

**Acceptance Criteria**:
- [ ] MapView cache loop is not `await` inside `for`
- [ ] Platform lookup is O(1) per hostname, not `includes` over the whole catalog
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `rg -n "await getGeoCache" src/dashboard/components/MapView.jsx`

#### Task 4.5: Fix tab ids, empty-state copy, view subtitle

**Description**: dont-make-me-think review-only leftovers. No Redesign Mode beyond these listed files.

**Closes**: `F-UX-002`, `F-UX-003`, `F-UX-005`

**Acceptance Criteria**:
- [ ] Tab buttons have `id`s matching `aria-labelledby`
- [ ] EmptyState lead paragraph is ≤2 sentences
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 3.1

**Effort**: S

**Verify**: `rg -n 'id="graph-tab"' src/dashboard/App.jsx`

#### Task 4.6: Align remaining docs (README version, license, website sentence, CLAUDE architecture)

**Description**: Run `doc-manager` for README, privacy-policy, CLAUDE architecture bullets. License: pick MIT vs proprietary and make `package.json`, README, and CLAUDE agree.

**Closes**: `F-DOCS-001`, `F-DOCS-002`, `F-DOCS-003`, `F-DOCS-005`, `F-DOCS-006`, `F-DOCS-007`

**Acceptance Criteria**:
- [ ] README status version equals `package.json` version
- [ ] License string is identical in README and `package.json`
- [ ] `CLAUDE.md` Current Project Status does not say “no implementation yet”
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: Pre.2, 1.5, 3.4

**Effort**: M

**Verify**: `rg -n "no implementation yet|Current Version" CLAUDE.md README.md`

#### Task 4.7: Silence MapView production logs

**Description**: Remove or gate `console.log` of domains and geo payloads.

**Closes**: `F-UX-004`

**Acceptance Criteria**:
- [ ] `MapView.jsx` has no unconditional `console.log`
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 1.5

**Effort**: S

**Verify**: `rg -n "console.log" src/dashboard/components/MapView.jsx`

#### Task 4.8: Settings version fallback

**Description**: Fallback `1.1.0` → manifest / package version.

**Closes**: `F-BUG-004`

**Acceptance Criteria**:
- [ ] Fallback is not hardcoded `1.1.0`
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `rg -n "1.1.0" src/dashboard/components/SettingsSheet.jsx`

#### Task 4.9: Domain-exclusion regex hardening

**Description**: Cap length and escape user patterns.

**Closes**: `F-SEC-003`

**Acceptance Criteria**:
- [ ] Pathological `*` patterns cannot compile unbounded `.*` chains
- [ ] `npm run test:run` passes at ≥ the recorded rate

**Dependencies**: 0.5

**Effort**: S

**Verify**: `npm run test:run tests/unit/domain-patterns.test.js`

#### Task 4.10: Pin landing-page lucide

**Description**: Replace `unpkg.com/lucide@latest`.

**Closes**: `F-SEC-004`

**Acceptance Criteria**:
- [ ] No `@latest` CDN script in `landing-page/index.html`
- [ ] `npm run test:run` passes at ≥ the recorded rate (no landing tests — build still green)

**Dependencies**: 0.5

**Effort**: S

**Verify**: `rg -n "unpkg.com/lucide@latest" landing-page/index.html` exits 1

## Dependency table

| Task | Depends on | Blocks | Wave |
|---|---|---|---|
| Pre.1 | — | Pre.2, Pre.3 | W0 |
| Pre.2 | Pre.1 | 0.1, 4.6 | — |
| Pre.3 | Pre.1 | 0.1 | — |
| 0.1 | Pre.2, Pre.3 | 0.2, 0.3, 0.4 | W0 |
| 0.2 | 0.1 | 0.5 | W0 |
| 0.3 | 0.1 | 0.5 | — |
| 0.4 | 0.1 | 0.5 | — |
| 0.5 | 0.2, 0.3, 0.4 | 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10, 2.1, 2.3, 3.1, 3.3, 3.7, 3.8, 4.4, 4.8, 4.9, 4.10 | W0 |
| 1.1 | 0.5 | 1.2, 1.8 | W1 |
| 1.2 | 1.1 | 1.8, 2.2 | W4 |
| 1.3 | 0.5 | 1.8, 2.1 | W4 |
| 1.4 | 0.5 | — | — |
| 1.5 | 0.5 | 3.4, 4.6, 4.7 | — |
| 1.6 | 0.5 | — | — |
| 1.7 | 0.5 | 3.6, 3.9 | — |
| 1.8 | 1.1, 1.2, 1.3 | — | — |
| 1.9 | 0.5 | — | W2 |
| 1.10 | 0.5 | — | — |
| 2.1 | 0.5, 1.3 | 2.2 | W3 |
| 2.2 | 2.1, 1.2 | 2.4 | W5 |
| 2.3 | 0.5 | — | W7 |
| 2.4 | 2.2 | — | W6 |
| 3.1 | 0.5 | 3.2, 3.5, 4.1, 4.3, 4.5 | — |
| 3.2 | 3.1 | — | — |
| 3.3 | 0.5 | 4.2 | — |
| 3.4 | 1.5 | 4.6 | — |
| 3.5 | 3.1 | — | — |
| 3.6 | 1.7 | — | — |
| 3.7 | 0.5 | — | — |
| 3.8 | 0.5 | — | — |
| 3.9 | 1.7 | — | — |
| 4.1 | 3.1 | — | — |
| 4.2 | 3.3 | — | — |
| 4.3 | 3.1 | — | — |
| 4.4 | 0.5 | — | — |
| 4.5 | 3.1 | — | — |
| 4.6 | Pre.2, 1.5, 3.4 | — | — |
| 4.7 | 1.5 | — | — |
| 4.8 | 0.5 | — | — |
| 4.9 | 0.5 | — | — |
| 4.10 | 0.5 | — | — |

## Execution waves

| Wave | Tasks |
|---|---|
| 1 | Pre.1 |
| 2 | Pre.2, Pre.3 |
| 3 | 0.1 |
| 4 | 0.2, 0.3, 0.4 |
| 5 | 0.5 |
| 6 | 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9, 1.10, 2.3, 3.1, 3.3, 3.7, 3.8, 4.4, 4.8, 4.9, 4.10 |
| 7 | 1.2, 2.1, 3.2, 3.4, 3.5, 3.6, 3.9, 4.1, 4.2, 4.3, 4.5, 4.7 |
| 8 | 1.8, 2.2, 4.6 |
| 9 | 2.4 |

## Milestones

| ID | Phase | Exit condition (measurable) | Verify with |
|---|---|---|---|
| ME | Pre | `CLAUDE.md` and `AGENTS.md` exist; commands documented | `test -f CLAUDE.md && test -f AGENTS.md` |
| M0 | P0 | clean checkout → `npm ci && npm run build && npm run test:run` green | CI run after 0.1–0.5 |
| M1 | P1 | vitest GHSA cleared; W1 transitives patched; ip-api not on default path | `npm audit`; `rg ip-api.com src/` |
| M2 | P2 | CI Node ≠ 20; vite 8 or written deferral; react 19 or written deferral | `grep node-version .github/workflows/ci.yml`; `npm ls vite react` |
| M3 | P3 | `npm run test:coverage` prints a number; one Dexie schema module | `npm run test:coverage` |
| M4 | P4 | `App.jsx` does not import d3/leaflet; UX tab ids present; docs status ≠ “no implementation” | commands in Verify lines of 4.1, 4.5, 4.6 |

## Deferred and out of scope

| ID | Severity | Why deferred | Revisit when |
|---|---|---|---|
| ESLint 9→10 (follow-on to `F-DEP-008`) | Medium | Task 2.3 migrates 8→9 flat config (the breaking change). ESLint 10.9.1 is current on npm; a second major in the same task would hide which bump broke lint. | After 2.3 is green; then one task or skip with a written “9 is enough” note |

Landing-page Google Fonts (third-party on the marketing site only) is not a finding: not in the extension CSP path.

## Risks

| Risk | Affects | Mitigation |
|---|---|---|
| `npm ci` on Node 26 fails native `canvas`/`sharp` | 0.1, 1.3, 2.1 | Task 0.1 records the failure; 2.1 allows Node 22 as documented fallback |
| Vitest 3.2.6 vs 4.1.11 vs Vite 5 | 1.2, 2.2 | 1.2 takes smallest patched; 2.2 may force vitest 4 — do not batch with 1.2 |
| Dashboard has almost no tests; P3 refactors are unverifiable | 3.2, 3.5, 4.1 | 3.1 characterization tests first |
| ip-api opt-in may empty Map View | 1.5, 4.2 | Empty/unknown geo already exists; keep cached-only mode |
| `/agent-config update` rewrites CLAUDE.md against stale checklists | Pre.2, 4.6 | 4.6 is the docs source of truth after geo/dead-code land |
