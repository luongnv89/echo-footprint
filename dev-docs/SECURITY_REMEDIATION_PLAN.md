# Security Remediation Plan

**Created:** 2025-11-23
**Target Version:** 1.2.0
**Status:** Planning

---

## Executive Summary

This document outlines the remediation plan for security issues identified in the external security review. All five identified issues are valid and require attention. We prioritize fixes based on severity and exploitability, targeting P0/P1 issues for immediate release (v1.1.2) and P2 issues for the next feature release (v1.2.0).

---

## Issue Overview

| ID | Issue | Severity | Valid | Priority | Target |
|----|-------|----------|-------|----------|--------|
| SEC-001 | Unvalidated external links (XSS) | HIGH | ✅ Yes | P0 | v1.1.2 |
| SEC-002 | CSV injection vulnerability | LOW | ✅ Yes | P1 | v1.1.2 |
| SEC-003 | Incomplete CSP directives | MEDIUM | ✅ Yes | P1 | v1.1.2 |
| SEC-004 | Over-broad host permissions | MEDIUM | ⚠️ Partial | P2 | v1.2.0 |
| SEC-005 | No runtime permission controls | LOW | ✅ Yes | P2 | v1.2.0 |

---

## P0/P1 Issues (v1.1.2 Security Patch)

### **SEC-001: Unvalidated External Links (XSS)**

**Severity:** HIGH
**Impact:** Code execution via malicious URLs
**Exploitability:** High (requires visiting site with malicious URL, then clicking link in dashboard)

#### Current Vulnerability
`src/dashboard/components/DataTable.jsx:300-310` renders captured URLs directly:

```jsx
<a href={fp.url} target="_blank" rel="noopener noreferrer">
  {fp.url.length > 60 ? `${fp.url.substring(0, 60)}...` : fp.url}
</a>
```

**Attack vectors:**
- `javascript:alert(document.cookie)` - XSS execution
- `data:text/html,<script>...</script>` - Arbitrary HTML/JS
- `file:///etc/passwd` - Local file access attempt
- `vbscript:msgbox("XSS")` - Legacy browser exploitation

#### Remediation Steps

**Step 1: Create security utility module**

File: `src/dashboard/utils/security.js`

```javascript
/**
 * Security utilities for sanitizing user-controlled data
 * Prevents XSS, protocol injection, and CSV injection attacks
 */

/**
 * Sanitize URL to only allow safe protocols
 * @param {string} url - URL to sanitize
 * @returns {string} - Safe URL or '#' if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '#';
  }

  try {
    const parsed = new URL(url);

    // Only allow http/https schemes
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`[Security] Blocked dangerous URL protocol: ${parsed.protocol}`);
      return '#';
    }

    return url;
  } catch (error) {
    // Invalid URL format
    console.warn(`[Security] Invalid URL format: ${url}`);
    return '#';
  }
}

/**
 * Check if URL is safe to link to
 * @param {string} url - URL to check
 * @returns {boolean} - True if safe, false otherwise
 */
export function isSafeUrl(url) {
  return sanitizeUrl(url) !== '#';
}
```

**Step 2: Update DataTable component**

File: `src/dashboard/components/DataTable.jsx`

Add import:
```javascript
import { sanitizeUrl, isSafeUrl } from '../utils/security.js';
```

Update link rendering (line 299-311):
```jsx
<td className="url-cell">
  {isSafeUrl(fp.url) ? (
    <a
      href={sanitizeUrl(fp.url)}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="url-link"
      title={fp.url}
    >
      {fp.url.length > 60 ? `${fp.url.substring(0, 60)}...` : fp.url}
    </a>
  ) : (
    <span className="url-text-unsafe" title={`Unsafe URL blocked: ${fp.url}`}>
      {fp.url.length > 60 ? `${fp.url.substring(0, 60)}...` : fp.url}
      <span className="unsafe-badge" aria-label="Unsafe URL blocked">⚠️</span>
    </span>
  )}
</td>
```

