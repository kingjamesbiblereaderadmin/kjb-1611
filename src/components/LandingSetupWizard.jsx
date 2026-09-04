import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Share, MonitorSmartphone, Download, Palette,
  Type, Moon, Sun, Monitor, Smartphone, ChevronLeft, ChevronRight, Check, Star,
  Compass, GraduationCap, Globe, ArrowRight,
  List, AlignJustify, AlignLeft, Columns2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAccessibilityFont, setAccessibilityFont } from '@/lib/accessibilityFont';
import { useTheme } from '@/lib/themeContext';
import { detectIncognito } from '@/lib/incognito';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import ThemeColorPicker from '@/components/bible/ThemeColorPicker';
import AlreadyInstalledHelp from '@/components/AlreadyInstalledHelp';
import HighlightToSearchTip from '@/components/settings/HighlightToSearchTip';

const VERSE_FONTS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans' },
  { value: 'monospace', label: 'Mono' },
  { value: 'cursive', label: 'Cursive' },
  { value: 'comic-sans', label: 'Comic' },
  { value: 'times', label: 'Times' },
];

// Mirrors BibleReader.jsx's getFontFamilyValue() -- the wizard's own preview
// buttons need the same real CSS font stacks, not the bare setting value
// (which only happens to double as a valid CSS keyword for the four
// original generic families; 'comic-sans' and 'times' aren't real CSS
// generic names and would silently fall back to the browser default font).
const WIZARD_FONT_FAMILY_VALUES = {
  serif: "'Merriweather', 'Cormorant Garamond', Georgia, serif",
  'sans-serif': "'Inter', system-ui, -apple-system, sans-serif",
  monospace: "'Courier New', monospace",
  cursive: "'Dancing Script', cursive",
  'comic-sans': "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif",
  times: "'Times New Roman', Times, serif",
};

const A11Y_FONTS = [
  { value: 'default', label: 'Off' },
  { value: 'dyslexic', label: 'Dyslexic', preview: "'OpenDyslexic', 'Comic Sans MS', sans-serif" },
  { value: 'hyperlegible', label: 'Legible', preview: "'Atkinson Hyperlegible', system-ui, sans-serif" },
];

function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isSamsung = () => /SamsungBrowser/i.test(navigator.userAgent);
const isEdgeMobile = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /edg/i.test(ua) && /iphone|ipad|ipod|android/i.test(ua);
};
const isEdgeDesktop = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /edg/i.test(ua) && !/iphone|ipad|ipod|android/i.test(ua);
};

const isBookmarkBrowser = () => {
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua);
  const mobile = /iphone|ipad|ipod|android/i.test(ua);
  return !mobile && (isFirefox || (isMac && isSafari));
};

const isStandalonePWA = () => {
  if (typeof window === 'undefined') return false;
  try { if (window.self !== window.top) return false; } catch { return false; }
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
};

const inIframe = () => {
  try { return window.self !== window.top; } catch { return true; }
};

