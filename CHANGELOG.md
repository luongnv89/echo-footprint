# Changelog

## v1.3.0 — 2026-09-16

### Features
- Redesign dashboard UI around a token-based instrument-panel theme (#76) @luongnv89
- Host landing page on GitHub Pages with custom domain @luongnv89

### Bug Fixes
- Restore geo lookups and Leaflet init on Map tab (#79) @luongnv89
- Replace CARTO basemap with keyless OSM tiles (#78) @luongnv89
- Replace hardcoded 1.1.0 with manifest.json fallback (#74) @luongnv89
- Align docs with shipped code (#73) @luongnv89
- Fix tab ids pairing, empty-state copy, view subtitle (#72) @luongnv89
- Harden matchesDomainPattern against ReDoS (#71) @luongnv89
- Pin landing-page lucide with SRI hash (#66) @luongnv89
- Remove as.us.criteo.com from smartyads; align CI with coverage (#63) @luongnv89
- Honor pause/exclusions in observer and record every platform (#53) @luongnv89
- Gate map geolocation behind opt-in and sanitize popups (#52) @luongnv89
- Pin trufflehog to release SHA (#51) @luongnv89
- Fix missing logo @luongnv89

### Performance
- Parallelize MapView cache reads and URL scan (#70) @luongnv89

### Documentation
- Update CWS checklist with live GitHub Pages URL @luongnv89

### Dependencies
- Bump React 18 → 19 (#60) @luongnv89
- Bump Vite 5 → 8 and @vitejs/plugin-react 4 → 5 (#59) @luongnv89
- Bump dexie 4.2.1 → 4.4.5 and dexie-react-hooks 4.2.0 → 4.4.0 (#54) @luongnv89
- Patch audit transitives: vitest 3.2.7, sharp 0.35.4 (#50) @luongnv89

### Other Changes
- Rebuild radial graph incrementally with keyed data-join (#69) @luongnv89
- Replace full-table toArray aggregations with indexed queries (#68) @luongnv89
- Lazy-load graph, map, table, and bipartite views (#67) @luongnv89
- Split App.jsx and extract TRACKING_PLATFORMS (#65) @luongnv89
- Rename detectFacebookPixel* to detectAllPlatforms*; extract pure helper (#64) @luongnv89
- Unify Dexie schema and remove dead code (#62) @luongnv89
- Split BipartiteGraph and add characterization tests (#61) @luongnv89
- Migrate ESLint 8 to 9 flat config (#58) @luongnv89
- Move CI and engines.node to Node 24 LTS (#57) @luongnv89
- Make npm audit a real gate with deferred allowlist (#56) @luongnv89
- Swap upload-release-asset@v1 for action-gh-release (#55) @luongnv89
- Stabilize P0 build and CI config (#49) @luongnv89
- Add INSTALL/AGENTS notes, fix npm commands in CLAUDE.md (#48) @luongnv89
- Add Product Hunt badge to landing page hero section @luongnv89
- Add landing page @luongnv89
- Update map view @luongnv89

**Full Changelog**: https://github.com/luongnv89/echo-footprint/compare/v1.2.0...v1.3.0
