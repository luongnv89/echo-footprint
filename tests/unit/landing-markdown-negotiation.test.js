import { describe, expect, it } from 'vitest';
import {
  prefersMarkdown,
  htmlPathToMarkdown,
  approximateTokenCount,
} from '../../landing-page/lib/markdown-negotiation.js';

describe('landing markdown negotiation', () => {
  describe('prefersMarkdown', () => {
    it('returns true for explicit text/markdown accept', () => {
      expect(prefersMarkdown('text/markdown')).toBe(true);
      expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true);
    });

    it('returns false without text/markdown', () => {
      expect(prefersMarkdown('text/html')).toBe(false);
      expect(prefersMarkdown('')).toBe(false);
      expect(prefersMarkdown('text/html, */*;q=0.8')).toBe(false);
    });

    it('returns false when html is preferred over markdown', () => {
      expect(prefersMarkdown('text/html;q=1, text/markdown;q=0.5')).toBe(false);
    });
  });

  describe('htmlPathToMarkdown', () => {
    const base = 'https://echo-footprint.luongnv.com';

    it('maps root to index.md', () => {
      const out = htmlPathToMarkdown(new URL(`${base}/`));
      expect(out.pathname).toBe('/index.md');
    });

    it('maps privacy.html to privacy.md', () => {
      const out = htmlPathToMarkdown(new URL(`${base}/privacy.html`));
      expect(out.pathname).toBe('/privacy.md');
    });

    it('returns null for static assets', () => {
      expect(htmlPathToMarkdown(new URL(`${base}/logo.svg`))).toBeNull();
      expect(htmlPathToMarkdown(new URL(`${base}/styles.css`))).toBeNull();
    });
  });

  describe('approximateTokenCount', () => {
    it('estimates tokens from body length', () => {
      expect(approximateTokenCount('abcd')).toBe(1);
      expect(approximateTokenCount('a'.repeat(8))).toBe(2);
    });
  });
});
