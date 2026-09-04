import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { appParams } from '@/lib/app-params';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

// The legacy reader is a 100% server-rendered HTML page (no React, no JS),
// served by the `legacy` backend function so it works on ancient browsers
// (IE8/IE9, Windows Phone). Embedded in an iframe here (rather than a full
// window.location.replace() away from the app) so it stays reachable as an
// in-app page instead of acting like an external link.
function legacyUrl(extraParams = []) {
  const host = (typeof window !== 'undefined' && window.location.hostname) || '';
  // On a custom domain the function is reachable at a clean /functions/legacy
  // path (no app_id needed). Only base44.app hosting requires the app-scoped
  // path with app_id.
  const isCustom = host.indexOf('base44.app') === -1 && host.indexOf('localhost') === -1;
  const base = (isCustom || !appParams.appId)
    ? '/functions/legacy'
    : `/api/apps/${appParams.appId}/functions/legacy?app_id=${appParams.appId}`;
  const params = [];
  // Cache-bust: this endpoint is served with stale-while-revalidate=604800
  // (7 days), so without this a stale cached copy -- from before any fix to
  // this page's own HTML -- could keep being served for up to a week even
  // after the source was corrected.
  params.push(`t=${Date.now()}`);
  params.push(...extraParams);
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.join('&')}`;
}

export default function LegacyReader() {
  const native = isNativeAndroid();
  // Two distinct URLs: the iframe gets native=1 (asks the backend to omit its
  // own "Back to KJB Reader" link on native, since the wrapper's own button
  // below already does that job with proper in-app back-history -- one back
  // mechanism, not two). "Open in Browser" deliberately does NOT get that
  // param: once it's genuinely external, the embedded link is the only way
  // back and should keep working there.
  const [iframeUrl] = useState(() => legacyUrl(native ? ['native=1'] : []));
  const [browserUrl] = useState(() => legacyUrl(['open_external=1']));
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  // Genuine "go back" -- to wherever the user actually came from (Settings,
  // About, etc.) -- rather than always landing on Home regardless of entry
  // point. Falls back to Home only when there's nowhere to go back to (e.g.
  // Legacy Reader was the very first screen this session).
  const goBack = () => {
    const hasHistory = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;
    if (hasHistory) navigate(-1);
    else navigate('/');
  };

  // On web there is no benefit to the iframe-wrapped in-app experience below
  // (that was specifically to keep the NATIVE app feeling contained, instead
  // of kicking users out to an external Chrome tab) -- a plain page
  // navigation straight to the legacy function's own URL is simpler and
  // avoids the iframe/cache/target=_top complexity entirely, since that URL
  // is already a complete, real page with its own working back link.
  useEffect(() => {
    if (!native) {
      window.location.replace(iframeUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!native) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f7f7fb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#2d2a6e', color: '#fff', fontFamily: 'Arial, sans-serif', fontSize: 13, flexShrink: 0 }}>
        <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', textDecoration: 'none', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back to App
        </button>
        <a href={browserUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cfcfe8', textDecoration: 'none' }}>
          Open in Browser <ExternalLink size={13} />
        </a>
      </div>
      {!loaded && (
        <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Arial, sans-serif', color: '#555' }}>
          Opening Legacy Reader…
        </p>
      )}
      <iframe
        src={iframeUrl}
        title="Legacy Reader"
        onLoad={() => setLoaded(true)}
        style={{ flex: 1, width: '100%', border: '0', background: '#fff' }}
      />
    </div>
  );
}
