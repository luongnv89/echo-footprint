/**
 * Top-of-dashboard insight banner.
 *
 * Renders the short messages produced by the insight hooks; the parent
 * controls when the banner is shown via `visible` and a dismiss
 * callback. Extracted from `App.jsx` (issue #33, F-CLEAN-002).
 */

import React from 'react';

export default function InsightsBanner({ messages, visible, onDismiss }) {
  if (!visible) return null;
  return (
    <div
      className="dashboard-insights"
      role="status"
      aria-label="Tracking insights"
    >
      <div className="dashboard-insights-text">
        {messages && messages.length > 0 ? (
          messages.map((msg, idx) => (
            <p key={idx} className="insight-line">
              {msg}
            </p>
          ))
        ) : (
          <p className="insight-line">Start browsing to see insights.</p>
        )}
      </div>
      <button
        type="button"
        className="insight-dismiss pressable"
        aria-label="Dismiss insights"
        onClick={onDismiss}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
