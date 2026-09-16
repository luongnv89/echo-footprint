/**
 * RFC 8288 Link headers on the homepage for agent discovery.
 * @see https://isitagentready.com/.well-known/agent-skills/link-headers/SKILL.md
 */

/** Comma-separated Link header field value (RFC 8288). */
export const HOME_PAGE_LINK_VALUE =
  '</llms.txt>; rel="describedby"; type="text/plain", ' +
  '</index.md>; rel="alternate"; type="text/markdown"';

export function isHomepagePath(pathname) {
  if (!pathname || pathname === '/') return true;
  return pathname === '/index.html';
}

export function setHomeLinkHeader(headers) {
  headers.set('link', HOME_PAGE_LINK_VALUE);
}

/**
 * Clone a Response and attach homepage Link headers when pathname is the site root.
 */
export function withHomeLinkHeaders(response, pathname) {
  if (!isHomepagePath(pathname)) {
    return response;
  }
  const headers = new Headers(response.headers);
  setHomeLinkHeader(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
