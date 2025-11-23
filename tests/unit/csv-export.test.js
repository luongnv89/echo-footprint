import { describe, it, expect } from 'vitest';
import { escapeCSV } from '../../src/dashboard/components/DataTable.jsx';

describe('CSV Export Security', () => {
  it('escapes formula injection with = prefix', () => {
    const output = escapeCSV('=SUM(A1:A10)');
    expect(output).toBe('"\'=SUM(A1:A10)"');
  });

  it('escapes formula injection with + prefix', () => {
    const output = escapeCSV('+1234');
    expect(output).toBe('"\'+1234"');
  });

  it('escapes formula injection with - prefix', () => {
    const output = escapeCSV('-1234');
    expect(output).toBe('"\'-1234"');
  });

  it('escapes formula injection with @ prefix', () => {
    const output = escapeCSV('@SUM(A1)');
    expect(output).toBe('"\'@SUM(A1)"');
  });

  it('handles normal URLs without modification', () => {
    const output = escapeCSV('https://example.com');
    expect(output).toBe('"https://example.com"');
  });

  it('escapes quotes in fields', () => {
    const output = escapeCSV('Field with "quotes"');
    expect(output).toBe('"Field with ""quotes"""');
  });
});
