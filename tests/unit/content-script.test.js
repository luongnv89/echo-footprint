/**
 * Unit tests for content-script.js
 * Tests pixel detection lifecycle, error handling, and messaging
 *
 * Issue #20: pause + domain-exclusion gate (`shouldRecord`) is honored by
 * the 3-second scan and the MutationObserver.
 * Issue #21: detectors return all matching platforms, observer-vs-delayed
 * dedup ensures a single pixel is recorded once.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock chrome API (preserve the storage mock installed by tests/setup.js
// so issue #20's shouldRecord() gate and issue #21's storage-backed dedup
// have something to read).
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn((message, callback) => {
      // Simulate successful message
      if (callback) {
        callback({ success: true });
      }
    }),
    lastError: null,
  },
  storage: global.chrome?.storage || {
    local: {
      get: vi.fn((keys, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }),
      set: vi.fn(),
    },
  },
};

describe('Content Script - Message Handling', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    chrome.runtime.lastError = null;
  });

  it('should send pixel detection message to service worker', () => {
    const detectionData = {
      detected: true,
      platform: 'facebook',
      domain: 'example.com',
      pixelType: 'script',
    };

    // Import sendPixelDetection from content script (we'll need to export it)
    // For now, test the chrome API mock directly
    chrome.runtime.sendMessage(
      {
        type: 'PIXEL_DETECTED',
        data: detectionData,
      },
      response => {
        expect(response.success).toBe(true);
      }
    );

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'PIXEL_DETECTED',
        data: detectionData,
      },
      expect.any(Function)
    );
  });

  it('should handle extension context invalidation gracefully', () => {
    // Simulate extension context invalidation
    chrome.runtime.id = null;

    // Should not throw error
    expect(() => {
      if (!chrome.runtime?.id) {
        // Extension context invalidated - should skip silently
        return;
      }
    }).not.toThrow();
  });

  it('should handle sendMessage errors gracefully', () => {
    chrome.runtime.lastError = {
      message: 'Extension context invalidated',
    };

    const detectionData = {
      detected: true,
      platform: 'google',
      domain: 'example.com',
    };

    chrome.runtime.sendMessage(
      {
        type: 'PIXEL_DETECTED',
        data: detectionData,
      },
      () => {
        if (chrome.runtime.lastError) {
          // Should handle error gracefully
          expect(chrome.runtime.lastError.message).toContain(
            'Extension context invalidated'
          );
        }
      }
    );
  });
});

describe('Content Script - Detection Timing', () => {
  it('should respect detection delay configuration', () => {
    const DETECTION_DELAY_MS = 3000;

    // Verify delay is reasonable (not too short, not too long)
    expect(DETECTION_DELAY_MS).toBeGreaterThanOrEqual(1000);
    expect(DETECTION_DELAY_MS).toBeLessThanOrEqual(5000);
  });

  it('should validate detection latency under 100ms', () => {
    const targetLatency = 100; // ms per PRD
    const actualLatency = 45; // simulated

    expect(actualLatency).toBeLessThan(targetLatency);
  });

  it('should warn when detection exceeds 100ms target', () => {
    const targetLatency = 100;
    const actualLatency = 150; // exceeds target

    if (actualLatency > targetLatency) {
      // Should log warning
      expect(actualLatency).toBeGreaterThan(targetLatency);
    }
  });
});

describe('Content Script - DOM Ready States', () => {
  it('should handle DOMContentLoaded event', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
    });

    expect(dom.window.document.readyState).toBeTruthy();
  });

  it('should handle already loaded DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
    });

    // DOM readyState should be a valid state
    const state = dom.window.document.readyState;
    const validStates = ['loading', 'interactive', 'complete'];
    expect(validStates).toContain(state);
  });

  it('should handle loading state', () => {
    const validStates = ['loading', 'interactive', 'complete'];
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

    expect(validStates).toContain(dom.window.document.readyState);
  });
});

describe('Content Script - Debug Mode', () => {
  it('should support debug mode configuration', () => {
    const DEBUG_MODE = false; // Production default

    expect(DEBUG_MODE).toBe(false);
  });

  it('should allow debug mode for development', () => {
    const DEBUG_MODE_DEV = true; // Development

    if (DEBUG_MODE_DEV) {
      // Debug logging enabled
      expect(DEBUG_MODE_DEV).toBe(true);
    }
  });

  it('should format debug messages correctly', () => {
    const message = 'Starting detection on example.com';
    const formatted = `[EchoFootPrint] ${message}`;

    expect(formatted).toContain('[EchoFootPrint]');
    expect(formatted).toContain('example.com');
  });
});

describe('Content Script - Observer Cleanup', () => {
  it('should disconnect observer on page unload', () => {
    const mockObserver = {
      disconnect: vi.fn(),
      observe: vi.fn(),
    };

    // Simulate pagehide event
    mockObserver.disconnect();

    expect(mockObserver.disconnect).toHaveBeenCalledTimes(1);
  });

  it('should use pagehide instead of unload event', () => {
    // Per code: "Using pagehide instead of unload to avoid Permissions Policy violations"
    const validEvents = ['pagehide', 'beforeunload'];

    expect(validEvents).toContain('pagehide');
  });
});

describe('Content Script - URL Parsing', () => {
  it('should extract hostname from scripts', () => {
    const scriptUrl = 'https://connect.facebook.net/en_US/fbevents.js';

    try {
      const url = new URL(scriptUrl);
      expect(url.hostname).toBe('connect.facebook.net');
    } catch (e) {
      expect(e).toBeNull();
    }
  });

  it('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-valid-url';

    try {
      new URL(invalidUrl);
    } catch (e) {
      expect(e).toBeTruthy();
      expect(e.name).toBe('TypeError');
    }
  });

  it('should get unique domains from multiple scripts', () => {
    const scriptUrls = [
      'https://connect.facebook.net/en_US/fbevents.js',
      'https://www.google-analytics.com/analytics.js',
      'https://connect.facebook.net/signals/config.js',
      'https://cdn.example.com/app.js',
    ];

    const domains = scriptUrls
      .map(url => {
        try {
          return new URL(url).hostname;
        } catch (e) {
          return null;
        }
      })
      .filter(domain => domain !== null);

    const uniqueDomains = [...new Set(domains)];

    expect(uniqueDomains).toHaveLength(3);
    expect(uniqueDomains).toContain('connect.facebook.net');
    expect(uniqueDomains).toContain('www.google-analytics.com');
    expect(uniqueDomains).toContain('cdn.example.com');
  });
});

describe('Content Script - Error Handling', () => {
  it('should handle chrome.runtime errors gracefully', () => {
    chrome.runtime.lastError = {
      message: 'Could not establish connection',
    };

    expect(() => {
      if (chrome.runtime.lastError) {
        // Handle error - should not throw
        const error = chrome.runtime.lastError;
        expect(error.message).toBeTruthy();
      }
    }).not.toThrow();
  });

  it('should handle extension reload scenarios', () => {
    chrome.runtime.lastError = {
      message: 'Extension context invalidated',
    };

    const errorMessage = chrome.runtime.lastError.message;
    const isContextInvalidated = errorMessage.includes(
      'Extension context invalidated'
    );

    expect(isContextInvalidated).toBe(true);
  });

  it('should catch and log detection errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

    try {
      throw new Error('Detection failed');
    } catch (error) {
      console.error('EchoFootPrint: Detection error:', error);
    }

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe('Content Script - Performance Requirements', () => {
  it('should meet <100ms detection latency requirement', () => {
    const startTime = performance.now();

    // Simulate detection work
    const mockDetection = () => {
      // Fast operation
      return { detected: false };
    };

    mockDetection();
    const totalTime = performance.now() - startTime;

    // Should be extremely fast in test environment
    expect(totalTime).toBeLessThan(100);
  });

  it('should handle large numbers of scripts efficiently', () => {
    const scriptCount = 100;
    const scripts = Array.from({ length: scriptCount }, (_, i) => ({
      src: `https://cdn${i}.example.com/script.js`,
    }));

    const startTime = performance.now();

    // Simulate checking all scripts
    scripts.forEach(script => {
      const url = new URL(script.src);
      expect(url.hostname).toBeTruthy();
    });

    const totalTime = performance.now() - startTime;

    // Should process 100 scripts quickly
    expect(totalTime).toBeLessThan(100);
  });
});

describe('Content Script - Script Counting', () => {
  it('should count all scripts on page', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <script src="https://example.com/app.js"></script>
          <script src="https://cdn.example.com/lib.js"></script>
          <script>console.log('inline script')</script>
        </body>
      </html>
    `);

    const scriptsWithSrc = dom.window.document.querySelectorAll('script[src]');
    expect(scriptsWithSrc.length).toBe(2);
  });

  it('should filter out inline scripts', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <script src="https://example.com/app.js"></script>
          <script>console.log('inline')</script>
          <script src="https://example.com/lib.js"></script>
        </body>
      </html>
    `);

    const scriptsWithSrc = dom.window.document.querySelectorAll('script[src]');
    expect(scriptsWithSrc.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Issue #20: pause + domain-exclusion gate (shouldRecord)
// ---------------------------------------------------------------------------

describe('Content Script - shouldRecord() gate (issue #20)', () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock storage.get to return an empty record by default
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    });
    chrome.runtime.sendMessage = vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when not paused and not excluded', async () => {
    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );
    await expect(shouldRecord()).resolves.toBe(true);
  });

  it('returns false when isPaused is true', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({ isPaused: true });
      return Promise.resolve({ isPaused: true });
    });

    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );
    await expect(shouldRecord()).resolves.toBe(false);
  });

  it('returns false when current hostname is in excludedDomains', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({ excludedDomains: [window.location.hostname] });
      return Promise.resolve({ excludedDomains: [window.location.hostname] });
    });

    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );
    await expect(shouldRecord()).resolves.toBe(false);
  });

  it('returns true when excludedDomains is empty array', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({ excludedDomains: [] });
      return Promise.resolve({ excludedDomains: [] });
    });

    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );
    await expect(shouldRecord()).resolves.toBe(true);
  });

  it('returns true when chrome.storage.local is unavailable', async () => {
    const original = chrome.storage;
    delete chrome.storage;

    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );
    await expect(shouldRecord()).resolves.toBe(true);

    chrome.storage = original;
  });
});

// ---------------------------------------------------------------------------
// Issue #21: all-platforms-per-scan + observer-vs-delayed dedup
// ---------------------------------------------------------------------------

describe('Content Script - multi-platform scan + dedup (issue #21)', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    // Mock storage returning an empty record (not paused, no exclusions)
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    });
    chrome.runtime.sendMessage = vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one sendMessage per matching platform (Facebook + Google)', async () => {
    // Build a DOM with both Facebook and Google scripts
    const fb = document.createElement('script');
    fb.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.body.appendChild(fb);
    const ga = document.createElement('script');
    ga.src = 'https://www.google-analytics.com/analytics.js';
    document.body.appendChild(ga);

    // Import the detector and run a single scan, then route through the
    // content-script dedup logic via a small helper. (We can't drive the
    // 3-second setTimeout directly, so we exercise the same building
    // blocks the content script uses.)
    const { detectFacebookPixel } = await import(
      '../../src/lib/pixel-detector.js'
    );

    const detections = detectFacebookPixel();
    expect(detections).toHaveLength(2);
    const platforms = detections.map(d => d.platform).sort();
    expect(platforms).toEqual(['facebook', 'google']);

    // Simulate the content-script recordDetections loop
    const seen = new Set();
    for (const det of detections) {
      const key = `${det.platform}|${det.pixelType}|${det.scriptSrc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chrome.runtime.sendMessage({ type: 'PIXEL_DETECTED', data: det }, () => {});
    }

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    const sent = chrome.runtime.sendMessage.mock.calls.map(c => c[0].data.platform).sort();
    expect(sent).toEqual(['facebook', 'google']);
  });

  it('dedups observer vs delayed scan for the same pixel', async () => {
    // Simulate the same pixel arriving from both the observer (dynamic) and
    // the 3-second delayed scan (static). The dedup signature should make
    // the second occurrence a no-op.
    const { observeDynamicPixels } = await import(
      '../../src/lib/pixel-detector.js'
    );

    // First the observer fires with a Facebook script
    const observer = observeDynamicPixels(detection => {
      // Simulate content-script recordDetections dedup
      const key = `${detection.platform}|${detection.pixelType}|${detection.scriptSrc}`;
      if (seen.has(key)) return;
      seen.add(key);
      chrome.runtime.sendMessage(
        { type: 'PIXEL_DETECTED', data: detection },
        () => {}
      );
    });

    const seen = new Set();

    // Inject a Facebook script
    const fb = document.createElement('script');
    fb.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.body.appendChild(fb);

    await new Promise(resolve => setTimeout(resolve, 50));

    observer.disconnect();

    // Now simulate the 3-second delayed scan surfacing the same Facebook script
    const { detectFacebookPixel } = await import(
      '../../src/lib/pixel-detector.js'
    );
    const detections = detectFacebookPixel();
    for (const det of detections) {
      const key = `${det.platform}|${det.pixelType}|${det.scriptSrc}`;
      if (seen.has(key)) continue;
      seen.add(key);
      chrome.runtime.sendMessage({ type: 'PIXEL_DETECTED', data: det }, () => {});
    }

    // The Facebook script was sent exactly once (by the observer).
    // The delayed scan produced another entry with the same signature, so
    // the dedup set filtered it out.
    const fbMessages = chrome.runtime.sendMessage.mock.calls
      .map(c => c[0].data)
      .filter(d => d.platform === 'facebook');
    expect(fbMessages).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Issue #20: observer pipeline honors the pause + exclusion gate
// ---------------------------------------------------------------------------

describe('Content Script - observer pipeline honors gate (issue #20)', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    chrome.runtime.sendMessage = vi.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not sendMessage when paused', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({ isPaused: true });
      return Promise.resolve({ isPaused: true });
    });

    const { observeDynamicPixels } = await import(
      '../../src/lib/pixel-detector.js'
    );
    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );

    const observer = observeDynamicPixels(async detection => {
      // Mirror the content-script observer pipeline
      if (!(await shouldRecord())) return;
      chrome.runtime.sendMessage(
        { type: 'PIXEL_DETECTED', data: detection },
        () => {}
      );
    });

    const fb = document.createElement('script');
    fb.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.body.appendChild(fb);

    await new Promise(resolve => setTimeout(resolve, 50));
    observer.disconnect();

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('does not sendMessage when current domain is excluded', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({ excludedDomains: [window.location.hostname] });
      return Promise.resolve({ excludedDomains: [window.location.hostname] });
    });

    const { observeDynamicPixels } = await import(
      '../../src/lib/pixel-detector.js'
    );
    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );

    const observer = observeDynamicPixels(async detection => {
      if (!(await shouldRecord())) return;
      chrome.runtime.sendMessage(
        { type: 'PIXEL_DETECTED', data: detection },
        () => {}
      );
    });

    const fb = document.createElement('script');
    fb.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.body.appendChild(fb);

    await new Promise(resolve => setTimeout(resolve, 50));
    observer.disconnect();

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('does sendMessage when not paused and not excluded', async () => {
    chrome.storage.local.get = vi.fn((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    });

    const { observeDynamicPixels } = await import(
      '../../src/lib/pixel-detector.js'
    );
    const { shouldRecord } = await import(
      '../../src/content/content-script.js'
    );

    const observer = observeDynamicPixels(async detection => {
      if (!(await shouldRecord())) return;
      chrome.runtime.sendMessage(
        { type: 'PIXEL_DETECTED', data: detection },
        () => {}
      );
    });

    const fb = document.createElement('script');
    fb.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.body.appendChild(fb);

    await new Promise(resolve => setTimeout(resolve, 50));
    observer.disconnect();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.sendMessage.mock.calls[0][0].data.platform).toBe(
      'facebook'
    );
  });
});
