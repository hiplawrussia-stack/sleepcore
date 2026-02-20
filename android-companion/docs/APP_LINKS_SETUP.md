# Android App Links Setup

## Overview

SleepCore uses HTTPS App Links instead of custom URL schemes for security.
Custom schemes (`sleepcore://`) can be hijacked by malicious apps.
HTTPS App Links are verified via Digital Asset Links and cannot be intercepted.

## Requirements

1. **Domain control**: Access to `sleepcore.app` web server (app.sleepcore.app)
2. **HTTPS**: SSL certificate on the domain
3. **Release signing key**: SHA-256 fingerprint of the app signing certificate

## Setup Steps

### 1. Get SHA-256 Certificate Fingerprint

**For Debug builds:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**For Release builds (Google Play App Signing):**
1. Go to Google Play Console
2. Navigate to: Release > Setup > App signing
3. Copy the "SHA-256 certificate fingerprint" from "App signing key certificate"

### 2. Update assetlinks.json

Edit `assetlinks.json` and replace the placeholder with your fingerprint:

```json
{
  "sha256_cert_fingerprints": [
    "AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90"
  ]
}
```

### 3. Deploy to Server

Upload `assetlinks.json` to:
```
https://app.sleepcore.app/.well-known/assetlinks.json
```

**Server configuration (Nginx):**
```nginx
location /.well-known/assetlinks.json {
    default_type application/json;
    add_header Access-Control-Allow-Origin "*";
}
```

### 4. Verify Setup

**Using Google's verification tool:**
```
https://developers.google.com/digital-asset-links/tools/generator
```

**Using adb:**
```bash
adb shell pm get-app-links ru.sleepcore.companion
```

Expected output:
```
ru.sleepcore.companion:
  ID: ...
  Signatures: ...
  Domain verification state:
    app.sleepcore.app: verified
```

## Link Format

**New format (HTTPS App Link):**
```
https://app.sleepcore.app/app/link?code=ABC123
```

**Old format (deprecated, keep for backwards compatibility):**
```
sleepcore://link?code=ABC123
```

## Migration Plan

1. **Phase 1** (Current): Support both formats
2. **Phase 2** (2026-Q2): Warn users on old format
3. **Phase 3** (2026-Q3): Remove old format support

## Troubleshooting

### App Links not working

1. Check assetlinks.json is accessible:
   ```bash
   curl -v https://app.sleepcore.app/.well-known/assetlinks.json
   ```

2. Verify JSON syntax:
   ```bash
   cat assetlinks.json | jq .
   ```

3. Check fingerprint matches:
   - Compare fingerprint in assetlinks.json with app signing certificate
   - For Play Store: use App Signing key, NOT Upload key

### "Choose app" dialog appears

This means verification failed. Check:
- SSL certificate is valid
- assetlinks.json is at correct path
- SHA-256 fingerprint is correct
- Domain in manifest matches assetlinks.json host

## Security Notes

- NEVER use custom schemes for sensitive operations (login, payments)
- HTTPS App Links are verified at install time
- Verification happens every ~24 hours automatically
- If verification fails, Android falls back to "Choose app" dialog

## References

- [Android App Links](https://developer.android.com/training/app-links)
- [Digital Asset Links](https://developers.google.com/digital-asset-links)
- [OWASP MASVS-PLATFORM-1](https://mas.owasp.org/MASVS/)
