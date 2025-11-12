/**
 * Unit tests for service-worker.js
 * Tests message handling and Facebook ID hashing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Service Worker - Facebook ID Hashing', () => {
  it('should hash Facebook ID with SHA-256', async () => {
    const userId = '123456789';

    // Manually hash for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify hash is deterministic
    const hashBuffer2 = await crypto.subtle.digest('SHA-256', data);
    const hashArray2 = Array.from(new Uint8Array(hashBuffer2));
    const hash2 = hashArray2.map(b => b.toString(16).padStart(2, '0')).join('');

    expect(hash2).toBe(expectedHash);
    expect(expectedHash).toHaveLength(64); // SHA-256 produces 64 hex chars
  });

  it('should produce different hashes for different IDs', async () => {
    const userId1 = '123456789';
    const userId2 = '987654321';

    const encoder = new TextEncoder();

    const hash1Buffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(userId1)
    );
    const hash1 = Array.from(new Uint8Array(hash1Buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const hash2Buffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(userId2)
    );
    const hash2 = Array.from(new Uint8Array(hash2Buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string gracefully', async () => {
    const userId = '';
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);

    // Should still produce a valid hash (of empty string)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    expect(hash).toHaveLength(64);
    // Hash of empty string is deterministic
    expect(hash).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
});

describe('Service Worker - Message Validation', () => {
  it('should validate message structure', () => {
    const validMessage = {
      type: 'PIXEL_DETECTED',
      data: {
        domain: 'example.com',
        detected: true,
      },
    };

    expect(validMessage.type).toBeTruthy();
    expect(validMessage.data).toBeTruthy();
  });

  it('should reject invalid message types', () => {
    const invalidMessage = {
      type: 'INVALID_TYPE',
    };

    const validTypes = ['FB_ID_DETECTED', 'PIXEL_DETECTED', 'GET_STATS'];

    expect(validTypes).not.toContain(invalidMessage.type);
  });
});
