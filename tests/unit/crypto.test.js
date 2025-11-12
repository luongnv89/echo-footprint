/**
 * Unit tests for crypto utilities
 * Tests Facebook ID hashing and cryptographic functions
 */

import { describe, it, expect } from 'vitest';
import {
  hashFacebookID,
  generateSalt,
  hashWithSalt,
} from '../../src/lib/crypto.js';

describe('Crypto Utilities', () => {
  describe('hashFacebookID', () => {
    it('should hash Facebook ID with SHA-256', async () => {
      const userId = '123456789';
      const hash = await hashFacebookID(userId);

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64-character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Valid hex string
    });

    it('should produce different hashes for different IDs', async () => {
      const hash1 = await hashFacebookID('123456789');
      const hash2 = await hashFacebookID('987654321');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes for same input', async () => {
      const userId = '123456789';
      const hash1 = await hashFacebookID(userId);
      const hash2 = await hashFacebookID(userId);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty string gracefully', async () => {
      const hash = await hashFacebookID('');

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
      // Hash of empty string is deterministic
      expect(hash).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    it('should reject null userId', async () => {
      await expect(hashFacebookID(null)).rejects.toThrow('Invalid user ID');
    });

    it('should reject undefined userId', async () => {
      await expect(hashFacebookID(undefined)).rejects.toThrow('Invalid user ID');
    });

    it('should reject non-string userId', async () => {
      await expect(hashFacebookID(123)).rejects.toThrow('Invalid user ID');
    });

    it('should handle long user IDs', async () => {
      const longUserId = '1'.repeat(1000);
      const hash = await hashFacebookID(longUserId);

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
    });
  });

  describe('generateSalt', () => {
    it('should generate random salt', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).toBeTypeOf('string');
      expect(salt2).toBeTypeOf('string');
      expect(salt1).not.toBe(salt2); // Should be different each time
    });

    it('should generate salt of correct length', () => {
      const salt16 = generateSalt(16);
      expect(salt16.length).toBe(32); // 16 bytes = 32 hex characters

      const salt32 = generateSalt(32);
      expect(salt32.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate valid hex string', () => {
      const salt = generateSalt();
      expect(salt).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('hashWithSalt', () => {
    it('should hash data with salt', async () => {
      const data = 'test-data';
      const salt = 'test-salt';
      const hash = await hashWithSalt(data, salt);

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes with different salts', async () => {
      const data = 'test-data';
      const hash1 = await hashWithSalt(data, 'salt1');
      const hash2 = await hashWithSalt(data, 'salt2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same data and salt', async () => {
      const data = 'test-data';
      const salt = 'test-salt';
      const hash1 = await hashWithSalt(data, salt);
      const hash2 = await hashWithSalt(data, salt);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty data', async () => {
      const hash = await hashWithSalt('', 'salt');

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
    });

    it('should handle empty salt', async () => {
      const hash = await hashWithSalt('data', '');

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
    });
  });
});
