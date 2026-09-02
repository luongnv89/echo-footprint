/**
 * Tracking Platform Catalog (Pure Data)
 *
 * Static catalog of tracking-platform metadata (display name, domains, color)
 * used by the dashboard and the pixel detector. Kept as a pure data module so
 * the dashboard can import the catalog without pulling in DOM-touching
 * detection code, and the detector can import it without dragging in
 * presentation concerns.
 *
 * Issue #33 / F-CLEAN-002: previously co-located with detection logic in
 * `src/lib/pixel-detector.js`.
 */

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
