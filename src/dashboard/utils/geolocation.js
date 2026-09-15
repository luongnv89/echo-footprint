/**
 * Dashboard Geolocation Utilities
 * Fetches geolocation data for domains using http://ip-api.com (opt-in, off by default)
 * Implements sophisticated rate limiting (45 req/min) and multi-layer caching
 *
 * Features:
 * - Multi-layer cache (memory + IndexedDB)
 * - Persistent rate limit state across sessions
 * - Request deduplication
 * - Automatic request queuing and throttling
 * - Cache expiration (7 days default)
 */

import {
  deleteGeoCache,
  getGeoCache,
  setGeoCache,
  getSetting,
  setSetting,
} from './db.js';

// Configuration
// Free tier is HTTP-only; HTTPS returns 403 (SSL is for paid plans per ip-api.com).
const GEO_API_URL = 'http://ip-api.com/json/';
const GEO_API_FIELDS = 'status,message,country,regionName,city,lat,lon,isp,org';
const RATE_LIMIT_PER_MINUTE = 45;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_SAFETY_MARGIN = 5; // Keep 5 requests as buffer
const EFFECTIVE_RATE_LIMIT = RATE_LIMIT_PER_MINUTE - RATE_LIMIT_SAFETY_MARGIN; // 40 req/min
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RATE_LIMIT_STATE_KEY = 'geoRateLimitState';
const GEO_OPT_IN_KEY = 'geoOptIn';

// Live geolocation lookups are strictly opt-in (default OFF): the default path
// must never send visited domains to a third party (F-SEC-001).
let geoOptIn = false;

// In-memory cache for ultra-fast lookups (cleared on page refresh)
const memoryCache = new Map();

// Active request tracking to prevent duplicate requests
const activeRequests = new Map();

// Rate limiting state (persisted to IndexedDB)
let requestTimestamps = [];
let pendingQueue = [];
let isProcessing = false;
let isInitialized = false;

/**
 * Initialize geolocation system
 * Restores rate limit state from IndexedDB
 */
async function initialize() {
  if (isInitialized) return;

  try {
    // Restore rate limit state from previous session
    const savedState = await getSetting(RATE_LIMIT_STATE_KEY);
    if (savedState && savedState.timestamps) {
      const now = Date.now();
      // Only restore timestamps from the last minute
      requestTimestamps = savedState.timestamps.filter(
        ts => now - ts < RATE_LIMIT_WINDOW_MS
      );
    }
    // Restore opt-in preference (default OFF)
    const optIn = await getSetting(GEO_OPT_IN_KEY);
    geoOptIn = optIn === true;
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize geolocation system:', error);
    isInitialized = true; // Continue anyway
  }
}

/**
 * Persist rate limit state to IndexedDB
 */
async function persistRateLimitState() {
  try {
    await setSetting(RATE_LIMIT_STATE_KEY, {
      timestamps: requestTimestamps,
      lastUpdate: Date.now(),
    });
  } catch (error) {
    console.error('Failed to persist rate limit state:', error);
  }
}

/**
 * Check if we're within rate limit
 * @returns {boolean} - True if we can make a request
 */
function canMakeRequest() {
  const now = Date.now();

  // Remove timestamps older than 1 minute
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  return requestTimestamps.length < EFFECTIVE_RATE_LIMIT;
}

/**
 * Get number of available request slots
 * @returns {number} - Number of requests that can be made
 */
function getAvailableSlots() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  return Math.max(0, EFFECTIVE_RATE_LIMIT - requestTimestamps.length);
}

/**
 * Get time until next request slot is available
 * @returns {number} - Milliseconds until next slot
 */
function getTimeUntilNextSlot() {
  if (canMakeRequest()) return 0;

  const now = Date.now();
  const validTimestamps = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length === 0) return 0;

  // Find the oldest timestamp
  const oldestTimestamp = Math.min(...validTimestamps);
  const timeUntilExpiry = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);

  return Math.max(0, timeUntilExpiry + 100); // Add 100ms buffer
}

/**
 * Record a request timestamp
 */
async function recordRequest() {
  requestTimestamps.push(Date.now());
  // Persist state after each request
  await persistRateLimitState();
}

/**
 * Check if cache entry is still valid
 * @param {Object} cacheEntry - Cache entry from IndexedDB
 * @returns {boolean} - True if cache is still valid
 */
function hasValidCoordinates(geo) {
  return (
    geo &&
    typeof geo.lat === 'number' &&
    typeof geo.lon === 'number' &&
    Number.isFinite(geo.lat) &&
    Number.isFinite(geo.lon)
  );
}

