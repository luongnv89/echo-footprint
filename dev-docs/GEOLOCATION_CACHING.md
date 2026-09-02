# Geolocation Caching and Rate Limiting

This document describes the sophisticated caching and rate limiting mechanisms implemented in EchoFootPrint to avoid hitting the ip-api.com rate limits while providing fast geolocation lookups.

## Overview

The geolocation system uses a multi-layer caching strategy combined with intelligent rate limiting to minimize API calls while respecting the ip-api.com free tier limits (45 requests/minute).

## Key Features

### 1. Multi-Layer Caching

**Layer 1: In-Memory Cache (RAM)**
- Fastest lookups (~1ms)
- Cleared on page refresh/reload
- Stores recently accessed geolocation data
- Zero IndexedDB overhead

**Layer 2: IndexedDB Cache (Persistent)**
- Survives page reloads and browser restarts
- 7-day cache expiration (configurable)
- Shared across all dashboard instances
- Automatically invalidates stale entries

### 2. Intelligent Rate Limiting

**Configuration:**
- API Limit: 45 requests/minute
- Effective Limit: 40 requests/minute (5-request safety buffer)
- Window: Rolling 60-second window
- Persistent state across sessions (stored in IndexedDB)

**Features:**
- Automatic request queuing when limit reached
- Calculated wait times until next available slot
- Per-request exponential backoff on failures
- Rate limit state persists across page reloads

### 3. Request Deduplication

Prevents multiple simultaneous API calls for the same domain:

```javascript
// These 3 calls will result in only 1 API request
Promise.all([
  getGeolocationForDomain('example.com'),
  getGeolocationForDomain('example.com'),
  getGeolocationForDomain('example.com'),
]);
```

All three promises will resolve with the same result from a single API call.

### 4. Cache Prewarming

Proactively cache domains before they're needed:

```javascript
import { prewarmCache } from './utils/geolocation.js';

const domains = ['example1.com', 'example2.com', 'example3.com'];
const stats = await prewarmCache(domains);

console.log(stats);
// {
//   total: 3,
//   alreadyCached: 1,
//   queued: 2,
//   failed: 0
// }
```

## Usage Examples

### Basic Geolocation Lookup

```javascript
import { getGeolocationForDomain } from './utils/geolocation.js';

const geoData = await getGeolocationForDomain('google.com');

console.log(geoData);
// {
//   country: 'United States',
//   region: 'California',
//   city: 'Mountain View',
//   lat: 37.386,
//   lon: -122.0838,
//   isp: 'Google LLC',
//   org: 'Google',
//   fromCache: true,
//   cacheLayer: 'memory'
// }
```

### Bulk Geolocation with Progress Tracking

```javascript
import { fetchBulkGeolocation } from './utils/geolocation.js';

const domains = ['google.com', 'facebook.com', 'twitter.com'];

const geoMap = await fetchBulkGeolocation(domains, (progress) => {
  console.log(`Progress: ${progress.current}/${progress.total}`);
  console.log(`Domain: ${progress.domain}`);
  console.log(`Cached: ${progress.cached}`);
});

console.log(geoMap);
// {
//   'google.com': { country: 'United States', ... },
//   'facebook.com': { country: 'United States', ... },
//   'twitter.com': { country: 'United States', ... }
// }
```

### Monitoring Rate Limits

```javascript
import { getQueueStats } from './utils/geolocation.js';

const stats = getQueueStats();

console.log(stats);
// {
//   pendingCount: 0,
//   requestsInLastMinute: 15,
//   rateLimitRemaining: 25,
//   effectiveRateLimit: 40,
//   maxRateLimit: 45,
//   canMakeRequest: true,
//   availableSlots: 25,
//   timeUntilNextSlot: 0,
//   activeRequestCount: 2,
//   memoryCacheSize: 42,
//   isInitialized: true
// }
```

### Cache Statistics

```javascript
import { getCacheStats } from './utils/geolocation.js';

const cacheStats = getCacheStats();

console.log(cacheStats);
// {
//   memoryCacheSize: 42,
//   memoryCacheKeys: ['google.com', 'facebook.com', ...]
// }
```

## Performance Characteristics

### Cache Hit Rates

| Scenario | Memory Cache | IndexedDB Cache | API Call |
|----------|--------------|-----------------|----------|
| First load (no cache) | 0% | 0% | 100% |
| Second load (same session) | ~90% | ~10% | 0% |
| After page refresh | 0% | ~95% | ~5% |
| After 7 days | 0% | 0% | 100% |

### Lookup Times

