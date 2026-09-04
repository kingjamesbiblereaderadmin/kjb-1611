import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { detectIncognito } from '@/lib/incognito';
import { getSplashLogo } from '@/lib/splashLogo';

const STEP_PAUSE_MS = 1500;

// mode: 'first_load' | 'subsequent'
export default function SplashScreen({ isFadingOut, onDone, mode = 'first_load', isVisible = true, skipMarkVisited = false, isLookup = false }) {
  const [currentMessage, setCurrentMessage] = useState(
    mode === 'reconnect'
      ? 'RECONNECTING\u2026'
      : mode === 'subsequent'
      ? (isLookup ? 'LOOKING UP\u2026' : 'WELCOME BACK TO KJB READER.')
      : 'WELCOME TO KJB READER.'
  );
  const [isIncognito, setIsIncognito] = useState(false);
  // progress: 0-100 for a determinate bar (during downloads); null = indeterminate
  const [progress, setProgress] = useState(null);
  const doneRef = useRef(false);
  const stepsLog = useRef([]);

  // The static HTML boot splash lives outside #root so React doesn't remove it
  // on mount (which caused a logo flash). Hide it once the React splash has
  // rendered — they look identical, so the swap is seamless.
  useEffect(() => {
    const el = document.getElementById('kjb-boot-splash');
    if (el) requestAnimationFrame(() => { el.style.display = 'none'; });
  }, []);

  // Lock page scroll while the splash is up. The overlay is position:fixed
  // and covers the viewport, but the page underneath is still scrollable —
  // dragging it moves the real content while the fixed splash stays in
  // place, revealing a glimpse of the app through any edge/overscroll gap.
  useEffect(() => {
    if (!isVisible) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isVisible]);



  const setStep = (message) => {
    stepsLog.current.push(message);
    setCurrentMessage(message);
    setProgress(null); // non-download steps use an indeterminate bar
    console.log('[KJB Splash]', message);
    window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message, status: 'loading' } }));
  };

  const pause = (ms) => new Promise(r => setTimeout(r, ms));

  // Run a real async task while showing `label`. The banner stays visible for at
  // least MIN_VISIBLE_MS so it's readable, but it never advances before the real
  // work actually finishes — so every banner reflects real-time progress.
  const MIN_VISIBLE_MS = 600;
  const runStep = async (label, task) => {
    setStep(label);
    const start = Date.now();
    let result;
    try {
      result = await task();
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_VISIBLE_MS) await pause(MIN_VISIBLE_MS - elapsed);
    }
    return result;
  };

  // Download Bible data while live-updating the banner with real % progress.
  // Returns true on success, false on failure (e.g. WiFi drops mid-download) so
  // callers can stop pretending the update finished and fall back to whatever
  // is already cached, instead of silently marching on to "WELCOME".
  const downloadWithProgress = async (label) => {
    const { downloadBibleForOffline } = await import('@/lib/bibleCache');
    const start = Date.now();
    stepsLog.current.push(label);
    setCurrentMessage(label);
    setProgress(0);
    let ok = true;
    try {
      await downloadBibleForOffline((pct, msg) => {
        setProgress(pct);
        setCurrentMessage(`${label} ${pct}%`);
        window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message: `${label} ${pct}%`, status: 'loading' } }));
      });
      setProgress(100);
    } catch (err) {
      console.error('[Splash] Download failed:', err.message);
      ok = false;
    }
    const elapsed = Date.now() - start;
    if (elapsed < MIN_VISIBLE_MS) await pause(MIN_VISIBLE_MS - elapsed);
    return ok;
  };

  useEffect(() => {
    if (!isVisible || doneRef.current) return;
    doneRef.current = true;

    // Safety net: no matter what happens inside the flow (a thrown error, a
    // hung import, etc.), the splash MUST hand off to the app. Without this,
    // any unhandled exception left the overlay stuck on its last message
    // (e.g. "NO UPDATES FOUND.") forever, blanking the whole app behind it.
    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      try { window.dispatchEvent(new Event('kjb-progress-clear')); } catch {}
      onDone?.();
    };
    // Absolute cap — if the flow ever stalls, force the hand-off after 20s.
    const hardTimeout = setTimeout(finishOnce, 90000);

    (async () => {
      // === RECONNECT FLOW ===
      // Short-circuits entirely before incognito detection, offline
      // download, or install-prompt timing -- none of that applies here.
      // The user already has a fully loaded, visited app; this is purely a
      // brief "give the origin-switch page load a moment" beat with honest
      // wording, then hand straight back to the app.
      if (mode === 'reconnect') {
        setStep('RECONNECTING\u2026');
        window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message: 'RECONNECTING\u2026', status: 'loading' } }));
        await pause(STEP_PAUSE_MS);
        window.dispatchEvent(new Event('kjb-progress-clear'));
        finishOnce();
        return;
      }

      // Wait for incognito detection to complete before starting splash flow
      const detectedIncognito = await detectIncognito();
      setIsIncognito(detectedIncognito);
      
      let isFirstVisit = mode === 'first_load';

      console.log('[KJB Splash] Mode:', mode, 'Incognito:', detectedIncognito);

      // Helper: mark the app as visited so the NEXT visit is "subsequent".
      // IMPORTANT: this must only be called once a flow COMPLETES — never at the
      // start. If set early and the page reloads mid-flow (e.g. a SW update),
      // the reloaded splash would wrongly treat a first-time visitor as
      // returning (skipping "DOWNLOADING OFFLINE DATA", showing "WELCOME BACK").
      // While the setup wizard (/landing) is still on screen, never mark the
      // app "visited" — that flag must only flip once the user actually
      // finishes setup (via the wizard's "Enter"/"Open" links), so reopening
      // an installed-but-unfinished app continues the wizard instead of
      // jumping to Home.
      const markVisited = () => {
        if (!detectedIncognito && !skipMarkVisited) {
          try { localStorage.setItem('kjb-has-visited-app', 'true'); } catch {}
        }
      };

      // === FIRST LOAD FLOW ===
      if (isFirstVisit) {
        // 2. Skip offline download in incognito (cache won't persist)
        if (!detectedIncognito) {
          // 2. Downloading offline data (real-time % progress)
          const gotOfflineData = await downloadWithProgress('DOWNLOADING OFFLINE DATA...');

          // 2b. Offline data complete (or, if the connection dropped, say so
          // plainly instead of implying it finished)
          setStep(gotOfflineData ? 'OFFLINE BIBLE DATA COMPLETE.' : 'CONNECTION LOST — CONTINUING ONLINE-ONLY.');
          await pause(STEP_PAUSE_MS);
        } else {
          console.log('[Splash] Incognito mode detected — skipping offline download');
        }

        // Updates are no longer checked/installed here — that would block the
        // user for 20-30s on every open. Instead, a new app version installs
        // silently in the background (main.jsx polls periodically) and simply
        // takes effect the NEXT time the app is opened, with no wait at all.

        // 7b. Give the browser's install prompt a brief moment to fire so the
        // Install button is ready immediately (Edge fires beforeinstallprompt
        // late). Skip in incognito where install isn't available. Capped short
        // so it never noticeably delays the welcome.
        if (!detectedIncognito && !window.kjbDeferredPrompt) {
          await new Promise((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; window.removeEventListener('pwa-installable', finish); resolve(); } };
            window.addEventListener('pwa-installable', finish);
            setTimeout(finish, 1500);
          });
        }

        // 8. Welcome
        if (detectedIncognito) {
          setStep('WELCOME TO KJB READER (GUEST MODE)');
          window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message: 'WELCOME TO KJB READER (GUEST MODE)', status: 'success' } }));
        } else {
          const finalMessage = isLookup ? 'LOOKING UP…' : 'WELCOME TO KJB READER.';
          setStep(finalMessage);
          window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message: finalMessage, status: 'success' } }));
        }
        await pause(STEP_PAUSE_MS);
        window.dispatchEvent(new Event('kjb-progress-clear'));

        console.group('[Splash] Summary');
        stepsLog.current.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
        console.groupEnd();
        try { const { markSwVersionApplied } = await import('@/lib/swVersionCheck'); await markSwVersionApplied(); } catch {}
        markVisited();
        finishOnce();
        return;
      }

      // === SUBSEQUENT VISIT FLOW ===
      {
        // Welcome back -- shown immediately, no loading/update-check steps.
        // "LOOKING UP…" instead when this boot is a share/process-text
        // "Look Up" from another app straight to search results -- a
        // "welcome back" message doesn't fit a quick lookup. This is now the
        // ONLY loading-feedback mechanism for that action (the earlier native
        // Android overlay approach was reverted -- it kept showing corrupted
        // text on-device across several fix attempts, so the reliable web
        // splash handles this alone again instead).
        const welcomeMessage = isLookup ? 'LOOKING UP…' : 'WELCOME BACK TO KJB READER.';
        setStep(welcomeMessage);
        window.dispatchEvent(new CustomEvent('kjb-progress', { detail: { message: welcomeMessage, status: 'success' } }));
        await pause(STEP_PAUSE_MS);
        window.dispatchEvent(new Event('kjb-progress-clear'));

        console.group('[Splash] Summary');
        stepsLog.current.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
        console.groupEnd();
        try { const { markSwVersionApplied } = await import('@/lib/swVersionCheck'); await markSwVersionApplied(); } catch {}
        markVisited();
        finishOnce();
        return;
      }
    })().catch((err) => {
      console.error('[Splash] flow error — handing off to app anyway:', err);
      finishOnce();
    }).finally(() => {
      clearTimeout(hardTimeout);
    });
  }, [isVisible, mode]);

  if (!isVisible) return null;

  // Theme-aware splash colors: light bg in light mode, dark bg in dark mode —
  // matching the boot placeholder in index.html so there's no flash/white box.
  const isDarkSplash = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const splashBg = isDarkSplash ? '#0f1117' : '#fef9f3';
  const logoSrc = getSplashLogo();
  const trackBg = isDarkSplash ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDarkSplash ? '#c8cdd8' : '#5a6472';

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: splashBg }}
    >
      <div className="flex flex-col items-center -mt-16" style={{ gap: '48px' }}>
        <img
          src={logoSrc}
          alt="KJB Reader Logo"
          width={176}
          height={176}
          className="w-44 h-44 object-contain rounded-2xl p-3"
          style={{ background: splashBg }}
        />
        <div className="flex flex-col items-center gap-5 w-64">
          {/* Progress bar — determinate (download %) or indeterminate (other steps) */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden relative"
            style={{ background: trackBg }}
          >
            {progress === null ? (
              <div
                className="absolute top-0 h-full rounded-full"
                style={{ width: '40%', background: '#4f6aff', animation: 'kjb-splash-indeterminate 1.2s ease-in-out infinite' }}
              />
            ) : (
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, background: '#4f6aff' }}
              />
            )}
          </div>
          <span
            className="notranslate font-sans text-sm font-light tracking-[0.25em] uppercase transition-all duration-300 text-center"
            style={{ color: textColor }}
          >
            {currentMessage}
          </span>
        </div>
        <style>{`
          @keyframes kjb-splash-indeterminate {
            0% { left: -40%; }
            100% { left: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}