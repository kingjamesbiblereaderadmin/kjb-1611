import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const LAST_UPDATED = 'August 11th, 2026';

function AIDisclaimer() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/35 rounded-2xl p-4 mb-6 flex items-start gap-3">
      <span className="text-lg shrink-0 leading-none mt-0.5">⚠️</span>
      <p className="font-sans text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
        <strong className="font-semibold">AI-Generated Notice:</strong> These Terms of Service were
        generated with the assistance of artificial intelligence (AI) and may contain errors or
        omissions. They are not a substitute for professional legal advice.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl p-6 sm:p-7 mb-5 shadow-lg shadow-black/[0.03]">
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="font-sans text-sm text-foreground/85 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function ExtensionTermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 mb-4">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            KJB Reader Extension — Terms of Service
          </h1>
          <p className="font-sans text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        </div>

        {/* Back to Extension link */}
        <div className="text-center mb-6">
          <Link
            to="/extension"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Extension
          </Link>
        </div>

        <AIDisclaimer />

        <Section title="Acceptance of Terms">
          <p>
            By installing and using the KJB Reader browser extension ("KJB Reader - SidePanel"),
            you agree to be bound by these Terms of Service. If you do not agree to these terms,
            please uninstall the extension.
          </p>
        </Section>

        <Section title="Description of Service">
          <p>
            The KJB Reader browser extension is a free, non-commercial companion tool that detects
            King James Bible verse references on web pages and displays them in a browser side
            panel. It provides Bible search, reading, and verse lookup functionality. The extension
            is available for Chrome, Edge, Firefox, and Opera.
          </p>
        </Section>

        <Section title="Free and Public Domain">
          <p>
            The King James Bible text used in this extension is in the public domain worldwide. In
            the United Kingdom, the KJB is protected by a perpetual Crown Copyright administered by
            the King's Printer. This extension is intended for personal, non-commercial use only.
          </p>
        </Section>

        <Section title="Use of the Extension">
          <p>You agree to use the extension only for lawful purposes. You agree not to:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Use the extension in any way that breaches applicable local, national, or international law.</li>
            <li>Attempt to gain unauthorised access to, interfere with, or disrupt the extension's systems or data.</li>
            <li>Reproduce, duplicate, or resell the extension for commercial purposes without permission.</li>
          </ul>
        </Section>

        <Section title="No Accounts Required">
          <p>
            The extension does not require an account. There is no sign-in, no cloud sync, and no
            remote data storage. All your preferences exist only on your device. You are responsible
            for managing your own data.
          </p>
        </Section>

        <Section title="Permissions">
          <p>
            The extension uses these permissions: activeTab (detects Bible verse references on web
            pages), contextMenus (right-click verse lookup), sidePanel (displays the reader in the
            browser side panel), storage (stores preferences locally), and tabs (opens website
            links in new tabs). No page content is collected or transmitted.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            The extension's software, design, and original content are provided by me. The King
            James Bible text is sourced from the Pure Cambridge Edition and is in the public
            domain. The extension was built with the assistance of artificial intelligence (AI) and
            the Base44 platform.
          </p>
        </Section>

        <Section title="Disclaimer of Warranties">
          <p>
            The extension is provided "as is" and "as available" without warranties of any kind. I
            do not guarantee that the extension will be error-free, uninterrupted, or free from
            inaccuracies. You use the extension at your own risk.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, I shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of or
            inability to use the extension.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            I may update these Terms of Service from time to time. Any changes will appear on this
            page with a revised "Last updated" date.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            If you have any questions about these Terms, please contact me at{' '}
            <a
              href="mailto:kingjamesbiblereader@outlook.sg"
              className="text-primary hover:underline font-medium"
            >
              kingjamesbiblereader@outlook.sg
            </a>.
          </p>
        </Section>

        <div className="text-center mt-8">
          <Link
            to="/extension"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Extension
          </Link>
        </div>
      </div>
    </div>
  );
}