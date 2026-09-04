import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

const EMAIL = 'kingjamesbiblereader@outlook.sg';

export default function ContactPage() {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="font-sans text-sm text-muted-foreground">We'd love to hear from you</p>
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

        <div className="bg-gradient-to-br from-card via-card to-accent/15 border border-accent/25 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg shadow-black/[0.03] text-center">
          <p className="font-sans text-sm text-foreground/85 leading-relaxed mb-6">
            Have a question, feedback, a verse request, or a prayer request? We'd be glad to hear
            from you. Reach out and we'll do our best to respond.
          </p>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground font-sans text-base font-medium shadow-md shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all duration-200 max-w-full min-w-0"
          >
            <Mail className="w-5 h-5 shrink-0" />
            <span className="break-all">{EMAIL}</span>
          </a>
          <p className="font-sans text-xs text-muted-foreground mt-4">
            Or copy: <span className="text-foreground font-medium">{EMAIL}</span>
          </p>
        </div>

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