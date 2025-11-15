/**
 * Platform Statistics Component
 * Shows breakdown of detections by platform
 */

import React from 'react';
import { TRACKING_PLATFORMS } from '../../lib/pixel-detector.js';
import '../styles/PlatformStats.css';

function PlatformStats({ stats, onPlatformSelect, selectedPlatform }) {
  if (!stats || !stats.platformStats) {
    return null;
  }

  const { platformStats, totalFootprints } = stats;
  const platforms = Object.keys(platformStats);

  if (platforms.length === 0) {
    return null;
  }

  // Sort platforms by detection count (descending)
  const sortedPlatforms = platforms.sort(
    (a, b) => platformStats[b].detections - platformStats[a].detections
  );

  // Handle platform click
  const handlePlatformClick = (platformId, platformData) => {
    if (onPlatformSelect) {
      // Pass platform info - RadialGraph will select the appropriate domain
      onPlatformSelect(platformId, {
        platformId: platformId,
        platform: platformId,
        count: platformData.detections,
      });
    }
  };

  return (
    <div className="platform-stats">
      <h3 className="stats-title">Platform Breakdown</h3>
      <div className="platform-list">
        {sortedPlatforms.map(platformId => {
          const platform = TRACKING_PLATFORMS[platformId] || {
            name: platformId,
            color: '#999',
          };
          const data = platformStats[platformId];
          const percentage = (
            (data.detections / totalFootprints) *
            100
          ).toFixed(1);

          const isSelected =
            selectedPlatform?.platformId === platformId ||
            selectedPlatform?.platform === platformId;

          return (
            <div
              key={platformId}
              className={`platform-item ${isSelected ? 'active' : ''} ${onPlatformSelect ? 'clickable' : ''}`}
              onClick={() => handlePlatformClick(platformId, data)}
              role={onPlatformSelect ? 'button' : undefined}
              tabIndex={onPlatformSelect ? 0 : undefined}
              onKeyPress={e => {
                if (
                  onPlatformSelect &&
                  (e.key === 'Enter' || e.key === ' ')
                ) {
                  e.preventDefault();
                  handlePlatformClick(platformId, data);
                }
              }}
            >
              <div className="platform-header">
                <div className="platform-info">
                  <div
                    className="platform-color-dot"
                    style={{ backgroundColor: platform.color }}
                  ></div>
                  <span className="platform-name">{platform.name}</span>
                </div>
                <span className="platform-percentage">{percentage}%</span>
              </div>
              <div className="platform-stats-details">
                <span className="stat-item">
                  <strong>{data.detections}</strong> detection
                  {data.detections !== 1 ? 's' : ''}
                </span>
                <span className="stat-separator">•</span>
                <span className="stat-item">
                  <strong>{data.domains}</strong> domain
                  {data.domains !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="platform-bar">
                <div
                  className="platform-bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: platform.color,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlatformStats;
