/**
 * Sidebar Component
 * Navigation, filters, and stats
 * Per PRD: Time filters, settings access
 */

import React from 'react';
import PlatformStats from './PlatformStats.jsx';
import '../styles/Sidebar.css';

function Sidebar({ stats, filter, onFilterChange, activeView, onViewChange, onSettingsClick, onHelpClick }) {
  const handleFilterChange = timeRange => {
    onFilterChange({
      timeRange,
      startDate: null,
      endDate: null,
    });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <h1>EchoFootPrint</h1>
          <span className="version">v1.0.0</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h2>Visualizations</h2>
          <button
            className={`nav-button ${activeView === 'graph' ? 'active' : ''}`}
            onClick={() => onViewChange('graph')}
            aria-label="Switch to graph view"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <circle cx="10" cy="10" r="2" />
              <circle cx="5" cy="5" r="1.5" />
              <circle cx="15" cy="5" r="1.5" />
              <circle cx="5" cy="15" r="1.5" />
              <circle cx="15" cy="15" r="1.5" />
              <line x1="10" y1="10" x2="5" y2="5" stroke="currentColor" />
              <line x1="10" y1="10" x2="15" y2="5" stroke="currentColor" />
              <line x1="10" y1="10" x2="5" y2="15" stroke="currentColor" />
              <line x1="10" y1="10" x2="15" y2="15" stroke="currentColor" />
            </svg>
            <span>Radial Graph</span>
          </button>
          {/* Map View disabled - requires geolocation which was removed per user request */}
          <button
            className={`nav-button ${activeView === 'table' ? 'active' : ''}`}
            onClick={() => onViewChange('table')}
            aria-label="Switch to data table view"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3 3h14v14H3V3zm0 4h14M7 7v10" stroke="currentColor" fill="none" strokeWidth="1.5" />
            </svg>
            <span>Data Table</span>
          </button>
        </div>

        <div className="nav-section">
          <h2>Time Filters</h2>
          <div className="filter-buttons">
            <button
              className={`filter-button ${filter.timeRange === '7days' ? 'active' : ''}`}
              onClick={() => handleFilterChange('7days')}
            >
              Last 7 Days
            </button>
            <button
              className={`filter-button ${filter.timeRange === '30days' ? 'active' : ''}`}
              onClick={() => handleFilterChange('30days')}
            >
              Last 30 Days
            </button>
            <button
              className={`filter-button ${filter.timeRange === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="nav-section stats-section">
          <h2>Statistics</h2>
          <div className="stat-card">
            <div className="stat-label">Total Detections</div>
            <div className="stat-value">{stats?.totalFootprints || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unique Domains</div>
            <div className="stat-value">{stats?.uniqueDomains || 0}</div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="nav-section platform-stats-sidebar">
          <PlatformStats stats={stats} />
        </div>
      </nav>

      <footer className="sidebar-footer">
        <button className="footer-button" onClick={onSettingsClick}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
          </svg>
          Settings
        </button>
        <button className="footer-button" onClick={onHelpClick}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
          </svg>
          Help
        </button>
      </footer>
    </aside>
  );
}

export default Sidebar;
