import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  loadAgentSkillsIndex,
  sha256Digest,
  verifyAgentSkillsIndex,
} from '../../landing-page/lib/agent-skills-index.js';
import { SITE_ORIGIN } from '../../landing-page/lib/site-origin.js';
import {
  contentTypeForWellKnownPath,
  WELL_KNOWN_CONTENT_TYPES,
} from '../../landing-page/lib/well-known-content-types.js';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const landingDir = resolve(rootDir, 'landing-page');

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(resolve(landingDir, relativePath), 'utf8')
  );
}

function readText(relativePath) {
  return readFileSync(resolve(landingDir, relativePath), 'utf8');
}

describe('landing agent discovery (#86–#92)', () => {
  describe('agent skills index (#86)', () => {
    it('serves RFC v0.2.0 index with valid digests', () => {
      const index = verifyAgentSkillsIndex(landingDir);
      expect(index.skills).toHaveLength(3);
      expect(index.skills.map((s) => s.name)).toEqual([
        'product-overview',
        'privacy-and-data',
        'install-and-source',
      ]);
    });

    it('matches precomputed index.json on disk', () => {
      expect(loadAgentSkillsIndex(landingDir).$schema).toBe(
        'https://schemas.agentskills.io/discovery/0.2.0/schema.json'
      );
    });
  });

  describe('api catalog (#87)', () => {
    it('lists linkset entries with service relations', () => {
      const catalog = readJson('.well-known/api-catalog');
      expect(Array.isArray(catalog.linkset)).toBe(true);
      expect(catalog.linkset.length).toBeGreaterThanOrEqual(1);
      const home = catalog.linkset.find(
        (entry) => entry.anchor === `${SITE_ORIGIN}/`
      );
      expect(home).toBeTruthy();
      expect(home['service-doc']?.[0]?.href).toContain('/llms.txt');
      expect(home['service-desc']?.[0]?.href).toContain('agent-card.json');
    });
  });

  describe('ARD manifest (#88)', () => {
    it('includes host, entries, and representative queries', () => {
      const ard = readJson('.well-known/ai-catalog.json');
      expect(ard.specVersion).toBeTruthy();
      expect(ard.host?.displayName).toBeTruthy();
      expect(ard.host?.identifier).toMatch(/^did:web:/);
      expect(Array.isArray(ard.entries)).toBe(true);
      expect(ard.entries.length).toBeGreaterThanOrEqual(2);
      for (const entry of ard.entries) {
        expect(entry.identifier).toMatch(/^urn:air:/);
        expect(entry.displayName).toBeTruthy();
        expect(entry.type).toBeTruthy();
        expect(Boolean(entry.url) !== Boolean(entry.data)).toBe(true);
        expect(entry.representativeQueries?.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('advertises Agentmap in robots.txt', () => {
      const robots = readText('robots.txt');
      expect(robots).toContain(
        'Agentmap: https://echo-footprint.luongnv.com/.well-known/ai-catalog.json'
      );
    });
  });

  describe('auth.md and OAuth cross-links (#89–#92)', () => {
    it('auth.md heading references auth.md', () => {
      const authMd = readText('auth.md');
      expect(authMd).toMatch(/^# .*auth\.md/im);
      expect(authMd).toContain('/.well-known/oauth-protected-resource');
      expect(authMd).toContain('/.well-known/oauth-authorization-server');
    });

    it('protected resource metadata includes required PRM fields', () => {
      const prm = readJson('.well-known/oauth-protected-resource');
      expect(prm.resource).toBe(`${SITE_ORIGIN}/`);
      expect(prm.authorization_servers).toContain(SITE_ORIGIN);
      expect(prm.scopes_supported?.length).toBeGreaterThan(0);
      expect(prm.bearer_methods_supported).toContain('header');
    });

    it('authorization server metadata satisfies OAuth discovery (#91)', () => {
      const asMeta = readJson('.well-known/oauth-authorization-server');
      expect(asMeta.issuer).toBe(SITE_ORIGIN);
      expect(asMeta.authorization_endpoint).toMatch(/^https:\/\//);
      expect(asMeta.token_endpoint).toMatch(/^https:\/\//);
      expect(asMeta.jwks_uri).toContain('/.well-known/jwks.json');
      expect(asMeta.grant_types_supported?.length).toBeGreaterThan(0);
      expect(asMeta.response_types_supported?.length).toBeGreaterThan(0);
      readJson('.well-known/jwks.json');
    });

    it('links PRM issuers to AS metadata and agent_auth (#89)', () => {
      const prm = readJson('.well-known/oauth-protected-resource');
      const asMeta = readJson('.well-known/oauth-authorization-server');
      expect(prm.authorization_servers[0]).toBe(asMeta.issuer);
      expect(asMeta.agent_auth?.skill).toBe(`${SITE_ORIGIN}/auth.md`);
      expect(asMeta.agent_auth?.register_uri).toMatch(/^https:\/\//);
      expect(asMeta.agent_auth?.identity_types_supported).toContain(
        'anonymous'
      );
      expect(asMeta.agent_auth?.anonymous?.claim_uri).toMatch(/^https:\/\//);
    });
  });

  describe('MCP server card (#90)', () => {
    it('includes serverInfo, endpoint, and capabilities', () => {
      const card = readJson('.well-known/mcp/server-card.json');
      expect(card.serverInfo?.name).toBeTruthy();
      expect(card.serverInfo?.version).toBeTruthy();
      expect(card.url).toMatch(/^https:\/\//);
      expect(card.capabilities).toBeTypeOf('object');
    });
  });

  describe('well-known content types', () => {
    it('maps extensionless discovery paths to JSON media types', () => {
      expect(contentTypeForWellKnownPath('/.well-known/api-catalog')).toBe(
        WELL_KNOWN_CONTENT_TYPES['/.well-known/api-catalog']
      );
      expect(WELL_KNOWN_CONTENT_TYPES['/.well-known/api-catalog']).toContain(
        'application/linkset+json'
      );
    });

    it('sha256Digest uses lowercase hex', () => {
      expect(sha256Digest('test')).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });
});
