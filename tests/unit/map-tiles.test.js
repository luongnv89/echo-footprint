import { describe, expect, it } from 'vitest';
import {
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
  osmTileLayerOptions,
} from '../../src/dashboard/utils/map-tiles.js';

describe('map-tiles', () => {
  it('uses keyless OpenStreetMap raster URLs only', () => {
    expect(OSM_TILE_URL).toMatch(/tile\.openstreetmap\.org/);
    expect(OSM_TILE_URL).not.toMatch(/cartocdn|api[_-]?key/i);
  });

  it('includes OSM copyright attribution for Leaflet', () => {
    expect(OSM_TILE_ATTRIBUTION).toMatch(/openstreetmap\.org\/copyright/i);
    expect(OSM_TILE_ATTRIBUTION).not.toMatch(/carto/i);
  });

  it('exposes stable Leaflet tileLayer options', () => {
    const opts = osmTileLayerOptions();
    expect(opts.attribution).toBe(OSM_TILE_ATTRIBUTION);
    expect(opts.maxZoom).toBe(19);
    expect(opts.subdomains).toBe('abc');
  });
});
