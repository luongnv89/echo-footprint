# EchoFootPrint

> Privacy-first browser extension that visualizes Facebook tracking across the web

## Overview

EchoFootPrint is a zero-configuration browser extension that empowers users to visualize how their Facebook identity leaks across the web through third-party tracking. Unlike traditional privacy tools that simply block trackers, EchoFootPrint creates a compelling visual narrative of the tracking ecosystem through an interactive, client-side-only experience.

## Features (MVP v1.0)

- ✅ Silent Facebook ID detection & hashing
- ✅ Facebook Pixel detection across all sites
- ✅ Local-only IndexedDB storage (zero telemetry)
- ✅ Radial topology graph visualization (D3.js)
- ✅ Geographic map view (Leaflet.js)
- ✅ Raw data table with sorting & filtering
- ✅ CSV export functionality
- ✅ Dark mode UI (WCAG 2.1 AA compliant)
- ✅ Screenshot sharing with privacy blur

## Development

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm test

# Package extension
npm run zip
```

### Loading the Extension

1. Run `npm run build` to create the `dist/` folder
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Architecture

- **Content Script**: Detects Facebook Pixel on all web pages
- **Service Worker**: Manages data persistence and geolocation lookups
- **Dashboard**: React-based visualization interface with D3.js and Leaflet

## Privacy Guarantees

- ✅ All data stored locally (IndexedDB)
- ✅ No external telemetry or analytics
- ✅ Facebook IDs hashed with SHA-256
- ✅ Optional AES-GCM encryption
- ✅ Open source (MIT License)

## Documentation

See the `phase-1-requirements/` directory for detailed documentation:
- [Product Requirements (PRD)](phase-1-requirements/prd.md)
- [Technical Architecture (TAD)](phase-1-requirements/tad.md)
- [Implementation Guide](phase-1-requirements/IMPLEMENTATION_GUIDE.md)
- [UX Design](phase-1-requirements/ux_design.md)
- [Brand Kit](phase-1-requirements/brand_kit.md)

## Contributing

This project is in active development. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Status

**Current Phase**: Phase 0 - Proof of Concept
**Target Launch**: Q1 2026

---

**Built with privacy, transparency, and user empowerment in mind.**
