/**
 * EchoFootPrint Service Worker (Manifest V3)
 * Orchestrates pixel detection, Facebook ID hashing, and message relay
 * Per PRD: Must handle short-lived service worker lifecycle
 */

// Configuration
const DEBUG_MODE = true;

// In-memory queue for POC (will be replaced with IndexedDB in Sprint 1)
let detectionQueue = [];
let facebookIdHash = null;

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
 * Hash Facebook ID using SHA-256
 * @param {string} userId - Raw Facebook user ID
 * @returns {Promise<string>} - Hashed ID
 */
async function hashFacebookID(userId) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    debug('Facebook ID hashed successfully', {
      originalLength: userId.length,
      hashLength: hashHex.length,
      hashPreview: hashHex.substring(0, 16) + '...',
    });

    return hashHex;
  } catch (error) {
    console.error('ServiceWorker: Error hashing Facebook ID:', error);
    return null;
  }
}

/**
 * Handle Facebook ID detection event
 * @param {string} userId - Raw Facebook user ID
 * @returns {Promise<Object>} - Response object
 */
async function handleFacebookID(userId) {
  if (!userId || typeof userId !== 'string') {
    debug('Invalid Facebook ID received', userId);
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    // Hash the ID
    const hashedId = await hashFacebookID(userId);

    if (hashedId) {
      facebookIdHash = hashedId;

      // Store in chrome.storage.local for persistence across service worker restarts
      await chrome.storage.local.set({ fbIdHash: hashedId });

      debug('Facebook ID stored', {
        hash: hashedId.substring(0, 16) + '...',
      });

      return {
        success: true,
        message: 'Facebook ID hashed and stored',
        hashPreview: hashedId.substring(0, 8),
      };
    } else {
      return { success: false, error: 'Hashing failed' };
    }
  } catch (error) {
    console.error('ServiceWorker: Error handling Facebook ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle pixel detection event
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
    // Enrich detection data with tab information
    const enrichedData = {
      ...detectionData,
      tabId: sender.tab?.id,
      tabUrl: sender.tab?.url,
      timestamp: Date.now(),
    };

    // Add to queue (POC - will use IndexedDB in Sprint 1)
    detectionQueue.push(enrichedData);

    debug('Pixel detection added to queue', {
      domain: enrichedData.domain,
      method: enrichedData.method,
      queueSize: detectionQueue.length,
    });

    // Keep queue size manageable (max 1000 items for POC)
    if (detectionQueue.length > 1000) {
      const removed = detectionQueue.shift();
      debug('Queue full, removed oldest entry', removed.domain);
    }

    return {
      success: true,
      message: 'Detection logged',
      queueSize: detectionQueue.length,
    };
  } catch (error) {
    console.error('ServiceWorker: Error handling pixel detection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current detection queue stats
 * @returns {Object} - Queue statistics
 */
function getQueueStats() {
  const uniqueDomains = new Set(detectionQueue.map(d => d.domain));

  return {
    totalDetections: detectionQueue.length,
    uniqueDomains: uniqueDomains.size,
    domains: Array.from(uniqueDomains),
    hasFacebookId: !!facebookIdHash,
    facebookIdPreview: facebookIdHash
      ? facebookIdHash.substring(0, 8) + '...'
      : null,
  };
}

/**
 * Message listener - main entry point for content script communication
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debug('Message received', { type: message.type, sender: sender.tab?.id });

  // Validate message format
  if (!message || !message.type) {
    debug('Invalid message format', message);
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }

  // Handle different message types
  if (message.type === 'FB_ID_DETECTED') {
    // Handle Facebook ID detection
    handleFacebookID(message.userId)
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        console.error('ServiceWorker: Error in FB_ID handler:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates async response
  }

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
    // Return queue statistics (for debugging/dashboard)
    const stats = getQueueStats();
    sendResponse({ success: true, stats });
    return false; // Synchronous response
  }

  // Unknown message type
  debug('Unknown message type', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

/**
 * Service worker installation
 */
chrome.runtime.onInstalled.addListener(details => {
  debug('Extension installed/updated', {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });

  // Initialize storage if needed
  if (details.reason === 'install') {
    chrome.storage.local.set({
      installDate: Date.now(),
      version: chrome.runtime.getManifest().version,
    });

    debug('Initial storage setup complete');
  }
});

/**
 * Service worker startup
 */
chrome.runtime.onStartup.addListener(() => {
  debug('Service worker started');

  // Restore Facebook ID hash from storage (if exists)
  chrome.storage.local.get(['fbIdHash'], result => {
    if (result.fbIdHash) {
      facebookIdHash = result.fbIdHash;
      debug('Facebook ID hash restored from storage');
    }
  });
});

/**
 * Extension icon click handler
 */
chrome.action.onClicked.addListener(tab => {
  debug('Extension icon clicked', { tabId: tab.id });

  // Open dashboard in new tab (will be implemented in Sprint 1)
  chrome.tabs.create({
    url: chrome.runtime.getURL('dashboard/index.html'),
  });
});

debug('Service worker initialized');
