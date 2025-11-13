/**
 * Unit tests for IndexedDB Database Layer
 * Tests CRUD operations, quota management, and helper functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {
  db,
  addFootprint,
  getFootprints,
  getUniqueDomains,
  getDomainCounts,
  getSetting,
  setSetting,
  getGeoCache,
  setGeoCache,
  clearAllData,
  clearOldFootprints,
  getStats,
  checkStorageQuota,
  initDatabase,
} from '../../src/dashboard/utils/db.js';

describe('Database Layer', () => {
  beforeEach(async () => {
    // Clear all stores before each test
    if (db.isOpen()) {
      await db.footprints.clear();
      await db.settings.clear();
      await db.geoCache.clear();
    } else {
      await db.open();
    }
  });

  afterEach(async () => {
    // Clean up is handled by beforeEach
  });

  describe('initDatabase', () => {
    it('should initialize database with default settings', async () => {
      await initDatabase();

      const initialized = await getSetting('initialized');
      const installDate = await getSetting('installDate');
      const version = await getSetting('version');

      expect(initialized).toBe(true);
      expect(installDate).toBeTypeOf('number');
      expect(version).toBe(1);
    });

    it('should not overwrite settings on re-initialization', async () => {
      await initDatabase();
      const firstInstallDate = await getSetting('installDate');

      // Wait a bit to ensure timestamp would be different
      await new Promise(resolve => setTimeout(resolve, 10));

      await initDatabase();
      const secondInstallDate = await getSetting('installDate');

      expect(secondInstallDate).toBe(firstInstallDate);
    });
  });

  describe('addFootprint', () => {
    it('should add a footprint record', async () => {
      const footprint = {
        domain: 'example.com',
        url: 'https://example.com/page',
        pixelType: 'script',
        ipGeo: { country: 'US', region: 'California' },
      };

      const id = await addFootprint(footprint);

      expect(id).toBeTypeOf('number');
      expect(id).toBeGreaterThan(0);
    });

    it('should add timestamp if not provided', async () => {
      const footprint = {
        domain: 'example.com',
        url: 'https://example.com/page',
        pixelType: 'script',
      };

      const id = await addFootprint(footprint);
      const stored = await db.footprints.get(id);

      expect(stored.timestamp).toBeTypeOf('number');
      expect(stored.timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('should use provided timestamp', async () => {
      const timestamp = Date.now() - 10000;
      const footprint = {
        domain: 'example.com',
        url: 'https://example.com/page',
        pixelType: 'script',
        timestamp,
      };

      const id = await addFootprint(footprint);
      const stored = await db.footprints.get(id);

      expect(stored.timestamp).toBe(timestamp);
    });

    it('should handle missing pixelType', async () => {
      const footprint = {
        domain: 'example.com',
        url: 'https://example.com/page',
      };

      const id = await addFootprint(footprint);
      const stored = await db.footprints.get(id);

      expect(stored.pixelType).toBe('unknown');
    });

    it('should handle missing ipGeo', async () => {
      const footprint = {
        domain: 'example.com',
        url: 'https://example.com/page',
        pixelType: 'script',
      };

      const id = await addFootprint(footprint);
      const stored = await db.footprints.get(id);

      expect(stored.ipGeo).toBeUndefined();
    });
  });

  describe('getFootprints', () => {
    beforeEach(async () => {
      // Add test data
      const now = Date.now();
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page1',
        pixelType: 'script',
        timestamp: now - 10000,
      });
      await addFootprint({
        domain: 'test.com',
        url: 'https://test.com/page2',
        pixelType: 'img',
        timestamp: now - 5000,
      });
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page3',
        pixelType: 'iframe',
        timestamp: now,
      });
    });

    it('should get all footprints without filter', async () => {
      const footprints = await getFootprints();

      expect(footprints).toHaveLength(3);
    });

    it('should filter by startDate', async () => {
      const now = Date.now();
      const footprints = await getFootprints({
        startDate: now - 6000,
      });

      expect(footprints.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by endDate', async () => {
      const now = Date.now();
      const footprints = await getFootprints({
        endDate: now - 6000,
      });

      expect(footprints.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by date range', async () => {
      const now = Date.now();
      const footprints = await getFootprints({
        startDate: now - 8000,
        endDate: now - 3000,
      });

      expect(footprints.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by domain', async () => {
      const footprints = await getFootprints({
        domain: 'example.com',
      });

      expect(footprints).toHaveLength(2);
      expect(footprints[0].domain).toBe('example.com');
      expect(footprints[1].domain).toBe('example.com');
    });

    it('should apply limit', async () => {
      const footprints = await getFootprints({
        limit: 2,
      });

      expect(footprints).toHaveLength(2);
    });

    it('should combine domain and limit filters', async () => {
      const footprints = await getFootprints({
        domain: 'example.com',
        limit: 1,
      });

      expect(footprints).toHaveLength(1);
      expect(footprints[0].domain).toBe('example.com');
    });
  });

  describe('getUniqueDomains', () => {
    it('should return empty array when no footprints', async () => {
      const domains = await getUniqueDomains();

      expect(domains).toEqual([]);
    });

    it('should return unique domains', async () => {
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page1',
        pixelType: 'script',
      });
      await addFootprint({
        domain: 'test.com',
        url: 'https://test.com/page2',
        pixelType: 'img',
      });
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page3',
        pixelType: 'script',
      });

      const domains = await getUniqueDomains();

      expect(domains).toHaveLength(2);
      expect(domains).toContain('example.com');
      expect(domains).toContain('test.com');
    });
  });

  describe('getDomainCounts', () => {
    it('should return empty object when no footprints', async () => {
      const counts = await getDomainCounts();

      expect(counts).toEqual({});
    });

    it('should count footprints by domain', async () => {
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page1',
        pixelType: 'script',
      });
      await addFootprint({
        domain: 'test.com',
        url: 'https://test.com/page2',
        pixelType: 'img',
      });
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page3',
        pixelType: 'script',
      });

      const counts = await getDomainCounts();

      expect(counts['example.com']).toBe(2);
      expect(counts['test.com']).toBe(1);
    });
  });

  describe('Settings', () => {
    it('should set and get a setting', async () => {
      await setSetting('testKey', 'testValue');
      const value = await getSetting('testKey');

      expect(value).toBe('testValue');
    });

    it('should return null for non-existent setting', async () => {
      const value = await getSetting('nonExistent');

      expect(value).toBeNull();
    });

    it('should overwrite existing setting', async () => {
      await setSetting('testKey', 'value1');
      await setSetting('testKey', 'value2');
      const value = await getSetting('testKey');

      expect(value).toBe('value2');
    });

    it('should handle complex objects', async () => {
      const complexValue = {
        nested: { data: 'value' },
        array: [1, 2, 3],
      };

      await setSetting('complex', complexValue);
      const value = await getSetting('complex');

      expect(value).toEqual(complexValue);
    });
  });

  describe('GeoCache', () => {
    it('should set and get geo cache', async () => {
      const geoData = {
        country: 'United States',
        region: 'California',
        lat: 37.7749,
        lon: -122.4194,
      };

      await setGeoCache('example.com', geoData);
      const cached = await getGeoCache('example.com');

      expect(cached.domain).toBe('example.com');
      expect(cached.country).toBe('United States');
      expect(cached.region).toBe('California');
      expect(cached.lat).toBe(37.7749);
      expect(cached.lon).toBe(-122.4194);
      expect(cached.cachedAt).toBeTypeOf('number');
    });

    it('should return null for non-existent domain', async () => {
      const cached = await getGeoCache('nonexistent.com');

      expect(cached).toBeUndefined();
    });

    it('should handle missing optional fields', async () => {
      const geoData = {
        country: 'United States',
        region: 'California',
      };

      await setGeoCache('example.com', geoData);
      const cached = await getGeoCache('example.com');

      expect(cached.lat).toBeNull();
      expect(cached.lon).toBeNull();
    });

    it('should update existing cache', async () => {
      await setGeoCache('example.com', {
        country: 'US',
        region: 'CA',
      });

      await setGeoCache('example.com', {
        country: 'United States',
        region: 'California',
      });

      const cached = await getGeoCache('example.com');

      expect(cached.country).toBe('United States');
      expect(cached.region).toBe('California');
    });
  });

  describe('clearAllData', () => {
    it('should clear footprints and geo cache', async () => {
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page',
        pixelType: 'script',
      });
      await setGeoCache('example.com', {
        country: 'US',
        region: 'CA',
      });
      await setSetting('testKey', 'testValue');

      await clearAllData();

      const footprints = await getFootprints();
      const geoCache = await db.geoCache.toArray();
      const setting = await getSetting('testKey');

      expect(footprints).toHaveLength(0);
      expect(geoCache).toHaveLength(0);
      expect(setting).toBe('testValue'); // Settings should be preserved
    });
  });

  describe('clearOldFootprints', () => {
    it('should delete footprints older than timestamp', async () => {
      const now = Date.now();

      await addFootprint({
        domain: 'old.com',
        url: 'https://old.com/page',
        pixelType: 'script',
        timestamp: now - 20000,
      });
      await addFootprint({
        domain: 'recent.com',
        url: 'https://recent.com/page',
        pixelType: 'script',
        timestamp: now - 5000,
      });

      const deleted = await clearOldFootprints(now - 10000);

      expect(deleted).toBe(1);

      const remaining = await getFootprints();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].domain).toBe('recent.com');
    });

    it('should return 0 when no old footprints', async () => {
      const now = Date.now();

      await addFootprint({
        domain: 'recent.com',
        url: 'https://recent.com/page',
        pixelType: 'script',
        timestamp: now,
      });

      const deleted = await clearOldFootprints(now - 10000);

      expect(deleted).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return stats with no data', async () => {
      const stats = await getStats();

      expect(stats.totalFootprints).toBe(0);
      expect(stats.uniqueDomains).toBe(0);
      expect(stats.geoCacheSize).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });

    it('should return correct stats', async () => {
      const now = Date.now();

      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page1',
        pixelType: 'script',
        timestamp: now - 10000,
      });
      await addFootprint({
        domain: 'test.com',
        url: 'https://test.com/page2',
        pixelType: 'img',
        timestamp: now - 5000,
      });
      await addFootprint({
        domain: 'example.com',
        url: 'https://example.com/page3',
        pixelType: 'script',
        timestamp: now,
      });

      await setGeoCache('example.com', {
        country: 'US',
        region: 'CA',
      });

      const stats = await getStats();

      expect(stats.totalFootprints).toBe(3);
      expect(stats.uniqueDomains).toBe(2);
      expect(stats.geoCacheSize).toBe(1);
      expect(stats.oldestTimestamp).toBe(now - 10000);
      expect(stats.newestTimestamp).toBe(now);
    });
  });

  describe('checkStorageQuota', () => {
    it('should return quota status', async () => {
      const status = await checkStorageQuota();

      expect(status).toHaveProperty('usage');
      expect(status).toHaveProperty('quota');
      expect(status).toHaveProperty('percentage');
      expect(status).toHaveProperty('warningThreshold');
      expect(status).toHaveProperty('exceededCap');

      // usageMB and quotaMB only present when Storage API is available
      if (navigator.storage && navigator.storage.estimate) {
        expect(status).toHaveProperty('usageMB');
        expect(status).toHaveProperty('quotaMB');
      }
    });

    it('should handle missing Storage API', async () => {
      // Mock missing Storage API
      const originalStorage = navigator.storage;
      delete navigator.storage;

      const status = await checkStorageQuota();

      expect(status.usage).toBe(0);
      expect(status.warningThreshold).toBe(false);
      expect(status.exceededCap).toBe(false);

      // Restore
      navigator.storage = originalStorage;
    });
  });

  describe('Performance', () => {
    it('should handle 1000+ records efficiently', async () => {
      const startTime = Date.now();

      // Add 1000 records
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          addFootprint({
            domain: `domain${i % 50}.com`,
            url: `https://domain${i % 50}.com/page${i}`,
            pixelType: i % 3 === 0 ? 'script' : i % 3 === 1 ? 'img' : 'iframe',
            timestamp: Date.now() - i * 1000,
          })
        );
      }

      await Promise.all(promises);

      const insertTime = Date.now() - startTime;
      console.log(`Inserted 1000 records in ${insertTime}ms`);

      // Query all records
      const queryStart = Date.now();
      const footprints = await getFootprints();
      const queryTime = Date.now() - queryStart;

      console.log(`Queried ${footprints.length} records in ${queryTime}ms`);

      expect(footprints).toHaveLength(1000);
      expect(insertTime).toBeLessThan(5000); // Should insert in <5s
      expect(queryTime).toBeLessThan(1000); // Should query in <1s
    });
  });
});
