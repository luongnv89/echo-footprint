/**
 * Dashboard insights hooks
 *
 * Pure data-reduction utilities that turn filtered `footprints` plus
 * precomputed `stats` and `mapLocationStats` into the short sentences
 * shown in the dashboard banner. Extracted from `App.jsx` (issue #33,
 * F-CLEAN-002) so the App component is pure orchestration/JSX.
 *
 * Three hooks live here:
 *  - `useOverviewInsights` — used for the default (graph) view
 *  - `useBipartiteInsights` — used for the bipartite view
 *  - `useMapInsights` — used for the map view (depends on MapView
 *    reporting back the latest location aggregate via
 *    `onLocationStatsUpdate`).
 *
 * The trio of inputs is intentionally narrow: `footprints`, the
 * computed `stats` (which already wraps `baseStats` + filtered
 * aggregates), and the live `mapLocationStats` from MapView. The hooks
 * are deterministic given those inputs, so any future characterization
 * test can drive them with fixtures without rendering React.
 */

import { useMemo } from 'react';
import { TRACKING_PLATFORMS } from '../../lib/tracking-platforms.js';

const EMPTY_OVERVIEW = {
  totalDetections: 0,
  uniqueDomains: 0,
  activePlatforms: 0,
  topPlatformName: '—',
  topPlatformShare: 0,
  topDomain: '—',
  topDomainDetections: 0,
  messages: [],
};

const EMPTY_BIPARTITE = {
  messages: [
    'Switch to graph and start browsing to populate the bipartite view.',
  ],
};

const EMPTY_MAP = {
  messages: [
    'Browse a few sites to populate the map with geolocated detections.',
  ],
};

export function useOverviewInsights(stats, footprints) {
  return useMemo(() => {
    if (!stats || !footprints || footprints.length === 0) {
      return EMPTY_OVERVIEW;
    }

    const platformEntries = Object.entries(stats.platformStats || {});
    const totalDetections = stats.totalFootprints || 0;
    const activePlatforms = platformEntries.length;

    let topPlatformName = '—';
    let topPlatformShare = 0;
    if (platformEntries.length && totalDetections > 0) {
      const [topPlatformId, topPlatformData] = platformEntries.reduce(
        (max, entry) => (entry[1].detections > max[1].detections ? entry : max),
        platformEntries[0]
      );
      topPlatformName =
        TRACKING_PLATFORMS[topPlatformId]?.name || topPlatformId;
      topPlatformShare = Math.round(
        (topPlatformData.detections / totalDetections) * 100
      );
    }

    const domainCounts = footprints.reduce((acc, fp) => {
      const domain = fp.domain || 'unknown';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});
    const domainEntries = Object.entries(domainCounts);
    const [topDomain, topDomainDetections] =
      domainEntries.length > 0
        ? domainEntries.reduce(
            (max, entry) => (entry[1] > max[1] ? entry : max),
            domainEntries[0]
          )
        : ['—', 0];

    const avgPerDomain =
      stats.uniqueDomains && stats.uniqueDomains > 0
        ? (totalDetections / stats.uniqueDomains).toFixed(1)
        : '0';

    const messages = [];
    if (topPlatformShare > 0) {
      messages.push(
        `${topPlatformName} drives ${topPlatformShare}% of current detections.`
      );
    }
    if (activePlatforms > 1 && avgPerDomain !== '0') {
      messages.push(
        `Traffic spans ${activePlatforms} platforms, averaging ${avgPerDomain} detections per domain.`
      );
    }
    if (topDomainDetections > 0) {
      messages.push(
        `${topDomain} is your busiest domain with ${topDomainDetections} detections.`
      );
    }

    return {
      totalDetections,
      uniqueDomains: stats.uniqueDomains || 0,
      activePlatforms,
      topPlatformName,
      topPlatformShare,
      topDomain,
      topDomainDetections,
      messages,
    };
  }, [stats, footprints]);
}