**Step 3: Add CSS for unsafe URL indicator**

File: `src/dashboard/styles/DataTable.css`

```css
.url-text-unsafe {
  color: #e74c3c;
  font-family: monospace;
  font-size: 0.85em;
}

.unsafe-badge {
  margin-left: 4px;
  font-size: 0.9em;
  cursor: help;
}
```

**Step 4: Add unit tests**

File: `tests/unit/security.test.js` (new file)

```javascript
import { sanitizeUrl, isSafeUrl } from '../../src/dashboard/utils/security.js';

describe('sanitizeUrl', () => {
  test('allows valid HTTP URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  test('allows valid HTTPS URLs', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  test('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  test('blocks data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  test('blocks file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
  });

  test('blocks vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#');
  });

  test('handles invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('#');
    expect(sanitizeUrl('')).toBe('#');
    expect(sanitizeUrl(null)).toBe('#');
  });
});
```

**Acceptance Criteria:**
- ✅ All dangerous protocols (javascript:, data:, file:, vbscript:) blocked
- ✅ Valid http/https URLs pass through unchanged
- ✅ Invalid URLs render as text with warning indicator
- ✅ No breaking changes to existing functionality
- ✅ Unit tests achieve 100% coverage

---

### **SEC-002: CSV Injection Vulnerability**

**Severity:** LOW
**Impact:** Code execution in Excel/Google Sheets
**Exploitability:** Low (requires user to export and open CSV in vulnerable application)

#### Current Vulnerability
`src/dashboard/components/DataTable.jsx:111` escapes quotes but not formula injection:

```javascript
const escapeCSV = field => `"${String(field).replace(/"/g, '""')}"`;
```

If a tracking URL starts with `=`, `+`, `-`, or `@`, Excel/Sheets may interpret it as a formula.

**Example attack:**
```
URL: https://evil.com/=cmd|'/C calc'!A0
CSV: "=cmd|'/C calc'!A0"
Result: Excel executes calculator (or worse)
```

#### Remediation Steps

**Step 1: Update CSV escaping function**

File: `src/dashboard/components/DataTable.jsx` (line 111)

```javascript
// Escape CSV fields and prevent formula injection
const escapeCSV = field => {
  let str = String(field);

  // Prevent CSV injection: prefix dangerous characters with single quote
  // Excel/Sheets interpret =, +, -, @ at start as formulas
  if (/^[=+\-@\t\r\n]/.test(str)) {
    str = "'" + str;  // Single quote forces literal interpretation
  }

  // Standard CSV escaping: wrap in quotes and escape existing quotes
  return `"${str.replace(/"/g, '""')}"`;
};
```

**Step 2: Add unit tests**

File: `tests/unit/csv-export.test.js` (new file)

```javascript
describe('CSV Export Security', () => {
  test('escapes formula injection with = prefix', () => {
    const input = '=SUM(A1:A10)';
    const output = escapeCSV(input);
    expect(output).toBe('"\'=SUM(A1:A10)"');
  });

  test('escapes formula injection with + prefix', () => {
    const input = '+1234';
    const output = escapeCSV(input);
    expect(output).toBe('"\'+1234"');
  });

  test('escapes formula injection with - prefix', () => {
    const input = '-1234';
    const output = escapeCSV(input);
    expect(output).toBe('"\'-1234"');
  });

  test('escapes formula injection with @ prefix', () => {
    const input = '@SUM(A1)';
    const output = escapeCSV(input);
    expect(output).toBe('"\'@SUM(A1)"');
  });

  test('handles normal URLs without modification', () => {
    const input = 'https://example.com';
    const output = escapeCSV(input);
    expect(output).toBe('"https://example.com"');
  });

  test('escapes quotes in fields', () => {
    const input = 'Field with "quotes"';
    const output = escapeCSV(input);
    expect(output).toBe('"Field with ""quotes"""');
  });
});
```

**Step 3: Document in export UI**

Add tooltip to export button explaining safety measures:

```jsx
<button
  className="export-button"
  onClick={handleExportCSV}
  disabled={filteredData.length === 0}
  aria-label="Export data to CSV with formula injection protection"
  title="Export data to CSV (formulas automatically escaped for security)"
