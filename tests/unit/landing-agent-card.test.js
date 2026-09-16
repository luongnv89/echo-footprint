import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cardPath = resolve(
  rootDir,
  'landing-page/.well-known/agent-card.json'
);

function loadAgentCard() {
  return JSON.parse(readFileSync(cardPath, 'utf8'));
}

describe('landing A2A agent card', () => {
  it('is served from /.well-known/agent-card.json', () => {
    expect(cardPath).toContain('.well-known/agent-card.json');
  });

  it('includes required A2A discovery fields', () => {
    const card = loadAgentCard();
    expect(card.name).toBeTruthy();
    expect(card.version).toBeTruthy();
    expect(card.description).toBeTruthy();
    expect(card.protocolVersion).toBeTruthy();
    expect(Array.isArray(card.supportedInterfaces)).toBe(true);
    expect(card.supportedInterfaces.length).toBeGreaterThan(0);
    const iface = card.supportedInterfaces[0];
    expect(iface.url).toMatch(/^https:\/\//);
    expect(iface.protocolBinding).toBeTruthy();
    expect(card.capabilities).toBeTypeOf('object');
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.skills.length).toBeGreaterThan(0);
    for (const skill of card.skills) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(Array.isArray(skill.tags)).toBe(true);
      expect(skill.tags.length).toBeGreaterThan(0);
    }
  });

  it('stays under the 10 KB agent-card size limit', () => {
    const raw = readFileSync(cardPath, 'utf8');
    expect(raw.length).toBeLessThanOrEqual(10 * 1024);
  });

  it('aligns extension version with package.json', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(rootDir, 'package.json'), 'utf8')
    );
    const card = loadAgentCard();
    expect(card.version).toBe(pkg.version);
  });
});
