/**
 * App-wide overflow crawl.
 *
 * Rather than hand-scripting every button on every page (which is both
 * exhausting to write and to keep in sync as the app grows), this walks
 * every public route at a spread of real phone/tablet widths and asserts
 * nothing overflows horizontally — no clipped text, no element running off
 * the right edge, no word wide enough to force a scrollbar. Combined with
 * the global `overflow-wrap`/`hyphens` safety net in index.css, this is the
 * generic version of "every single word wraps and hyphens instead of
 * overflowing," checked everywhere at once instead of page by page.
 */
import { test, expect } from '@playwright/test';
import { checkOverflow } from './utils/overflow.js';

// Every public, non-destructive, no-auth-required route. Deliberately
// excludes: /login, /register, /forgot-password, /reset-password,
// /oauth/consent (auth flows with server-dependent state), /refresh-cache
// (destructive action), /manifest-icons, /manifest-screenshots, /dev-tools
// (admin-gated internal tools) — none of these are pages a normal reader
// ever lands on, and several would need real auth/session state to render
// meaningfully.
const ROUTES = [
  '/',
  '/read?book=GEN&chapter=1',
  '/read?book=1KI&chapter=16',
  '/gospel',
  '/resources',
  '/kjb-defence',
  '/about',
  '/contents',
  '/settings',
  '/search',
  '/advanced-search',
  '/saved',
  '/legacy',
  '/espanol',
  '/espanol-evangelio',
  '/landing',
  '/credits',
  '/changelog',
  '/terms',
  '/privacy',
  '/contact',
  '/salvation',
  '/discord',
  '/extension',
  '/extension-privacy',
  '/extension-terms',
  '/extension-license',
];

// Real device widths this app targets, narrowest first (most likely to
// reveal an overflow).
const WIDTHS = [320, 360, 393, 412, 768];

const TOLERANCE_PX = 1.5;

for (const width of WIDTHS) {
  test.describe(`[width ${width}px]`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of ROUTES) {
      test(`no horizontal overflow: ${route}`, async ({ page }) => {
        await page.addInitScript(() => {
          try {
            localStorage.setItem('kjb-has-visited-app', 'true');
            localStorage.setItem('kjb-prompt-dismissed', 'true');
            localStorage.setItem('kjb-install-dismissed', 'true');
          } catch {}
        });
        await page.goto(route);
        await page.waitForLoadState('networkidle').catch(() => {});

        const offenders = await page.evaluate(checkOverflow, TOLERANCE_PX);

        expect(
          offenders,
          `${route} @ ${width}px overflows horizontally:\n` +
            offenders.map((o) => `  <${o.tag} class="${o.cls}"> "${o.text}" (over by ${o.overBy}px)`).join('\n')
        ).toEqual([]);
      });
    }
  });
}
