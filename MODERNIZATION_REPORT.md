# Modernization Report — EchoFootPrint

**Audited:** 2026-09-01 · **Commit:** `05d2ba0` · **Branch:** `main`
**Stack:** JavaScript (ESM) · React 18 · Vite 5 · Vitest 1 · Manifest V3 Chrome extension · Dexie · D3 · Leaflet
**Size:** 57 source files (`*.js/jsx/css/html`), ~16.8 kLOC (`git ls-files` + `wc -l`)
**Baseline:** RED — `node_modules` absent; build, tests, and lint cannot start

## Summary

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 22 |
| Medium | 28 |
| Low | 5 |

EchoFootPrint is a real, shipped v1.2.0 extension (last commit 2025-12-05, CI last succeeded the same day) sitting on a dirty-but-stale tree with no installed dependencies. CI still pins **Node 20**, which reached EOL on 2026-04-30. The lockfile carries **critical Vitest UI RCE** (`GHSA-5xrq-8626-4rwp`) plus a Vite 5 line that `npm audit` will only leave via a Vite 8 major. Agent docs (`CLAUDE.md`) still describe a pre-implementation repo, MIT licensing, Facebook-ID hashing, and an in-SW geo queue — none of which match the code. The plan restores a reproducible install (P0), patches advisories and the ip-api leak (P1), then moves Node/Vite/React/ESLint one major at a time (P2).

**Top 5 by impact:**
1. `F-BUG-005` — Map popups interpolate unsanitized geo/domain HTML (XSS in the extension origin).
2. `F-DEP-001` — CI Node 20 is EOL; pin Active LTS (24) after a green local install.
3. `F-DEP-002` / `F-DEP-003` — Vitest 1.6.1 / `@vitest/ui` 1.6.1, critical UI-server RCE.
4. `F-BUG-006` — `permissions` is `[]` so `chrome.storage` pause/exclusions do not persist.
5. `F-SEC-001` — Map View sends visited domains to `http://ip-api.com` (cleartext).

## Baseline

| Row | Value | Evidence |
|---|---|---|
| Build | fail (cannot start) | `npm run build` → `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'esbuild'` (`scripts/build-extension-scripts.js` import). `node_modules` absent. |
| Tests runnable | no | `npm run test:run` → `sh: vitest: command not found` |
| Test pass rate | Not Assessed — suite cannot start | `npm run test:run`. 10 files exist under `tests/unit/`. |
| Coverage | Not Assessed — suite cannot start; coverage provider undeclared | `package.json:15` has `test:coverage`; `vitest.config.js:10` sets `provider: 'v8'` but `@vitest/coverage-v8` is not in `package.json` / lockfile |
| Lint / typecheck | lint cannot start; prettier check passed via npx | `npm run lint` → `sh: eslint: command not found`. `npx --no-install prettier --check src/` → `All matched files use Prettier code style!` (may be a global binary, not the lockfile pin) |
| CI | 1 workflow; last run **success** 2025-12-05 | `gh run list` → run `19954799940` success, `CI/CD Pipeline`, `main`, 1m17s. Four earlier Nov 2025 failures then a 1.2.0 success |
| Runtime declared vs installed | none declared / Node **v26.7.0** installed / CI pins **20** | no `.nvmrc`; no `engines` in `package.json`; `node -v` → `v26.7.0`; `.github/workflows/ci.yml:23` `node-version: '20'` |
| Lockfile | present and committed | `package-lock.json` (lockfileVersion 3, dated Dec 4 2025) |
| Last commit | Fri Dec 5 2025, 47 commits since 2025-09-01 | `git log -1 --format='%cd %h %s'` → `05d2ba0 Add Product Hunt badge to landing page hero section` |

**Verdict:** RED
**Test command of record:** `npm run test:run` — cannot be executed until `npm ci`. After Task 0.1 records a pass rate, every later P0–P4 task asserts that command at ≥ that rate. Until 0.1 lands, the fallback assertion is `npm run build` succeeding (see plan). Pre ACs do not assert green.

