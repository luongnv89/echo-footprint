/**
 * Service Worker Database Layer
 * Lightweight wrapper for service worker context
 * Uses same Dexie schema as dashboard but with minimal API
 */

import Dexie from 'dexie';

// Initialize Dexie database (shared schema with dashboard)
const db = new Dexie('EchoFootPrint');

// Define schema (must match dashboard/utils/db.js)
// Version 1: Original schema
db.version(1).stores({
  footprints: '++id, timestamp, domain, url, pixelType, ipGeo',
  settings: 'key',
  geoCache: 'domain, country, region',
});

// Version 2: Add platform field for multi-platform tracking support
db.version(2).stores({
  footprints: '++id, timestamp, domain, url, pixelType, platform',
  settings: 'key',
  geoCache: 'domain, country, region',
}).upgrade(tx => {
  // Migrate existing footprints: backfill platform as 'facebook'
  console.log('[SW DB] Migrating to version 2: adding platform field');
  return tx.table('footprints').toCollection().modify(footprint => {
    if (!footprint.platform) {
      footprint.platform = 'facebook';
    }
    // Remove ipGeo field (geolocation was removed per user request)
    delete footprint.ipGeo;
  });
});

/**
 * Add a footprint record
 * @param {Object} data - Footprint data
 * @returns {Promise<number>} - ID of inserted record
 */
export async function addFootprint(data) {
  try {
    return await db.footprints.add({
      timestamp: data.timestamp || Date.now(),
      domain: data.domain,
      url: data.url,
      pixelType: data.pixelType || 'unknown',
      platform: data.platform || 'facebook', // Default to facebook for backward compatibility
    });
  } catch (error) {
    console.error('[SW DB] Error adding footprint:', error);
    throw error;
  }
}

/**
 * Get a setting value
 * @param {string} key - Setting key
 * @returns {Promise<*>} - Setting value or null
 */
export async function getSetting(key) {
  try {
    const result = await db.settings.get(key);
    return result ? result.value : null;
  } catch (error) {
    console.error('[SW DB] Error getting setting:', error);
    throw error;
  }
}

/**
 * Set a setting value
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  try {
    await db.settings.put({ key, value });
  } catch (error) {
    console.error('[SW DB] Error setting setting:', error);
    throw error;
  }
}

/**
 * Get cached geolocation for a domain
 * @param {string} domain - Domain to lookup
 * @returns {Promise<Object|null>} - Cached geo data or null
 */
export async function getGeoCache(domain) {
  try {
    return await db.geoCache.get(domain);
  } catch (error) {
    console.error('[SW DB] Error getting geo cache:', error);
    return null;
  }
}

/**
 * Set cached geolocation for a domain
 * @param {string} domain - Domain
 * @param {Object} geoData - Geolocation data
 * @returns {Promise<string>} - Domain (primary key)
 */
export async function setGeoCache(domain, geoData) {
  try {
    await db.geoCache.put({
      domain,
      country: geoData.country || 'Unknown',
      region: geoData.region || 'Unknown',
      lat: geoData.lat || null,
      lon: geoData.lon || null,
      cachedAt: Date.now(),
    });
    return domain;
  } catch (error) {
    console.error('[SW DB] Error setting geo cache:', error);
    throw error;
  }
}

/**
 * Get footprint count
 * @returns {Promise<number>} - Total footprints
 */
export async function getFootprintCount() {
  try {
    return await db.footprints.count();
  } catch (error) {
    console.error('[SW DB] Error getting footprint count:', error);
    return 0;
  }
}

/**
 * Get unique domain count
 * @returns {Promise<number>} - Unique domains
 */
export async function getUniqueDomainCount() {
  try {
    const footprints = await db.footprints.toArray();
    const domains = new Set(footprints.map(f => f.domain));
    return domains.size;
  } catch (error) {
    console.error('[SW DB] Error getting unique domain count:', error);
    return 0;
  }
}

/**
 * Initialize database (creates tables if needed)
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    await db.open();

    // Set default settings if not exists
    const hasInit = await getSetting('initialized');
    if (!hasInit) {
      await setSetting('initialized', true);
      await setSetting('installDate', Date.now());
      await setSetting('version', 1);
    }
  } catch (error) {
    console.error('[SW DB] Error initializing database:', error);
    throw error;
  }
}

export default db;
