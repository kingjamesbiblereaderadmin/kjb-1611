# Capacitor native shell — setup guide

This repo now has Capacitor installed so the **native Android app** can use
real native push notifications, while the **PWA/web** stays exactly as-is.

The native shell runs in **remote-URL mode**: it loads the live PWA at
`https://kingjamesbiblereader.com` (see `capacitor.config.ts`), so you keep
the live-update behaviour of the old bare-WebView wrapper *and* gain the
Capacitor runtime + plugins. No web build is bundled into the APK.

---

## One-time local setup

These steps must run on **your machine** (the Base44 builder can't run the
Capacitor CLI / Android Studio):

### 1. Back up the existing bare-WebView project
The old `android/` folder (bare WebView, custom `MainActivity.kt`) will be
replaced by Capacitor's generated project. Back it up first so you can
re-apply the custom logic later:

```bash
mv android android-legacy
```

### 2. Generate the Capacitor Android project
```bash
npm run build          # produces dist/ (webDir referenced by cap sync)
npx cap add android
npx cap sync
```

### 3. Re-apply the custom native logic from `android-legacy/`
Capacitor generates a fresh `android/` with its own `MainActivity`. You'll
need to port these from the legacy wrapper:

- **OAuth host allowlist** (accounts.google.com, appleid.apple.com, …) —
  in Capacitor, external links are handled by the `@capacitor/browser` plugin
  or a custom `WebViewLocalServer` / `shouldOverrideUrlLoading` override in
  `MainActivity.java`. See the `android-legacy/app/src/main/java/kjbreader/app/MainActivity.kt`
  `authHosts` list.
- **Custom User-Agent token (`KJBReader`)** — the PWA used this to detect the
  native app. With Capacitor, prefer `window.Capacitor.isNativePlatform()` /
  `Capacitor.getPlatform() === 'android'` on the web side instead (cleaner,
  no UA hack). If you must keep the UA token, set it via
  `webView.getSettings().setUserAgentString(...)` in the generated
  `MainActivity.java` `onCreate`.
- **AppNative upsell banner** — that JS is injected by the *remote PWA*
  itself (it runs `fetch('https://appnative.base44.app/...')` on page load),
  so it keeps working automatically inside Capacitor. No porting needed.
- **Signing config** — copy the `signingConfigs.release` block from
  `android-legacy/app/build.gradle` into the new
  `android/app/build.gradle`, and keep the CI env-var names
  (`ANDROID_KEYSTORE_PATH`, etc.) so the existing GitHub Actions workflow
  still signs releases.

### 4. Open in Android Studio & build
```bash
npx cap open android
```
Android Studio opens → build the AAB as before. The existing
`.github/workflows/build-android.yml` needs its working directory / gradle
commands kept aligned with the Capacitor-generated project (Capacitor's
android project uses the same gradle tasks: `bundleRelease`, `assembleRelease`).

---

## Enabling push notifications (the reason we added Capacitor)

### Native side (FCM)
1. Create a Firebase project → add an Android app with package id
   **`kjbreader.app`** (must match `appId` in `capacitor.config.ts`).
2. Download `google-services.json` → place at `android/app/google-services.json`.
3. Add the Firebase gradle plugin to `android/app/build.gradle` + the
   classpath to `android/build.gradle` (standard Capacitor + FCM setup — see
   `@capacitor/push-notifications` docs).
4. In Firebase Console → Project settings → Cloud Messaging → enable it.

### Web side (PWA calls the plugin)
The remote PWA requests permission + registers the FCM token, then POSTs it
to your own push backend (Base44's `SendPushNotification` doesn't currently
deliver, so you'll run a small Cloud Function / server that sends via the
Firebase Admin SDK). Guard all calls with `Capacitor.isNativePlatform()` so
the web/PWA build isn't affected:

```js
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

if (Capacitor.isNativePlatform()) {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  PushNotifications.addListener('registration', token => {
    // POST token.value to your push backend
  });
}
```

The existing `sendDailyVerseNativePush` backend function can stay as a
no-op placeholder until Base44 ships native push, OR be replaced by your own
Firebase-Admin-based sender once the backend exists.

---

## Day-to-day workflow

- After web changes (PWA): just deploy the site as usual. The native shell
  reloads the live URL — no `cap sync` needed for content changes.
- After Capacitor config / native plugin changes:
  ```bash
  npx cap sync
  npx cap open android   # rebuild AAB
  ```

## Notes
- `appId` (`kjbreader.app`) is deliberately kept identical to the legacy
  `applicationId` so Google Play accepts the next upload as an update.
- The web/PWA build path (`npm run build`, service worker, manifest) is
  unchanged — Capacitor is native-only here.
- The existing `android-legacy/` folder is only for reference while porting;
  it is not built or shipped. Delete it once the port is complete.