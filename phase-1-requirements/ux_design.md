# User Experience (UX) Design Document: EchoFootPrint

## UX Overview
- **Purpose:** Deliver an intuitive, visually compelling privacy companion that surfaces invisible Facebook tracking while keeping interaction friction near zero so users quickly understand, share, and return.
- **Scope:** Extension toolbar popup, install snackbar, onboarding empty state, dashboard modules (radial graph, map, raw data table, filters, screenshot sharing, CSV export), settings sheet, clear-data confirmation, marketing microsite hero + explainer.
- **Alignment with PRD and GTM:** Mirrors PRD flows (silent setup, dashboard review, sharing) and GTM emphasis on viral visuals (screenshot CTA, social snippets). Supports Lean Canvas UVP by highlighting “Facebook tracking transparency” through storytelling UI while meeting technical constraints from `tad.md` (React/Vite dashboard, WCAG AA, <1 s load).

## User Personas
### Persona 1: Alex (Privacy-Conscious Professional)
- **Demographics:** 28, software engineer, high technical proficiency, Chrome desktop power user.
- **Goals:** Understand which sites leak their Facebook identity, validate privacy posture, share learnings on tech Twitter.
- **Pain Points:** Invisible trackers, tools that require complex setup, distrust of cloud sync.
- **UX Needs:** Zero onboarding, immediate reassurance about local-only storage, fast visual feedback, one-click share assets, dark-mode default for long sessions.

### Persona 2: Morgan (Digital Rights Advocate)
- **Demographics:** 35, journalist/activist, moderate tech proficiency, multi-browser.
- **Goals:** Collect credible evidence, export data for articles, explain tracking to non-technical audiences.
- **Pain Points:** Hard-to-explain visuals, lack of raw data access, skepticism about tool trustworthiness.
- **UX Needs:** Clear provenance messaging (“data stays on device”), guided walkthroughs between graph/map/table, easy CSV export, captions/tooltips that can be quoted.

### Persona 3: Jamie (Curious Technologist)
- **Demographics:** 22, CS student, high proficiency, experiments with privacy tools.
- **Goals:** Explore web tracking patterns, learn visualization techniques, showcase findings to peers.
- **Pain Points:** Abstract explanations without data, boring dashboards, limited customization.
- **UX Needs:** Playful yet informative interactions, draggable nodes, advanced filters, keyboard shortcuts for power use.

## Design Principles
- **Make the Invisible Visible:** Lead with storytelling visualizations (radial graph animation, contextual badges) to expose hidden trackers instantly.
- **Trust Through Transparency:** Reinforce privacy assurances via inline messaging, open-source cues, and data provenance labels.
- **Progressive Depth:** Keep surface interactions simple (filters, share) while enabling deeper exploration (raw data, CSV, settings) without clutter.
- **Accessible Motion:** Use meaningful micro-animations with respect for `prefers-reduced-motion`; avoid gratuitous effects that hinder comprehension.
- **Single-Mind Tasking:** Each screen focuses on one primary goal (view footprint, share, export) with a single dominant CTA to support GTM conversion.

## Wireframes and Mockups
- **Screen 1: Extension Toolbar Intro Toast**
  - **Description:** Minimal snackbar anchored under toolbar icon after install; includes icon, headline “EchoFootPrint is watching for Facebook trackers,” and “Open Dashboard” button.
  - **Purpose:** Inform new users extension is active without modal friction; encourages first dashboard visit.
- **Screen 2: Dashboard – Radial Graph Tab (Default)**
  - **Description:** Left sidebar (filters, legend, share/clear buttons), central canvas with force-directed graph, right info drawer showing node details. Empty state hero card when no data.
  - **Purpose:** Provide at-a-glance story of tracking reach, align with PRD Flow 2.
- **Screen 3: Map Tab**
  - **Description:** Full-width Leaflet map with clustering, top filter pill bar, bottom drawer summarizing selected region, toggle for light/dark tiles.
  - **Purpose:** Communicate geographic spread for Morgan’s storytelling needs.
- **Screen 4: Raw Data Table**
  - **Description:** Data-grid layout with sticky header (timestamp, domain, pixel type, geo), column sorting icons, search bar, CSV export button.
  - **Purpose:** Enable investigative workflows and GTM promise of transparency.