>
```

**Acceptance Criteria:**
- ✅ All cells starting with `=`, `+`, `-`, `@` are prefixed with `'`
- ✅ Standard CSV quote escaping still works
- ✅ Exported files open safely in Excel/Google Sheets
- ✅ No formulas execute when CSV is opened
- ✅ Unit tests cover all injection vectors

---

### **SEC-003: Incomplete CSP Directives**

**Severity:** MEDIUM
**Impact:** Potential for inline script/style injection if other vulnerabilities exist
**Exploitability:** Low (requires chaining with another vulnerability)

#### Current Configuration
`manifest.json:32-34` has basic CSP but missing critical directives:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
}
```

**Missing directives:**
- `style-src` (defaults to `default-src` which doesn't exist → falls back to unsafe)
- `img-src` (Leaflet loads map tiles from external CDNs)
- `connect-src` (should restrict network requests)
- `default-src` (fallback for unspecified directives)
- `object-src 'none'` (should be `'none'`, not `'self'`)

#### Remediation Steps

**Step 1: Update manifest CSP**

File: `manifest.json` (line 32-34)

```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.tile.openstreetmap.org https://unpkg.com data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
}
```

**Directive breakdown:**
- `default-src 'self'` - Fallback: only load resources from extension
- `script-src 'self'` - Only execute scripts bundled with extension
- `style-src 'self' 'unsafe-inline'` - Allow bundled styles + inline (needed for React/D3/Leaflet)
- `img-src 'self' https://*.tile.openstreetmap.org https://unpkg.com data: blob:` - Allow map tiles + data URIs
- `connect-src 'self'` - Only allow network requests to extension (blocks external API calls)
- `font-src 'self' data:` - Allow bundled fonts + data URIs
- `object-src 'none'` - Block plugins/Flash
- `base-uri 'self'` - Prevent base tag injection
- `form-action 'self'` - Prevent form submission to external origins
- `frame-ancestors 'none'` - Prevent embedding in iframes
- `upgrade-insecure-requests` - Auto-upgrade http to https

**Step 2: Verify Leaflet compatibility**

Test that map tiles load correctly after CSP update:
1. Build extension with new CSP
2. Open dashboard and navigate to Map View
3. Verify map tiles render correctly from OpenStreetMap CDN
4. Check browser console for CSP violations

**Step 3: Document CSP policy**

File: `dev-docs/SECURITY_AUDIT.md` (append)

