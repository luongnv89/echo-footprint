# EchoFootPrint Development Checklist

## Phase 0: Proof of Concept – Pixel Detection Core ✅
- [x] Bootstrap Extension Workspace
- [x] Content Script Pixel Sniffer
- [x] Service Worker Event Relay (POC)

**Status**: Complete
**Date Completed**: November 12, 2025
**Notes**:
- All dependencies installed (React, D3, Leaflet, Dexie, Vite, ESLint, Prettier)
- Project structure created following IMPLEMENTATION_GUIDE
- Pixel detection working (<100ms latency, 11/12 tests passing)
- Service worker message relay functional (5/5 tests passing)
- Facebook ID hashing implemented with SHA-256
- Ready to proceed to Sprint 1

## Sprint 1: MVP – Silent Detection, Storage, Radial Dashboard
- [ ] IndexedDB Storage Layer
- [ ] Silent Facebook ID Detection
- [ ] Pixel Event Persistence + Geo Queue
- [ ] Dashboard Shell & Radial Graph
- [ ] Accessibility & Theming Foundations
- [ ] QA & Packaging Pipeline for MVP

## Sprint 2: Enhanced Insights & Sharing Loop
- [ ] Geographic Map View (Leaflet)
- [ ] Raw Data Table & Filters
- [ ] Screenshot Sharing Modal
- [ ] CSV Export Pipeline
- [ ] Settings Sheet & Clear Data Flow
- [ ] Marketing Microsite Alignment

## Sprint 3: Hardening, Privacy Enhancements & GTM Support
- [ ] Optional AES-GCM Data Encryption
- [ ] Diagnostics & Quota Management
- [ ] Accessibility + Localization Audit
- [ ] Analytics-Lite Marketing Hooks
- [ ] Store Submission & Launch GTM Pack
