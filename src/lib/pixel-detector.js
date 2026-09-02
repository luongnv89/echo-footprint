/**
 * Multi-Platform Tracking Pixel Detector
 * Detects tracking pixels from 50 major ad network platforms
 * Target: <100ms detection latency per PRD requirements
 */

import { TRACKING_PLATFORMS } from './tracking-platforms.js';

export { TRACKING_PLATFORMS };

/**
 * Build a flat domain-to-platform lookup map for fast detection
 * Called once at initialization
 */
const DOMAIN_TO_PLATFORM_MAP = (() => {
  const map = {};
  for (const [platformId, config] of Object.entries(TRACKING_PLATFORMS)) {
    for (const domain of config.domains) {
      map[domain] = platformId;
    }
  }
  return map;
})();

/**
 * Check if a URL contains a tracking domain from any platform
 * Optimized with pre-computed domain map for <50ms detection
 * @param {string} url - URL to check
 * @returns {string|null} - Platform ID if match found, null otherwise
 */
function detectPlatformFromUrl(url) {
  if (!url) return null;

  // Fast path: check pre-computed map
  for (const domain in DOMAIN_TO_PLATFORM_MAP) {
    if (url.includes(domain)) {
      return DOMAIN_TO_PLATFORM_MAP[domain];
    }
  }

  return null;
}

/**
 * Pure helper: scan a list of elements (e.g. `script[src]`, `img[src]`,
 * `iframe[src]`) and return the set of tracking platforms they reference.
 *
 * Extracted from the DOM-bound scanners so the matching logic can be
 * unit-tested directly with realistic fixtures (issue #37, F-TEST-003).
 *
 * @param {Array<{src: string}>} elements - Elements to scan. Anything
 *   without a truthy `src` is skipped, so callers can pass the result of
 *   `querySelectorAll('script[src], img[src], iframe[src]')` unchanged.
 * @param {(platform: string) => object} buildDetection - Builds the
 *   detection shape for a matched platform. Kept injectable so callers
 *   control the `method`/`pixelType` and any timing metadata.
 * @returns {Array<object>} - Detections, one per unique platform, in the
 *   order the platforms were first encountered.
 */
export function collectDetectionsFromElements(elements, buildDetection) {
  if (!Array.isArray(elements) || typeof buildDetection !== 'function') {
    return [];
  }
  const detections = [];
  const seenPlatforms = new Set();
  for (const el of elements) {
    const src = el && el.src;
    if (!src) continue;
    const platform = detectPlatformFromUrl(src);
    if (platform && !seenPlatforms.has(platform)) {
      seenPlatforms.add(platform);
      detections.push(buildDetection(platform, src));
    }
  }
  return detections;
}

/**
 * Detect tracking pixels from script tags in the DOM
 * Returns one detection per unique platform (no DOM-node duplication).
 * @returns {Array<Object>} - Array of detection results (possibly empty)
 */
export function detectAllPlatformsScripts() {
  const startTime = performance.now();

  try {
    // Find all script tags
    const scripts = Array.from(document.querySelectorAll('script[src]'));

    const detections = collectDetectionsFromElements(
      scripts,
      (platform, src) => ({
        detected: true,
        method: 'script',
        domain: window.location.hostname || 'localhost',
        url: window.location.href,
        pixelType: 'script',
        platform: platform,
        scriptSrc: src,
        detectionLatency:
          Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: Date.now(),
      })
    );

    return detections;
  } catch (error) {
    console.error('EchoFootPrint: Error detecting scripts:', error);
    return [];
  }
}

/**
 * Detect tracking pixels from img/iframe elements
 * Returns one detection per unique platform (no DOM-node duplication).
 * @returns {Array<Object>} - Array of detection results (possibly empty)
 */
export function detectAllPlatformsElements() {
  const startTime = performance.now();

  try {
    const detections = [];

    // Check for tracking pixels (img tags)
    const imgs = Array.from(document.querySelectorAll('img[src]'));
    detections.push(
      ...collectDetectionsFromElements(imgs, (platform, src) => ({
        detected: true,
        method: 'img',
        domain: window.location.hostname || 'localhost',
        url: window.location.href,
        pixelType: 'beacon',
        platform: platform,
        scriptSrc: src,
        detectionLatency:
          Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: Date.now(),
      }))
    );

    // Check for iframes
    const iframes = Array.from(document.querySelectorAll('iframe[src]'));
    detections.push(
      ...collectDetectionsFromElements(iframes, (platform, src) => ({
        detected: true,
        method: 'iframe',
        domain: window.location.hostname || 'localhost',
        url: window.location.href,
        pixelType: 'iframe',
        platform: platform,
        scriptSrc: src,
        detectionLatency:
          Math.round((performance.now() - startTime) * 100) / 100,
        timestamp: Date.now(),
      }))
    );

    return detections;
  } catch (error) {
    console.error('EchoFootPrint: Error detecting elements:', error);
    return [];
  }
}

/**
 * Comprehensive tracking pixel detection across all platforms.
 * Combines script and element scans and returns one entry per platform.
 * @returns {Array<Object>} - Array of detection results (possibly empty)
 */
export function detectAllPlatforms() {
  const startTime = performance.now();

  try {
    // Try script detection first (most common)
    const scripts = detectAllPlatformsScripts();
    const elements = detectAllPlatformsElements();

    // Merge while keeping at most one entry per platform.
    const merged = [];
    const seenPlatforms = new Set();
    for (const det of [...scripts, ...elements]) {
      if (!seenPlatforms.has(det.platform)) {
        seenPlatforms.add(det.platform);
        merged.push(det);
      }
    }

    const detectionTime = performance.now() - startTime;

    // Log performance for debugging (only if >100ms per PRD)
    if (detectionTime > 100) {
      console.warn(
        `EchoFootPrint: Slow detection on ${window.location.hostname}: ${detectionTime}ms`
      );
    }

    return merged;
  } catch (error) {
    console.error('EchoFootPrint: Detection error:', error);
    return [];
  }
}

/**
 * Setup MutationObserver to detect dynamically loaded pixels.
 * Reports every newly-added tracking script in the mutation batch
 * (one callback per platform per batch). The caller is responsible
 * for deduplicating detections against any prior scan in this page
 * (see `recordDetections` in content-script.js).
 * @param {Function} callback - Called with a detection object per platform
 * @returns {MutationObserver} - Observer instance
 */
export function observeDynamicPixels(callback) {
  const observer = new MutationObserver(mutations => {
    // Track every matching platform added by this mutation batch
    // (no first-match short-circuit — see issue #21).
    const seenPlatforms = new Set();

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'SCRIPT' && node.src) {
            const platform = detectPlatformFromUrl(node.src);
            if (platform && !seenPlatforms.has(platform)) {
              seenPlatforms.add(platform);
              callback({
                detected: true,
                method: 'dynamic-script',
                domain: window.location.hostname || 'localhost',
                url: window.location.href,
                pixelType: 'script',
                platform: platform,
                scriptSrc: node.src,
                timestamp: Date.now(),
              });
            }
          }
        }
      }
    }
  });

  // Start observing
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}
