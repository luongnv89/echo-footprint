/**
 * Settings Sheet Component
 * User preferences, data management, and privacy settings
 * Per PRD: Clear data flow, storage quota display, WCAG compliant
 */

import React, { useState, useEffect } from 'react';
import { clearAllData, checkStorageQuota } from '../utils/db.js';
import '../styles/SettingsSheet.css';

function SettingsSheet({ isOpen, onClose, stats }) {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Load storage info when sheet opens
  useEffect(() => {
    if (isOpen) {
      loadStorageInfo();
    }
  }, [isOpen]);

  const loadStorageInfo = async () => {
    try {
      const info = await checkStorageQuota();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();
      setShowClearConfirm(false);
      setConfirmText('');

      // Reload the page to reset state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClose = () => {
    setShowClearConfirm(false);
    setConfirmText('');
    onClose();
  };

  const formatBytes = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div
      className="settings-sheet-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-sheet-title"
    >
      <div className="settings-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sheet-header">
          <h2 id="settings-sheet-title">Settings</h2>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="sheet-body">
          {/* Storage Section */}
          <section className="settings-section">
            <h3>Storage</h3>

            {storageInfo && (
              <div className="storage-info">
                <div className="storage-stat">
                  <span className="stat-label">Total Detections</span>
                  <span className="stat-value">
                    {stats?.totalFootprints || 0}
                  </span>
                </div>
                <div className="storage-stat">
                  <span className="stat-label">Unique Domains</span>
                  <span className="stat-value">
                    {stats?.uniqueDomains || 0}
                  </span>
                </div>
                {storageInfo.usageMB !== undefined && (
                  <>
                    <div className="storage-stat">
                      <span className="stat-label">Storage Used</span>
                      <span className="stat-value">
                        {storageInfo.usageMB.toFixed(2)} MB
                      </span>
                    </div>
                    <div className="storage-stat">
                      <span className="stat-label">Storage Available</span>
                      <span className="stat-value">
                        {storageInfo.quotaMB.toFixed(2)} MB
                      </span>
                    </div>
                    <div className="storage-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${storageInfo.percentUsed}%`,
                            backgroundColor:
                              storageInfo.percentUsed > 80
                                ? '#ff4757'
                                : storageInfo.percentUsed > 50
                                  ? '#ffa502'
                                  : '#00d4aa',
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {storageInfo.percentUsed.toFixed(1)}% used
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Privacy Section */}
          <section className="settings-section">
            <h3>Privacy</h3>
            <div className="setting-item">
              <div className="setting-info">
                <strong>Local Storage Only</strong>
                <p>
                  All data is stored locally in your browser. No cloud sync or
                  telemetry.
                </p>
              </div>
              <span className="badge success">Active</span>
            </div>
          </section>

          {/* About Section */}
          <section className="settings-section">
            <h3>About</h3>
            <div className="about-info">
              <div className="about-item">
                <span className="about-label">Version</span>
                <span className="about-value">1.0.0</span>
              </div>
              <div className="about-item">
                <span className="about-label">License</span>
                <span className="about-value">MIT</span>
              </div>
              <div className="about-item">
                <span className="about-label">GitHub</span>
                <a
                  href="https://github.com/yourusername/echofootprint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-link"
                >
                  View on GitHub
                </a>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="settings-section danger-section">
            <h3>Danger Zone</h3>

            {!showClearConfirm ? (
              <div className="danger-action">
                <div className="danger-info">
                  <strong>Clear All Data</strong>
                  <p>
                    Permanently delete all tracking data, geolocation cache, and
                    settings. This action cannot be undone.
                  </p>
                </div>
                <button
                  className="danger-button"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear All Data
                </button>
              </div>
            ) : (
              <div className="confirm-clear">
                <p className="confirm-warning">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                  </svg>
                  This will permanently delete:
                </p>
                <ul className="confirm-list">
                  <li>{stats?.totalFootprints || 0} tracking detections</li>
                  <li>{stats?.uniqueDomains || 0} domain records</li>
                  <li>All geolocation cache</li>
                  <li>All settings and preferences</li>
                </ul>
                <p className="confirm-instruction">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  className="confirm-input"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <div className="confirm-actions">
                  <button
                    className="confirm-button danger"
                    onClick={handleClearData}
                    disabled={confirmText !== 'DELETE' || isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Confirm Delete'}
                  </button>
                  <button
                    className="confirm-button cancel"
                    onClick={() => {
                      setShowClearConfirm(false);
                      setConfirmText('');
                    }}
                    disabled={isClearing}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsSheet;
