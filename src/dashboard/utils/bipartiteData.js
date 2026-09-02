/**
 * Pure data transforms for the Bipartite Graph.
 *
 * The React component is responsible for state and rendering. Everything
 * here is pure data: footprints -> graph nodes/edges, filters, sort, stats.
 * That separation makes both halves easier to test and to reason about.
 *
 * `TRACKING_PLATFORMS` is looked up by id to enrich platform nodes with
 * the human-readable name and brand color.
 */

import { TRACKING_PLATFORMS } from '../../lib/pixel-detector.js';

/**
 * Convert raw footprint records into a bipartite graph structure.
 *
 * @param {Array} footprints - Footprint records from IndexedDB.
 * @returns {{domains: Array, platforms: Array, edges: Array}}
 */
function buildBipartiteGraph(footprints) {
  if (!Array.isArray(footprints) || footprints.length === 0) {
    return { domains: [], platforms: [], edges: [] };
  }

  const domainMap = {};
  const platformMap = {};

  for (const fp of footprints) {
    const domain = fp.domain;
    const platform = fp.platform || 'unknown';
    const timestamp = fp.timestamp;

    if (!domainMap[domain]) {
      domainMap[domain] = {
        platforms: {},
        total: 0,
        firstSeen: timestamp,
        lastSeen: timestamp,
        pixelTypes: new Set(),
      };
    }
    domainMap[domain].platforms[platform] =
      (domainMap[domain].platforms[platform] || 0) + 1;
    domainMap[domain].total += 1;
    if (timestamp < domainMap[domain].firstSeen) {
      domainMap[domain].firstSeen = timestamp;
    }
    if (timestamp > domainMap[domain].lastSeen) {
      domainMap[domain].lastSeen = timestamp;
    }
    domainMap[domain].pixelTypes.add(fp.pixelType || 'unknown');

    if (!platformMap[platform]) {
      platformMap[platform] = { domains: {}, total: 0 };
    }
    platformMap[platform].domains[domain] =
      (platformMap[platform].domains[domain] || 0) + 1;
    platformMap[platform].total += 1;
  }

  const domains = Object.keys(domainMap).map(domain => {
    const data = domainMap[domain];
    const platformCount = Object.keys(data.platforms).length;
    const topPlatforms = Object.entries(data.platforms)
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({
        platform,
        count,
        name: TRACKING_PLATFORMS[platform]?.name || platform,
        color: TRACKING_PLATFORMS[platform]?.color || '#4a90e2',
      }));

    return {
      id: domain,
      type: 'domain',
      label: domain,
      platformCount,
      platforms: topPlatforms,
      detections: data.total,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      pixelTypes: Array.from(data.pixelTypes),
      color:
        platformCount === 1
          ? topPlatforms[0].color
          : platformCount <= 3
            ? topPlatforms.slice(0, 2).map(p => p.color)
            : '#ff6b6b',
      isMultiPlatform: platformCount >= 2,
    };
  });

  const platforms = Object.keys(platformMap).map(platform => {
    const data = platformMap[platform];
    const domainCount = Object.keys(data.domains).length;
    const platformConfig = TRACKING_PLATFORMS[platform] || {
      name: platform,
      color: '#4a90e2',
    };
    const topDomains = Object.entries(data.domains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return {
      id: platform,
      type: 'platform',
      label: platformConfig.name || platform,
      platformId: platform,
      domainCount,
      domains: topDomains,
      detections: data.total,
      color: platformConfig.color,
      isWidespread: domainCount >= 5,
    };
  });

  const edges = [];
  for (const domain of domains) {
    for (const platformData of domain.platforms) {
      edges.push({
        source: domain.id,
        target: platformData.platform,
        detections: platformData.count,
        platformColor: platformData.color,
        firstSeen: domain.firstSeen,
        lastSeen: domain.lastSeen,
      });
    }
  }

  return { domains, platforms, edges };
}

/**
 * Apply the user-controlled filters to a graph. Filter options mirror the
 * state in `BipartiteGraph` and are passed as a single object so the
 * signature is stable.
 *
 * @param {{domains: Array, platforms: Array, edges: Array}} graph
 * @param {{
 *   searchTerm?: string,
 *   selectedPlatformFilter?: string,
 *   minDetections?: number,
 *   showMultiPlatformOnly?: boolean,
 *   showWidespreadOnly?: boolean,
 *   isolatedView?: {type: string, id: string} | null,
 * }} filters
 */
