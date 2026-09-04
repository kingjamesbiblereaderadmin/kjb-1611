import { Capacitor } from '@capacitor/core';

// Prefer our own guaranteed-correct marker (window.__KJB_NATIVE_ANDROID__,
// injected directly into the HTML by MainActivity.java's
// injectNativeMarker() -- but only when serving the offline-fallback
// bundled copy, where Capacitor's own request-handling pipeline is bypassed
// entirely by reading the asset file directly. Whatever Capacitor itself
// normally does to make Capacitor.isNativePlatform() work correctly doesn't
// happen on that path, so relying on Capacitor's check alone could silently
// read wrong there (breaking bibleCache.js's native Bible-text path,
// Settings' native-only sections, etc.) even though the app genuinely is
// running natively. Falls back to Capacitor's own check for the normal
// (live site) case, where it's expected to already work correctly.
export function isNativeAndroid() {
  try {
    if (typeof window !== 'undefined' && window.__KJB_NATIVE_ANDROID__ === true) {
      return true;
    }
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}
