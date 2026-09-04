import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Mail, Globe, Youtube, ArrowRight, Heart, MonitorSmartphone, PlayCircle, Link2, Instagram } from 'lucide-react';
import LandingSetupWizard from '@/components/LandingSetupWizard';
import ScriptureBanner from '@/components/ScriptureBanner';
import CollapsibleCard from '@/components/landing/CollapsibleCard';

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.72a4.85 4.85 0 01-1.01-.03z" />
    </svg>
  );
}

function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const LAST_UPDATED = 'September 4th, 2026';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/30 mb-4 hover:scale-105 active:scale-95 transition-transform">
            <img
              src="https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png"
              alt="KJB Reader Logo"
              className="w-full h-full object-cover"
            />
          </Link>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Welcome to <span className="notranslate" translate="no">KJB Reader</span></h1>
          <p className="notranslate font-sans text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed" translate="no">
            KJB Reader is a free, installable Bible reading app featuring the King James Bible
            (Pure Cambridge Edition). Enjoy offline reading, search, bookmarks,
            and customizable typography — all with privacy at the forefront.
          </p>
          <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        </div>

        {/* Scripture banner */}
        <ScriptureBanner />

        {/* Promo card */}
        <div className="mb-4">
          <Link
            to="/salvation"
            className="flex items-center gap-3 p-5 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-rose-500 to-pink-600">
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Are you saved?</p>
              <p className="font-sans text-xs text-muted-foreground">Jesus Christ died, shed his blood, was buried, and rose again on the third day for our sins. Trust Christ's blood, death, burial and resurrection for your sins, and be eternally saved.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Spanish gospel promo card */}
        <div className="mb-5">
          <Link
            to="/espanol-evangelio"
            className="flex items-center gap-3 p-5 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
          >
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-sky-500 to-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Are you saved? (Español)</p>
              <p className="font-sans text-xs text-muted-foreground">El Evangelio de Salvación</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Step-by-step setup wizard */}
        <div className="mb-5">
          <LandingSetupWizard />
        </div>

        {/* Legal & Legacy */}
        <div className="mb-5">
          <CollapsibleCard
            icon={
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-600">
                <Shield className="w-5 h-5" />
              </div>
            }
            title="Legal & Legacy"
          >
            <div className="grid sm:grid-cols-3 gap-4">
              <Link
                to="/privacy"
                className="flex items-center gap-3 p-5 rounded-2xl bg-secondary/40 border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-violet-500 to-purple-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Privacy Policy</p>
                  <p className="font-sans text-xs text-muted-foreground">How your data is handled</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/terms"
                className="flex items-center gap-3 p-5 rounded-2xl bg-secondary/40 border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-emerald-500 to-teal-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Terms of Service</p>
                  <p className="font-sans text-xs text-muted-foreground">Rules for using this app</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                to="/legacy"
                className="flex items-center gap-3 p-5 rounded-2xl bg-secondary/40 border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group"
              >
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-slate-500 to-slate-700">
                  <MonitorSmartphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors">Legacy Reader</p>
                  <p className="font-sans text-xs text-muted-foreground">For old browsers (Internet Explorer 11)</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </CollapsibleCard>
        </div>

        {/* Contact */}
        <CollapsibleCard
          icon={
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br from-blue-500 to-indigo-600">
              <Mail className="w-5 h-5" />
            </div>
          }
          title="Contact"
        >
          <div className="space-y-3 font-sans text-sm text-foreground/85">
            <a href="mailto:kingjamesbiblereader@outlook.sg" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Mail className="w-4 h-4 text-muted-foreground" />
              kingjamesbiblereader@outlook.sg
            </a>
            <a href="https://godisgracious1031ministriescom.odoo.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Globe className="w-4 h-4 text-muted-foreground" />
              godisgracious1031ministries.com
            </a>
            <a href="https://youtube.com/@shawnr325av" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Youtube className="w-4 h-4 text-muted-foreground" />
              @shawnr325av
            </a>
            <a href="https://www.tiktok.com/@svdbyfaithinr325av" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <TikTokIcon className="w-4 h-4 text-muted-foreground" />
              @svdbyfaithinr325av
            </a>
            <a href="https://www.instagram.com/svdbyfaithinhisbloodr325av/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Instagram className="w-4 h-4 text-muted-foreground" />
              @svdbyfaithinhisbloodr325av
            </a>
            <a href="https://rumble.com/user/Godisgracious1031" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <PlayCircle className="w-4 h-4 text-muted-foreground" />
              <span className="notranslate" translate="no">Rumble · Godisgracious1031</span>
            </a>
            <a href="https://discord.com/users/shawn_faithinhisbloodr325av" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <DiscordIcon className="w-4 h-4 text-muted-foreground" />
              shawn_faithinhisbloodr325av
            </a>
            <a href="https://linktr.ee/shawnr325av" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              linktr.ee/shawnr325av
            </a>
          </div>
        </CollapsibleCard>

        <p className="text-center font-sans text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} <span className="notranslate" translate="no">KJB Reader</span> · Last updated: {LAST_UPDATED}
        </p>
      </div>
    </div>
  );
}