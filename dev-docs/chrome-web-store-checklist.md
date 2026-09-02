# Chrome Web Store Submission Checklist – EchoFootPrint

This checklist walks through preparing and submitting the EchoFootPrint extension to the Chrome Web Store.

---

## 1. Pre‑Submission Checks

- [ ] Ensure `manifest.json` is at version `1.3.0` (or your intended release version) and `manifest_version` is `3`.
- [ ] Confirm permissions are minimal and accurate:
  - `permissions`: `[]`
  - `host_permissions`: `["http://*/*", "https://*/*"]` (needed so the content script can detect pixels on all sites).
- [ ] Verify CSP is present under `content_security_policy.extension_pages` and matches the security audit.
- [ ] Run tests and linting:
  - `npm test` (or `npm run test:run`)
  - `npm run lint`
- [ ] Build succeeds locally:
  - `npm run build`

---

## 2. Build and Package the Extension

From the project root:

1. Build and package:

   ```bash
   npm install    # if not already done
   npm run zip    # runs build and creates echofootprint.zip
   ```

2. Confirm artifacts:
   - [ ] `dist/` directory contains:
     - `manifest.json`
     - `service-worker.js`
     - `content-script.js`
     - `assets/icon-16.png`, `assets/icon-48.png`, `assets/icon-128.png`
     - `src/dashboard/index.html` and compiled dashboard assets
   - [ ] A ZIP file exists at the project root, e.g. `echofootprint.zip` (or `dist.zip` from CI).

This ZIP is what you upload to the Chrome Web Store.

---

## 3. Prepare Listing Content

Use the prepared copy in:

- `docs/chrome-web-store-listing.md` – title, short description, full description, assets, and data usage answers.
- `https://echo-footprint.luongnv.com/privacy.html` – hosted Privacy Policy URL.

Before submission:

- [x] Privacy Policy hosted at `https://echo-footprint.luongnv.com/privacy.html` (GitHub Pages).
- [ ] Confirm screenshots are ready:
  - `docs/screenshots/dashboard.png`
  - `docs/screenshots/faq.png`
  - `docs/screenshots/settings.png`
- [ ] Confirm icon assets:
  - 128×128 PNG – `dist/assets/icon-128.png`

---

## 4. Create / Update the Chrome Web Store Item

1. Go to the Chrome Web Store Developer Dashboard:  
   `https://chrome.google.com/webstore/devconsole`
2. Create a new item (or select the existing EchoFootPrint item if updating).
3. Upload the packaged extension ZIP (`echofootprint.zip`).
4. Fill out the listing form using `docs/chrome-web-store-listing.md`:
   - Name: **EchoFootPrint**
   - Short description.
   - Full description.
   - Category: **Privacy & security**.
   - Primary language: **English (United States)**.
5. Upload assets:
   - Extension icon (128×128).
   - Screenshots (dashboard, FAQ/help, settings).
6. Set the **Privacy Policy URL** to `https://echo-footprint.luongnv.com/privacy.html`.

---

## 5. Data Usage & Privacy Section

In the “Data collection and usage” part of the Developer Dashboard:

- [ ] Declare that the extension observes browsing activity where pixels are detected (URLs, domains, timestamps).
- [ ] Indicate that all data is processed and stored **locally**.
- [ ] Indicate that data is **not transmitted** to the developer or any third parties.
- [ ] Indicate that data is **not used** for advertising, profiling, or resale.
- [ ] Describe the user controls (clear data, export data).

The recommended wording and breakdown are included in `docs/chrome-web-store-listing.md`.

---

## 6. Final Review Before Submitting

- [ ] Install the built extension locally via `chrome://extensions` → “Load unpacked” → `dist/` and perform a quick smoke test:
  - Pixel detections appear when visiting test pages.
  - Dashboard loads correctly and shows empty state when no data exists.
  - Settings and “Clear All Data” flows work.
  - No unexpected console errors or permission prompts.
- [ ] Confirm the listing text accurately matches the current behavior of the extension.
- [ ] Confirm the version number in `manifest.json` matches what you intend to publish.

Once everything looks good:

- [ ] Submit the item for review in the Chrome Web Store Developer Dashboard.

Keep this checklist updated as you add new features or change data behavior so future releases remain compliant.

