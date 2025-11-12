# EchoFootPrint: Developer Quick-Start Guide

**Purpose:** Technical implementation guide for building the EchoFootPrint MVP (v1.0)

**Target Audience:** Developers starting implementation based on the PRD

---

## Tech Stack Summary

### Core Technologies
- **Manifest Version:** V3 (Chrome/Edge), V2 fallback (Firefox)
- **Languages:** JavaScript ES2022, HTML5, CSS3
- **Build Tool:** Vite (for bundling and optimization)
- **Package Manager:** npm or pnpm

### Key Libraries
```json
{
  "dependencies": {
    "d3": "^7.9.0",
    "leaflet": "^1.9.4",
    "dexie": "^3.2.7"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1"
  }
}
```

---

## Project Structure

```
echofootprint/
├── manifest.json                 # Extension manifest (V3)
├── manifest.firefox.json         # Firefox manifest (V2)
├── package.json
├── vite.config.js
├── README.md
├── LICENSE (MIT)
│
├── src/
│   ├── background/
│   │   └── service-worker.js     # Background service worker
│   │
│   ├── content/
│   │   └── content-script.js     # Injected into web pages
│   │
│   ├── dashboard/
│   │   ├── index.html            # Dashboard entry point
│   │   ├── main.js               # Dashboard app initialization
│   │   ├── styles.css            # Global styles
│   │   │
│   │   ├── components/
│   │   │   ├── RadialGraph.js    # D3.js force graph
│   │   │   ├── MapView.js        # Leaflet map
│   │   │   ├── DataTable.js      # Raw data table
│   │   │   ├── FilterBar.js      # Time range filters
│   │   │   └── EmptyState.js     # No data placeholder
│   │   │
│   │   └── utils/
│   │       ├── db.js             # Dexie.js database wrapper
│   │       ├── crypto.js         # Hashing & encryption
│   │       └── export.js         # CSV export logic
│   │
│   ├── lib/
│   │   └── pixel-detector.js     # Pixel detection logic
│   │
│   └── assets/
│       ├── icon-16.png
│       ├── icon-48.png
│       ├── icon-128.png
│       └── logo.svg
│
├── dist/                         # Build output (gitignored)
│   └── echofootprint.zip         # Release artifact
│
└── tests/
    ├── unit/
    │   ├── crypto.test.js
    │   └── db.test.js
    └── integration/
        └── e2e.test.js
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

#### 1.1 Project Setup
- [ ] Initialize npm project: `npm init -y`
- [ ] Install dependencies: `npm install d3 leaflet dexie`
- [ ] Install dev dependencies: `npm install -D vite eslint prettier`
- [ ] Configure Vite for extension bundling
- [ ] Set up ESLint + Prettier with sensible defaults
- [ ] Create `.gitignore` (include `node_modules/`, `dist/`, `.env`)

#### 1.2 Manifest Configuration
**manifest.json (Chrome/Edge):**
```json
{
  "manifest_version": 3,
  "name": "EchoFootPrint",
  "version": "1.0.0",
  "description": "Visualize how Facebook tracks you across the web. Zero config, 100% local.",
  "permissions": [
    "storage",
    "webNavigation"
  ],
  "host_permissions": [
    "http://*/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

#### 1.3 Database Schema (Dexie.js)
**src/dashboard/utils/db.js:**
```javascript
import Dexie from 'dexie';

export const db = new Dexie('EchoFootPrint');

db.version(1).stores({
  footprints: '++id, timestamp, domain, url, pixelType, ipGeo',
  settings: 'key',
  geoCache: 'domain, country, region'
});

// Helper functions
export async function addFootprint(data) {
  return await db.footprints.add({
    timestamp: Date.now(),
    domain: data.domain,
    url: data.url,
    pixelType: data.pixelType || 'unknown',
    ipGeo: data.ipGeo || null
  });
}

export async function getFootprints(filter = {}) {
  let query = db.footprints;
  
  if (filter.startDate) {
    query = query.where('timestamp').aboveOrEqual(filter.startDate);
  }
  
  if (filter.endDate) {
    query = query.where('timestamp').belowOrEqual(filter.endDate);
  }
  
  return await query.toArray();
}

export async function clearAllData() {
  await db.footprints.clear();
  await db.geoCache.clear();
}
```

---

### Phase 2: Core Detection (Week 2)

#### 2.1 Facebook ID Detection
**src/content/content-script.js:**
```javascript
// Detect Facebook ID from cookie
function detectFacebookID() {
  if (window.location.hostname.includes('facebook.com')) {
    const cookies = document.cookie.split(';');
    const cUserCookie = cookies.find(c => c.trim().startsWith('c_user='));
    
    if (cUserCookie) {
      const userId = cUserCookie.split('=')[1];
      // Send to background for hashing
      chrome.runtime.sendMessage({
        type: 'FB_ID_DETECTED',
        userId: userId
      });
    }
  }
}

// Run on page load
detectFacebookID();
```

**src/background/service-worker.js:**
```javascript
import { db } from '../dashboard/utils/db.js';
import { hashFacebookID } from '../dashboard/utils/crypto.js';

// Listen for Facebook ID detection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FB_ID_DETECTED') {
    handleFacebookID(message.userId);
  }
  
  if (message.type === 'PIXEL_DETECTED') {
    handlePixelDetection(message.data, sender.tab);
  }
});

async function handleFacebookID(userId) {
  const hashedId = await hashFacebookID(userId);
  await chrome.storage.local.set({ fbIdHash: hashedId });
  console.log('Facebook ID detected and hashed');
}
```

#### 2.2 Pixel Detection
**src/lib/pixel-detector.js:**
```javascript
export function detectFacebookPixel() {
  const fbDomains = [
    'connect.facebook.net',
    'facebook.com/tr',
    'fbcdn.net'
  ];
  
  // Check for script tags
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const fbScripts = scripts.filter(script => 
    fbDomains.some(domain => script.src.includes(domain))
  );
  
  if (fbScripts.length > 0) {
    return {
      detected: true,
      domain: window.location.hostname,
      url: window.location.href,
      pixelType: 'script',
      scriptSrc: fbScripts[0].src
    };
  }
  
  // Monitor network requests (if webRequest permission available)
  // TODO: Implement network monitoring
  
  return null;
}
```

**src/content/content-script.js (updated):**
```javascript
import { detectFacebookPixel } from '../lib/pixel-detector.js';

// Detect pixels on page load
const pixelData = detectFacebookPixel();
if (pixelData) {
  chrome.runtime.sendMessage({
    type: 'PIXEL_DETECTED',
    data: pixelData
  });
}
```

#### 2.3 Geolocation Lookup
**src/background/service-worker.js (updated):**
```javascript
async function handlePixelDetection(data, tab) {
  // Check if domain already has geolocation cached
  const cachedGeo = await db.geoCache.get(data.domain);
  
  let geoData = null;
  if (!cachedGeo) {
    geoData = await fetchGeolocation(data.domain);
    if (geoData) {
      await db.geoCache.add({
        domain: data.domain,
        country: geoData.country,
        region: geoData.regionName
      });
    }
  } else {
    geoData = cachedGeo;
  }
  
  // Store footprint
  await db.footprints.add({
    timestamp: Date.now(),
    domain: data.domain,
    url: data.url,
    pixelType: data.pixelType,
    ipGeo: geoData
  });
}

async function fetchGeolocation(domain) {
  try {
    // Rate limit: 45 requests/minute
    const response = await fetch(`http://ip-api.com/json/`);
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country,
        regionName: data.regionName,
        city: data.city
      };
    }
  } catch (error) {
    console.error('Geolocation fetch failed:', error);
    return null;
  }
}
```

---

### Phase 3: Dashboard UI (Week 3-4)

#### 3.1 Radial Graph (D3.js)
**src/dashboard/components/RadialGraph.js:**
```javascript
import * as d3 from 'd3';

