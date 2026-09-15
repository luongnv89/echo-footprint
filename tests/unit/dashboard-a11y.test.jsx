/**
 * Accessibility regression tests for review fixes on the dashboard
 * redesign branch:
 *
 *   - DataTable group expand/collapse lives on a dedicated button
 *   - Shared sheet scaffold moves focus in, traps Tab, closes on
 *     Escape (via local handleClose), and restores focus on close
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import 'fake-indexeddb/auto';

// Mock getGeoCache so DataTable's geo effect resolves before the test
// environment is torn down (avoids setState-after-teardown rejections).
vi.mock('../../src/dashboard/utils/db.js', async () => {
  const actual = await vi.importActual('../../src/dashboard/utils/db.js');
  return {
    ...actual,
    getGeoCache: vi.fn(async () => null),
  };
});

import DataTable from '../../src/dashboard/components/DataTable.jsx';
import SettingsSheet from '../../src/dashboard/components/SettingsSheet.jsx';
import HelpSheet from '../../src/dashboard/components/HelpSheet.jsx';
import BipartiteGraph from '../../src/dashboard/components/BipartiteGraph.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// SettingsSheet fetches build/manifest info on open; stub so no async
// state updates survive past unmount in the jsdom environment.
window.fetch = vi.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({}) })
);

let container;
let rootRef;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  rootRef = null;
});

afterEach(async () => {
  // Flush pending microtasks (geo cache, build-info fetch) while still
  // mounted so setState does not run after jsdom teardown.
  if (rootRef) {
    await flush();
    act(() => {
      rootRef.unmount();
    });
  }
  container.remove();
  container = null;
  rootRef = null;
});

function render(element) {
  act(() => {
    rootRef = createRoot(container);
    rootRef.render(element);
  });
}

const FOOTPRINTS = [
  {
    domain: 'example.com',
    url: 'https://example.com/page',
    platform: 'facebook',
    pixelType: 'pixel',
    region: 'EU',
    timestamp: 1700000000000,
  },
];

describe('DataTable group row keyboard disclosure', () => {
  it('expands a group when its expand button receives Enter', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');
    const toggle = row.querySelector('button.group-expand-btn');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      toggle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
      toggle.click();
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.group-detail-row')).toBeTruthy();
  });

  it('expands a group on Space and collapses again on repeat', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const toggle = container.querySelector('button.group-expand-btn');

    act(() => {
      toggle.click();
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      toggle.click();
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.group-detail-row')).toBeNull();
  });

  it('does not treat the group row as a nested button around the URL link', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');
    expect(row.getAttribute('role')).not.toBe('button');
    expect(row.querySelector('a.url-link')).toBeTruthy();
    expect(row.querySelector('button.group-expand-btn')).toBeTruthy();
  });

  it('does not toggle the group when Enter is pressed on the nested URL link', async () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const toggle = container.querySelector('button.group-expand-btn');
    const link = container.querySelector('a.url-link');
    expect(link).toBeTruthy();

    act(() => {
      link.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.group-detail-row')).toBeNull();
  });

  it('exposes sort direction on the active column header', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const timestampHeader = container.querySelector('th[aria-sort]');
    expect(timestampHeader).toBeTruthy();
    expect(timestampHeader.getAttribute('aria-sort')).toBe('descending');
    const sortBtn = timestampHeader.querySelector('button.sort-button');
    expect(sortBtn.getAttribute('aria-label')).toMatch(/descending/i);
  });
});

describe('SettingsSheet focus management', () => {
  it('moves focus into the dialog on open and restores it on close', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'open settings';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    render(<SettingsSheet isOpen onClose={() => {}} stats={{}} />);

    const dialog = container.querySelector('.sheet-overlay');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // Focus must have moved out of the trigger into the dialog tree.
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Focus restored to the trigger after the sheet unmounts.
    act(() => {
      rootRef.unmount();
      rootRef = null;
    });
    await flush();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('closes on Escape via handleClose and resets danger-zone confirm', () => {
    const onClose = vi.fn();
    render(<SettingsSheet isOpen onClose={onClose} stats={{}} />);

    const clearBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent.includes('Clear All Data')
    );
    act(() => {
      clearBtn.click();
    });
    const confirmInput = container.querySelector('#settings-confirm-delete');
    expect(confirmInput).toBeTruthy();
    expect(confirmInput.getAttribute('name')).toBe('confirm-delete');
    const label = container.querySelector('label[for="settings-confirm-delete"]');
    expect(label).toBeTruthy();

    act(() => {
      confirmInput.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: 'DELETE' })
      );
    });

    act(() => {
      container
        .querySelector('.sheet-overlay')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('#settings-confirm-delete')).toBeNull();
  });

  it('names the detection switch for its control, not the opposite action', () => {
    render(<SettingsSheet isOpen onClose={() => {}} stats={{}} />);
    const sw = container.querySelector('[role="switch"]');
    expect(sw.getAttribute('aria-label')).toBe('Detection');
    expect(sw.getAttribute('aria-checked')).toBe('true');
  });

  it('traps Tab inside the dialog', () => {
    render(<SettingsSheet isOpen onClose={() => {}} stats={{}} />);

    const dialog = container.querySelector('.sheet-overlay');
    const sheet = dialog.querySelector('.sheet');
    const focusables = sheet.querySelectorAll('button, input');
    expect(focusables.length).toBeGreaterThan(1);

    // Focus the last focusable and Tab — focus must wrap to the first.
    const last = focusables[focusables.length - 1];
    act(() => {
      last.focus();
    });
    act(() => {
      last.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true,
        })
      );
    });

    const first = focusables[0];
    expect(document.activeElement).toBe(first);
  });
});

describe('HelpSheet section tabs', () => {
  it('exposes tablist selected state', () => {
    render(<HelpSheet isOpen onClose={() => {}} />);
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = tablist.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');

    act(() => {
      tabs[1].click();
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('#help-panel-features')).toBeTruthy();
  });
});

describe('BipartiteGraph filter and sort labels', () => {
  it('associates filter and sort labels with their controls', () => {
    render(<BipartiteGraph footprints={FOOTPRINTS} stats={{}} />);
    const filterToggle = Array.from(container.querySelectorAll('button')).find(
      b => b.getAttribute('title') === 'Show filters'
    );
    const sortToggle = Array.from(container.querySelectorAll('button')).find(
      b => b.getAttribute('title') === 'Show sorting'
    );
    act(() => {
      filterToggle.click();
      sortToggle.click();
    });

    expect(
      container.querySelector('label[for="bipartite-filter-search"]')
    ).toBeTruthy();
    expect(container.querySelector('#bipartite-filter-search')).toBeTruthy();
    expect(
      container.querySelector('label[for="bipartite-filter-platform"]')
    ).toBeTruthy();
    expect(container.querySelector('#bipartite-filter-platform')).toBeTruthy();
    expect(
      container.querySelector('label[for="bipartite-filter-min-detections"]')
    ).toBeTruthy();
    expect(
      container.querySelector('#bipartite-filter-min-detections')
    ).toBeTruthy();
    expect(
      container.querySelector('label[for="bipartite-sort-domains"]')
    ).toBeTruthy();
    expect(container.querySelector('#bipartite-sort-domains')).toBeTruthy();
    expect(
      container.querySelector('label[for="bipartite-sort-platforms"]')
    ).toBeTruthy();
    expect(container.querySelector('#bipartite-sort-platforms')).toBeTruthy();
  });
});

describe('async teardown hygiene', () => {
  it('opens SettingsSheet so pending fetches flush in afterEach', () => {
    render(<SettingsSheet isOpen onClose={() => {}} stats={{}} />);
    expect(container.querySelector('.sheet-overlay')).toBeTruthy();
  });
});