function isCacheValid(cacheEntry) {
  if (!cacheEntry) return false;

  // If no cachedAt timestamp, assume it's old format and still valid
  if (!cacheEntry.cachedAt) return true;

  const now = Date.now();
  const age = now - cacheEntry.cachedAt;

  // Cache is valid if younger than TTL
  return age < CACHE_TTL_MS;
}

/**
 * Get cached geolocation from multi-layer cache
 * @param {string} domain - Domain to lookup
 * @returns {Object|null} - Cached geolocation or null
 */
async function getCachedGeolocation(domain) {
  // Layer 1: Check memory cache (ultra-fast)
  if (memoryCache.has(domain)) {
    const cached = memoryCache.get(domain);
    if (isCacheValid(cached) && hasValidCoordinates(cached)) {
      return { ...cached, cacheLayer: 'memory' };
    }
    memoryCache.delete(domain);
  }

  // Layer 2: Check IndexedDB cache
  const dbCached = await getGeoCache(domain);
  if (dbCached && isCacheValid(dbCached)) {
    if (hasValidCoordinates(dbCached)) {
      memoryCache.set(domain, dbCached);
      return { ...dbCached, cacheLayer: 'indexeddb' };
    }
    // Drop stale "Unknown" rows from failed lookups so opt-in can retry.
    await deleteGeoCache(domain);
  }

  return null;
}

/**
 * Store geolocation in multi-layer cache
 * @param {string} domain - Domain to cache
 * @param {Object} geoData - Geolocation data
 */
async function setCachedGeolocation(domain, geoData) {
  const cacheEntry = {
    ...geoData,
    cachedAt: Date.now(),
  };

  // Store in both layers
  memoryCache.set(domain, cacheEntry);
  await setGeoCache(domain, cacheEntry);
}

/**
 * Wait for rate limit to allow next request
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  while (!canMakeRequest()) {
    const waitTime = getTimeUntilNextSlot();

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } else {
      // Safety break to prevent infinite loop
      break;
    }
  }
}

/**
 * Calculate backoff delay for retry attempt
 * @param {number} attempt - Retry attempt number (0-indexed)
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoff(attempt) {
  return INITIAL_BACKOFF_MS * Math.pow(2, attempt);
}

/**
 * Get the opt-in state for live geolocation lookups.
 * @returns {Promise<boolean>} - True when the user opted in
 */
export async function getGeoOptIn() {
  await initialize();
  return geoOptIn;
}

/**
 * Set the opt-in state for live geolocation lookups (persisted).
 * @param {boolean} enabled
 */
export async function setGeoOptIn(enabled) {
  await initialize();
  geoOptIn = enabled === true;
  try {
    await setSetting(GEO_OPT_IN_KEY, geoOptIn);
  } catch (error) {
    console.error('Failed to persist geolocation opt-in:', error);
  }
}

/**
 * Fetch geolocation for a domain from ip-api.com (requires opt-in)
 * @param {string} domain - Domain to lookup
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @returns {Promise<Object|null>} - Geolocation data or null
 */
