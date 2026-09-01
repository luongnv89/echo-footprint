import { describe, it, expect } from 'vitest';
import {
  sanitizeUrl,
  isSafeUrl,
  escapeHtml,
} from '../../src/dashboard/utils/security.js';

describe('escapeHtml', () => {
  it('escapes HTML-special characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes ampersands, quotes and apostrophes', () => {
    expect(escapeHtml('a & b "c" \'d\'')).toBe(
      'a &amp; b &quot;c&quot; &#39;d&#39;'
    );
  });

  it('leaves safe geo/domain strings unchanged', () => {
    expect(escapeHtml('example.com')).toBe('example.com');
    expect(escapeHtml('San Francisco')).toBe('San Francisco');
  });

  it('handles null and undefined by returning an empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('defangs an XSS payload aimed at Leaflet popup HTML', () => {
    const payload = '<img src=x onerror=alert(document.cookie)>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<img');
    expect(escaped).toBe('&lt;img src=x onerror=alert(document.cookie)&gt;');
  });
});

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
