/**
 * Data Table Component
 * Sortable, filterable, paginated table for raw tracking data
 * Per PRD: CSV export, domain search, timestamp sorting, WCAG compliant
 */

import React, { useState, useMemo } from 'react';
import { TRACKING_PLATFORMS } from '../../lib/pixel-detector.js';
import '../styles/DataTable.css';

function DataTable({ footprints, stats }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'domain', 'url', 'pixelType'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!footprints) return [];

    let filtered = footprints.filter(fp => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        fp.domain?.toLowerCase().includes(searchLower) ||
        fp.url?.toLowerCase().includes(searchLower) ||
        fp.pixelType?.toLowerCase().includes(searchLower)
      );
    });

    // Sort data
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle different data types
      if (sortBy === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [footprints, search, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when search changes
  React.useEffect(() => {
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
    if (!filteredData || filteredData.length === 0) return;

    // CSV headers (includes platform column)
    const headers = ['Timestamp', 'Domain', 'Platform', 'URL', 'Pixel Type'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(fp => {
        const timestamp = formatTimestamp(fp.timestamp);
        const domain = fp.domain || '';
        const platform =
          TRACKING_PLATFORMS[fp.platform || 'facebook']?.name || 'Unknown';
        const url = fp.url || '';
        const pixelType = fp.pixelType || 'script';

        // Escape CSV fields
        const escapeCSV = field => `"${String(field).replace(/"/g, '""')}"`;

        return [
          escapeCSV(timestamp),
          escapeCSV(domain),
          escapeCSV(platform),
          escapeCSV(url),
          escapeCSV(pixelType),
        ].join(',');
      }),
    ].join('\n');

    // Download file
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
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="search-icon"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by domain or URL..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
            aria-label="Search tracking data"
          />
          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="table-actions">
          <button
            className="export-button"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            aria-label="Export data to CSV"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            Export CSV
          </button>

          <select
            className="per-page-select"
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
            Showing {filteredData.length} of {footprints.length} results
          </span>
        ) : (
          <span>Showing all {footprints.length} detections</span>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table" role="table">
          <thead>
            <tr>
              <th>
                <button
                  className={`sort-button ${sortBy === 'timestamp' ? 'active' : ''}`}
                  onClick={() => handleSort('timestamp')}
                  aria-label="Sort by timestamp"
                >
                  Timestamp
                  <span className="sort-icon">
                    {sortBy === 'timestamp' && sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>
              <th>
                <button
                  className={`sort-button ${sortBy === 'domain' ? 'active' : ''}`}
                  onClick={() => handleSort('domain')}
                  aria-label="Sort by domain"
                >
                  Domain
                  <span className="sort-icon">
                    {sortBy === 'domain' && sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>
              <th>
                <button
                  className={`sort-button ${sortBy === 'url' ? 'active' : ''}`}
                  onClick={() => handleSort('url')}
                  aria-label="Sort by URL"
                >
                  URL
                  <span className="sort-icon">
                    {sortBy === 'url' && sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>
              <th>
                <button
                  className={`sort-button ${sortBy === 'platform' ? 'active' : ''}`}
                  onClick={() => handleSort('platform')}
                  aria-label="Sort by platform"
                >
                  Platform
                  <span className="sort-icon">
                    {sortBy === 'platform' && sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>
              <th>
                <button
                  className={`sort-button ${sortBy === 'pixelType' ? 'active' : ''}`}
                  onClick={() => handleSort('pixelType')}
                  aria-label="Sort by pixel type"
                >
                  Pixel Type
                  <span className="sort-icon">
                    {sortBy === 'pixelType' && sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((fp, index) => (
              <tr key={fp.id || index}>
                <td className="timestamp-cell">
                  {formatTimestamp(fp.timestamp)}
                </td>
                <td className="domain-cell">
                  <span className="domain-badge">{fp.domain}</span>
                </td>
                <td className="url-cell">
                  <a
                    href={fp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="url-link"
                    title={fp.url}
                  >
                    {fp.url.length > 60
                      ? `${fp.url.substring(0, 60)}...`
                      : fp.url}
                  </a>
                </td>
                <td className="platform-cell">
                  <span
                    className="platform-badge"
                    style={{
                      backgroundColor:
                        TRACKING_PLATFORMS[fp.platform || 'facebook']?.color ||
                        '#4a90e2',
                      color: '#fff',
                    }}
                  >
                    {TRACKING_PLATFORMS[fp.platform || 'facebook']?.name ||
                      'Unknown'}
                  </span>
                </td>
                <td className="pixel-type-cell">{fp.pixelType || 'script'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-button"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            aria-label="Go to first page"
          >
            «
          </button>
          <button
            className="page-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
          >
            ‹
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="page-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Go to next page"
          >
            ›
          </button>
          <button
            className="page-button"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Go to last page"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
