/**
 * Unit tests for the shared Dexie schema (`src/db/schema.js`).
 *
 * Locks in the acceptance criterion for #31: the schema must be the single
 * source of truth, and both consumers (`src/dashboard/utils/db.js` and
 * `src/lib/db-sw.js`) must import from it instead of declaring their own
 * `.stores(...)` blocks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { applySchema, DB_NAME } from '../../src/db/schema.js';
import { db as dashboardDb } from '../../src/dashboard/utils/db.js';
import swDb from '../../src/lib/db-sw.js';

describe('Shared Dexie schema', () => {
  beforeEach(async () => {
    if (dashboardDb.isOpen()) {
      await dashboardDb.footprints.clear();
      await dashboardDb.settings.clear();
      await dashboardDb.geoCache.clear();
    } else {
      await dashboardDb.open();
    }
  });

  it('exposes a stable database name', () => {
    expect(DB_NAME).toBe('EchoFootPrint');
  });

  it('attaches the same three tables to a fresh Dexie instance', async () => {
    const isolated = new Dexie(`test-isolated-${Date.now()}-${Math.random()}`);
    applySchema(isolated);
    await isolated.open();

    try {
      const tables = isolated.tables.map(t => t.name).sort();
      expect(tables).toEqual(['footprints', 'geoCache', 'settings']);
    } finally {
      await isolated.close();
      await isolated.delete();
    }
  });

  it('rejects non-Dexie instances', () => {
    expect(() => applySchema({})).toThrow(TypeError);
    expect(() => applySchema(null)).toThrow(TypeError);
  });

  it('is imported by both dashboard and service-worker DB modules', async () => {
    // Both consumers must point at the same database name. The observable
    // side effect of importing the shared schema is that they share a
    // Dexie name and surface the same tables.
    expect(dashboardDb.name).toBe(DB_NAME);
    expect(swDb.name).toBe(DB_NAME);

    const dashTables = dashboardDb.tables.map(t => t.name).sort();
    const swTables = swDb.tables.map(t => t.name).sort();
    expect(dashTables).toEqual(['footprints', 'geoCache', 'settings']);
    expect(swTables).toEqual(dashTables);
  });
});
