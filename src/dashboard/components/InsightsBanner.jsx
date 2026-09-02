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
      className="dashboard-insights-banner"
      role="status"
      aria-label="Tracking insights"
    >
      <div className="insight-banner-icon" aria-hidden="true">
        ★
      </div>
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
        className="insight-dismiss"
        aria-label="Dismiss insights"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
