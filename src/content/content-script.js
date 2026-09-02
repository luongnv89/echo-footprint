/**
 * EchoFootPrint Content Script
 * Injected into all web pages to detect Facebook tracking pixels
 * Per PRD: <100ms detection latency, silent operation
 */

import {
  detectAllPlatforms,
  observeDynamicPixels,
} from '../lib/pixel-detector.js';
import { isDomainExcluded } from './domain-utils.js';

// Configuration
const DEBUG_MODE = false; // Set to true only during development
const DETECTION_DELAY_MS = 3000; // Wait 3 seconds for page to fully load (Facebook Pixel loads async)

/**
 * Module-level dedup set for detections seen during the lifetime of this
 * content-script instance. Keyed by `platform|pixelType|src` so the same
 * pixel surfaced by both the MutationObserver and the 3-second delayed scan
 * is recorded exactly once. The content script reinjects on full navigation,
 * which naturally resets state; BFCache preserves the document so we
 * intentionally do NOT clear this on `pagehide`.
 */
const recordedSignatures = new Set();

/**
 * Build the dedup signature for a detection. Path-independent identity only —
 * timestamps and `method` are excluded so observer-vs-delayed-scan hits dedup.
 */
function detectionSignature(detection) {
  const platform = detection?.platform || 'unknown';
  const pixelType = detection?.pixelType || 'unknown';
  const src = detection?.scriptSrc || '';
  return `${platform}|${pixelType}|${src}`;
}

/**
 * Returns true if this detection has already been recorded in this page.
 * If not, registers it and returns false. Synchronous check-and-add to keep
 * observer/delayed-scan races safe.
 */
function tryClaimSignature(detection) {
  const sig = detectionSignature(detection);
  if (recordedSignatures.has(sig)) {
    return false;
  }
  recordedSignatures.add(sig);
  return true;
}

/**
 * Log debug messages (only in debug mode)
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
function debug(message, data = null) {
  if (DEBUG_MODE) {
    if (data) {
      console.log(`[EchoFootPrint] ${message}`, data);
    } else {
      console.log(`[EchoFootPrint] ${message}`);
    }
  }
}

/**
 * Send pixel detection event to service worker
 * @param {Object} detectionData - Detection result
 */
function sendPixelDetection(detectionData) {
  try {
    // Check if extension context is valid (prevents errors when extension is reloaded)
    if (!chrome.runtime?.id) {
      // Silently skip if extension context is invalidated (expected during extension reload)
      debug('Extension context invalidated, skipping message');
      return;
    }

    // Send message to service worker
    chrome.runtime.sendMessage(
      {
        type: 'PIXEL_DETECTED',
        data: detectionData,
      },
      response => {
        if (chrome.runtime.lastError) {
          // Gracefully handle context invalidation (extension reloaded while page open)
          if (
            chrome.runtime.lastError.message.includes(
              'Extension context invalidated'
            )
          ) {
            debug('Extension was reloaded, skipping');
            return;
          }
          console.error(
            'EchoFootPrint: Error sending message:',
            chrome.runtime.lastError
          );
        } else {
          debug('Detection sent to service worker', response);
        }
      }
    );
  } catch (error) {
    // Gracefully handle context invalidation errors
    if (error.message?.includes('Extension context invalidated')) {
      debug('Extension was reloaded, skipping');
      return;
    }
    console.error('EchoFootPrint: Failed to send detection:', error);
  }
}

/**
 * Read a value from chrome.storage.local with safe fallback.
 * @param {string|string[]|Object} keys
 * @returns {Promise<Object>}
 */
function getFromStorage(keys) {
  return new Promise(resolve => {
    if (!chrome?.storage?.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, result => resolve(result || {}));
  });
}

/**
 * Pause + domain-exclusion gate. Both the 3-second delayed scan and the
 * MutationObserver honor this gate so paused/excluded pages never record
 * (see issue #20).
 * @returns {Promise<boolean>} true if recording is allowed on this page
 */
