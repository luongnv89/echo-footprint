/**
 * Dashboard characterization tests.
 *
 * F-TEST-002: regression net for the dashboard shell. Covers the four
 * components/contracts most likely to regress during a refactor of the
 * bipartite graph or other dashboard work:
 *
 *   - EmptyState       (no-data landing UI)
 *   - SettingsSheet    (DELETE-confirm flow)
 *   - escapeCSV        (shared CSV export helper)
 *   - App              (tab rendering and view switching)
 *
 * The tests are intentionally light on assertions — they encode
 * behaviour the dashboard depends on (the shape of the empty state, the
 * "type DELETE" gate, the CSV formula-injection guard, and the four-tab
 * shell) without locking the implementation to specific copy or styles.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import 'fake-indexeddb/auto';
import React from 'react';

// Components under test
import EmptyState from '../../src/dashboard/components/EmptyState.jsx';
import SettingsSheet from '../../src/dashboard/components/SettingsSheet.jsx';
import { escapeCSV, toCSV } from '../../src/dashboard/utils/csv.js';
import {
  buildBipartiteGraph,
  applyBipartiteFilters,
  computeBipartiteStats,
} from '../../src/dashboard/utils/bipartiteData.js';
import {
  drawBipartiteGraph,
  truncateLabel,
} from '../../src/dashboard/utils/bipartiteLayout.js';

// Mock dexie-react-hooks so App.jsx can use useLiveQuery in a jsdom env.
// We bypass the async-subscription pattern by stashing the *last*
// resolved value of each query function. On first render we return
// `undefined` (loading state); once the inner promise resolves, the
// next render sees the cached value. The cache key is the fn string
// representation so subsequent re-renders find the same entry.
const liveQueryCache = new Map();

// Tell React that we are inside an act()-aware test environment so
// the `act` warning does not pollute the test output.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: fn => {
    const value = fn();
    if (value && typeof value.then === 'function') {
      const key = fn.toString();
      if (liveQueryCache.has(key)) {
        return liveQueryCache.get(key);
      }
      value.then(v => {
        liveQueryCache.set(key, v);
        if (typeof globalThis.__notifyAppRerender === 'function') {
          globalThis.__notifyAppRerender();
        }
      });
      return undefined;
    }
    return value;
  },
}));

// Mock the dashboard db so App.jsx never opens real IndexedDB.
// IMPORTANT: the App does `await getFootprints(...)` inside useLiveQuery
// and our mock returns a synchronous value. Awaiting a non-Promise just
// resolves to the value itself, so the App sees an array immediately.
vi.mock('../../src/dashboard/utils/db.js', async () => {
  const actual = await vi.importActual('../../src/dashboard/utils/db.js');
  return {
    ...actual,
    db: { isOpen: () => true, open: () => Promise.resolve() },
    getFootprints: vi.fn(() => []),
    getStats: vi.fn(() => ({
      totalFootprints: 0,
      uniqueDomains: 0,
      geoCacheSize: 0,
      oldestTimestamp: null,
      newestTimestamp: null,
      platformStats: {},
    })),
    calculatePlatformStats: vi.fn(() => ({})),
    clearAllData: vi.fn(async () => {}),
    checkStorageQuota: vi.fn(() => ({
      usage: 0,
      quota: 0,
      percentage: 0,
      usageMB: 0,
      quotaMB: 0,
      percentUsed: 0,
      warningThreshold: false,
      exceededCap: false,
    })),
  };
});

// Minimal render helper (no @testing-library/react available in this repo).
function renderInto(node) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({
    json: async () => ({
      version: '1.0.0',
      versionWithCommit: '1.0.0',
      gitCommitHash: 'abc1234',
    }),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

// ----- EmptyState -----------------------------------------------------------

describe('EmptyState', () => {
  it('renders the no-tracking onboarding message', () => {
    renderInto(<EmptyState />);
    expect(document.body.textContent).toMatch(/No Tracking Detected Yet/i);
    expect(document.body.textContent).toMatch(/100% private/i);
  });

  it('explains the three-step flow', () => {
    renderInto(<EmptyState />);
    const list = document.querySelector('.empty-state-steps ol');
    expect(list).not.toBeNull();
    expect(list.querySelectorAll('li')).toHaveLength(3);
  });
});

// ----- SettingsSheet (DELETE confirm) --------------------------------------

describe('SettingsSheet DELETE confirm flow', () => {
  function renderSheet(extraProps = {}) {
    return renderInto(
      <SettingsSheet
        isOpen={true}
        onClose={vi.fn()}
        stats={{ totalFootprints: 12, uniqueDomains: 3 }}
        {...extraProps}
      />
    );
  }

  it('does not render when isOpen is false', () => {
    renderInto(
      <SettingsSheet
        isOpen={false}
        onClose={vi.fn()}
        stats={{ totalFootprints: 0, uniqueDomains: 0 }}
      />
    );
    expect(document.body.textContent).not.toMatch(/^Settings/m);
  });

  it('opens the confirm step and disables the action without the literal DELETE confirmation', () => {
    renderSheet();
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Clear All Data'
    );
    expect(clearBtn).toBeDefined();
    act(() => {
      clearBtn.click();
    });
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Confirm Delete'
    );
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn.disabled).toBe(true);
  });

  it('keeps the confirm button disabled while the input is empty or non-matching', async () => {
    const { clearAllData } = await import('../../src/dashboard/utils/db.js');
    renderSheet();
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Clear All Data'
    );
    act(() => clearBtn.click());
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Confirm Delete'
    );
    expect(confirmBtn.disabled).toBe(true);

    const input = document.querySelector('input.confirm-input');
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    // Wrong-case value still leaves the button disabled.
    act(() => {
      setter.call(input, 'delete');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(confirmBtn.disabled).toBe(true);
    // And clicking the (disabled) button must not invoke clearAllData.
    act(() => confirmBtn.click());
    expect(clearAllData).not.toHaveBeenCalled();
  });

  it('enables the confirm button and calls clearAllData once DELETE is typed', async () => {
    const { clearAllData } = await import('../../src/dashboard/utils/db.js');
    renderSheet();
    const clearBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Clear All Data'
    );
    act(() => clearBtn.click());
    const input = document.querySelector('input.confirm-input');
    act(() => {
      // jsdom: native input setter
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      setter.call(input, 'DELETE');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent.trim() === 'Confirm Delete'
    );
    expect(confirmBtn.disabled).toBe(false);
    act(() => confirmBtn.click());
    expect(clearAllData).toHaveBeenCalledTimes(1);
  });
});

// ----- escapeCSV (CSV injection guard) --------------------------------------

describe('escapeCSV (shared CSV helper)', () => {
  it('wraps values in double quotes', () => {
    expect(escapeCSV('hello')).toBe('"hello"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(escapeCSV('a"b')).toBe('"a""b"');
  });

  it('rewrites formula triggers to a single-quote prefix', () => {
    expect(escapeCSV('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(escapeCSV('+1')).toBe('"\'+1"');
    expect(escapeCSV('-2')).toBe('"\'-2"');
    expect(escapeCSV('@evil')).toBe('"\'@evil"');
  });

  it('leaves normal URLs untouched', () => {
    expect(escapeCSV('https://example.com')).toBe('"https://example.com"');
  });

  it('toCSV joins rows with a header and a trailing newline', () => {
    const text = toCSV(['a', 'b'], [[1, 2], [3, 4]]);
    expect(text).toBe('"a","b"\n"1","2"\n"3","4"\n');
  });
});

// ----- BipartiteGraph data layer (split out under #30) ----------------------

describe('BipartiteGraph data layer (extracted modules)', () => {
  const sampleFootprints = [
    { domain: 'a.com', platform: 'facebook', pixelType: 'script', timestamp: 1000 },
    { domain: 'a.com', platform: 'google', pixelType: 'script', timestamp: 1500 },
    { domain: 'b.com', platform: 'facebook', pixelType: 'img', timestamp: 2000 },
    { domain: 'c.com', platform: 'tiktok', pixelType: 'script', timestamp: 2500 },
    { domain: 'c.com', platform: 'facebook', pixelType: 'script', timestamp: 3000 },
    { domain: 'c.com', platform: 'google', pixelType: 'iframe', timestamp: 3500 },
  ];

  it('buildBipartiteGraph produces one node per unique domain/platform', () => {
    const { domains, platforms, edges } = buildBipartiteGraph(sampleFootprints);
    expect(domains.map(d => d.id).sort()).toEqual(['a.com', 'b.com', 'c.com']);
    expect(platforms.map(p => p.id).sort()).toEqual(['facebook', 'google', 'tiktok']);
    expect(edges).toHaveLength(6);
  });

  it('flags multi-platform domains (>= 2 platforms) and tracks top platforms', () => {
    const { domains } = buildBipartiteGraph(sampleFootprints);
    expect(domains.find(d => d.id === 'a.com').isMultiPlatform).toBe(true);
    expect(domains.find(d => d.id === 'b.com').isMultiPlatform).toBe(false);
    // c.com is connected to 3 platforms, well above the 2-platform threshold
    const c = domains.find(d => d.id === 'c.com');
    expect(c.isMultiPlatform).toBe(true);
    expect(c.platformCount).toBe(3);
  });

  it('applyBipartiteFilters narrows the graph by search term', () => {
    const graph = buildBipartiteGraph(sampleFootprints);
    const filtered = applyBipartiteFilters(graph, { searchTerm: 'b.com' });
    expect(filtered.domains.map(d => d.id)).toEqual(['b.com']);
    expect(filtered.edges).toHaveLength(1);
  });

  it('applyBipartiteFilters supports isolated view (single domain)', () => {
    const graph = buildBipartiteGraph(sampleFootprints);
    const filtered = applyBipartiteFilters(graph, {
      isolatedView: { type: 'domain', id: 'c.com' },
    });
    expect(filtered.domains.map(d => d.id)).toEqual(['c.com']);
    expect(filtered.platforms.map(p => p.id).sort()).toEqual(['facebook', 'google', 'tiktok']);
    expect(filtered.edges).toHaveLength(3);
  });

  it('computeBipartiteStats reports headline numbers', () => {
    const stats = computeBipartiteStats(buildBipartiteGraph(sampleFootprints));
    expect(stats.totalDomains).toBe(3);
    expect(stats.totalPlatforms).toBe(3);
    expect(stats.totalConnections).toBe(6);
    expect(stats.mostConnectedDomain.id).toBe('c.com');
  });

  it('truncateLabel strips www and shortens long labels', () => {
    expect(truncateLabel('www.example.com', 20)).toBe('example.com');
    // The www-strip + last-2-parts reduction turns this into
    // "really-long-company-name.com" (27 chars) which is > 20, so
    // it gets the ellipsis treatment.
    expect(
      truncateLabel('shop.really-long-company-name.com', 20)
    ).toMatch(/\.\.\.$/);
    expect(truncateLabel('short.com', 20)).toBe('short.com');
  });

  it('drawBipartiteGraph is a no-op when no SVG element is supplied', () => {
    expect(() =>
      drawBipartiteGraph(
        null,
        { domains: [], platforms: [], edges: [] },
        { onTooltip: () => {}, onNodeClick: () => {} }
      )
    ).not.toThrow();
  });

  it('drawBipartiteGraph renders an SVG with one path per edge', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.defineProperty(svg, 'clientWidth', { value: 800 });
    Object.defineProperty(svg, 'clientHeight', { value: 600 });
    const parent = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', { value: 800 });
    Object.defineProperty(parent, 'clientHeight', { value: 600 });
    parent.appendChild(svg);
    Object.defineProperty(svg, 'parentElement', {
      configurable: true,
      get: () => parent,
    });

    const graph = buildBipartiteGraph(sampleFootprints);
    drawBipartiteGraph(svg, graph, {
      onTooltip: () => {},
      onNodeClick: () => {},
    });
    expect(svg.querySelectorAll('path.edge')).toHaveLength(graph.edges.length);
    expect(svg.querySelectorAll('g.domain-node')).toHaveLength(graph.domains.length);
    expect(svg.querySelectorAll('g.platform-node')).toHaveLength(graph.platforms.length);
  });
});

// ----- App tab rendering ----------------------------------------------------

describe('App dashboard shell — tab rendering', () => {
  beforeEach(() => {
    // Reset the live-query cache so each test sees fresh values.
    liveQueryCache.clear();
  });

  // Two-phase render: first render shows the loading spinner (our
  // useLiveQuery mock returns undefined on the first call when the
  // inner function is async). Flush microtasks so the promise
  // resolves and the cache populates; the mock also schedules a
  // notify-rerender, which we wire up here.
  async function renderApp() {
    const { default: App } = await import('../../src/dashboard/App.jsx');
    let root;
    const container = document.createElement('div');
    document.body.appendChild(container);
    act(() => {
      root = createRoot(container);
      root.render(<App />);
    });
    // Wire rerender callback so the live-query cache can trigger a
    // fresh render when the inner promise resolves.
    globalThis.__notifyAppRerender = () => {
      act(() => root.render(<App />));
    };
    // Let the inner async functions settle, with one extra render
    // after each flush so the cache is read.
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      act(() => root.render(<App />));
    }
    return {
      container,
      unmount() {
        globalThis.__notifyAppRerender = undefined;
        act(() => root.unmount());
        container.remove();
      },
    };
  }

  it('renders the empty state when there are no footprints', async () => {
    await renderApp();
    expect(document.body.textContent).toMatch(/No Tracking Detected Yet/i);
  });

  it('exposes the four named tabs once data is present', async () => {
    const { getFootprints, getStats } = await import(
      '../../src/dashboard/utils/db.js'
    );
    // The mock fn returns the queued value for the first call (which
    // happens during the first render). We then need the *cached*
    // value to be the data, not []. Re-set the mock *after* the
    // initial render so subsequent calls return data.
    const renderResult = renderInto(<div />); // not used; just to ensure vi.fn is ready
    renderResult.unmount();
    // The first call to getFootprints happens before we can swap
    // values, so we instead drive the mocks through `mockReturnValue`
    // (persistent) and clear the live-query cache.
    liveQueryCache.clear();
    getFootprints.mockReturnValue([
      {
        id: 1,
        domain: 'a.com',
        platform: 'facebook',
        pixelType: 'script',
        timestamp: Date.now(),
      },
    ]);
    getStats.mockReturnValue({
      totalFootprints: 1,
      uniqueDomains: 1,
      geoCacheSize: 0,
      oldestTimestamp: 0,
      newestTimestamp: 0,
      platformStats: { facebook: { detections: 1, domains: 1 } },
    });
    await renderApp();
    const tablist = document.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
    const labels = Array.from(tabs).map(t => t.textContent);
    expect(labels.some(l => /Graph View/i.test(l))).toBe(true);
    expect(labels.some(l => /Bipartite Graph/i.test(l))).toBe(true);
    expect(labels.some(l => /Map View/i.test(l))).toBe(true);
    expect(labels.some(l => /Data Table/i.test(l))).toBe(true);
  });

  it('switching to the Bipartite tab mounts the BipartiteGraph panel', async () => {
    const { getFootprints, getStats } = await import(
      '../../src/dashboard/utils/db.js'
    );
    liveQueryCache.clear();
    getFootprints.mockReturnValue([
      {
        id: 1,
        domain: 'a.com',
        platform: 'facebook',
        pixelType: 'script',
        timestamp: Date.now(),
      },
    ]);
    getStats.mockReturnValue({
      totalFootprints: 1,
      uniqueDomains: 1,
      geoCacheSize: 0,
      oldestTimestamp: 0,
      newestTimestamp: 0,
      platformStats: { facebook: { detections: 1, domains: 1 } },
    });
    await renderApp();
    const bipartiteTab = Array.from(
      document.querySelectorAll('[role="tab"]')
    ).find(t => /Bipartite Graph/i.test(t.textContent));
    expect(bipartiteTab).toBeDefined();
    act(() => bipartiteTab.click());
    await act(async () => {
      await Promise.resolve();
    });
    const panel = document.getElementById('bipartite-view');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('role')).toBe('tabpanel');
  });
});
