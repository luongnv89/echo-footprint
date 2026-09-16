# EchoFootPrint — See who tracks you across the web

> Privacy-first · Local-only browser extension that reveals cross-site tracking from 50 major ad and analytics platforms. Zero configuration, zero accounts, zero telemetry.

[Install on Chrome Web Store](https://chromewebstore.google.com/detail/pbabepaamiligomhlcmkjabhmkmaekci?utm_source=item-share-cb) · [Source on GitHub](https://github.com/luongnv89/echo-footprint) · [Privacy Policy](https://echo-footprint.luongnv.com/privacy.html)

## At a glance

| | |
| --- | --- |
| **Platforms detected** | 50 |
| **Dashboard views** | 4 (graph, bipartite, map, table) |
| **Data on servers** | 0 — everything stays on your device |
| **Detection latency** | &lt;100ms per page |

## How it works

Browse normally. EchoFootPrint runs silently in the background with nothing to configure.

**Detected locally.** Tracking pixels are matched on your device and stored in local IndexedDB.

**Visualized instantly.** Switch between radial graph, bipartite graph, map, and data table views to read your footprint.

## Dashboard views

- **Radial graph** — Your cross-site footprint at a glance (central you node, connected domains).
- **Bipartite graph** — Domain-to-platform relationships with filtering, sorting, and PNG/SVG/CSV export.
- **Map view** — Geographic visualization with clustering; geolocation is strictly opt-in (off by default).
- **Data table** — Sortable, filterable raw detections with CSV export.
- **Settings** — Privacy controls, optional geo opt-in, clear-all data.

Screenshots: [v1.3.0 release](https://github.com/luongnv89/echo-footprint/releases/tag/v1.3.0).

## Platform coverage

EchoFootPrint detects pixels from 50 platforms across social, search, ad exchanges, DSPs, mobile, and data brokers — including Facebook/Meta, Google, Twitter/X, LinkedIn, TikTok, Amazon, Criteo, The Trade Desk, and more.

## Privacy first

Your browsing data never leaves this device.

- 100% local IndexedDB storage
- Geolocation strictly behind your opt-in
- One-click wipe in Settings, anytime

[Read the full Privacy Policy](https://echo-footprint.luongnv.com/privacy.html).

## Latest release (v1.3.0)

A sharper, faster dashboard — instrument-panel redesign, reliable keyless map, lazy-loaded views on React 19. [Release notes](https://github.com/luongnv89/echo-footprint/releases/tag/v1.3.0).

## FAQ

**Does EchoFootPrint block trackers?**  
No — it makes tracking visible so you can see the ecosystem. Pair it with a blocker if you want to stop requests.

**What data is stored?**  
Detected domains, URLs, timestamps, pixel types, and platform labels — stored locally in IndexedDB on your device.

**Is anything sent to servers?**  
No telemetry, ever. The only network call outside page loads is the strictly opt-in map geolocation lookup (ip-api.com), cached locally for 7 days.

**Can I clear my data?**  
Yes — Settings → Clear All Data removes detections, the geo cache, and preferences. Uninstalling removes everything.

**Which browsers are supported?**  
Chromium browsers via Manifest V3 — Chrome, Edge, and others. Firefox support is planned separately.

## Install

Free, private, and installed in seconds: [Chrome Web Store](https://chromewebstore.google.com/detail/pbabepaamiligomhlcmkjabhmkmaekci?utm_source=item-share-cb).
