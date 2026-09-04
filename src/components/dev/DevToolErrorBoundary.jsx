import React from 'react';
import { AlertCircle } from 'lucide-react';

// Catches render errors inside a Dev Tools tab so one broken tool shows a
// readable message instead of blanking the whole page.
export default class DevToolErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Reset the error when switching to a different tab.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      // A failed dynamic import means a stale chunk hash (old build) — a single
      // fresh reload pulls the current chunk manifest and fixes it.
      const isChunkError = /dynamically imported module|Failed to fetch|Importing a module script failed|ChunkLoadError/i.test(msg);
      return (
        <div className="rounded-xl bg-destructive/10 border border-destructive/40 p-4">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-sans text-sm font-semibold">This tool failed to load.</p>
              {isChunkError ? (
                <p className="font-sans text-xs mt-1 opacity-90">The app was updated. Reload to load the latest version.</p>
              ) : (
                <p className="font-sans text-xs mt-1 break-words opacity-90">{msg}</p>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}