export async function shouldRecord() {
  const { isPaused, excludedDomains = [] } = await getFromStorage([
    'isPaused',
    'excludedDomains',
  ]);

  if (isPaused) {
    debug('Extension is paused globally');
    return false;
  }

  if (isDomainExcluded(window.location.hostname, excludedDomains)) {
    debug(
      `Domain excluded from tracking detection: ${window.location.hostname}`,
      excludedDomains
    );
    return false;
  }

  return true;
}

/**
 * Filter a list of detections through the dedup set and dispatch the
 * survivors to the service worker. Shared by the delayed scan and the
 * MutationObserver so a single pixel seen in both paths is sent once.
 * @param {Array<Object>} detections
 * @param {string} source - 'scan' | 'observer' (debug/log only)
 */
function recordDetections(detections, source) {
  if (!Array.isArray(detections) || detections.length === 0) {
    return 0;
  }
  let sent = 0;
  for (const det of detections) {
    if (!det || !det.detected) continue;
    if (!tryClaimSignature(det)) {
      debug(`Dedup hit (${source}), skipping: ${det.platform}`);
      continue;
    }
    sendPixelDetection(det);
    sent += 1;
  }
  return sent;
}

/**
 * Main detection routine. Honors pause + domain exclusions; iterates every
 * matching platform in a single scan.
 */
async function runPixelDetection() {
  const startTime = performance.now();

  debug(`Starting detection on ${window.location.hostname}`);

  if (!(await shouldRecord())) {
    return;
  }

  // Count all scripts for debugging
  const allScripts = document.querySelectorAll('script[src]');
  debug(`Found ${allScripts.length} scripts on page`);

  // Run pixel detection — now returns an array of all matching platforms
  const detections = detectAllPlatforms();

  const totalTime = performance.now() - startTime;
  debug(`Detection completed in ${Math.round(totalTime * 100) / 100}ms`);

  if (detections.length > 0) {
    const sent = recordDetections(detections, 'scan');
    debug(
      `Detected ${detections.length} platform(s); recorded ${sent} (after dedup)`,
      detections
    );
  } else {
    debug('No tracking pixels detected on this page');
    // Log all unique domains found in scripts
    if (allScripts.length > 0) {
      const scriptDomains = Array.from(allScripts)
        .map(script => {
          try {
            const url = new URL(script.src);
            return url.hostname;
          } catch (e) {
            return null;
          }
        })
        .filter(domain => domain !== null);

      // Get unique domains
      const uniqueDomains = [...new Set(scriptDomains)];
      debug(
        `Checked ${allScripts.length} scripts from ${uniqueDomains.length} unique domains:`,
        uniqueDomains
      );

      // Show a hint about what we're looking for
      debug(
        'Looking for tracking domains like: facebook.net, google-analytics.com, snap.licdn.com, etc.'
      );
    }
  }

  // Validate latency requirement (<100ms per PRD)
  if (totalTime > 100) {
    console.warn(
      `EchoFootPrint: Detection exceeded 100ms target: ${totalTime}ms on ${window.location.hostname}`
    );
  }
}

/**
 * Initialize content script
 */
function init() {
  debug(`Content script loaded on ${window.location.hostname}`);

  // Run initial detection after page settles
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runPixelDetection, DETECTION_DELAY_MS);
    });
  } else {
    // DOM already loaded
    setTimeout(runPixelDetection, DETECTION_DELAY_MS);
  }

  // Setup observer for dynamically loaded pixels. The observer callback
  // re-checks shouldRecord() and the dedup set on every hit so paused or
  // excluded pages never emit, and observer/delayed-scan races are coalesced.
  const observer = observeDynamicPixels(async detection => {
    debug(`Dynamic pixel detected: ${detection.platform}`, detection);
    try {
      if (!(await shouldRecord())) return;
      recordDetections([detection], 'observer');
    } catch (error) {
      console.error('EchoFootPrint: observer pipeline failed:', error);
    }
  });

  // Cleanup observer when page unloads
  // Note: Using pagehide instead of unload to avoid Permissions Policy violations
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    debug('Content script unloaded');
  });
}

// Start the content script
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  init();
}