Pre-run snapshot (`git status --porcelain`): `D scripts/resize-image.js`, `?? .claude/`, `?? .specify/`, `?? docs/reddit-tracking.md`. Phase 0 probes did not change that set.

## Dimension coverage

| Dim | Disposition | Path | Findings |
|---|---|---|---|
| DEP | Audited | own probes (`npm audit`, `npm outdated`, lockfile, Context7 for majors) | 11 |
| BUG | Audited | delegated → `code-review` mode `review` (`CODE_REVIEW.md` + late file-reviewer) | 8 |
| PERF | Audited | delegated → `code-review` mode `perf` (static only) | 6 |
| CLEAN | Audited | inline | 5 |
| DEAD | Audited | inline | 3 |
| UX | Audited | delegated → `dont-make-me-think` review-only (static; app not runnable) | 5 |
| TEST | Audited | inline | 4 |
| CI | Audited | inline | 6 |
| SEC | Audited | inline | 4 |
| DOCS | Audited | inline | 7 |

## Dependency currency

| ID | Package | Ecosystem | Installed | Latest | Gap | Risk | Blast | Wave | Severity | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| F-DEP-001 | node (CI) | runtime | 20 (CI pin); v26.7.0 local | 24 Active LTS / 22 Maintenance LTS | major×2 from CI pin | eol | CI + all scripts | W3 | Critical | `.github/workflows/ci.yml:23` (also 46, 74, 138). Node 20 EOL 2026-04-30 (nodejs.org / endoflife). |
| F-DEP-002 | vitest | npm | 1.6.1 | 4.1.11 (audit fix); patched ≥3.2.5 / 4.1.0 | major×3 (1→4) or major×2 (1→3) | vuln-critical | 10 test files + `vitest.config.js` | W4 | Critical | `package.json:55`; `package-lock.json:7567`; `npm audit` → `GHSA-5xrq-8626-4rwp` / CVE-2026-47429 |
| F-DEP-003 | @vitest/ui | npm | 1.6.1 | 4.1.11 (audit fix) | major×3 | vuln-critical | `package.json` scripts `test:ui` | W4 | Critical | `package.json:43`; `package-lock.json:2129`; same advisory via vitest UI server |
| F-DEP-004 | vite | npm | 5.4.21 | 8.2.2 (audit fix) | major×3 | vuln-high (esbuild GHSA-67mh-4wv8-2f99; vite ≤6.4.2) | `vite.config.js`, `scripts/build-extension-scripts.js` | W5 | High | `package.json:54`; `package-lock.json:7484`; `npm audit` will install vite@8.2.2 |
| F-DEP-005 | sharp | npm | 0.34.5 | 0.35.4 | major (0.x) | vuln-high GHSA-f88m-g3jw-g9cj | `scripts/create-icons.js` | W4 | High | `package.json:53`; `package-lock.json:6647` |
| F-DEP-006 | engines.node | runtime | undeclared | — | — | none | repo-wide | W0 | Medium | `package.json` has no `engines` key (file ends `devDependencies` at 39–56) |
| F-DEP-007 | react + react-dom | npm | 18.3.1 | 19.2.8 | major | none | 12 `src/dashboard/**/*.jsx` files | W6 | Medium | `package.json:36-37`; `package-lock.json:6232`; `npm outdated` latest 19.2.8 |
| F-DEP-008 | eslint | npm | 8.57.1 | 9.x flat config (Context7); 10.9.1 on npm | major×2 to 9 (10 deferred) | unmaintained 8.x | `.eslintrc.cjs` | W7 | Medium | `package.json:45`; `package-lock.json` `node_modules/eslint` 8.57.1. Task 2.3 lands on 9; ESLint 10 is Deferred. |
| F-DEP-009 | dexie | npm | 4.2.1 | 4.4.5 | minor | none | `src/lib/db-sw.js`, `src/dashboard/utils/db.js` | W2 | Low | `package.json:31`; `npm outdated` wanted 4.4.5 |
| F-DEP-010 | dexie-react-hooks | npm | 4.2.0 (lock) | 4.4.0 | minor | none | `src/dashboard/App.jsx:7` | W2 | Low | `package.json:32`; `npm outdated` wanted 4.4.0 |
| F-DEP-011 | transitive (brace-expansion, flatted, js-yaml, minimatch, nanoid, picomatch, postcss, rollup, ws) | npm | lockfile 2025-12-04 | `npm audit fix` (non-force) | patch | vuln-high (11 high in metadata) | lockfile | W1 | High | `npm audit --json` metadata `high: 11`; GHSA-mw96-cpmx-2vgc (rollup), GHSA-qx2v-qp2m-jg93 (postcss), GHSA-58qx-3vcg-4xpx (ws), plus brace-expansion/flatted/js-yaml/minimatch/nanoid/picomatch |

