import {
  prefersMarkdown,
  htmlPathToMarkdown,
  markdownResponseHeaders,
} from '../../landing-page/lib/markdown-negotiation.js';
import { withHomeLinkHeaders } from '../../landing-page/lib/link-headers.js';
import { withWellKnownContentType } from '../../landing-page/lib/well-known-content-types.js';

const DEFAULT_PAGES_ORIGIN = 'https://luongnv89.github.io/echo-footprint';

function pagesOrigin(env) {
  const raw = env.PAGES_ORIGIN || DEFAULT_PAGES_ORIGIN;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function originAssetUrl(env, pathname) {
  const origin = pagesOrigin(env);
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${suffix}`;
}

async function passThrough(request, env) {
  const url = new URL(request.url);
  let path = url.pathname;
  if (path === '/' || path === '') {
    path = '/index.html';
  }
  const target = originAssetUrl(env, path);
  const resp = await fetch(new Request(target, request));
  const typed = withWellKnownContentType(resp, url.pathname);
  return withHomeLinkHeaders(typed, url.pathname);
}

export default {
  async fetch(request, env) {
    const method = request.method;
    const url = new URL(request.url);

    if (method !== 'GET' && method !== 'HEAD') {
      return passThrough(request, env);
    }

    const accept = request.headers.get('accept') || '';
    if (!prefersMarkdown(accept)) {
      return passThrough(request, env);
    }

    const mdUrl = htmlPathToMarkdown(url);
    if (!mdUrl) {
      return passThrough(request, env);
    }

    const target = originAssetUrl(env, mdUrl.pathname);
    const mdResp = await fetch(new Request(target, { method }));

    if (!mdResp.ok) {
      return passThrough(request, env);
    }

    const body = method === 'GET' ? await mdResp.text() : null;
    const headers = markdownResponseHeaders(
      body,
      mdResp.headers.get('cache-control')
    );

    const mdResponse = new Response(method === 'HEAD' ? null : body, {
      status: 200,
      headers,
    });
    return withHomeLinkHeaders(mdResponse, url.pathname);
  },
};
