# Development Task Plan – EchoFootPrint

_Source docs: `phase-1-requirements/prd.md`, `phase-1-requirements/tad.md`, `phase-1-requirements/ux_design.md`, `phase-1-requirements/brand_kit.md`, and `IMPLEMENTATION_GUIDE.md`._

## Phase 0: Proof of Concept – Pixel Detection Core

**✅ STATUS: COMPLETED (November 12, 2025)**

**Summary:** All Phase 0 tasks successfully completed. Core pixel detection, content script messaging, and service worker relay are functional. Tests passing (16/17 total). Ready for Sprint 1.

### Task: Bootstrap Extension Workspace ✅
- **Description:** Initialize the repo with Vite-based build, Manifest V3 scaffolding, linting, and GitHub Actions skeleton as outlined in the implementation guide.
- **Acceptance Criteria:**
  - `pnpm install`/`npm install` succeeds with dependencies from IMPLEMENTATION_GUIDE.
  - Vite dev build produces loadable extension folder.
  - GitHub Action workflow passes lint/test placeholder jobs.

### Task: Content Script Pixel Sniffer
- **Description:** Implement minimal content script that detects `connect.facebook.net` script tags and `fbcdn.net` requests, then logs results to console (no storage yet) to validate feasibility per PRD technical assumptions.
- **Acceptance Criteria:**
  - Visiting a test page with Meta Pixel logs detection events in DevTools.
  - Detection latency <100 ms per page in synthetic test.
  - Works on Chrome 120+ and Edge 120+ in developer mode.
- **Dependencies:** Bootstrap Extension Workspace.

### Task: Service Worker Event Relay (POC)
- **Description:** Wire content script messages to the service worker and persist to an in-memory queue to confirm MV3 messaging reliability.
- **Acceptance Criteria:**
  - Messages arrive even when service worker wakes from cold start.
  - Queue flushes to console for inspection.
  - Error handling for missing payloads logged via `chrome.runtime.lastError`.
- **Dependencies:** Content Script Pixel Sniffer.

## Sprint 1: MVP – Silent Detection, Storage, Radial Dashboard

### Task: IndexedDB Storage Layer
- **Description:** Implement Dexie models (`footprints`, `settings`, `geoCache`) with schema/indexes defined in PRD and TAD; include hashing of Facebook ID via Web Crypto.
- **Acceptance Criteria:**
  - Facebook `c_user` cookie hashed SHA-256 + salt before storage.
  - IndexedDB persists ≥10k records, soft cap warnings at 80% of 500 MB.
  - Unit tests cover insert/query/update flows (Vitest).
- **Dependencies:** Service Worker Event Relay.

### Task: Silent Facebook ID Detection
- **Description:** Build background logic that captures `c_user` cookie on first facebook.com visit, hashes it, and seeds the dashboard identity state.
- **Acceptance Criteria:**
  - Works without user prompts; handles missing login gracefully with UX message hook.
  - Stores hashed ID in `settings` table only once per install.
  - Passes Chrome privacy review (minimal permissions `cookies`, `webNavigation`).
- **Dependencies:** IndexedDB Storage Layer.

### Task: Pixel Event Persistence + Geo Queue
- **Description:** Expand service worker to normalize events (timestamp, domain, pixelType), enqueue geolocation lookups via ip-api.com, and cache results locally.
- **Acceptance Criteria:**
  - Unique domain lookups limited to 45/min, fallback to “Unknown”.
  - Failed lookups retried with exponential backoff.
  - Geo cache hit rate reported in logs for QA.
- **Dependencies:** IndexedDB Storage Layer.

### Task: Dashboard Shell & Radial Graph
- **Description:** Implement React/Vite dashboard with sidebar, tab system, and D3 force-directed graph aligning with UX design.
- **Acceptance Criteria:**
  - Loads <1 s with ≤1k records (Lighthouse audit).
  - Nodes show tooltips (domain, hits, geo) and support drag, zoom, keyboard pan.
  - Empty state and tour copy match UX document.
- **Dependencies:** IndexedDB Storage Layer, Brand tokens.

### Task: Accessibility & Theming Foundations
- **Description:** Apply brand kit palette, typography tokens, and WCAG AA requirements across dashboard and popups.
- **Acceptance Criteria:**
  - All CTAs use documented colors; contrast validated via automated tests.
  - `prefers-reduced-motion` toggles static graph layout.
  - Keyboard navigation covers tabs, filters, share button, and modals.
- **Dependencies:** Dashboard Shell & Radial Graph, Brand Kit tokens.

### Task: QA & Packaging Pipeline for MVP
- **Description:** Configure GitHub Actions to lint, test, bundle, and produce Chrome/Firefox artifacts; include manual test checklist for Chrome Web Store submission.
- **Acceptance Criteria:**
  - CI workflow generates `echofootprint.zip` per IMPLEMENTATION_GUIDE.
  - Web-ext lint passes for Firefox branch.
  - Release checklist stored in repo (docs).
- **Dependencies:** All MVP features implemented.

## Sprint 2: Enhanced Insights & Sharing Loop

### Task: Geographic Map View (Leaflet)
- **Description:** Deliver Leaflet map with clustering, theme toggle, and region detail drawer as per UX Flow 2.
- **Acceptance Criteria:**
  - Map renders cached geo points with cluster counts.
  - Toggle between dark/light tiles without reload.
  - WCAG-compliant focus states for map controls.
