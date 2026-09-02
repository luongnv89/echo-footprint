# EchoFootPrint – Privacy Policy

![EchoFootPrint Logo](src/assets/logo.svg)

_Last updated: November 2025 (GDPR refresh)_

EchoFootPrint is a privacy-first browser extension that helps you understand how ad and analytics platforms track you across the web. The extension has **no backend**; everything runs locally in your browser. A static informational website (https://echo-footprint.luongnv.com/) hosts this policy and the project overview. It is a plain set of pages: the extension never sends it any data, and it is not needed for the extension to work.

## 0. Data Controller and Contact

- **Controller:** EchoFootPrint project maintainer
- **Contact:** Open an issue at https://github.com/luongnv89/echo-footprint or use the contact details in the repository.

## 1. Data the Extension Accesses

While you browse, EchoFootPrint inspects pages to detect tracking pixels and related scripts. To do this, the extension may access and store locally:

- URL of the page you are visiting when a supported tracking pixel is detected.
- Domain names of third-party resources (e.g., ad and analytics scripts).
- Technical details about the detection: pixel type/detection method, platform (ad/analytics network), and timestamp.

The extension does **not** read or store form contents, passwords, payment details, or other sensitive input fields.

## 2. Purpose and Legal Basis (GDPR)

- **Purpose:** Provide you with a local view of tracking activity (graphs, tables, stats) in your browser.
- **Legal basis:** Art. 6(1)(b) GDPR (performance of a service you request) and Art. 6(1)(f) GDPR (legitimate interest in understanding and limiting tracking), applied strictly client-side.
- No automated decision-making or profiling beyond the on-device statistics and visualizations you control.

## 3. How Data Is Stored and Processed

- All data stays **locally on your device** in your browser’s IndexedDB.
- No data is sent to external servers, third-party analytics, or cloud storage, **with one exception you control**: the optional Map View geolocation lookup described in Section 4. Nothing else leaves your device unless you export it.
- Aside from that optional lookup, no cross-border transfers occur because nothing else leaves your device unless you export it.

## 4. Sharing and Subprocessors

- **Optional Map View geolocation (off by default).** The Map View can resolve the approximate location of the sites you have tracked. This feature is **disabled by default**. Only when you explicitly enable it in Settings → Privacy does the extension send the **domain names** of tracked sites to the ip-api.com geolocation service (https://ip-api.com) over HTTPS to fetch their approximate location. As with any web request, the lookup itself reveals your IP address to that service; no page contents, cookie data, or your stored detection history are ever sent. Results are cached locally for 7 days, the lookup respects a 45 requests/minute limit, and you can disable the feature or clear the cache at any time in Settings.
- The extension does **not** share data with advertisers, data brokers, or other third parties.
- No other subprocessors are used. There is no backend.

## 5. Retention

- Data persists locally until you clear it in Settings or uninstall the extension.
- Uninstalling the extension removes its local storage (IndexedDB) and deletes the data.

## 6. User Controls and Data Subject Rights

Inside the extension:

- Clear all stored detections from Settings (danger zone / clear data).
- Export your data (e.g., CSV) for your own use.

GDPR rights (where applicable):

- Access, rectification, erasure, restriction, objection, and data portability.
- Because data never leaves your device, exercising these rights generally means using the in-extension delete/export tools or uninstalling the extension.
- You may lodge a complaint with your supervisory authority if you believe your rights are violated.

## 7. Permissions

- Page access is used only to observe and log when known tracking pixels load.
- Local storage (IndexedDB) is used to save detection history and settings on your device.
- The extension does not inject additional trackers or send telemetry.

## 8. Changes to This Policy

Policy updates are published in the repository. Material changes will be noted in the Chrome Web Store listing when required.

## 9. Contact

For privacy questions or requests, open an issue at https://github.com/luongnv89/echo-footprint. Since data does not leave your device, you may be asked to use the in-extension export/delete features to fulfill your request.
