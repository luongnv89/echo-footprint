/**
 * Empty State Component
 * Shown when no tracking data detected yet
 * Per UX design: Friendly onboarding message
 */

import React from 'react';
import '../styles/EmptyState.css';

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <svg
          width="56"
          height="56"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="es-ring"
            cx="28"
            cy="28"
            r="20"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            className="es-center"
            cx="28"
            cy="28"
            r="3"
            fill="currentColor"
          />
          <circle
            className="es-sat"
            cx="16"
            cy="16"
            r="2"
            fill="currentColor"
          />
          <circle
            className="es-sat"
            cx="40"
            cy="16"
            r="2"
            fill="currentColor"
          />
          <circle
            className="es-sat"
            cx="16"
            cy="40"
            r="2"
            fill="currentColor"
          />
          <circle
            className="es-sat"
            cx="40"
            cy="40"
            r="2"
            fill="currentColor"
          />
        </svg>
      </div>

      <h2>No Tracking Detected Yet</h2>

      <p className="empty-state-description">
        EchoFootPrint silently monitors your browsing for tracking pixels from
        50 major ad networks. Visit some websites to start seeing your tracking
        footprint.
      </p>

      <div className="empty-state-steps">
        <h3 className="eyebrow">How it works</h3>
        <ol>
          <li>
            <strong>Browse Normally</strong> - EchoFootPrint works silently in
            the background
          </li>
          <li>
            <strong>We Detect Pixels</strong> - When you visit pages with
            tracking from major platforms
          </li>
          <li>
            <strong>You See the Network</strong> - Visualize how you're being
            tracked across the web
          </li>
        </ol>
      </div>

      <p className="privacy-note">
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        </svg>
        100% private - all data stays on this device
      </p>

      <p className="empty-state-hint">
        Try visiting news sites, shopping websites, or social media platforms.
      </p>
    </div>
  );
}

export default EmptyState;
