// The app's real public origin -- used for any URL that leaves the device:
// shared verses, copied links, search-result share links. Never use
// window.location.origin directly for these. On native Android the app can
// be showing content from the internal offline-fallback origin
// (appassets.androidplatform.net -- see MainActivity.java's
// OfflineCapableWebViewClient) even during otherwise-normal use, since it's
// only a virtual https origin for serving bundled assets and never resolves
// on the real internet. A link built from it is meaningless to anyone who
// receives it outside the device.
export function getPublicOrigin() {
  try {
    if (typeof window !== 'undefined' && window.location?.hostname === 'appassets.androidplatform.net') {
      return 'https://kingjamesbiblereader.com';
    }
    return (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'https://kingjamesbiblereader.com';
  } catch {
    return 'https://kingjamesbiblereader.com';
  }
}