| Cache Layer | Typical Latency |
|-------------|-----------------|
| Memory Cache | ~1ms |
| IndexedDB Cache | ~5-10ms |
| API Call (cached by rate limiter) | ~50-200ms |
| API Call (network request) | ~200-500ms |

### Rate Limit Efficiency

With the safety buffer of 5 requests:

- **Without caching**: ~45 domains/minute maximum
- **With caching (95% hit rate)**: ~900 domains/minute effective throughput
- **With request deduplication**: Unlimited concurrent lookups for same domain

## Architecture Details

### Cache Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  getGeolocationForDomain('example.com')         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Active Request?    │──Yes──> Return existing promise
         └────────┬───────────┘
                  │ No
                  ▼
         ┌────────────────────┐
         │ Memory Cache Hit?  │──Yes──> Return immediately
         └────────┬───────────┘
                  │ No
                  ▼
         ┌────────────────────┐
         │ IndexedDB Hit?     │──Yes──> Promote to memory, return
         └────────┬───────────┘
                  │ No
                  ▼
         ┌────────────────────┐
         │ Check Rate Limit   │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Wait if needed     │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Fetch from API     │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Cache in both      │
         │ layers & return    │
         └────────────────────┘
```

### Rate Limit State Persistence

The rate limiter saves its state to IndexedDB after each request:

```javascript
{
  key: 'geoRateLimitState',
  value: {
    timestamps: [1234567890, 1234567950, ...], // Request timestamps
    lastUpdate: 1234567990
  }
}
```

On initialization, it restores only timestamps from the last 60 seconds, ensuring accurate rate limiting across browser sessions.

### Cache Expiration

Cache entries include a `cachedAt` timestamp:

```javascript
{
  domain: 'google.com',
  country: 'United States',
  region: 'California',
  city: 'Mountain View',
  lat: 37.386,
  lon: -122.0838,
  cachedAt: 1234567890, // Unix timestamp
}
```

Entries older than 7 days (configurable via `CACHE_TTL_MS`) are automatically refetched.

## Configuration

All configuration is in `src/dashboard/utils/geolocation.js`:

```javascript
const GEO_API_URL = 'http://ip-api.com/json/';
const RATE_LIMIT_PER_MINUTE = 45;           // API's hard limit
const RATE_LIMIT_SAFETY_MARGIN = 5;         // Safety buffer
const EFFECTIVE_RATE_LIMIT = 40;            // Actual limit used
const MAX_RETRIES = 3;                       // Retry attempts
const INITIAL_BACKOFF_MS = 1000;            // Initial retry delay
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
```

## Testing

Comprehensive tests cover all caching and rate limiting scenarios:

```bash
npm run test:run -- tests/unit/geolocation.test.js
```

Test coverage includes:
- Multi-layer cache hits
- Cache expiration
- Request deduplication
- Rate limiting
- Bulk operations
- Cache prewarming
- Error handling and retries

## Best Practices

### For Developers

1. **Always use the provided utilities** - Don't call ip-api.com directly
2. **Use bulk operations when possible** - `fetchBulkGeolocation()` is optimized
3. **Monitor rate limits** - Use `getQueueStats()` to check available capacity
4. **Prewarm cache for known domains** - Use `prewarmCache()` during idle time

### For Users

1. **Keep the extension open** - Memory cache provides fastest lookups
2. **Avoid clearing browser data** - IndexedDB cache persists across sessions
3. **Be patient with large datasets** - The system automatically throttles to respect limits

## Troubleshooting

### "Rate limit exceeded" errors

**Cause:** Too many API calls in 60-second window

**Solution:** The system automatically queues and retries. Wait for the queue to drain.

### Stale geolocation data

**Cause:** Cache entry older than 7 days

**Solution:** Data will automatically refresh. Or manually clear cache:

```javascript
import { clearAllCaches } from './utils/geolocation.js';
await clearAllCaches();
```

### Missing geolocation for some domains

**Cause:** Domain doesn't resolve to an IP, or ip-api.com doesn't have data

**Solution:** These are cached as "Unknown" to avoid repeated failed lookups.

## Future Enhancements

Potential improvements:

1. **Adaptive rate limiting** - Adjust based on observed API responses
2. **Batch API requests** - ip-api.com supports batch queries (up to 100 domains)
3. **Fallback API providers** - Switch to backup when primary is rate-limited
4. **User-configurable cache TTL** - Let users choose cache duration
5. **Background cache warming** - Automatically prewarm during idle time

## API Reference

See inline JSDoc comments in `src/dashboard/utils/geolocation.js` for detailed API documentation.

## License

MIT License - See LICENSE file for details