async function fetchGeolocation(domain, attempt = 0) {
  // Opt-in gate: no live lookups unless the user explicitly enabled them
  if (!geoOptIn) return null;

  try {
    // Wait for rate limit
    await waitForRateLimit();

    // Record the request
    await recordRequest();

    // Make API request with specific fields to minimize response size
    const apiUrl = `${GEO_API_URL}${domain}?fields=${GEO_API_FIELDS}`;
    console.log(`Fetching geolocation from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    console.log(
      `Response status for ${domain}:`,
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const httpError = new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
      httpError.status = response.status;
      throw httpError;
    }

    const data = await response.json();
    console.log(`Raw API response for ${domain}:`, data);

    // Check if API returned success
    if (data.status === 'success') {
      const geoData = {
        country: data.country || 'Unknown',
        region: data.regionName || data.region || 'Unknown',
        city: data.city || 'Unknown',
        lat: data.lat || null,
        lon: data.lon || null,
        isp: data.isp || null,
        org: data.org || null,
      };

      console.log(`Geolocation success for ${domain}:`, geoData);
      return geoData;
    } else {
      // Log the failure reason
      console.warn(
        `Geolocation failed for ${domain}:`,
        data.status,
        data.message || 'No message'
      );

      // If rate limited, retry with backoff
      if (data.message && data.message.includes('rate limit')) {
        if (attempt < MAX_RETRIES - 1) {
          const backoffDelay = calculateBackoff(attempt);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return await fetchGeolocation(domain, attempt + 1);
        }
      }

      return null;
    }
  } catch (error) {
    const status = error?.status;
    const nonRetryable =
      status === 403 || status === 401 || status === 404 || status === 400;

    if (nonRetryable) {
      console.warn(
        `Dashboard Geolocation: lookup failed for ${domain} (${error.message})`
      );
      return null;
    }

    console.error(
      `Dashboard Geolocation: Error fetching for ${domain}:`,
      error
    );

    // Retry with exponential backoff
    if (attempt < MAX_RETRIES - 1) {
      const backoffDelay = calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return await fetchGeolocation(domain, attempt + 1);
    }

    return null;
  }
}

/**
 * Normalize domain by removing www. prefix and protocol
 * @param {string} domain - Domain to normalize
 * @returns {string} - Normalized domain
 */
function normalizeDomain(domain) {
  if (!domain) return domain;

  let normalized = domain.toLowerCase().trim();

  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');

  // Remove www. prefix for geolocation lookup (www. can cause issues with the API)
  // But keep it for display purposes
  // Actually, we should NOT remove www for the API call - let's keep the domain as-is
  // The API can handle www. prefixes

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');

  // Remove path if present (keep only domain)
  normalized = normalized.split('/')[0];

  return normalized;
}

/**
 * Get geolocation for a domain (cached or fetch)
 * Implements request deduplication to prevent multiple simultaneous requests for same domain
 * @param {string} domain - Domain to lookup
 * @returns {Promise<Object|null>} - Geolocation data or null
 */
export async function getGeolocationForDomain(domain) {
  // Initialize if not already done
  await initialize();

  // Normalize domain
  const normalizedDomain = normalizeDomain(domain);
  console.log(`getGeolocationForDomain: ${domain} → ${normalizedDomain}`);

  try {
    // Check if there's already an active request for this domain
    if (activeRequests.has(normalizedDomain)) {
      return await activeRequests.get(normalizedDomain);
    }

    // Create a new request promise
    const requestPromise = (async () => {
      try {
        // Check multi-layer cache first
        const cached = await getCachedGeolocation(normalizedDomain);

        if (cached) {
          return {
            country: cached.country,
            region: cached.region,
            city: cached.city || 'Unknown',
            lat: cached.lat,
            lon: cached.lon,
            isp: cached.isp || null,
            org: cached.org || null,
            fromCache: true,
            cacheLayer: cached.cacheLayer,
          };
        }

        // Fetch from API (only after explicit opt-in)
        if (!geoOptIn) {
          return null;
        }

        const geoData = await fetchGeolocation(normalizedDomain);

        if (geoData) {
          // Store in multi-layer cache
          await setCachedGeolocation(normalizedDomain, geoData);
          return { ...geoData, fromCache: false };
        }

        // Return "Unknown" fallback
        return {
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          lat: null,
          lon: null,
          isp: null,
          org: null,
          fromCache: false,
        };
      } finally {
        // Clean up active request tracking
        activeRequests.delete(normalizedDomain);
      }
    })();

    // Track this request
    activeRequests.set(normalizedDomain, requestPromise);

    return await requestPromise;
  } catch (error) {
    console.error(
      `Dashboard Geolocation: Error for ${normalizedDomain}:`,
      error
    );
    activeRequests.delete(normalizedDomain);
    return null;
  }
}

/**
 * Process pending queue (background processing)
 * @returns {Promise<void>}
 */
async function processPendingQueue() {
  if (isProcessing || pendingQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (pendingQueue.length > 0) {
    const { domain, resolve, reject } = pendingQueue.shift();

    try {
      const geoData = await getGeolocationForDomain(domain);
      resolve(geoData);
    } catch (error) {
      reject(error);
    }
  }

  isProcessing = false;
}

/**
 * Queue a geolocation lookup (non-blocking)
 * @param {string} domain - Domain to lookup
 * @returns {Promise<Object|null>} - Geolocation data or null
 */
export function queueGeolocationLookup(domain) {
  return new Promise((resolve, reject) => {
    pendingQueue.push({ domain, resolve, reject });

    // Start processing queue if not already processing
    if (!isProcessing) {
      processPendingQueue().catch(error => {
        console.error('Dashboard Geolocation: Error processing queue:', error);
      });
    }
  });
}

/**
 * Fetch geolocation for all domains in bulk with intelligent batching
 * @param {Array<string>} domains - Array of domains to lookup
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Map of domain to geolocation data
 */
export async function fetchBulkGeolocation(domains, onProgress = null) {
  await initialize();

  const geoMap = {};
  const uniqueDomains = [...new Set(domains)];
  let processedCount = 0;

  // Separate cached and uncached domains — parallel cache reads
  const cachedPromises = uniqueDomains.map(async domain => {
    const cached = await getCachedGeolocation(domain);
    return cached && cached.lat && cached.lon
      ? { domain, cached, isCached: true }
      : { domain, cached: null, isCached: false };
  });
  const cachedResults = await Promise.all(cachedPromises);

  const uncachedDomains = [];
  for (const result of cachedResults) {
    if (result.isCached) {
      geoMap[result.domain] = result.cached;
      processedCount++;
      if (onProgress) {
        onProgress({
          current: processedCount,
          total: uniqueDomains.length,
          domain: result.domain,
          success: true,
          cached: true,
        });
      }
    } else {
      uncachedDomains.push(result.domain);
    }
  }

  // Fetch uncached domains with parallel batches to respect rate limits
  const BATCH_SIZE = 3; // Small batches for rate-limit safety
  for (let i = 0; i < uncachedDomains.length; i += BATCH_SIZE) {
    const batch = uncachedDomains.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async domain => {
        try {
          const geoData = await getGeolocationForDomain(domain);
          return { domain, geoData, success: true };
        } catch (error) {
          return { domain, geoData: null, success: false, error };
        }
      })
    );

    for (const result of batchResults) {
      const { domain, geoData, success, error } = result;
      console.log(`Bulk fetch result for ${domain}:`, geoData);

      if (geoData && geoData.lat && geoData.lon) {
        geoMap[domain] = geoData;
      } else if (!success) {
        console.error(`Failed to fetch geolocation for ${domain}:`, error);
      } else {
        console.warn(`✗ Skipping ${domain} - no valid coordinates:`, geoData);
      }

      processedCount++;
      if (onProgress) {
        onProgress({
          current: processedCount,
          total: uniqueDomains.length,
          domain,
          success: success && !!(geoData && geoData.lat && geoData.lon),
          cached: false,
        });
      }
    }

    // Small delay between batches to avoid overwhelming rate limits
    if (i + BATCH_SIZE < uncachedDomains.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return geoMap;
}

/**
 * Get queue statistics and rate limit status
 * @returns {Object} - Detailed queue and rate limit stats
 */
export function getQueueStats() {
  const now = Date.now();
  const recentRequests = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  return {
    pendingCount: pendingQueue.length,
    requestsInLastMinute: recentRequests.length,
    rateLimitRemaining: EFFECTIVE_RATE_LIMIT - recentRequests.length,
    effectiveRateLimit: EFFECTIVE_RATE_LIMIT,
    maxRateLimit: RATE_LIMIT_PER_MINUTE,
    canMakeRequest: canMakeRequest(),
    availableSlots: getAvailableSlots(),
    timeUntilNextSlot: getTimeUntilNextSlot(),
    activeRequestCount: activeRequests.size,
    memoryCacheSize: memoryCache.size,
    isInitialized,
  };
}

/**
 * Clear all caches (for testing or manual cache reset)
 * @returns {Promise<void>}
 */
export async function clearAllCaches() {
  memoryCache.clear();
  activeRequests.clear();

  // Note: IndexedDB cache is not cleared to preserve long-term cache
  // Use db.geoCache.clear() separately if needed
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  return {
    memoryCacheSize: memoryCache.size,
    memoryCacheKeys: Array.from(memoryCache.keys()),
  };
}

/**
 * Prewarm cache for a list of domains
 * Checks which domains are not cached and queues them for background fetching
 * @param {Array<string>} domains - Domains to prewarm
 * @returns {Promise<Object>} - Stats about prewarming
 */
export async function prewarmCache(domains) {
  await initialize();

  const uniqueDomains = [...new Set(domains)];
  const stats = {
    total: uniqueDomains.length,
    alreadyCached: 0,
    queued: 0,
    failed: 0,
  };

  for (const domain of uniqueDomains) {
    const cached = await getCachedGeolocation(domain);
    if (cached) {
      stats.alreadyCached++;
    } else {
      try {
        // Queue for background fetch (non-blocking)
        queueGeolocationLookup(domain);
        stats.queued++;
      } catch (error) {
        console.error(`Failed to queue ${domain} for prewarming:`, error);
        stats.failed++;
      }
    }
  }

  return stats;
}
