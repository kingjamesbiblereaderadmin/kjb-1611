import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// serverUrl was previously hardcoded to '' here, which makes the SDK build
// every entity/API request as a RELATIVE path ('/api/...') instead of an
// absolute URL -- see createClient() in @base44/sdk, which does
// `baseURL: `${serverUrl}/api``. A relative path resolves against whatever
// origin the PAGE ITSELF happens to be loaded from. That's fine within
// Base44's own editor/preview (served from base44.app, where '/api/...'
// correctly IS base44.app's own API) -- but this app is also deployed to a
// custom domain (kingjamesbiblereader.com) and, via the native Android app,
// ALWAYS loaded from that custom domain. There, '/api/apps/{id}/entities/...'
// isn't a real backend route at all -- it silently fell through to the
// site's own SPA-hosting fallback, which serves index.html for any
// unmatched path (to support client-side routing) -- so every
// base44.entities.X.list()/.create()/.update()/etc. call anywhere in the
// app was actually receiving the app's OWN HTML shell back as the
// "response", not real JSON, when accessed via the custom domain. Omitting
// serverUrl lets the SDK use its own default (https://base44.app) instead --
// an ABSOLUTE URL that resolves correctly regardless of which origin the
// app itself is currently being served from. Confirmed CORS-safe for this
// (access-control-allow-origin: *) and confirmed to return real data.
//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  requiresAuth: false,
  appBaseUrl
});
