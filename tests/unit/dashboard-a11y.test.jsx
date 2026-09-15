/**
 * Accessibility regression tests for review fixes on the dashboard
 * redesign branch:
 *
 *   - DataTable group rows are keyboard-activatable disclosures
 *   - Shared sheet scaffold moves focus in, traps Tab, closes on
 *     Escape, and restores focus on close
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
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  rootRef = null;
});

afterEach(() => {
  if (rootRef) {
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
  it('expands a group when its row receives Enter', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');
    expect(row).toBeTruthy();
    expect(row.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(row.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.group-detail-row')).toBeTruthy();
  });

  it('expands a group on Space and collapses again on repeat', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');

    act(() => {
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(row.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      row.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      );
    });
    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.group-detail-row')).toBeNull();
  });

  it('row is focusable with role=button', () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.getAttribute('role')).toBe('button');
  });

  it('does not toggle the group when Enter is pressed on the nested URL link', async () => {
    render(<DataTable footprints={FOOTPRINTS} />);
    const row = container.querySelector('tr.group-row');
    const link = row.querySelector('a.url-link');
    expect(link).toBeTruthy();

    act(() => {
      link.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.group-detail-row')).toBeNull();

    // Let any pending async state updates (e.g. geo map load) settle before
    // the environment is torn down, so vitest does not record an unhandled
    // rejection for a setState after unmount.
    await act(async () => {
      await Promise.resolve();
    });
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
    });
    await flush();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<SettingsSheet isOpen onClose={onClose} stats={{}} />);

    act(() => {
      container
        .querySelector('.sheet-overlay')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
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
