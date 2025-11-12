/**
 * Facebook Pixel Detector
 * Detects Facebook/Meta tracking pixels and scripts across web pages
 * Target: <100ms detection latency per PRD requirements
 */

// Whitelisted Facebook domains for pixel detection
const FB_DOMAINS = [
  'connect.facebook.net',
  'facebook.com/tr',
  'fbcdn.net',
  'facebook.net',
];

/**
 * Check if a URL contains any Facebook tracking domain
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL contains Facebook domain
 */
function isFacebookDomain(url) {
  if (!url) return false;
  return FB_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Detect Facebook Pixel from script tags in the DOM
 * @returns {Object|null} - Detection result or null
 */
export function detectFacebookPixelScripts() {
  const startTime = performance.now();

  try {
    // Find all script tags
    const scripts = Array.from(document.querySelectorAll('script'));

    // Filter for Facebook domains (check if src exists)
    const fbScripts = scripts.filter(script => script.src && isFacebookDomain(script.src));

    if (fbScripts.length > 0) {
      const detectionTime = performance.now() - startTime;

      return {
        detected: true,
        method: 'script',
        domain: window.location.hostname,
        url: window.location.href,
        pixelType: 'script',
        scriptSrc: fbScripts[0].src,
        count: fbScripts.length,
        detectionLatency: Math.round(detectionTime * 100) / 100, // Round to 2 decimals
        timestamp: Date.now(),
      };
    }

    return null;
  } catch (error) {
    console.error('EchoFootPrint: Error detecting scripts:', error);
    return null;
  }
}

/**
 * Detect Facebook Pixel from img/iframe elements
 * @returns {Object|null} - Detection result or null
 */
export function detectFacebookPixelElements() {
  const startTime = performance.now();

  try {
    // Check for tracking pixels (img tags)
    const imgs = Array.from(document.querySelectorAll('img'));
    const fbImgs = imgs.filter(img => img.src && isFacebookDomain(img.src));

    if (fbImgs.length > 0) {
      const detectionTime = performance.now() - startTime;

      return {
        detected: true,
        method: 'img',
        domain: window.location.hostname,
        url: window.location.href,
        pixelType: 'beacon',
        count: fbImgs.length,
        detectionLatency: Math.round(detectionTime * 100) / 100,
        timestamp: Date.now(),
      };
    }

    // Check for iframes
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const fbIframes = iframes.filter(iframe => iframe.src && isFacebookDomain(iframe.src));

    if (fbIframes.length > 0) {
      const detectionTime = performance.now() - startTime;

      return {
        detected: true,
        method: 'iframe',
        domain: window.location.hostname,
        url: window.location.href,
        pixelType: 'iframe',
        count: fbIframes.length,
        detectionLatency: Math.round(detectionTime * 100) / 100,
        timestamp: Date.now(),
      };
    }

    return null;
  } catch (error) {
    console.error('EchoFootPrint: Error detecting elements:', error);
    return null;
  }
}

/**
 * Comprehensive Facebook Pixel detection
 * Combines multiple detection methods
 * @returns {Object|null} - Detection result or null
 */
export function detectFacebookPixel() {
  const startTime = performance.now();

  // Skip detection on Facebook's own domains to avoid self-tracking noise
  if (window.location.hostname.includes('facebook.com')) {
    return null;
  }

  try {
    // Try script detection first (most common)
    let result = detectFacebookPixelScripts();
    if (result) {
      return result;
    }

    // Try element detection
    result = detectFacebookPixelElements();
    if (result) {
      return result;
    }

    // No pixel detected
    const detectionTime = performance.now() - startTime;

    // Log performance for debugging (only if >50ms)
    if (detectionTime > 50) {
      console.warn(
        `EchoFootPrint: Slow detection on ${window.location.hostname}: ${detectionTime}ms`
      );
    }

    return null;
  } catch (error) {
    console.error('EchoFootPrint: Detection error:', error);
    return null;
  }
}

/**
 * Setup MutationObserver to detect dynamically loaded pixels
 * @param {Function} callback - Called when pixel is detected
 * @returns {MutationObserver} - Observer instance
 */
export function observeDynamicPixels(callback) {
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes are scripts with Facebook domains
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'SCRIPT' && node.src) {
            if (isFacebookDomain(node.src)) {
              callback({
                detected: true,
                method: 'dynamic-script',
                domain: window.location.hostname,
                url: window.location.href,
                pixelType: 'script',
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
