import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Globe, ArrowLeft, Search, BookOpen, Sparkles, MousePointer2, Heart, Download, Chrome, Link2, Shield, Puzzle, FileText, Scale, History } from 'lucide-react';

// Built-in defaults — overridden by the admin-editable ExtensionConfig entity
// (Dev Tools → Extension Links). Each field falls back here when blank.
const DEFAULT_URLS = {
  chrome: 'https://chromewebstore.google.com/detail/kjb-reader-sidepanel/gbnipepkpenjgdpjfepgcgddmgbofmah',
  firefox: 'https://addons.mozilla.org/en-US/firefox/addon/kjb-reader-sidepanel/',
  opera: 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/e9e3e461a_kjb-reader-opera-v04174.zip',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/kjb-reader-sidepanel/bphmmbiepbhfnfijaapbmpimkkjdceee',
};
const DEFAULT_VERSION = 'v0.4.229';

const EXAMPLES = [
  {
    heading: 'Single Verses',
    items: ['Ephesians 1:13', 'Romans 3:25', 'Hebrews 9:12'],
  },
  {
    heading: 'Verse Ranges',
    items: ['1 Corinthians 15:1-4', 'Romans 3:23-25', 'Ephesians 2:8-9'],
  },
  {
    heading: 'Whole Chapters',
    items: ['Psalm 23', 'Isaiah 53', 'Psalm 119', 'Hebrews 13'],
  },
  {
    heading: 'Chapter Ranges',
    items: ['Romans 1-3', 'Ephesians 1-2'],
  },
];

const MOCKUPS = [
  {
    light: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/426f5c30f_Screenshot2026-08-16012745.png',
    dark: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/426f5c30f_Screenshot2026-08-16012745.png',
    label: 'Results',
  },
  {
    light: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/2d3c47491_Screenshot2026-08-16012601.png',
    dark: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/2d3c47491_Screenshot2026-08-16012601.png',
    label: 'Read',
  },
  {
    light: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/64c3a9b7b_Screenshot2026-08-16012624.png',
    dark: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/64c3a9b7b_Screenshot2026-08-16012624.png',
    label: 'Gospel',
  },
  {
    light: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/6ed4814da_Screenshot2026-08-16012656.png',
    dark: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/6ed4814da_Screenshot2026-08-16012656.png',
    label: 'Resources',
  },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Instant Verse Lookup',
    desc: 'Auto-detect Bible references on any web page. Verses become clickable links that open in the sidebar.',
  },
  {
    icon: BookOpen,
    title: 'Read the KJB',
    desc: 'Full King James Bible (Pure Cambridge Edition) with chapter navigation, verse numbers, and pilcrows.',
  },
  {
    icon: MousePointer2,
    title: 'Right-Click Search',
    desc: 'Select any text on a page, right-click, and look it up in the KJB sidebar instantly.',
  },
  {
    icon: Sparkles,
    title: 'Advanced Search',
    desc: 'Wildcards (? and *), whole-word match, case sensitivity, and Old/New Testament filtering.',
  },
  {
    icon: Heart,
    title: 'Gospel Tab',
    desc: <>Built-in salvation guide with <span className="notranslate" translate="no">1 Corinthians 15:1-4, Romans 3:25</span>, and verified KJB preachers.</>,
  },
  {
    icon: Link2,
    title: 'Resources Tab',
    desc: 'Quick links to KJBI.org, Discord bot, KJB defence materials, and ministry websites.',
  },
];

