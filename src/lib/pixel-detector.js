/**
 * Multi-Platform Tracking Pixel Detector
 * Detects tracking pixels from 10 major platforms:
 * - Facebook/Meta (includes Instagram, WhatsApp)
 * - Google (includes YouTube, DoubleClick)
 * - Twitter/X
 * - LinkedIn
 * - TikTok
 * - Amazon
 * - Pinterest
 * - Snapchat
 * - Reddit
 * - Microsoft/Bing (includes Clarity)
 * Target: <100ms detection latency per PRD requirements
 */

// Platform tracking configurations
export const TRACKING_PLATFORMS = {
  facebook: {
    name: 'Facebook/Meta',
    description: 'Includes Facebook, Instagram, and WhatsApp tracking',
    domains: [
      'connect.facebook.net',
      'facebook.com/tr',
      'fbcdn.net',
      'facebook.net',
      'instagram.com/embed.js',
      'instagram.com/logging',
    ],
    color: '#1877f2', // Facebook blue
  },
  google: {
    name: 'Google',
    domains: [
      'google-analytics.com',
      'www.google-analytics.com',
      'ssl.google-analytics.com',
      'googletagmanager.com',
      'www.googletagmanager.com',
      'doubleclick.net',
      'stats.g.doubleclick.net',
      'googlesyndication.com',
      'pagead2.googlesyndication.com',
      'googleadservices.com',
      'www.googleadservices.com',
      'google.com/ads/ga-audiences',
      'www.google.com/analytics',
      'region1.google-analytics.com',
      'region1.analytics.google.com',
    ],
    color: '#4285f4', // Google blue
  },
  twitter: {
    name: 'Twitter/X',
    domains: [
      'analytics.twitter.com',
      'static.ads-twitter.com',
      'platform.twitter.com',
      'cdn.syndication.twimg.com',
      't.co/',
      'analytics.x.com',
      'static.ads-x.com',
      'platform.x.com',
      'x.com/i/api',
    ],
    color: '#1DA1F2', // Twitter blue
  },
  linkedin: {
    name: 'LinkedIn',
    domains: [
      'snap.licdn.com',
      'www.linkedin.com/px/',
      'platform.linkedin.com',
      'linkedin.com/li/track',
    ],
    color: '#0A66C2', // LinkedIn blue
  },
  tiktok: {
    name: 'TikTok',
    domains: [
      'analytics.tiktok.com',
      'www.tiktok.com/events',
      'analytics-sg.tiktok.com',
      'business-api.tiktok.com',
      'analytics.tiktokv.com',
    ],
    color: '#FF0050', // TikTok pink/red
  },
  amazon: {
    name: 'Amazon',
    domains: [
      'amazon-adsystem.com',
      'aax.amazon-adsystem.com',
      's.amazon-adsystem.com',
      'assoc-amazon.com',
      'completion.amazon.com',
      'fls-na.amazon.com',
      'fls-eu.amazon.com',
      'amazon.com/gp/cm/ajax/log',
    ],
    color: '#FF9900', // Amazon orange
  },
  pinterest: {
    name: 'Pinterest',
    domains: [
      'ct.pinterest.com',
      'log.pinterest.com',
      'analytics.pinterest.com',
      'widgets.pinterest.com',
      's.pinimg.com',
      'ct.pinterest.net',
    ],
    color: '#E60023', // Pinterest red
  },
  snapchat: {
    name: 'Snapchat',
    domains: [
      'sc-static.net',
      'app-analytics.snapchat.com',
      'tr.snapchat.com',
      'sc-cdn.net',
    ],
    color: '#FFFC00', // Snapchat yellow
  },
  reddit: {
    name: 'Reddit',
    domains: [
      'rdt.reddit.com',
      'events.redditmedia.com',
      'alb.reddit.com',
      'pixel.redditmedia.com',
    ],
    color: '#FF4500', // Reddit orange
  },
  microsoft: {
    name: 'Microsoft/Bing',
    domains: [
      'bat.bing.com',
      'udc.msn.com',
      'c.bing.com',
      'analytics.live.com',
      'clarity.ms',
    ],
    color: '#00A4EF', // Microsoft blue
  },
};

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
 * Legacy function for backward compatibility
 * @deprecated Use detectPlatformFromUrl instead
 */
function isFacebookDomain(url) {
  return detectPlatformFromUrl(url) === 'facebook';
}

/**
 * Detect tracking pixel from script tags in the DOM
 * @returns {Object|null} - Detection result or null
 */
export function detectFacebookPixelScripts() {
  const startTime = performance.now();

  try {
    // Find all script tags
    const scripts = Array.from(document.querySelectorAll('script[src]'));

    // Check each script for tracking platforms
    // Early return on first match for performance
    for (const script of scripts) {
      const platform = detectPlatformFromUrl(script.src);
      if (platform) {
        const detectionTime = performance.now() - startTime;

        return {
          detected: true,
          method: 'script',
          domain: window.location.hostname || 'localhost',
          url: window.location.href,
          pixelType: 'script',
          platform: platform,
          scriptSrc: script.src,
          detectionLatency: Math.round(detectionTime * 100) / 100,
          timestamp: Date.now(),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('EchoFootPrint: Error detecting scripts:', error);
    return null;
  }
}

/**
 * Detect tracking pixel from img/iframe elements
 * @returns {Object|null} - Detection result or null
 */
export function detectFacebookPixelElements() {
  const startTime = performance.now();

  try {
    // Check for tracking pixels (img tags)
    const imgs = Array.from(document.querySelectorAll('img[src]'));
    for (const img of imgs) {
      const platform = detectPlatformFromUrl(img.src);
      if (platform) {
        const detectionTime = performance.now() - startTime;

        return {
          detected: true,
          method: 'img',
          domain: window.location.hostname || 'localhost',
          url: window.location.href,
          pixelType: 'beacon',
          platform: platform,
          detectionLatency: Math.round(detectionTime * 100) / 100,
          timestamp: Date.now(),
        };
      }
    }

    // Check for iframes
    const iframes = Array.from(document.querySelectorAll('iframe[src]'));
    for (const iframe of iframes) {
      const platform = detectPlatformFromUrl(iframe.src);
      if (platform) {
        const detectionTime = performance.now() - startTime;

        return {
          detected: true,
          method: 'iframe',
          domain: window.location.hostname || 'localhost',
          url: window.location.href,
          pixelType: 'iframe',
          platform: platform,
          detectionLatency: Math.round(detectionTime * 100) / 100,
          timestamp: Date.now(),
        };
      }
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

  // Track all domains including facebook.com (per user request)

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
    // Track all domains including facebook.com (per user request)

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if any added nodes are scripts with tracking domains
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'SCRIPT' && node.src) {
            const platform = detectPlatformFromUrl(node.src);
            if (platform) {
              callback({
                detected: true,
                method: 'dynamic-script',
                domain: window.location.hostname || 'localhost',
                url: window.location.href,
                pixelType: 'script',
                platform: platform, // New: platform identifier
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
