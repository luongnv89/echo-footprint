/**
 * Bipartite Graph Component
 * D3.js bipartite graph visualization showing Ad Platforms ↔ Domain Names
 * Left column: Domain Names | Right column: Ad Platforms | Edges: tracking relationships
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TRACKING_PLATFORMS } from '../../lib/tracking-platforms.js';
import { escapeCSV, toCSV, downloadTextFile } from '../utils/csv.js';
import {
  buildBipartiteGraph,
  applyBipartiteFilters,
  sortBipartiteDomains,
  sortBipartitePlatforms,
  computeBipartiteStats,
  listAvailablePlatforms,
} from '../utils/bipartiteData.js';
import {
  exportBipartitePNG,
  exportBipartiteSVG,
} from '../utils/bipartiteExport.js';
import { drawBipartiteGraph } from '../utils/bipartiteLayout.js';
import { platformChipStyle } from '../utils/theme.js';
import '../styles/BipartiteGraph.css';

function BipartiteGraph({ footprints, stats }) {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    data: null,
    type: null, // 'domain', 'platform', or 'edge'
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isolatedView, setIsolatedView] = useState(null); // { type: 'domain'/'platform', id: string }

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState('all');
  const [minDetections, setMinDetections] = useState(1);
  const [showMultiPlatformOnly, setShowMultiPlatformOnly] = useState(false);
  const [showWidespreadOnly, setShowWidespreadOnly] = useState(false);

  // Sorting
  const [domainSort, setDomainSort] = useState('platforms-desc'); // 'alpha', 'platforms-desc', 'detections-desc'
  const [platformSort, setPlatformSort] = useState('domains-desc'); // 'alpha', 'domains-desc', 'detections-desc'

  // Panel visibility toggles
  const [showFilters, setShowFilters] = useState(false);
  const [showSorting, setShowSorting] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Toggle all panels at once
  const allPanelsVisible =
    showFilters && showSorting && showStatistics && showLegend;
  const toggleAllPanels = () => {
    const newState = !allPanelsVisible;
    setShowFilters(newState);
    setShowSorting(newState);
    setShowStatistics(newState);
    setShowLegend(newState);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return;

    const handleClickOutside = event => {
      // Check if click is outside the export dropdown
      const exportDropdown = event.target.closest('.export-dropdown');
      if (!exportDropdown) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  // Transform footprints into bipartite graph structure
  const graphData = useMemo(
    () => buildBipartiteGraph(footprints),
    [footprints]
  );

  // Apply filters
  const filteredData = useMemo(
    () =>
      applyBipartiteFilters(graphData, {
        searchTerm,
        selectedPlatformFilter,
        minDetections,
        showMultiPlatformOnly,
        showWidespreadOnly,
        isolatedView,
      }),
    [
      graphData,
      searchTerm,
      selectedPlatformFilter,
      minDetections,
      showMultiPlatformOnly,
      showWidespreadOnly,
      isolatedView,
    ]
  );

  // Apply sorting
  const sortedData = useMemo(
    () => ({
      domains: sortBipartiteDomains(filteredData.domains, domainSort),
      platforms: sortBipartitePlatforms(filteredData.platforms, platformSort),
      edges: filteredData.edges,
    }),
    [filteredData, domainSort, platformSort]
  );

  // Render the bipartite graph with D3
  useEffect(() => {
    drawBipartiteGraph(svgRef.current, sortedData, {
      onTooltip: setTooltip,
      onNodeClick: node => {
        setIsolatedView({ type: node.type, id: node.id });
        setSelectedNode(node);
      },
    });
  }, [sortedData]);

  // Calculate statistics
  const stats_data = useMemo(
    () => computeBipartiteStats(sortedData),
    [sortedData]
  );

  // Get available platforms for filter dropdown
  const availablePlatforms = useMemo(
    () => listAvailablePlatforms(graphData),
    [graphData]
  );

  // Export functions
  const handleExportCSV = () => {
    const { edges } = sortedData;
    if (!edges || edges.length === 0) return;

    // CSV headers
    const headers = [
      'Domain',
      'Platform',
      'Detections',
      'First Seen',
      'Last Seen',
    ];
    const rows = edges.map(edge => {
      const domain = edge.source;
      const platformName = TRACKING_PLATFORMS[edge.target]?.name || edge.target;
      const detections = edge.detections;
      const firstSeen = new Date(edge.firstSeen).toLocaleString();
      const lastSeen = new Date(edge.lastSeen).toLocaleString();
      return [domain, platformName, detections, firstSeen, lastSeen];
    });
    const csvContent = toCSV(headers, rows);

    // Download file
    downloadTextFile(csvContent, `bipartite-graph-${Date.now()}.csv`);
  };

  const handleExportPNG = async () => {
    try {
      await exportBipartitePNG(
        svgRef.current?.parentElement,
        `bipartite-graph-${Date.now()}.png`
      );
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  const handleExportSVG = () => {
    exportBipartiteSVG(svgRef.current, `bipartite-graph-${Date.now()}.svg`);
  };

  return (
    <div className="bipartite-graph-container">
      {/* Controls */}
      <div className="graph-controls bipartite-controls panel">
        {isolatedView && (
          <button
            className="btn btn-sm pressable back-button"
            onClick={() => {
              setIsolatedView(null);
              setSelectedNode(null);
            }}
            title="Back to full view"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3.5L5.5 8l4.5 4.5" />
            </svg>
            <span>Full view</span>
          </button>
        )}
        <button
          className="icon-btn pressable"
          onClick={() => {
            const svg = d3.select(svgRef.current);
            svg
              .transition()
              .duration(750)
              .call(d3.zoom().transform, d3.zoomIdentity);
          }}
          title="Reset zoom"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
            <path d="M13.7 1.8v2.6h-2.6" />
          </svg>
        </button>
        <div className="export-dropdown">
          <button
            className={`btn btn-sm pressable export-button ${showExportMenu ? 'active' : ''}`}
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export graph"
            aria-expanded={showExportMenu}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            <span className="button-label">Export</span>
          </button>
          {showExportMenu && (
            <div className="export-menu" role="menu">
              <button
                className="export-menu-item"
                onClick={() => {
                  handleExportPNG();
                  setShowExportMenu(false);
                }}
              >
                Export as PNG
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  handleExportSVG();
                  setShowExportMenu(false);
                }}
              >
                Export as SVG
              </button>
              <button
                className="export-menu-item"
                onClick={() => {
                  handleExportCSV();
                  setShowExportMenu(false);
                }}
              >
                Export as CSV
              </button>
            </div>
          )}
        </div>
        <div className="toggle-controls">
          <button
            className={`icon-btn pressable ${allPanelsVisible ? 'active' : ''}`}
            onClick={toggleAllPanels}
            title={allPanelsVisible ? 'Hide all panels' : 'Show all panels'}
            aria-pressed={allPanelsVisible}
          >
            {allPanelsVisible ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
              </svg>
            )}
          </button>
          <div className="toggle-separator"></div>
          <button
            className={`icon-btn pressable ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? 'Hide filters' : 'Show filters'}
            aria-pressed={showFilters}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z" />
            </svg>
          </button>
          <button
            className={`icon-btn pressable ${showSorting ? 'active' : ''}`}
            onClick={() => setShowSorting(!showSorting)}
            title={showSorting ? 'Hide sorting' : 'Show sorting'}
            aria-pressed={showSorting}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 11.293V2.5zm3.5 1a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z" />
            </svg>
          </button>
          <button
            className={`icon-btn pressable ${showStatistics ? 'active' : ''}`}
            onClick={() => setShowStatistics(!showStatistics)}
            title={showStatistics ? 'Hide statistics' : 'Show statistics'}
            aria-pressed={showStatistics}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5v12h-2V2h2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1h-2zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3z" />
            </svg>
          </button>
          <button
            className={`icon-btn pressable ${showLegend ? 'active' : ''}`}
            onClick={() => setShowLegend(!showLegend)}
            title={showLegend ? 'Hide legend' : 'Show legend'}
            aria-pressed={showLegend}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z" />
            </svg>
          </button>
        </div>
        <div className="zoom-hint">
          Drag to pan • Scroll to zoom • Click nodes to isolate
        </div>
      </div>

      {/* Side column: Filters / Sort / Statistics / Legend */}
      {(showFilters || showSorting || showStatistics || showLegend) && (
        <div className="bipartite-side">
          {/* Filters */}
          {showFilters && (
            <div className="filter-panel panel">
              <div className="panel-title">Filters</div>
              <div className="filter-section">
                <label>Search domains</label>
                <input
                  type="text"
                  placeholder="Filter domains..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="filter-input input"
                />
              </div>

              <div className="filter-section">
                <label>Platform</label>
                <select
                  value={selectedPlatformFilter}
                  onChange={e => setSelectedPlatformFilter(e.target.value)}
                  className="filter-select select"
                >
                  <option value="all">All Platforms</option>
                  {availablePlatforms.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <label>
                  Min detections: <span className="num">{minDetections}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={minDetections}
                  onChange={e => setMinDetections(parseInt(e.target.value))}
                  className="filter-range"
                />
              </div>

              <div className="filter-section checkbox-section">
                <label>
                  <input
                    type="checkbox"
                    checked={showMultiPlatformOnly}
                    onChange={e => setShowMultiPlatformOnly(e.target.checked)}
                  />
                  Multi-platform domains only (2+)
                </label>
              </div>

              <div className="filter-section checkbox-section">
                <label>
                  <input
                    type="checkbox"
                    checked={showWidespreadOnly}
                    onChange={e => setShowWidespreadOnly(e.target.checked)}
                  />
                  Widespread platforms only (5+ domains)
                </label>
              </div>
            </div>
          )}

          {/* Sorting Controls */}
          {showSorting && (
            <div className="sort-panel panel">
              <div className="panel-title">Sort</div>
              <div className="sort-section">
                <label>Domains</label>
                <select
                  value={domainSort}
                  onChange={e => setDomainSort(e.target.value)}
                  className="sort-select select"
                >
                  <option value="platforms-desc">Most Platforms</option>
                  <option value="detections-desc">Most Detections</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>

              <div className="sort-section">
                <label>Platforms</label>
                <select
                  value={platformSort}
                  onChange={e => setPlatformSort(e.target.value)}
                  className="sort-select select"
                >
                  <option value="domains-desc">Most Domains</option>
                  <option value="detections-desc">Most Detections</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>
            </div>
          )}

          {/* Statistics Panel */}
          {showStatistics && (
            <div className="statistics-panel panel">
              <div className="panel-title">Statistics</div>
              <div className="kv">
                <div className="kv-row">
                  <span className="kv-label">Total domains</span>
                  <span className="kv-value num">
                    {stats_data.totalDomains}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Total platforms</span>
                  <span className="kv-value num">
                    {stats_data.totalPlatforms}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Total connections</span>
                  <span className="kv-value num">
                    {stats_data.totalConnections}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Multi-platform domains</span>
                  <span className="kv-value num highlight">
                    {stats_data.multiPlatformDomains} (
                    {stats_data.multiPlatformPercentage}%)
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Widespread platforms</span>
                  <span className="kv-value num highlight">
                    {stats_data.widespreadPlatforms} (
                    {stats_data.widespreadPercentage}%)
                  </span>
                </div>
                {stats_data.mostConnectedDomain && (
                  <div className="kv-row">
                    <span className="kv-label">Most connected domain</span>
                    <span className="kv-value small">
                      {stats_data.mostConnectedDomain.label} (
                      {stats_data.mostConnectedDomain.platformCount} platforms)
                    </span>
                  </div>
                )}
                {stats_data.mostWidespreadPlatform && (
                  <div className="kv-row">
                    <span className="kv-label">Most widespread platform</span>
                    <span className="kv-value small">
                      {stats_data.mostWidespreadPlatform.label} (
                      {stats_data.mostWidespreadPlatform.domainCount} domains)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          {showLegend && (
            <div className="graph-legend panel">
              <div className="panel-title">Legend</div>
              <div className="legend-section">
                <div className="legend-subtitle">Node size</div>
                <div className="legend-item">
                  <svg width="20" height="20">
                    <circle
                      cx="10"
                      cy="10"
                      r="4"
                      style={{ fill: 'var(--info)' }}
                    />
                  </svg>
                  <span>Few connections/detections</span>
                </div>
                <div className="legend-item">
                  <svg width="20" height="20">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      style={{ fill: 'var(--info)' }}
                    />
                  </svg>
                  <span>Many connections/detections</span>
                </div>
              </div>
              <div className="legend-section">
                <div className="legend-subtitle">Highlights</div>
                <div className="legend-item">
                  <svg width="20" height="20">
                    <circle
                      cx="10"
                      cy="10"
                      r="6"
                      style={{
                        fill: 'var(--danger)',
                        stroke: 'var(--danger)',
                      }}
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Multi-platform domain</span>
                </div>
                <div className="legend-item">
                  <svg width="20" height="20">
                    <circle
                      cx="10"
                      cy="10"
                      r="6"
                      style={{
                        fill: 'var(--info)',
                        stroke: 'var(--warning)',
                      }}
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Widespread platform</span>
                </div>
              </div>
              <div className="legend-section">
                <div className="legend-subtitle">Edge width</div>
                <div className="legend-item">
                  <svg width="30" height="10">
                    <line
                      x1="0"
                      y1="5"
                      x2="30"
                      y2="5"
                      style={{ stroke: 'rgba(255,255,255,0.22)' }}
                      strokeWidth="1"
                    />
                  </svg>
                  <span>Few detections</span>
                </div>
                <div className="legend-item">
                  <svg width="30" height="10">
                    <line
                      x1="0"
                      y1="5"
                      x2="30"
                      y2="5"
                      style={{ stroke: 'rgba(255,255,255,0.22)' }}
                      strokeWidth="4"
                    />
                  </svg>
                  <span>Many detections</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SVG Canvas */}
      <svg ref={svgRef} className="bipartite-graph-svg"></svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          className="graph-tooltip tooltip"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          {tooltip.type === 'domain' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong>{tooltip.data.label}</strong>
              </div>
              <p>Total Detections: {tooltip.data.detections}</p>
              <p>Connected Platforms: {tooltip.data.platformCount}</p>
              <div className="tooltip-divider"></div>
              <p className="tooltip-subtitle">Platforms:</p>
              {tooltip.data.platforms.slice(0, 5).map((p, i) => (
                <p
                  key={i}
                  style={{
                    color: platformChipStyle(p.color).color,
                    fontSize: '11px',
                    marginLeft: '8px',
                  }}
                >
                  • {p.name} ({p.count})
                </p>
              ))}
              {tooltip.data.platforms.length > 5 && (
                <p
                  style={{
                    fontSize: '11px',
                    marginLeft: '8px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  ... {tooltip.data.platforms.length - 5} more
                </p>
              )}
              <div className="tooltip-divider"></div>
              <p className="tooltip-meta">
                First Seen:{' '}
                {new Date(tooltip.data.firstSeen).toLocaleDateString()}
              </p>
              <p className="tooltip-meta">
                Last Seen:{' '}
                {new Date(tooltip.data.lastSeen).toLocaleDateString()}
              </p>
            </div>
          )}
          {tooltip.type === 'platform' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong
                  style={{
                    color: platformChipStyle(tooltip.data.color).color,
                  }}
                >
                  {tooltip.data.label}
                </strong>
              </div>
              <p>Total Detections: {tooltip.data.detections}</p>
              <p>Unique Domains: {tooltip.data.domainCount}</p>
              <div className="tooltip-divider"></div>
              <p className="tooltip-subtitle">Top Domains:</p>
              {tooltip.data.domains.slice(0, 5).map((d, i) => (
                <p key={i} style={{ fontSize: '11px', marginLeft: '8px' }}>
                  • {d.domain} ({d.count})
                </p>
              ))}
              {tooltip.data.domains.length > 5 && (
                <p
                  style={{
                    fontSize: '11px',
                    marginLeft: '8px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  ... {tooltip.data.domains.length - 5} more
                </p>
              )}
            </div>
          )}
          {tooltip.type === 'edge' && (
            <div className="tooltip-content">
              <div className="tooltip-header">
                <strong>
                  {tooltip.data.source} →{' '}
                  {TRACKING_PLATFORMS[tooltip.data.target]?.name ||
                    tooltip.data.target}
                </strong>
              </div>
              <p>Detections: {tooltip.data.detections}</p>
              <p className="tooltip-meta">
                First Detection:{' '}
                {new Date(tooltip.data.firstSeen).toLocaleDateString()}
              </p>
              <p className="tooltip-meta">
                Last Detection:{' '}
                {new Date(tooltip.data.lastSeen).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BipartiteGraph;