```markdown
## Content Security Policy

EchoFootPrint uses a strict CSP for defense-in-depth:

- **No external scripts**: All JavaScript is bundled with the extension
- **No eval()**: `script-src 'self'` blocks dynamic code execution
- **Limited external images**: Only OpenStreetMap tiles allowed (for map visualization)
- **No external network requests**: `connect-src 'self'` blocks API calls
- **Inline styles allowed**: Required for React component styles and D3/Leaflet rendering

### External Resources Whitelist
- `https://*.tile.openstreetmap.org` - Map tiles (Leaflet)
- `https://unpkg.com` - Leaflet marker icons (loaded at build time)
```

**Acceptance Criteria:**
- ✅ All CSP directives explicitly defined
- ✅ No CSP violations in browser console during normal operation
- ✅ Map view renders correctly with OpenStreetMap tiles
- ✅ D3 graph and Leaflet map styles work with `'unsafe-inline'`
- ✅ No external network requests allowed except whitelisted CDNs

---

## P2 Issues (v1.2.0 Feature Release)

### **SEC-004: Over-broad Host Permissions**

**Severity:** MEDIUM
**Impact:** Extension observes traffic on all sites (including localhost, internal networks)
**Exploitability:** N/A (legitimate concern, not exploitable)

#### Analysis
Current `manifest.json:7` grants `["http://*/*", "https://*/*"]`

**Reviewer's concern:** Permission includes:
- `localhost` development servers
- Internal network sites (`*.corp`, `*.internal`)
- Admin panels and sensitive applications

**Our position:**
- **Broad permissions are required** for core functionality (detect tracking across the web)
- **Cannot narrow permissions** without breaking the product
- **However**, user controls for exclusions are a valuable enhancement

#### Remediation Steps (v1.2.0)

**Step 1: Add opt-out settings UI**

File: `src/dashboard/components/Settings.jsx` (new component)

```jsx
function ExcludedDomainsSettings() {
  const [excludedDomains, setExcludedDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    // Load from storage
    chrome.storage.local.get(['excludedDomains'], result => {
      setExcludedDomains(result.excludedDomains || []);
    });
  }, []);

  const addDomain = () => {
    if (!newDomain.trim()) return;

    const updated = [...excludedDomains, newDomain.trim()];
    setExcludedDomains(updated);
    chrome.storage.local.set({ excludedDomains: updated });
    setNewDomain('');
  };

  const removeDomain = domain => {
    const updated = excludedDomains.filter(d => d !== domain);
    setExcludedDomains(updated);
    chrome.storage.local.set({ excludedDomains: updated });
  };

  return (
    <div className="settings-section">
      <h3>Excluded Domains</h3>
      <p className="settings-help">
        EchoFootPrint will not run on these domains. Use this to exclude localhost,
        internal networks, or sensitive sites.
      </p>

      <div className="domain-input">
        <input
          type="text"
          placeholder="e.g., localhost, *.corp, 192.168.*.*"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addDomain()}
        />
        <button onClick={addDomain}>Add</button>
      </div>

      <ul className="excluded-domains-list">
        {excludedDomains.map(domain => (
          <li key={domain}>
            <span>{domain}</span>
            <button onClick={() => removeDomain(domain)}>Remove</button>
          </li>
        ))}
      </ul>

      <div className="preset-exclusions">
        <p>Common exclusions:</p>
        <button onClick={() => addDomain('localhost')}>+ localhost</button>
        <button onClick={() => addDomain('127.0.0.1')}>+ 127.0.0.1</button>
        <button onClick={() => addDomain('*.local')}>+ *.local</button>
        <button onClick={() => addDomain('*.internal')}>+ *.internal</button>
      </div>
    </div>
  );
}
```

**Step 2: Update content script to honor exclusions**

File: `src/content/content-script.js` (before line 83)

```javascript
/**
 * Check if current domain should be excluded from tracking
 * @returns {Promise<boolean>} - True if should skip, false if should run
 */
