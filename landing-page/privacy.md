# EchoFootPrint — Privacy Policy

Your data stays **on your device.**

Last updated: November 2025 (GDPR refresh). EchoFootPrint has **no backend** — everything runs locally in your browser.

[← Back to home](https://echo-footprint.luongnv.com/)

## 0. Data controller and contact

- **Controller:** EchoFootPrint project maintainer
- **Contact:** open an issue at [github.com/luongnv89/echo-footprint](https://github.com/luongnv89/echo-footprint)

## 1. Data the extension accesses

While you browse, EchoFootPrint inspects pages to detect tracking pixels and related scripts. To do this, it may access and store locally:

- URL of the page you are visiting when a supported tracking pixel is detected.
- Domain names of third-party resources (e.g., ad and analytics scripts).
- Technical details: pixel type, platform label, and timestamp.

The extension does **not** read or store form contents, passwords, payment details, or other sensitive input fields.

## 2. Purpose and legal basis (GDPR)

- **Purpose:** a local view of tracking activity in your browser.
- **Legal basis:** Art. 6(1)(b) (requested service) and Art. 6(1)(f) (legitimate interest), applied strictly client-side.
- No automated decision-making or profiling beyond the on-device statistics you control.

## 3. Storage and processing

- All data stays **locally on your device** in IndexedDB.
- No data is sent to external servers or cloud storage, **except** the optional map lookup you control (Section 4).
- Nothing else leaves your device unless you export it.

## 4. Sharing and subprocessors

- **Optional map geolocation (off by default).** Only when you enable it in Settings → Privacy does the extension send **domain names** to [ip-api.com](https://ip-api.com) for approximate location. Results are cached locally for 7 days (45 req/min limit); disable or clear anytime in Settings.
- No sharing with advertisers, data brokers, or other third parties.
- No other subprocessors. There is no backend.

## 5. Retention

- Data persists locally until you clear it in Settings or uninstall the extension.
- Uninstalling removes local storage (IndexedDB) and deletes the data.

## 6. Your controls and rights

Inside the extension:

- Clear all stored detections from Settings.
- Export your data (e.g., CSV) for your own use.

GDPR rights (where applicable) — access, rectification, erasure, restriction, objection, portability — are exercised with the in-extension delete/export tools or by uninstalling, since data never leaves your device. You may also lodge a complaint with your supervisory authority.

## 7. Permissions

- Page access is used only to observe when known tracking pixels load.
- Local storage (IndexedDB) saves detection history and settings on your device.
- The extension injects no trackers and sends no telemetry.

## 8. Changes to this policy

Policy updates are published in the repository. Material changes are noted in the Chrome Web Store listing when required.

## 9. Contact

For privacy questions, open an issue at [github.com/luongnv89/echo-footprint](https://github.com/luongnv89/echo-footprint). Since data does not leave your device, you may be asked to use the in-extension export/delete features to fulfil your request.
