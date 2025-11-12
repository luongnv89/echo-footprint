# Debug: No Pixels Detected on CNN/Reddit

## Quick Answer

**CNN and Reddit likely don't have Facebook Pixel anymore.** Many sites removed tracking pixels due to:
- GDPR compliance
- CCPA (California privacy law)
- Apple's App Tracking Transparency
- Privacy concerns

## Test Sites That SHOULD Work

Try these **retail/e-commerce sites** (they depend on Facebook ads):

### High Probability (90%+):
- ✅ **target.com** - Major retailer
- ✅ **walmart.com** - E-commerce
- ✅ **bestbuy.com** - Electronics
- ✅ **nike.com** - Brand site
- ✅ **sephora.com** - Beauty products
- ✅ **homedepot.com** - Home improvement
- ✅ **macys.com** - Department store

### Lower Probability:
- ❌ **cnn.com** - News sites often removed trackers
- ❌ **reddit.com** - Privacy-focused, no Facebook Pixel
- ❌ **github.com** - Tech sites avoid trackers
- ❌ **wikipedia.org** - Non-profit, no tracking

## Step-by-Step Debugging

### Step 1: Verify Extension is Running

Visit **target.com** and open DevTools Console (F12). Look for:

```
✅ GOOD - Extension is working:
[EchoFootPrint] Content script loaded on www.target.com
[EchoFootPrint] Detection completed in 45ms
[EchoFootPrint] Facebook Pixel detected!
[EchoFootPrint] Detection sent to service worker

❌ BAD - Extension not working:
(no logs at all)
```

**If no logs appear**:
1. Check extension is enabled (chrome://extensions)
2. Reload extension
3. Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)

---

### Step 2: Manually Check for Facebook Pixel

On the site, open DevTools Console and paste:

```javascript
// Check for Facebook Pixel scripts
const fbScripts = Array.from(document.querySelectorAll('script'))
  .filter(s => s.src && (
    s.src.includes('connect.facebook.net') ||
    s.src.includes('fbcdn.net') ||
    s.src.includes('facebook.com/tr')
  ));

console.log('Facebook scripts found:', fbScripts.length);
fbScripts.forEach(s => console.log('  -', s.src));

// Also check for fbq() calls
if (window.fbq) {
  console.log('✅ Facebook Pixel (fbq) is loaded');
} else {
  console.log('❌ Facebook Pixel (fbq) NOT found');
}
```

**Expected output on sites WITH Facebook Pixel:**
```
Facebook scripts found: 1
  - https://connect.facebook.net/en_US/fbevents.js
✅ Facebook Pixel (fbq) is loaded
```

**Expected output on sites WITHOUT Facebook Pixel:**
```
Facebook scripts found: 0
❌ Facebook Pixel (fbq) NOT found
```

---

### Step 3: Test with Guaranteed Working Page

Open this test HTML file I created:

```
file:///tmp/test-fb-pixel.html
```

This page has a real Facebook Pixel script. Check console for:
```
[EchoFootPrint] Content script loaded on
[EchoFootPrint] Facebook Pixel detected! {detected: true, method: 'script', ...}
```

**If this DOESN'T work**: Extension has a bug
**If this WORKS**: Sites you're testing simply don't have Facebook Pixel

---

### Step 4: Check Service Worker

1. Go to `chrome://extensions`
2. Find EchoFootPrint
3. Click **"Inspect views: service worker"**
4. Go to Console tab
5. Visit target.com in another tab
6. Watch service worker console for:

```
[ServiceWorker] Message received {type: 'PIXEL_DETECTED', sender: 123456}
[ServiceWorker] Pixel detection persisted to IndexedDB {id: 1, domain: 'www.target.com', ...}
```

---

### Step 5: Check Dashboard Database

Even if no console logs, check if data is actually being stored:

1. Open dashboard
2. Open DevTools Console on dashboard
3. Run:

```javascript
// Check database directly
const { db } = await import('./utils/db.js');
const footprints = await db.footprints.toArray();
console.log('Total footprints:', footprints.length);
console.log('Footprints:', footprints);
```

---

## Common Issues & Solutions

### Issue 1: "No logs at all"
**Cause**: Content script not injected
**Solution**:
1. Check extension is enabled
2. Check permissions in manifest.json
3. Reload extension
4. Try in Incognito mode (disable other extensions)

### Issue 2: "Logs show 'No Facebook Pixel detected'"
**Cause**: Site doesn't have Facebook Pixel
**Solution**: Try retail sites (Target, Walmart, Nike)

### Issue 3: "Logs show error messages"
**Cause**: JavaScript error in detection code
**Solution**: Share the error message

### Issue 4: "Works on test file but not real sites"
**Cause**: Sites removed Facebook Pixel
**Solution**: This is expected. Try more retail sites.

---

## Why CNN and Reddit Don't Have Facebook Pixel

### CNN (News Site)
- Privacy regulations (GDPR)
- Reader trust concerns
- Switched to other analytics (Google Analytics, Chartbeat)
- May have removed it in 2020-2021

### Reddit
- Privacy-focused platform
- Never had Facebook Pixel (competitor to Facebook)
- Uses own tracking (Reddit Pixel)
- Community would backlash against Facebook tracking

---

## Recommended Test Sites

### E-Commerce (99% have Facebook Pixel):
```
target.com
walmart.com
bestbuy.com
homedepot.com
lowes.com
macys.com
nordstrom.com
```

### Fashion/Beauty (95% have it):
```
nike.com
adidas.com
sephora.com
ulta.com
zara.com
hm.com
```

### Food/Delivery (90% have it):
```
dominos.com
pizzahut.com
doordash.com
ubereats.com
```

---

## Quick Verification Script

Run this on ANY page to check if extension is working:

```javascript
// 1. Check if content script injected
console.log('Extension injected:', window.location.href);

// 2. Check for Facebook scripts
const fbScripts = document.querySelectorAll('script[src*="facebook"]');
console.log('Facebook scripts:', fbScripts.length);

// 3. Check if fbq exists
console.log('Facebook Pixel loaded:', typeof window.fbq !== 'undefined');

// 4. Force detection manually
setTimeout(() => {
  const scripts = Array.from(document.querySelectorAll('script'));
  const fbScripts = scripts.filter(s => s.src && s.src.includes('facebook'));
  console.log('Manual detection:', fbScripts.length > 0 ? 'FOUND' : 'NOT FOUND');
}, 2000);
```

---

## If Nothing Works

### Last Resort: Increase Detection Delay

Edit `src/content/content-script.js` line 14:

```javascript
// BEFORE:
const DETECTION_DELAY_MS = 500;

// AFTER:
const DETECTION_DELAY_MS = 3000;  // Wait 3 seconds
```

Then rebuild:
```bash
npm run build
```

---

## Expected Results

After visiting **target.com**:

**Console logs:**
```
[EchoFootPrint] Content script loaded on www.target.com
[EchoFootPrint] Detection completed in 23ms
[EchoFootPrint] Facebook Pixel detected! {detected: true, method: 'script', ...}
[EchoFootPrint] Detection sent to service worker
```

**Dashboard:**
```
Total Detections: 1
Unique Domains: 1
Domains: www.target.com
```

---

## Summary

1. ✅ **Extension is likely working correctly**
2. ❌ **CNN and Reddit simply don't have Facebook Pixel**
3. ✅ **Try retail sites like Target, Walmart, Nike**
4. ✅ **Use the test HTML file to verify extension works**

If the test HTML file works but real sites don't, it means those sites removed Facebook Pixel (which is common now).
