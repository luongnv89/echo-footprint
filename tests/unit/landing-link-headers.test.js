import { describe, expect, it } from 'vitest';
import {
  HOME_PAGE_LINK_VALUE,
  isHomepagePath,
  setHomeLinkHeader,
  withHomeLinkHeaders,
} from '../../landing-page/lib/link-headers.js';

describe('landing link headers', () => {
  describe('isHomepagePath', () => {
    it('treats root and index.html as homepage', () => {
      expect(isHomepagePath('/')).toBe(true);
      expect(isHomepagePath('')).toBe(true);
      expect(isHomepagePath('/index.html')).toBe(true);
    });

    it('excludes other paths', () => {
      expect(isHomepagePath('/privacy.html')).toBe(false);
      expect(isHomepagePath('/llms.txt')).toBe(false);
    });
  });

  describe('HOME_PAGE_LINK_VALUE', () => {
    it('uses agent-discovery relation types', () => {
      expect(HOME_PAGE_LINK_VALUE).toContain('rel="describedby"');
      expect(HOME_PAGE_LINK_VALUE).toContain('/llms.txt');
      expect(HOME_PAGE_LINK_VALUE).toContain('/index.md');
    });
  });

  describe('withHomeLinkHeaders', () => {
    it('adds Link on homepage responses', async () => {
      const base = new Response('ok', { status: 200 });
      const out = withHomeLinkHeaders(base, '/');
      expect(out.headers.get('link')).toBe(HOME_PAGE_LINK_VALUE);
      await expect(out.text()).resolves.toBe('ok');
    });

    it('leaves non-homepage responses unchanged', () => {
      const base = new Response('x', { status: 200 });
      const out = withHomeLinkHeaders(base, '/privacy.html');
      expect(out.headers.get('link')).toBeNull();
    });
  });

  describe('setHomeLinkHeader', () => {
    it('sets the link header on a Headers object', () => {
      const headers = new Headers();
      setHomeLinkHeader(headers);
      expect(headers.get('link')).toBe(HOME_PAGE_LINK_VALUE);
    });
  });
});
