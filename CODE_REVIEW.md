# Code Review Report
**Date**: 2026-09-01
**Scope**: Full Audit — EchoFootPrint extension
**Mode**: Mode 2 (Medium Audit, inline — parent orchestrator)
**Dimension**: BUG only
**Files Reviewed**: 53

Scanned `src/` (35), `scripts/` (3), `tests/` (11), `landing-page/` (index.html, privacy.html, styles.css), and `manifest.json`. Skipped `node_modules` and `dist`.

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 1     |
| Major    | 6     |
| Minor    | 10    |
| Info     | 3     |

---

## Findings

### [CRITICAL] Unescaped HTML in Leaflet popups (XSS)

- **File**: `src/dashboard/components/MapView.jsx:254`
- **Category**: injection
- **Issue**: Marker popup HTML is built with template literals interpolating `location.city`, `location.region`, `location.country`, and `location.domains` with no encoding. Leaflet `bindPopup` treats the string as HTML. Geo fields come from `http://ip-api.com/json/` (`src/dashboard/utils/geolocation.js:17`, `:237`) over plaintext HTTP, so a MITM can inject markup/handlers. Successful XSS in the extension origin can read IndexedDB footprints.
- **Recommendation**: Build popup content with `textContent`/DOM APIs or a strict HTML escaper. Prefer HTTPS geo lookups and treat API fields as untrusted.

### [MAJOR] `chrome.storage` used without the `storage` permission

- **File**: `manifest.json:6`
- **Category**: authn/authz / unchecked errors
- **Issue**: `"permissions": []` but pause and exclusions depend on `chrome.storage.local` in `src/content/content-script.js:90`, `src/background/service-worker.js:30`, and `src/dashboard/components/SettingsSheet.jsx:16`. Without `"storage"`, those calls fail (often only via `lastError`, which is never checked). The Settings UI still toggles React state, so Pause / Excluded Domains appear to work while the content script always sees `{}`.
- **Recommendation**: Declare `"storage"` and check `chrome.runtime.lastError` on every get/set.

### [MAJOR] Dynamic-pixel observer ignores pause and exclusions

- **File**: `src/content/content-script.js:183`
- **Category**: races / null-unchecked control flow
- **Issue**: `runPixelDetection` honors `isPaused` and `excludedDomains` (`:100–114`), but `observeDynamicPixels` always calls `sendPixelDetection`. Pause and domain exclusion therefore do not stop SPA/late-loaded pixels.
- **Recommendation**: Gate the observer callback on the same pause/exclusion checks (and re-read storage on each mutation or on `storage.onChanged`).

### [MAJOR] Same dynamically loaded pixel is recorded twice

- **File**: `src/content/content-script.js:172`
- **Category**: races
- **Issue**: `init()` starts `MutationObserver` immediately (`:183`) and also `setTimeout(runPixelDetection, 3000)` (`:175`). A pixel injected during that window fires the observer, then the delayed full scan records it again. Counts, graphs, and the badge inflate.
- **Recommendation**: Deduplicate by `(domain, platform, url)` within a tab/session, or skip the delayed scan when the observer already reported, or start the observer only after the initial scan.

### [MAJOR] Only the first matching tracker per page is stored

- **File**: `src/lib/pixel-detector.js:612`
- **Category**: off-by-one / logic
- **Issue**: `detectFacebookPixelScripts` returns on the first `script[src]` match. `detectFacebookPixel` (`:705`) then returns that single result. A page with both GTM and a Meta pixel logs one platform. Tests even named “detect multiple Facebook scripts” still assert a single result (`tests/unit/pixel-detector.test.js:59`).
- **Recommendation**: Collect all unique platforms (and optionally pixel types) per page, subject to the latency budget.

### [MAJOR] Tracker matching uses raw `url.includes(domain)`

- **File**: `src/lib/pixel-detector.js:590`
- **Category**: logic
- **Issue**: Patterns are substring-tested against the full URL. Host `notcasalemedia.com` matches `casalemedia.com`; path `/t.co/` matches Twitter’s `t.co/` token; shorter keys win over more specific ones (e.g. `analytics.twitter.com` vs `analytics.twitter.com/i/adsct`). False positives and mis-attribution follow.
- **Recommendation**: Parse hostname/path with `URL`, match host suffixes on label boundaries, and prefer longest-prefix path rules.

