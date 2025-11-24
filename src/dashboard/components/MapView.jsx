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
import { fetchBulkGeolocation, clearAllCaches } from '../utils/geolocation.js';
import '../styles/MapView.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyLjUgMEMxOS40IDAgMjUgNS42IDI1IDEyLjVjMCAxMC05IDIxLjUtMTIuNSAyOC41QzggMzQgMCAyMi41IDAgMTIuNSAwIDUuNiA1LjYgMCAxMi41IDB6IiBmaWxsPSIjMDBkNGFhIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  iconUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyLjUgMEMxOS40IDAgMjUgNS42IDI1IDEyLjVjMCAxMC05IDIxLjUtMTIuNSAyOC41QzggMzQgMCAyMi41IDAgMTIuNSAwIDUuNiA1LjYgMCAxMi41IDB6IiBmaWxsPSIjMDBkNGFhIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapView({ footprints, stats, onLocationStatsUpdate = () => {} }) {
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

  // Load geolocation data for all domains
  useEffect(() => {
    async function loadGeoData() {
      const uniqueDomains = [...new Set(safeFootprints.map(f => f.domain))];
      console.log('MapView: Loading geolocation for domains:', uniqueDomains);
      const geoMap = {};

      // First, load all cached data
      for (const domain of uniqueDomains) {
        const cached = await getGeoCache(domain);
        if (cached && cached.lat && cached.lon) {
          geoMap[domain] = cached;
          console.log(`MapView: Cached geo data for ${domain}:`, cached);
        }
      }

      setGeoData(geoMap);

      // Then, fetch missing geolocation data
      const uncachedDomains = uniqueDomains.filter(d => !geoMap[d]);
      console.log('MapView: Uncached domains:', uncachedDomains);

      if (uncachedDomains.length > 0) {
        setIsLoadingGeo(true);
        setGeoProgress({ current: 0, total: uncachedDomains.length });

        try {
          console.log('MapView: Fetching bulk geolocation...');
          const newGeoData = await fetchBulkGeolocation(
            uncachedDomains,
            progress => {
              console.log('MapView: Progress:', progress);
              setGeoProgress({
                current: progress.current,
                total: progress.total,
              });
            }
          );

          console.log('MapView: Fetched geo data:', newGeoData);
          // Merge with existing data
          setGeoData(prev => ({ ...prev, ...newGeoData }));
        } catch (error) {
          console.error('MapView: Error fetching geolocation data:', error);
        } finally {
          setIsLoadingGeo(false);
        }
      } else {
        console.log('MapView: All domains already cached');
      }
    }

    if (safeFootprints && safeFootprints.length > 0) {
      loadGeoData();
    }
  }, [safeFootprints]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    });

    // Add tile layer
    const tileUrl =
      mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing tile layers
    mapInstanceRef.current.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Add new tile layer
    const tileUrl =
      mapTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
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
      const marker = L.marker([location.lat, location.lon]);

      // Create popup content
      const popupContent = `
        <div class="map-popup">
          <h3>${location.city || location.region || location.country}</h3>
          <p class="location-info">${location.country}</p>
          <div class="domains-list">
            <strong>Tracking Domains (${location.domains.length}):</strong>
            <ul>
              ${location.domains
                .slice(0, 5)
                .map(d => `<li>${d}</li>`)
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
        'Clear all cached geolocation data? This will force fresh lookups from the API.'
      )
    ) {
      try {
        // Clear memory cache
        await clearAllCaches();

        // Clear IndexedDB cache
        await db.geoCache.clear();

        console.log('Geo cache cleared, reloading data...');

        // Reset state
        setGeoData({});

        // Force reload by updating footprints reference
        const uniqueDomains = [...new Set(safeFootprints.map(f => f.domain))];
        console.log('Reloading geolocation for:', uniqueDomains);

        // Trigger reload
        if (uniqueDomains.length > 0) {
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
      <div className="map-controls">
        <button
          className="map-control-button"
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
          className="map-control-button"
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
            {Object.keys(locationGroups).length} locations
          </span>
          <span className="map-stat-sep">•</span>
          <span className="map-stat">
            {safeFootprints.filter(f => geoData[f.domain]).length} tracked events
          </span>
        </div>
      </div>

      <div
        ref={mapRef}
        className="leaflet-map"
        role="region"
        aria-label="Geographic tracking map"
      ></div>

      {selectedRegion && (
        <div className="region-detail-drawer">
          <div className="drawer-header">
            <h3>{selectedRegion.city || selectedRegion.region}</h3>
            <button
              className="close-drawer"
              onClick={() => setSelectedRegion(null)}
              aria-label="Close region details"
            >
              ×
            </button>
          </div>
          <div className="drawer-body">
            <div className="detail-item">
              <span className="detail-label">Country:</span>
              <span className="detail-value">{selectedRegion.country}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Region:</span>
              <span className="detail-value">{selectedRegion.region}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tracking Domains:</span>
              <span className="detail-value">
                {selectedRegion.domains.length}
              </span>
            </div>
            <div className="domains-detail-list">
              {selectedRegion.domains.map(domain => (
                <div key={domain} className="domain-item">
                  {domain}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoadingGeo && (
        <div className="map-overlay-message">
          <p>
            Fetching geolocation data for tracked domains...
            <br />
            {geoProgress.current} / {geoProgress.total} domains processed
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
          <div className="map-overlay-message">
            <p>
              No geolocation data available for tracked domains.
              <br />
              Domains may not have resolvable IP addresses.
            </p>
          </div>
        )}
    </div>
  );
}

export default MapView;
