import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DISCOVERY_SCHEMA =
  'https://schemas.agentskills.io/discovery/0.2.0/schema.json';

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

/**
 * @param {string | Buffer} content
 */
export function sha256Digest(content) {
  const bytes = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/**
 * @param {string} landingPageRoot absolute path to landing-page/
 */
export function loadAgentSkillsIndex(landingPageRoot) {
  const indexPath = resolve(
    landingPageRoot,
    '.well-known/agent-skills/index.json'
  );
  return JSON.parse(readFileSync(indexPath, 'utf8'));
}

/**
 * Verify RFC v0.2.0 index shape and digest integrity for bundled skills.
 * @param {string} landingPageRoot
 */
export function verifyAgentSkillsIndex(landingPageRoot) {
  const index = loadAgentSkillsIndex(landingPageRoot);
  if (index.$schema !== DISCOVERY_SCHEMA) {
    throw new Error('index $schema mismatch');
  }
  if (!Array.isArray(index.skills) || index.skills.length === 0) {
    throw new Error('index skills must be non-empty');
  }
  for (const entry of index.skills) {
    if (!SKILL_NAME_PATTERN.test(entry.name)) {
      throw new Error(`invalid skill name: ${entry.name}`);
    }
    if (entry.type !== 'skill-md' && entry.type !== 'archive') {
      throw new Error(`invalid skill type: ${entry.type}`);
    }
    if (!entry.description || entry.description.length > 1024) {
      throw new Error(`invalid description for ${entry.name}`);
    }
    if (!DIGEST_PATTERN.test(entry.digest)) {
      throw new Error(`invalid digest for ${entry.name}`);
    }
    const skillPath = resolve(
      landingPageRoot,
      entry.url.replace(/^\//, '')
    );
    const bytes = readFileSync(skillPath);
    const expected = sha256Digest(bytes);
    if (entry.digest !== expected) {
      throw new Error(`digest mismatch for ${entry.name}`);
    }
  }
  return index;
}

export const agentSkillsIndexDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../.well-known/agent-skills'
);
