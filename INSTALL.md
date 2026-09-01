# INSTALL.md — clean-checkout install/run notes

Notes for a clean checkout. This document is the source of truth for the
install and run commands. Copies of these commands live in `CLAUDE.md`; keep
them in sync here.

## Environment

- This tree has **no `node_modules`** committed. Install everything with `npm ci`.
- The package manager of record is **npm** + `package-lock.json` — **not pnpm**.
- Use **Node 24 LTS** locally (LTS/current as of this phase). CI still pins
  Node 20 in `.github/workflows/ci.yml` until milestone 2.1.

## Commands

```bash
# Install dependencies (from a clean checkout)
npm ci

# Build the extension (outputs dist/)
npm run build

# Run the test suite (vitest, once)
npm run test:run

# Lint
npm run lint
```

Additional helpers:

```bash
npm run format            # Prettier write (CI checks with `npm run format -- --check`)
npm run zip               # npm run build + package dist/ into echofootprint.zip
npm run test:coverage     # vitest --run --coverage
npm run dev               # Vite dev server
```

## Load the extension in Chrome

1. Run `npm run build` to create the `dist/` folder.
2. Open `chrome://extensions`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `dist/` folder.

## Status

**The baseline is RED until milestone 0.1.** The Pre phase (agent environment)
must not be used as a license to skip the ME (modernization enablement)
milestone. Carrying the install/run commands here is Pre work; it does not
advance the product baseline.
