# Security TODO List

Tracking remediation tasks from `dev-docs/SECURITY_REMEDIATION_PLAN.md`.

## v1.1.2 Security Patch (P0/P1)
- [x] SEC-001 Unvalidated External Links (XSS)
  - [x] Add `src/dashboard/utils/security.js` with `sanitizeUrl` and `isSafeUrl`
  - [x] Update `src/dashboard/components/DataTable.jsx` to use sanitized links and unsafe indicator
  - [x] Add CSS indicator styles in `src/dashboard/styles/DataTable.css`
  - [x] Add unit tests in `tests/unit/security.test.js`
- [x] SEC-002 CSV Injection Vulnerability
  - [x] Harden `escapeCSV` in `src/dashboard/components/DataTable.jsx`
  - [x] Add unit tests in `tests/unit/csv-export.test.js`
  - [x] Add export-button tooltip copy for CSV safety
- [ ] SEC-003 Incomplete CSP Directives
  - [x] Update `manifest.json` CSP (default-src, script-src, style-src, img-src, connect-src, font-src, object-src)
  - [ ] Verify Leaflet/map tiles load without CSP violations
  - [x] Document CSP in `dev-docs/SECURITY_AUDIT.md`
- [ ] Testing and release tasks
  - [x] Unit tests: URL sanitization
  - [x] Unit tests: CSV injection prevention
  - [x] Unit tests: Domain pattern matching
  - [ ] Integration/manual: CSP check, Leaflet map load, XSS block, CSV formula block, pause/resume, domain exclusions
  - [ ] Update security findings, release notes, and submit v1.1.2 to store

## v1.2.0 Feature Release (P2)
- [x] SEC-004 Over-broad Host Permissions
  - [x] Add excluded domains UI in `src/dashboard/components/SettingsSheet.jsx`
  - [x] Add domain exclusion logic in `src/content/content-script.js`
  - [x] Document host permission rationale in `manifest.json` comment and `dev-docs/chrome-web-store-listing.md`
- [x] SEC-005 No Runtime Permission Controls
  - [x] Add global pause toggle UI in `src/dashboard/components/SettingsSheet.jsx`
  - [x] Honor pause state in `src/content/content-script.js`
  - [x] Badge indicator + keyboard shortcut wiring in `src/background/service-worker.js` and `manifest.json`
- [ ] Release prep
  - [x] Settings panel redesign and docs for new controls
  - [ ] Integration tests for exclusions and pause state
  - [x] Update Chrome Web Store listing with new controls

## Success Metrics Check
- [ ] Zero high/critical vulns post-release
- [ ] Maintain functionality regression-free (<1% perf impact from sanitization)
- [ ] Pause/exclusion controls verified via user feedback or QA notes
