# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EchoFootPrint** is a privacy-first browser extension that visualizes Facebook/Meta tracking across the web through an interactive client-side dashboard. The extension operates with zero configuration, storing all data locally in IndexedDB with no external telemetry.

**Key Principles:**
- **Privacy-first:** All data stays local, no cloud sync, optional AES-GCM encryption
- **Zero configuration:** Works silently from installation with no user setup
- **Manifest V3:** Modern Chrome extension architecture with service workers
- **Open source:** MIT licensed with transparency as a core value

## Architecture Overview

### Extension Components

1. **Content Script** (`src/content/content-script.js`)
   - Injected into all web pages via `<all_urls>` permission
   - Detects Facebook Pixel by monitoring DOM for `connect.facebook.net` and `fbcdn.net` scripts
   - Captures Facebook ID from `c_user` cookie on facebook.com visits
   - Sends events to service worker via `chrome.runtime.sendMessage`
   - Must maintain <100ms detection latency per page

2. **Service Worker** (`src/background/service-worker.js`)
   - Manifest V3 event-driven background script
   - Receives pixel detection events and persists to IndexedDB
   - Hashes Facebook IDs with SHA-256 before storage
   - Manages geolocation queue (ip-api.com, 45 req/min limit)
   - Implements exponential backoff for failed geo lookups
   - **Critical:** State must be persisted to IndexedDB (service workers terminate)

3. **Dashboard UI** (`src/dashboard/`)
   - React 18 + Vite single-page application
   - Opens in new tab when extension icon clicked
   - Three main views:
     - **Radial Graph:** D3.js v7 force-directed visualization (central user node, connected domain nodes)
     - **Map View:** Leaflet 1.9.x geographic visualization with clustering
     - **Data Table:** Sortable/filterable raw data with CSV export
   - Must load <1s for ≤1k records, <3s for 10k records

### Data Architecture

**IndexedDB Schema (via Dexie.js):**

```javascript
// src/dashboard/utils/db.js
db.version(1).stores({
  footprints: '++id, timestamp, domain, url, pixelType, ipGeo',
  settings: 'key',
  geoCache: 'domain, country, region'
});
```

**Key Indexes:**
- `timestamp`: For time-range filters (7 days, 30 days, all time)
- `domain`: For aggregation and deduplication

**Storage Limits:**
- Soft cap: 500MB with warning at 80%
- Data retention: User-controlled via "Clear All" button
- Background cleanup: Optional >12-month archival via `chrome.alarms`

### Critical Technical Constraints

