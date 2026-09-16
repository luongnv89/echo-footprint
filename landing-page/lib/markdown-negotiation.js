/**
 * Markdown for Agents content negotiation (Accept: text/markdown).
 * @see https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md
 */

export function prefersMarkdown(accept) {
  if (!accept) return false;
  let mdQ = -1;
  let bestOtherQ = -1;
  for (const raw of accept.split(',')) {
    const part = raw.trim();
    if (!part) continue;
    const segments = part.split(';').map((s) => s.trim());
    const type = segments[0].toLowerCase();
    let q = 1;
    for (const seg of segments.slice(1)) {
      if (seg.startsWith('q=')) {
        const parsed = parseFloat(seg.slice(2));
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (q <= 0) continue;
    if (type === 'text/markdown') {
      if (q > mdQ) mdQ = q;
    } else if (type !== '*/*' && type !== 'text/*') {
      if (q > bestOtherQ) bestOtherQ = q;
    }
  }
  if (mdQ < 0) return false;
  return mdQ >= bestOtherQ;
}

/**
 * Map an HTML route to the `.md` rendition path, or null for static assets.
 */
export function htmlPathToMarkdown(url) {
  let path = url.pathname;
  if (!path) return null;

  if (path.endsWith('/')) {
    path = `${path}index.md`;
  } else if (path.endsWith('.html')) {
    path = `${path.slice(0, -5)}.md`;
  } else {
    const lastSegment = path.split('/').pop() || '';
    if (lastSegment.includes('.')) return null;
    path = `${path}/index.md`;
  }

  const out = new URL(url.toString());
  out.pathname = path;
  out.search = '';
  return out;
}

export function approximateTokenCount(body, contentLength = 0) {
  const len = body != null ? body.length : contentLength;
  return Math.max(1, Math.ceil(len / 4));
}

export function markdownResponseHeaders(body, upstreamCacheControl) {
  const tokens = approximateTokenCount(body, body != null ? new TextEncoder().encode(body).byteLength : 0);
  const headers = new Headers();
  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('vary', 'Accept');
  headers.set('x-markdown-tokens', String(tokens));
  headers.set('x-content-type-options', 'nosniff');
  headers.set('cache-control', upstreamCacheControl || 'public, max-age=600');
  if (body != null) {
    headers.set('content-length', String(new TextEncoder().encode(body).byteLength));
  }
  return headers;
}
