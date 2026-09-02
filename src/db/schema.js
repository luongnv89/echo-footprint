/**
 * Shared Dexie schema for EchoFootPrint.
 *
 * This is the single source of truth for the IndexedDB schema used by both
 * the dashboard (`src/dashboard/utils/db.js`) and the service worker
 * (`src/lib/db-sw.js`). Both files construct their own Dexie instance but
 * delegate schema definition to {@link applySchema}, so any future schema
 * change lives here and is picked up by both consumers automatically.
 *
 * Version history:
 * - v1: Original schema. `footprints` index by `timestamp, domain, url,
 *   pixelType, ipGeo`; `settings` is a key-value store; `geoCache` is keyed
 *   by `domain` with `country, region` indexes.
 * - v2: Replaces `ipGeo` with a `platform` field on `footprints` so multiple
 *   tracking platforms (not only Facebook) can be stored side by side. Adds
 *   `platform` to the index, removes `ipGeo` from the index. Existing rows
 *   are backfilled with `platform = 'facebook'` and the now-unused `ipGeo`
 *   property is deleted.
 *
 * Note: live geolocation was disabled per a user request prior to v2, so
 * `ipGeo` is no longer written by the production code path. The v1→v2
 * upgrade cleans it up on existing records.
 */

import Dexie from 'dexie';

export const DB_NAME = 'EchoFootPrint';

/**
 * Attach every published schema version (and its upgrade hooks) to a Dexie
 * instance. The caller decides which Dexie class to instantiate; this helper
 * only owns the version chain.
 *
 * @param {Dexie} db - Dexie instance to attach the schema to.
 * @returns {Dexie} The same instance, for fluent use.
 */
export function applySchema(db) {
  if (!(db instanceof Dexie)) {
    throw new TypeError('applySchema(db): db must be a Dexie instance');
  }

  // Version 1: original schema (kept for new installs and historical
  // upgrade metadata; existing browsers on v1 still upgrade through it).
  db.version(1).stores({
    footprints: '++id, timestamp, domain, url, pixelType, ipGeo',
    settings: 'key',
    geoCache: 'domain, country, region',
  });

  // Version 2: add `platform`, drop `ipGeo`. Existing rows are backfilled
  // with platform='facebook' and the obsolete `ipGeo` field is removed.
  db.version(2)
    .stores({
      footprints: '++id, timestamp, domain, url, pixelType, platform',
      settings: 'key',
      geoCache: 'domain, country, region',
    })
    .upgrade(tx => {
      return tx
        .table('footprints')
        .toCollection()
        .modify(footprint => {
          if (!footprint.platform) {
            footprint.platform = 'facebook';
          }
          delete footprint.ipGeo;
        });
    });

  return db;
}
