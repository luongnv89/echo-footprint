# AGENTS.md

Operating rules for coding agents working in this repository. Build/test
command details live in `INSTALL.md` and `CLAUDE.md` — do not duplicate the
full command block here.

## Project

EchoFootPrint is a privacy-first browser extension (Manifest V3) that detects
and visualizes cross-site Meta/Facebook tracking. All data stays local in
IndexedDB; there is no cloud sync and no external telemetry. Invasive privacy
constraints — local-only storage, no telemetry, minimal permissions — must not
be relaxed.

## Commands

- Package manager of record: **npm** + `package-lock.json`, never pnpm. Use Node 24 LTS locally; CI also pins Node 24 (milestone 2.1, issue #25).
- Install: `npm ci` (a clean checkout has no `node_modules`).
- Build/test/lint: `npm run build`, `npm run test:run`, `npm run lint` — exact usage in `INSTALL.md` / `CLAUDE.md`.

## Layout

- `src/content/` — content script (pixel sniffing). `src/background/` — MV3 service worker (persist state to IndexedDB; never rely on in-memory globals).
- `src/dashboard/` — React 19 + Vite dashboard (D3 radial graph, bipartite graph, Leaflet map, data table). `src/lib/` — shared detection logic.
- `tests/` — Vitest suite; `vitest.config.js` at root.
- `dist/` is build output; `docs/` holds historical phase docs. `.gitissue/` is operator state — leave it alone.

## Conventions

- ES modules (import/export), no CommonJS. Commits and branches follow conventional types (`fix/`, `feat/`, `refactor/`, `docs/`).
- Keep changes minimal and focused on the issue at hand; no scope creep.
- When in doubt about a requirement or a command, ask before guessing.

## Constraints

- Never ship a change that sends data off-device or weakens the privacy invariants (local-only storage, minimal permissions, CSP).
- Don't push or merge to `main` unless asked.
- Don't commit secrets, or generated artifacts that shouldn't be tracked.

## Done when

- `npm run lint` passes on touched files.
- `npm run test:run` passes (or failing cases are accounted for and recorded).
- New behavior has a test in `tests/`.

## Read when needed

- Install/run notes → `INSTALL.md`
- Claude-specific guidance → `CLAUDE.md`
- Product requirements and technical design → `dev-docs/phase-1-requirements/`
- Sprint tasks → `dev-docs/tasks.md`

## Token Efficiency

- Never re-read files you just wrote or edited. You know the contents.
- Never re-run commands to "verify" unless the outcome was uncertain.
- Don't echo back large blocks of code or file contents unless asked.
- Batch related edits into single operations. Don't make 5 edits when 1 handles it.
- Skip confirmations like "I'll continue..." Just do it.
- If a task needs 1 tool call, don't use 3. Plan before acting.
- Do not summarize what you just did unless the result is ambiguous or you need additional input.