export default function ExtensionPage() {
  const [urls, setUrls] = useState(DEFAULT_URLS);
  const [version, setVersion] = useState(DEFAULT_VERSION);
  const [showInstructions, setShowInstructions] = useState(true);
  const [heroIcon, setHeroIcon] = useState('https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/679d87279_icon128.png');
  const [mockups, setMockups] = useState(MOCKUPS);

  const applyConfig = (cfg) => {
    setUrls({
      // Chrome & Edge are permanently pinned to their official store listings
      // and never replaced by a saved ZIP link.
      chrome: DEFAULT_URLS.chrome,
      edge: DEFAULT_URLS.edge,
      firefox: cfg.firefox || DEFAULT_URLS.firefox,
      opera: cfg.opera || DEFAULT_URLS.opera,
    });
    if (cfg.version) setVersion(cfg.version);
    setShowInstructions(cfg.show_instructions !== false);
    if (cfg.hero_icon) setHeroIcon(cfg.hero_icon);
    if (cfg.mockups?.length) {
      setMockups(cfg.mockups.map((m) => ({ light: m.src, dark: m.src, label: m.label })));
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await base44.entities.ExtensionConfig.list('-updated_date', 1);
        const cfg = rows && rows[0];
        if (cancelled || !cfg) return;
        applyConfig(cfg);
        // Cache the successful fetch so a later offline visit shows the most
        // recently known-good config instead of falling all the way back to
        // whatever defaults happened to be hardcoded in THIS build -- those
        // could be considerably staler than a config actually fetched once,
        // e.g. after an admin updates the version number or a download link.
        try { localStorage.setItem('kjb-extension-config-cache', JSON.stringify(cfg)); } catch {}
      } catch (err) {
        if (cancelled) return;
        // Live fetch failed (offline, or briefly unreachable) -- fall back to
        // the last successfully fetched config, if any, rather than jumping
        // straight to the hardcoded defaults above.
        try {
          const raw = localStorage.getItem('kjb-extension-config-cache');
          if (raw) applyConfig(JSON.parse(raw));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Credit banner */}
      <div className="w-full bg-muted/40 border-b border-border py-2 flex items-center justify-center gap-1.5">
        <img
          src="https://base44.com/favicon.ico"
          alt="Base44"
          className="w-4 h-4 rounded-sm"
        />
        <p className="font-sans" style={{ fontSize: '12px', color: '#888' }}>
          Made with{' '}
          <a
            href="https://base44.com/superagents"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Base44 Superagent
          </a>
        </p>
      </div>
      <div className="w-full max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Back button */}
        <div className="mb-8">
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Resources
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <img
            src={heroIcon}
            alt="KJB Reader SidePanel"
            className="block mx-auto w-16 h-16 rounded-2xl shadow-lg mb-5"
          />
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground mb-4">
            KJB Reader - SidePanel
          </h1>

          {/* Version badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 bg-primary/15 border border-primary/40">
            <span className="font-sans text-xs font-semibold text-primary">{version}</span>
          </div>

          {/* Browser compatibility notice */}
          <div className="max-w-2xl mx-auto rounded-xl px-4 py-3 mb-5 bg-primary/10 border border-primary/35">
            <p className="font-sans text-xs leading-relaxed text-primary">
              <strong>Desktop &amp; Edge Mobile</strong> — Available for Chrome, Edge, Brave, Firefox, and Opera on desktop. Also tested on Microsoft Edge mobile. Other mobile browsers may not support browser extensions.
            </p>
          </div>

          {/* Subtitle */}
          <p className="font-sans text-base mb-6 text-muted-foreground">
            Read, search, and look up Bible verses from any web page.
          </p>

          {/* Download buttons */}
          <div className="flex flex-row flex-wrap items-start justify-center gap-3 w-full sm:w-auto">
            <a
              href={urls.chrome}
              target="_blank"
              rel="noopener noreferrer"
              title="Get for Chrome/Brave — Chrome Web Store"
              className="inline-flex flex-col items-center justify-start self-start transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <img
                src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png"
                alt="Available in the Chrome Web Store"
                className="h-[58px] w-auto rounded-lg shadow-lg"
              />
              <span className="font-sans text-[11px] font-medium text-transparent mt-1" aria-hidden="true">&nbsp;</span>
            </a>
            <a
              href={urls.edge}
              target="_blank"
              rel="noopener noreferrer"
              title="Get for Microsoft Edge — Edge Add-ons"
              className="inline-flex flex-col items-center justify-start self-start transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <img
                src="https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/add-ons-badge-images/microsoft-edge-add-ons-badge.png"
                alt="Get it from Microsoft Edge"
                className="h-[58px] w-auto rounded-lg shadow-lg"
              />
              <span className="font-sans text-[11px] font-medium text-muted-foreground mt-1">Works on mobile</span>
            </a>
            <a
              href={urls.firefox}
              target="_blank"
              rel="noopener noreferrer"
              title="Get for Firefox — addons.mozilla.org"
              className="inline-flex flex-col items-center justify-start self-start transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <img
                src="https://blog.mozilla.org/addons/files/2015/11/AMO-button_1.png"
                alt="Get the Add-on for Firefox"
                className="h-[58px] w-auto rounded-lg shadow-lg"
              />
              <span className="font-sans text-[11px] font-medium text-transparent mt-1" aria-hidden="true">&nbsp;</span>
            </a>
            <a
              href={urls.opera}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-col items-center justify-center self-start gap-2 px-8 py-4 rounded-xl font-sans text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg bg-green-500 hover:bg-green-600"
            >
              <span className="inline-flex items-center gap-2">
                <Puzzle className="w-5 h-5" />
                Get for Opera
              </span>
            </a>
          </div>
        </div>

        {/* Sidebar preview mockups */}
        <div className="mb-12">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6 text-center">See It In Action</h2>
          <div className="w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <img
              src="https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/b38904652_62b1eeff0_unified-all-browsers.png"
              alt="KJB Reader Extension preview"
              loading="lazy"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Try These Examples */}
        <div className="mb-12">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-2 text-center">Try These Examples</h2>
          <p className="font-sans text-sm text-center mb-6 text-muted-foreground">
            Install the extension, then click any reference below to look it up instantly in the side panel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {EXAMPLES.map((col) => (
              <div
                key={col.heading}
                className="p-5 rounded-2xl border border-border bg-card shadow-sm"
              >
                <p className="font-sans font-semibold text-sm text-foreground mb-4">{col.heading}</p>
                <div className="flex flex-col gap-3">
                  {col.items.map((ref) => (
                    <p
                      key={ref}
                      className="notranslate font-sans text-foreground"
                      translate="no"
                      style={{ fontSize: '18px', lineHeight: '1.4' }}
                    >
                      {ref}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-12">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6 text-center">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans font-semibold text-sm text-foreground mb-1">{f.title}</p>
                    <p className="font-sans text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Installation Instructions */}
        {showInstructions && (
        <div className="rounded-2xl p-6 sm:p-7 mb-8 shadow-lg bg-card border border-border">
          <h2 className="font-serif text-xl font-semibold text-foreground mb-5">Installation Instructions</h2>
          <ol className="space-y-3 font-sans text-sm leading-relaxed text-foreground/90">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">1</span>
              <span>Download the .zip file using the button above</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">2</span>
              <span>Extract/unzip the downloaded file</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">3</span>
              <span>Open Chrome and go to <code className="px-1.5 py-0.5 rounded font-sans text-xs bg-muted text-primary">chrome://extensions</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">4</span>
              <span>Enable &lsquo;Developer mode&rsquo; (toggle in top right)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">5</span>
              <span>Click &lsquo;Load unpacked&rsquo; and select the extracted folder</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary">6</span>
              <span>The KJB SidePanel icon will appear in your toolbar</span>
            </li>
          </ol>
        </div>
        )}

        {/* Legal documents — Privacy Policy, Terms of Service, License, Changelog */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/extension-privacy"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                Extension Privacy Policy
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                How the extension handles your data
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-accent transition-colors" />
          </Link>
          <Link
            to="/extension-terms"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                Extension Terms of Service
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                Terms for using the extension
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-accent transition-colors" />
          </Link>
          <Link
            to="/extension-license"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-amber-500 to-orange-600">
              <Scale className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                Extension MIT License
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                Open-source licence terms
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-accent transition-colors" />
          </Link>
          <Link
            to="/extension/change-log"
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600">
              <History className="w-5 h-5" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">
                Changelog
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                Full version history
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 group-hover:text-accent transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}