async function shouldSkipDomain() {
  try {
    const { excludedDomains } = await chrome.storage.local.get(['excludedDomains']);

    if (!excludedDomains || excludedDomains.length === 0) {
      return false;
    }

    const currentDomain = window.location.hostname;

    for (const pattern of excludedDomains) {
      if (matchesDomainPattern(currentDomain, pattern)) {
        debug(`Domain ${currentDomain} matches exclusion pattern: ${pattern}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking domain exclusions:', error);
    return false; // Fail open (run detection on error)
  }
}

/**
 * Match domain against wildcard pattern
 * @param {string} domain - Current domain (e.g., "app.example.com")
 * @param {string} pattern - Pattern (e.g., "*.example.com", "localhost")
 * @returns {boolean} - True if matches
 */
function matchesDomainPattern(domain, pattern) {
  // Exact match
  if (domain === pattern) return true;

  // Wildcard match (convert to regex)
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\*/g, '.*');  // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(domain);
}
```

Update `runPixelDetection()`:

```javascript
async function runPixelDetection() {
  // Check exclusions first
  if (await shouldSkipDomain()) {
    debug('Domain excluded from tracking detection');
    return;
  }

  const startTime = performance.now();
  // ... rest of existing code
}
```

**Step 3: Update manifest permissions justification**

File: `manifest.json` (add comment for documentation)

```json
{
  "host_permissions": ["http://*/*", "https://*/*"],
  "_comment_host_permissions": "Required to detect tracking pixels across all websites. Users can exclude specific domains via settings. All processing is local; no data transmitted."
}
```

**Step 4: Update Chrome Web Store listing**

File: `dev-docs/chrome-web-store-listing.md`

Add to privacy section:
```markdown
### Why does EchoFootPrint need access to all websites?

To detect tracking pixels, the extension must inspect web pages as you browse. However:
- **You control what's monitored**: Exclude localhost, internal networks, or any domain via settings
- **Zero data collection**: All analysis happens locally on your device
- **Open source**: Audit our code at github.com/your-repo
```

**Acceptance Criteria:**
- ✅ Users can add/remove excluded domains via settings UI
- ✅ Wildcard patterns supported (`*.corp`, `192.168.*.*`)
- ✅ Content script honors exclusions before running
- ✅ Default exclusions suggested (localhost, 127.0.0.1, *.local)
- ✅ Permission justification documented in store listing

---

### **SEC-005: No Runtime Permission Controls**

**Severity:** LOW
**Impact:** No user control to pause detection globally
**Exploitability:** N/A (UX enhancement, not security vulnerability)

#### Analysis
Currently, content script runs unconditionally on all pages. Users cannot:
- Pause tracking detection temporarily
- Disable extension without removing it
- See when extension is actively monitoring

#### Remediation Steps (v1.2.0)

**Step 1: Add global pause toggle to settings**

File: `src/dashboard/components/Settings.jsx`

```jsx
function GlobalControlsSettings() {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['isPaused'], result => {
      setIsPaused(result.isPaused || false);
    });
  }, []);

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    chrome.storage.local.set({ isPaused: newState });

    // Show toast notification
    showToast(newState ? 'Detection paused' : 'Detection resumed');
  };

  return (
    <div className="settings-section">
      <h3>Global Controls</h3>

      <div className="toggle-setting">
        <label>
          <input
            type="checkbox"
            checked={!isPaused}
            onChange={togglePause}
            aria-label="Enable tracking detection"
          />
          <span>Enable tracking detection</span>
        </label>
        <p className="setting-help">
          {isPaused
            ? 'Detection is paused. No new tracking data will be collected.'
            : 'Detection is active. Tracking pixels will be detected across the web.'}
        </p>
      </div>

      <div className="pause-shortcuts">
        <button onClick={togglePause}>
          {isPaused ? '▶️ Resume Detection' : '⏸️ Pause Detection'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Update content script to check pause state**

File: `src/content/content-script.js`

Update `runPixelDetection()`:

```javascript
async function runPixelDetection() {
  // Check if extension is globally paused
  const { isPaused } = await chrome.storage.local.get(['isPaused']);
  if (isPaused) {
    debug('Extension is paused globally');
    return;
  }

  // Check exclusions
  if (await shouldSkipDomain()) {
    debug('Domain excluded from tracking detection');
    return;
  }

  const startTime = performance.now();
  // ... rest of existing code
}
```

**Step 3: Add badge indicator when paused**

File: `src/background/service-worker.js`

```javascript
// Listen for pause state changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isPaused) {
    updateBadge(changes.isPaused.newValue);
  }
});

function updateBadge(isPaused) {
  if (isPaused) {
    chrome.action.setBadgeText({ text: '⏸' });
    chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
    chrome.action.setTitle({ title: 'EchoFootPrint (Paused)' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'EchoFootPrint' });
  }
}

// Initialize badge on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['isPaused'], result => {
    updateBadge(result.isPaused || false);
  });
});
```

**Step 4: Add keyboard shortcut**

File: `manifest.json`

```json
"commands": {
  "toggle-pause": {
    "suggested_key": {
      "default": "Ctrl+Shift+P",
      "mac": "Command+Shift+P"
    },
    "description": "Pause/resume tracking detection"
  }
}
```

File: `src/background/service-worker.js`

```javascript
chrome.commands.onCommand.addListener(command => {
  if (command === 'toggle-pause') {
    chrome.storage.local.get(['isPaused'], result => {
      const newState = !result.isPaused;
      chrome.storage.local.set({ isPaused: newState });
      updateBadge(newState);

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: 'EchoFootPrint',
        message: newState ? 'Detection paused' : 'Detection resumed'
      });
    });
  }
});
```

**Acceptance Criteria:**
- ✅ Global pause toggle in settings UI
- ✅ Content script honors pause state before detection
- ✅ Badge indicator shows "⏸" when paused
- ✅ Keyboard shortcut (Ctrl+Shift+P / Cmd+Shift+P) toggles pause
- ✅ Visual feedback when toggling (toast notification + badge update)
- ✅ Pause state persists across browser restarts

---

## Testing Plan

### Unit Tests
- [ ] URL sanitization (`tests/unit/security.test.js`)
- [ ] CSV injection prevention (`tests/unit/csv-export.test.js`)
- [ ] Domain exclusion pattern matching (`tests/unit/domain-patterns.test.js`)

### Integration Tests
- [ ] CSP verification (no console violations)
- [ ] Leaflet map loads with updated CSP
- [ ] Pause state propagates to content scripts
- [ ] Excluded domains are honored

### Manual Security Testing
- [ ] XSS via malicious URL (should be blocked)
- [ ] CSV formula injection (should be escaped)
- [ ] CSP bypass attempts (should fail)
- [ ] Pause/resume functionality
- [ ] Domain exclusion patterns

### Browser Compatibility
- [ ] Chrome 120+ (primary target)
- [ ] Edge 120+ (Chromium-based)
- [ ] Firefox (future support, requires Manifest V2 branch)

---

## Release Schedule

### v1.1.2 Security Patch (Target: 2025-11-25)
**Priority:** P0/P1 issues only

**Checklist:**
- [ ] Implement SEC-001 (URL sanitization)
- [ ] Implement SEC-002 (CSV injection fix)
- [ ] Implement SEC-003 (CSP update)
- [ ] Unit tests for all fixes
- [ ] Manual security testing
- [ ] Update SECURITY_AUDIT.md with findings
- [ ] Create release notes highlighting security fixes
- [ ] Submit to Chrome Web Store

### v1.2.0 Feature Release (Target: 2025-12-15)
**Priority:** P2 enhancements

**Checklist:**
- [ ] Implement SEC-004 (domain exclusions UI)
- [ ] Implement SEC-005 (pause controls)
- [ ] Settings panel redesign
- [ ] Keyboard shortcuts
- [ ] Badge indicators
- [ ] Integration tests
- [ ] User documentation
- [ ] Chrome Web Store listing update

---

## Success Metrics

### Security Posture
- **Zero high/critical vulnerabilities** in production
- **100% coverage** of OWASP Top 10 for Browser Extensions
- **External audit passed** (this document addresses all findings)

### User Impact
- **No functional regressions** from security fixes
- **<1% performance impact** from URL sanitization overhead
- **Positive user feedback** on privacy controls (domain exclusions, pause)

---

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSV Injection - OWASP](https://owasp.org/www-community/attacks/CSV_Injection)
- [Chrome Extension CSP](https://developer.chrome.com/docs/extensions/mv3/content_security_policy/)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)

---

## Appendix: Code Review Checklist

Before deploying security fixes, review:

- [ ] All user-controlled data is sanitized before rendering
- [ ] No `dangerouslySetInnerHTML` in React components
- [ ] No `eval()` or `new Function()` in codebase
- [ ] CSP directives cover all resource types
- [ ] No inline event handlers (`onclick=""`)
- [ ] External resources limited to necessary CDNs only
- [ ] All network requests use HTTPS
- [ ] Sensitive data (if any) encrypted at rest
- [ ] No hardcoded credentials or API keys
- [ ] Extension permissions documented and justified
