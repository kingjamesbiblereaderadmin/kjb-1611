import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'September 1st, 2026';

function AIDisclaimer() {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mb-6 flex items-start gap-3">
      <span className="text-lg shrink-0 leading-none mt-0.5">⚠️</span>
      <p className="font-sans text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
        <strong className="font-semibold">AI-Generated Notice:</strong> These Terms of Service were
        generated with the assistance of artificial intelligence (AI) and may contain errors or
        omissions. They are not a substitute for professional legal advice. If you have specific
        legal concerns, please consult a qualified legal professional.
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl rounded-2xl p-6 sm:p-7 mb-5 shadow-lg shadow-black/[0.03]">
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-3">{title}</h2>
      <div className="font-sans text-sm text-foreground/85 leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function TermsOfServicePage() {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="font-sans text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 w-16 h-px bg-accent mx-auto" />
        </div>

        <div className="text-center mb-6">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <AIDisclaimer />

        <Section title="Acceptance of Terms">
          <p>
            By accessing or using KJB Reader ("the App"), you agree to be bound by these Terms of
            Service. If you do not agree to these terms, please do not use the App.
          </p>
        </Section>

        <Section title="Description of Service">
          <p>
            KJB Reader is a free, non-commercial application that provides access to the King James
            Bible (Pure Cambridge Edition) for personal reading, study, and reflection. The App
            works offline, offers daily verses, search, bookmarks, and customisable reading
            settings. A browser extension is also available, providing the same Bible
            reading and search functionality as a sidebar panel.
          </p>
        </Section>

        <Section title="Free and Public Domain">
          <p>
            The King James Bible text used in this App is in the public domain worldwide. In the
            United Kingdom, the KJB is protected by a perpetual Crown Copyright administered by the
            King's Printer. This App is intended for personal, non-commercial use only. For
            commercial use within the UK, a licence from Cambridge University Press or the King's
            Printer may be required.
          </p>
          <p>
            The App itself is provided free of charge and may be freely shared.
          </p>
        </Section>

        <Section title="Use of the App">
          <p>You agree to use the App only for lawful purposes and in a manner that does not infringe the rights of, or restrict the use and enjoyment of, the App by any third party. You agree not to:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Use the App in any way that breaches applicable local, national, or international law or regulation.</li>
            <li>Attempt to gain unauthorised access to, interfere with, or disrupt the App's systems or data.</li>
            <li>Use the App to transmit any malicious code, viruses, or harmful content.</li>
            <li>Reproduce, duplicate, or resell the App for commercial purposes without permission.</li>
          </ul>
        </Section>

        <Section title="No Accounts Required">
          <p>
            The core reading App does not require an account. There is no sign-in, no cloud sync,
            and no remote data storage. All your data — saved verses, reading progress, and
            settings — exists only on the device you are using. You are responsible for managing
            your own data on your device. (The optional Discord bot integration, described below,
            is a separate feature that stores minimal server configuration on my servers.)
          </p>
        </Section>

        <Section title="KJB Reader Discord Bot">
          <p>
            KJB Reader also offers an optional Discord bot for server administrators to add to
            their own Discord servers, providing slash-command Bible lookups and scheduled daily
            verse delivery. Unlike the core reading app, this feature requires storing minimal
            server configuration (server ID/name, channel, delivery time/timezone, and an optional
            role for pings) on my servers so scheduled deliveries can run — see the Privacy Policy
            for details on exactly what is stored.
          </p>
          <p>
            The bot is provided free of charge, "as is," with no guarantee of uninterrupted uptime
            or delivery at the exact configured time. Server administrators are responsible for
            ensuring their use of the bot complies with Discord's own Terms of Service and
            Community Guidelines. Administrators may disable or remove the bot from their server
            at any time.
          </p>
        </Section>

        <Section title="Browser Extension">
          <p>
            The KJB Reader Extension (KJB Reader - SidePanel) is provided as a free
            companion to the KJB Reader website, available on browser extension stores (Chrome
            Web Store, Firefox Add-ons, Opera Add-ons). It uses the same King James Bible text
            (Pure Cambridge Edition). The extension does not require an account and does not
            collect personal data. You may uninstall it at any time through your browser
            extension management page.
          </p>
        </Section>

        <Section title="Intellectual Property">
          <p>
            The App's software, design, and original content (excluding the Bible text, which is
            public domain) are provided by me. The App was built with the assistance of artificial
            intelligence (AI) and the Base44 platform. Fonts used in the App are open source under
            the SIL Open Font License.
          </p>
        </Section>

        <Section title="Third-Party Content & Licences">
          <p>
            The Bible text used is the King James Bible (Pure Cambridge Edition), which is in the
            public domain.
          </p>
        </Section>

        <Section title="AI Disclaimer">
          <p>
            This App was built with the assistance of artificial intelligence (AI). While great
            care has been taken to ensure accuracy, AI-generated code and content may contain
            errors. The King James Bible text itself is sourced from the Pure Cambridge Edition and
            is not AI-generated. If you notice any issue, please contact me so I can correct it.
          </p>
        </Section>

        <Section title="Disclaimer of Warranties">
          <p>
            The App is provided "as is" and "as available" without warranties of any kind, whether
            express or implied. While every effort is made to ensure the Bible text is accurate, I
            do not guarantee that the App will be error-free, uninterrupted, or free from
            inaccuracies. You use the App at your own risk.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, KJB Reader shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of data, arising
            from your use of or inability to use the App.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            I may update these Terms of Service from time to time. Any changes will appear on this
            page with a revised "Last updated" date. Continued use of the App after changes
            constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            If you have any questions about these Terms of Service, please contact me at{' '}
            <a href="mailto:kingjamesbiblereader@outlook.sg" className="text-primary hover:underline">
              kingjamesbiblereader@outlook.sg
            </a>.
          </p>
        </Section>

        <div className="text-center mt-8">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}