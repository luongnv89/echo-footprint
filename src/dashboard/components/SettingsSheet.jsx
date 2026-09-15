/**
 * Settings Sheet Component
 * User preferences, data management, and privacy settings
 * Per PRD: Clear data flow, storage quota display, WCAG compliant
 */

import React, { useRef, useState, useEffect } from 'react';
import { useSheetFocus } from '../hooks/useSheetFocus.js';
import { clearAllData, checkStorageQuota } from '../utils/db.js';
import { getGeoOptIn, setGeoOptIn } from '../utils/geolocation.js';
import { cssVar } from '../utils/theme.js';
import '../styles/SettingsSheet.css';

// Storage helper: uses chrome.storage.local when available, otherwise falls back to localStorage (dev preview)
const storage = {
  get(keys) {
    return new Promise(resolve => {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(keys, result => resolve(result || {}));
      } else {
        const result = {};
        keys.forEach(key => {
          const raw = window.localStorage.getItem(key);
          try {
            result[key] = raw ? JSON.parse(raw) : undefined;
          } catch (e) {
            result[key] = raw;
          }
        });
        resolve(result);
      }
    });
  },
  set(entries) {
    if (chrome?.storage?.local) {
      chrome.storage.local.set(entries);
      return;
    }
    Object.entries(entries).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    });
  },
};

