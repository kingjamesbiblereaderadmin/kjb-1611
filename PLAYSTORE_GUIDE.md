# KJB Reader — Google Play Store Publishing Guide

This app ships as a native Android app built from the repo's `android/` folder.
It is a **WebView wrapper** that loads the published PWA at
`https://kingjamesbiblereader.com/` (see `MainActivity.kt`). The GitHub Actions
workflow `.github/workflows/build-android.yml` builds, signs, and exports both
a **signed APK** and a **signed AAB** (Android App Bundle — the format Play
Store requires for new submissions).

---

## 0. Prerequisites (one-time)

1. A **Google Play Developer account** ($25 one-time fee) at
   <https://play.google.com/console>.
2. Your published Base44 app must be live at a stable HTTPS URL
   (`kingjamesbiblereader.com`). The Android app hard-codes this URL.
3. Android Studio (optional, only for local builds) OR just use GitHub Actions.

---

## 1. Generate ONE persistent release keystore (do this locally, once)

Play Store rejects any update signed with a different key than the first
upload, so you must create **one** keystore and reuse it forever. Do **not**
let CI generate a new key each build (the throwaway fallback exists only for a
first-time upload with no secret set — avoid it).

On a machine with Java installed:

```bash
keytool -genkeypair -v \
  -keystore kjb-release.keystore \
  -alias kjb \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASS \
  -keypass YOUR_KEY_PASS
```

- Fill in your name/org when prompted (any values are fine).
- **Back this file up somewhere safe** (encrypted drive, password manager).
  Losing it means you can never update the app on Play Store again (you'd have
  to delist and republish with a new package name).

---

## 2. Add the keystore to GitHub Actions as secrets

Base64-encode the keystore so you can paste it into a secret:

```bash
base64 -i kjb-release.keystore | tr -d '\n'
```

In your GitHub repo → **Settings → Secrets and variables → Actions** →
**New repository secret**, add these four:

| Secret name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the base64 output above |
| `ANDROID_KEYSTORE_PASSWORD` | `YOUR_STORE_PASS` |
| `ANDROID_KEY_ALIAS` | `kjb` |
| `ANDROID_KEY_PASSWORD` | `YOUR_KEY_PASS` |

With these set, every CI build signs with your persistent key, so Play Store
accepts it as an update.

---

## 3. Bump the version before each release

Edit `android/app/build.gradle`:

```gradle
versionCode 5        // integer, +1 every release
versionName "1.0.2"  // human-readable string
```

Play Store requires `versionCode` to strictly increase on every upload.

---

## 4. Build the release artifacts

> **Important — update the workflow file manually.** Base44's builder can't
> write to `.github/workflows/` for you, so open `.github/workflows/build-android.yml`
> in your GitHub repo and replace its contents with the version below. It uses
> your persistent keystore (from the secrets in step 2), builds a **signed AAB**
> (Play Store format) **and** a signed APK, and uploads both.

```yaml
name: Build Android
on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v4
      - name: Set up Android SDK
        uses: android-actions/setup-android@v3
      - name: Generate Gradle wrapper (if missing)
        working-directory: android
        run: |
          if [ ! -f gradlew ]; then
            gradle wrapper --gradle-version 8.7
          fi
          chmod +x gradlew || true
      - name: Prepare signing keystore
        working-directory: android
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          if [ -n "$ANDROID_KEYSTORE_BASE64" ]; then
            echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > release.keystore
          else
            echo "⚠️ No ANDROID_KEYSTORE_BASE64 secret — generating a THROWAWAY key (first upload only)."
            keytool -genkeypair -v -keystore release.keystore -alias appnative \
              -keyalg RSA -keysize 2048 -validity 10000 \
              -storepass appnative -keypass appnative \
              -dname "CN=AppNative, OU=Mobile, O=AppNative, L=, S=, C=US"
          fi
      - name: Build signed release APK + AAB
        working-directory: android
        env:
          ANDROID_KEYSTORE_PATH: release.keystore
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD || 'appnative' }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS || 'appnative' }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD || 'appnative' }}
        run: ./gradlew assembleRelease bundleRelease
      - name: Zipalign & sign APK (extra guard)
        working-directory: android
        run: |
          BUILD_TOOLS_DIR=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -n 1)
          IN_APK=app/build/outputs/apk/release/app-release-unsigned.apk
          [ -f "$IN_APK" ] || IN_APK=app/build/outputs/apk/release/app-release.apk
          "$BUILD_TOOLS_DIR/zipalign" -p -f 4 "$IN_APK" app-aligned.apk
          "$BUILD_TOOLS_DIR/apksigner" sign --ks release.keystore \
            --ks-key-alias ${{ secrets.ANDROID_KEY_ALIAS || 'appnative' }} \
            --ks-pass pass:${{ secrets.ANDROID_KEYSTORE_PASSWORD || 'appnative' }} \
            --key-pass pass:${{ secrets.ANDROID_KEY_PASSWORD || 'appnative' }} \
            --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
            --out app-release-signed.apk app-aligned.apk
          "$BUILD_TOOLS_DIR/apksigner" verify --verbose app-release-signed.apk || true
      - name: Upload signed APK
        uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: android/app-release-signed.apk
      - name: Upload signed AAB
        uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: android/app/build/outputs/bundle/release/app-release.aab
```