export function createRadialGraph(containerId, data) {
  const width = window.innerWidth - 100;
  const height = window.innerHeight - 200;
  
  // Create SVG
  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  
  // Prepare nodes and links
  const nodes = [
    { id: 'YOU', type: 'user', x: width / 2, y: height / 2 },
    ...data.map(d => ({
      id: d.domain,
      type: 'website',
      count: d.count,
      lastVisit: d.lastVisit,
      ipGeo: d.ipGeo
    }))
  ];
  
  const links = data.map(d => ({
    source: 'YOU',
    target: d.domain,
    category: categorize(d.domain)
  }));
  
  // Force simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));
  
  // Draw links
  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .enter().append('line')
    .attr('stroke', d => getCategoryColor(d.category))
    .attr('stroke-width', 2);
  
  // Draw nodes
  const node = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .enter().append('circle')
    .attr('r', d => d.type === 'user' ? 20 : Math.sqrt(d.count) * 3)
    .attr('fill', d => d.type === 'user' ? '#00d4aa' : '#2d2d2d')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));
  
  // Add labels
  const label = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .enter().append('text')
    .text(d => d.id)
    .attr('font-size', 12)
    .attr('fill', '#e0e0e0');
  
  // Tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', '#1a1a1a')
    .style('padding', '10px')
    .style('border-radius', '5px');
  
  node.on('mouseover', function(event, d) {
    if (d.type !== 'user') {
      tooltip.style('visibility', 'visible')
        .html(`
          <strong>${d.id}</strong><br>
          Visits: ${d.count}<br>
          Last: ${new Date(d.lastVisit).toLocaleDateString()}<br>
          Location: ${d.ipGeo?.country || 'Unknown'}
        `);
    }
  })
  .on('mousemove', function(event) {
    tooltip.style('top', (event.pageY - 10) + 'px')
      .style('left', (event.pageX + 10) + 'px');
  })
  .on('mouseout', function() {
    tooltip.style('visibility', 'hidden');
  });
  
  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    
    label
      .attr('x', d => d.x + 10)
      .attr('y', d => d.y + 5);
  });
  
  // Drag functions
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }
  
  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }
  
  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
}

