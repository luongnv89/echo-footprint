# Landing Page Implementation Plan (EchoFootPrint)

## Goals
- Build a single-page marketing site that drives extension installs with a hero CTA and platform credibility tags.
- Showcase key visuals: map view in hero, plus bipartite graph, main dashboard, data table, and settings screenshots.
- Reinforce privacy positioning with a dedicated Privacy Policy page and on-page privacy assurance band.
- Maintain brand kit alignment: teal primary (#00D4AA), dark base (#0D1117), Inter typography, 8px spacing grid, radar/graph motifs, asymmetrical layout.

## Page Structure (Sections)
1. **Hero**: Left copy + primary CTA “Install Extension” and secondary “See how it works”; right side hero screenshot uses the Map View. Subtext highlights local-only processing and no telemetry.
2. **Platform Tags**: Bubble tags listing all tracked platforms (50) grouped by category (Social, Exchanges, DSP/SSP, Content Discovery, Mobile, Specialized, Data Management). Keep them on a light card for contrast.
3. **Social Proof Strip (optional)**: Text badges for “Local-only data”, “No telemetry”, “Private build”.
4. **Feature Highlights (3-up cards)**: Real-time detection, Visual network map, Export & share. Include short body copy.
5. **How It Works (3 steps)**: Detect pixels → Store locally → Visualize. Emphasize no data leaves device.
6. **Screenshots/Gallery**: Grid or carousel featuring: Bipartite Graph, Main Dashboard (radial), Map View, Data Table, Settings view. Captions explain what each view shows.
7. **Privacy & Control Band**: Dark band reiterating local storage, no accounts, and clear data anytime.
8. **CTA Band**: Repeat primary CTA with browser support note (Chromium-based).
9. **FAQ**: 4–5 Q&As (blocking vs. visualization, data stored, clearing data, browser support, permissions).
10. **Footer**: Logo, contact/support link, Privacy Policy link, minimal nav.

## Privacy Policy Page
- Location: `privacy-policy.html` (or `privacy/index.html`).
- Content outline: Data collection (local only), categories of data stored (URLs, domains, timestamps, platform labels, geo lookup cached locally), no telemetry/no sharing, permissions rationale, user controls (clear data/export), contact method, changes/versioning.
- Align messaging with closed-source/private distribution (no repo links).

## Assets Needed
- Logo: `docs/logo.svg`.
- Screenshots: existing `docs/screenshots/dashboard.png`, `docs/screenshots/faq.png`, `docs/screenshots/settings.png`, plus ensure bipartite graph and map view assets are available (add/update if missing).
- Platform list: reuse the 50-platform list from README/src data; present as grouped tags.
- Fonts: Inter (already in brand kit; load via Google Fonts).

## Technical Notes
- Static HTML/CSS (and minimal JS for interactions). Keep styles in a dedicated CSS file to mirror brand kit (colors, spacing, buttons).
- Mobile responsiveness: stack hero, reduce H1 to 36px, 2-column to 1-column for platform tags and gallery.
- Accessibility: High contrast per palette; alt text on images; focus states on CTAs; semantic headings.
- CTA should link to the store listing or installation instructions (placeholder link to be updated when ready).

## Open Questions
- Final URL for extension install link (Chrome Web Store/AMO vs. internal distribution).
- Confirm final screenshots for bipartite graph and map view; generate if missing.
- Whether to include press/quote strip; currently omitted.