**Runtime and toolchain**

| Component | Declared | Installed | Current stable | Status | Severity |
|---|---|---|---|---|---|
| Node.js | none (`engines` missing); CI `20` | v26.7.0 | 24 Active LTS (EOL Apr 2028); 22 Maintenance LTS | CI pin EOL 2026-04-30 | Critical (`F-DEP-001`) |
| npm | none | 11.19.0 | matches Node 26 current | local Current vs CI 20 — unreproducible | Medium (`F-DEP-006`) |
| Vite | `^5.0.8` | 5.4.21 | 8.2.2 | 3 majors + high advisory | High (`F-DEP-004`) |
| Vitest | `^1.0.4` | 1.6.1 | 4.1.11 | critical advisory | Critical (`F-DEP-002`) |
| ESLint | `^8.55.0` | 8.57.1 | 9.x flat config / 10.x | eslintrc deprecated | Medium (`F-DEP-008`) |
| React | `^18.2.0` | 18.3.1 | 19.2.8 | one major | Medium (`F-DEP-007`) |

**Upgrade waves**

| Wave | Contents | Lands in |
|---|---|---|
| W0 | `npm ci`, declare `engines`, record pass rate | P0 |
| W1 | `npm audit fix` (non-force) for 11 high transitives | P1 |
| W2 | dexie 4.2.1→4.4.5, dexie-react-hooks 4.2.0→4.4.0 | P1 |
| W3 | Node CI 20 → 24 LTS; document engines | P2 |
| W4 | vitest/@vitest/ui to smallest patched major (≥3.2.6); sharp 0.34→0.35 (separate tasks) | P1 (vuln) / remaining majors P2 |
| W5 | vite 5 → 8 (Rolldown) | P2 |
| W6 | react/react-dom 18 → 19 | P2 |
| W7 | eslint 8 → 9 flat config (`eslint.config.js`) | P2 |