In your GitHub repo → **Actions** tab → **Build Android** → **Run workflow**.
When it finishes, download both artifacts from the run:

- `android-aab` → `app-release.aab`  ← **upload this to Play Store**
- `android-apk` → `app-release-signed.apk`  ← for direct-install testing only

### Local build alternative (Android Studio)

```bash
cd android
./gradlew bundleRelease      # → app/build/outputs/bundle/release/app-release.aab
# (signing reads the same ANDROID_KEYSTORE_* env vars; export them first)
```

---

## 5. Create the app in Play Console

1. Go to <https://play.google.com/console> → **Create app**.
2. App name: **KJB Reader**.
3. Default language: English, App type: **App**, Free, accept declarations.
4. **App content** questionnaire (required before release):
   - Privacy Policy URL: `https://kingjamesbiblereader.com/privacy`
   - Data safety: declare **Push notifications** + **Time zone** (and the
     email/account if login is required) — match the updated Privacy Policy.
     No ads, no tracking, no financial info.
   - Target audience: 18+ / all ages as appropriate; no children-targeted.
   - Ads: No.
5. **App signing** → Play App Signing: **opt in** (recommended). You can either
   let Google re-sign your AAB, or use **"Use my own key"** (advanced). For a
   first app, accept Play App Signing (Google manages the upload key).

---

## 6. Upload the AAB

1. Play Console → your app → **Production → Create release**.
2. Upload `app-release.aab`.
3. Add release notes, then **Review release**. Fix any errors the console flags
   (missing icons, missing privacy declaration, etc.).
4. **Start rollout to Production** (or roll out to **Internal testing** first to
   test on your own device before going public).

---

## 7. Store listing assets

Prepare before submitting:

| Asset | Requirement |
|---|---|
| App icon | 512×512 PNG (32-bit, no alpha) |
| Feature graphic | 1024×500 PNG/JPG |
| Phone screenshots | at least 2, min 320px, max 3840px, 16:9 or 9:16 |
| App name / short / full description | text |
| App category | Books & Reference or Education |
| Contact email | kingjamesbiblereader@outlook.sg |

You already have a 1024x1707 phone screenshot set referenced in the manifest,
plus the Play Store icon — reuse those.

---

## 8. Web/push note

The Android app is a WebView over the published PWA, so **web push
notifications** work exactly as in the browser (delivered at the user's local
8am via the Base44 `sendDailyVersePush` function, triggered hourly by the
Discloud cron). No extra Android-side push setup (Firebase/FCM) is needed,
because notifications come through the WebView's service worker, not native
Android push.

---

## 9. Updating later

1. Bump `versionCode` (+1) and `versionName` in `android/app/build.gradle`.
2. Re-deploy the Base44 app (so the WebView loads the latest PWA).
3. Re-run the **Build Android** workflow.
4. Upload the new `app-release.aab` in Play Console → Production → Create
   release. Same keystore → accepted as an update.

---

## Troubleshooting

- **"Your APK/AAB is signed with a different key"** → you uploaded with a
  throwaway key first time. You must either use the **same** keystore that
  signed the first accepted upload, or contact Play support to reset your
  signing key (only possible with Play App Signing enrolled).
- **Blank screen on launch** → the Base44 app isn't published at
  `kingjamesbiblereader.com`, or the device is offline. The WebView only loads
  that URL.
- **WebView app flagged for "low value/repackaging"** → Google sometimes
  rejects pure website wrappers. Mitigations already in place: OAuth handled
  in-WebView, back-button navigation, splash theme. If rejected, appeal with a
  note that the app provides offline Bible reading + push notifications beyond
  the website.