- **Screen 5: Screenshot Share Modal**
  - **Description:** Modal overlay with preview, blur toggle checklist, caption helper text, download/share buttons.
  - **Purpose:** Power viral loop per GTM.
- **Note:** High-fidelity visuals will be produced in Figma following these structures and the system tokens defined below.

## Interaction Flows
### Flow 1: Silent Onboarding to First Insight
1. Install extension → toolbar toast confirms activation.
2. User continues browsing; content script collects data silently (no UX intervention).
3. After threshold (≥5 events or 48 h), badge pulses and notification bubble prompts “View your Facebook footprint”.
4. User opens dashboard → empty state transitions into graph as data loads (<1 s).
5. Tooltip tours highlight key areas (graph, filters, share CTA).
   - **Alternative Path:** User opens dashboard before data ready → persistent empty-state guidance with “Keep browsing” tips.
   - **Error State:** No Facebook login detected → inline warning card explaining requirement plus “Learn how” link.

### Flow 2: Sharing Visualization (Viral CTA)
1. From graph tab, user clicks “Share Screenshot”.
2. Modal shows preview with sensitive domains auto-blurred.
3. User toggles blur items, optionally edits caption template.
4. Clicks “Generate & Download” → progress ring; success toast offers copy-to-clipboard hashtags.
   - **Alternative Path:** User cancels modal → state discarded, returns to graph.
   - **Error State:** Screenshot generation fails (e.g., low memory) → alert explains issue, suggests closing other tabs; fall back to simplified PNG.

### Flow 3: Investigative Export (Morgan)
1. Switch to Raw Data tab via top nav.
2. Apply filters (date range, domain) using pill controls.
3. Table updates instantly; user reviews counts, selects rows for note-taking.
4. Clicks “Export CSV” → filename `echofootprint_export_YYYY-MM-DD.csv` downloaded.
   - **Alternative Path:** Filter yields zero rows → empty state with suggestion to widen date range.
   - **Error State:** IndexedDB quota warning surfaces (as per PRD) with CTA to archive/delete.

### Flow 4: Data Deletion (Compliance)
1. User presses “Clear All Data” button.
2. Confirmation modal outlines irreversible action, includes checklist to type “ERASE”.
3. Upon confirmation, progress indicator runs (<500 ms) before success toast + empty state reset.
   - **Alternative Path:** User cancels or closes modal → no action taken, toast confirms data retained.
   - **Error State:** IndexedDB failure → error banner with retry instructions and link to troubleshooting doc.

## Visual Design
- **Color Scheme:**
  - Primary background `#0D1117`, surface `#1A1F2B`, accents `#00D4AA` (trust/tech), warning `#FFB347`, success `#5BE49B`.
  - Secondary neutrals `#E6EDF3` (text), `#94A3B8` (muted labels), `#2D3748` (dividers).
- **Typography:** System stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Inter`) with sizes: Display 32/38, H2 24/30, body 16/24, caption 14/20. Monospace (`IBM Plex Mono`) for hashes/IDs.
- **Icons and Imagery:** Custom SVG line icons (outline, 2 px stroke). Illustrations minimal, geometric nodes referencing data networks. Screenshot watermark “Made with EchoFootPrint”.
- **Design System:** Tokenized spacing (4 px grid), button variants (primary, secondary, ghost), card elevations (shadow blur 12). Components documented in Storybook aligned with TAD React stack.
- **Branding Alignment:** Matches GTM messaging (privacy rebellion, transparency). Accent color reused in marketing hero CTAs for consistency.

## Accessibility
- **Compliance Level:** WCAG 2.1 AA.
- **Requirements:**
  - Keyboard navigation across tabs, filters, modals (visible focus rings `outline: 2px solid #00D4AA`).
  - ARIA labels for graph nodes (domain, hits, last seen). Provide text-mode list toggle for screen readers.
  - High-contrast theme toggle; ensure 4.5:1 ratio for text, 3:1 for UI icons.
  - Support `prefers-reduced-motion`: disable physics animation, provide instantaneous layout.
  - Screen reader announcements for async actions (CSV export, screenshot completion).
  - Error messaging includes text + icon + optional vibration (if on supported devices).