// Helper: Categorize domain
function categorize(domain) {
  const ecommerce = ['amazon', 'ebay', 'shopify'];
  const news = ['cnn', 'nytimes', 'bbc'];
  
  if (ecommerce.some(site => domain.includes(site))) return 'ecommerce';
  if (news.some(site => domain.includes(site))) return 'news';
  return 'other';
}

// Helper: Category colors
function getCategoryColor(category) {
  const colors = {
    news: '#00d4aa',      // Green
    ecommerce: '#ff9500', // Orange
    tracking: '#ff0000',  // Red
    other: '#808080'      // Gray
  };
  return colors[category] || colors.other;
}
```

#### 3.2 Map View (Leaflet)
**src/dashboard/components/MapView.js:**
```javascript
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function createMapView(containerId, data) {
  // Initialize map
  const map = L.map(containerId).setView([20, 0], 2);
  
  // Add tile layer (dark theme)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CARTO',
    maxZoom: 19
  }).addTo(map);
  
  // Group locations
  const locations = groupByLocation(data);
  
  // Add markers
  locations.forEach(loc => {
    const marker = L.circleMarker([loc.lat, loc.lng], {
      radius: Math.min(loc.count * 2, 20),
      fillColor: '#00d4aa',
      color: '#fff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.7
    }).addTo(map);
    
    marker.bindPopup(`
      <strong>${loc.region}, ${loc.country}</strong><br>
      Domains: ${loc.domains.join(', ')}<br>
      Total Hits: ${loc.count}
    `);
  });
}

