/**
 * Sidebar Component
 * Navigation, filters, and stats
 * Per PRD: Time filters, settings access
 */

import React, { useState, useEffect } from 'react';
import PlatformStats from './PlatformStats.jsx';
import '../styles/Sidebar.css';
import logoSvg from '../../assets/logo.svg?url';

function Sidebar({
  stats,
  filter,
  onFilterChange,
  activeView,
  onViewChange,
  onSettingsClick,
  onHelpClick,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [buildVersion, setBuildVersion] = useState('v1.1.0');

  // Load build info with commit hash
  useEffect(() => {
    fetch('/build-info.json')
      .then(res => res.json())
      .then(buildInfo => {
        setBuildVersion(`v${buildInfo.versionWithCommit}`);
      })
      .catch(() => {
        // Fallback to package.json version if build-info.json not found
        setBuildVersion('v1.1.0');
      });
  }, []);

  const timeFilterOptions = [
    { value: '1hour', label: 'Last Hour' },
    { value: '24hours', label: 'Last 24 Hours' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const handleFilterChange = timeRange => {
    onFilterChange({
      timeRange,
      startDate: null,
      endDate: null,
    });
    setShowDropdown(false);
  };

  const getActiveFilterLabel = () => {
    const activeOption = timeFilterOptions.find(
      opt => opt.value === filter.timeRange
    );
    return activeOption ? activeOption.label : 'All Time';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img src={logoSvg} alt="EchoFootPrint Logo" className="logo-image" />
          <div className="logo-text">
            <h1>EchoFootPrint</h1>
            <span className="version" title={`Build: ${buildVersion}`}>{buildVersion}</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h2>Time Filter</h2>
          <div className="time-filter-dropdown">
            <button
              className="dropdown-button"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
              aria-haspopup="true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
              </svg>
              <span>{getActiveFilterLabel()}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`dropdown-chevron ${showDropdown ? 'open' : ''}`}
              >
                <path
                  fillRule="evenodd"
                  d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                />
              </svg>
            </button>

            {showDropdown && (
              <div className="dropdown-menu">
                {timeFilterOptions.map(option => (
                  <button
                    key={option.value}
                    className={`dropdown-item ${filter.timeRange === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange(option.value)}
                  >
                    {option.label}
                    {filter.timeRange === option.value && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
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