**Manifest V3 Limitations:**
- Service workers are short-lived; never rely on in-memory state
- Must use IndexedDB or `chrome.storage.local` (10MB limit unsuitable for records)
- WebAssembly blocked (can't use argon2; use Web Crypto API for encryption)
- All code must be bundled (no remote code execution)

**Performance Targets:**
- Pixel detection: <100ms per page
- Dashboard load: <1s (1k records), <3s (10k records)
- Graph rendering: 60fps (500 nodes), 30fps (1000+ nodes)
- Service worker memory: <5MB
- Dashboard memory: <50MB (1k nodes)

**Browser Permissions (minimal):**
```json
{
  "permissions": ["storage", "webNavigation"],
  "host_permissions": ["http://*/*", "https://*/*"]
}
```

## Development Workflow

### Setup

```bash
# Install dependencies (pnpm preferred)
pnpm install

# Dev mode (loads unpacked extension)
pnpm dev

# Production build
pnpm build

# Lint and format
pnpm lint
pnpm format

# Run tests
pnpm test

# Package for distribution
pnpm zip  # Outputs dist/echofootprint.zip
```

### Project Structure

```
src/
├── background/
│   └── service-worker.js          # MV3 service worker
├── content/
│   └── content-script.js          # Injected into pages
├── dashboard/
│   ├── index.html                 # Dashboard entry
│   ├── main.js                    # React app initialization
│   ├── components/
│   │   ├── RadialGraph.js         # D3 force graph
│   │   ├── MapView.js             # Leaflet map
│   │   ├── DataTable.js           # Raw data table
│   │   └── FilterBar.js           # Time filters
│   └── utils/
│       ├── db.js                  # Dexie wrapper
│       ├── crypto.js              # SHA-256, AES-GCM
│       └── export.js              # CSV export
├── lib/
│   └── pixel-detector.js          # Core detection logic
└── assets/                        # Icons, images
```

### Building and Testing

**Load Extension Locally (Chrome):**
1. Run `pnpm build` to create `dist/` folder
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `dist/` folder

**Testing Pixel Detection:**
- Visit sites with Facebook Pixel (e.g., major e-commerce sites)
- Open extension dashboard to verify domains appear
- Check service worker logs: `chrome://extensions` → "Inspect views: service worker"

**Performance Testing:**
```bash
# Generate synthetic load (10k records)
node scripts/generate-test-data.js

# Run Lighthouse audit
pnpm lighthouse
```

## Key Technical Decisions

### Why Dexie.js over raw IndexedDB?
- Simplifies schema management and version migrations
- Promise-based API integrates with React hooks
- Handles quota exceeded errors gracefully
- Well-tested in production extensions (200+ GitHub references)

### Why D3.js for graph visualization?
- Industry standard for force-directed layouts
- Handles 500+ nodes at 60fps with proper optimization
- Rich ecosystem of examples (Observable HQ)
- Better performance than Three.js for 2D use case

### Why Leaflet over Mapbox GL JS?
- Smaller bundle size (~40KB vs ~200KB)
- No API key required for basic tiles
- Better accessibility support
- Simpler API for clustering use case

### Why React for dashboard (not vanilla JS)?
- Complex state management (filters, pagination, settings)
- Component reusability across graph/map/table views
- Better developer experience for future contributors
- Bundle size <150KB acceptable for dashboard-only usage

## Common Development Tasks

### Adding a New Pixel Detection Pattern

1. Update `src/lib/pixel-detector.js`:
```javascript
export function detectFacebookPixel() {
  const fbDomains = [
    'connect.facebook.net',
    'fbcdn.net',
    'facebook.com/tr',
    // Add new pattern here
  ];
  // Detection logic...
}
```

2. Add test case in `tests/unit/pixel-detector.test.js`
3. Update PRD documentation if behavior changes

### Modifying IndexedDB Schema

1. Increment version in `src/dashboard/utils/db.js`:
```javascript
db.version(2).stores({
  footprints: '++id, timestamp, domain, url, pixelType, ipGeo, newField',
  // ...
}).upgrade(tx => {
  // Migration logic for existing records
});
```

2. Test migration with existing data
3. Document breaking changes in CHANGELOG

### Adding a New Dashboard View

1. Create component in `src/dashboard/components/NewView.js`
2. Register tab in `src/dashboard/main.js`
3. Query data via Dexie hooks:
```javascript
const { data } = useLiveQuery(() => db.footprints.toArray());
```
4. Follow WCAG 2.1 AA guidelines (keyboard nav, ARIA labels, color contrast)

### Implementing Geolocation Cache

**Service worker pattern:**
```javascript
async function handlePixelDetection(data) {
  const cachedGeo = await db.geoCache.get(data.domain);
  if (!cachedGeo) {
    const geo = await fetchGeolocation(data.domain);
    await db.geoCache.add({ domain: data.domain, ...geo });
  }
  // Store footprint...
}
```

**Rate limiting (45 req/min):**
- Use queue with timestamps
- Implement exponential backoff on 429 errors
- Fall back to "Unknown" after 3 retries

## Security Best Practices

### Facebook ID Hashing
```javascript
// src/dashboard/utils/crypto.js
async function hashFacebookID(userId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Optional AES-GCM Encryption
- User-provided passphrase (never stored)
- PBKDF2 key derivation (100k iterations)
- Encrypt before writing to IndexedDB
- Unlock prompt on dashboard open

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

## Accessibility Requirements

**WCAG 2.1 AA Compliance:**
- All interactive elements keyboard accessible (Tab, Enter, Esc)
- Color contrast ≥4.5:1 for text, ≥3:1 for large text
- ARIA labels on all graph nodes and map markers
- Focus indicators visible on all controls
- `prefers-reduced-motion` disables animations
- Screen reader tested (VoiceOver, NVDA)

**Dark Mode by Default:**
- Background: `#1a1a1a`
- Text: `#e0e0e0`
- Accent: `#00d4aa`
- Light mode toggle available in settings

## Release Process

### Versioning
Follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes (schema migrations, permission changes)
- MINOR: New features (map view, encryption)
- PATCH: Bug fixes, performance improvements

### Pre-release Checklist
- [ ] All tests passing (`pnpm test`)
- [ ] Lighthouse performance ≥90
- [ ] Accessibility audit passed (axe + manual SR)
- [ ] Memory leak check (Chrome DevTools)
- [ ] Cross-browser test (Chrome, Edge, Firefox)
- [ ] Update version in `manifest.json`
- [ ] Update CHANGELOG.md
- [ ] Create GitHub release with notes

### Chrome Web Store Submission
```bash
pnpm build
pnpm zip
# Upload dist/echofootprint.zip to Chrome Web Store dashboard
```

### Firefox AMO Submission
```bash
# Build Firefox variant (Manifest V2 fallback branch)
git checkout firefox-mv2
pnpm build:firefox
web-ext lint
# Submit to addons.mozilla.org
```

## Important Files

### Configuration
- `manifest.json` - Extension permissions and entry points (Chrome/Edge)
- `vite.config.js` - Build configuration for bundling
- `package.json` - Dependencies and scripts
- `.eslintrc.js` - Linting rules
- `.prettierrc` - Code formatting

### Documentation
- `phase-1-requirements/prd.md` - Product requirements (feature specs, acceptance criteria)
- `phase-1-requirements/tad.md` - Technical architecture (system design, security)
- `phase-1-requirements/IMPLEMENTATION_GUIDE.md` - Step-by-step development guide
- `phase-1-requirements/ux_design.md` - UX flows and copy
- `phase-1-requirements/brand_kit.md` - Design tokens and visual identity
- `tasks.md` - Sprint plan and task breakdown
- `AGENTS.md` - AI agent operating rules for development

## Gotchas and Known Issues

### Service Worker Termination
**Problem:** Service worker terminates after 30s of inactivity
**Solution:** Always persist state to IndexedDB; never rely on global variables

### Content Script Injection Timing
**Problem:** Script may inject before DOM ready
**Solution:** Use `run_at: "document_end"` in manifest and listen for DOMContentLoaded

### D3 Performance Degradation
**Problem:** Graph lags with 1000+ nodes
**Solution:** Implement node clustering or limit visible nodes; use `requestAnimationFrame`

### IndexedDB Quota Exceeded
**Problem:** Writes fail when storage full
**Solution:** Monitor `navigator.storage.estimate()`, show warning at 80%, enforce 500MB cap

### Geo API Rate Limiting
**Problem:** ip-api.com returns 429 (45 req/min limit)
**Solution:** Cache all results, implement exponential backoff, display "Unknown" gracefully

### Ad Blocker Interference
**Problem:** uBlock Origin may block Facebook domains before detection
**Solution:** Document compatibility; detection runs before blocking in most cases

## Reference Links

### Technical Documentation
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Dexie.js Documentation](https://dexie.org/docs/)
- [D3.js Force-Directed Graph](https://observablehq.com/@d3/force-directed-graph)
- [Leaflet.js Reference](https://leafletjs.com/reference.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

### Inspiration Projects
- [Lightbeam (archived)](https://github.com/mozilla/lightbeam-we) - Original tracker visualizer
- [Privacy Badger](https://github.com/EFForg/privacybadger) - Algorithmic blocking
- [Ghostery](https://github.com/ghostery/ghostery-extension) - Commercial tracker blocker

### Community Resources
- [r/privacy](https://reddit.com/r/privacy) - Privacy community
- [Chrome Extension Developers](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [HackerNews](https://news.ycombinator.com) - Launch platform

## Notes for Future Claude Instances

1. **Prioritize Privacy:** Every feature must maintain zero external telemetry; local storage only
2. **Performance is Critical:** Users uninstall slow extensions immediately (<100ms detection is non-negotiable)
3. **Accessibility is Not Optional:** WCAG 2.1 AA compliance required for all UI changes
4. **Code Quality Over Speed:** This is open source; code will be reviewed by privacy community
5. **Document Edge Cases:** The PRD Appendix Round 4 lists 10 critical edge cases to handle
6. **Test Across Browsers:** Chrome, Edge, Firefox have different IndexedDB quota behaviors
7. **Respect User Bandwidth:** Service worker runs on every page load; keep code minimal
8. **Bundle Size Matters:** Dashboard target <150KB compressed; lazy-load D3/Leaflet if possible
9. **Follow Existing Patterns:** Check IMPLEMENTATION_GUIDE before inventing new abstractions
10. **Security Review Required:** Any crypto or storage changes need manual review before release

## Current Project Status

**Phase:** Pre-development (planning complete)
**Next Milestone:** Bootstrap extension workspace and implement content script pixel sniffer
**Target Launch:** Q1 2026

The repository currently contains comprehensive planning documents but no implementation yet. When beginning development, start with Phase 0 tasks in `tasks.md` (Bootstrap Extension Workspace → Content Script Pixel Sniffer → Service Worker Event Relay).