### [MAJOR] Exclusion patterns compile unsanitized regex (crash / ReDoS)

- **File**: `src/content/domain-utils.js:20`
- **Category**: injection / unchecked errors
- **Issue**: Only `.` and `*` are rewritten. User patterns from Settings (`(`, `[`, `+`, etc.) make `new RegExp` throw. `isDomainExcluded` does not catch it, so `runPixelDetection` aborts for that page. Repeated `*` can also produce catastrophic backtracking.
- **Recommendation**: Escape all regex metacharacters except the intended `*` wildcard; wrap `new RegExp` in try/catch; cap pattern length.

### [MINOR] Latitude/longitude `0` stored as `null`

- **File**: `src/dashboard/utils/geolocation.js:266`
- **Category**: null/undefined on external input
- **Issue**: `lat: data.lat || null` and `lon: data.lon || null` treat `0` as missing (equator / prime meridian). The same pattern is in `src/lib/geo-queue.js:121`, `src/lib/db-sw.js:152`, and `src/dashboard/utils/db.js:211`. `fetchBulkGeolocation` also skips coords with `cached.lat && cached.lon` (`src/dashboard/utils/geolocation.js:483`).
- **Recommendation**: Use nullish checks (`== null`) and `Number.isFinite`.

### [MINOR] Graph “Reset zoom” binds a new D3 zoom behavior

- **File**: `src/dashboard/components/RadialGraph.jsx:458`
- **Category**: logic
- **Issue**: The button calls `d3.zoom().transform` on a freshly constructed zoom, not the instance attached in the effect (`:229`). Same pattern in `src/dashboard/components/BipartiteGraph.jsx:848`. Reset does not restore the view.
- **Recommendation**: Keep the zoom behavior in a ref and call `.transform` on that instance.

### [MINOR] “Clear All Data” does not clear settings as advertised

- **File**: `src/dashboard/utils/db.js:226`
- **Category**: logic
- **Issue**: `clearAllData` clears `footprints` and `geoCache` and explicitly keeps IndexedDB settings. Copy in `src/dashboard/components/SettingsSheet.jsx:382` promises deletion of settings/preferences. `excludedDomains` / `isPaused` in `chrome.storage.local` are also left intact.
- **Recommendation**: Align implementation with copy, or change the copy. If full reset is intended, clear both Dexie `settings` and `chrome.storage.local`.

### [MINOR] Blob object URLs never revoked on CSV export

- **File**: `src/dashboard/components/DataTable.jsx:235`
- **Category**: resource leaks
- **Issue**: `URL.createObjectURL` is not followed by `revokeObjectURL`. `src/dashboard/components/BipartiteGraph.jsx:757` has the same leak on CSV (PNG/SVG paths do revoke).
- **Recommendation**: Revoke after click, or use `link.click()` then `URL.revokeObjectURL`.

### [MINOR] Table page index not clamped when the result set shrinks

- **File**: `src/dashboard/components/DataTable.jsx:159`
- **Category**: off-by-one
- **Issue**: `currentPage` resets only when `search` changes (`:166`). Changing the sidebar time filter (or grouping via `geoMap`) can leave `currentPage` past `totalPages`, rendering an empty table.
- **Recommendation**: Clamp `currentPage` to `totalPages` whenever `groupedData` or `itemsPerPage` changes.

### [MINOR] Map geo load races and loading flag leak

- **File**: `src/dashboard/components/MapView.jsx:42`
- **Category**: races / unchecked errors
- **Issue**: `loadGeoData` has no abort/generation token; overlapping runs can `setGeoData` out of order after unmount or footprint updates. `handleClearCache` (`:344`) sets `isLoadingGeo` true and only clears it on the success path, so a thrown `fetchBulkGeolocation` leaves the overlay stuck.
- **Recommendation**: Ignore stale results (cancelled flag / seq number); `setIsLoadingGeo(false)` in `finally`.

### [MINOR] Bipartite CSV export lacks formula-injection escaping

- **File**: `src/dashboard/components/BipartiteGraph.jsx:741`
- **Category**: injection
- **Issue**: Local `escapeCSV` only doubles quotes. Data Table’s `escapeCSV` (`src/dashboard/components/DataTable.jsx:13`, covered by `tests/unit/csv-export.test.js`) prefixes `= + - @`. Domain/platform fields can become spreadsheet formulas when the CSV is opened in Excel.
- **Recommendation**: Reuse Data Table `escapeCSV`.

