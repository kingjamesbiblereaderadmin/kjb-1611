import React, { useState, useEffect } from 'react';
import { Smartphone, MonitorSmartphone, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { detectIncognito } from '@/lib/incognito';
import HighlightToSearchTip from '@/components/settings/HighlightToSearchTip';

const inIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

const isBookmarkBrowser = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const isMobile = /iphone|ipad|ipod|android/i.test(ua);
  return !isMobile && (isFirefox || (isMac && isSafari));
};

// Edge on a phone (EdgA on Android, EdgiOS on iOS) frequently never fires
// beforeinstallprompt, so the native install button can't work — the user must
// use Edge's own menu. Detect it so we can show the correct manual steps.
const isEdgeMobile = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /EdgA|EdgiOS/i.test(ua) || (/edg/i.test(ua) && /iphone|ipad|ipod|android/i.test(ua));
};

export default function InstallAppSection({ expanded, isIncognito }) {
  const { isInstallable, isInstalled: hookIsInstalled, isSamsung, promptInstall } = useInstallPrompt();
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [bookmarkBrowser] = useState(isBookmarkBrowser);
  const [edgeMobile] = useState(isEdgeMobile);
  const [localIncognito, setLocalIncognito] = useState(false);

  useEffect(() => {
    detectIncognito().then(setLocalIncognito);
  }, []);

  // Samsung Internet (older versions) doesn't fire beforeinstallprompt, so the native
  // button is a no-op. Show the manual "Add page to → Home screen" guide up front.
  useEffect(() => {
    if (isSamsung && !isInstallable) setShowInstallHint(true);
  }, [isSamsung, isInstallable]);

  useEffect(() => {
    try { 
      if (typeof window !== 'undefined' && window.self !== window.top) { 
        setIsInstalled(false); 
        return; 
      } 
    } catch {}
    
    setIsInstalled(hookIsInstalled);
  }, [hookIsInstalled]);

  // Edge mobile rarely fires beforeinstallprompt, so the native prompt is a
  // no-op there — show the manual guide immediately instead of a dead button.
  useEffect(() => {
    if (edgeMobile && !isInstallable) setShowInstallHint(true);
  }, [edgeMobile, isInstallable]);

  const revealGuide = () => {
    setShowInstallHint(true);
    requestAnimationFrame(() => {
      document.getElementById('kjb-install-hint')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleInstall = async () => {
    promptInstall().then((result) => {
      // result === true  → native prompt shown & accepted, nothing more to do.
      // result === false → no usable deferred prompt (event never fired, was
      // consumed, or this browser doesn't support it). In every such case the
      // only way forward is the manual guide, so always reveal + scroll to it.
      if (result !== true) revealGuide();
    }).catch((err) => {
      console.error('[InstallApp] Install prompt failed:', err);
      revealGuide();
    });
  };

  const effectiveIncognito = isIncognito || localIncognito;

  if (effectiveIncognito) return null;

  return (
    <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl mb-5 overflow-hidden shadow-lg shadow-black/[0.03]">
      <button
        onClick={() => {}}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors text-left"
      >
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-lg font-semibold text-foreground">Install App</h2>
          <p className="font-sans text-xs text-muted-foreground">Offline access and faster loading</p>
        </div>
      </button>
      {expanded && (
      <div className="px-5 pb-6 pt-2 space-y-2">
        <p className="font-sans text-sm text-muted-foreground leading-relaxed">
          Add the KJB Reader to your home screen for quick access and offline reading.
        </p>

        {/* Android app tip -- self-hides entirely on web/iOS/non-native */}
        <HighlightToSearchTip />
        

        {isInstalled ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-900/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-sans text-sm font-bold text-emerald-800 dark:text-emerald-300">✓ Installed as an app!</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 p-4">
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-sans text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Where to find the app:</h3>
                  <ul className="font-sans text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Android:</strong> App drawer or home screen</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>iOS:</strong> Home screen (swipe right to App Library)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Desktop:</strong> Taskbar, Start menu, or Applications folder</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Samsung:</strong> Home screen or app drawer</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                if (!confirm('Reset the installation status? This will not uninstall the app — it only clears the "installed" flag so you can see the install prompt again.')) {
                  return;
                }
                localStorage.removeItem('kjb-is-installed');
                localStorage.removeItem('kjb-install-dismissed');
                localStorage.removeItem('kjb-prompt-dismissed');
                // The browser's native install prompt event can only be used once
                // per page load — reloading is the only way to get Chrome/Edge to
                // fire beforeinstallprompt again so the button works right away.
                window.location.reload();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-sans text-sm font-medium hover:bg-destructive/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              Uninstalled? Reset the status
            </button>
          </div>
        ) : inIframe() ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-sans text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Preview Mode Detected</h3>
                  <p className="font-sans text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                    You're viewing this inside a preview window. PWA installation is blocked in iframes. Open the app in a new tab to install it.
                  </p>
                  <a
                    href="https://kingjamesbiblereader.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open kingjamesbiblereader.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              Add to Home Screen
            </button>
            
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 p-4">
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-sans text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Where to find the app after installation:</h3>
                  <ul className="font-sans text-xs text-blue-700 dark:text-blue-400 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Android:</strong> App drawer or home screen</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>iOS:</strong> Home screen (swipe right to App Library)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Desktop:</strong> Taskbar, Start menu, or Applications folder</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="font-bold">•</span>
                      <span><strong>Samsung:</strong> Home screen or app drawer</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {showInstallHint && (
              <div id="kjb-install-hint" className="space-y-2 bg-secondary/50 rounded-xl p-4 mt-3">
                {!isInstallable && (
                  <div className="mb-3 pb-3 border-b border-border/50">
                    {inIframe() ? (
                      <p className="font-sans text-xs text-blue-600 dark:text-blue-400 font-medium flex items-start gap-1.5 leading-snug">
                        <AlertCircle className="w-4 h-4 shrink-0 -mt-0.5" />
                        <span>You are viewing this inside a preview window, where browsers block PWA installation. Please open the app in a new tab to install it!</span>
                      </p>
                    ) : edgeMobile ? (
                      <p className="font-sans text-xs text-amber-600 dark:text-amber-400 font-medium flex items-start gap-1.5 leading-snug">
                        <AlertCircle className="w-4 h-4 shrink-0 -mt-0.5" />
                        <span>Edge on phones doesn't support the automatic install button. Use the manual steps below, or open this site in Chrome for one-tap install.</span>
                      </p>
                    ) : (
                      <p className="font-sans text-xs text-amber-600 dark:text-amber-400 font-medium flex items-start gap-1.5 leading-snug">
                        <AlertCircle className="w-4 h-4 shrink-0 -mt-0.5" />
                        <span>Your browser may not fully support automatic app installation. Try the manual steps below, or use Chrome for the best experience.</span>
                      </p>
                    )}
                  </div>
                )}
                <p className="font-sans text-xs text-foreground mb-2">
                  <strong>Manual Installation Guide:</strong>
                </p>
                <div className="font-sans text-xs text-muted-foreground space-y-1.5">
                  <p>• <strong>Apple iOS:</strong> Tap the <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">Share</span> button in Safari, then select <span className="text-foreground font-medium">"Add to Home Screen"</span>.</p>
                  <p>• <strong>Android / Chrome:</strong> Open the browser menu <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">(⋮ or ⋯)</span>, then select <span className="text-foreground font-medium">"Add to phone"</span>, <span className="text-foreground font-medium">"Install app"</span> or <span className="text-foreground font-medium">"Add to Home screen"</span>.</p>
                  <p>• <strong>Samsung Internet:</strong> Samsung's browser doesn't support automatic install. Tap the menu <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">(≡)</span> → <span className="text-foreground font-medium">"Add page to"</span> → <span className="text-foreground font-medium">"Home screen"</span>.</p>
                  <p>• <strong>Edge (phone):</strong> Tap the menu <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">(⋯)</span> at the bottom, then select <span className="text-foreground font-medium">"Add to phone"</span> or <span className="text-foreground font-medium">"Add to Home screen"</span>. If you don't see it, scroll the menu — it's under the sharing options.</p>
                  <p>• <strong>Edge (desktop):</strong> Menu <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">(⋯)</span> → <span className="text-foreground font-medium">Apps</span> → <span className="text-foreground font-medium">"Install this site as an app"</span>. Choose <span className="text-foreground font-medium">App</span> (not Shortcut) for the full app experience.</p>
                  <p>• <strong>Desktop:</strong> Click the <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">Install</span> icon located in your browser's address bar, or check the main menu.</p>
                  <p>• <strong>Firefox & Safari (Mac):</strong> These browsers don't support installing apps — instead, press <span className="inline-flex items-center px-1.5 py-0.5 bg-background rounded text-foreground font-medium">⌘ D</span> (or use the menu) to <span className="text-foreground font-medium">Add to Favourites / Bookmarks</span> for quick access.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}