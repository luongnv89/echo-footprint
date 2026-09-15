/**
 * Data Table Component
 * Groups rows by {domain, url, pixelType}, shows counts, latest timestamp, and expandable details.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { TRACKING_PLATFORMS } from '../../lib/tracking-platforms.js';
import { getGeoCache } from '../utils/db.js';
import { cssVar, platformChipStyle } from '../utils/theme.js';
import '../styles/DataTable.css';
import { sanitizeUrl, isSafeUrl } from '../utils/security.js';

// Escape CSV fields and prevent formula injection
export const escapeCSV = field => {
  let str = String(field ?? '');
  if (/^[=+\-@\t\r\n]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

// 12px chevron; rotated up when ascending. Dimmed until the column is sorted.
function SortIcon({ active, asc }) {
  return (
    <svg
      className={`sort-icon${active ? ' active' : ''}${active && asc ? ' asc' : ''}`}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6.5l4 4 4-4" />
    </svg>
  );
}

const SORT_COLUMNS = [
  { column: 'timestamp', label: 'Latest Timestamp' },
  { column: 'domain', label: 'Domain' },
  { column: 'url', label: 'URL' },
  { column: 'platform', label: 'Platform' },
  { column: 'pixelType', label: 'Pixel Type' },
  { column: 'region', label: 'Region' },
  { column: 'count', label: 'Count' },
];

function SortableHeader({ column, label, sortBy, sortOrder, onSort }) {
  const active = sortBy === column;
  const direction = sortOrder === 'asc' ? 'ascending' : 'descending';
  const ariaLabel = active
    ? `Sort by ${label}, ${direction}`
    : `Sort by ${label}`;
  return (
    <th aria-sort={active ? direction : 'none'}>
      <button
        type="button"
        className={`sort-button ${active ? 'active' : ''}`}
        onClick={() => onSort(column)}
        aria-label={ariaLabel}
      >
        {label}
        <SortIcon active={active} asc={sortOrder === 'asc'} />
      </button>
    </th>
  );
}

function DataTable({ footprints, stats }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp','domain','url','platform','pixelType','region','count'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [geoMap, setGeoMap] = useState({});
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Load geolocation cache for unique domains
  useEffect(() => {
    async function loadGeo() {
      if (!Array.isArray(footprints) || footprints.length === 0) {
        setGeoMap({});
        return;
      }
      const domains = [
        ...new Set(footprints.map(fp => fp.domain).filter(Boolean)),
      ];
      const entries = await Promise.all(
        domains.map(async domain => [domain, await getGeoCache(domain)])
      );
      const map = {};
      entries.forEach(([domain, geo]) => {
        if (geo) map[domain] = geo;
      });
      setGeoMap(map);
    }
    loadGeo();
  }, [footprints]);

  const formatRegion = fp => {
    const geo = geoMap[fp?.domain] || fp?.ipGeo || {};
    return geo.city || geo.region || geo.country || 'Unknown';
  };

  // Grouped, filtered, sorted data
  const groupedData = useMemo(() => {
    if (!Array.isArray(footprints)) return [];

    // Filter
    const filtered = footprints.filter(fp => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const region = formatRegion(fp).toLowerCase();
      return (
        (fp.domain || '').toLowerCase().includes(searchLower) ||
        (fp.url || '').toLowerCase().includes(searchLower) ||
        (fp.pixelType || '').toLowerCase().includes(searchLower) ||
        region.includes(searchLower)
      );
    });

    // Group
    const groups = new Map();
    filtered.forEach(fp => {
      const key = `${fp.domain || 'unknown'}|${fp.url || 'unknown'}|${fp.pixelType || 'unknown'}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          domain: fp.domain || 'Unknown',
          url: fp.url || '',
          pixelType: fp.pixelType || 'script',
          platform: fp.platform,
          rows: [],
          latestTimestamp: fp.timestamp || 0,
          region: formatRegion(fp),
        });
      }
      const group = groups.get(key);
      group.rows.push(fp);
      if (fp.timestamp && fp.timestamp > group.latestTimestamp) {
        group.latestTimestamp = fp.timestamp;
      }
      const currentRegion = formatRegion(fp);
      if (group.region === 'Unknown') {
        group.region = currentRegion;
      } else if (group.region !== currentRegion) {
        group.region = 'Mixed';
      }
    });

    const groupedArray = Array.from(groups.values()).map(group => ({
      ...group,
      count: group.rows.length,
    }));

    // Sort
    groupedArray.sort((a, b) => {
      let aVal;
      let bVal;
      switch (sortBy) {
        case 'timestamp':
          aVal = a.latestTimestamp;
          bVal = b.latestTimestamp;
          break;
        case 'domain':
          aVal = a.domain.toLowerCase();
          bVal = b.domain.toLowerCase();
          break;
        case 'url':
          aVal = a.url.toLowerCase();
          bVal = b.url.toLowerCase();
          break;
        case 'platform':
          aVal = (
            TRACKING_PLATFORMS[a.platform || 'facebook']?.name || 'Unknown'
          ).toLowerCase();
          bVal = (
            TRACKING_PLATFORMS[b.platform || 'facebook']?.name || 'Unknown'
          ).toLowerCase();
          break;
        case 'pixelType':
          aVal = a.pixelType.toLowerCase();
          bVal = b.pixelType.toLowerCase();
          break;
        case 'region':
          aVal = (a.region || 'Unknown').toLowerCase();
          bVal = (b.region || 'Unknown').toLowerCase();
          break;
        case 'count':
          aVal = a.count;
          bVal = b.count;
          break;
        default:
          aVal = a.latestTimestamp;
          bVal = b.latestTimestamp;
      }
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });

    return groupedArray;
  }, [footprints, search, sortBy, sortOrder, geoMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(groupedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return groupedData.slice(startIndex, startIndex + itemsPerPage);
  }, [groupedData, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSort = column => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const toggleGroup = key => {
    const next = new Set(expandedGroups);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedGroups(next);
  };

  const handlePageChange = newPage => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExportCSV = () => {
    if (!groupedData || groupedData.length === 0) return;

    const headers = [
      'Timestamp (Latest)',
      'Count',
      'Domain',
      'Platform',
      'Region',
      'URL',
      'Pixel Type',
    ];
    const csvContent = [
      headers.join(','),
      ...groupedData.map(group => {
        const timestamp = formatTimestamp(group.latestTimestamp);
        const domain = group.domain || '';
        const platform =
          TRACKING_PLATFORMS[group.platform || 'facebook']?.name || 'Unknown';
        const region = group.region || 'Unknown';
        const url = group.url || '';
        const pixelType = group.pixelType || 'script';
        const count = group.count || 0;

        return [
          escapeCSV(timestamp),
          escapeCSV(count),
          escapeCSV(domain),
          escapeCSV(platform),
          escapeCSV(region),
          escapeCSV(url),
          escapeCSV(pixelType),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `echofootprint-export-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Empty state
  if (!footprints || footprints.length === 0) {
    return (
      <div className="data-table-empty">
        <p>No tracking data available yet.</p>
        <p className="empty-hint">
          Browse the web to see tracking pixels from various platforms appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="data-table-container">
      {/* Table Controls */}
      <div className="table-controls">
        <div className="search-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="search-icon"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search by domain, URL, pixel type, or region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input input"
            aria-label="Search tracking data"
          />
          {search && (
            <button
              className="clear-search icon-btn pressable"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
              </svg>
            </button>
          )}
        </div>

        <div className="table-actions">
          <button
            className="export-button btn pressable"
            onClick={handleExportCSV}
            disabled={groupedData.length === 0}
            aria-label="Export grouped data to CSV with injection protections"
            title="Export data to CSV (formulas escaped for security)"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            Export CSV
          </button>

          <select
            className="per-page-select select"
            value={itemsPerPage}
            onChange={e => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Items per page"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        {search ? (
          <span>
            Showing <span className="num">{groupedData.length}</span> grouped
            results (from <span className="num">{footprints.length}</span>{' '}
            detections)
          </span>
        ) : (
          <span>
            Showing all <span className="num">{groupedData.length}</span>{' '}
            grouped results (from{' '}
            <span className="num">{footprints.length}</span> detections)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table" role="table">
          <thead>
            <tr>
              {SORT_COLUMNS.map(({ column, label }) => (
                <SortableHeader
                  key={column}
                  column={column}
                  label={label}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(group => {
              const isExpanded = expandedGroups.has(group.key);
              const url = group.url || '';
              const displayUrl =
                url.length > 60 ? `${url.substring(0, 60)}...` : url;
              const platformName =
                TRACKING_PLATFORMS[group.platform || 'facebook']?.name ||
                'Unknown';
              const platformColor =
                TRACKING_PLATFORMS[group.platform || 'facebook']?.color ||
                cssVar('--info');

              return (
                <React.Fragment key={group.key}>
                  <tr
                    className={`group-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <td
                      className="timestamp-cell"
                      data-label="Latest Timestamp"
                    >
                      <button
                        type="button"
                        className="group-expand-btn"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded
                            ? `Collapse group ${group.domain}`
                            : `Expand group ${group.domain}`
                        }
                        onClick={e => {
                          e.stopPropagation();
                          toggleGroup(group.key);
                        }}
                      >
                        <svg
                          className="group-expand-icon"
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M6 3.5l5 4.5-5 4.5" />
                        </svg>
                      </button>
                      {formatTimestamp(group.latestTimestamp)}
                    </td>
                    <td className="domain-cell" data-label="Domain">
                      <span className="domain-badge">{group.domain}</span>
                    </td>
                    <td className="url-cell" data-label="URL">
                      {isSafeUrl(url) ? (
                        <a
                          href={sanitizeUrl(url)}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="url-link"
                          title={url}
                          onClick={e => e.stopPropagation()}
                        >
                          {displayUrl}
                        </a>
                      ) : (
                        <span
                          className="url-text-unsafe"
                          title={`Unsafe URL blocked: ${url}`}
                        >
                          {displayUrl}
                          <span
                            className="unsafe-badge"
                            aria-label="Unsafe URL blocked"
                          >
                            ⚠️
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="platform-cell" data-label="Platform">
                      <span
                        className="platform-badge chip"
                        style={platformChipStyle(platformColor)}
                      >
                        {platformName}
                      </span>
                    </td>
                    <td className="pixel-type-cell" data-label="Pixel Type">
                      {group.pixelType}
                    </td>
                    <td className="region-cell" data-label="Region">
                      {group.region}
                    </td>
                    <td className="count-cell num" data-label="Count">
                      {group.count}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="group-detail-row">
                      <td colSpan={7}>
                        <div className="group-detail-header">
                          <span>
                            Showing <span className="num">{group.count}</span>{' '}
                            event{group.count === 1 ? '' : 's'} for this group
                          </span>
                        </div>
                        <div className="timeline">
                          <div className="timeline-line" />
                          <div className="timeline-points">
                            {group.rows
                              .slice()
                              .sort((a, b) => b.timestamp - a.timestamp)
                              .map((fp, idx) => (
                                <div
                                  key={fp.id || idx}
                                  className="timeline-point"
                                >
                                  <span className="timeline-dot" />
                                  <span className="timeline-timestamp">
                                    {formatTimestamp(fp.timestamp)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-button icon-btn pressable"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="Go to first page"
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
              <path d="M8 3.5L3.5 8l4.5 4.5M12.5 3.5L8 8l4.5 4.5" />
            </svg>
          </button>
          <button
            className="page-button icon-btn pressable"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
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
          </button>

          <span className="page-info">
            Page <span className="num">{currentPage}</span> of{' '}
            <span className="num">{totalPages}</span>
          </span>

          <button
            className="page-button icon-btn pressable"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
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
              <path d="M6 3.5l4.5 4.5L6 12.5" />
            </svg>
          </button>
          <button
            className="page-button icon-btn pressable"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Go to last page"
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
              <path d="M3.5 3.5L8 8l-4.5 4.5M8 3.5l4.5 4.5L8 12.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
