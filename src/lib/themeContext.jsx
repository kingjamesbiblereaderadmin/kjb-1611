import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { applyDailyAccent } from '@/lib/dailyVerseTheme';
import { getAccessibilityFont, applyAccessibilityFont, applyReaderFont } from '@/lib/accessibilityFont';

// theme modes: 'light' | 'dark' | 'system' | 'auto'
// colour palettes: 'gold' | 'sapphire' | 'forest' | 'rose' | 'amethyst' | 'slate'

const ThemeContext = createContext();

// Each palette: { name, accent (HSL), primary_light (HSL), primary_dark (HSL) }
// 1611-inspired historical color schemes
export const COLOUR_PALETTES = [
  { id: 'indigo',    name: 'Indigo',    swatch: '#4f46e5', accent: '245 80% 56%', primary_light: '245 80% 52%', primary_dark: '255 80% 68%' },
  { id: 'sapphire',  name: 'Sapphire',  swatch: '#1d4ed8', accent: '222 80% 50%', primary_light: '222 80% 48%', primary_dark: '218 85% 62%' },
  { id: 'sky',       name: 'Sky',       swatch: '#0284c7', accent: '200 85% 45%', primary_light: '200 85% 42%', primary_dark: '199 85% 56%' },
  { id: 'teal',      name: 'Teal',      swatch: '#0d9488', accent: '174 70% 35%', primary_light: '174 72% 32%', primary_dark: '172 65% 45%' },
  { id: 'forest',    name: 'Forest',    swatch: '#16a34a', accent: '142 60% 38%', primary_light: '142 62% 34%', primary_dark: '142 55% 48%' },
  { id: 'amethyst',  name: 'Amethyst',  swatch: '#9333ea', accent: '271 70% 50%', primary_light: '271 72% 48%', primary_dark: '270 70% 64%' },
  { id: 'rose',      name: 'Rose',      swatch: '#e11d48', accent: '347 75% 50%', primary_light: '347 77% 48%', primary_dark: '347 75% 62%' },
  { id: 'crimson',   name: 'Crimson',   swatch: '#b91c1c', accent: '0 70% 45%',   primary_light: '0 72% 42%',   primary_dark: '0 70% 58%' },
  { id: 'amber',     name: 'Amber',     swatch: '#d97706', accent: '32 90% 45%',  primary_light: '32 90% 42%',  primary_dark: '38 90% 55%' },
  { id: 'gold',      name: 'Gold Leaf', swatch: '#B8860B', accent: '45 70% 45%',  primary_light: '43 74% 42%',  primary_dark: '45 75% 55%' },
  { id: 'burgundy',  name: 'Burgundy',  swatch: '#800020', accent: '350 60% 38%', primary_light: '350 60% 34%', primary_dark: '350 60% 50%' },
  { id: 'slate',     name: 'Slate',     swatch: '#475569', accent: '215 25% 40%', primary_light: '215 25% 38%', primary_dark: '215 22% 58%' },
  { id: 'antique',   name: 'Antique',   swatch: '#8B4513', accent: '30 40% 38%',  primary_light: '30 38% 34%',  primary_dark: '30 45% 50%' },
  { id: 'custom',    name: 'Custom',    swatch: localStorage.getItem('kjb-custom-accent') || '#B8860B', accent: 'auto', primary_light: 'auto', primary_dark: 'auto' },
];

function getAutoIsDark() {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
}

function getSystemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(mode) {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (mode === 'auto') return getAutoIsDark();
  return getSystemIsDark(); // 'system'
}

