import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, BookOpen } from 'lucide-react';

// Resolve a same-origin returnTo path from the URL query (falls back to '/').
// The SDK's loginViaEmailPassword reads this same param for its post-login
// redirect, so we keep it consistent here.
function resolveReturnTo(search) {
  try {
    const p = new URLSearchParams(search);
    const r = p.get('returnTo');
    if (r && r.startsWith('/') && !r.startsWith('//')) return r;
  } catch {}
  return '/';
}

export default function Login() {
  const location = useLocation();
  const returnTo = resolveReturnTo(location.search);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Sets the token and hard-redirects to the resolved returnTo destination.
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      // Safety net in case the SDK returns without redirecting.
      window.location.href = returnTo;
    } catch (err) {
      setError(err?.message || 'Failed to sign in. Please check your email and password.');
      setLoading(false);
    }
  };

  const google = async () => {
    setError('');
    setLoading(true);
    try {
      await base44.auth.loginWithProvider('google', returnTo);
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
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
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1">KJB Reader</h1>
          <p className="font-sans text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Admin Sign-In
          </p>
        </div>

        <form onSubmit={submit} className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl p-6 space-y-4 shadow-lg">
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
          <div className="space-y-1.5">
            <label htmlFor="password" className="font-sans text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="font-sans text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-background border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-all duration-200 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="text-center pt-1">
            <Link to="/forgot-password" className="font-sans text-xs text-muted-foreground hover:text-accent underline underline-offset-2">Forgot password?</Link>
          </div>
        </form>

        <p className="font-sans text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          Admin access is by invitation only. If you cannot sign in, ask the app owner to invite your email as an admin.
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="font-sans text-xs text-muted-foreground hover:text-accent">← Back to app</Link>
        </div>
      </div>
    </div>
  );
}