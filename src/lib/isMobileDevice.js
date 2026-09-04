// General "is this a touchscreen phone/tablet" check -- broader than
// isNativeAndroid.js on purpose. Used for things that don't make sense on
// ANY mobile device (like keyboard shortcuts, which need a physical
// keyboard), not just our own native Android app -- a desktop PWA/browser
// install should still see them, but a mobile browser tab shouldn't either.
export function isMobileDevice() {
  try {
    return typeof navigator !== 'undefined' && /iphone|ipad|ipod|android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}
