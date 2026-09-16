import {
  prefersMarkdown,
  htmlPathToMarkdown,
  markdownResponseHeaders,
} from './lib/markdown-negotiation.js';
import { withHomeLinkHeaders } from './lib/link-headers.js';

export default {
  async fetch(request, env) {
    const method = request.method;
    const url = new URL(request.url);

    if (method !== 'GET' && method !== 'HEAD') {
      const resp = await env.ASSETS.fetch(request);
      return withHomeLinkHeaders(resp, url.pathname);
    }

    const accept = request.headers.get('accept') || '';
    if (!prefersMarkdown(accept)) {
      const resp = await env.ASSETS.fetch(request);
      return withHomeLinkHeaders(resp, url.pathname);
    }

    const mdUrl = htmlPathToMarkdown(url);
    if (!mdUrl) {
      const resp = await env.ASSETS.fetch(request);
      return withHomeLinkHeaders(resp, url.pathname);
    }

    const mdRequest = new Request(mdUrl.toString(), {
      method,
      headers: new Headers(request.headers),
      redirect: 'manual',
    });
    const mdResp = await env.ASSETS.fetch(mdRequest);

    if (mdResp.status !== 200) {
      const resp = await env.ASSETS.fetch(request);
      return withHomeLinkHeaders(resp, url.pathname);
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

export { prefersMarkdown, htmlPathToMarkdown } from './lib/markdown-negotiation.js';
export {
  HOME_PAGE_LINK_VALUE,
  isHomepagePath,
  setHomeLinkHeader,
  withHomeLinkHeaders,
} from './lib/link-headers.js';