- **Dependencies:** Pixel Event Persistence + Geo Queue.

### Task: Raw Data Table & Filters
- **Description:** Build sortable, filterable data table with search, pagination, and “Recent 7 Days / 30 Days / All Time / Custom” filters.
- **Acceptance Criteria:**
  - Sorting on any column <200 ms for 10k rows.
  - Filters persist via `chrome.storage.local`.
  - Empty state guidance for no results.
- **Dependencies:** IndexedDB Storage Layer.

### Task: Screenshot Sharing Modal
- **Description:** Implement share flow using html2canvas/offscreen canvas, blur toggles, and watermark per UX/PRD viral feature.
- **Acceptance Criteria:**
  - Generates 1920×1080 PNG <3 s with optional blur list.
  - Watermark “Made with EchoFootPrint” applied.
  - Error fallback message when rendering fails.
- **Dependencies:** Dashboard Shell & Radial Graph, Brand Voice.

### Task: CSV Export Pipeline
- **Description:** Add CSV export for filtered datasets with filename pattern `echofootprint_export_YYYY-MM-DD.csv`.
- **Acceptance Criteria:**
  - Export respects active filters and column order defined in PRD.
  - Files encoded UTF-8 with headers; downloads via `chrome.downloads` API.
  - Documented in help tooltip + README.
- **Dependencies:** Raw Data Table & Filters.

### Task: Settings Sheet & Clear Data Flow
- **Description:** Build settings drawer covering theme toggle, reduced motion, encryption opt-in, and “Clear All Data” confirmation with type-to-confirm.
- **Acceptance Criteria:**
  - Clear action wipes IndexedDB <500 ms and shows success toast.
  - Encryption passphrase flow hooks into Dexie wrappers (optional toggle).
  - Settings persisted between sessions.
- **Dependencies:** IndexedDB Storage Layer, Accessibility Foundations.

### Task: Marketing Microsite Alignment
- **Description:** Ship single-page marketing site (Cloudflare Pages) reflecting brand kit hero, messaging, and install CTAs.
- **Acceptance Criteria:**
  - Uses solid background, grid pattern, and palette tokens.
  - Embeds install badges, How It Works section, and privacy statement.
  - Lighthouse performance ≥90 desktop, ≥85 mobile.
- **Dependencies:** Brand Kit guidelines.

## Sprint 3: Hardening, Privacy Enhancements & GTM Support

### Task: Optional AES-GCM Data Encryption
- **Description:** Implement passphrase-based encryption for IndexedDB using Web Crypto per TAD, including key derivation and unlock UX.
- **Acceptance Criteria:**
  - When enabled, all stored records encrypted at rest.
  - Passphrase never stored; unlock prompt shows on dashboard open.
  - Comprehensive unit/integration tests for encrypt/decrypt flows.
- **Dependencies:** Settings Sheet & Clear Data Flow.

### Task: Diagnostics & Quota Management
- **Description:** Add background alarms to prune >12-month data, track storage usage, and surface quota warnings (PRD edge cases).
- **Acceptance Criteria:**
  - Warning banner at 80% quota; CTA to export/delete.
  - Automatic archival job runs via `chrome.alarms`.
  - Logs available via developer toggle.
- **Dependencies:** IndexedDB Storage Layer.

### Task: Accessibility + Localization Audit
- **Description:** Run full axe + manual screen reader audit; prep copy for future locales by externalizing strings.
- **Acceptance Criteria:**
  - All critical flows pass manual SR checks (VoiceOver/NVDA).
  - Strings stored in i18n JSON with default en-US.
  - Issues logged/resolved; report stored in repo.
- **Dependencies:** UX copy finalized.

### Task: Analytics-Lite Marketing Hooks
- **Description:** Integrate privacy-friendly Plausible on marketing site and optional opt-in anonymous diagnostics (local only) for product usage insights.
- **Acceptance Criteria:**
  - Marketing site events captured without cookies.
  - Extension diagnostics off by default; opt-in UI explains scope.
  - Documentation updated with telemetry stance (PRD privacy guarantees).
- **Dependencies:** Marketing Microsite Alignment.

### Task: Store Submission & Launch GTM Pack
- **Description:** Prepare Chrome/Firefox listings, screenshots (using share feature), press kit assets per brand guidelines, and coordinate GTM timeline.
- **Acceptance Criteria:**
  - Store metadata (title, description, icons) approved.
  - Press kit zip includes logos, screenshots, usage examples.
  - Launch checklist in repo referencing GTM milestones.
- **Dependencies:** Screenshot Sharing Modal, Marketing Microsite.

## Ambiguities / Clarifications Needed
- **ip-api HTTPS Proxy:** PRD mentions HTTP free tier; confirm if we must proxy through Cloudflare Worker for TLS from day one.
- **Encryption Priority:** Determine whether optional AES-GCM must ship with MVP or can remain Sprint 3 (current plan assumes later).
- **Localization Scope:** UX doc suggests future localization; need target languages and timeline before building tooling beyond placeholders.
- **Marketing Site Data Capture:** Clarify acceptable analytics tooling (Plausible suggested) and whether opt-in diagnostic data should sync beyond local logs.
