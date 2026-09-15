/**
 * Keyless map basemap tiles for the dashboard Map view.
 * OpenStreetMap raster tiles — no API keys, already allowed in extension CSP.
 */

export const OSM_TILE_URL =
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/** Leaflet attribution HTML (OSM tile usage policy). */
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Shared Leaflet tileLayer options for light and dark map themes. */
export function osmTileLayerOptions() {
  return {
    attribution: OSM_TILE_ATTRIBUTION,
    subdomains: 'abc',
    maxZoom: 19,
  };
}
