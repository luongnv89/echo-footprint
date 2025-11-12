/**
 * EchoFootPrint Dashboard - Main App Component
 * Per PRD: Radial graph, sidebar, filters
 */

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getFootprints, getStats } from './utils/db.js';
import RadialGraph from './components/RadialGraph.jsx';
// MapView removed - requires geolocation which was removed per user request
// import MapView from './components/MapView.jsx';
import DataTable from './components/DataTable.jsx';
import PlatformStats from './components/PlatformStats.jsx';
import ScreenshotModal from './components/ScreenshotModal.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import HelpSheet from './components/HelpSheet.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmptyState from './components/EmptyState.jsx';
import './styles/App.css';

function App() {
  const [filter, setFilter] = useState({
    timeRange: 'all', // '7days', '30days', 'all', 'custom'
    startDate: null,
    endDate: null,
  });

  const [activeView, setActiveView] = useState('graph'); // 'graph', 'map', or 'table'
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Use Dexie's useLiveQuery for reactive data
  const footprints = useLiveQuery(
    async () => {
      const now = Date.now();
      const filterOptions = {};

      if (filter.timeRange === '7days') {
        filterOptions.startDate = now - 7 * 24 * 60 * 60 * 1000;
      } else if (filter.timeRange === '30days') {
        filterOptions.startDate = now - 30 * 24 * 60 * 60 * 1000;
      } else if (filter.timeRange === 'custom' && filter.startDate) {
        filterOptions.startDate = filter.startDate;
        filterOptions.endDate = filter.endDate || now;
      }

      return await getFootprints(filterOptions);
    },
    [filter]
  );

  const stats = useLiveQuery(async () => await getStats());

  // Loading state
  if (footprints === undefined || stats === undefined) {
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
        />
        <main className="main-content">
          <EmptyState />
        </main>
        <SettingsSheet
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          stats={stats}
        />
        <HelpSheet
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
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
      />
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-top">
            <div>
              <h1>Your Tracking Footprint</h1>
              <p className="subtitle">
                {stats.totalFootprints} detections across {stats.uniqueDomains}{' '}
                domains
              </p>
            </div>
            <button
              className="screenshot-button"
              onClick={() => setShowScreenshotModal(true)}
              aria-label="Take screenshot"
              title="Export current view as PNG"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Screenshot
            </button>
          </div>

          <nav className="view-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeView === 'graph'}
              aria-controls="graph-view"
              className={`tab-button ${activeView === 'graph' ? 'active' : ''}`}
              onClick={() => setActiveView('graph')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="10" r="2" />
                <circle cx="4" cy="6" r="2" />
                <circle cx="16" cy="6" r="2" />
                <circle cx="4" cy="14" r="2" />
                <circle cx="16" cy="14" r="2" />
                <line x1="10" y1="10" x2="6" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="10" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="10" x2="6" y2="13" stroke="currentColor" strokeWidth="1.5" />
                <line x1="10" y1="10" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" />
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3h14v14H3V3zm0 4h14M7 7v10" stroke="currentColor" fill="none" strokeWidth="1.5" />
              </svg>
              Data Table
            </button>
          </nav>
        </header>

        <section className="visualization-section">
          {activeView === 'graph' && (
            <div id="graph-view" role="tabpanel" aria-labelledby="graph-tab">
              <RadialGraph footprints={footprints} stats={stats} />
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

      <ScreenshotModal
        isOpen={showScreenshotModal}
        onClose={() => setShowScreenshotModal(false)}
        activeView={activeView}
      />

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        stats={stats}
      />

      <HelpSheet
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}

export default App;
