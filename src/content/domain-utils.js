/**
 * Domain filtering utilities for runtime exclusions.
 */

/**
 * Match a domain against a wildcard pattern.
 * Supports exact match and '*' wildcards.
 * @param {string} domain
 * @param {string} pattern
 * @returns {boolean}
 */
export function matchesDomainPattern(domain, pattern) {
  if (!domain || !pattern) return false;

  const normalizedPattern = pattern.trim().toLowerCase();

  // Length limit (≤200 chars)
  if (normalizedPattern.length > 200) return false;

  // Reject patterns with unfiltered metacharacters (<>{}[])
  if (/[<>\{\}\[\]]/.test(normalizedPattern)) return false;

  // Cap * count (≤10)
  const starCount = (normalizedPattern.match(/\*/g) || []).length;
  if (starCount > 10) return false;

  const normalizedDomain = domain.trim().toLowerCase();

  if (normalizedDomain === normalizedPattern) return true;

  const regexPattern = normalizedPattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedDomain);
}

/**
 * Determine if the current domain should be excluded based on patterns.
 * @param {string} domain
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function isDomainExcluded(domain, patterns = []) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some(pattern => matchesDomainPattern(domain, pattern));
}