function applyBipartiteFilters(graph, filters = {}) {
  let { domains, platforms, edges } = graph;
  const {
    searchTerm = '',
    selectedPlatformFilter = 'all',
    minDetections = 1,
    showMultiPlatformOnly = false,
    showWidespreadOnly = false,
    isolatedView = null,
  } = filters;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    domains = domains.filter(d => d.label.toLowerCase().includes(term));
    const domainIds = new Set(domains.map(d => d.id));
    edges = edges.filter(e => domainIds.has(e.source));
    const platformIds = new Set(edges.map(e => e.target));
    platforms = platforms.filter(p => platformIds.has(p.id));
  }

  if (selectedPlatformFilter !== 'all') {
    edges = edges.filter(e => e.target === selectedPlatformFilter);
    const domainIds = new Set(edges.map(e => e.source));
    domains = domains.filter(d => domainIds.has(d.id));
    platforms = platforms.filter(p => p.id === selectedPlatformFilter);
  }

  if (minDetections > 1) {
    edges = edges.filter(e => e.detections >= minDetections);
    const domainIds = new Set(edges.map(e => e.source));
    const platformIds = new Set(edges.map(e => e.target));
    domains = domains.filter(d => domainIds.has(d.id));
    platforms = platforms.filter(p => platformIds.has(p.id));
  }

  if (showMultiPlatformOnly) {
    domains = domains.filter(d => d.isMultiPlatform);
    const domainIds = new Set(domains.map(d => d.id));
    edges = edges.filter(e => domainIds.has(e.source));
    const platformIds = new Set(edges.map(e => e.target));
    platforms = platforms.filter(p => platformIds.has(p.id));
  }

  if (showWidespreadOnly) {
    platforms = platforms.filter(p => p.isWidespread);
    const platformIds = new Set(platforms.map(p => p.id));
    edges = edges.filter(e => platformIds.has(e.target));
    const domainIds = new Set(edges.map(e => e.source));
    domains = domains.filter(d => domainIds.has(d.id));
  }

  if (isolatedView) {
    if (isolatedView.type === 'domain') {
      domains = domains.filter(d => d.id === isolatedView.id);
      const domainIds = new Set(domains.map(d => d.id));
      edges = edges.filter(e => domainIds.has(e.source));
      const platformIds = new Set(edges.map(e => e.target));
      platforms = platforms.filter(p => platformIds.has(p.id));
    } else if (isolatedView.type === 'platform') {
      platforms = platforms.filter(p => p.id === isolatedView.id);
      const platformIds = new Set(platforms.map(p => p.id));
      edges = edges.filter(e => platformIds.has(e.target));
      const domainIds = new Set(edges.map(e => e.source));
      domains = domains.filter(d => domainIds.has(d.id));
    }
  }

  return { domains, platforms, edges };
}

function sortBipartiteDomains(domains, mode) {
  return [...domains].sort((a, b) => {
    switch (mode) {
      case 'alpha':
        return a.label.localeCompare(b.label);
      case 'detections-desc':
        return b.detections - a.detections;
      case 'platforms-desc':
      default:
        return b.platformCount - a.platformCount || b.detections - a.detections;
    }
  });
}

function sortBipartitePlatforms(platforms, mode) {
  return [...platforms].sort((a, b) => {
    switch (mode) {
      case 'alpha':
        return a.label.localeCompare(b.label);
      case 'detections-desc':
        return b.detections - a.detections;
      case 'domains-desc':
      default:
        return b.domainCount - a.domainCount || b.detections - a.detections;
    }
  });
}

/**
 * Compute the headline numbers shown in the statistics panel.
 *
 * @param {{domains: Array, platforms: Array, edges: Array}} graph
 */
function computeBipartiteStats(graph) {
  const { domains, platforms, edges } = graph;
  const multiPlatformDomains = domains.filter(d => d.isMultiPlatform).length;
  const widespreadPlatforms = platforms.filter(p => p.isWidespread).length;
  const mostConnectedDomain = domains.reduce(
    (max, d) => (d.platformCount > (max?.platformCount || 0) ? d : max),
    null
  );
  const mostWidespreadPlatform = platforms.reduce(
    (max, p) => (p.domainCount > (max?.domainCount || 0) ? p : max),
    null
  );

  return {
    totalDomains: domains.length,
    totalPlatforms: platforms.length,
    totalConnections: edges.length,
    multiPlatformDomains,
    multiPlatformPercentage:
      domains.length > 0
        ? Math.round((multiPlatformDomains / domains.length) * 100)
        : 0,
    widespreadPlatforms,
    widespreadPercentage:
      platforms.length > 0
        ? Math.round((widespreadPlatforms / platforms.length) * 100)
        : 0,
    mostConnectedDomain,
    mostWidespreadPlatform,
  };
}

/**
 * Build the dropdown list for the platform filter. Sorted alphabetically by
 * the human-readable name (falls back to the raw id).
 */
function listAvailablePlatforms(graph) {
  const ids = new Set(graph.platforms.map(p => p.id));
  return Array.from(ids)
    .map(id => ({ id, name: TRACKING_PLATFORMS[id]?.name || id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export {
  buildBipartiteGraph,
  applyBipartiteFilters,
  sortBipartiteDomains,
  sortBipartitePlatforms,
  computeBipartiteStats,
  listAvailablePlatforms,
};