export default function LandingSetupWizard() {
  const [step, setStep] = useState(() => {
    try { return parseInt(sessionStorage.getItem('kjb-landing-wizard-step') || '0', 10) || 0; } catch { return 0; }
  });

  // Remember which step the user was on so navigating away (e.g. to Terms or
  // Privacy) and back to the landing page doesn't reset the wizard to step 0.
  useEffect(() => {
    try { sessionStorage.setItem('kjb-landing-wizard-step', String(step)); } catch {}
  }, [step]);
  const [isIncognito, setIsIncognito] = useState(false);
  const [incognitoChecked, setIncognitoChecked] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installDone, setInstallDone] = useState(false);
  const [promptCancelled, setPromptCancelled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  const { mode, setMode } = useTheme();
  const [a11yFont, setA11yFont] = useState(getAccessibilityFont);
  const [readerFontFamily, setReaderFontFamily] = useState(() => {
    try { return localStorage.getItem('kjb-reader-font-family') || 'serif'; } catch { return 'serif'; }
  });
  const [flowMode, setFlowMode] = useState(() => {
    try { return localStorage.getItem('kjb-flow') === 'paragraph' ? 'paragraph' : 'line'; } catch { return 'line'; }
  });
  const [columnOn, setColumnOn] = useState(() => {
    try {
      const v = localStorage.getItem('kjb-column');
      if (v === 'true') return true;
      if (v === 'false') return false;
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch { return false; }
  });
  const pickFlow = (value) => {
    setFlowMode(value);
    try { localStorage.setItem('kjb-flow', value); } catch {}
    window.dispatchEvent(new Event('storage'));
    markDone('layout');
  };
  const pickColumn = (value) => {
    setColumnOn(value);
    try { localStorage.setItem('kjb-column', String(value)); } catch {}
    window.dispatchEvent(new Event('storage'));
    markDone('layout');
  };
  const { promptInstall, isInstalled: hookInstalled } = useInstallPrompt();

  // Per-step completion. Initialized from actual persisted settings (not just
  // this-session interactions) so a step already configured earlier — e.g.
  // notifications already granted, or a theme/font already chosen — shows its
  // tick mark immediately instead of only after re-clicking it in the wizard.
  const [completed, setCompleted] = useState(() => {
    let theme = false, fonts = false, a11y = false;
    try {
      const m = localStorage.getItem('kjb-theme-mode');
      const cid = localStorage.getItem('kjb-colour');
      const cm = localStorage.getItem('kjb-color-mode');
      theme = (m && m !== 'system') || (cid && cid !== 'gold') || (cm && cm !== 'daily');
    } catch {}
    try {
      const rf = localStorage.getItem('kjb-reader-font-family');
      fonts = (rf && rf !== 'serif') || getAccessibilityFont() !== 'default';
    } catch {}
    a11y = getAccessibilityFont() !== 'default';
    let layout = false;
    try {
      const fl = localStorage.getItem('kjb-flow');
      const col = localStorage.getItem('kjb-column');
      layout = (fl && fl !== 'line') || (col === 'true' || col === 'false');
    } catch {}
    return {
      install: false,
      theme: !!theme,
      fonts: !!fonts,
      a11y,
      layout: !!layout,
    };
  });

  const markDone = (id) => setCompleted(prev => prev[id] ? prev : { ...prev, [id]: true });

  useEffect(() => {
    detectIncognito().then((v) => { setIsIncognito(v); setIncognitoChecked(true); });
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = isStandalonePWA();
      setIsStandalone(standalone);
      if (standalone) { setInstallDone(true); markDone('install'); }
    };
    checkStandalone();
    window.addEventListener('focus', checkStandalone);
    return () => window.removeEventListener('focus', checkStandalone);
  }, []);

  // Refresh wizard state when cloud sync delivers settings — the initial
  // useState reads happen before the async sync completes, so without this
  // the wizard shows defaults even though synced values just landed.
  useEffect(() => {
    const refreshFromSync = () => {
      try {
        const syncedReader = localStorage.getItem('kjb-reader-font-family');
        const syncedA11y = getAccessibilityFont();

        if (syncedReader) setReaderFontFamily(syncedReader);
        setA11yFont(syncedA11y);

        // Mark steps done when synced values are present (non-default)
        if (syncedReader && syncedReader !== 'serif') markDone('fonts');
        if (syncedA11y !== 'default') markDone('a11y');
      } catch {}
    };
    window.addEventListener('kjb-settings-synced', refreshFromSync);
    window.addEventListener('storage', refreshFromSync);
    return () => {
      window.removeEventListener('kjb-settings-synced', refreshFromSync);
      window.removeEventListener('storage', refreshFromSync);
    };
  }, []);

  // hookInstalled comes from useInstallPrompt, which already detects the
  // native Android app / TWA wrapper (not just display-mode) — without it,
  // opening this wizard inside the actually-installed native app still showed
  // the manual-install guide.
  const actuallyInstalled = isStandalone || installDone || hookInstalled;
  const showInstall = incognitoChecked && !isIncognito && !actuallyInstalled;

  const pickReaderFont = (value) => {
    try { localStorage.setItem('kjb-reader-font-family', value); } catch {}
    setReaderFontFamily(value);
    if (a11yFont !== 'default') { setA11yFont('default'); setAccessibilityFont('default'); }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('kjb-fonts-changed'));
    markDone('fonts');
  };

  const handleInstallClick = async () => {
    try { window.kjbPromptedThisSession = true; } catch {}
    try {
      const accepted = await promptInstall();
      if (accepted) { setInstallDone(true); markDone('install'); return; }
      setPromptCancelled(true);
      setShowManualGuide(true);
    } catch {
      setPromptCancelled(true);
      setShowManualGuide(true);
    }
  };

  const STEPS = [
    { id: 'install', label: 'Install', icon: Download },
    { id: 'theme', label: 'Theme', icon: Palette },
    { id: 'fonts', label: 'Fonts', icon: Type },
    { id: 'layout', label: 'Layout', icon: Columns2 },
    { id: 'explore', label: 'Explore', icon: Compass },
  ];

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) return;
    setStep(s => s + 1);
  };
  const handleBack = () => {
    if (isFirst) return;
    setStep(s => s - 1);
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/[0.03]">
      {/* Step indicator — compact circles, tick only when actually completed */}
      <div className="flex items-center justify-center gap-1 mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = completed[s.id];
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex flex-col items-center gap-0.5 transition-all ${active ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  done ? 'bg-primary border-primary text-primary-foreground'
                  : active ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-secondary border-border text-muted-foreground'
                }`}>
                  {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className={`font-sans text-[9px] ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-3 sm:w-6 rounded-full transition-all ${completed[s.id] ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[160px] flex flex-col justify-center">
        {/* Step 0: Install */}
        {step === 0 && (
          <div className="text-center">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">Install the App</h3>
            <p className="font-sans text-xs text-muted-foreground mb-4">Get offline access and faster loading</p>

            {isIncognito && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 p-3 mb-3 text-left">
                <p className="font-sans text-xs text-amber-700 dark:text-amber-400 font-medium leading-snug">
                  You're in a private window. App install and notifications won't work, and settings will be erased when you close this window.
                </p>
              </div>
            )}

            {inIframe() && (
              <div className="bg-secondary/40 border border-border rounded-xl p-3 mb-3 text-left">
                <p className="font-sans text-xs text-blue-600 dark:text-blue-400 font-medium">
                  You're viewing this inside an embed preview. Open the app in a new tab to install it.
                </p>
              </div>
            )}

            {actuallyInstalled ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-sans text-xs text-emerald-800 dark:text-emerald-300 font-bold">App installed!</p>
                </div>
              </div>
            ) : null}
            {(actuallyInstalled || promptCancelled) && (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('kjb-is-installed');
                    localStorage.removeItem('kjb-install-dismissed');
                    localStorage.removeItem('kjb-prompt-dismissed');
                  } catch {}
                  window.location.reload();
                }}
                className="mt-2 w-full text-center font-sans text-[11px] text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Cancelled or something went wrong? Reset install status
              </button>
            )}
            {!actuallyInstalled && showInstall && isBookmarkBrowser() ? (
              <button
                type="button"
                onClick={() => {
                  const isMac = /Macintosh|Mac OS X/i.test(navigator.userAgent);
                  toast.info('Add to Favourites / Bookmarks', {
                    description: isMac ? 'Press ⌘ D to bookmark this app.' : 'Press Ctrl + D to bookmark this app.',
                  });
                  markDone('install');
                }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl font-sans text-sm font-medium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Star className="w-4 h-4" /> Add to Favourites
              </button>
            ) : showInstall && !inIframe() ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl font-sans text-sm font-medium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isIOS() ? <Share className="w-4 h-4" /> : isMobile() ? <Download className="w-4 h-4" /> : <MonitorSmartphone className="w-4 h-4" />}
                  <span className="text-left">
                    <span className="block font-semibold">{isMobile() ? 'Add to Home Screen' : 'Install App'}</span>
                    <span className="block text-[10px] opacity-80">Offline access, faster loading</span>
                  </span>
                </button>
                {showManualGuide && !actuallyInstalled && (
                  <div className="bg-secondary/40 border border-border rounded-xl p-3 text-left">
                    <p className="font-sans text-xs text-foreground leading-relaxed">
                      <strong>Manual Installation:</strong><br />
                      {isIOS() ? (
                        <>Tap the <strong>Share</strong> icon, then select <strong>"Add to Home Screen"</strong>.</>
                      ) : isEdgeMobile() ? (
                        <>Tap <strong>Menu (⋯)</strong> → <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</>
                      ) : isSamsung() ? (
                        <>Tap <strong>Menu (≡)</strong> → <strong>"Add page to"</strong> → <strong>"Home screen"</strong>.</>
                      ) : isMobile() ? (
                        <>Open browser <strong>Menu (⋮ or ⋯)</strong> → <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.{isAndroid() && <> If you don't see that option, the app is likely already installed on this device (Android only allows one install per site) — check your home screen or app drawer for it.</>}</>
                      ) : isEdgeDesktop() ? (
                        <>Click <strong>Apps/Install</strong> in the address bar, or <strong>Menu (⋯) → Apps → Install this site as an app</strong>.</>
                      ) : (
                        <>If an <strong>Install</strong> icon appears in your address bar, click it. Otherwise check your browser menu.</>
                      )}
                    </p>
                    <AlreadyInstalledHelp />
                  </div>
                )}
              </div>
            ) : !actuallyInstalled ? (
              <p className="font-sans text-xs text-muted-foreground">You can install the app later from Settings.</p>
            ) : null}
          </div>
        )}

        {/* Step 1: Theme (mode + color) */}
        {step === 1 && (
          <div className="text-center">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">Theme & Colour</h3>
            <p className="font-sans text-xs text-muted-foreground mb-4">Choose light/dark and your accent color</p>
            {(mode === 'auto' || mode === 'system') && (
              <div className="max-w-xs mx-auto mb-4 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30">
                <p className="font-sans text-[11px] text-muted-foreground">
                  {mode === 'auto' ? '🕐 Auto: light 6am–6pm, dark 6pm–6am' : '📱 System: follows your device setting'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto mb-5">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
                { id: 'auto', label: 'Auto', icon: Monitor },
                { id: 'system', label: 'System', icon: Smartphone },
              ].map(opt => {
                const Icon = opt.icon;
                const isActive = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { setMode(opt.id); markDone('theme'); }}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 font-sans text-xs font-medium transition-all ${
                      isActive ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card text-foreground border-border hover:border-accent'
                    }`}
                  >
                    <Icon className="w-5 h-5" /> {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="max-w-sm mx-auto" onClick={() => markDone('theme')}>
              <ThemeColorPicker compact />
            </div>
          </div>
        )}

        {/* Step 2: Fonts (reading + daily verse) */}
        {step === 2 && (
          <div className="text-center">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">Fonts</h3>
            <p className="font-sans text-xs text-muted-foreground mb-4">Pick a font for reading</p>

            <p className="font-sans text-xs font-medium text-foreground mb-2">Accessibility Font</p>
            <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto mb-4">
              {A11Y_FONTS.map(font => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => { setA11yFont(font.value); setAccessibilityFont(font.value); markDone('fonts'); if (font.value !== 'default') markDone('a11y'); }}
                  className={`px-1.5 py-2 rounded-lg border-2 font-sans text-[11px] font-bold transition-all flex flex-col items-center justify-center ${
                    a11yFont === font.value ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                    : 'bg-card text-foreground border-border hover:border-accent'
                  }`}
                  style={font.preview ? { fontFamily: font.preview } : undefined}
                >
                  {font.label}
                  {font.value === 'dyslexic' && <span className="text-[8px] opacity-75 font-normal">Dyslexia</span>}
                  {font.value === 'hyperlegible' && <span className="text-[8px] opacity-75 font-normal">Low Vision</span>}
                </button>
              ))}
            </div>

            <p className="font-sans text-xs font-medium text-foreground mb-2">Reading Font</p>
            <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto mb-4">
              {VERSE_FONTS.map(font => {
                const isActive = a11yFont !== 'default' ? false : readerFontFamily === font.value;
                const isDisabled = a11yFont !== 'default';
                return (
                  <button
                    key={font.value}
                    disabled={isDisabled}
                    type="button"
                    onClick={() => pickReaderFont(font.value)}
                    className={`px-1.5 py-2 rounded-lg border-2 font-sans text-[11px] font-medium transition-all ${
                      isActive ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card text-foreground border-border hover:border-accent'
                    } ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}
                    style={{ fontFamily: WIZARD_FONT_FAMILY_VALUES[font.value] }}
                  >
                    {font.label}
                  </button>
                );
              })}
            </div>
            {a11yFont !== 'default' && (
              <p className="font-sans text-[10px] text-muted-foreground mt-2">Disabled while an accessibility font is active</p>
            )}
          </div>
        )}

        {/* Step 3: Layout (reading flow + columns) */}
        {step === 3 && (
          <div className="text-center">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">Layout</h3>
            <p className="font-sans text-xs text-muted-foreground mb-4">Choose how verses are laid out</p>

            <p className="font-sans text-xs font-medium text-foreground mb-2">Reading Flow</p>
            <div className="grid grid-cols-2 gap-1.5 max-w-[15rem] mx-auto mb-4">
              {[
                { id: 'line', label: 'Line by Line', icon: List },
                { id: 'paragraph', label: 'Paragraph', icon: AlignJustify },
              ].map(opt => {
                const Icon = opt.icon;
                const isActive = flowMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickFlow(opt.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border-2 font-sans text-[11px] font-medium transition-all ${
                      isActive ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card text-foreground border-border hover:border-accent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                );
              })}
            </div>

            <p className="font-sans text-xs font-medium text-foreground mb-2">Columns</p>
            <div className="grid grid-cols-2 gap-1.5 max-w-[15rem] mx-auto">
              {[
                { id: false, label: 'Single Column', icon: AlignLeft },
                { id: true, label: 'Two Column', icon: Columns2 },
              ].map(opt => {
                const Icon = opt.icon;
                const isActive = columnOn === opt.id;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => pickColumn(opt.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg border-2 font-sans text-[11px] font-medium transition-all ${
                      isActive ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-card text-foreground border-border hover:border-accent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Explore (extra resources & community) */}
        {step === 4 && (
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground mb-1 text-center">Explore More</h3>
            <p className="font-sans text-xs text-muted-foreground mb-4 text-center">A few more resources worth checking out</p>
            <div className="max-w-sm mx-auto mb-3">
              <HighlightToSearchTip compact />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <a
                href="https://kjbi.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/40 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="notranslate font-sans font-medium text-xs text-foreground group-hover:text-accent transition-colors" translate="no">KJBI.org — Free Bible College</p>
                  <p className="notranslate font-sans text-[10px] text-muted-foreground" translate="no">By Robert Breaker & Robert Potthoff</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </a>

              <Link
                to="/extension"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/40 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-blue-500 to-cyan-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-sans font-medium text-xs text-foreground group-hover:text-accent transition-colors"><span className="notranslate" translate="no">KJB Reader - SidePanel</span></p>
                  <p className="font-sans text-[10px] text-muted-foreground">Browser extension for quick lookups</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </Link>

              <Link
                to="/espanol"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/40 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-sky-500 to-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-sans font-medium text-xs text-foreground group-hover:text-accent transition-colors">Bible Resources (Español)</p>
                  <p className="font-sans text-[10px] text-muted-foreground">Recursos y estudios de la Biblia en español</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </Link>

              <a
                href="https://discord.com/oauth2/authorize?client_id=1529303667348606996&scope=bot+applications.commands&permissions=378494381072"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/40 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-violet-500 to-purple-700">
                  <DiscordIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="notranslate font-sans font-medium text-xs text-foreground group-hover:text-accent transition-colors" translate="no">KJB Discord Bot</p>
                  <p className="font-sans text-[10px] text-muted-foreground">Add to your server for verse lookups</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </a>

              <a
                href="https://discord.gg/HK9Kqmg7Jh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/40 border border-border hover:border-accent/40 transition-all group"
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white shadow-sm bg-gradient-to-br from-violet-500 to-purple-700">
                  <DiscordIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="notranslate font-sans font-medium text-xs text-foreground group-hover:text-accent transition-colors" translate="no">KJB Knights Server</p>
                  <p className="font-sans text-[10px] text-muted-foreground">Come join us</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border/60">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst}
          className={`inline-flex items-center gap-1 px-4 py-2.5 rounded-xl font-sans text-sm font-medium transition-all ${
            isFirst ? 'opacity-0 pointer-events-none' : 'bg-secondary text-foreground hover:bg-accent/20'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {isLast ? (
          <Link
            to="/"
            onClick={() => { try { localStorage.setItem('kjb-has-visited-app', 'true'); } catch {} }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Enter <span className="notranslate">KJB Reader</span> <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
}