/**
 * EchoFootPrint Service Worker (Manifest V3)
 * Orchestrates pixel detection and message relay
 * Per PRD: Must handle short-lived service worker lifecycle
 * Sprint 1: Now using IndexedDB for persistence
 */

import {
  addFootprint,
  getSetting,
  setSetting,
  getFootprintCount,
  getUniqueDomainCount,
  initDatabase,
} from '../lib/db-sw.js';
// Geolocation removed per user request
// import { queueGeolocationLookup, getQueueStats } from '../lib/geo-queue.js';

// Configuration
const DEBUG_MODE = false; // Set to true only during development

/**
 * Log debug messages
 * @param {string} message - Message to log
 * @param {*} data - Optional data to log
 */
function debug(message, data = null) {
  if (DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] [ServiceWorker] ${message}`, data);
    } else {
      console.log(`[${timestamp}] [ServiceWorker] ${message}`);
    }
  }
}

/**
 * Update browser action badge with current detection count
 * Shows total footprint count on the extension icon
 */
async function updateBadge() {
  try {
    const totalFootprints = await getFootprintCount();

    // Format badge text (show numbers up to 999, then 999+)
    let badgeText = '';
    if (totalFootprints > 0) {
      badgeText = totalFootprints > 999 ? '999+' : totalFootprints.toString();
    }

    // Set badge text
    await chrome.action.setBadgeText({ text: badgeText });

    // Set badge color (red to indicate tracking)
    await chrome.action.setBadgeBackgroundColor({ color: '#DC2626' }); // Red-600

    debug('Badge updated', { totalFootprints, badgeText });
  } catch (error) {
    console.error('ServiceWorker: Error updating badge:', error);
  }
}

/**
 * Handle pixel detection event
 * Per PRD: Persist to IndexedDB, normalize data, queue geolocation lookup
 * @param {Object} detectionData - Detection data from content script
 * @param {Object} sender - Message sender information
 * @returns {Promise<Object>} - Response object
 */
async function handlePixelDetection(detectionData, sender) {
  if (!detectionData || !detectionData.domain) {
    debug('Invalid detection data received', detectionData);
    return { success: false, error: 'Invalid detection data' };
  }

  try {
    const domain = detectionData.domain;

    // Geolocation removed per user request - no more API calls

    // Normalize detection data (no geolocation enrichment)
    const footprintData = {
      domain: domain,
      url: sender.tab?.url || detectionData.url || 'unknown',
      pixelType: detectionData.method || 'unknown',
      platform: detectionData.platform || 'unknown', // Multi-platform support
      timestamp: Date.now(),
    };

    // Persist to IndexedDB immediately (don't wait for geo)
    const id = await addFootprint(footprintData);

    debug('Pixel detection persisted to IndexedDB', {
      id,
      domain: footprintData.domain,
      pixelType: footprintData.pixelType,
    });

    // Get current stats
    const totalCount = await getFootprintCount();
    const uniqueDomains = await getUniqueDomainCount();

    // Update badge with new count
    await updateBadge();

    return {
      success: true,
      message: 'Detection logged',
      footprintId: id,
      stats: {
        totalFootprints: totalCount,
        uniqueDomains,
      },
    };
  } catch (error) {
    console.error('ServiceWorker: Error handling pixel detection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current statistics from IndexedDB
 * @returns {Promise<Object>} - Statistics
 */
async function getStats() {
  try {
    const totalFootprints = await getFootprintCount();
    const uniqueDomains = await getUniqueDomainCount();
    const installDate = await getSetting('installDate');

    return {
      totalFootprints,
      uniqueDomains,
      installDate,
    };
  } catch (error) {
    console.error('ServiceWorker: Error getting stats:', error);
    return {
      totalFootprints: 0,
      uniqueDomains: 0,
      error: error.message,
    };
  }
}

/**
 * Message listener - main entry point for content script communication
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug('Message received', { type: message.type, sender: sender.tab?.id });

  // Validate sender - only accept messages from our extension
  if (!sender.id || sender.id !== chrome.runtime.id) {
    console.warn(
      'ServiceWorker: Rejecting message from unknown sender:',
      sender.id
    );
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  // Validate message format
  if (!message || !message.type) {
    debug('Invalid message format', message);
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }

  // Handle different message types
  if (message.type === 'PIXEL_DETECTED') {
    // Handle pixel detection
    handlePixelDetection(message.data, sender)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        console.error('ServiceWorker: Error in PIXEL handler:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  }

  if (message.type === 'GET_STATS') {
    // Return statistics from IndexedDB (for debugging/dashboard)
    getStats()
      .then(stats => {
        sendResponse({
          success: true,
          stats: stats,
        });
      })
      .catch(error => {
        console.error('ServiceWorker: Error in GET_STATS handler:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }

  // Unknown message type
  debug('Unknown message type', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

/**
 * Service worker installation
 * Per PRD: Initialize IndexedDB on install
 */
chrome.runtime.onInstalled.addListener(async details => {
  debug('Extension installed/updated', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  try {
    // Initialize IndexedDB
    await initDatabase();
    debug('IndexedDB initialized successfully');

    // Set version in settings
    if (details.reason === 'install') {
      await setSetting(
        'extensionVersion',
        chrome.runtime.getManifest().version
      );
      debug('Initial database setup complete');
    } else if (details.reason === 'update') {
      const oldVersion = details.previousVersion;
      const newVersion = chrome.runtime.getManifest().version;
      await setSetting('extensionVersion', newVersion);
      debug('Extension updated', { from: oldVersion, to: newVersion });
    }

    // Initialize badge
    await updateBadge();
  } catch (error) {
    console.error('ServiceWorker: Error initializing database:', error);
  }
});

/**
 * Service worker startup
 * Per PRD: Service workers are short-lived, so state is in IndexedDB
 */
chrome.runtime.onStartup.addListener(async () => {
  debug('Service worker started');

  try {
    // Initialize database connection
    await initDatabase();

    // Log current stats
    const stats = await getStats();
    debug('Service worker ready', stats);

    // Update badge with current count
    await updateBadge();
  } catch (error) {
    console.error('ServiceWorker: Error on startup:', error);
  }
});

/**
 * Extension icon click handler
 */
chrome.action.onClicked.addListener(tab => {
  debug('Extension icon clicked', { tabId: tab.id });

  // Open dashboard in new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/dashboard/index.html'),
  });
});

debug('Service worker initialized');
