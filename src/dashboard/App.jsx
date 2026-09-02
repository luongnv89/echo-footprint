/**
 * EchoFootPrint Dashboard - Main App Component
 * Per PRD: Radial graph, sidebar, filters
 *
 * After issue #33, App is pure orchestration: state, data queries,
 * insight hooks, and JSX composition. The platform catalog moved to
 * `src/lib/tracking-platforms.js`; insight reduction moved to
 * `src/dashboard/hooks/useDashboardInsights.js`; the view-tabs and
 * insights-banner JSX moved to their own components.
 */

import React, { Suspense, useState, useEffect, useMemo, lazy } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  getFootprints,
  getStats,
  calculatePlatformStats,
} from './utils/db.js';
const RadialGraph = lazy(() => import('./components/RadialGraph.jsx'));
const BipartiteGraph = lazy(() => import('./components/BipartiteGraph.jsx'));
const MapView = lazy(() => import('./components/MapView.jsx'));
const DataTable = lazy(() => import('./components/DataTable.jsx'));
import SkeletonPlaceholder from './components/SkeletonPlaceholder.jsx';
import PlatformStats from './components/PlatformStats.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import HelpSheet from './components/HelpSheet.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmptyState from './components/EmptyState.jsx';
import ViewTabs from './components/ViewTabs.jsx';
import InsightsBanner from './components/InsightsBanner.jsx';
import {
  useOverviewInsights,
  useBipartiteInsights,
  useMapInsights,
  selectDisplayedInsights,
} from './hooks/useDashboardInsights.js';
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

  const overviewInsights = useOverviewInsights(stats, footprints);
  const bipartiteInsights = useBipartiteInsights(footprints);
  const mapInsights = useMapInsights(mapLocationStats, footprints);

  const displayedInsights = selectDisplayedInsights(
    activeView,
    overviewInsights,
    bipartiteInsights,
    mapInsights
  );

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
            <h1>
              {activeView === 'graph' &&
                'Network visualization of your tracking footprint'}
              {activeView === 'bipartite' &&
                'Bipartite graph of platforms and domains'}
              {activeView === 'map' &&
                'Geographic distribution of tracking events'}
              {activeView === 'table' &&
                'Detailed table of all detected tracking pixels'}
            </h1>
            <InsightsBanner
              messages={displayedInsights}
              visible={showInsights}
              onDismiss={() => setShowInsights(false)}
            />
          </div>

          <ViewTabs activeView={activeView} onViewChange={setActiveView} />
        </header>

        <section className="visualization-section">
          <Suspense fallback={<SkeletonPlaceholder />}>
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
          </Suspense>
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
