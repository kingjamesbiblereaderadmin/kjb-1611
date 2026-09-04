// KJB Reader Service Worker v20260823_1615
// Cache-first loading for offline support

const CACHE_NAME = 'kjb-reader-v20260904_1200';
const LEGACY_CACHE_NAME = 'kjb-legacy-v11';

// Core app shell resources to cache immediately
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// Cross-origin assets to precache separately from the app shell (addAll is
// atomic — one failure rejects the whole batch, so these go in individually).
const PRECACHE_ASSETS = [
  'https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png',
  // PWA manifest icons — precached at install so the home-screen / installed
  // icon works offline. Served same-origin via the pwaIcon function (cross-origin
  // base44.app URLs can time out on flaky mobile networks, leaving the installed
  // PWA with a blank home-screen icon).
  '/functions/pwaIcon?size=192',
  '/functions/pwaIcon?size=512',
  '/functions/pwaIcon?size=maskable',
  // Self-hosted OpenDyslexic fonts — precache at install so they're available
  // offline immediately, not just after the first page that uses them.
  '/fonts/OpenDyslexic-regular.woff',
  '/fonts/OpenDyslexic-bold.woff',
  '/fonts/OpenDyslexic-italic.woff',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  // Activate this worker immediately once installed. Without this, a freshly
  // fetched worker sits in "waiting" until the app posts SKIP_WAITING — which
  // mobile (throttled SW updates + splash-flow timing) can fail to do, leaving
  // the device stuck on the old worker. Auto-activating here, combined with the
  // app's reg.update() on home load (bypasses Chrome's ~24h throttle) and
  // AutoUpdateHandler's controllerchange→reload, is the reliable update path.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      // Cache the app shell first; then precache cross-origin assets
      // individually so a single failure doesn't reject the whole batch.
      return cache.addAll(APP_SHELL_FILES).catch(err => {
        console.warn('[SW] Some shell resources failed to cache:', err);
        return Promise.resolve();
      }).then(() => {
        // Cross-origin images (e.g. the logo from media.base44.com) return
        // "opaque" responses with no CORS headers. cache.add() defaults to
        // cors mode and rejects these — so fetch in no-cors and cache.put
        // the opaque response directly, which caches.match() can still serve.
        return Promise.all(
          PRECACHE_ASSETS.map(url =>
            fetch(url, { mode: 'no-cors' })
              .then(response => cache.put(url, response))
              .catch(err => console.warn('[SW] Precache failed for', url, err))
          )
        );
      });
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== LEGACY_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Background Sync ──────────────────────────────────────────────────────
// Replay queued requests (stored in IndexedDB by the page via the
// QUEUE_REQUEST message) when connectivity returns. The page registers the
// 'kjb-sync' tag whenever it has pending offline work.
const SYNC_DB = 'kjb-sync-queue';
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SYNC_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function replayQueuedRequests() {
  let db;
  try { db = await openSyncDB(); } catch (err) { console.warn('[SW] sync DB open failed:', err); return; }
  const tx = db.transaction('requests', 'readwrite');
  const store = tx.objectStore('requests');
  const all = await new Promise((res) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });
  for (const item of all) {
    try {
      const res = await fetch(item.url, item.options);
      if (res.ok) { store.delete(item.id); }
    } catch (err) {
      console.warn('[SW] bg-sync replay failed, will retry next sync:', err);
    }
  }
  await tx.done;
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: 'BG_SYNC_DONE' }));
}
self.addEventListener('sync', (event) => {
  if (event.tag === 'kjb-sync') {
    event.waitUntil(replayQueuedRequests());
  }
});

// ── Periodic Background Sync ─────────────────────────────────────────────
// Refresh the app shell cache + prewarm key assets once per day so the
// installed PWA stays fresh even if the user hasn't opened it. Registered from
// the page with reg.periodicSync.register({ minInterval: 24h }).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'kjb-refresh') {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(APP_SHELL_FILES.map((u) =>
          fetch(u, { cache: 'no-store' })
            .then((r) => r.ok ? cache.put(u, r.clone()) : null)
            .catch(() => null)
        ));
        await Promise.all(PRECACHE_ASSETS.map((u) =>
          fetch(u, { mode: 'no-cors' })
            .then((r) => (r.ok || r.type === 'opaque') ? cache.put(u, r.clone()) : null)
            .catch(() => null)
        ));
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: 'PERIODIC_REFRESH_DONE' }));
      } catch (err) {
        console.warn('[SW] periodic refresh failed:', err);
      }
    })());
  }
});

