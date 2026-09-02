# Chrome Web Store Listing – EchoFootPrint

This document contains copy and configuration you can paste into the Chrome Web Store Developer Dashboard when creating or updating the EchoFootPrint listing.

---

## Basic Info

- **Extension name:** EchoFootPrint  
- **Version:** 1.3.0  
- **Category:** Privacy & security  
- **Primary language:** English (United States)  

## Short Description (≤132 characters)

> Visualize how 50 major ad networks track you across the web. Zero config, 100% local.

## Full Description

> EchoFootPrint reveals how 50 major ad and analytics platforms track you—without blocking or sending data off your device. All detections stay local (IndexedDB), no accounts or telemetry. Visualize your footprint with radial and bipartite graphs, map clusters, and a grouped data table with CSV export. Time filters (7/30/all), pause/exclude controls, and one-click “Clear All Data” give you full control. Built for privacy-conscious users, researchers, and teams who need clear, auditable tracking visibility.
>
> ### Permissions
> EchoFootPrint uses the minimum permissions required to work:
>
> - **Access to all sites you visit** – needed so the content script can detect tracking pixels that load alongside the pages you browse.
> - **Storage (IndexedDB)** – used locally to save detections so the dashboard can show historical trends.
>
> The extension does not read or modify form contents, passwords, or cookies beyond what is necessary for pixel detection, and it does not send data to remote servers.
>
> ### Who is this for?
> EchoFootPrint is designed for privacy-conscious users, journalists, security researchers, and anyone curious about how ad tracking actually works in practice. It is especially useful for talks, workshops, and research where you want a visual, shareable explanation of cross-site tracking.
>
> EchoFootPrint is privately distributed with a strict focus on privacy, transparency, and user control.

---

## Assets for the Listing

- **Extension icon (required):**
  - 128×128 PNG – `dist/assets/icon-128.png`
- **Screenshots (recommended, 1280×800 for CWS):**
  - Radial graph – `landing-page/screenshots/graph-view-1280x800.png`
  - Bipartite graph – `landing-page/screenshots/bipartie-view-1280x800.png`
  - Map view – `landing-page/screenshots/map-view-1280x800.png`
  - Data table (grouped view) – `landing-page/screenshots/table-view-1280x800.png`
  - Settings & data controls – `landing-page/screenshots/settings-1280x800.png`
- **Brand logo (optional / press kit):**
  - SVG logo – `landing-page/logo.svg` (or `docs/logo.svg`)

You can upload the screenshots directly as “Screenshots” in the Chrome Web Store listing. The 128×128 icon should be used as the primary extension icon.

---

## Privacy & Data Usage (for Chrome Web Store form)

Use this section to answer the “Data collection and usage” questions in the Developer Dashboard.

- **Does this extension collect or use personal or sensitive user data?**  
  - _Yes – it observes which pages you visit in order to detect and visualize tracking pixels._  

- **What data does the extension access?**
  - **Browsing history / web activity:**  
    - Page URLs where tracking pixels are detected  
    - Domains of third‑party trackers and associated platforms  
    - Timestamps of when detections occurred  

- **How is this data handled?**
  - All collected data is stored **locally in the user’s browser** using IndexedDB.
  - Data is **never transmitted** to developers, third parties, or external services.
  - Data is used solely to render the dashboard and related visualizations for the user.

- **Is data shared with anyone?**
  - No. Data is **not** shared with third parties, advertisers, analytics providers, or the developer’s servers.

- **Is data used for advertising, profiling, or reselling?**
  - No. Data is not used for advertising, profiling, sale, or any cross‑site tracking by the extension.

- **User controls**
  - The extension provides clear controls to:
    - Clear all stored data.
    - Export data (e.g., CSV) for the user’s own use.
    - Exclude specific domains (e.g., localhost, internal sites) from detection.
    - Pause and resume detection globally at any time (badge + keyboard shortcut).

For the “Data usage” section, you can select options that correspond to **local processing**, **no data sharing**, and **no selling or cross‑site tracking**.

---

## Recommended Listing Tags / Keywords

- Privacy
- Tracking pixels
- Ad tracking
- Web privacy
- Data visualization
- Browser privacy tools
