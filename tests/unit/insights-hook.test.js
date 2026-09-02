/**
 * Characterization tests for the dashboard insight hooks extracted in
 * issue #33 / F-CLEAN-002.
 *
 * The hooks are deterministic functions of (footprints, stats,
 * mapLocationStats). We exercise them by calling the underlying
 * reducer logic via a small test render of `useOverviewInsights` and
 * `useBipartiteInsights` so React's `useMemo` cache warms up exactly
 * the same way it does in production. `useMapInsights` is covered
 * indirectly through the same test render since it shares the same
 * reducer pattern.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  useOverviewInsights,
  useBipartiteInsights,
  useMapInsights,
  selectDisplayedInsights,
} from '../../src/dashboard/hooks/useDashboardInsights.js';

function renderHook(hookFn) {
  let captured;
  function Probe() {
    captured = hookFn();
    return null;
  }
  renderToString(React.createElement(Probe));
  return captured;
}

function footprint(overrides) {
  return {
    domain: 'example.com',
    platform: 'facebook',
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe('useOverviewInsights', () => {
  it('returns the empty shape when no footprints are present', () => {
    const out = renderHook(() => useOverviewInsights(null, []));
    expect(out.totalDetections).toBe(0);
    expect(out.messages).toEqual([]);
  });

  it('surfaces the top platform name via the catalog', () => {
    const stats = {
      totalFootprints: 4,
      uniqueDomains: 2,
      platformStats: { facebook: { detections: 3 }, google: { detections: 1 } },
    };
    const footprints = [
      footprint({ platform: 'facebook' }),
      footprint({ platform: 'facebook' }),
      footprint({ platform: 'facebook' }),
      footprint({ platform: 'google' }),
    ];
    const out = renderHook(() => useOverviewInsights(stats, footprints));
    expect(out.topPlatformName).toBe('Facebook/Meta');
    expect(out.topPlatformShare).toBe(75);
    expect(out.messages.length).toBeGreaterThan(0);
  });
});

describe('useBipartiteInsights', () => {
  it('returns the prompt-to-browse message when empty', () => {
    const out = renderHook(() => useBipartiteInsights([]));
    expect(out.messages).toHaveLength(1);
    expect(out.messages[0]).toMatch(/browse|bipartite/i);
  });

  it('reports multi-platform cross-linking when domains span platforms', () => {
    const footprints = [
      footprint({ domain: 'a.com', platform: 'facebook' }),
      footprint({ domain: 'a.com', platform: 'google' }),
      footprint({ domain: 'b.com', platform: 'facebook' }),
    ];
    const out = renderHook(() => useBipartiteInsights(footprints));
    expect(out.messages.length).toBe(3);
    expect(out.messages.join(' ')).toMatch(/platforms across 2 domains/);
    expect(out.messages.join(' ')).toMatch(/link to multiple platforms/);
  });
});

describe('useMapInsights', () => {
  it('reports when footprints exist but no geo events have been resolved', () => {
    const out = renderHook(() =>
      useMapInsights(
        {
          locations: 0,
          totalEvents: 0,
          eventsWithGeo: 0,
          topCount: 0,
          unknownCount: 0,
        },
        [footprint()]
      )
    );
    expect(out.messages[0]).toMatch(/geolocation data not available/i);
  });

  it('reports coverage and top share once geolocation is resolved', () => {
    const out = renderHook(() =>
      useMapInsights(
        {
          locations: 3,
          totalEvents: 10,
          eventsWithGeo: 8,
          topLocation: 'US',
          topCount: 5,
          unknownCount: 2,
        },
        [footprint()]
      )
    );
    expect(out.messages[0]).toMatch(/3 locations detected/);
    expect(out.messages[1]).toMatch(/US holds/);
  });
});

describe('selectDisplayedInsights', () => {
  const insights = { messages: ['graph msg'] };
  const bipartite = { messages: ['bipartite msg'] };
  const map = { messages: ['map msg'] };

  it('returns the bipartite view messages', () => {
    expect(selectDisplayedInsights('bipartite', insights, bipartite, map)).toEqual([
      'bipartite msg',
    ]);
  });

  it('returns the map view messages', () => {
    expect(selectDisplayedInsights('map', insights, bipartite, map)).toEqual([
      'map msg',
    ]);
  });

  it('falls back to the graph view for any other view id', () => {
    expect(selectDisplayedInsights('graph', insights, bipartite, map)).toEqual([
      'graph msg',
    ]);
    expect(selectDisplayedInsights('table', insights, bipartite, map)).toEqual([
      'graph msg',
    ]);
  });
});
