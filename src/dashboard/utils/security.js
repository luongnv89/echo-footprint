/**
 * Security utilities for sanitizing user-controlled data.
 * Used to prevent XSS and unsafe protocol links in the dashboard.
 */

/**
 * Escape a string for safe interpolation into HTML (e.g. Leaflet popups).
 * External data (geolocation fields, domain names) must never be interpolated
 * into bindPopup HTML unescaped.
 * @param {*} value
 * @returns {string} HTML-safe string
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    ch =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch]
  );
}

/**
 * Sanitize URL to allow only safe protocols.
 * @param {string} url
 * @returns {string} Safe URL or '#' when invalid/blocked
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '#';
  }

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(
        `[Security] Blocked dangerous URL protocol: ${parsed.protocol}`
      );
      return '#';
    }

    return url;
  } catch (error) {
    console.warn(`[Security] Invalid URL format: ${url}`);
    return '#';
  }
}

/**
 * Check if URL is safe to render as a link.
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  return sanitizeUrl(url) !== '#';
}
