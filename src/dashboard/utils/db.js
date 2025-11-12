/**
 * IndexedDB Database Layer using Dexie.js
 * Implements footprints, settings, and geoCache storage
 * Per PRD: 500MB soft cap, quota warnings at 80%
 */

import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('EchoFootPrint');

// Define schema
// Version 1: Original schema
db.version(1).stores({
  footprints: '++id, timestamp, domain, url, pixelType, ipGeo',
  settings: 'key', // Key-value store for settings
  geoCache: 'domain, country, region', // Cache for geolocation lookups
});

// Version 2: Add platform field for multi-platform tracking support
db.version(2).stores({
  footprints: '++id, timestamp, domain, url, pixelType, platform',
  settings: 'key',
  geoCache: 'domain, country, region',
}).upgrade(tx => {
  // Migrate existing footprints: backfill platform as 'facebook'
  console.log('[Dashboard DB] Migrating to version 2: adding platform field');
  return tx.table('footprints').toCollection().modify(footprint => {
    if (!footprint.platform) {
      footprint.platform = 'facebook';
    }
    // Remove ipGeo field (geolocation was removed per user request)
    delete footprint.ipGeo;
  });
});

// Storage quota configuration (500MB = 524,288,000 bytes)
const STORAGE_SOFT_CAP = 500 * 1024 * 1024; // 500 MB
const STORAGE_WARNING_THRESHOLD = 0.8; // Warn at 80%

/**
 * Add a footprint record to the database
 * @param {Object} data - Footprint data
 * @param {string} data.domain - Domain where pixel was detected
 * @param {string} data.url - Full URL of the page
 * @param {string} data.pixelType - Type of pixel (script, img, iframe)
 * @param {Object} data.ipGeo - Geolocation data (optional)
 * @returns {Promise<number>} - ID of inserted record
 */
export async function addFootprint(data) {
  try {
    // Check storage quota before adding
    const quotaStatus = await checkStorageQuota();
    if (quotaStatus.exceededCap) {
      throw new Error('Storage quota exceeded. Please clear old data.');
    }

    const id = await db.footprints.add({
      timestamp: data.timestamp || Date.now(),
      domain: data.domain,
      url: data.url,
      pixelType: data.pixelType || 'unknown',
      platform: data.platform || 'facebook', // Default to facebook for backward compatibility
    });

    return id;
  } catch (error) {
    console.error('Error adding footprint:', error);
    throw error;
  }
}

/**
 * Get footprints with optional filters
 * @param {Object} filter - Filter options
 * @param {number} filter.startDate - Start timestamp (inclusive)
 * @param {number} filter.endDate - End timestamp (inclusive)
 * @param {string} filter.domain - Filter by specific domain
 * @param {number} filter.limit - Maximum number of results
 * @returns {Promise<Array>} - Array of footprint records
 */
export async function getFootprints(filter = {}) {
  try {
    let query = db.footprints;

    // Apply timestamp filters
    if (filter.startDate && filter.endDate) {
      query = query
        .where('timestamp')
        .between(filter.startDate, filter.endDate, true, true);
    } else if (filter.startDate) {
      query = query.where('timestamp').aboveOrEqual(filter.startDate);
    } else if (filter.endDate) {
      query = query.where('timestamp').belowOrEqual(filter.endDate);
    }

    // Apply domain filter
    if (filter.domain) {
      const all = await query.toArray();
      const filtered = all.filter(f => f.domain === filter.domain);
      return filter.limit ? filtered.slice(0, filter.limit) : filtered;
    }

    // Apply limit
    if (filter.limit) {
      return await query.limit(filter.limit).toArray();
    }

    return await query.toArray();
  } catch (error) {
    console.error('Error getting footprints:', error);
    throw error;
  }
}

/**
 * Get unique domains from footprints
 * @returns {Promise<Array<string>>} - Array of unique domains
 */
export async function getUniqueDomains() {
  try {
    const footprints = await db.footprints.toArray();
    const domains = new Set(footprints.map(f => f.domain));
    return Array.from(domains);
  } catch (error) {
    console.error('Error getting unique domains:', error);
    throw error;
  }
}

/**
 * Get footprint count by domain
 * @returns {Promise<Object>} - Object with domain counts {domain: count}
 */
