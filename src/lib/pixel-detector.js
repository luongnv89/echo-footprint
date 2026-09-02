/**
 * Multi-Platform Tracking Pixel Detector
 * Detects tracking pixels from 50 major ad network platforms
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
    color: '#34A853', // Google Green (distinct from FB blue)
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
    color: '#000000', // TikTok Black
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
    color: '#F25022', // Microsoft Red/Orange
  },
  criteo: {
    name: 'Criteo',
    domains: [
      'static.criteo.net',
      'dis.criteo.com',
      'gum.criteo.com',
      'sslwidget.criteo.com',
      'dynamic.criteo.com',
      'bidder.criteo.com',
    ],
    color: '#F48020', // Criteo orange
  },
  tradedesk: {
    name: 'The Trade Desk',
    domains: [
      'adsrvr.org',
      'insight.adsrvr.org',
      'match.adsrvr.org',
      'px.ads.linkedin.com/collect/?pid=',
      'analytics.twitter.com/i/adsct',
    ],
    color: '#2C3E50', // Dark Slate
  },
  taboola: {
    name: 'Taboola',
    domains: [
      'cdn.taboola.com',
      'trc.taboola.com',
      'api.taboola.com',
      'nr.taboola.com',
      'cdn-images.taboola.com',
    ],
    color: '#1E4FFF', // Taboola blue
  },
  outbrain: {
    name: 'Outbrain',
    domains: [
      'widgets.outbrain.com',
      'amplify.outbrain.com',
      'log.outbrain.com',
      'images.outbrain.com',
      'tr.outbrain.com',
    ],
    color: '#EE6513', // Outbrain orange
  },
  yahoo: {
    name: 'Yahoo DSP',
    domains: [
      'sp.analytics.yahoo.com',
      'ads.yahoo.com',
      'pixel.advertising.com',
      'ads.yap.yahoo.com',
      'ups.analytics.yahoo.com',
      'gemini.yahoo.com',
    ],
    color: '#6001D2', // Yahoo purple
  },
  xandr: {
    name: 'AppNexus/Xandr',
    domains: [
      'ib.adnxs.com',
      'secure.adnxs.com',
      'acdn.adnxs.com',
      'nym1.ib.adnxs.com',
      'adnxs.com/seg',
      'secure.adnxs-simple.com',
    ],
    color: '#1ABC9C', // Turquoise
  },
  openx: {
    name: 'OpenX',
    domains: [
      'openx.net',
      'servedby.openx.net',
      'd.openx.net',
      'u.openx.net',
      'ox-d.openx.net',
    ],
    color: '#E94B3C', // OpenX red
  },
  indexexchange: {
    name: 'Index Exchange',
    domains: [
      'casalemedia.com',
      'ad.c-e.io',
      'ssum.casalemedia.com',
      'js-sec.indexww.com',
      'as-sec.casalemedia.com',
    ],
    color: '#00B2A9', // Index Exchange teal
  },
  pubmatic: {
    name: 'PubMatic',
    domains: [
      'ads.pubmatic.com',
      'image6.pubmatic.com',
      'showads.pubmatic.com',
      'gads.pubmatic.com',
      'aktrack.pubmatic.com',
    ],
    color: '#8E44AD', // Purple
  },
  magnite: {
    name: 'Magnite',
    domains: [
      'rubiconproject.com',
      'fastlane.rubiconproject.com',
      'pixel.rubiconproject.com',
      'optimized-by.rubiconproject.com',
      'eus.rubiconproject.com',
      'telaria.com',
      'ads.tremorhub.com',
    ],
    color: '#16A085', // Greenish Teal
  },
  quantcast: {
    name: 'Quantcast',
    domains: [
      'pixel.quantserve.com',
      'secure.quantserve.com',
      'rules.quantcount.com',
      'cdn.quantcount.com',
      'tags.quantcount.com',
    ],
    color: '#2980B9', // Strong Blue
  },
  medianet: {
    name: 'Media.net',
    domains: [
      'contextual.media.net',
      'static.media.net',
      'data.cnetcontent.com',
      'media.net/tags',
      'bidder.media.net',
    ],
    color: '#D35400', // Pumpkin
  },
  adroll: {
    name: 'AdRoll',
    domains: [
      'd.adroll.com',
      's.adroll.com',
      'a.adroll.com',
      'pixel.adroll.com',
      'ipv4.d.adroll.com',
    ],
    color: '#2ECC71', // Emerald
  },
  revcontent: {
    name: 'RevContent',
    domains: [
      'trends.revcontent.com',
      'cdn.revcontent.com',
      'labs-cdn.revcontent.com',
      'img.revcontent.com',
    ],
    color: '#C0392B', // Dark Red
  },
  inmobi: {
    name: 'InMobi',
    domains: [
      'cdn.inmobi.com',
      'w.inmobi.com',
      'ssp-nj.w.inmobi.com',
      'tracking.w.inmobi.com',
      'outcome-ssp.w.inmobi.com',
    ],
    color: '#7F8C8D', // Grey
  },
  smaato: {
    name: 'Smaato',
    domains: [
      'soma.smaato.net',
      'prebid.smaato.net',
      'image.smaato.net',
      's.smaato.net',
      'c.smaato.net',
    ],
    color: '#F1C40F', // Yellow
  },
  unity: {
    name: 'Unity Ads',
    domains: [
      'unityads.unity3d.com',
      'auction.unityads.unity3d.com',
      'webview.unityads.unity3d.com',
      'config.unityads.unity3d.com',
      'publisher-event.unityads.unity3d.com',
    ],
    color: '#4A4A4A', // Dark Grey
  },
  ironsource: {
    name: 'IronSource',
    domains: [
      'platform.ironsrc.com',
      'outcome-ssp.supersonicads.com',
      'init.supersonicads.com',
      'acdn.supersonic.com',
      'track.atom-data.io',
    ],
    color: '#8B4513', // Saddle Brown
  },
  vungle: {
    name: 'Vungle',
    domains: [
      'ads.api.vungle.com',
      'config.vungle.com',
      'cdn-lb.vungle.com',
      'cdn-lb-is.vungle.com',
      'tpsv.vungle.com',
    ],
    color: '#27AE60', // Green
  },
  chartboost: {
    name: 'Chartboost',
    domains: [
      'live.chartboost.com',
      'da.chartboost.com',
      'ssp.chartboost.com',
      'auction.chartboost.com',
      'sdk.chartboost.com',
    ],
    color: '#9B59B6', // Amethyst
  },
  moloco: {
    name: 'Moloco Ads',
    domains: [
      'rmp-api.moloco.com',
      'decision.rmp.moloco.com',
      'rtb.rmp.moloco.com',
      'event.rmp.moloco.com',
    ],
    color: '#5B47D6', // Moloco purple
  },
  digitalturbine: {
    name: 'Digital Turbine (AdColony)',
    domains: [
      'adcolony.com',
      'adc3-launch.adcolony.com',
      'wd.adcolony.com',
      'events3-launch.adcolony.com',
      'androidads23.adcolony.com',
    ],
    color: '#34495E', // Wet Asphalt
  },
  flurry: {
    name: 'Flurry',
    domains: [
      'data.flurry.com',
      'ads.flurry.com',
      'cdn.flurry.com',
      'proxytest.flurry.com',
    ],
    color: '#6E48AA', // Flurry purple
  },
  kargo: {
    name: 'Kargo',
    domains: [
      'storage.cloud.kargo.com',
      'krk.kargo.com',
      'https.kargo.com',
      'ad-sync.kargo.com',
    ],
    color: '#00C7B7', // Kargo teal
  },
  triplelift: {
    name: 'TripleLift',
    domains: [
      'tlx.3lift.com',
      'eb2.3lift.com',
      'ib.3lift.com',
      'segment-data.3lift.com',
    ],
    color: '#E67E22', // Carrot
  },
  zetaglobal: {
    name: 'Zeta Global',
    domains: [
      'tags.zetaglobal.net',
      'c.zetaglobal.com',
      'ssp.zetaglobal.net',
      'e.zetaglobal.com',
      'zdt.zetaglobal.net',
    ],
    color: '#FF5A00', // Zeta orange
  },
  lotame: {
    name: 'Lotame',
    domains: [
      'tags.crwdcntrl.net',
      'bcp.crwdcntrl.net',
      'sync.crwdcntrl.net',
      'crowdcntrl.com',
      'ad.crwdcntrl.net',
    ],
    color: '#E31C79', // Lotame pink
  },
  nielsen: {
    name: 'Nielsen Marketing Cloud',
    domains: [
      'secure-us.imrworldwide.com',
      'secure-drm.imrworldwide.com',
      'cdn-gl.imrworldwide.com',
      'udat.imrworldwide.com',
      'imrworldwide.com/cgi-bin',
    ],
    color: '#000080', // Navy
  },
  bluekai: {
    name: 'Oracle BlueKai',
    domains: [
      'tags.bluekai.com',
      'bluekai.com/site/',
      'stags.bluekai.com',
      'bkrtx.com',
    ],
    color: '#C74634', // Oracle red
  },
  epsilon: {
    name: 'Epsilon',
    domains: [
      'tags.mathtag.com',
      'pixel.mathtag.com',
      'sync.mathtag.com',
      'action.mathtag.com',
    ],
    color: '#FF00FF', // Magenta
  },
  acxiom: {
    name: 'Acxiom',
    domains: [
      'pippio.com',
      'sync.srv.stackadapt.com/cm/',
      'pixel.acxiom-online.com',
      'ads.linkedin.com/collect',
    ],
    color: '#008080', // Teal
  },
  experian: {
    name: 'Experian Marketing Services',
    domains: [
      'd.company-target.com',
      'pix.impdesk.com',
      'pixel.tapad.com',
      'exp-tas.com',
      'tapad.com/cs',
    ],
    color: '#4B0082', // Indigo
  },
  stackadapt: {
    name: 'StackAdapt',
    domains: [
      'srv.stackadapt.com',
      'sync.srv.stackadapt.com',
      'static.stackadapt.com',
      'pixel.stackadapt.com',
    ],
    color: '#FFD700', // Gold
  },
  basis: {
    name: 'Basis DSP (Centro)',
    domains: ['centro.net', 'tags.w55c.net', 'ads.w55c.net', 'match.w55c.net'],
    color: '#FF3B3F', // Basis red
  },
  amobee: {
    name: 'Amobee',
    domains: [
      'pixels.ad.gt',
      'sync.ad.gt',
      'c.turn.com',
      'r.turn.com',
      'id.ad.gt',
    ],
    color: '#FF5700', // Amobee orange
  },
  verizon: {
    name: 'Verizon Media DSP',
    domains: [
      'ads.yahoo.com',
      'beap.gemini.yahoo.com',
      'match.prod.bidr.io',
      'pixel.advertising.com',
      'udc.yahoo.com',
    ],
    color: '#CD040B', // Verizon red
  },
  adform: {
    name: 'Adform',
    domains: [
      'track.adform.net',
      'adx.adform.net',
      'cm.adform.net',
      's2.adform.net',
      'a2.adform.net',
    ],
    color: '#00CED1', // Dark Turquoise
  },
  sovrn: {
    name: 'Sovrn',
    domains: [
      'ap.lijit.com',
      'px.lijit.com',
      'beacon.lijit.com',
      'cdn.lijit.com',
      'data.lijit.com',
    ],
    color: '#B22222', // Firebrick
  },
  bidswitch: {
    name: 'BidSwitch',
    domains: [
      'x.bidswitch.net',
      'rtb.bidswitch.net',
      'sync.bidswitch.net',
      'us-east.bidswitch.net',
    ],
    color: '#4682B4', // Steel Blue
  },
  smartyads: {
    name: 'SmartyAds DSP',
    domains: ['n1.smartyads.com', 'pixel.smartyads.com', 'dsp.smartyads.com'],
    color: '#DA70D6', // Orchid
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