export function useBipartiteInsights(footprints) {
  return useMemo(() => {
    if (!footprints || footprints.length === 0) {
      return EMPTY_BIPARTITE;
    }

    const domainToPlatforms = new Map();
    const platformToDomains = new Map();

    footprints.forEach(fp => {
      const domain = fp.domain || 'unknown';
      const platform = fp.platform || 'unknown';

      if (!domainToPlatforms.has(domain)) {
        domainToPlatforms.set(domain, new Set());
      }
      domainToPlatforms.get(domain).add(platform);

      if (!platformToDomains.has(platform)) {
        platformToDomains.set(platform, new Set());
      }
      platformToDomains.get(platform).add(domain);
    });

    const totalDomains = domainToPlatforms.size;
    const totalPlatforms = platformToDomains.size;
    const multiPlatformDomains = [...domainToPlatforms.values()].filter(
      set => set.size > 1
    ).length;

    const topDomainEntry = [...domainToPlatforms.entries()].reduce(
      (max, entry) => (entry[1].size > max[1].size ? entry : max),
      [null, new Set()]
    );
    const topPlatformEntry = [...platformToDomains.entries()].reduce(
      (max, entry) => (entry[1].size > max[1].size ? entry : max),
      [null, new Set()]
    );

    const topDomain = topDomainEntry[0] || '—';
    const topDomainPlatforms = topDomainEntry[1].size || 0;
    const topPlatformId = topPlatformEntry[0] || '—';
    const topPlatformDomains = topPlatformEntry[1].size || 0;
    const topPlatformName =
      TRACKING_PLATFORMS[topPlatformId]?.name || topPlatformId;

    const avgPlatformsPerDomain =
      totalDomains > 0
        ? (
            Array.from(domainToPlatforms.values()).reduce(
              (sum, set) => sum + set.size,
              0
            ) / totalDomains
          ).toFixed(1)
        : '0';

    const topPlatformCoverage =
      totalDomains > 0
        ? Math.round((topPlatformDomains / totalDomains) * 100)
        : 0;

    const messages = [];

    messages.push(
      `${totalPlatforms} platform${totalPlatforms === 1 ? '' : 's'} across ${totalDomains} domain${totalDomains === 1 ? '' : 's'}; avg ${avgPlatformsPerDomain} platform${avgPlatformsPerDomain === '1.0' ? '' : 's'} per domain.`
    );

    if (multiPlatformDomains > 0) {
      messages.push(
        `${multiPlatformDomains} domain${multiPlatformDomains === 1 ? '' : 's'} link to multiple platforms; ${topDomain} spans ${topDomainPlatforms} platform${topDomainPlatforms === 1 ? '' : 's'}, your most entangled node.`
      );
    } else {
      messages.push(
        'No domains connect to multiple platforms yet—tracking looks isolated per site in this window.'
      );
    }

    messages.push(
      `${topPlatformName} reaches ${topPlatformDomains} domain${topPlatformDomains === 1 ? '' : 's'} (${topPlatformCoverage}% coverage), widest in your network.`
    );

    return { messages };
  }, [footprints]);
}

export function useMapInsights(mapLocationStats, footprints) {
  return useMemo(() => {
    const {
      locations = 0,
      totalEvents = 0,
      eventsWithGeo = 0,
      topLocation,
      topCount = 0,
      unknownCount = 0,
    } = mapLocationStats || {};

    if (!footprints || footprints.length === 0) {
      return EMPTY_MAP;
    }

    if (!eventsWithGeo || !locations) {
      return {
        messages: [
          'Geolocation data not available yet—continue browsing to see map coverage.',
        ],
      };
    }

    const topShare = Math.round((topCount / eventsWithGeo) * 100);
    const unknownShare =
      unknownCount > 0 ? Math.round((unknownCount / totalEvents) * 100) : 0;

    const messages = [
      `${locations} location${locations === 1 ? '' : 's'} detected across ${eventsWithGeo} mapped event${eventsWithGeo === 1 ? '' : 's'}.`,
      `${topLocation || 'Top region'} holds ${topShare}% of mapped detections (${topCount} event${topCount === 1 ? '' : 's'}).`,
      unknownCount > 0
        ? `${unknownShare}% of detections have unknown location (cached lookup pending or unavailable).`
        : 'Data stays local; map geolocation is opt-in and only sends tracked domain names to ip-api.com.',
    ];

    return { messages };
  }, [mapLocationStats, footprints]);
}

export function selectDisplayedInsights(activeView, insights, bipartite, map) {
  if (activeView === 'bipartite') return bipartite.messages;
  if (activeView === 'map') return map.messages;
  return insights.messages;
}
