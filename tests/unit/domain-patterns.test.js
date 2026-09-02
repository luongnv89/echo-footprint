import { describe, it, expect } from 'vitest';
import {
  matchesDomainPattern,
  isDomainExcluded,
} from '../../src/content/domain-utils.js';

describe('matchesDomainPattern', () => {
  it('matches exact domains', () => {
    expect(matchesDomainPattern('example.com', 'example.com')).toBe(true);
    expect(matchesDomainPattern('sub.example.com', 'example.com')).toBe(false);
  });

  it('matches wildcard subdomains', () => {
    expect(matchesDomainPattern('sub.example.com', '*.example.com')).toBe(true);
    expect(matchesDomainPattern('example.com', '*.example.com')).toBe(false);
  });

  it('matches wildcard prefixes', () => {
    expect(matchesDomainPattern('192.168.0.1', '192.168.*.*')).toBe(true);
    expect(matchesDomainPattern('192.167.0.1', '192.168.*.*')).toBe(false);
  });

  it('handles uppercase patterns', () => {
    expect(matchesDomainPattern('Example.com', 'EXAMPLE.COM')).toBe(true);
    expect(matchesDomainPattern('Example.com', '*.EXAMPLE.COM')).toBe(false);
  });

  it('rejects patterns exceeding 200 chars', () => {
    const longPattern = 'a'.repeat(201);
    expect(matchesDomainPattern('example.com', longPattern)).toBe(false);
    expect(matchesDomainPattern('a'.repeat(200), 'a'.repeat(200))).toBe(true);
  });

  it('rejects patterns with unfiltered metacharacters', () => {
    expect(matchesDomainPattern('example.com', '*<>[]{}()')).toBe(false);
    expect(matchesDomainPattern('example.com', 'test{}')).toBe(false);
    expect(matchesDomainPattern('example.com', 'test[]')).toBe(false);
    expect(matchesDomainPattern('example.com', 'test<>')).toBe(false);
    expect(matchesDomainPattern('test', 'test()')).toBe(true); // () is allowed (not in <>{}[]), regex group still matches base
  });

  it('limits star count to 10', () => {
    expect(matchesDomainPattern('example.com', '*'.repeat(11))).toBe(false);
    expect(matchesDomainPattern('example.com', '*'.repeat(10))).toBe(true);
    expect(matchesDomainPattern('foo***bar', 'foo***bar')).toBe(true);
  });
});

describe('isDomainExcluded', () => {
  it('returns false when no patterns', () => {
    expect(isDomainExcluded('example.com', [])).toBe(false);
  });

  it('returns true when domain matches any pattern', () => {
    const patterns = ['localhost', '*.internal', 'example.com'];
    expect(isDomainExcluded('example.com', patterns)).toBe(true);
    expect(isDomainExcluded('api.internal', patterns)).toBe(true);
  });

  it('returns false when domain does not match patterns', () => {
    const patterns = ['localhost', '*.internal'];
    expect(isDomainExcluded('example.com', patterns)).toBe(false);
  });
});
