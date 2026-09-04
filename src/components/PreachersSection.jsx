import React, { useState } from 'react';
import { ExternalLink, CheckCircle, Users, ChevronDown, Youtube, Facebook, Instagram, Link as LinkIcon, Copy, Globe } from 'lucide-react';

function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      role="button"
      onClick={handleCopy}
      className={className || "p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"}
      title="Copy text"
    >
      {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </div>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.72a4.85 4.85 0 01-1.01-.03z" />
    </svg>
  );
}

function getLinkIcon(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return <Youtube className="w-3.5 h-3.5" />;
  if (url.includes('tiktok.com')) return <TikTokIcon className="w-3.5 h-3.5" />;
  if (url.includes('facebook.com')) return <Facebook className="w-3.5 h-3.5" />;
  if (url.includes('instagram.com')) return <Instagram className="w-3.5 h-3.5" />;
  if (url.includes('linktr.ee')) return <LinkIcon className="w-3.5 h-3.5" />;
  return <Globe className="w-3.5 h-3.5" />;
}

function getLinkLabel(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('facebook.com')) return 'Facebook';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('linktr.ee')) return 'Linktree';
  if (url.includes('univer.se')) return 'Joyfully Church';
  if (url.includes('mission1611.com')) return 'Mission 1611';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return 'Website'; }
}

export const PREACHERS = [
  {
    name: 'Robert Breaker',
    desc: 'KJB missionary evangelist, rightly dividing the word of truth. Also preaches in Spanish.',
    links: [
      'https://www.youtube.com/@Robertbreaker3',
      'https://www.tiktok.com/@robertbreaker',
      'https://thecloudchurch.org/',
      'https://laiglesiadelanube.com/']
  },
  {
    name: 'Robert Potthoff',
    desc: 'Big Red Preacher — KJB soul winner.',
    links: [
      'https://www.instagram.com/robert.potthoff/',
      'https://www.facebook.com/potthoff87',
      'https://www.instagram.com/big_red_preacher',
      'https://mission1611.com/']
  },
  {
    name: 'Ryan Poff',
    desc: 'Seed of Hope Church — KJB pastor and preacher.',
    links: [
      'https://www.seedofhopechurch.org/',
      'https://youtube.com/@ryan_poff',
      'https://www.tiktok.com/@ryan_sohc']
  },
  {
    name: 'Skyler (AV1611 Ministry)',
    desc: 'AV1611 Ministry — KJB defence and preaching.',
    links: [
      'https://www.tiktok.com/@av1611ministries',
      'https://youtube.com/@av1611ministries']
  },
  {
    name: 'Crown of Thorns',
    desc: 'KJB preaching ministry on YouTube.',
    links: [
      'https://www.youtube.com/@CrownOfThorns']
  },
  {
    name: 'Paul Johnson',
    desc: 'Biblical Salvation — KJB preaching and Bible teaching.',
    links: [
      'https://www.tiktok.com/@pauljohnson9632',
      'https://youtube.com/@biblicalsalvation']
  },
  {
    name: 'CPR Missions',
    desc: 'Church Planting and Revival Missions — soul winning and church planting.',
    links: [
      'https://www.youtube.com/channel/UCWBR5DmAi2XPMFRtb-wqHwg',
      'https://www.tiktok.com/@cprmissions',
      'https://www.facebook.com/CPRmission/',
      'https://www.instagram.com/cprmissions/']
  },
  {
    name: 'James Bray',
    desc: 'KJB preacher and Bible teacher on YouTube.',
    links: [
      'https://youtube.com/@jamesbrayall3?si=nXkuHAhyVvC_0KVg']
  },
];

export default function PreachersSection({
  openPreachers: externalOpen,
  togglePreacher: externalToggle,
  groupOpen: externalGroupOpen,
  onToggleGroup: externalToggleGroup,
}) {
  const [internalOpen, setInternalOpen] = useState(() =>
    Object.fromEntries(PREACHERS.map((p) => [p.name, true]))
  );
  const [internalGroupOpen, setInternalGroupOpen] = useState(true);

  const openPreachers = externalOpen || internalOpen;
  const togglePreacher = externalToggle || ((name) => {
    setInternalOpen((prev) => ({ ...prev, [name]: !prev[name] }));
  });
  const groupOpen = externalGroupOpen !== undefined ? externalGroupOpen : internalGroupOpen;
  const toggleGroup = externalToggleGroup || (() => setInternalGroupOpen((o) => !o));

  return (
    <div className="mb-8 bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={toggleGroup}
        className="w-full flex items-start justify-between gap-4 p-5 hover:bg-accent/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/60 mb-2">
            <Users className="w-4 h-4 text-amber-600" />
            <h2 className="font-sans font-semibold text-sm text-amber-600">Verified KJB Preachers</h2>
          </div>
          <p className="font-sans text-xs text-muted-foreground">
            KJB-believing, soul-winning preachers — tap to see all their links
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <CopyButton
            text={`Verified KJB Preachers\n\n${PREACHERS.map(p => `${p.name}\n${p.desc}\n${p.links.join('\n')}`).join('\n\n')}`}
            className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer"
          />
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${groupOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {groupOpen &&
      <div className="p-5 pt-0 space-y-2">
        {PREACHERS.map((preacher) => {
          const isOpen = !!openPreachers[preacher.name];
          return (
            <div key={preacher.name} className="bg-card border border-border rounded-xl overflow-hidden transition-all">
              <button
                onClick={() => togglePreacher(preacher.name)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="notranslate font-sans text-sm font-semibold text-foreground" translate="no">{preacher.name}</p>
                  {!isOpen &&
                    <p className="font-sans text-xs text-muted-foreground truncate">{preacher.desc}</p>
                  }
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <CopyButton
                    text={`${preacher.name}\n${preacher.desc}\n\n${preacher.links.join('\n')}`}
                    className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors cursor-pointer"
                  />
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen &&
                <div className="border-t border-border px-4 pb-4 pt-3 bg-background/40 space-y-2">
                  <p className="font-sans text-xs text-muted-foreground mb-3">{preacher.desc}</p>
                  {preacher.links.map((url) =>
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-accent/50 transition-colors group">
                      <span className="text-muted-foreground group-hover:text-accent transition-colors">
                        {getLinkIcon(url)}
                      </span>
                      <span className="font-sans text-sm font-medium text-foreground group-hover:text-accent transition-colors flex-1 truncate">
                        {getLinkLabel(url)}
                      </span>
                      <CopyButton text={url} className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors flex-shrink-0" />
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
                    </a>
                  )}
                </div>
              }
            </div>
          );
        })}
      </div>
      }
    </div>
  );
}