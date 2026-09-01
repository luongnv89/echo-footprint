/**
 * EchoFootPrint Dashboard - Main App Component
 * Per PRD: Radial graph, sidebar, filters
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  getFootprints,
  getStats,
  calculatePlatformStats,
} from './utils/db.js';
import { TRACKING_PLATFORMS } from '../lib/pixel-detector.js';
import RadialGraph from './components/RadialGraph.jsx';
import BipartiteGraph from './components/BipartiteGraph.jsx';
import MapView from './components/MapView.jsx';
import DataTable from './components/DataTable.jsx';
import PlatformStats from './components/PlatformStats.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import HelpSheet from './components/HelpSheet.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmptyState from './components/EmptyState.jsx';
import './styles/App.css';

function App() {
  const [filter, setFilter] = useState({
    timeRange: '24hours', // '1hour', '24hours', '7days', '30days', 'all', 'custom'
    startDate: null,
    endDate: null,
  });

  const [activeView, setActiveView] = useState('graph'); // 'graph', 'bipartite', 'map', or 'table'
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null); // Track selected platform from sidebar
  const [showInsights, setShowInsights] = useState(true);
  const [mapLocationStats, setMapLocationStats] = useState({
    locations: 0,
    totalEvents: 0,
    eventsWithGeo: 0,
    topLocation: null,
    topCount: 0,
    unknownCount: 0,
  });

  // When filters change, reshow insights with updated data
  useEffect(() => {
    setShowInsights(true);
  }, [filter]);

  // When switching views, reshow insights (notably for bipartite)
  useEffect(() => {
    if (activeView === 'bipartite' || activeView === 'map') {
      setShowInsights(true);
    }
  }, [activeView]);

  // Use Dexie's useLiveQuery for reactive data
  const footprints = useLiveQuery(async () => {
    const now = Date.now();
    const filterOptions = {};

    if (filter.timeRange === '1hour') {
      filterOptions.startDate = now - 60 * 60 * 1000; // 1 hour
    } else if (filter.timeRange === '24hours') {
      filterOptions.startDate = now - 24 * 60 * 60 * 1000; // 24 hours
    } else if (filter.timeRange === '7days') {
      filterOptions.startDate = now - 7 * 24 * 60 * 60 * 1000;
    } else if (filter.timeRange === '30days') {
      filterOptions.startDate = now - 30 * 24 * 60 * 60 * 1000;
    } else if (filter.timeRange === 'custom' && filter.startDate) {
      filterOptions.startDate = filter.startDate;
      filterOptions.endDate = filter.endDate || now;
    }

    return await getFootprints(filterOptions);
  }, [filter]);

  const baseStats = useLiveQuery(async () => await getStats());

  // Calculate stats from filtered footprints to match the graph data
  const stats = useMemo(() => {
    if (!baseStats || !footprints) return baseStats;

    // Calculate platform stats from filtered footprints
    const platformStats = calculatePlatformStats(footprints);

    // Count unique domains in filtered data
    const uniqueDomains = new Set(footprints.map(fp => fp.domain)).size;

    return {
      ...baseStats,
      totalFootprints: footprints.length,
      uniqueDomains: uniqueDomains,
      platformStats: platformStats,
    };
  }, [baseStats, footprints]);

  const insights = useMemo(() => {
    if (!stats || !footprints || footprints.length === 0) {
      return {
        totalDetections: 0,
        uniqueDomains: 0,
        activePlatforms: 0,
        topPlatformName: '—',
        topPlatformShare: 0,
        topDomain: '—',
        topDomainDetections: 0,
        messages: [],
      };
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

    // Domain-level insight
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

    // Build concise sentences (2-3)
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
      totalDetections: totalDetections,
      uniqueDomains: stats.uniqueDomains || 0,
      activePlatforms,
      topPlatformName,
      topPlatformShare,
      topDomain,
      topDomainDetections,
      messages,
    };
  }, [stats, footprints]);

  const bipartiteInsights = useMemo(() => {
    if (!footprints || footprints.length === 0) {
      return {
        messages: [
          'Switch to graph and start browsing to populate the bipartite view.',
        ],
      };
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

    // Overview
    messages.push(
      `${totalPlatforms} platform${totalPlatforms === 1 ? '' : 's'} across ${totalDomains} domain${totalDomains === 1 ? '' : 's'}; avg ${avgPlatformsPerDomain} platform${avgPlatformsPerDomain === '1.0' ? '' : 's'} per domain.`
    );

    // Cross-linking
    if (multiPlatformDomains > 0) {
      messages.push(
        `${multiPlatformDomains} domain${multiPlatformDomains === 1 ? '' : 's'} link to multiple platforms; ${topDomain} spans ${topDomainPlatforms} platform${topDomainPlatforms === 1 ? '' : 's'}, your most entangled node.`
      );
    } else {
      messages.push(
        `No domains connect to multiple platforms yet—tracking looks isolated per site in this window.`
      );
    }

    // Reach
    messages.push(
      `${topPlatformName} reaches ${topPlatformDomains} domain${topPlatformDomains === 1 ? '' : 's'} (${topPlatformCoverage}% coverage), widest in your network.`
    );

    return { messages };
  }, [footprints]);

  const footprintsCount = Array.isArray(footprints) ? footprints.length : 0;

  const mapInsights = useMemo(() => {
    const {
      locations = 0,
      totalEvents = 0,
      eventsWithGeo = 0,
      topLocation,
      topCount = 0,
      unknownCount = 0,
    } = mapLocationStats || {};

    if (!footprints || footprints.length === 0) {
      return {
        messages: [
          'Browse a few sites to populate the map with geolocated detections.',
        ],
      };
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
        : 'Data stays local; map geolocation is opt-in and only sends tracked domain names over HTTPS.',
    ];

    return { messages };
  }, [mapLocationStats, footprints]);

  const displayedInsights =
    activeView === 'bipartite'
      ? bipartiteInsights.messages
      : activeView === 'map'
        ? mapInsights.messages
        : insights.messages;

  // Handler for platform selection from sidebar
  const handlePlatformSelect = (platformId, platformData) => {
    // Switch to graph view if not already there
    if (activeView !== 'graph') {
      setActiveView('graph');
    }

    // Set the selected platform for RadialGraph
    setSelectedPlatform({
      platformId,
      ...platformData,
    });
  };

  // Loading state
  if (footprints === undefined || baseStats === undefined) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your tracking data...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!footprints || footprints.length === 0) {
    return (
      <div className="app">
        <Sidebar
          stats={stats}
          filter={filter}
          onFilterChange={setFilter}
          onSettingsClick={() => setShowSettings(true)}
          onHelpClick={() => setShowHelp(true)}
          onPlatformSelect={handlePlatformSelect}
        />
        <main className="main-content">
          <EmptyState />
        </main>
        <SettingsSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          stats={stats}
        />
        <HelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        stats={stats}
        filter={filter}
        onFilterChange={setFilter}
        activeView={activeView}
        onViewChange={setActiveView}
        onSettingsClick={() => setShowSettings(true)}
        onHelpClick={() => setShowHelp(true)}
        onPlatformSelect={handlePlatformSelect}
        selectedPlatform={selectedPlatform}
      />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="dashboard-header-top">
            <h1>Privacy-first tracking visualization</h1>
            {showInsights && (
              <div
                className="dashboard-insights-banner"
                role="status"
                aria-label="Tracking insights"
              >
                <div className="insight-banner-icon" aria-hidden="true">
                  ★
                </div>
                <div className="dashboard-insights-text">
                  {displayedInsights.length > 0 ? (
                    displayedInsights.map((msg, idx) => (
                      <p key={idx} className="insight-line">
                        {msg}
                      </p>
                    ))
                  ) : (
                    <p className="insight-line">
                      Start browsing to see insights.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="insight-dismiss"
                  aria-label="Dismiss insights"
                  onClick={() => setShowInsights(false)}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <nav className="view-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeView === 'graph'}
              aria-controls="graph-view"
              className={`tab-button ${activeView === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveView('graph')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <circle cx="10" cy="10" r="2" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="4" cy="14" r="2" />
                <circle cx="16" cy="14" r="2" />
                <line
                  x1="10"
                  y1="10"
                  x2="6"
                  y2="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="10"
                  y1="10"
                  x2="14"
                  y2="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="10"
                  y1="10"
                  x2="6"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="10"
                  y1="10"
                  x2="14"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              Graph View
            </button>
            <button
              role="tab"
              aria-selected={activeView === 'bipartite'}
              aria-controls="bipartite-view"
              className={`tab-button ${activeView === 'bipartite' ? 'active' : ''}`}
              onClick={() => setActiveView('bipartite')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <circle cx="4" cy="4" r="2" />
                <circle cx="4" cy="10" r="2" />
                <circle cx="4" cy="16" r="2" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="16" cy="14" r="2" />
                <line
                  x1="6"
                  y1="4"
                  x2="14"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="6"
                  y1="10"
                  x2="14"
                  y2="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="6"
                  y1="10"
                  x2="14"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="6"
                  y1="16"
                  x2="14"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              Bipartite Graph
            </button>
            <button
              role="tab"
              aria-selected={activeView === 'map'}
              aria-controls="map-view"
              className={`tab-button ${activeView === 'map' ? 'active' : ''}`}
              onClick={() => setActiveView('map')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 3l-5 2v11l5-2 6 2 5-2V3l-5 2-6-2zm0 2v9l6 2V7L7 5z" />
              </svg>
              Map View
            </button>
            <button
              role="tab"
              aria-selected={activeView === 'table'}
              aria-controls="table-view"
              className={`tab-button ${activeView === 'table' ? 'active' : ''}`}
              onClick={() => setActiveView('table')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M3 3h14v14H3V3zm0 4h14M7 7v10"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1.5"
                />
              </svg>
              Data Table
            </button>
          </nav>
        </header>

        <section className="visualization-section">
          {activeView === 'graph' && (
            <div id="graph-view" role="tabpanel" aria-labelledby="graph-tab">
              <RadialGraph
                footprints={footprints}
                stats={stats}
                externalPlatformFocus={selectedPlatform}
                onPlatformFocusChange={setSelectedPlatform}
              />
            </div>
          )}
          {activeView === 'bipartite' && (
            <div
              id="bipartite-view"
              role="tabpanel"
              aria-labelledby="bipartite-tab"
            >
              <BipartiteGraph footprints={footprints} stats={stats} />
            </div>
          )}
          {activeView === 'map' && (
            <div id="map-view" role="tabpanel" aria-labelledby="map-tab">
              <MapView
                footprints={footprints}
                stats={stats}
                onLocationStatsUpdate={setMapLocationStats}
              />
            </div>
          )}
          {activeView === 'table' && (
            <div id="table-view" role="tabpanel" aria-labelledby="table-tab">
              <DataTable footprints={footprints} stats={stats} />
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <p>
            All data stored locally. Zero telemetry. Optional map geolocation
            (off by default) uses https://ip-api.com.{' '}
            <a
              href="https://github.com/luongnv89/echo-footprint/blob/main/privacy-policy.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            {' • '}
            <a
              href="https://echo-footprint.luongnv.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              More detail
            </a>
          </p>
        </footer>
      </main>

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        stats={stats}
      />

      <HelpSheet isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
