import { describe, it, expect } from 'vitest';
import { sanitizeUrl, isSafeUrl } from '../../src/dashboard/utils/security.js';

describe('sanitizeUrl', () => {
  it('allows valid http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows valid https URLs', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe(
      'https://example.com/path'
    );
  });

  it('blocks javascript protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  it('blocks data protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('blocks file protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
  });

  it('blocks vbscript protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#');
  });

  it('handles invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('#');
    expect(sanitizeUrl('')).toBe('#');
    expect(sanitizeUrl(null)).toBe('#');
  });
});

describe('isSafeUrl', () => {
  it('returns true for safe URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('returns false for blocked URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for invalid URLs', () => {
    expect(isSafeUrl('not a url')).toBe(false);
  });
});
