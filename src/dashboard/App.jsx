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
import RadialGraph from './components/RadialGraph.jsx';
// MapView removed - requires geolocation which was removed per user request
// import MapView from './components/MapView.jsx';
import DataTable from './components/DataTable.jsx';
import PlatformStats from './components/PlatformStats.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import HelpSheet from './components/HelpSheet.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmptyState from './components/EmptyState.jsx';
import './styles/App.css';

function App() {
  const [filter, setFilter] = useState({
    timeRange: 'all', // '1hour', '24hours', '7days', '30days', 'all', 'custom'
    startDate: null,
    endDate: null,
  });

  const [activeView, setActiveView] = useState('graph'); // 'graph', 'map', or 'table'
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null); // Track selected platform from sidebar

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
          <h1>Your Tracking Footprint</h1>

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
            {/* Map View disabled - requires geolocation which was removed per user request */}
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
          {/* Map View disabled - requires geolocation which was removed per user request */}
          {activeView === 'table' && (
            <div id="table-view" role="tabpanel" aria-labelledby="table-tab">
              <DataTable footprints={footprints} stats={stats} />
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <p>
            All data stored locally. Zero telemetry. Open source.{' '}
            <a
              href="https://github.com/yourusername/echofootprint"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
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
