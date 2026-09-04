import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const PROMPT = `I have a Capacitor 6 project (React PWA) with an existing android/ folder for an app called "KJB Reader" (appId: com.kingjamesbiblereader.twa). I need you to fully regenerate the native Android shell.

Context:
- The web app itself is untouched — only capacitor.config.ts, package.json, and the android/ native project change.
- @capacitor/push-notifications and web-push have already been removed from package.json; @capacitor/share has been added.
- capacitor.config.ts server.url must stay "https://kingjamesbiblereader.com" (remote-URL mode, not a bundled build).
- appId MUST remain "com.kingjamesbiblereader.twa" (Play Store package name — do not change).

Steps:
1. Delete the existing android/ folder entirely.
2. Run \`npx cap add android\` to regenerate a fresh native Android project from the current capacitor.config.ts and installed plugins.
3. Run \`npx cap sync android\`.
4. Re-apply these customizations to the freshly generated project (they existed before and must be preserved):
   a. capacitor.config.ts: appId "com.kingjamesbiblereader.twa", appName "KJB Reader", server.url "https://kingjamesbiblereader.com", cleartext: false, allowNavigation list for OAuth hosts (accounts.google.com, accounts.youtube.com, oauth.googleusercontent.com, appleid.apple.com, apple.com, *.apple.com, icloud.com, *.icloud.com, github.com, *.github.com, login.microsoftonline.com, facebook.com, *.facebook.com, base44.com, *.base44.com), android.allowMixedContent: false. Do NOT add a PushNotifications plugin block.
   b. android/app/src/main/java/com/kingjamesbiblereader/twa/MainActivity.java: keep it extending BridgeActivity, with the existing onCreate() logic — enable 3rd-party cookies via CookieManager, and set a custom WebChromeClient subclassing BridgeWebChromeClient that overrides onCreateWindow() to load OAuth popups (window.open) in the same WebView instead of escaping to Chrome (transport.setWebView(view); resultMsg.sendToTarget(); return true).
   c. Add an Android Share Target: in AndroidManifest.xml add an <intent-filter> on MainActivity for android.intent.action.SEND with mimeType text/plain, so KJB Reader appears in the Android share sheet when a user selects text in another app.
   d. In MainActivity.java (package com.kingjamesbiblereader.twa), add a handler (called from onCreate via getIntent(), and from an overridden onNewIntent()) that: checks if the incoming Intent action is Intent.ACTION_SEND with type "text/plain", reads Intent.EXTRA_TEXT, builds the URL "https://kingjamesbiblereader.com/search?q=" + Uri.encode(sharedText), and loads it in the WebView (getBridge().getWebView().loadUrl(url) on cold start via onCreate, or the same call in onNewIntent for a running instance). Call setIntent(intent) inside onNewIntent since launchMode is singleTask.
   e. android/app/build.gradle: remove the try/catch block that conditionally applies the com.google.gms.google-services plugin based on google-services.json (push notifications are gone, so this FCM setup is no longer needed).
   f. Confirm android/app/build.gradle keeps applicationId "com.kingjamesbiblereader.twa" (and namespace matching), the same signingConfigs.release block reading ANDROID_KEYSTORE_PATH / ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD from environment variables, and buildTypes.release using that signingConfig.
   g. Confirm the AndroidManifest.xml keeps the FileProvider <provider> block and the INTERNET permission.
5. Run a release build (\`./gradlew assembleRelease\` or \`bundleRelease\`) with the CI keystore env vars set, and confirm it compiles and installs, still loading kingjamesbiblereader.com in the WebView, with the OAuth popup behavior and the new Share Target intact.

Do not change the applicationId, do not switch server.url to a bundled local build, and do not reintroduce push-notifications or google-services.`;

export default function AndroidPromptTool() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = PROMPT;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-serif text-lg font-bold text-foreground">Android Rebuild Prompt (for Claude)</h2>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
            copied ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground bg-secondary rounded-lg p-4 max-h-[60vh] overflow-y-auto">
        {PROMPT}
      </pre>
    </div>
  );
}