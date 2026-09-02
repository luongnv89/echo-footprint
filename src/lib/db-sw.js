/**
 * Service Worker Database Layer
 * Lightweight wrapper for service worker context
 * Uses same Dexie schema as dashboard but with minimal API
 */

import Dexie from 'dexie';
import { applySchema, DB_NAME } from '../db/schema.js';

// Initialize Dexie database (shared schema with dashboard, see src/db/schema.js)
const db = new Dexie(DB_NAME);

// Attach the shared schema (single source of truth: src/db/schema.js)
applySchema(db);

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input string
 * @param {number} maxLength - Maximum length
 * @returns {string} - Sanitized string
 */
function sanitizeString(input, maxLength = 2048) {
  if (typeof input !== 'string') return 'unknown';
  // Remove any HTML tags and limit length
  return (
    input
      .replace(/<[^>]*>/g, '')
      .substring(0, maxLength)
      .trim() || 'unknown'
  );
}

/**
 * Validate domain format
 * @param {string} domain - Domain string
 * @returns {boolean} - True if valid
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  // Basic domain validation (alphanumeric, dots, hyphens)
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
  return domainRegex.test(domain) && domain.length <= 253;
}

/**
 * Add a footprint record
 * @param {Object} data - Footprint data
 * @returns {Promise<number>} - ID of inserted record
 */
export async function addFootprint(data) {
  try {
    // Validate and sanitize domain
    if (!isValidDomain(data.domain)) {
      throw new Error('Invalid domain format');
    }

    return await db.footprints.add({
      timestamp: data.timestamp || Date.now(),
      domain: sanitizeString(data.domain, 253),
      url: sanitizeString(data.url),
      pixelType: sanitizeString(data.pixelType || 'unknown', 50),
      platform: sanitizeString(data.platform || 'facebook', 50),
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
    const uniqueDomains = await db.footprints.orderBy('domain').uniqueKeys();
    return uniqueDomains.length;
  } catch (error) {
    console.error('[SW DB] Error getting unique domain count:', error);
    return 0;
  }
}

/**
 * Get footprint count for the current day
 * @returns {Promise<number>} - Footprints detected since local midnight
 */
export async function getTodayFootprintCount() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return await db.footprints
      .where('timestamp')
      .aboveOrEqual(startOfDay.getTime())
      .count();
  } catch (error) {
    console.error('[SW DB] Error getting today footprint count:', error);
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
