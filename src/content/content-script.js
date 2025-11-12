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
const DEBUG_MODE = true; // Set to false in production
const DETECTION_DELAY_MS = 500; // Wait for page to settle before detection

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
    // Send message to service worker
    chrome.runtime.sendMessage(
      {
        type: 'PIXEL_DETECTED',
        data: detectionData,
      },
      response => {
        if (chrome.runtime.lastError) {
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
    console.error('EchoFootPrint: Failed to send detection:', error);
  }
}

/**
 * Detect Facebook ID from cookie (only on facebook.com)
 */
function detectFacebookID() {
  if (
    !window.location.hostname.includes('facebook.com') &&
    !window.location.hostname.includes('fb.com')
  ) {
    return;
  }

  try {
    const cookies = document.cookie.split(';');
    const cUserCookie = cookies.find(c => c.trim().startsWith('c_user='));

    if (cUserCookie) {
      const userId = cUserCookie.split('=')[1].trim();

      if (userId) {
        debug('Facebook user ID detected', userId.substring(0, 8) + '...');

        // Send to service worker for hashing and storage
        chrome.runtime.sendMessage(
          {
            type: 'FB_ID_DETECTED',
            userId: userId,
          },
          response => {
            if (chrome.runtime.lastError) {
              console.error(
                'EchoFootPrint: Error sending FB ID:',
                chrome.runtime.lastError
              );
            } else {
              debug('FB ID sent to service worker');
            }
          }
        );
      }
    }
  } catch (error) {
    console.error('EchoFootPrint: Error detecting Facebook ID:', error);
  }
}

/**
 * Main detection routine
 */
function runPixelDetection() {
  const startTime = performance.now();

  // Detect Facebook ID if on facebook.com
  detectFacebookID();

  // Run pixel detection
  const result = detectFacebookPixel();

  const totalTime = performance.now() - startTime;
  debug(`Detection completed in ${Math.round(totalTime * 100) / 100}ms`);

  if (result) {
    debug('Facebook Pixel detected!', result);
    sendPixelDetection(result);
  } else {
    debug('No Facebook Pixel detected on this page');
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
    debug('Dynamic pixel detected!', detectionData);
    sendPixelDetection(detectionData);
  });

  // Cleanup observer when page unloads
  window.addEventListener('unload', () => {
    observer.disconnect();
    debug('Content script unloaded');
  });
}

// Start the content script
init();
