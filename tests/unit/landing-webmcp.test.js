import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '../../landing-page/lib/site-origin.js';
import {
  createWebMcpTools,
  installWebMcp,
} from '../../landing-page/lib/webmcp.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('landing WebMCP (#93)', () => {
  it('homepage loads WebMCP bootstrap on DOM ready', () => {
    const html = readFileSync(
      resolve(rootDir, 'landing-page/index.html'),
      'utf8'
    );
    expect(html).toContain('./lib/webmcp.js');
    expect(html).toContain('installWebMcp');
  });

  it('implementation calls navigator.modelContext.registerTool', () => {
    const source = readFileSync(
      resolve(rootDir, 'landing-page/lib/webmcp.js'),
      'utf8'
    );
    expect(source).toContain('registerTool');
    expect(source).toContain('modelContext');
  });
  it('defines well-formed tools with JSON Schema inputs', () => {
    const tools = createWebMcpTools();
    expect(tools.length).toBeGreaterThanOrEqual(3);
    const names = new Set();
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(names.has(tool.name)).toBe(false);
      names.add(tool.name);
      expect(tool.description?.length).toBeGreaterThan(10);
      expect(tool.inputSchema?.type).toBe('object');
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('get_site_overview references agent discovery URLs', () => {
    const overview = createWebMcpTools()
      .find((t) => t.name === 'get_site_overview')
      .execute();
    expect(overview.url).toBe(`${SITE_ORIGIN}/`);
    expect(overview.resources.agentSkills).toContain('agent-skills/index.json');
    expect(overview.installUrl).toContain('chromewebstore.google.com');
  });

  it('installWebMcp is a no-op without modelContext', () => {
    expect(installWebMcp({ navigator: {}, document: {} })).toEqual({
      registered: 0,
      controller: null,
    });
  });

  it('installWebMcp registers every tool with an AbortSignal', () => {
    const calls = [];
    const fake = {
      modelContext: {
        registerTool: (tool, opts) => {
          calls.push({ name: tool.name, hasSignal: Boolean(opts?.signal) });
          return Promise.resolve();
        },
      },
    };
    const { registered, controller } = installWebMcp({ navigator: fake });
    expect(registered).toBe(createWebMcpTools().length);
    expect(calls.every((c) => c.hasSignal)).toBe(true);
    expect(controller).toBeInstanceOf(AbortController);
  });

  it('navigate_to_section reports unknown ids and scrolls when possible', () => {
    const scrolled = { value: false };
    const fakeDoc = {
      getElementById: (id) =>
        id === 'faq'
          ? { scrollIntoView: () => {
              scrolled.value = true;
            } }
          : null,
    };
    const tools = createWebMcpTools({ document: fakeDoc });
    const navigate = tools.find((t) => t.name === 'navigate_to_section');
    const bad = navigate.execute({ sectionId: 'nope' });
    expect(bad.error).toMatch(/unknown section/);
    const ok = navigate.execute({ sectionId: 'faq' });
    expect(ok.scrolledTo).toBe('faq');
    expect(scrolled.value).toBe(true);
  });

  it('get_page_markdown fetches index.md for /', async () => {
    const fetched = [];
    const fetchImpl = async (url) => {
      fetched.push(url);
      return { ok: true, status: 200, text: async () => '# EchoFootPrint' };
    };
    const get = createWebMcpTools({ fetchImpl }).find(
      (t) => t.name === 'get_page_markdown'
    );
    const result = await get.execute({ path: '/' });
    expect(result.markdown).toBe('# EchoFootPrint');
    expect(fetched[0]).toBe(`${SITE_ORIGIN}/index.md`);
  });
});
