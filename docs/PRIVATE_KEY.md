# Chrome Extension Private Key (dist.pem)

## Overview

The `dist.pem` file is a **private RSA key** used for Chrome extension packaging and distribution. This file is **CRITICAL** for maintaining a consistent extension ID across builds.

## What is dist.pem?

When you package a Chrome extension, Chrome can:
1. Generate a random private key (creates a random extension ID)
2. Use an existing private key (maintains the same extension ID)

The `dist.pem` file ensures your extension always has the **same extension ID**, which is important for:
- User data persistence (IndexedDB is tied to extension ID)
- Consistent permissions across updates
- Extension installation and auto-updates

## Security

⚠️ **NEVER COMMIT THIS FILE TO GIT**

The private key in `dist.pem` must be kept **SECRET** because:
- Anyone with this key can impersonate your extension
- It can be used to sign malicious versions of your extension
- Compromised keys cannot be revoked (must create new extension)

### Protection Measures

✅ Already protected:
- Added to `.gitignore` (line 44: `*.pem`)
- File permissions: `600` (owner read/write only)
- Removed from git history (Nov 2025)

### If Compromised

If `dist.pem` is ever exposed:
1. **IMMEDIATELY** delete the old key: `rm dist.pem`
2. Generate a new key: `openssl genrsa -out dist.pem 2048`
3. Set permissions: `chmod 600 dist.pem`
4. **IMPORTANT**: This creates a NEW extension ID - all users must reinstall

## How to Use

### Generate New Private Key

```bash
# Generate 2048-bit RSA private key
openssl genrsa -out dist.pem 2048

# Set secure permissions
chmod 600 dist.pem

# Verify key is valid
openssl rsa -in dist.pem -check -noout
```

### Extract Public Key (for reference only)

```bash
# Extract public key
openssl rsa -in dist.pem -pubout -out dist.pub

# View public key
cat dist.pub
```

### Package Extension with Private Key

```bash
# Build extension
npm run build

# Package with chrome (uses dist.pem if present)
# The .crx file will use this private key
chrome --pack-extension=./dist --pack-extension-key=./dist.pem
```

## Extension ID

The extension ID is derived from the **public key** (which comes from `dist.pem`).

You can calculate it:
```bash
# Extract public key in DER format
openssl rsa -in dist.pem -pubout -outform DER -out dist.pub.der

# Calculate SHA256 hash and take first 128 bits
openssl dgst -sha256 -binary dist.pub.der | head -c 16 | hexdump -v -e '/1 "%02x"'
```

The extension ID is this hash encoded in base32 (a-p instead of 0-9,a-f).

## Current Key Info

**Generated**: November 13, 2025
**Key Size**: 2048 bits
**Algorithm**: RSA
**Purpose**: Chrome extension signing

**Public Key Fingerprint** (SHA256):
```bash
openssl rsa -in dist.pem -pubout -outform DER | openssl dgst -sha256
```

## Backup Strategy

🔒 **Store `dist.pem` securely**:
- Keep encrypted backup in password manager
- Store in secure cloud storage (encrypted)
- **Never** email or share via unencrypted channels
- **Never** commit to version control

## Troubleshooting

### Problem: Extension ID changed after rebuild

**Cause**: `dist.pem` was deleted or regenerated

**Solution**:
- Restore `dist.pem` from backup
- If no backup exists, extension ID will be new (users must reinstall)

### Problem: "Could not load private key" error

**Cause**: Invalid or corrupted `dist.pem`

**Solution**:
```bash
# Verify key integrity
openssl rsa -in dist.pem -check -noout

# If invalid, regenerate (creates new extension ID)
openssl genrsa -out dist.pem 2048
```

## References

- [Chrome Extension Packaging](https://developer.chrome.com/docs/extensions/mv3/linux_hosting/)
- [Understanding Extension IDs](https://stackoverflow.com/questions/23873623/obtaining-chrome-extension-id-for-development)
- [OpenSSL Documentation](https://www.openssl.org/docs/)

---

**Last Updated**: November 13, 2025
**Status**: New key generated after security incident (old key compromised)
