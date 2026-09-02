<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0 (initial constitution)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (7 principles)
  - Technical Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (aligned with Constitution Check section)
  - .specify/templates/spec-template.md ✅ (no conflicts, requirements-focused)
  - .specify/templates/tasks-template.md ✅ (task phases align with principles)
Follow-up TODOs: None
-->

# EchoFootPrint Constitution

## Core Principles

### I. Privacy-First (NON-NEGOTIABLE)

All data MUST remain local to the user's browser. This principle supersedes all others.

- All tracking data MUST be stored in browser IndexedDB only
- ZERO external telemetry, analytics, or cloud synchronization is permitted
- Facebook IDs MUST be hashed with SHA-256 before storage
- Optional AES-GCM encryption MUST use user-provided passphrase (never stored)
- No data collection for extension development or improvement purposes

**Rationale**: Users install EchoFootPrint to understand tracking, not to be tracked.
Violating this principle destroys the core value proposition and user trust.

### II. Performance Targets (NON-NEGOTIABLE)

Performance directly impacts user experience and extension adoption. These targets are
non-negotiable acceptance criteria for all features.

- Pixel detection: MUST complete in <100ms per page
- Dashboard load: MUST be <1s for 1,000 records, <3s for 10,000 records
- Graph rendering: MUST maintain 60fps for 500 nodes, 30fps minimum for 1,000+ nodes
- Service worker memory: MUST remain <5MB
- Dashboard memory: MUST remain <50MB for 1,000 nodes
- Extension bundle size: Dashboard SHOULD be <150KB compressed

**Rationale**: Users uninstall slow extensions immediately. Performance is a feature.

### III. Zero Configuration

The extension MUST work silently from installation with no user setup required.

- Detection MUST begin immediately upon installation
- No onboarding flows, account creation, or configuration wizards
- Default settings MUST be sensible for privacy-conscious users
- Optional settings (encryption, data clearing) MUST be discoverable but not required
- First-run experience: install → browse → click icon → see data

**Rationale**: Friction kills adoption. Every required step loses potential users.

### IV. Accessibility (NON-NEGOTIABLE)

All UI changes MUST meet WCAG 2.1 AA compliance. This is not optional polish.

- All interactive elements MUST be keyboard accessible (Tab, Enter, Esc)
- Color contrast MUST be ≥4.5:1 for text, ≥3:1 for large text
- ARIA labels MUST exist on all graph nodes and map markers
- Focus indicators MUST be visible on all controls
- `prefers-reduced-motion` MUST disable animations
- Screen reader testing (VoiceOver, NVDA) MUST pass before release

**Rationale**: Privacy tools must be accessible to all users, including those with
disabilities. Accessibility is a civil right, not a feature.

### V. Manifest V3 Compliance

All implementation decisions MUST respect Manifest V3 constraints.

- Service workers are short-lived; NEVER rely on in-memory state
- All state MUST be persisted to IndexedDB or chrome.storage
- WebAssembly is blocked; MUST use Web Crypto API for cryptography
- All code MUST be bundled; no remote code execution
- Use minimal permissions: `storage`, `webNavigation`, host permissions only

**Rationale**: Chrome Web Store requires MV3. Violating constraints prevents publication.

### VI. Security Best Practices

Security protects users and maintains trust.

- Facebook IDs MUST be hashed with SHA-256 before any storage
- Encryption MUST use PBKDF2 key derivation (100,000 iterations minimum)
- Content Security Policy MUST restrict to `script-src 'self'; object-src 'self'`
- No eval(), no dynamic code execution, no inline scripts
- Rate limiting MUST be implemented for external API calls (geo: 45 req/min)

**Rationale**: A privacy tool with security vulnerabilities is worse than no tool.

### VII. Testing Discipline

Comprehensive testing ensures reliability and prevents regressions.

- All new features MUST have unit test coverage
- Critical paths (detection, storage, encryption) MUST have integration tests
- Tests MUST run in CI via pre-commit hooks (Husky)
- Coverage reports MUST be generated for all PRs
- Browser compatibility testing MUST cover Chrome and Edge minimum

**Rationale**: Untested code is broken code waiting to manifest.

## Technical Constraints

These constraints derive from the architecture and cannot be violated without
significant refactoring.

**Storage Limits**:
- IndexedDB soft cap: 500MB with warning at 80% usage
- chrome.storage.local: 10MB limit (unsuitable for records, use for settings only)
- Data retention: User-controlled via explicit "Clear All" action

**External Dependencies**:
- Geolocation API (ip-api.com): 45 requests/minute rate limit
- MUST implement exponential backoff on 429 errors
- MUST cache all geo results to avoid repeat lookups
- MUST gracefully degrade to "Unknown" after 3 retry failures

**Browser Support**:
- Primary: Chrome 88+, Edge 88+ (Manifest V3)
- Future: Firefox (separate MV2 branch, not yet implemented)

**Bundle Constraints**:
- D3.js for graph visualization (industry standard, acceptable size)
- Leaflet for map visualization (~40KB, preferred over Mapbox GL JS ~200KB)
- Dexie.js for IndexedDB abstraction (simplifies migrations, well-tested)
- React 18 for dashboard UI (complex state management justifies framework)

## Development Workflow

All contributions MUST follow this workflow to maintain quality.

**Before Implementation**:
1. Read existing code before proposing changes
2. Check constitution principles for compliance
3. Review CLAUDE.md for architecture guidance

**During Implementation**:
1. Write tests first for new functionality
2. Keep changes minimal and focused (no over-engineering)
3. Follow existing code patterns and conventions
4. Maintain <100ms detection latency (measure impact)

**Before Commit**:
1. All linting MUST pass (ESLint)
2. All formatting MUST pass (Prettier)
3. All tests MUST pass (Vitest)
4. Build MUST succeed
5. Security audit MUST have no high/critical vulnerabilities

**Pre-commit hooks enforce these requirements automatically via Husky.**

## Governance

This constitution supersedes all other development practices for EchoFootPrint.

**Authority**:
- Constitution principles are binding on all code changes
- Violations MUST be explicitly justified in PR descriptions
- Justified violations MUST be tracked in Complexity Tracking section of plans

**Amendment Process**:
1. Propose amendment with rationale
2. Document migration plan for existing code
3. Update all affected templates and documentation
4. Version bump according to semantic versioning:
   - MAJOR: Principle removal or backward-incompatible redefinition
   - MINOR: New principle added or materially expanded guidance
   - PATCH: Clarifications, wording, or non-semantic refinements

**Compliance Review**:
- All PRs MUST be checked against constitution principles
- Complexity additions MUST be justified (no YAGNI violations)
- Runtime development guidance available in CLAUDE.md

**Version**: 1.0.0 | **Ratified**: 2025-12-01 | **Last Amended**: 2025-12-01
