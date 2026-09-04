import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, BookOpen } from 'lucide-react';

export default function ResetPassword() {
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // The reset link arrives as ?token=...
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get('token');
      if (t) setResetToken(t);
    } catch {}
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!resetToken) { setError('Missing reset token. Please use the link from your email.'); return; }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      // Hard-redirect to the login route so the auth provider re-initializes.
      window.location.href = '/login';
    } catch (err) {
      setError(err?.message || 'Reset failed. The link may have expired.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">New Password</h1>
        </div>

        <form onSubmit={submit} className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="space-y-1.5">
            <label htmlFor="password" className="font-sans text-sm font-medium text-foreground">New Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-input text-foreground font-sans text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="font-sans text-sm font-medium text-foreground">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-input text-foreground font-sans text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="font-sans text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
          <div className="text-center pt-1">
            <Link to="/login" className="font-sans text-xs text-muted-foreground hover:text-accent underline underline-offset-2">← Back to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}