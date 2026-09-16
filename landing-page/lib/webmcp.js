import { SITE_ORIGIN } from './site-origin.js';

const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/pbabepaamiligomhlcmkjabhmkmaekci?utm_source=item-share-cb';

const LANDING_SECTIONS = [
  { id: 'install', label: 'Hero and install CTA' },
  { id: 'how-it-works', label: 'How EchoFootPrint works' },
  { id: 'views', label: 'Dashboard views showcase' },
  { id: 'features', label: 'Product features' },
  { id: 'platforms', label: 'Platform coverage (50 trackers)' },
  { id: 'privacy', label: 'Privacy guarantees' },
  { id: 'faq', label: 'Frequently asked questions' },
];

/**
 * Read-only tools for in-browser agents via WebMCP
 * (`navigator.modelContext` / `document.modelContext`). No telemetry or
 * third-party calls — only public site content and in-page navigation.
 */
export function createWebMcpTools({ fetchImpl, document: doc } = {}) {
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));
  const hostDoc =
    doc ?? (typeof document === 'undefined' ? undefined : document);

  return [
    {
      name: 'get_site_overview',
      description:
        'Returns EchoFootPrint marketing site summary and machine-readable discovery URLs.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: () => ({
        name: 'EchoFootPrint',
        url: `${SITE_ORIGIN}/`,
        description:
          'Privacy-first browser extension that reveals cross-site tracking from 50 major ad and analytics platforms. All data stays on your device.',
        resources: {
          llmsTxt: `${SITE_ORIGIN}/llms.txt`,
          agentCard: `${SITE_ORIGIN}/.well-known/agent-card.json`,
          agentSkills: `${SITE_ORIGIN}/.well-known/agent-skills/index.json`,
          apiCatalog: `${SITE_ORIGIN}/.well-known/api-catalog`,
          aiCatalog: `${SITE_ORIGIN}/.well-known/ai-catalog.json`,
          mcpServerCard: `${SITE_ORIGIN}/.well-known/mcp/server-card.json`,
          authPolicy: `${SITE_ORIGIN}/auth.md`,
        },
        installUrl: CHROME_STORE_URL,
        source: 'https://github.com/luongnv89/echo-footprint',
      }),
    },
    {
      name: 'list_pages',
      description:
        'Lists public pages on echo-footprint.luongnv.com with titles and URLs.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: () => [
        {
          path: '/',
          title: 'EchoFootPrint — See who tracks you across the web',
          url: `${SITE_ORIGIN}/`,
          markdown: `${SITE_ORIGIN}/index.md`,
        },
        {
          path: '/privacy.html',
          title: 'EchoFootPrint Privacy Policy',
          url: `${SITE_ORIGIN}/privacy.html`,
        },
      ],
    },
    {
      name: 'get_page_markdown',
      description:
        "Fetches the markdown alternate for the home page (path must be '/' ).",
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: "Route path; only '/' is supported today",
          },
        },
        required: ['path'],
        additionalProperties: false,
      },
      execute: async ({ path } = {}) => {
        if (path !== '/') {
          return {
            error: `unknown page '${path}'`,
            pages: ['/', '/privacy.html'],
          };
        }
        const response = await doFetch(`${SITE_ORIGIN}/index.md`);
        if (!response.ok) {
          return {
            error: `markdown fetch failed (${response.status})`,
            path: '/',
          };
        }
        return { path: '/', markdown: await response.text() };
      },
    },
    {
      name: 'get_product_facts',
      description:
        'Returns canonical EchoFootPrint product facts: platforms, views, privacy model, and version.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: () => ({
        name: 'EchoFootPrint',
        version: '1.3.0',
        platformsDetected: 50,
        dashboardViews: ['radial graph', 'bipartite graph', 'map', 'data table'],
        storage: 'local IndexedDB only',
        telemetry: false,
        geolocation: 'opt-in in extension settings only',
        installUrl: CHROME_STORE_URL,
      }),
    },
    {
      name: 'list_landing_sections',
      description:
        'Lists in-page sections on the marketing homepage for navigation or Q&A.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: () => LANDING_SECTIONS,
    },
    {
      name: 'navigate_to_section',
      description:
        'Scrolls the homepage to a section id such as how-it-works, views, or faq.',
      inputSchema: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description: 'HTML id attribute, e.g. how-it-works, faq, platforms',
          },
        },
        required: ['sectionId'],
        additionalProperties: false,
      },
      execute: ({ sectionId } = {}) => {
        const known = LANDING_SECTIONS.find((s) => s.id === sectionId);
        if (!known) {
          return {
            error: `unknown section '${sectionId}'`,
            sections: LANDING_SECTIONS.map((s) => s.id),
          };
        }
        if (hostDoc) {
          const el = hostDoc.getElementById(sectionId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return { scrolledTo: sectionId, label: known.label };
          }
        }
        return {
          sectionId,
          label: known.label,
          url: `${SITE_ORIGIN}/#${sectionId}`,
        };
      },
    },
    {
      name: 'search_site',
      description:
        'Searches visible text on the current landing page for a query string.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Case-insensitive search text' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      execute: ({ query } = {}) => {
        const q = String(query ?? '').trim().toLowerCase();
        if (!q) {
          return { error: 'query is required' };
        }
        const results = [];
        if (hostDoc) {
          hostDoc.querySelectorAll('h1, h2, h3, p, li, summary').forEach((el) => {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.toLowerCase().includes(q) && results.length < 8) {
              results.push(text.slice(0, 200));
            }
          });
        }
        return {
          query,
          results: results.length
            ? results
            : [`No on-page matches. See ${SITE_ORIGIN}/llms.txt for site index.`],
        };
      },
    },
  ];
}

/**
 * Registers tools with the browser WebMCP provider. No-op when the API is
 * absent. Never throws.
 *
 * @returns {{ registered: number, controller: AbortController | null }}
 */
export function installWebMcp({ navigator: nav, document: doc, fetchImpl } = {}) {
  const hostNav = nav ?? (typeof navigator === 'undefined' ? undefined : navigator);
  const hostDoc = doc ?? (typeof document === 'undefined' ? undefined : document);
  const modelContext = hostNav?.modelContext ?? hostDoc?.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return { registered: 0, controller: null };
  }
  const controller =
    typeof AbortController === 'undefined' ? null : new AbortController();
  const options = controller ? { signal: controller.signal } : undefined;
  let registered = 0;
  for (const tool of createWebMcpTools({ fetchImpl, document: hostDoc })) {
    try {
      const result = modelContext.registerTool(tool, options);
      if (result?.catch) result.catch(() => {});
      registered += 1;
    } catch {
      try {
        modelContext.registerTool(tool);
        registered += 1;
      } catch {
        // Unsupported in this browser build.
      }
    }
  }
  if (controller && typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => controller.abort(), { once: true });
  }
  return { registered, controller };
}
