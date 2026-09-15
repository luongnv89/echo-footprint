/**
 * View tabs for the dashboard (Graph / Bipartite / Map / Table)
 *
 * Extracted from `App.jsx` (issue #33, F-CLEAN-002) so the App component
 * stays focused on layout, state plumbing, and view switching. The
 * `VIEWS` constant lists the supported views in render order. Icons are
 * 16px stroke glyphs so the active tab can tint them with the accent.
 */

import React from 'react';

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const VIEWS = [
  {
    id: 'graph',
    label: 'Graph View',
    svg: (
      <svg {...iconProps}>
        <circle cx="8" cy="8" r="2" />
        <circle cx="3.5" cy="3.5" r="1.5" />
        <circle cx="12.5" cy="3.5" r="1.5" />
        <circle cx="3.5" cy="12.5" r="1.5" />
        <circle cx="12.5" cy="12.5" r="1.5" />
        <path d="M6.6 6.6 4.7 4.7M9.4 6.6l1.9-1.9M6.6 9.4l-1.9 1.9M9.4 9.4l1.9 1.9" />
      </svg>
    ),
  },
  {
    id: 'bipartite',
    label: 'Bipartite Graph',
    svg: (
      <svg {...iconProps}>
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="13" cy="5" r="1.5" />
        <circle cx="13" cy="11" r="1.5" />
        <path d="M4.5 3.2 11.5 4.8M4.5 7.7l7-2.4M4.5 8.3l7 2.4M4.5 12.8l7-1.6" />
      </svg>
    ),
  },
  {
    id: 'map',
    label: 'Map View',
    svg: (
      <svg {...iconProps}>
        <path d="M1.5 4 5.5 2.5l5 2 4-1.5v9l-4 1.5-5-2-4 1.5V4Z" />
        <path d="M5.5 2.5v9M10.5 4.5v9" />
      </svg>
    ),
  },
  {
    id: 'table',
    label: 'Data Table',
    svg: (
      <svg {...iconProps}>
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
        <path d="M1.5 6.5h13M6 6.5v7" />
      </svg>
    ),
  },
];

export default function ViewTabs({ activeView, onViewChange }) {
  return (
    <nav
      className="view-tabs segmented"
      role="tablist"
      aria-label="Dashboard views"
    >
      {VIEWS.map(view => (
        <button
          key={view.id}
          id={`${view.id}-tab`}
          role="tab"
          aria-label={view.label}
          aria-selected={activeView === view.id}
          aria-controls={`${view.id}-view`}
          className={`tab-button segmented-item pressable ${activeView === view.id ? 'active' : ''}`}
          title={view.label}
          onClick={() => onViewChange(view.id)}
        >
          {view.svg}
          <span className="tab-label">{view.label}</span>
        </button>
      ))}
    </nav>
  );
}
