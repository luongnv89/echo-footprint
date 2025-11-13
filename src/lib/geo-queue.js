/**
 * Geolocation Queue Manager
 * Fetches geolocation data for domains using ip-api.com
 * Per PRD: 45 req/min rate limit, exponential backoff, cache results
 */

import { getGeoCache, setGeoCache } from './db-sw.js';

// Configuration
const GEO_API_URL = 'http://ip-api.com/json/';
const RATE_LIMIT_PER_MINUTE = 45;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const DEBUG_MODE = true;

// Rate limiting state
let requestTimestamps = [];
let pendingQueue = [];
let isProcessing = false;

/**
 * Debug logging
 */
function debug(message, data = null) {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] [GeoQueue] ${message}`, data);
    } else {
      console.log(`[${timestamp}] [GeoQueue] ${message}`);
    }
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

  return requestTimestamps.length < RATE_LIMIT_PER_MINUTE;
}

/**
 * Record a request timestamp
 */
function recordRequest() {
  requestTimestamps.push(Date.now());
}

/**
 * Wait for rate limit to allow next request
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  while (!canMakeRequest()) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = RATE_LIMIT_WINDOW_MS - (Date.now() - oldestTimestamp);

    if (waitTime > 0) {
      debug(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
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
 * Fetch geolocation for a domain from ip-api.com
 * @param {string} domain - Domain to lookup
 * @param {number} attempt - Current retry attempt (0-indexed)
 * @returns {Promise<Object|null>} - Geolocation data or null
 */
async function fetchGeolocation(domain, attempt = 0) {
  try {
    // Wait for rate limit
    await waitForRateLimit();

    // Record the request
    recordRequest();

    debug(
      `Fetching geolocation for ${domain} (attempt ${attempt + 1}/${MAX_RETRIES})`
    );

    // Make API request
    const response = await fetch(`${GEO_API_URL}${domain}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

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

      debug(`Geolocation found for ${domain}`, geoData);
      return geoData;
    } else {
      debug(`Geolocation lookup failed for ${domain}: ${data.message}`);

      // If rate limited (status 429), retry with backoff
      if (data.message && data.message.includes('rate limit')) {
        if (attempt < MAX_RETRIES - 1) {
          const backoffDelay = calculateBackoff(attempt);
          debug(`Rate limited, retrying in ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return await fetchGeolocation(domain, attempt + 1);
        }
      }

      return null;
    }
  } catch (error) {
    console.error(`GeoQueue: Error fetching geolocation for ${domain}:`, error);

    // Retry with exponential backoff
    if (attempt < MAX_RETRIES - 1) {
      const backoffDelay = calculateBackoff(attempt);
      debug(`Error occurred, retrying in ${backoffDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return await fetchGeolocation(domain, attempt + 1);
    }

    return null;
  }
}

/**
 * Get geolocation for a domain (cached or fetch)
 * @param {string} domain - Domain to lookup
 * @returns {Promise<Object|null>} - Geolocation data or null
 */
export async function getGeolocationForDomain(domain) {
  try {
    // Check cache first
    const cached = await getGeoCache(domain);

    if (cached) {
      debug(`Cache hit for ${domain}`);
      return {
        country: cached.country,
        region: cached.region,
        city: cached.city || 'Unknown',
        lat: cached.lat,
        lon: cached.lon,
        isp: cached.isp || null,
        org: cached.org || null,
        fromCache: true,
      };
    }

    debug(`Cache miss for ${domain}, fetching...`);

    // Fetch from API
    const geoData = await fetchGeolocation(domain);

    if (geoData) {
      // Store in cache
      await setGeoCache(domain, geoData);
      return { ...geoData, fromCache: false };
    }

    // Return "Unknown" fallback
    const fallback = {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      lat: null,
      lon: null,
      isp: null,
      org: null,
      fromCache: false,
    };

    // Cache the "Unknown" result to avoid repeated lookups
    await setGeoCache(domain, fallback);

    return fallback;
  } catch (error) {
    console.error(`GeoQueue: Error getting geolocation for ${domain}:`, error);
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
  debug(`Processing queue: ${pendingQueue.length} items`);

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
  debug('Queue processing complete');
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
        console.error('GeoQueue: Error processing queue:', error);
      });
    }
  });
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
export function getQueueStats() {
  const now = Date.now();
  const recentRequests = requestTimestamps.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  return {
    pendingCount: pendingQueue.length,
    requestsInLastMinute: recentRequests.length,
    rateLimitRemaining: RATE_LIMIT_PER_MINUTE - recentRequests.length,
    canMakeRequest: canMakeRequest(),
  };
}

/**
 * Clear rate limit history (for testing)
 */
export function clearRateLimitHistory() {
  requestTimestamps = [];
  debug('Rate limit history cleared');
}

/**
 * Clear pending queue (for testing)
 */
export function clearPendingQueue() {
  pendingQueue = [];
  debug('Pending queue cleared');
}
