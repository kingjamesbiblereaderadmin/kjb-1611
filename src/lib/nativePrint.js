// Shared by every print feature in the app (reader "Print Page"/"Print
// Contents", Gospel/Salvation export, search results export). All of them
// used window.print() directly or via a hidden iframe's
// iframe.contentWindow.print() -- the standard browser Print API, but a bare
// Android WebView has no print UI of its own to respond to that call, so it
// silently does nothing. window.kjbPrintBridge (registered by
// MainActivity.java's addJavascriptInterface, Android only) hooks up
// Android's real PrintManager instead; these helpers use it when present,
// and fall back to the standard browser approach everywhere else.

// Prints the CURRENT page exactly as shown (replaces a bare window.print()
// call). Returns true if the native path handled it (caller should NOT also
// call window.print()), false if there's no native bridge (caller should
// fall back to window.print() itself).
export function nativePrintCurrentPage() {
  if (typeof window !== 'undefined' && window.kjbPrintBridge && typeof window.kjbPrintBridge.printCurrent === 'function') {
    try {
      window.kjbPrintBridge.printCurrent();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Prints an arbitrary HTML string (replaces the hidden-iframe print trick
// used for custom, formatted export documents). Returns true/false the same
// way as nativePrintCurrentPage().
export function nativePrintHtml(html) {
  if (typeof window !== 'undefined' && window.kjbPrintBridge && typeof window.kjbPrintBridge.printHtml === 'function') {
    try {
      window.kjbPrintBridge.printHtml(html);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
