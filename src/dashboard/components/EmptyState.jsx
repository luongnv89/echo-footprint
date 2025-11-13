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
      <div className="empty-state-icon">
        <svg
          width="100"
          height="100"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="40" stroke="#00d4aa" strokeWidth="2" />
          <circle cx="50" cy="50" r="5" fill="#00d4aa" />
          <circle cx="30" cy="30" r="3" fill="#666" />
          <circle cx="70" cy="30" r="3" fill="#666" />
          <circle cx="30" cy="70" r="3" fill="#666" />
          <circle cx="70" cy="70" r="3" fill="#666" />
        </svg>
      </div>

      <h2>No Tracking Detected Yet</h2>

      <p className="empty-state-description">
        EchoFootPrint is silently monitoring your browsing for tracking pixels
        from 50 major ad networks including Facebook, Google, The Trade Desk,
        Criteo, Taboola, LinkedIn, TikTok, Amazon, Unity Ads, and many more.
        Visit some websites to start seeing your tracking footprint.
      </p>

      <div className="empty-state-steps">
        <h3>How It Works:</h3>
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

      <div className="empty-state-privacy">
        <p className="privacy-note">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ marginRight: '8px', verticalAlign: 'middle' }}
          >
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          </svg>
          100% private - All data stored locally on your device
        </p>
      </div>

      <div className="empty-state-hint">
        <p>
          <strong>Try visiting:</strong> news sites, shopping websites, or
          social media platforms
        </p>
      </div>
    </div>
  );
}

export default EmptyState;
