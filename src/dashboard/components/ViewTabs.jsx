/**
 * View tabs for the dashboard (Graph / Bipartite / Map / Table)
 *
 * Extracted from `App.jsx` (issue #33, F-CLEAN-002) so the App component
 * stays focused on layout, state plumbing, and view switching. The
 * `VIEWS` constant lists the supported views in render order; the
 * rendered SVGs match the originals one-for-one (no visual change).
 */

import React from 'react';

const VIEWS = [
  {
    id: 'graph',
    label: 'Graph View',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
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
    ),
  },
  {
    id: 'bipartite',
    label: 'Bipartite Graph',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
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
    ),
  },
  {
    id: 'map',
    label: 'Map View',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3l-5 2v11l5-2 6 2 5-2V3l-5 2-6-2zm0 2v9l6 2V7L7 5z" />
      </svg>
    ),
  },
  {
    id: 'table',
    label: 'Data Table',
    svg: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M3 3h14v14H3V3zm0 4h14M7 7v10"
          stroke="currentColor"
          fill="none"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];

export default function ViewTabs({ activeView, onViewChange }) {
  return (
    <nav className="view-tabs" role="tablist">
      {VIEWS.map(view => (
        <button
          key={view.id}
          role="tab"
          aria-selected={activeView === view.id}
          aria-controls={`${view.id}-view`}
          className={`tab-button ${activeView === view.id ? 'active' : ''}`}
          onClick={() => onViewChange(view.id)}
        >
          {view.svg}
          {view.label}
        </button>
      ))}
    </nav>
  );
}
