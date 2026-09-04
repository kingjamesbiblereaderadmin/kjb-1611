import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  // Force a single copy of React/ReactDOM so `react-dom/client`'s createRoot
  // always returns a root with a real `.render` (a duplicate/corrupt
  // pre-bundle is what makes createRoot(...).render(...) === undefined).
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  // Force a clean re-bundle of deps on restart — clears a stale/corrupt
  // pre-bundle that makes createRoot(...).render(...) === undefined.
  optimizeDeps: {
    force: true,
  },
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});