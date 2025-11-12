/**
 * Vitest setup file
 * Configures global mocks for Chrome extension APIs
 */

import { vi } from 'vitest';

// Mock Chrome extension APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: vi.fn((items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      clear: vi.fn((callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  cookies: {
    get: vi.fn((details, callback) => {
      if (callback) callback(null);
      return Promise.resolve(null);
    }),
  },
};

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  };
}
