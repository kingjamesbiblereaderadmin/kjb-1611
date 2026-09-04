// Every "Share" button in the app (verses, Gospel/Salvation, search results,
// saved verses) calls navigator.share() first, falling back to a clipboard
// copy when unavailable. navigator.share() works fine in the actual Chrome
// app or a Custom Tab, but NOT automatically inside a WebView embedded in a
// third-party app like this one -- there's no OS-level share-sheet hook
// wired up without the host app explicitly handling it. So on native
// Android, navigator.share was always undefined (or failing), and every
// share silently fell through to "just copies text" -- matching exactly
// what this fixes. window.kjbShareBridge (registered by MainActivity.java's
// addJavascriptInterface, Android only) shows Android's real native share
// sheet (Intent.ACTION_SEND via a chooser) directly. Returns true if the
// native path handled it (caller should stop, not also try
// navigator.share()/clipboard); false if there's no native bridge (caller
// should fall back to its existing web behavior).
export function nativeShare({ title = '', text = '' } = {}) {
  if (typeof window !== 'undefined' && window.kjbShareBridge && typeof window.kjbShareBridge.share === 'function') {
    try {
      window.kjbShareBridge.share(title || '', text || '');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
