/**
 * Cryptographic utilities for EchoFootPrint
 * Shared between service worker and dashboard
 * Per PRD: SHA-256 hashing of Facebook IDs
 */

/**
 * Hash Facebook ID using SHA-256
 * @param {string} userId - Raw Facebook user ID
 * @returns {Promise<string>} - 64-character hex hash
 */
export async function hashFacebookID(userId) {
  try {
    if (typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  } catch (error) {
    console.error('Error hashing Facebook ID:', error);
    throw error;
  }
}

/**
 * Generate a secure random salt
 * @param {number} length - Length of salt in bytes (default: 16)
 * @returns {string} - Hex-encoded salt
 */
export function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash data with salt using SHA-256
 * @param {string} data - Data to hash
 * @param {string} salt - Salt to use
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function hashWithSalt(data, salt) {
  try {
    const combined = data + salt;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error hashing with salt:', error);
    throw error;
  }
}