## Content Strategy
- **Tone and Voice:** Empowering, transparent, calm urgency (“See who tracks you, own the story”). Avoid fear-mongering while emphasizing agency.
- **Key Messages:** “Your data never leaves this device,” “Visualize Facebook’s reach,” “Share proof instantly.”
- **Content Types:** Tooltip tips, onboarding microcopy, CTA labels (“Share Footprint”), contextual empty states, release notes in settings.
- **Localization Needs:** English MVP; structure copy for future locale files (JSON). Provide glossary link for non-technical terms.

## Responsive Design
- **Supported Devices:** Desktop ≥1280 px primary; tablet ≥1024 px partial support; mobile limited (warning banner explains browser constraints) per TAD compatibility.
- **Breakpoints:** 1280 px (base), 1600 px (wide graph & dual-pane info), 1920 px+ (increase graph radius), fallback 1024 px (stack sidebar below graph).
- **Adaptations:** Sidebar collapses into top ribbon on smaller widths, table becomes card list with horizontal scroll, map controls stack vertically, modals switch to full-height sheets. Marketing site remains fully responsive down to 360 px for acquisition traffic.

## Testing and Validation
- **Usability Testing Plan:** Conduct 5 remote moderated sessions (2 Alex, 2 Morgan, 1 Jamie) using Figma prototype; focus on navigation, share flow, trust messaging. Capture SUS scores aiming ≥80.
- **A/B Testing:** Evaluate CTA wording (“Share Footprint” vs “Download Proof”) and badge pulse frequency to optimize engagement/virality.
- **Tools:** Figma + FigJam for prototypes, Maze for unmoderated tests, Playwright scripts for automated accessibility checks, Hotjar (opt-in on marketing site only) for heatmaps.
- **Validation Metrics:** Time to first dashboard open (<72 h from install), screenshot generation rate (≥15% users), task completion time for CSV export (<30 s), Net Promoter Score (target +30).
- **Persona Roleplay Simulation:** Designer walkthroughs mimicking Alex (evening desktop session) and Morgan (article prep) performed monthly to sanity-check flows against evolving requirements.

## Risks and Mitigation
| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| **Graph overload causing cognitive fatigue** | Users abandon dashboard before insight, hurting virality | Progressive disclosure (node grouping, focus mode), offer list view toggle, provide onboarding tips on interpreting graph |
| **Accessibility gaps in complex visuals** | Excludes screen reader users, store rejection | Provide textual summaries, keyboard commands, test with axe + manual SR runs, include “Data Table” shortcut |
| **Confusing privacy messaging** | Users distrust extension, uninstall | Repeat “Local-only” messaging in empty states/tooltips, link to open-source repo, include privacy badge next to CTAs |
| **Solo founder limited design resources** | Stale UI, inconsistent assets | Maintain lightweight design system tokens, reuse components, prioritize top-impact enhancements, encourage community contributions |

## Appendix
### AI Research Insights
- **Research Round 1 (2025-01-20):** Grok 3 DeepSearch scan of Reddit r/privacytools feedback and Chrome Web Store reviews for Ghostery/Privacy Badger verified demand for zero-setup dashboards and clear “data stays local” messaging; personas updated to emphasize trust cues.
- **Research Round 2 (2025-01-20):** Compared competitor UIs (Lightbeam archives, Brave devtools, Blacklight) via screenshots and UX tear-down blogs; adopted simplified radial graph legend, sticky CTA placement, and dark theme to align with industry trends.
- **Research Round 3 (2025-01-21):** Reviewed WCAG techniques, Chrome DevRel guidance on extensions, and global device usage stats; reinforced keyboard-first patterns, high-contrast palette, and desktop-priority responsive design.
- **Research Round 4 (2025-01-21):** Studied case studies (Mozilla Lightbeam sunset, EFF user complaints) to identify UX risks like graph clutter and unclear sharing instructions; informed risk table mitigations.
- **Research Round 5 (2025-01-22):** Holistic review aligning flows with PRD/TAD, roleplayed Alex/Morgan journeys to ensure CTA clarity, verified copy supports GTM loops.

- **AI-Identified Risks:** Visual overload, accessibility compliance drift, unclear privacy assurances, insufficient solo design resourcing.
- **AI-Suggested Optimizations:** Add contextual “Explain This” panel with plain-language summaries, integrate quick video snippet for marketing site, schedule quarterly UX heuristics review with community input.

### Glossary
- **CTA:** Call-to-Action button guiding primary user behavior (e.g., “Share Footprint”).
- **SUS:** System Usability Scale, standardized questionnaire scoring perceived usability.
