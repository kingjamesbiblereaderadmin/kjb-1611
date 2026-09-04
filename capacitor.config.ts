import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the native Android shell around the LIVE PWA (remote-URL
// server mode) instead of bundling a web build. The Capacitor bridge JS is
// still injected into the remote page, so native plugins — push
// notifications, app lifecycle — work on kingjamesbiblereader.com exactly as
// they would on a bundled app. The PWA web build is untouched.
//
// appId MUST match the Play Store `applicationId` (com.kingjamesbiblereader.twa)
// so app updates are accepted by Google Play (same applicationId + same
// signing key). Do not change this without a Play Store package-migration plan.
const config: CapacitorConfig = {
  appId: 'com.kingjamesbiblereader.twa',
  appName: 'KJB Reader',
  // Required field even in remote-URL mode (Capacitor sync still references it,
  // though the native shell serves server.url instead).
  webDir: 'dist',
  server: {
    url: 'https://kingjamesbiblereader.com',
    // Live site is https-only; keep cleartext off.
    cleartext: false,
    // OAuth providers (Google, Apple, etc.) MUST stay inside the WebView --
    // opening them in Chrome logs the user into Chrome, not the app. This is
    // Capacitor's built-in equivalent of the legacy bare-WebView project's
    // shouldOverrideUrlLoading()/authHosts allowlist (see MainActivity.kt in
    // android-legacy/). Bare entries + "*." entries both included since
    // Capacitor's host mask does exact-arity matching (no implicit subdomain
    // fallback like the old `host.endsWith(".$it")` check had).
    allowNavigation: [
      'accounts.google.com',
      'accounts.youtube.com',
      'oauth.googleusercontent.com',
      'appleid.apple.com',
      'apple.com',
      '*.apple.com',
      'icloud.com',
      '*.icloud.com',
      'github.com',
      '*.github.com',
      'login.microsoftonline.com',
      'facebook.com',
      '*.facebook.com',
      'base44.com',
      '*.base44.com',
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;