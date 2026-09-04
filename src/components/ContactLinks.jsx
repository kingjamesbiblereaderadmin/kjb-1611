import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ExternalLink, Globe, Youtube, PlayCircle, Link2, FileText } from 'lucide-react';

// Linktree icon SVG
function LinktreeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.736 5.853l4.005-4.117 2.325 2.381-4.2 4.005h5.908v3.288h-5.937l4.229 4.108-2.325 2.339-5.74-5.794-5.741 5.794-2.325-2.339 4.229-4.108H7.436V8.122h5.909l-4.2-4.005 2.324-2.381 4.005 4.117V0h3.062v5.853zm-3.062 9.479h3.062V24h-3.062v-8.668z"/>
    </svg>
  );
}

// TikTok icon SVG
function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.72a4.85 4.85 0 01-1.01-.03z"/>
    </svg>
  );
}

// Instagram icon SVG
function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// Discord icon SVG
function DiscordIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

const linkCardClass = "flex items-center gap-3 p-4 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group";

const LINKS = [
  {
    href: "https://godisgracious1031ministriescom.odoo.com/",
    label: "God is Gracious 1031 Ministries",
    sub: "Ministry Website",
    external: true,
    icon: <Globe className="w-5 h-5" />,
    iconBg: "from-sky-500 to-blue-600",
  },
  {
    href: "https://youtube.com/@shawnr325av?si=zC_gQm4I2S_xj-NS",
    label: "YouTube",
    sub: "@shawnr325av",
    external: true,
    icon: <Youtube className="w-5 h-5" />,
    iconBg: "from-red-500 to-rose-600",
  },
  {
    href: "https://rumble.com/user/Godisgracious1031",
    label: "Rumble",
    sub: "Godisgracious1031",
    external: true,
    icon: <PlayCircle className="w-5 h-5" />,
    iconBg: "from-emerald-500 to-green-600",
  },
{
    href: "https://www.tiktok.com/@svdbyfaithinr325av",
    label: "TikTok",
    sub: "@svdbyfaithinr325av",
    external: true,
    icon: <TikTokIcon className="w-5 h-5" />,
    iconBg: "from-slate-800 to-black",
  },
  {
    href: "https://www.instagram.com/svdbyfaithinhisbloodr325av/",
    label: "Instagram",
    sub: "@svdbyfaithinhisbloodr325av",
    external: true,
    icon: <InstagramIcon className="w-5 h-5" />,
    iconBg: "from-fuchsia-500 via-rose-500 to-amber-500",
  },
  {
    href: "https://discord.com/users/faithinhisbloodr325av",
    label: "Discord",
    sub: "faithinhisbloodr325av",
    external: true,
    icon: <DiscordIcon className="w-5 h-5" />,
    iconBg: "from-indigo-500 to-violet-600",
  },
  {
    href: "https://linktr.ee/shawnr325av",
    label: "Linktree",
    sub: "linktr.ee/shawnr325av",
    external: true,
    icon: <LinktreeIcon className="w-5 h-5" />,
    iconBg: "from-green-500 to-emerald-600",
  },
  {
    href: "mailto:kingjamesbiblereader@outlook.sg",
    label: "Email",
    sub: "kingjamesbiblereader@outlook.sg",
    external: false,
    icon: <Mail className="w-5 h-5" />,
    iconBg: "from-emerald-500 to-teal-600",
  },
];

export default function ContactLinks() {
  return (
    <div className="space-y-3">
      {LINKS.map((link, idx) => {
        const inner = (
          <>
            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-white shadow-md bg-gradient-to-br ${link.iconBg}`}>
              {link.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="notranslate font-sans font-medium text-sm text-foreground group-hover:text-accent transition-colors truncate" translate="no">{link.label}</p>
              <p className="notranslate font-sans text-xs text-muted-foreground truncate" translate="no">{link.sub}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground ml-auto flex-shrink-0" />
          </>
        );
        if (link.to) {
          return (
            <Link key={idx} to={link.to} className={linkCardClass}>
              {inner}
            </Link>
          );
        }
        return (
          <a
            key={idx}
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={linkCardClass}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}