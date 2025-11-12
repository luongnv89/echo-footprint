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
import { getGeoCache } from '../utils/db.js';
import '../styles/MapView.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyLjUgMEMxOS40IDAgMjUgNS42IDI1IDEyLjVjMCAxMC05IDIxLjUtMTIuNSAyOC41QzggMzQgMCAyMi41IDAgMTIuNSAwIDUuNiA1LjYgMCAxMi41IDB6IiBmaWxsPSIjMDBkNGFhIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iNDEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyLjUgMEMxOS40IDAgMjUgNS42IDI1IDEyLjVjMCAxMC05IDIxLjUtMTIuNSAyOC41QzggMzQgMCAyMi41IDAgMTIuNSAwIDUuNiA1LjYgMCAxMi41IDB6IiBmaWxsPSIjMDBkNGFhIi8+PGNpcmNsZSBjeD0iMTIuNSIgY3k9IjEyLjUiIHI9IjUiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapView({ footprints, stats }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapTheme, setMapTheme] = useState('dark');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [geoData, setGeoData] = useState({});

  // Load geolocation data for all domains
  useEffect(() => {
    async function loadGeoData() {
      const uniqueDomains = [...new Set(footprints.map(f => f.domain))];
      const geoMap = {};

      for (const domain of uniqueDomains) {
        const cached = await getGeoCache(domain);
        if (cached && cached.lat && cached.lon) {
          geoMap[domain] = cached;
        }
      }

      setGeoData(geoMap);
    }

    if (footprints && footprints.length > 0) {
      loadGeoData();
    }
  }, [footprints]);

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

    // Group footprints by location
    const locationGroups = {};

    Object.entries(geoData).forEach(([domain, geo]) => {
      const key = `${geo.lat},${geo.lon}`;
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: geo.lat,
          lon: geo.lon,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          domains: [],
        };
      }
      locationGroups[key].domains.push(domain);
    });

    // Add markers for each location
    Object.values(locationGroups).forEach(location => {
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
  }, [geoData]);

  // Toggle theme
  const toggleTheme = () => {
    setMapTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
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

        <div className="map-info">
          <span className="map-stat">
            {Object.keys(geoData).length} locations
          </span>
          <span className="map-stat-sep">•</span>
          <span className="map-stat">
            {footprints.filter(f => geoData[f.domain]).length} tracked events
          </span>
        </div>
      </div>

      <div ref={mapRef} className="leaflet-map" role="region" aria-label="Geographic tracking map"></div>

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
              <span className="detail-value">{selectedRegion.domains.length}</span>
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

      {Object.keys(geoData).length === 0 && footprints.length > 0 && (
        <div className="map-overlay-message">
          <p>
            Geolocation data is being fetched for tracked domains.
            <br />
            This may take a few moments...
          </p>
        </div>
      )}
    </div>
  );
}

export default MapView;
