import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Server } from 'lucide-react';

// Discord Bot invite links for the KJB Reader Bot (application_id
// 1529303667348606996). Kept here so kingjamesbiblereader.com/discord is the
// single canonical short link people share/click.
export const DISCORD_PERSONAL_INSTALL_URL =
  'https://discord.com/oauth2/authorize?client_id=1529303667348606996&scope=applications.commands&integration_type=1';

export const DISCORD_SERVER_INSTALL_URL =
  'https://discord.com/oauth2/authorize?client_id=1529303667348606996&scope=bot+applications.commands&permissions=378494381072';

export const DISCORD_SUPPORT_SERVER_URL = 'https://discord.gg/p8URa4JYBB';

function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const cardClass = "flex items-center gap-3 p-5 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group";

export default function DiscordInvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
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
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-sans text-sm text-muted-foreground hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KJB Reader
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/30 mb-4 bg-gradient-to-br from-indigo-500 to-violet-600">
            <DiscordIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">KJB Reader Bot</h1>
          <p className="font-sans text-sm text-muted-foreground">For random, search, daily, and gospel sharing.</p>
          <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        </div>

        {/* Install buttons — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <a href={DISCORD_PERSONAL_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-700">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-semibold text-base text-foreground group-hover:text-accent transition-colors mb-1">📱 Personal Install</p>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">Adds slash commands to your Discord account — works in DMs, group DMs, and any server.</p>
            </div>
          </a>

          <a href={DISCORD_SERVER_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-indigo-500 to-violet-600">
              <Server className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-semibold text-base text-foreground group-hover:text-accent transition-colors mb-1">🏠 Server Install</p>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">Install for looking up verses, chapters, and the gospel on your servers.</p>
            </div>
          </a>
        </div>

        {/* Support server + email */}
        <div className="space-y-4">
          <a href={DISCORD_SUPPORT_SERVER_URL} target="_blank" rel="noopener noreferrer" className={cardClass}>
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
              <DiscordIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Support Server</p>
              <p className="font-sans text-xs text-muted-foreground">Join our Discord community for help, updates, and to share feedback.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </a>

          <a href="mailto:Kingjamesbiblereader@outlook.sg" className={cardClass}>
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-amber-500 to-orange-600">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Support Email</p>
              <p className="font-sans text-xs text-muted-foreground">Kingjamesbiblereader@outlook.sg</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        {/* Credits & Attribution — left-aligned, links, British spelling */}
        <div className="mt-10 pt-6 border-t border-border/40">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Built With</h2>
          <ul className="space-y-2.5 text-xs text-muted-foreground/80">
            <li className="flex flex-wrap items-baseline gap-x-1.5">
              <a href="https://bibleprotector.com" target="_blank" rel="noopener noreferrer" className="font-serif font-medium text-accent hover:underline transition-colors">King James Bible (KJB) text</a>
              <span className="text-muted-foreground/70">— public domain, 1900 Pure Cambridge Edition, sourced from Bible Protector.</span>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-1.5">
              <a href="https://discord.js.org" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-accent hover:underline transition-colors">Discord.js</a>
              <span className="text-muted-foreground/70">— open-source Node.js library (MIT licence) powering the bot's Discord integration.</span>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-1.5">
              <a href="https://discloud.app" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-accent hover:underline transition-colors">Discloud</a>
              <span className="text-muted-foreground/70">— hosting provider running the bot's always-on Discord gateway connection.</span>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-1.5">
              <a href="https://kingjamesbiblereader.com" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-accent hover:underline transition-colors">KJB Reader Bible API (kingjamesbiblereader.com)</a>
              <span className="text-muted-foreground/70">— the API powering verse lookup and search.</span>
            </li>
            <li className="flex flex-wrap items-baseline gap-x-1.5">
              <a href="https://github.com/node-cron/node-cron" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-accent hover:underline transition-colors">node-cron</a>
              <span className="text-muted-foreground/70">— open-source scheduling library used for daily verse delivery timing.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}