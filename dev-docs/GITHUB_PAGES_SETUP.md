# GitHub Pages + Custom Domain Setup Guide

**Goal:** Host `https://echo-footprint.luongnv.com` on GitHub Pages.

---

## Step 1 — Enable GitHub Pages in Repo Settings

1. Go to **Settings → Pages** in the GitHub repo.
2. **Source:** `Deploy from a branch`
3. **Branch:** `main` / `landing-page/` folder
4. **Save**

GitHub will build and deploy. After ~1–2 minutes you'll get a temporary URL like:
```
https://luongnv89.github.io/echo-footprint/landing-page/
```

---

## Step 2 — Add the CNAME file (already done)

The file `landing-page/CNAME` contains:
```
echo-footprint.luongnv.com
```

This tells GitHub Pages which custom domain to serve. Push this to `main` and GitHub will pick it up automatically.

---

## Step 3 — Configure DNS at Your Registrar

Log in to your domain registrar (where `luongnv.com` is registered) and add these records:

### For `echo-footprint.luongnv.com` (subdomain)

| Type    | Name                  | Value(s)                                                                 | TTL   |
|---------|-----------------------|--------------------------------------------------------------------------|-------|
| CNAME   | `echo-footprint`      | `luongnv89.github.io`                                                    | Auto  |

> GitHub Pages also supports A records as an alternative. If your registrar doesn't support CNAME at the subdomain level, use these instead:

| Type | Name               | Value           | TTL   |
|------|--------------------|-----------------|-------|
| A    | `echo-footprint`   | `185.199.108.153`  | Auto  |
| A    | `echo-footprint`   | `185.199.109.153`  | Auto  |
| A    | `echo-footprint`   | `185.199.110.153`  | Auto  |
| A    | `echo-footprint`   | `185.199.111.153`  | Auto  |

### (Optional) For `www.echo-footprint.luongnv.com`

| Type    | Name                     | Value                   | TTL   |
|---------|--------------------------|-------------------------|-------|
| CNAME   | `www.echo-footprint`     | `echo-footprint.luongnv.com` | Auto  |

---

## Step 4 — Wait for DNS Propagation

DNS changes typically propagate within **5–30 minutes**, but can take up to 48 hours.

You can check propagation with:
```bash
dig CNAME echo-footprint.luongnv.com
dig A echo-footprint.luongnv.com
```

---

## Step 5 — Verify HTTPS

GitHub Pages automatically provisions a free SSL certificate via Let's Encrypt.

After DNS propagates:
1. Visit `https://echo-footprint.luongnv.com` — should show the landing page.
2. Visit `https://echo-footprint.luongnv.com/privacy.html` — should show the privacy policy.
3. In **GitHub Settings → Pages → Custom domain**, verify the "Enforce HTTPS" toggle is on.

---

## Step 6 — Update Chrome Web Store

Once the URL is live, set the **Privacy Policy URL** in the CWS dashboard to:
```
https://echo-footprint.luongnv.com/privacy.html
```

---

## Rollback (if needed)

To switch back to Netlify:
1. Remove the `CNAME` file from `landing-page/`
2. In GitHub Settings → Pages, set source to "Disabled"
3. Re-point DNS at your registrar back to Netlify's servers
