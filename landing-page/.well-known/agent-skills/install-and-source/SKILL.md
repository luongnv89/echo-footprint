# EchoFootPrint install and source

Use this skill when guiding installation, pointing to releases, or citing the Chrome Web Store listing and GitHub repository.

## Install

- Chrome Web Store: https://chromewebstore.google.com/detail/pbabepaamiligomhlcmkjabhmkmaekci
- After install, click the extension icon to open the dashboard in a new tab.

## Build from source

```bash
git clone https://github.com/luongnv89/echo-footprint.git
cd echo-footprint
npm ci
npm run build
```

Load the `dist/` folder as an unpacked extension at `chrome://extensions` (Developer mode).

## Version

Release version is aligned across `package.json`, `manifest.json`, and the A2A agent card at `/.well-known/agent-card.json`.