export async function getDomainCounts() {
  try {
    const footprints = await db.footprints.toArray();
    const counts = {};

    footprints.forEach(f => {
      counts[f.domain] = (counts[f.domain] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('Error getting domain counts:', error);
    throw error;
  }
}

/**
 * Get or set a setting value
 * @param {string} key - Setting key
 * @param {*} value - Setting value (if setting)
 * @returns {Promise<*>} - Setting value (if getting)
 */
export async function getSetting(key) {
  try {
    const result = await db.settings.get(key);
    return result ? result.value : null;
  } catch (error) {
    console.error('Error getting setting:', error);
    throw error;
  }
}

export async function setSetting(key, value) {
  try {
    await db.settings.put({ key, value });
  } catch (error) {
    console.error('Error setting setting:', error);
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
    console.error('Error getting geo cache:', error);
    throw error;
  }
}

/**
 * Set cached geolocation for a domain
 * @param {string} domain - Domain to cache
 * @param {Object} geoData - Geolocation data
 * @param {string} geoData.country - Country name
 * @param {string} geoData.region - Region/state name
 * @param {number} geoData.lat - Latitude (optional)
 * @param {number} geoData.lon - Longitude (optional)
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
    console.error('Error setting geo cache:', error);
    throw error;
  }
}

/**
 * Clear all data from database (for data deletion feature)
 * @returns {Promise<void>}
 */
export async function clearAllData() {
  try {
    await db.footprints.clear();
    await db.geoCache.clear();
    // Keep settings intact unless specifically requested
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

/**
 * Clear only footprints older than specified date
 * @param {number} beforeTimestamp - Delete records before this timestamp
 * @returns {Promise<number>} - Number of records deleted
 */
export async function clearOldFootprints(beforeTimestamp) {
  try {
    const deleted = await db.footprints
      .where('timestamp')
      .below(beforeTimestamp)
      .delete();
    return deleted;
  } catch (error) {
    console.error('Error clearing old footprints:', error);
    throw error;
  }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} - Database statistics
 */
export async function getStats() {
  try {
    const footprintCount = await db.footprints.count();
    const geoCount = await db.geoCache.count();
    const domains = await getUniqueDomains();
    const oldestRecord = await db.footprints
      .orderBy('timestamp')
      .first();
    const newestRecord = await db.footprints
      .orderBy('timestamp')
      .reverse()
      .first();

    // Get platform breakdown
    const allFootprints = await db.footprints.toArray();
    const platformCounts = {};
    const platformDomains = {};

    allFootprints.forEach(fp => {
      const platform = fp.platform || 'unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;

      if (!platformDomains[platform]) {
        platformDomains[platform] = new Set();
      }
      platformDomains[platform].add(fp.domain);
    });

    // Convert Sets to counts
    const platformStats = {};
    Object.keys(platformCounts).forEach(platform => {
      platformStats[platform] = {
        detections: platformCounts[platform],
        domains: platformDomains[platform].size,
      };
    });

    return {
      totalFootprints: footprintCount,
      uniqueDomains: domains.length,
      geoCacheSize: geoCount,
      oldestTimestamp: oldestRecord ? oldestRecord.timestamp : null,
      newestTimestamp: newestRecord ? newestRecord.timestamp : null,
      platformStats: platformStats, // New: per-platform statistics
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
}

/**
 * Check storage quota and warn if approaching limit
 * Per PRD: 500MB soft cap, warn at 80% (400MB)
 * @returns {Promise<Object>} - Quota status object
 */
export async function checkStorageQuota() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      // Fallback for browsers without Storage API
      return {
        usage: 0,
        quota: STORAGE_SOFT_CAP,
        percentage: 0,
        usageMB: 0,
        quotaMB: STORAGE_SOFT_CAP / (1024 * 1024),
        percentUsed: 0,
        warningThreshold: false,
        exceededCap: false,
      };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = Math.min(estimate.quota || STORAGE_SOFT_CAP, STORAGE_SOFT_CAP);
    const percentage = quota > 0 ? usage / quota : 0;

    return {
      usage,
      quota,
      percentage,
      usageMB: usage / (1024 * 1024),
      quotaMB: quota / (1024 * 1024),
      percentUsed: percentage * 100,
      warningThreshold: percentage >= STORAGE_WARNING_THRESHOLD,
      exceededCap: usage >= STORAGE_SOFT_CAP,
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return {
      usage: 0,
      quota: STORAGE_SOFT_CAP,
      percentage: 0,
      usageMB: 0,
      quotaMB: STORAGE_SOFT_CAP / (1024 * 1024),
      percentUsed: 0,
      warningThreshold: false,
      exceededCap: false,
      error: error.message,
    };
  }
}

/**
 * Export database for backup/debugging
 * @returns {Promise<Object>} - Full database export
 */
export async function exportDatabase() {
  try {
    const footprints = await db.footprints.toArray();
    const settings = await db.settings.toArray();
    const geoCache = await db.geoCache.toArray();

    return {
      version: 1,
      exportedAt: Date.now(),
      footprints,
      settings,
      geoCache,
    };
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
}

/**
 * Initialize database and run migrations if needed
 * @returns {Promise<void>}
 */
export async function initDatabase() {
  try {
    // Open the database to trigger version check
    await db.open();

    // Set default settings if not exists
    const hasInit = await getSetting('initialized');
    if (!hasInit) {
      await setSetting('initialized', true);
      await setSetting('installDate', Date.now());
      await setSetting('version', 1);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Export database instance for advanced usage
export default db;