function SettingsSheet({ isOpen, onClose, stats }) {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [buildInfo, setBuildInfo] = useState(null);
  const [excludedDomains, setExcludedDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [geoOptIn, setGeoOptInLocal] = useState(false);

  const handleClose = () => {
    setShowClearConfirm(false);
    setConfirmText('');
    onClose();
  };

  const sheetRef = useRef(null);
  const handleSheetKeyDown = useSheetFocus({
    isOpen,
    onClose: handleClose,
    dialogRef: sheetRef,
  });

  // Load storage info and build info when sheet opens
  useEffect(() => {
    if (isOpen) {
      loadStorageInfo();
      loadBuildInfo();
      loadPrivacySettings();
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

  const loadBuildInfo = async () => {
    try {
      const response = await fetch('/build-info.json');
      const info = await response.json();
      setBuildInfo(info);
    } catch (error) {
      console.error(
        'Failed to load build info, falling back to manifest:',
        error
      );
      try {
        const manifestResp = await fetch('/manifest.json');
        const manifest = await manifestResp.json();
        setBuildInfo({
          version: manifest.version,
          versionWithCommit: manifest.version,
          gitCommitHash: 'unknown',
        });
      } catch (manifestError) {
        console.error('Failed to load manifest as fallback:', manifestError);
        setBuildInfo({
          version: 'unknown',
          versionWithCommit: 'unknown',
          gitCommitHash: 'unknown',
        });
      }
    }
  };

  const loadPrivacySettings = () => {
    storage
      .get(['excludedDomains', 'isPaused'])
      .then(({ excludedDomains: domains, isPaused: paused }) => {
        setExcludedDomains(domains || []);
        setIsPaused(paused || false);
      });
    getGeoOptIn().then(setGeoOptInLocal);
  };

  const toggleGeoOptIn = async () => {
    const next = !geoOptIn;
    setGeoOptInLocal(next);
    await setGeoOptIn(next);
    // Let a mounted MapView react immediately
    window.dispatchEvent(new Event('geo-opt-in-changed'));
  };

  const addDomain = domainValue => {
    const value = domainValue ?? newDomain;
    const trimmed = value.trim();
    if (!trimmed) return;

    const updated = [...new Set([...excludedDomains, trimmed])];
    setExcludedDomains(updated);
    storage.set({ excludedDomains: updated });
    setNewDomain('');
  };

  const removeDomain = domain => {
    const updated = excludedDomains.filter(d => d !== domain);
    setExcludedDomains(updated);
    storage.set({ excludedDomains: updated });
  };

  const togglePause = () => {
    const next = !isPaused;
    setIsPaused(next);
    storage.set({ isPaused: next });
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
      className="sheet-overlay"
      onClick={handleClose}
      onKeyDown={handleSheetKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-sheet-title"
    >
      <div className="sheet" ref={sheetRef} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sheet-header">
          <h2 id="settings-sheet-title">Settings</h2>
          <button
            className="icon-btn pressable"
            onClick={handleClose}
            aria-label="Close settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="sheet-body">
          {/* Storage Section */}
          <section className="settings-section">
            <h3 className="eyebrow">Storage</h3>

            {storageInfo && (
              <div className="storage-info kv">
                <div className="kv-row">
                  <span className="kv-label">Total detections</span>
                  <span className="kv-value num">
                    {stats?.totalFootprints || 0}
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Unique domains</span>
                  <span className="kv-value num">
                    {stats?.uniqueDomains || 0}
                  </span>
                </div>
                {storageInfo.usageMB !== undefined && (
                  <>
                    <div className="kv-row">
                      <span className="kv-label">Storage used</span>
                      <span className="kv-value num">
                        {storageInfo.usageMB.toFixed(2)} MB
                      </span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Storage available</span>
                      <span className="kv-value num">
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
                              storageInfo.percentUsed >= 95
                                ? cssVar('--danger')
                                : storageInfo.percentUsed >= 80
                                  ? cssVar('--warning')
                                  : cssVar('--accent'),
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        <span className="num">
                          {storageInfo.percentUsed.toFixed(1)}
                        </span>
                        % used
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Privacy Section */}
          <section className="settings-section">
            <h3 className="eyebrow">Privacy</h3>
            <div className="setting-item">
              <div className="setting-info">
                <strong>Detection</strong>
                <p>
                  Turn off to stop inspecting pages on all sites. Data already
                  collected stays put.
                </p>
              </div>
              <div className="setting-control">
                <button
                  className={`toggle-button ${!isPaused ? 'active' : ''}`}
                  onClick={togglePause}
                  role="switch"
                  aria-checked={!isPaused}
                  aria-label="Detection"
                  type="button"
                >
                  <span className="toggle-slider" aria-hidden="true"></span>
                </button>
                <span className="toggle-status">
                  {isPaused ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>

            <div className="setting-item setting-item-column">
              <div className="setting-info">
                <strong>Excluded domains</strong>
                <p>
                  EchoFootPrint will not run on these domains. Use this to
                  exclude localhost, internal networks, or sensitive sites.
                </p>
              </div>
              <div className="exclusion-controls">
                <div className="exclusion-input">
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., localhost, *.corp, 192.168.*.*"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDomain()}
                    aria-label="Add domain exclusion pattern"
                  />
                  <button
                    className="btn pressable"
                    onClick={() => addDomain()}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                <div className="exclusion-presets">
                  <span>Quick add:</span>
                  <div className="preset-buttons">
                    {['localhost', '127.0.0.1', '*.local', '*.internal'].map(
                      preset => (
                        <button
                          key={preset}
                          className="btn btn-sm pressable"
                          onClick={() => addDomain(preset)}
                          type="button"
                        >
                          + {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {excludedDomains.length > 0 ? (
                  <ul className="excluded-list">
                    {excludedDomains.map(domain => (
                      <li key={domain}>
                        <span className="excluded-domain">{domain}</span>
                        <button
                          className="icon-btn pressable remove-exclusion"
                          onClick={() => removeDomain(domain)}
                          aria-label={`Remove exclusion ${domain}`}
                          type="button"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          >
                            <path d="M4 4l8 8M12 4l-8 8" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="excluded-empty">No domains excluded yet.</p>
                )}
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <strong>Map geolocation</strong>
                <p>
                  Off by default. When enabled, Map View sends the domain names
                  of tracked sites to http://ip-api.com to resolve their
                  approximate location. Only domains are sent — never page
                  contents or your stored data. Results are cached locally.
                </p>
              </div>
              <div className="setting-control">
                <button
                  className={`toggle-button ${geoOptIn ? 'active' : ''}`}
                  onClick={toggleGeoOptIn}
                  role="switch"
                  aria-checked={geoOptIn}
                  aria-label={
                    geoOptIn
                      ? 'Disable map geolocation lookups'
                      : 'Enable map geolocation lookups'
                  }
                  type="button"
                >
                  <span className="toggle-slider" aria-hidden="true"></span>
                </button>
                <span className="toggle-status">{geoOptIn ? 'On' : 'Off'}</span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <strong>Local storage only</strong>
                <p>
                  All data is stored locally in your browser. No cloud sync or
                  telemetry.
                </p>
              </div>
              <span className="chip chip-accent">Active</span>
            </div>
          </section>

          {/* About Section */}
          <section className="settings-section">
            <h3 className="eyebrow">About</h3>
            <div className="about-info kv">
              <div className="kv-row">
                <span className="kv-label">Version</span>
                <span
                  className="kv-value num"
                  title={
                    buildInfo?.gitCommitHash
                      ? `Commit: ${buildInfo.gitCommitHash}`
                      : ''
                  }
                >
                  {buildInfo?.versionWithCommit || 'unknown'}
                </span>
              </div>
              {buildInfo?.gitBranch && (
                <div className="kv-row">
                  <span className="kv-label">Branch</span>
                  <span className="kv-value num">{buildInfo.gitBranch}</span>
                </div>
              )}
              {buildInfo?.buildTimestamp && (
                <div className="kv-row">
                  <span className="kv-label">Built</span>
                  <span
                    className="kv-value num"
                    title={buildInfo.buildTimestamp}
                  >
                    {new Date(buildInfo.buildTimestamp).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="kv-row">
                <span className="kv-label">License</span>
                <span className="kv-value">Proprietary</span>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="settings-section danger-section">
            <h3 className="eyebrow">Danger zone</h3>

            {!showClearConfirm ? (
              <div className="danger-action">
                <div className="danger-info">
                  <strong>Clear all data</strong>
                  <p>
                    Permanently delete all tracking data, geolocation cache, and
                    settings. This action cannot be undone.
                  </p>
                </div>
                <button
                  className="btn btn-danger pressable"
                  onClick={() => setShowClearConfirm(true)}
                >
                  Clear All Data
                </button>
              </div>
            ) : (
              <div className="danger-action confirm-clear">
                <p className="confirm-warning">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
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
                <label
                  htmlFor="settings-confirm-delete"
                  className="confirm-instruction"
                >
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  id="settings-confirm-delete"
                  name="confirm-delete"
                  type="text"
                  className="confirm-input input"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                />
                <div className="confirm-actions">
                  <button
                    className="btn btn-danger pressable"
                    onClick={handleClearData}
                    disabled={confirmText !== 'DELETE' || isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Confirm Delete'}
                  </button>
                  <button
                    className="btn pressable"
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
