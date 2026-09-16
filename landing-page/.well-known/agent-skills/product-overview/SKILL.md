# EchoFootPrint product overview

Use this skill when an agent or user asks what EchoFootPrint is, how local pixel detection works, or how the dashboard visualizes cross-site tracking.

## Summary

EchoFootPrint is a privacy-first Manifest V3 browser extension. It detects tracking pixels from 50 major ad and analytics platforms on pages you visit, stores detections locally in IndexedDB, and visualizes relationships in a client-side dashboard. No accounts, no cloud sync, and no external telemetry.

## Key points

- Content script scans scripts, images, and iframes; deduplicates by platform, pixel type, and source URL.
- Service worker persists sanitized events and drives the toolbar badge (today's count, pause state).
- Dashboard views: radial graph, bipartite graph, opt-in map (ip-api.com), and sortable data table with CSV export.
- Geolocation is opt-in and off by default; it is the only optional network call from the dashboard.

## Canonical links

- Site: https://echo-footprint.luongnv.com/
- Machine-readable overview: https://echo-footprint.luongnv.com/llms.txt
- Source: https://github.com/luongnv89/echo-footprint
