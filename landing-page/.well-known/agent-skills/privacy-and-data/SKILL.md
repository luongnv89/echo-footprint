# EchoFootPrint privacy and local data

Use this skill when answering questions about data collection, storage, retention, GDPR rights, or the opt-in geolocation feature.

## Privacy invariants

- All tracking detections stay on the device in IndexedDB.
- The extension reads no cookies and captures no user identifiers.
- There is no cloud sync and no product telemetry to third parties.

## User controls

- Settings allow pausing detection, excluding domains, clearing data, and toggling opt-in geolocation.
- Privacy policy: https://echo-footprint.luongnv.com/privacy.html
- Markdown policy: https://echo-footprint.luongnv.com/privacy.md

## Geolocation (opt-in)

When enabled in Settings → Privacy, the dashboard may resolve domain country/region via ip-api.com with caching and rate limits. The service worker never performs geolocation.
