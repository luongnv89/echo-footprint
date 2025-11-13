/**
 * Help Sheet Component
 * Provides user guidance, FAQs, and documentation
 */

import React, { useState } from 'react';
import '../styles/HelpSheet.css';

function HelpSheet({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('getting-started');

  if (!isOpen) return null;

  return (
    <div
      className="help-sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-sheet-title"
    >
      <div className="help-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sheet-header">
          <h2 id="help-sheet-title">Help & Documentation</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="help-tabs">
          <button
            className={`help-tab ${activeTab === 'getting-started' ? 'active' : ''}`}
            onClick={() => setActiveTab('getting-started')}
          >
            Getting Started
          </button>
          <button
            className={`help-tab ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
          <button
            className={`help-tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            FAQ
          </button>
        </div>

        {/* Content */}
        <div className="sheet-body help-content">
          {activeTab === 'getting-started' && (
            <section>
              <h3>Welcome to EchoFootPrint</h3>
              <p>
                EchoFootPrint helps you visualize how you're being tracked
                across the web by 50 major ad networks including Facebook,
                Google, The Trade Desk, Criteo, Taboola, LinkedIn, TikTok,
                Amazon, Unity Ads, and many more.
              </p>

              <h4>How It Works</h4>
              <ol className="help-list">
                <li>
                  <strong>Browse Normally</strong> - EchoFootPrint works
                  silently in the background. No configuration needed.
                </li>
                <li>
                  <strong>Automatic Detection</strong> - When you visit
                  websites, we detect tracking pixels from 50 major ad network
                  platforms.
                </li>
                <li>
                  <strong>Real-Time Visualization</strong> - Open this dashboard
                  to see your tracking network in real-time.
                </li>
              </ol>

              <h4>Understanding the Dashboard</h4>
              <ul className="help-list">
                <li>
                  <strong>Radial Graph</strong> - Shows you at the center, with
                  tracking domains connected to you. Node size = number of
                  detections.
                </li>
                <li>
                  <strong>Platform Breakdown</strong> - See which platforms are
                  tracking you most, with color-coded statistics.
                </li>
                <li>
                  <strong>Data Table</strong> - View raw detection data with
                  sorting and filtering.
                </li>
              </ul>

              <h4>Privacy First</h4>
              <p className="help-note">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style={{ marginRight: '8px', verticalAlign: 'middle' }}
                >
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                </svg>
                All data is stored locally on your device. No cloud sync, no
                telemetry, no tracking.
              </p>
            </section>
          )}

          {activeTab === 'features' && (
            <section>
              <h3>Features Guide</h3>

              <div className="feature-item">
                <h4>Graph Interaction</h4>
                <ul className="help-list">
                  <li>
                    <strong>Zoom:</strong> Scroll to zoom in/out on the graph
                  </li>
                  <li>
                    <strong>Pan:</strong> Click and drag the background to pan
                  </li>
                  <li>
                    <strong>Drag Nodes:</strong> Click and drag nodes to
                    reposition them
                  </li>
                  <li>
                    <strong>Hover:</strong> Hover over nodes to see details in
                    tooltip
                  </li>
                  <li>
                    <strong>Click:</strong> Click nodes to see detailed
                    information panel
                  </li>
                  <li>
                    <strong>Reset:</strong> Click the reset button to restore
                    default zoom
                  </li>
                </ul>
              </div>

              <div className="feature-item">
                <h4>Time Filters</h4>
                <p>Filter tracking data by time period:</p>
                <ul className="help-list">
                  <li>
                    <strong>Last 7 Days:</strong> Recent tracking activity
                  </li>
                  <li>
                    <strong>Last 30 Days:</strong> Monthly tracking overview
                  </li>
                  <li>
                    <strong>All Time:</strong> Complete tracking history
                  </li>
                </ul>
              </div>

              <div className="feature-item">
                <h4>Platform Detection</h4>
                <p>We detect tracking pixels from these platforms:</p>
                <ul className="help-list">
                  <li>
                    <span style={{ color: '#1877f2' }}>●</span> Facebook/Meta
                    (includes Instagram, WhatsApp)
                  </li>
                  <li>
                    <span style={{ color: '#4285f4' }}>●</span> Google (includes
                    YouTube, Analytics)
                  </li>
                  <li>
                    <span style={{ color: '#1DA1F2' }}>●</span> Twitter/X
                  </li>
                  <li>
                    <span style={{ color: '#0A66C2' }}>●</span> LinkedIn
                  </li>
                  <li>
                    <span style={{ color: '#FF0050' }}>●</span> TikTok
                  </li>
                  <li>
                    <span style={{ color: '#FF9900' }}>●</span> Amazon
                  </li>
                  <li>
                    <span style={{ color: '#E60023' }}>●</span> Pinterest
                  </li>
                  <li>
                    <span style={{ color: '#FFFC00' }}>●</span> Snapchat
                  </li>
                  <li>
                    <span style={{ color: '#FF4500' }}>●</span> Reddit
                  </li>
                  <li>
                    <span style={{ color: '#00A4EF' }}>●</span> Microsoft/Bing
                  </li>
                </ul>
              </div>

              <div className="feature-item">
                <h4>Export & Screenshot</h4>
                <p>
                  Use the <strong>Screenshot</strong> button to export the
                  current view as a PNG image. Use the{' '}
                  <strong>Export CSV</strong> button in the Data Table to
                  download your data.
                </p>
              </div>
            </section>
          )}

          {activeTab === 'faq' && (
            <section>
              <h3>Frequently Asked Questions</h3>

              <div className="faq-item">
                <h4>Why am I not seeing any tracking pixels?</h4>
                <p>
                  If you just installed the extension, you need to browse some
                  websites first. Try visiting news sites, shopping sites, or
                  social media platforms. Tracking pixels are embedded on
                  third-party websites, not on the platforms' own sites (e.g.,
                  facebook.com won't show "Facebook Pixel" - that's their own
                  site).
                </p>
              </div>

              <div className="faq-item">
                <h4>What are tracking pixels?</h4>
                <p>
                  Tracking pixels are small scripts embedded in websites that
                  collect information about your browsing activity and send it
                  to advertising platforms. They're used for targeted
                  advertising, conversion tracking, and analytics.
                </p>
              </div>

              <div className="faq-item">
                <h4>Does EchoFootPrint block tracking pixels?</h4>
                <p>
                  No. EchoFootPrint is a visualization tool, not a blocker. Our
                  goal is to make tracking visible and transparent. If you want
                  to block trackers, consider using extensions like uBlock
                  Origin or Privacy Badger.
                </p>
              </div>

              <div className="faq-item">
                <h4>Is my data private?</h4>
                <p>
                  Yes, absolutely. All data is stored locally in your browser
                  using IndexedDB. We don't send any data to external servers.
                  No telemetry, no cloud sync, no tracking.
                </p>
              </div>

              <div className="faq-item">
                <h4>Why do I see "www" or truncated domain names?</h4>
                <p>
                  Domain names in the graph are shortened for readability. For
                  example, "snap.linkedin.com" shows as "linkedin.com". Hover
                  over nodes or check the Data Table to see full domain names.
                </p>
              </div>

              <div className="faq-item">
                <h4>Can I delete my data?</h4>
                <p>
                  Yes. Go to{' '}
                  <strong>Settings → Danger Zone → Clear All Data</strong>. This
                  permanently deletes all tracking detections from your device.
                </p>
              </div>

              <div className="faq-item">
                <h4>How do I report a bug or request a feature?</h4>
                <p>
                  Visit our GitHub repository at{' '}
                  <a
                    href="https://github.com/yourusername/echofootprint"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/yourusername/echofootprint
                  </a>{' '}
                  to file an issue or contribute.
                </p>
              </div>

              <div className="faq-item">
                <h4>Is EchoFootPrint open source?</h4>
                <p>
                  Yes! EchoFootPrint is released under the MIT license. You can
                  view the source code, contribute, or fork the project on
                  GitHub.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default HelpSheet;
