import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docPath = join(root, 'docs', 'dns-aid.md');
const templatePath = join(root, 'dns', 'dns-aid-zone-template.txt');
const publishPath = join(root, 'scripts', 'publish-dns-aid.sh');
const godaddyPath = join(root, 'scripts', 'publish-dns-aid-godaddy.sh');
const verifyPath = join(root, 'scripts', 'verify-dns-aid.sh');

describe('DNS-AID operator docs and scripts', () => {
  it('documents required entrypoints in docs/dns-aid.md', () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, 'utf8');
    for (const needle of [
      '_index._agents',
      '_a2a._agents',
      '_mcp._agents',
      'HTTPS',
      'SVCB',
      'DNSSEC',
      'echo-footprint.luongnv.com',
      'alpn=',
      'port=443',
      'checks.discoverability.dnsAid.status',
    ]) {
      expect(doc.includes(needle), `docs/dns-aid.md missing "${needle}"`).toBe(true);
    }
  });

  it('lists ServiceMode targets in dns/dns-aid-zone-template.txt', () => {
    expect(existsSync(templatePath)).toBe(true);
    const tpl = readFileSync(templatePath, 'utf8');
    expect(tpl).toMatch(/_index\._agents\.echo-footprint\.luongnv\.com/);
    expect(tpl).toMatch(/alpn=h2 port=443/);
  });

  it('has valid bash syntax for publish and verify scripts', () => {
    for (const scriptPath of [publishPath, godaddyPath, verifyPath]) {
      expect(existsSync(scriptPath)).toBe(true);
      expect(readFileSync(scriptPath, 'utf8')).toMatch(/^#!/);
      execFileSync('bash', ['-n', scriptPath]);
    }
  });
});
