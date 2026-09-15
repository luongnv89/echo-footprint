/**
 * Map View Component
 * Leaflet map with geolocation clustering
 * Per PRD: Dark/light tiles, region details, WCAG compliant
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { getGeoCache, db } from '../utils/db.js';
import {
  fetchBulkGeolocation,
  clearAllCaches,
  getGeoOptIn,
} from '../utils/geolocation.js';
import { escapeHtml } from '../utils/security.js';
import { TRACKING_PLATFORMS } from '../../lib/tracking-platforms.js';
import { cssVar } from '../utils/theme.js';
import { OSM_TILE_URL, osmTileLayerOptions } from '../utils/map-tiles.js';
import '../styles/MapView.css';

// Pin icon built from the accent token — data URIs need a resolved colour.
function mapPinIcon() {
  const svg =
    `<svg width="25" height="41" xmlns="http://www.w3.org/2000/svg">` +
    `<path d="M12.5 0C19.4 0 25 5.6 25 12.5c0 10-9 21.5-12.5 28.5C8 34 0 22.5 0 12.5 0 5.6 5.6 0 12.5 0z" fill="${cssVar('--accent')}"/>` +
    `<circle cx="12.5" cy="12.5" r="5" fill="${cssVar('--text-primary')}"/>` +
    `</svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

function MapView({
  footprints,
  stats,
  isActive = true,
  onLocationStatsUpdate = () => {},
}) {
  const safeFootprints = Array.isArray(footprints) ? footprints : [];
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapTheme, setMapTheme] = useState('dark');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [geoData, setGeoData] = useState({});
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [geoProgress, setGeoProgress] = useState({ current: 0, total: 0 });
  const [locationGroups, setLocationGroups] = useState({});
  const [geoOptIn, setGeoOptInState] = useState(false);

  // Brand colour of the first-seen platform for a domain (drawer dots)
  const platformColorForDomain = domain => {
    const fp = safeFootprints.find(f => f.domain === domain);
    return fp ? TRACKING_PLATFORMS[fp.platform]?.color : undefined;
  };

  // Load geolocation data for all domains
  async function loadGeoData() {
    const uniqueDomains = [...new Set(safeFootprints.map(f => f.domain))];
    const geoMap = {};

    // Live lookups are strictly opt-in (default OFF): cached data is always
    // shown, but uncached domains are only fetched after explicit consent.
    const optIn = await getGeoOptIn();
    setGeoOptInState(optIn);

    // First, load all cached data in parallel (Promise.all)
    const cachedPromises = uniqueDomains.map(async domain => {
      const cached = await getGeoCache(domain);
      return cached && cached.lat && cached.lon ? [domain, cached] : null;
    });
    const cachedResults = await Promise.all(cachedPromises);
    for (const result of cachedResults) {
      if (result) {
        geoMap[result[0]] = result[1];
      }
    }

    setGeoData(geoMap);

    // Then, fetch missing geolocation data (opt-in only)
    const uncachedDomains = uniqueDomains.filter(d => !geoMap[d]);

    if (optIn && uncachedDomains.length > 0) {
      setIsLoadingGeo(true);
      setGeoProgress({ current: 0, total: uncachedDomains.length });

      try {
        const newGeoData = await fetchBulkGeolocation(
          uncachedDomains,
          progress => {
            setGeoProgress({
              current: progress.current,
              total: progress.total,
            });
          }
        );

        // Merge with existing data
        setGeoData(prev => ({ ...prev, ...newGeoData }));
      } catch (error) {
        console.error('MapView: Error fetching geolocation data:', error);
      } finally {
        setIsLoadingGeo(false);
      }
    }
  }

  useEffect(() => {
    if (safeFootprints && safeFootprints.length > 0) {
      loadGeoData();
    }
  }, [safeFootprints]);

  // Re-check the opt-in when it is toggled in Settings (event from SettingsSheet)
  useEffect(() => {
    const handleOptInChange = () => {
      if (safeFootprints && safeFootprints.length > 0) {
        loadGeoData();
      }
    };
    window.addEventListener('geo-opt-in-changed', handleOptInChange);
    return () =>
      window.removeEventListener('geo-opt-in-changed', handleOptInChange);
    // re-register on footprints change so loadGeoData sees fresh data
  }, [safeFootprints]);

  // Initialize map once the tab panel is visible (hidden tabs have zero size).
  useEffect(() => {
    if (!isActive || !mapRef.current || mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    });

    L.tileLayer(OSM_TILE_URL, osmTileLayerOptions()).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [isActive]);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing tile layers
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    L.tileLayer(OSM_TILE_URL, osmTileLayerOptions()).addTo(
      mapInstanceRef.current
    );
  }, [mapTheme]);

  // Add markers when geo data changes
  useEffect(() => {
    if (!mapInstanceRef.current || Object.keys(geoData).length === 0) return;

    // Remove existing markers
    if (markersLayerRef.current) {
      mapInstanceRef.current.removeLayer(markersLayerRef.current);
    }

    // Create marker cluster group
    const markers = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 10) size = 'medium';
        if (count > 50) size = 'large';

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    // Group events by location
    const grouped = {};
    const domainSetPerLocation = {};

    footprints.forEach(fp => {
      const geo = geoData[fp.domain];
      if (!geo || typeof geo.lat !== 'number' || typeof geo.lon !== 'number') {
        return;
      }
      const key = `${geo.lat},${geo.lon}`;
      if (!grouped[key]) {
        grouped[key] = {
          lat: geo.lat,
          lon: geo.lon,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          domains: [],
          events: 0,
        };
        domainSetPerLocation[key] = new Set();
      }
      grouped[key].events += 1;
      domainSetPerLocation[key].add(fp.domain);
    });

    // finalize domains arrays
    Object.entries(domainSetPerLocation).forEach(([key, set]) => {
      grouped[key].domains = Array.from(set);
    });

    setLocationGroups(grouped);

    // Update parent with location stats
    const eventsWithGeo = Object.values(grouped).reduce(
      (sum, loc) => sum + loc.events,
      0
    );
    const totalEvents = safeFootprints.length;
    const top = Object.values(grouped).reduce(
      (max, loc) =>
        loc.events > max.count
          ? {
              name: loc.city || loc.region || loc.country || 'Unknown',
              count: loc.events,
            }
          : max,
      { name: null, count: 0 }
    );
    const topLocationName = top.name;
    const topCount = top.count;
    onLocationStatsUpdate({
      locations: Object.keys(grouped).length,
      totalEvents,
      eventsWithGeo,
      topLocation: topLocationName,
      topCount,
      unknownCount: totalEvents - eventsWithGeo,
    });

    // Add markers for each location
    Object.values(grouped).forEach(location => {
      const marker = L.marker([location.lat, location.lon], {
        icon: mapPinIcon(),
      });

      // Create popup content — every external geo/domain string is escaped
      // before interpolation (bindPopup renders raw HTML)
      const popupContent = `
        <div class="map-popup">
          <h3>${escapeHtml(
            location.city || location.region || location.country
          )}</h3>
          <p class="location-info">${escapeHtml(location.country)}</p>
          <div class="domains-list">
            <strong>Tracking Domains (${location.domains.length}):</strong>
            <ul>
              ${location.domains
                .slice(0, 5)
                .map(d => `<li>${escapeHtml(d)}</li>`)
                .join('')}
              ${location.domains.length > 5 ? `<li>...and ${location.domains.length - 5} more</li>` : ''}
            </ul>
          </div>
          <p class="location-info">Events: ${location.events}</p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

      marker.on('click', () => {
        setSelectedRegion(location);
      });

      markers.addLayer(marker);
    });

    mapInstanceRef.current.addLayer(markers);
    markersLayerRef.current = markers;

    // Fit bounds to show all markers
    if (markers.getBounds().isValid()) {
      mapInstanceRef.current.fitBounds(markers.getBounds(), {
        padding: [50, 50],
        maxZoom: 10,
      });
    }
  }, [geoData, safeFootprints, onLocationStatsUpdate]);
  // Update parent when footprints change but geo data already present (counts might shift)
  // If no geo data yet, report unknown stats upstream
  useEffect(() => {
    if (safeFootprints.length === 0) return;
    if (Object.keys(geoData).length === 0) {
      onLocationStatsUpdate({
        locations: 0,
        totalEvents: safeFootprints.length,
        eventsWithGeo: 0,
        topLocation: null,
        topCount: 0,
        unknownCount: safeFootprints.length,
      });
    }
  }, [geoData, safeFootprints, onLocationStatsUpdate]);

  // Toggle theme
  const toggleTheme = () => {
    setMapTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Clear geo cache and reload
  const handleClearCache = async () => {
    if (
      confirm(
        'Clear all cached geolocation data? Fresh lookups happen only when map geolocation is enabled in Settings.'
      )
    ) {
      try {
        // Clear memory cache
        await clearAllCaches();

        // Clear IndexedDB cache
        await db.geoCache.clear();

        // Reset state
        setGeoData({});

        // Refetch only when live lookups are opted in
        const optIn = await getGeoOptIn();
        const uniqueDomains = [...new Set(safeFootprints.map(f => f.domain))];

        if (optIn && uniqueDomains.length > 0) {
          setIsLoadingGeo(true);
          setGeoProgress({ current: 0, total: uniqueDomains.length });

          const newGeoData = await fetchBulkGeolocation(
            uniqueDomains,
            progress => {
              setGeoProgress({
                current: progress.current,
                total: progress.total,
              });
            }
          );

          setGeoData(newGeoData);
          setIsLoadingGeo(false);
        }
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Error clearing cache: ' + error.message);
      }
    }
  };

  return (
    <div className="map-view-container">
      <div className="map-controls panel">
        <button
          className="icon-btn pressable"
          onClick={toggleTheme}
          aria-label={`Switch to ${mapTheme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${mapTheme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {mapTheme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        <button
          className="icon-btn pressable"
          onClick={handleClearCache}
          aria-label="Clear geolocation cache"
          title="Clear cached geolocation data and reload"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="map-info">
          <span className="map-stat">
            <span className="num">{Object.keys(locationGroups).length}</span>{' '}
            locations
          </span>
          <span className="map-stat-sep">·</span>
          <span className="map-stat">
            <span className="num">
              {safeFootprints.filter(f => geoData[f.domain]).length}
            </span>{' '}
            tracked events
          </span>
        </div>
      </div>

      <div
        ref={mapRef}
        className={`leaflet-map map-theme-${mapTheme}`}
        role="region"
        aria-label="Geographic tracking map"
      ></div>

      {selectedRegion && (
        <div className="region-detail-drawer panel">
          <div className="drawer-header">
            <h3 title={selectedRegion.city || selectedRegion.region}>
              {selectedRegion.city || selectedRegion.region}
            </h3>
            <button
              className="icon-btn pressable"
              onClick={() => setSelectedRegion(null)}
              aria-label="Close region details"
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
          <div className="drawer-body">
            <div className="kv">
              <div className="kv-row">
                <span className="kv-label">Country</span>
                <span className="kv-value">{selectedRegion.country}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Region</span>
                <span className="kv-value">{selectedRegion.region}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Tracking domains</span>
                <span className="kv-value num">
                  {selectedRegion.domains.length}
                </span>
              </div>
            </div>
            <div className="domains-detail-list">
              {selectedRegion.domains.map(domain => (
                <div key={domain} className="domain-item">
                  <span
                    className="domain-dot"
                    style={{
                      backgroundColor:
                        platformColorForDomain(domain) ||
                        'var(--text-tertiary)',
                    }}
                  />
                  {domain}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoadingGeo && (
        <div className="map-overlay-message panel">
          <p>
            Fetching geolocation data for tracked domains…
            <br />
            <span className="num">{geoProgress.current}</span> /{' '}
            <span className="num">{geoProgress.total}</span> domains processed
          </p>
          <div className="geo-progress-bar">
            <div
              className="geo-progress-fill"
              style={{
                width: `${geoProgress.total > 0 ? (geoProgress.current / geoProgress.total) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {!isLoadingGeo &&
        Object.keys(geoData).length === 0 &&
        footprints.length > 0 && (
          <div className="map-overlay-message panel">
            {geoOptIn ? (
              <p>
                No domain locations to plot yet.
                <br />
                Use the refresh control above to clear cached lookups and retry,
                or check the browser console if lookups are blocked.
              </p>
            ) : (
              <p>
                Map geolocation is off by default.
                <br />
                Enable it in Settings → Privacy to resolve domain locations.
              </p>
            )}
          </div>
        )}
    </div>
  );
}

export default MapView;