### [MINOR] Duplicate tracker host keys overwrite platform attribution

- **File**: `src/lib/pixel-detector.js:185`
- **Category**: logic
- **Issue**: `ads.yahoo.com` and `pixel.advertising.com` appear under both `yahoo` (`:185–186`) and `verizon` (`:514`, `:517`). `DOMAIN_TO_PLATFORM_MAP` (`:570`) last-writer-wins, so Yahoo DSP hits are labeled Verizon Media.
- **Recommendation**: Unique keys per platform; disambiguate with path rules.

### [MINOR] Geo queue `isProcessing` not reset on throw

- **File**: `src/lib/geo-queue.js:220`
- **Category**: races / resource leaks
- **Issue**: `isProcessing = true` is cleared only after the `while` loop. An unexpected throw leaves the queue permanently stalled. The dashboard copy (`src/dashboard/utils/geolocation.js:426`) has the same structure. `clearPendingQueue` (`src/lib/geo-queue.js:290`) drops items without rejecting their promises.
- **Recommendation**: `try/finally` to clear the flag; reject or resolve leftover promises on clear.

### [MINOR] Unhandled promise from screenshot clipboard copy

- **File**: `src/dashboard/components/ScreenshotModal.jsx:106`
- **Category**: unchecked errors
- **Issue**: `canvas.toBlob(async blob => { await navigator.clipboard.write(...) })` — rejections inside the callback are not handled by the outer `try/catch`. `toBlob` may also yield `null`.
- **Recommendation**: Handle errors inside the callback; check `blob` before `ClipboardItem`.

### [MINOR] Data table geo cache load has no error handling

- **File**: `src/dashboard/components/DataTable.jsx:31`
- **Category**: unchecked errors / races
- **Issue**: `loadGeo` awaits `Promise.all(getGeoCache(...))`. Dashboard `getGeoCache` throws on Dexie failure (`src/dashboard/utils/db.js:191`), so the rejection is unhandled. A later `footprints` change can also complete an older request last.
- **Recommendation**: try/catch per domain or on the batch; ignore stale generations.

### [INFO] Geo JSON deserialized without a schema

- **File**: `src/dashboard/utils/geolocation.js:257`
- **Category**: unvalidated deserialization
- **Issue**: `response.json()` is trusted when `data.status === 'success'`. Non-numeric `lat`/`lon` or unexpected types flow into cache and the map. Same in `src/lib/geo-queue.js:113`.
- **Recommendation**: Validate types/ranges before cache write.

### [INFO] `geo-queue` debug logging left on; in-memory rate limit

- **File**: `src/lib/geo-queue.js:15`
- **Category**: races (MV3 lifecycle)
- **Issue**: `DEBUG_MODE = true` logs lookup URLs. `requestTimestamps` / `pendingQueue` (`:18–20`) live only in memory; a service worker would lose them on termination. The SW currently does not import this module; the dashboard queue has the same in-memory pending list.
- **Recommendation**: Default debug off; persist rate-limit state (dashboard already persists timestamps).

### [INFO] `hashWithSalt` does not type-check inputs

- **File**: `src/lib/crypto.js:52`
- **Category**: null/undefined on external input
- **Issue**: `hashFacebookID` rejects non-strings (`:14`); `hashWithSalt` concatenates `data + salt`, so `undefined`/`null` become the strings `"undefined"`/`"null"`.
- **Recommendation**: Same guard as `hashFacebookID`.

---

## Checklist coverage (no finding)

| Item | Notes |
| ---- | ----- |
| Authn of SW messages | `sender.id !== chrome.runtime.id` rejected (`src/background/service-worker.js:176`). |
| Hardcoded credentials | None found. |
| SQL/shell/path injection | No SQL/shell. Build helper git commands are fixed strings (`scripts/build-helper.js:20`). |
| Landing page | Static HTML/CSS; no extension runtime bugs. Remote Lucide/unpkg on the marketing page is supply-chain risk, out of BUG-runtime scope. |

## Limitations

- Static read-only review; Chrome with an unpacked `dist/` build was not executed.
- `dist/` and `node_modules` were not scanned.
- CSS was counted in the file total; no CSS-only logic bugs reported.
- Service worker no longer imports `geo-queue.js`; findings on that file apply if it is wired back in.
