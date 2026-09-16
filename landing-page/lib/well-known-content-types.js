/**
 * Content-Type overrides for extensionless /.well-known discovery paths.
 * @see https://isitagentready.com/.well-known/agent-skills/
 */

export const WELL_KNOWN_CONTENT_TYPES = Object.freeze({
  '/.well-known/api-catalog': 'application/linkset+json; charset=utf-8',
  '/.well-known/oauth-protected-resource':
    'application/json; charset=utf-8',
  '/.well-known/oauth-authorization-server':
    'application/json; charset=utf-8',
});

export function contentTypeForWellKnownPath(pathname) {
  return WELL_KNOWN_CONTENT_TYPES[pathname] ?? null;
}

export function withWellKnownContentType(response, pathname) {
  const type = contentTypeForWellKnownPath(pathname);
  if (!type) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('content-type', type);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
