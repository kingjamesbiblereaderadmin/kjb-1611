import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, MailCheck, BookOpen } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Always show generic success — the API hides whether the email exists.
      await base44.auth.resetPasswordRequest(email.trim());
    } catch (err) {
      // Swallow errors; still show generic success to avoid leaking account info.
      console.warn('[ForgotPassword] request error:', err?.message);
    }
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Reset Password</h1>
        </div>

        <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-lg">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <MailCheck className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-sans text-sm text-foreground font-medium">Check your email</p>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                If an account exists for <span className="text-foreground font-medium">{email}</span>, a password reset link has been sent. It may take a few minutes to arrive.
              </p>
              <Link to="/login" className="inline-block font-sans text-sm text-accent underline underline-offset-2 pt-2">← Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="font-sans text-sm text-muted-foreground">Enter your email and we'll send you a link to reset your password.</p>
              <div className="space-y-1.5">
                <label htmlFor="email" className="font-sans text-sm font-medium text-foreground">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-input text-foreground font-sans text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <div className="text-center pt-1">
                <Link to="/login" className="font-sans text-xs text-muted-foreground hover:text-accent underline underline-offset-2">← Back to sign in</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}