function hexToHsl(hex) {
  // Convert hex to RGB
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;
  
  // Find min and max values of r, g, b
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Pull the hue out of an "H S% L%" HSL string.
function hueOf(hsl) {
  const m = /^\s*(\d+)/.exec(hsl);
  return m ? parseInt(m[1], 10) : 245;
}

// Tint every surface (background, cards, borders, secondary, muted) with the
// palette's hue so the whole app — not just buttons — matches the theme colour.
function applySurfaceTint(root, hue, isDark) {
  if (isDark) {
    root.style.setProperty('--background', `${hue} 30% 8%`);
    root.style.setProperty('--foreground', `${hue} 25% 92%`);
    root.style.setProperty('--card', `${hue} 28% 12%`);
    root.style.setProperty('--card-foreground', `${hue} 25% 92%`);
    root.style.setProperty('--popover', `${hue} 28% 12%`);
    root.style.setProperty('--popover-foreground', `${hue} 25% 92%`);
    root.style.setProperty('--secondary', `${hue} 22% 18%`);
    root.style.setProperty('--secondary-foreground', `${hue} 25% 88%`);
    root.style.setProperty('--muted', `${hue} 22% 18%`);
    root.style.setProperty('--muted-foreground', `${hue} 15% 60%`);
    root.style.setProperty('--border', `${hue} 20% 22%`);
    root.style.setProperty('--input', `${hue} 20% 22%`);
    root.style.setProperty('--sidebar-background', `${hue} 30% 9%`);
    root.style.setProperty('--sidebar-foreground', `${hue} 25% 88%`);
    root.style.setProperty('--sidebar-accent', `${hue} 22% 18%`);
    root.style.setProperty('--sidebar-accent-foreground', `${hue} 25% 88%`);
    root.style.setProperty('--sidebar-border', `${hue} 20% 22%`);
  } else {
    root.style.setProperty('--background', `${hue} 30% 99%`);
    root.style.setProperty('--foreground', `${hue} 55% 8%`);
    root.style.setProperty('--card', `${hue} 12% 95%`);
    root.style.setProperty('--card-foreground', `${hue} 55% 8%`);
    root.style.setProperty('--popover', `0 0% 100%`);
    root.style.setProperty('--popover-foreground', `${hue} 55% 8%`);
    root.style.setProperty('--secondary', `${hue} 14% 89%`);
    root.style.setProperty('--secondary-foreground', `${hue} 30% 24%`);
    root.style.setProperty('--muted', `${hue} 14% 91%`);
    root.style.setProperty('--muted-foreground', `${hue} 12% 40%`);
    root.style.setProperty('--border', `${hue} 30% 89%`);
    root.style.setProperty('--input', `${hue} 30% 89%`);
    root.style.setProperty('--sidebar-background', `${hue} 40% 98%`);
    root.style.setProperty('--sidebar-foreground', `${hue} 35% 15%`);
    root.style.setProperty('--sidebar-accent', `${hue} 40% 95%`);
    root.style.setProperty('--sidebar-accent-foreground', `${hue} 45% 25%`);
    root.style.setProperty('--sidebar-border', `${hue} 30% 89%`);
  }
}

function applyPalette(paletteId, isDark) {
  const p = COLOUR_PALETTES.find(c => c.id === paletteId) || COLOUR_PALETTES[0];
  const root = document.documentElement;

  let accentHsl, primaryHsl;
  if (p.id === 'custom') {
    const customHex = localStorage.getItem('kjb-custom-accent') || '#B8860B';
    accentHsl = hexToHsl(customHex);
    primaryHsl = isDark ? hexToHsl('#6B4E05') : hexToHsl('#D4A017');
  } else {
    accentHsl = p.accent;
    primaryHsl = isDark ? p.primary_dark : p.primary_light;
  }
  root.style.setProperty('--accent', accentHsl);
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--ring', primaryHsl);
  root.style.setProperty('--sidebar-primary', primaryHsl);
  root.style.setProperty('--sidebar-ring', primaryHsl);

  // Tint all surfaces with the palette hue.
  applySurfaceTint(root, hueOf(accentHsl), isDark);

  // Vivid mid-tone palettes need white text on accent/primary for contrast.
  root.style.setProperty('--accent-foreground', '0 0% 100%');
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('kjb-theme-mode') || 'system'; } catch { return 'system'; }
  });
  const [colourId, setColourIdState] = useState(() => {
    try { return localStorage.getItem('kjb-colour') || 'sky'; } catch { return 'sky'; }
  });
  // 'daily' = accent matches the daily verse card (auto-changes each day).
  // 'fixed' = use the chosen colour palette (colourId) instead.
  const [colorMode, setColorModeState] = useState(() => {
    try { return localStorage.getItem('kjb-color-mode') || 'fixed'; } catch { return 'fixed'; }
  });

  const setColorMode = (m) => {
    setColorModeState(m);
    try { localStorage.setItem('kjb-color-mode', m); } catch {}
    window.dispatchEvent(new Event('storage'));
  };
  const [isDark, setIsDark] = useState(() => {
    const savedMode = (() => { try { return localStorage.getItem('kjb-theme-mode') || 'system'; } catch { return 'system'; } })();
    return resolveIsDark(savedMode);
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const setColourId = (id) => {
    setColourIdState(id);
    try { localStorage.setItem('kjb-colour', id); } catch {}
    window.dispatchEvent(new Event('storage'));
  };

  const toggleTheme = () => {
    // Cycle through: light → dark → auto → light
    setMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  };

  // Persist mode and apply dark class. Skip the localStorage write on the
  // very first run (mount) — this effect fires on mount too since `mode`
  // has no prior value to diff against, and blindly writing back whatever
  // `mode` happened to initialize to (e.g. a 'system' fallback, if the read
  // came back empty for any reason — a different storage origin for the
  // offline shell is one candidate) permanently overwrote a real stored
  // choice with that fallback. kjb-colour has no equivalent mount-time
  // write and doesn't show this problem, which is what exposed it. Only an
  // actual user-driven change (setMode/toggleTheme) should persist now.
  const isFirstModeRunRef = useRef(true);
  useEffect(() => {
    if (isFirstModeRunRef.current) {
      isFirstModeRunRef.current = false;
    } else {
      try { localStorage.setItem('kjb-theme-mode', mode); } catch {}
    }
    setIsDark(resolveIsDark(mode));
    // Dispatch so the settings sync push listener fires and pushes the new
    // theme mode to the cloud for cross-device sync.
    window.dispatchEvent(new Event('storage'));
  }, [mode]);

  // For 'system': listen to OS changes
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // For 'auto': poll every minute to update based on time-of-day
  useEffect(() => {
    if (mode !== 'auto') return;
    const interval = setInterval(() => setIsDark(getAutoIsDark()), 60_000);
    return () => clearInterval(interval);
  }, [mode]);

  // Apply dark class to <html> - run immediately on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Force theme application on mount to prevent flicker
  useEffect(() => {
    if (!isInitialized) {
      const savedMode = localStorage.getItem('kjb-theme-mode') || 'system';
      const savedColour = localStorage.getItem('kjb-colour') || 'sky';
      const dark = resolveIsDark(savedMode);
      const savedColorMode = localStorage.getItem('kjb-color-mode') || 'fixed';
      document.documentElement.classList.toggle('dark', dark);
      applyPalette(savedColour, dark);
      // Only override with the daily-verse accent when in 'daily' colour mode.
      if (savedColorMode !== 'fixed') applyDailyAccent(dark);
      setIsInitialized(true);
    }
  }, []);

  // Apply colour palette whenever palette or dark mode changes, then override
  // the accent with today's verse-card colour so they stay in sync each day.
  useEffect(() => {
    applyPalette(colourId, isDark);
    // In 'daily' mode the daily-verse accent overrides the palette so the whole
    // app matches the verse card. In 'fixed' mode we keep the chosen palette.
    if (colorMode !== 'fixed') applyDailyAccent(isDark);

    // Listen for verse updates to apply the accent silently
    const handleVerseUpdate = () => {
      if (colorMode !== 'fixed') applyDailyAccent(isDark);
    };
    window.addEventListener('kjb-daily-verse-updated', handleVerseUpdate);
    return () => window.removeEventListener('kjb-daily-verse-updated', handleVerseUpdate);
  }, [colourId, isDark, colorMode]);

  // Apply 1611 vs Modern theme and dyslexic font
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const use1611 = localStorage.getItem('kjb-theme-1611') !== 'false';
      if (!use1611) {
        root.setAttribute('data-theme-modern', 'true');
      } else {
        root.removeAttribute('data-theme-modern');
      }
      
      // Apply dyslexic font globally
      const useDyslexic = localStorage.getItem('kjb-dyslexic-font') === 'true';
      if (useDyslexic) {
        root.setAttribute('data-dyslexic-font', 'true');
      } else {
        root.removeAttribute('data-dyslexic-font');
      }
    };

    applyTheme();
    
    // Listen for storage changes to sync theme across tabs
    const handleStorage = () => applyTheme();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Listen for dyslexic font changes and update globally
  useEffect(() => {
    const handleFontChange = () => {
      const root = document.documentElement;
      const useDyslexic = localStorage.getItem('kjb-dyslexic-font') === 'true';
      if (useDyslexic) {
        root.setAttribute('data-dyslexic-font', 'true');
      } else {
        root.removeAttribute('data-dyslexic-font');
      }
    };
    
    window.addEventListener('dyslexic-font-change', handleFontChange);
    return () => window.removeEventListener('dyslexic-font-change', handleFontChange);
  }, []);

  // Apply app-wide accessibility font + reader font on mount (so the landing
  // page and other public routes outside AppLayout also get the synced font).
  useEffect(() => {
    applyAccessibilityFont(getAccessibilityFont());
    try {
      applyReaderFont(localStorage.getItem('kjb-reader-font-family') || 'serif');
    } catch {}
    // Preload the Cursive (Dancing Script) and Comic (Comic Neue) web fonts so
    // they render the instant they're chosen. Without this, font-display:block
    // leaves the chosen text invisible until the font fetches on first use —
    // which made "Cursive" and "Comic" look like they did nothing.
    try {
      if (document.fonts) {
        document.fonts.load('400 32px "Dancing Script"');
        document.fonts.load('700 32px "Dancing Script"');
        document.fonts.load('italic 400 32px "Dancing Script"');
        document.fonts.load('400 32px "Comic Neue"');
        document.fonts.load('700 32px "Comic Neue"');
        document.fonts.load('italic 400 32px "Comic Neue"');
      }
    } catch {}
  }, []);

  // Re-read theme + font settings from localStorage when cloud sync applies new values
  useEffect(() => {
    const onSettingsSynced = () => {
      try {
        const newMode = localStorage.getItem('kjb-theme-mode') || 'system';
        const newColourId = localStorage.getItem('kjb-colour') || 'sky';
        const newColorMode = localStorage.getItem('kjb-color-mode') || 'fixed';
        setMode(newMode);
        setColourIdState(newColourId);
        setColorModeState(newColorMode);
        // Re-apply accessibility + reader fonts from the freshly synced settings
        applyAccessibilityFont(getAccessibilityFont());
        applyReaderFont(localStorage.getItem('kjb-reader-font-family') || 'serif');
      } catch {}
    };
    window.addEventListener('kjb-settings-synced', onSettingsSynced);
    return () => window.removeEventListener('kjb-settings-synced', onSettingsSynced);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, mode, setMode, colourId, setColourId, colorMode, setColorMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}