**Migration sources (majors):**
- React 19: Context7 `/reactjs/react.dev` — [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide) (`defaultProps`/`propTypes` on functions removed; `ref` as a prop).
- Vite 8: Context7 `/vitejs/vite` — [Vite migration guide](https://github.com/vitejs/vite/blob/main/docs/guide/migration.md) (Rolldown; `rollupOptions` → `rolldownOptions`; compatibility layer).
- Vitest 4: Context7 `/vitest-dev/vitest` — [Vitest migration guide](https://github.com/vitest-dev/vitest/blob/main/docs/guide/migration.md) and [Vitest 4 blog](https://vitest.dev/blog/vitest-4). Smallest advisory clear is 3.2.5 (`GHSA-5xrq-8626-4rwp`).
- ESLint 9: Context7 `/eslint/eslint` — [Migrate to 9.0.0](https://eslint.org/docs/latest/use/migrate-to-9.0.0); `npx @eslint/migrate-config`.

## Findings

### BUG

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-BUG-001 | High | `src/lib/pixel-detector.js:611` | Script/img/iframe detectors `return` on the first platform match, so a page with multiple trackers stores one footprint | Collect all matching platforms per scan; one event per platform, still <100ms | M |
| F-BUG-002 | High | `src/content/content-script.js:183` | `observeDynamicPixels` sends detections without `isPaused` / `excludedDomains` checks used in `runPixelDetection` | Share a `shouldRecord()` guard with the observer callback | S |
| F-BUG-003 | Medium | `src/lib/pixel-detector.js:558` | `smartyads.domains` includes `'as.us.criteo.com'`, mis-attributing Criteo | Remove the Criteo host; add a test that Criteo URLs map to `criteo` | S |
| F-BUG-004 | Low | `src/dashboard/components/SettingsSheet.jsx:78` | Build-info fetch failure falls back to version `1.1.0` while the extension is 1.2.0 | Fallback to `manifest` / `package.json` version | S |
| F-BUG-005 | Critical | `src/dashboard/components/MapView.jsx:254` | Leaflet `bindPopup` HTML interpolates `location.city` / `country` / `domains` with no escape. Geo comes from ip-api over HTTP, so a MITM (or a poisoned cache) can XSS the extension page and read IndexedDB | Build popups with `textContent` / a strict escaper; treat geo fields as untrusted | S |
| F-BUG-006 | High | `manifest.json:6` | `"permissions": []` while pause/exclusions use `chrome.storage.local`. Without `storage`, Settings can look saved while the content script always sees empty storage | Add `storage`; check `chrome.runtime.lastError` on get/set | S |
| F-BUG-007 | High | `src/content/content-script.js:172` | Observer starts immediately; `runPixelDetection` waits 3s, so a pixel injected in that window is recorded twice | Deduplicate per tab/session, or start the observer after the initial scan | S |
| F-BUG-008 | High | `src/lib/pixel-detector.js:590` | `url.includes(domain)` matches substrings (`notcasalemedia.com` vs `casalemedia.com`) and shorter keys steal path-specific rules | Parse hostname; match host suffixes on label boundaries (same change as `F-PERF-006`) | M |

### PERF

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-PERF-001 | High | `src/lib/db-sw.js:182` | `getUniqueDomainCount` loads every footprint into memory (`toArray`) on each detection (badge path) | Use a Dexie collection / index distinct count, or maintain a counter in settings | S |
| F-PERF-002 | High | `src/dashboard/utils/db.js:127` | `getUniqueDomains`, `getDomainCounts` (`:142`), and `getStats` (`:271`) all `toArray()` the full table | Index-backed counts; avoid a fourth full scan in `getStats` | M |
| F-PERF-003 | High | `src/dashboard/App.jsx:15` | RadialGraph, BipartiteGraph, MapView, DataTable are static imports — D3, Leaflet, html2canvas load even for the empty state | `React.lazy` + `Suspense` per view; keep EmptyState on the main chunk | M |
| F-PERF-004 | Medium | `src/dashboard/components/MapView.jsx:49` | Cached geo is loaded with `await getGeoCache` inside a `for` of every unique domain | `Promise.all` like `DataTable.jsx:40` | S |
| F-PERF-005 | Medium | `src/dashboard/components/RadialGraph.jsx:61` | Every `footprints` change does `selectAll('*').remove()` and rebuilds the force graph | Diff nodes/links or debounce; cap visible nodes per PRD | M |
| F-PERF-006 | Medium | `src/lib/pixel-detector.js:590` | `detectPlatformFromUrl` scans every configured domain with `url.includes` on each script | Hostname parse + `Map` lookup; keep the precomputed map as the only path | S |

### CLEAN

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-CLEAN-001 | High | `src/dashboard/components/BipartiteGraph.jsx:1` | 1309-line component owns layout, filters, sort, export, html2canvas | Split filters/export/layout; run `code-review` mode `clean` then `cleanup` | L |
| F-CLEAN-002 | Medium | `src/dashboard/App.jsx:26` | 642-line `App` mixes insights, bipartite copy, tabs, and data wiring | Extract insights + tab shell | M |
| F-CLEAN-003 | Medium | `src/lib/pixel-detector.js:8` | 773-line module mixes a 50-platform catalog with detection loops | Move `TRACKING_PLATFORMS` to data; keep detectors small | M |
| F-CLEAN-004 | Medium | `src/lib/db-sw.js:14` | Dexie schema+upgrade duplicated in `src/dashboard/utils/db.js:14` — two migration copies | One schema module imported by SW and dashboard | M |
| F-CLEAN-005 | Medium | `src/lib/pixel-detector.js:698` | `detectFacebookPixel` / `detectFacebookPixelScripts` names lie — they detect 50 platforms | Rename exports; update tests | S |

Also: run `code-review` mode `clean` in P3 (writes `CLEAN_CODE_AUDIT.md`).

### DEAD

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-DEAD-001 | Medium | `src/lib/crypto.js:12` | `hashFacebookID` is unused outside `tests/unit/crypto.test.js` | Delete or wire it; stop documenting c_user hashing | S |
| F-DEAD-002 | Medium | `src/background/service-worker.js:18` | Geo queue import commented out; `src/lib/geo-queue.js` still ships with `DEBUG_MODE = true` | Remove SW copy if dashboard `geolocation.js` is the only client; or delete `geo-queue.js` | M |
| F-DEAD-003 | Medium | `src/lib/geo-queue.js:10` vs `src/dashboard/utils/geolocation.js:17` | Two ip-api clients (in-memory vs persisted) | Keep one implementation | M |

Also: run `code-review` mode `cleanup` in P3.

### UX

Static-only (build RED; no live extension session). Krug review of dashboard + landing HTML/CSS.

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-UX-001 | High | `src/dashboard/App.jsx:611` | Footer says “All data stored locally. Zero telemetry.” while Map View calls ip-api | Change copy to match actual geo behavior, or don’t call out until opt-in | S |
| F-UX-002 | Medium | `src/dashboard/App.jsx:575` | Tabpanels use `aria-labelledby="graph-tab"` etc. but tab buttons have no matching `id` | Add `id="graph-tab"` (and siblings) on the tab buttons | S |
| F-UX-003 | Medium | `src/dashboard/components/EmptyState.jsx:32` | Empty-state paragraph lists many network names — high thinking cost for a first-run screen | One sentence + 3 numbered steps; move catalog to Help | S |
| F-UX-004 | Low | `src/dashboard/components/MapView.jsx:45` | `console.log` of domains and geo payloads on every map load | Guard with a debug flag | S |
| F-UX-005 | Medium | `src/dashboard/App.jsx:424` | Four view tabs (graph / bipartite / map / table) with icon-only-ish labels and no “you are here” beyond `aria-selected` | Visible selected tab styling already exists; add a short view subtitle | S |

### TEST

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-TEST-001 | High | `vitest.config.js:10` | Coverage `provider: 'v8'` but `@vitest/coverage-v8` is not in `package.json`; `npm run test:coverage` cannot work after install | Add the matching coverage package; make CI run it | S |
| F-TEST-002 | High | `tests/unit/csv-export.test.js:2` | No tests for dashboard views (`App`, RadialGraph, MapView, SettingsSheet, EmptyState). `escapeCSV` in DataTable is covered; the UI components are not | Add `test-coverage` for empty state, pause settings, and tab rendering | L |
| F-TEST-003 | Low | `tests/unit/pixel-detector.test.js:115` | `it.skip('should detect Facebook iframe'` — jsdom iframe limitation | Document skip or switch to a fixture that doesn’t need iframe `src` | S |
| F-TEST-004 | Medium | `src/content/content-script.js:183` | No test that paused/excluded domains suppress observer callbacks | Add a content-script test around `shouldRecord` once extracted | S |

The suite **exists** (10 unit files). Absence of a suite is therefore not a Critical finding; inability to run it is the RED baseline (`F-DEP-006` / P0 install).

### CI

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-CI-001 | High | `.github/workflows/ci.yml:90` | Upload path `dist/echofootprint.zip` but `package.json:17` writes `../echofootprint.zip` | Align zip output and upload path | S |
| F-CI-002 | High | `.github/workflows/ci.yml:149` | `trufflesecurity/trufflehog@main` (also `:159`) is a moving tag | Pin to a release SHA | S |
| F-CI-003 | Medium | `.github/workflows/ci.yml:116` | `actions/upload-release-asset@v1` is the legacy upload action | `softprops/action-gh-release` or `upload-artifact` + `gh release upload` | S |
| F-CI-004 | Medium | `.github/workflows/ci.yml:143` | `npm audit --audit-level=moderate` with `continue-on-error: true` — 2 critical / 11 high never fail CI | Fail on high+ once W1/W4 land; keep a documented allowlist until then | S |
| F-CI-005 | Medium | `.github/workflows/ci.yml:53` | Test job runs `npm test -- --run` (no coverage) then uploads `coverage/` | Run `test:coverage` or drop the upload | S |
| F-CI-006 | Medium | `package.json:12` | `format` is `prettier --write src/`; CI/husky pass `--check`. Write+check is easy to get wrong | Split `format` vs `format:check` | S |

See `F-DEP-001` for Node 20 in the same workflow (kept in DEP).

### SEC

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-SEC-001 | High | `src/dashboard/utils/geolocation.js:17` | Cleartext `http://ip-api.com/json/` lookups of user-visited domains; CSP allows it (`manifest.json:42`) | HTTPS + user opt-in; or remove live lookups | M |
| F-SEC-002 | Medium | `src/lib/geo-queue.js:15` | `DEBUG_MODE = true` in a module that still ships | Set false or delete with `F-DEAD-002` | S |
| F-SEC-003 | Medium | `src/content/domain-utils.js:20` | Exclusion wildcards become `.*` regexes from Settings input | Limit pattern length; escape more than `.` and `*`; cap quantifiers | S |
| F-SEC-004 | Medium | `landing-page/index.html:21` | `https://unpkg.com/lucide@latest` — unpinned remote script on the marketing page | Pin a version or vendor the icons | S |

See `F-DEP-002` — also a SEC issue (Vitest UI RCE); counted under DEP.

### DOCS

| ID | Severity | Evidence | Problem | Fix direction | Effort |
|---|---|---|---|---|---|
| F-DOCS-001 | High | `CLAUDE.md:408` | “Phase: Pre-development… no implementation yet” — `src/` is a full extension | `/agent-config update` targeting `CLAUDE.md` | M |
| F-DOCS-002 | High | `package.json:28` | `UNLICENSED`; `README.md:348` proprietary; `CLAUDE.md:13` “MIT licensed” | Pick one license and align README, CLAUDE, store listing | S |
| F-DOCS-003 | High | `CLAUDE.md:22` | Docs still claim `c_user` cookie capture (`:22`), SHA-256 before storage (`:29`), and SW geo queue (`:30`) | Rewrite component bullets to match `content-script.js` / `service-worker.js` | M |
| F-DOCS-004 | High | `privacy-policy.md:33` | “No data is sent to external servers” — Map View calls ip-api | Disclose geo lookups or stop them (`F-SEC-001`) | S |
| F-DOCS-005 | Medium | `README.md:358` | “Current Version: 1.1.0” vs `package.json:3` `1.2.0` | Bump README status | S |
| F-DOCS-006 | Medium | `CLAUDE.md:93` | “pnpm preferred” / `pnpm zip` outputs `dist/echofootprint.zip`; repo commits `package-lock.json` and npm scripts | Document npm + lockfile as source of truth | S |
| F-DOCS-007 | Medium | `privacy-policy.md:7` | “no accompanying website” but `landing-page/` and footer link `echo-footprint.luongnv.com` | Acknowledge the site or drop the sentence | S |

## Cross-cutting patterns

- **Docs describe a different product than `src/`.** Hashing, SW geo queue, MIT, “no implementation”, pnpm-only, AES-GCM — all in `CLAUDE.md` / privacy policy, not in the running design (`F-DOCS-001`, `F-DOCS-003`, `F-DEAD-001`, `F-DEAD-002`).
- **Full-table IndexedDB reads on hot paths.** Badge, dashboard stats, and unique-domain counts materialize every row (`F-PERF-001`, `F-PERF-002`).
- **Privacy copy vs live geo.** Footer, privacy policy, and CLAUDE “zero telemetry” vs `ip-api.com` (`F-UX-001`, `F-SEC-001`, `F-DOCS-004`).
- **First-match + 50-platform catalog.** Detection data is large; the algorithm still stops at one hit (`F-BUG-001`, `F-CLEAN-003`, `F-CLEAN-005`).

## Artifacts written

| File | Why |
|---|---|
| `MODERNIZATION_REPORT.md` | this report |
| `MODERNIZATION_PLAN.md` | the derived plan |
| `CODE_REVIEW.md` | declared artifact — `code-review` mode `review` |

**Tracked files modified: 0** — working tree dirty state matches the pre-run snapshot aside from the three artifacts above. Pre-existing: `D scripts/resize-image.js`, `?? .claude/`, `?? .specify/`, `?? docs/reddit-tracking.md`.

## Limitations

- **Baseline RED** because `node_modules` was not installed. The skill forbids `npm install`. Test pass rate, coverage %, and eslint error counts are Not Assessed.
- **`npm outdated`** reported `current=None` and listed only production dependencies. Dev-tool latest versions for vite/vitest/eslint come from `npm audit` fix recommendations and Context7, not a full outdated matrix.
- **UX is static-only** — app not runnable (build RED). No live URL, no `/browse`, no screenshots of the loaded dashboard.
- **PERF is static** — no Lighthouse, no bundle-size measurement, no 10k-record load. M4 perf budget is therefore bound to “lazy-load D3/Leaflet (F-PERF-003)” rather than a measured kB/p95.
- **asm preflight:** `asm install code-review` from the registry failed (not a registry name). Skills were already present under `~/.claude/skills/` and in this session’s skill list. A subsequent local-path reinstall hit `ENOENT` on the symlink; the session still had the skill files to read. Recorded as degraded install, not Skill-unavailable.
- **Agent tool:** dimension work ran via parallel Task subagents plus inline reading. BUG `CODE_REVIEW.md` was assembled from the review-mode checklist in this session so the declared artifact exists even if a background reviewer lagged.
- **Scope branches:** Target = repo root. Bash = yes. Repo size = 57 source files (≥50). UI present = yes (React dashboard + landing-page). App runnable = no. Ecosystems = npm + GitHub Actions. Dimension filter = none. `AGENTS.md` absent; `CLAUDE.md` present.
- Validator ran two rounds on the first finding set. Round 1 must-fix (P1–P4 overlapping P0) was applied. Round 2 must-fix (critical path omitted 0.2) was applied after that pass; a third validator run was not performed (cap 2).
- Late dimension auditors (PERF, UX, CLEAN/DEAD/TEST, BUG, CI/SEC/DOCS) finished after the first report draft. Unique Critical/High they added (`F-BUG-005`–`008`) were merged. Remaining Medium/Low from those JSON dumps (e.g. extra UX contrast/mobile items, extra PERF observer debounce) were **not** all promoted into the counted tables — they live in `CODE_REVIEW.md` and the auditor transcripts. Revisit when executing P4.

## Next step

The plan derived from this report: [`MODERNIZATION_PLAN.md`](./MODERNIZATION_PLAN.md).
