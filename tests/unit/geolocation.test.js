/**
 * Unit tests for geolocation utilities
 * Tests caching, rate limiting, and request deduplication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGeolocationForDomain,
  queueGeolocationLookup,
  getQueueStats,
  getCacheStats,
  clearAllCaches,
  prewarmCache,
  fetchBulkGeolocation,
  setGeoOptIn,
} from '../../src/dashboard/utils/geolocation.js';

// Mock db module
vi.mock('../../src/dashboard/utils/db.js', () => ({
  getGeoCache: vi.fn(),
  setGeoCache: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

describe('Geolocation Utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Live lookups are opt-in (default OFF); tests that exercise the fetch
    // path enable it explicitly here.
    await setGeoOptIn(true);
  });

  afterEach(async () => {
    // Clean up after each test
    await clearAllCaches();
  });

  describe('getGeolocationForDomain', () => {
    it('should return cached geolocation if available', async () => {
      const { getGeoCache } = await import('../../src/dashboard/utils/db.js');
      const cachedData = {
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
      };

      getGeoCache.mockResolvedValue(cachedData);

      const result = await getGeolocationForDomain('google.com');

      expect(result).toMatchObject({
        country: cachedData.country,
        region: cachedData.region,
        city: cachedData.city,
        lat: cachedData.lat,
        lon: cachedData.lon,
        fromCache: true,
      });
      expect(result).toHaveProperty('cacheLayer');
      expect(getGeoCache).toHaveBeenCalledWith('google.com');
    });

    it('should fetch from API if not cached', async () => {
      const { getGeoCache, setGeoCache } = await import(
        '../../src/dashboard/utils/db.js'
      );
      const apiResponse = {
        status: 'success',
        country: 'United States',
        regionName: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        isp: 'Google LLC',
        org: 'Google',
      };

      getGeoCache.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      });

      const result = await getGeolocationForDomain('google.com');

      expect(result).toEqual({
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        isp: 'Google LLC',
        org: 'Google',
        fromCache: false,
      });
      expect(setGeoCache).toHaveBeenCalled();
    });

    it('should return fallback for failed API calls', async () => {
      const { getGeoCache, setGeoCache } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'fail', message: 'invalid query' }),
      });

      const result = await getGeolocationForDomain('invalid-domain.test');

      expect(result).toMatchObject({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        lat: null,
        lon: null,
        isp: null,
        org: null,
        fromCache: false,
      });

      // Check that setGeoCache was called with expected fields (ignoring cachedAt)
      expect(setGeoCache).toHaveBeenCalled();
      const cacheCall = setGeoCache.mock.calls[0];
      expect(cacheCall[0]).toBe('invalid-domain.test');
      expect(cacheCall[1]).toMatchObject({
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        lat: null,
        lon: null,
        isp: null,
        org: null,
      });
      expect(cacheCall[1]).toHaveProperty('cachedAt');
    });
  });

  describe('queueGeolocationLookup', () => {
    it('should queue lookup and return geolocation', async () => {
      const { getGeoCache } = await import('../../src/dashboard/utils/db.js');
      const cachedData = {
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
      };

      getGeoCache.mockResolvedValue(cachedData);

      const result = await queueGeolocationLookup('google.com');

      expect(result).toBeDefined();
      expect(result.country).toBe('United States');
    });
  });

  describe('getQueueStats', () => {
    it('should return comprehensive queue statistics', () => {
      const stats = getQueueStats();

      expect(stats).toHaveProperty('pendingCount');
      expect(stats).toHaveProperty('requestsInLastMinute');
      expect(stats).toHaveProperty('rateLimitRemaining');
      expect(stats).toHaveProperty('canMakeRequest');
      expect(stats).toHaveProperty('effectiveRateLimit');
      expect(stats).toHaveProperty('maxRateLimit');
      expect(stats).toHaveProperty('availableSlots');
      expect(stats).toHaveProperty('timeUntilNextSlot');
      expect(stats).toHaveProperty('activeRequestCount');
      expect(stats).toHaveProperty('memoryCacheSize');
      expect(stats).toHaveProperty('isInitialized');

      // Check that effective rate limit is less than max (safety margin)
      expect(stats.effectiveRateLimit).toBeLessThan(stats.maxRateLimit);
    });
  });

  describe('Multi-layer Caching', () => {
    it('should cache results in memory after first fetch', async () => {
      const { getGeoCache, setGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue(null);
      getSetting.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'Mountain View',
          lat: 37.386,
          lon: -122.0838,
        }),
      });

      // First call - should fetch from API
      const result1 = await getGeolocationForDomain('google.com');
      expect(result1.fromCache).toBe(false);
      expect(setGeoCache).toHaveBeenCalled();

      // Second call - should hit memory cache
      getGeoCache.mockClear();
      global.fetch.mockClear();

      const result2 = await getGeolocationForDomain('google.com');
      expect(result2.fromCache).toBe(true);
      expect(result2.cacheLayer).toBe('memory');
      expect(global.fetch).not.toHaveBeenCalled(); // No API call
    });

    it('should fall back to IndexedDB cache if not in memory', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      const cachedData = {
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        cachedAt: Date.now(),
      };

      getGeoCache.mockResolvedValue(cachedData);
      getSetting.mockResolvedValue(null);

      const result = await getGeolocationForDomain('facebook.com');

      expect(result.fromCache).toBe(true);
      expect(result.cacheLayer).toBe('indexeddb');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should expire old cache entries', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      const oldCachedData = {
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
      };

      getGeoCache.mockResolvedValue(oldCachedData);
      getSetting.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'Mountain View',
          lat: 37.386,
          lon: -122.0838,
        }),
      });

      const result = await getGeolocationForDomain('expired.com');

      // Should refetch because cache is expired (> 7 days)
      expect(global.fetch).toHaveBeenCalled();
      expect(result.fromCache).toBe(false);
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate simultaneous requests for same domain', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue(null);
      getSetting.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'Mountain View',
          lat: 37.386,
          lon: -122.0838,
        }),
      });

      // Make 3 simultaneous requests for the same domain
      const promises = [
        getGeolocationForDomain('test.com'),
        getGeolocationForDomain('test.com'),
        getGeolocationForDomain('test.com'),
      ];

      const results = await Promise.all(promises);

      // Should only make 1 API call despite 3 requests
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // All results should be identical
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const stats = getQueueStats();

      expect(stats.effectiveRateLimit).toBe(40); // 45 - 5 safety margin
      expect(stats.maxRateLimit).toBe(45);
    });

    it('should track available slots correctly', () => {
      const stats = getQueueStats();

      expect(stats.availableSlots).toBeGreaterThanOrEqual(0);
      expect(stats.availableSlots).toBeLessThanOrEqual(
        stats.effectiveRateLimit
      );
    });
  });

  describe('Cache Prewarming', () => {
    it('should prewarm cache for uncached domains', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue(null);
      getSetting.mockResolvedValue(null);

      const domains = ['example1.com', 'example2.com', 'example3.com'];
      const stats = await prewarmCache(domains);

      expect(stats.total).toBe(3);
      expect(stats.queued).toBeGreaterThan(0);
    });

    it('should skip already cached domains', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue({
        country: 'United States',
        region: 'California',
        lat: 37.386,
        lon: -122.0838,
        cachedAt: Date.now(),
      });
      getSetting.mockResolvedValue(null);

      const domains = ['cached1.com', 'cached2.com'];
      const stats = await prewarmCache(domains);

      expect(stats.total).toBe(2);
      expect(stats.alreadyCached).toBe(2);
      expect(stats.queued).toBe(0);
    });
  });

  describe('Bulk Geolocation', () => {
    it('should process cached domains immediately', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue({
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        cachedAt: Date.now(),
      });
      getSetting.mockResolvedValue(null);

      const progressCalls = [];
      const onProgress = vi.fn(progress => progressCalls.push(progress));

      const domains = ['cached1.com', 'cached2.com', 'cached3.com'];
      const result = await fetchBulkGeolocation(domains, onProgress);

      expect(Object.keys(result).length).toBe(3);
      expect(onProgress).toHaveBeenCalled();

      // Check that cached items were marked as cached
      const cachedItems = progressCalls.filter(p => p.cached === true);
      expect(cachedItems.length).toBe(3);
    });
  });

  describe('Geo Opt-in Gate', () => {
    it('does not fetch for uncached domains on the default path', async () => {
      const { getGeoCache } = await import('../../src/dashboard/utils/db.js');
      getGeoCache.mockResolvedValue(null);

      // Default is OFF; set explicitly to guard against ordering drift.
      await setGeoOptIn(false);

      const result = await getGeolocationForDomain('uncached-domain.test');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('fetches over https after explicit opt-in', async () => {
      const { getGeoCache } = await import('../../src/dashboard/utils/db.js');
      getGeoCache.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'Mountain View',
          lat: 37.386,
          lon: -122.0838,
        }),
      });

      await setGeoOptIn(true);
      await getGeolocationForDomain('optin-domain.test');

      expect(global.fetch).toHaveBeenCalled();
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl.startsWith('https://ip-api.com/json/')).toBe(true);
    });

    it('returns cached data without live lookups while opted out', async () => {
      const { getGeoCache } = await import('../../src/dashboard/utils/db.js');
      getGeoCache.mockResolvedValue({
        country: 'France',
        region: 'IDF',
        city: 'Paris',
        lat: 48.8566,
        lon: 2.3522,
      });

      await setGeoOptIn(false);
      const result = await getGeolocationForDomain('cached-domain.test');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toMatchObject({ country: 'France', fromCache: true });
    });
  });

  describe('Cache Statistics', () => {
    it('should provide cache statistics', async () => {
      const { getGeoCache, getSetting } = await import(
        '../../src/dashboard/utils/db.js'
      );

      getGeoCache.mockResolvedValue(null);
      getSetting.mockResolvedValue(null);
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          country: 'United States',
          regionName: 'California',
          city: 'Mountain View',
          lat: 37.386,
          lon: -122.0838,
        }),
      });

      // Populate cache
      await getGeolocationForDomain('test1.com');
      await getGeolocationForDomain('test2.com');

      const stats = getCacheStats();

      expect(stats).toHaveProperty('memoryCacheSize');
      expect(stats).toHaveProperty('memoryCacheKeys');
      expect(stats.memoryCacheSize).toBeGreaterThan(0);
      expect(Array.isArray(stats.memoryCacheKeys)).toBe(true);
    });
  });
});