// Fetch event - cache-first strategy with dev mode bypass
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // share_target: receive shared text/links from the OS share sheet. The
  // manifest declares a POST share_target at /share-target; the SW reads the
  // form data and redirects the user to /search with the shared text so it's
  // looked up in the Bible.
  if (request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await request.formData();
        const shared = (formData.get('text') || formData.get('title') || formData.get('url') || '').toString();
        const q = encodeURIComponent(shared.slice(0, 200));
        return Response.redirect(`/search?q=${q}&from=share`, 303);
      } catch (err) {
        console.warn('[SW] share_target parse failed:', err);
        return Response.redirect('/search', 303);
      }
    })());
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle legacy reader function FIRST
  const isLegacyRequest =
    url.pathname.includes('/functions/legacy') ||
    url.pathname.endsWith('/legacy');
  if (isLegacyRequest) {
    const isChunk = url.search.indexOf('chunk=') !== -1;
    event.respondWith(
      caches.open(LEGACY_CACHE_NAME).then((cache) => {
        if (isChunk) {
          return cache.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
              if (response && (response.ok || response.status === 0)) {
                cache.put(request, response.clone());
              }
              return response;
            });
          });
        }
        return fetch(request).then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => {
          return cache.match(request).then((cached) => {
            if (cached) return cached;
            return cache.matchAll().then((all) => {
              const shell = all.find((r) => {
                try {
                  const u = new URL(r.url);
                  return (u.pathname.indexOf('/functions/legacy') !== -1 || u.pathname.endsWith('/legacy')) && u.search.indexOf('chunk=') === -1;
                } catch { return false; }
              });
              if (shell) return shell;
              return new Response(
                '<!DOCTYPE html>' +
                '<html><head><title>Legacy Reader</title></head><body>' +
                '<h1>Legacy Reader</h1>' +
                '<p>This page needs to be opened online once before it can be read offline.</p>' +
                '</body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          });
        });
      })
    );
    return;
  }

  // Skip all API requests - let them hit the network directly.
  // EXCEPTION: public static assets served from base44 file storage live under
  // /api/apps/.../files/mp/public/ (e.g. the PWA manifest icons). These must be
  // cacheable so installed / PWA icons still resolve offline — without this
  // exception the broad /api/ rule would bypass the cache and the icons would
  // fail whenever the device is offline.
  if (url.pathname.startsWith('/api/') && !url.pathname.includes('/files/mp/public/')) return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Never cache sw.js itself — browser must always fetch it fresh for update detection
  if (url.pathname === '/sw.js') return;

  // Navigation requests (the HTML document) use NETWORK-FIRST so a freshly
  // deployed build's index.html — which references the new hashed JS chunks —
  // is always fetched when online. Serving a stale cached index.html was the
  // cause of black screens on reload: the old HTML pointed at lazy chunks that
  // no longer exist on the CDN (404), crashing the page. Falling back to cache
  // (then offline.html) keeps full offline support.
  if (request.mode === 'navigate') {
    event.respondWith(
      // Always bypass the HTTP cache for the HTML document so a freshly
      // deployed build's index.html — which references the new hashed JS
      // chunks — is fetched when online. Mobile browsers can otherwise serve a
      // stale cached index.html (long HTTP max-age), keeping the old chunks and
      // old app code running so no update ever appears (desktop "updated" only
      // because it was hard-refreshed). Offline still falls back to the cache.
      fetch(request, { cache: 'no-store' }).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() =>
        caches.match(request).then((cached) =>
          cached || caches.match('/index.html').then((idx) => idx || caches.match('/offline.html'))
        )
      )
    );
    return;
  }

  // Always fetch the manifest fresh (network-first) so corrected icons reach
  // Chrome/Samsung/Edge immediately instead of a stale cached version.
  // Match both the static manifest.json (legacy) and the dynamic
  // /functions/manifest endpoint the app now links to.
  if (url.pathname === '/manifest.json' || url.pathname.startsWith('/manifest.json?') ||
      url.pathname === '/functions/manifest' || url.pathname.startsWith('/functions/manifest?')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // DEV MODE: Skip service worker caching for development
  if (url.pathname.includes('/@vite') ||
      url.pathname.includes('/@react-refresh') ||
      url.pathname.includes('/node_modules/.vite') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.endsWith('.jsx') ||
      url.pathname.endsWith('.js') && url.pathname.includes('chunk-')) {
    return;
  }

  // Cache-first strategy for app resources
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', request.url);
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Cross-origin  fetches (e.g. the logo from media.base44.com) come
        // back as "opaque" responses when there's no CORS grant: status 0,
        // ok === false, but the body is still valid and cacheable. Previously
        // this handler skipped caching anything with !response.ok, so the logo
        // (and any other cross-origin asset) never got cached and disappeared
        // once the device went offline.
        const isCacheable = response.ok || response.type === 'opaque';

        if (!isCacheable) {
          console.log('[SW] Network response not ok:', response.status);
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch((error) => {
        console.log('[SW] Fetch failed, showing offline page:', error);

        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }

        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating now');
    self.skipWaiting();
  }

  // Report the ACTUAL running service worker version (its live CACHE_NAME) back
  // to whoever asked, via the provided MessagePort. This lets the UI show the
  // real live worker version instead of a hardcoded constant that can drift.
  if (event.data && event.data.type === 'GET_VERSION') {
    const reply = { type: 'VERSION', version: CACHE_NAME.replace('kjb-reader-', '') };
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(reply);
    } else if (event.source && event.source.postMessage) {
      event.source.postMessage(reply);
    }
  }

  if (event.data && event.data.type === 'PREWARM_ASSETS') {
    const urls = event.data.urls || [];
    if (urls.length > 0) {
      console.log('[SW] Prewarming', urls.length, 'assets');
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return Promise.all(
            urls.map(url =>
              fetch(url, { mode: 'no-cors' })
                .then(response => {
                  // Opaque cross-origin responses have ok===false but are valid
                  // and cacheable — same check as the fetch handler uses.
                  if (response.ok || response.type === 'opaque') {
                    return cache.put(url, response.clone());
                  }
                })
                .catch(err => console.warn('[SW] Prewarm failed for', url, err))
            )
          );
        })
      );
    }
  }
});