function groupByLocation(data) {
  // Group footprints by geolocation
  // TODO: Implement geocoding for lat/lng from country names
  return [];
}
```

#### 3.3 Data Table
**src/dashboard/components/DataTable.js:**
```javascript
export function createDataTable(containerId, data) {
  const container = document.getElementById(containerId);
  
  // Create table
  const table = document.createElement('table');
  table.className = 'data-table';
  
  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th onclick="sortBy('timestamp')">Timestamp</th>
      <th onclick="sortBy('domain')">Domain</th>
      <th onclick="sortBy('pixelType')">Pixel Type</th>
      <th onclick="sortBy('country')">Country</th>
      <th>URL</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Body
  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(row.timestamp).toLocaleString()}</td>
      <td>${row.domain}</td>
      <td>${row.pixelType}</td>
      <td>${row.ipGeo?.country || 'Unknown'}</td>
      <td class="truncate">${row.url}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  
  container.appendChild(table);
}
```

---

### Phase 4: Integration & Testing (Week 5-6)

#### 4.1 Build Script
**vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'content-script': resolve(__dirname, 'src/content/content-script.js'),
        dashboard: resolve(__dirname, 'src/dashboard/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
```

#### 4.2 Package Scripts
**package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "test": "vitest",
    "zip": "npm run build && cd dist && zip -r echofootprint.zip ."
  }
}
```

#### 4.3 Testing Checklist
- [ ] Unit tests for crypto.js (hashing)
- [ ] Unit tests for db.js (CRUD operations)
- [ ] Integration test for pixel detection
- [ ] End-to-end test: Install → Detect → Visualize
- [ ] Performance test: 10,000 footprints load time
- [ ] Cross-browser test: Chrome, Edge, Firefox
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Memory leak detection (Chrome DevTools)

---

## Development Workflow

### Daily Development
1. Pull latest from `main` branch
2. Create feature branch: `git checkout -b feature/pixel-detection`
3. Develop feature with tests
4. Lint and format: `npm run lint && npm run format`
5. Commit with descriptive message: `git commit -m "feat: Add pixel detection logic"`
6. Push and open PR
7. Review → Merge

### Release Process
1. Update version in `manifest.json`
2. Update CHANGELOG.md
3. Run full test suite: `npm test`
4. Build production bundle: `npm run build`
5. Create release artifact: `npm run zip`
6. Submit to Chrome Web Store
7. Tag release: `git tag v1.0.0`
8. Push tag: `git push --tags`

---

## Common Gotchas & Solutions

### Issue: Service worker terminates unexpectedly
**Solution:** Always persist state to IndexedDB. Never rely on in-memory variables.

### Issue: Content script not injecting
**Solution:** Check `host_permissions` in manifest. Use `<all_urls>` for maximum coverage.

### Issue: D3 graph lags with many nodes
**Solution:** Implement node clustering or limit visible nodes to 500. Use `requestAnimationFrame` for smooth animations.

### Issue: IndexedDB quota exceeded
**Solution:** Monitor quota with `navigator.storage.estimate()`. Show warning at 80% capacity. Implement data archival.

### Issue: Geo API rate limit hit
**Solution:** Cache all geolocation results. Implement exponential backoff retry logic.

---

## Resources

### Documentation
- [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [D3.js Force Graph Examples](https://observablehq.com/@d3/force-directed-graph)
- [Dexie.js Documentation](https://dexie.org/docs/)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)

### Inspiration
- [Lightbeam (archived)](https://github.com/mozilla/lightbeam-we)
- [Privacy Badger](https://github.com/EFForg/privacybadger)
- [Ghostery](https://github.com/ghostery/ghostery-extension)

### Community
- [Reddit r/privacy](https://reddit.com/r/privacy)
- [Chrome Extension Developers](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [HackerNews](https://news.ycombinator.com)

---

## Next Steps

1. **Set up development environment** (install Node.js, clone repo)
2. **Implement Phase 1** (foundation + manifest)
3. **Implement Phase 2** (detection logic)
4. **Implement Phase 3** (dashboard UI)
5. **Test thoroughly** (Phase 4)
6. **Launch** (submit to Chrome Web Store)

**Questions?** Open a GitHub issue or start a discussion.

**Good luck building EchoFootPrint! 🚀**

---

*Last Updated: November 11, 2025*