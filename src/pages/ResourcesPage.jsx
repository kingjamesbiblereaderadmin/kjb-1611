import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, BookOpen, ShieldAlert, Globe, CheckCircle, ChevronDown, Youtube, Facebook, Copy, Printer, Mail, PlayCircle, Link2 } from 'lucide-react';
import { printHtml } from '@/lib/printHelpers';
import CollapsibleCard from '@/components/landing/CollapsibleCard';
import PreachersSection, { PREACHERS } from '@/components/PreachersSection';

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

function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const RESOURCES = [];

export default function ResourcesPage() {
  const [expandedSections, setExpandedSections] = useState(() => ({
    preachers: true,
    ministry: true,
    disclaimer: true,
    kjbi: true,
    discord: true,
    sidepanel: true,
    spanish: true,
    defence: true,
    resources: Object.fromEntries(RESOURCES.map((_, idx) => [idx, true])),
    preacherLinks: Object.fromEntries(PREACHERS.map((p) => [p.name, true])),
  }));

  // Tracks whether the last toggleAll set everything to expanded.
  // Resets to false as soon as the user collapses anything individually.
  const allExpanded =
    expandedSections.preachers &&
    expandedSections.ministry &&
    expandedSections.disclaimer &&
    expandedSections.kjbi &&
    expandedSections.discord &&
    expandedSections.sidepanel &&
    expandedSections.spanish &&
    expandedSections.defence &&
    RESOURCES.every((_, idx) => expandedSections.resources[idx] === true) &&
    PREACHERS.every((p) => expandedSections.preacherLinks[p.name] === true);

  const toggleAll = () => {
    const newState = !allExpanded;
    const newResourcesState = {};
    RESOURCES.forEach((_, idx) => {
      newResourcesState[idx] = newState;
    });
    const newPreacherLinksState = {};
    PREACHERS.forEach((p) => {
      newPreacherLinksState[p.name] = newState;
    });
    setExpandedSections(prev => ({
      ...prev,
      preachers: newState,
      ministry: newState,
      disclaimer: newState,
      kjbi: newState,
      discord: newState,
      sidepanel: newState,
      spanish: newState,
      defence: newState,
      resources: newResourcesState,
      preacherLinks: newPreacherLinksState,
    }));
  };

  const togglePreacher = (name) => {
    setExpandedSections(prev => ({
      ...prev,
      preacherLinks: { ...prev.preacherLinks, [name]: !prev.preacherLinks[name] },
    }));
  };

  const toggleSection = (section, idx = null) => {
    if (section === 'resources' && idx !== null) {
      setExpandedSections(prev => ({
        ...prev,
        resources: { ...prev.resources, [idx]: !prev.resources[idx] },
      }));
    } else {
      setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    }
  };
  
  const handlePrint = () => {
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = `<h1 style="font-family:Georgia,serif;font-size:22pt;text-align:center;margin-bottom:6pt;">Resources</h1><p style="text-align:center;font-size:11pt;color:#555;margin-bottom:24pt;">KJB defence materials, studies on modern version corruption, and free Bible study resources.</p>`;

    // Verified Preachers
    html += `<h2 style="font-size:15pt;margin:24pt 0 8pt 0;border-bottom:1px solid #ccc;padding-bottom:4pt;">Verified KJB Preachers</h2>`;
    PREACHERS.forEach((p) => {
      html += `<h3 style="font-size:13pt;margin:12pt 0 2pt 0;">${esc(p.name)}</h3><p style="font-size:11pt;margin:0 0 4pt 0;">${esc(p.desc)}</p>`;
      p.links.forEach((url) => { html += `<p style="font-size:10pt;color:#2a5ac8;margin:0 0 2pt 0;">${esc(url)}</p>`; });
    });

    // Resource categories
    RESOURCES.forEach((section) => {
      html += `<h2 style="font-size:15pt;margin:24pt 0 8pt 0;border-bottom:1px solid #ccc;padding-bottom:4pt;">${esc(section.category)}</h2>`;
      section.items.forEach((item) => {
        html += `<h3 style="font-size:13pt;margin:12pt 0 2pt 0;">${esc(item.title)}</h3><p style="font-size:11pt;line-height:1.5;margin:0 0 4pt 0;">${esc(item.desc)}</p><p style="font-size:10pt;color:#2a5ac8;margin:0 0 4pt 0;">${esc(item.url)}</p>`;
      });
    });

    printHtml(html);
  };

  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 lg:px-12 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-4">
          <FileText className="w-7 h-7 text-accent" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-3">Resources</h1>
        <p className="font-sans text-muted-foreground max-w-lg mx-auto"><span className="notranslate" translate="no">KJB</span> defence materials, studies on modern version corruption, and links to free Bible study resources.</p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={toggleAll}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* KJBI — Free Online Bible College */}
      <div className="mb-6">
        <CollapsibleCard
          icon={<CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
          title="KJBI.org — Free Online Bible College"
          open={expandedSections.kjbi}
          onToggle={() => toggleSection('kjbi')}
        >
          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
            <span className="notranslate" translate="no">King James Bible Institute by Robert Breaker & Robert Potthoff</span> — a free online Bible college for those who want to go deeper in God's Word.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="https://kjbi.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Visit KJBI.org <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <CopyButton text="https://kjbi.org" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        </CollapsibleCard>
      </div>

      {/* Discord (Bot + Knights Server) */}
      <div className="mb-6">
        <CollapsibleCard
          icon={
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-700">
              <DiscordIcon className="w-5 h-5" />
            </div>
          }
          title="Discord"
          open={expandedSections.discord}
          onToggle={() => toggleSection('discord')}
        >
          <div className="mb-5">
            <h3 className="notranslate font-sans font-semibold text-sm text-foreground mb-1">KJB Discord Bot</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
              Use the <span className="notranslate">KJB Reader</span> bot in your own <span className="notranslate" translate="no">Discord</span> account or add it to a server for daily verses and verse search directly in <span className="notranslate" translate="no">Discord</span>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://discord.com/oauth2/authorize?client_id=1529303667348606996&scope=applications.commands&integration_type=1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-secondary/50 border border-border hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <span className="font-sans font-semibold text-sm text-foreground group-hover:text-accent transition-colors">📱 Personal Install</span>
                <span className="font-sans text-xs text-muted-foreground leading-relaxed">Adds slash commands to your Discord account — works in DMs, group DMs, and any server.</span>
              </a>
              <a
                href="https://discord.com/oauth2/authorize?client_id=1529303667348606996&scope=bot+applications.commands&permissions=378494381072"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl bg-secondary/50 border border-border hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <span className="font-sans font-semibold text-sm text-foreground group-hover:text-accent transition-colors">🏠 Server Install</span>
                <span className="font-sans text-xs text-muted-foreground leading-relaxed">Bot joins a server for daily verse delivery and searching up verses and keywords.</span>
              </a>
            </div>
          </div>

          <div>
            <h3 className="notranslate font-sans font-semibold text-sm text-foreground mb-1">KJB Knights Server</h3>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
              My and my friends' <span className="notranslate" translate="no">Discord</span> server — feel free to join.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="https://discord.gg/HK9Kqmg7Jh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                Join KJB Knights <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </CollapsibleCard>
      </div>

      {/* KJB Reader Chrome Extension */}
      <div className="mb-6">
        <CollapsibleCard
          icon={
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-blue-500 to-cyan-600">
              <Globe className="w-5 h-5" />
            </div>
          }
          title="KJB SidePanel"
          open={expandedSections.sidepanel}
          onToggle={() => toggleSection('sidepanel')}
        >
          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
            Read, search, and look up Bible verses from any web page with the <span className="notranslate">KJB Reader</span> sidebar extension — now available on the <span className="notranslate" translate="no">Chrome Web Store</span>.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              to="/extension"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get KJB SidePanel
            </Link>
          </div>
        </CollapsibleCard>
      </div>

      {/* Spanish Resources — dedicated page */}
      <div className="mb-6">
        <CollapsibleCard
          icon={
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-sky-500 to-blue-600">
              <Globe className="w-5 h-5" />
            </div>
          }
          title="Bible Resources (Español)"
          open={expandedSections.spanish}
          onToggle={() => toggleSection('spanish')}
        >
          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
            Recursos y estudios de la Biblia en español.
          </p>
          <Link
            to="/espanol"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Open Bible Resources (Español) <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </CollapsibleCard>
      </div>

      {/* KJB Defence — dedicated page */}
      <div className="mb-6">
        <CollapsibleCard
          icon={
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          }
          title="KJB Defence"
          open={expandedSections.defence}
          onToggle={() => toggleSection('defence')}
        >
          <p className="font-sans text-sm text-muted-foreground leading-relaxed mb-3">
            A dedicated collection of resources defending the <span className="notranslate" translate="no">King James Bible</span> and exposing the corruption of modern versions.
          </p>
          <Link
            to="/kjb-defence"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Open KJB Defence <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </CollapsibleCard>
      </div>

      {/* Verified Preachers section */}
      <PreachersSection
        groupOpen={expandedSections.preachers}
        onToggleGroup={() => toggleSection('preachers')}
        openPreachers={expandedSections.preacherLinks}
        togglePreacher={togglePreacher}
      />

      {/* Ministry Links */}
      <div className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">
        <button
          onClick={() => toggleSection('ministry')}
          className="w-full flex items-center justify-between p-5 bg-card hover:bg-accent/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700/60 mb-2">
              <Globe className="w-4 h-4 text-purple-500" />
              <h2 className="font-sans font-semibold text-sm text-purple-600 dark:text-purple-400">Personal Ministry Links</h2>
            </div>
            <p className="font-sans text-xs text-muted-foreground">Personal Ministry Links</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <CopyButton 
              text={`God is Gracious 1031 Ministries\nhttps://godisgracious1031ministriescom.odoo.com/\n\nYouTube\nhttps://youtube.com/@shawnr325av\n\nRumble\nhttps://rumble.com/user/Godisgracious1031\n\nLinktree\nhttps://linktr.ee/shawnr325av\n\nContact the Ministry\nkingjamesbiblereader@outlook.sg`} 
              className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer" 
            />
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedSections.ministry ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {expandedSections.ministry && (
        <div className="p-5 pt-0 space-y-2">
          <a
            href="https://godisgracious1031ministriescom.odoo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-sky-500 to-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="notranslate font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">God is Gracious 1031 Ministries</p>
              <p className="font-sans text-xs text-muted-foreground">Ministry Website</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text="https://godisgracious1031ministriescom.odoo.com/" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </a>
          <a
            href="https://youtube.com/@shawnr325av"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-red-500 to-rose-600">
              <Youtube className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">YouTube</p>
              <p className="font-sans text-xs text-muted-foreground">@shawnr325av</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text="https://youtube.com/@shawnr325av" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </a>
          <a
            href="https://rumble.com/user/Godisgracious1031"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-green-600">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Rumble</p>
              <p className="font-sans text-xs text-muted-foreground">Godisgracious1031</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text="https://rumble.com/user/Godisgracious1031" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </a>
          <a
            href="https://linktr.ee/shawnr325av"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-green-500 to-emerald-600">
              <Link2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Linktree</p>
              <p className="font-sans text-xs text-muted-foreground">linktr.ee/shawnr325av</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text="https://linktr.ee/shawnr325av" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </a>
          <a
            href="mailto:kingjamesbiblereader@outlook.sg"
            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Contact the Ministry</p>
              <p className="font-sans text-xs text-muted-foreground">kingjamesbiblereader@outlook.sg</p>
            </div>
            <CopyButton text="kingjamesbiblereader@outlook.sg" className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors flex-shrink-0" />
          </a>
        </div>
        )}
      </div>

      <div className="space-y-4">
        {RESOURCES.map((section, idx) => {const Icon = section.icon;
            const isOpen = expandedSections.resources[idx] !== false;
            return (
              <div key={section.category} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection('resources', idx)}
                  className={`w-full ${section.bg} border-b rounded-t-xl p-4 hover:border-opacity-75 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-left`}>
                  
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${section.color}`} />
                    <h2 className={`font-sans font-semibold ${section.color}`}>{section.category}</h2>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <CopyButton 
                      text={`${section.category}\n\n${section.items.map(item => `${item.title}\n${item.desc}\n${item.url}`).join('\n\n')}`} 
                      className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${section.color} transition-colors cursor-pointer`} 
                    />
                    {section.expandable &&
                      <ChevronDown className={`w-4 h-4 ${section.color} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    }
                  </div>
                </div>
              </button>
              {isOpen &&
                <div className="p-4 space-y-3">
                  {section.items.map((item) =>
                  <a
                    key={item.title}
                    href={item.url}
                    target={item.url.startsWith('mailto') ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className="block bg-card border border-border rounded-xl p-5 hover:border-accent/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group">
                    
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="notranslate font-serif text-lg font-semibold text-foreground group-hover:text-accent transition-colors">
                              {item.title}
                            </h3>
                            {item.verified &&
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          }
                          </div>
                          <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                          <CopyButton text={item.url} className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" />
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                        </div>
                      </div>
                      <span className="inline-block mt-3 text-xs font-sans font-medium text-accent underline underline-offset-2">
                        {item.label} →
                      </span>
                    </a>
                  )}
                </div>
                }
            </div>);

          })}
      </div>
    </div>);

}