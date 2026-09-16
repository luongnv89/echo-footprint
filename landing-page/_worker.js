import {
  prefersMarkdown,
  htmlPathToMarkdown,
  markdownResponseHeaders,
} from './lib/markdown-negotiation.js';

export default {
  async fetch(request, env) {
    const method = request.method;
    if (method !== 'GET' && method !== 'HEAD') {
      return env.ASSETS.fetch(request);
    }

    const accept = request.headers.get('accept') || '';
    if (!prefersMarkdown(accept)) {
      return env.ASSETS.fetch(request);
    }

    const url = new URL(request.url);
    const mdUrl = htmlPathToMarkdown(url);
    if (!mdUrl) {
      return env.ASSETS.fetch(request);
    }

    const mdRequest = new Request(mdUrl.toString(), {
      method,
      headers: new Headers(request.headers),
      redirect: 'manual',
    });
    const mdResp = await env.ASSETS.fetch(mdRequest);

    if (mdResp.status !== 200) {
      return env.ASSETS.fetch(request);
    }

    const body = method === 'GET' ? await mdResp.text() : null;
    const headers = markdownResponseHeaders(body, mdResp.headers.get('cache-control'));

    return new Response(method === 'HEAD' ? null : body, {
      status: 200,
      headers,
    });
  },
};

export { prefersMarkdown, htmlPathToMarkdown } from './lib/markdown-negotiation.js';
