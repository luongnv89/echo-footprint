/**
 * EchoFootPrint Content Script
 * Injected into all web pages to detect Facebook tracking pixels
 * Per PRD: <100ms detection latency, silent operation
 */

import {
  detectFacebookPixel,
  observeDynamicPixels,
} from '../lib/pixel-detector.js';

// Configuration
const DEBUG_MODE = false; // Set to true only during development
const DETECTION_DELAY_MS = 3000; // Wait 3 seconds for page to fully load (Facebook Pixel loads async)

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
 * Main detection routine
 */
function runPixelDetection() {
  const startTime = performance.now();

  debug(`Starting detection on ${window.location.hostname}`);

  // Count all scripts for debugging
  const allScripts = document.querySelectorAll('script[src]');
  debug(`Found ${allScripts.length} scripts on page`);

  // Run pixel detection
  const result = detectFacebookPixel();

  const totalTime = performance.now() - startTime;
  debug(`Detection completed in ${Math.round(totalTime * 100) / 100}ms`);

  if (result) {
    debug(`Tracking pixel detected: ${result.platform}`, result);
    sendPixelDetection(result);
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

  // Setup observer for dynamically loaded pixels
  const observer = observeDynamicPixels(detectionData => {
    debug(`Dynamic pixel detected: ${detectionData.platform}`, detectionData);
    sendPixelDetection(detectionData);
  });

  // Cleanup observer when page unloads
  // Note: Using pagehide instead of unload to avoid Permissions Policy violations
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    debug('Content script unloaded');
  });
}

// Start the content script
init();
