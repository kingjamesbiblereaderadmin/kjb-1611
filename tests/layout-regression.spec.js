/**
 * Layout regression tests for the reader page.
 *
 * These exist because the bugs we keep hitting (RunningHead text overlapping
 * the "Chapter N" label, two-column verse text bleeding across the
 * column-rule divider) are all *geometric* — an element's bounding box
 * crossing a line it shouldn't. That's something a script can check exactly,
 * every combination, every time, instead of someone scrolling through
 * screenshots on a phone.
 *
 * Run locally:
 *   npx playwright install --with-deps chromium   (once)
 *   npm run test:layout
 *
 * Runs automatically in CI on every push (see
 * .github/workflows/layout-tests.yml) against a local `vite preview` build,
 * so a regression shows up as a failed check before you ever open the app.
 */
import { test, expect } from '@playwright/test';

// A representative slice of books/chapters, not all 1189 chapters — chosen to
// hit the longest book titles (the ones that actually stress RunningHead's
// shrink/stack logic) plus a couple of ordinary ones as a control.
const BOOKS = [
  { abbr: '1KI', chapter: 16, label: '1 Kings 16 (longest OT title)' },
  { abbr: '2KI', chapter: 3, label: '2 Kings 3 (longest OT title)' },
  { abbr: '1SA', chapter: 5, label: '1 Samuel 5 (long title)' },
  { abbr: 'PSA', chapter: 119, label: 'Psalms 119 (longest chapter)' },
  { abbr: 'GEN', chapter: 3, label: 'Genesis 3 (control/short title)' },
  { abbr: 'REV', chapter: 21, label: 'Revelation 21 (long title)' },
];

const FONTS = ['serif', 'cursive'];
const ZOOM_LEVELS = [100, 150, 175, 200, 250];

// Real devices this app is meant to run on: a narrow phone and a tablet-ish
// width, both portrait. Two-column mode is the whole point of the test, and
// it's most cramped (and most likely to leak) on a narrow phone.
const VIEWPORTS = [
  { name: 'phone', width: 393, height: 851 },
  { name: 'narrow-phone', width: 360, height: 780 },
];

const OVERFLOW_TOLERANCE_PX = 1.5; // sub-pixel rendering slop

async function openReader(page, { abbr, chapter, font, zoom }) {
  await page.addInitScript(
    ([f, z]) => {
      try {
        localStorage.setItem('kjb-reader-font-family', f);
        localStorage.setItem('kjb-zoom', String(z));
        localStorage.setItem('kjb-column', 'true');
        // Skip onboarding/install prompts so the reader renders immediately.
        localStorage.setItem('kjb-has-visited-app', 'true');
        localStorage.setItem('kjb-prompt-dismissed', 'true');
      } catch {}
    },
    [font, zoom]
  );
  await page.goto(`/read?book=${abbr}&chapter=${chapter}`);
  // Wait for actual verse text, not just the shell.
  await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
}

for (const viewport of VIEWPORTS) {
  test.describe(`[${viewport.name} ${viewport.width}x${viewport.height}]`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const font of FONTS) {
      for (const zoom of ZOOM_LEVELS) {
        for (const book of BOOKS) {
          test(`${book.label} — ${font} @ ${zoom}%`, async ({ page }) => {
            await openReader(page, { abbr: book.abbr, chapter: book.chapter, font, zoom });

            // ── RunningHead: book title vs "Chapter N" must never overlap ──
            const head = page.getByTestId('kjb-running-head');
            if (await head.count()) {
              const headBox = await head.boundingBox();
              const bookBox = await page.getByTestId('kjb-running-head-book').boundingBox();
              const chapterBox = await page.getByTestId('kjb-running-head-chapter').boundingBox();
              const stacked = (await head.getAttribute('data-stacked')) === 'true';

              expect(headBox, `${book.label}: RunningHead not visible`).toBeTruthy();
              expect(bookBox, `${book.label}: book title span not visible`).toBeTruthy();
              expect(chapterBox, `${book.label}: chapter span not visible`).toBeTruthy();

              if (!stacked) {
                // Inline mode: the book title's right edge must sit at or
                // before the chapter label's left edge — any overlap here is
                // the exact bug we fixed twice already.
                expect(
                  bookBox.x + bookBox.width,
                  `${book.label} (${font} @ ${zoom}%): book title overlaps "Chapter N" — RunningHead did not shrink/stack correctly`
                ).toBeLessThanOrEqual(chapterBox.x + OVERFLOW_TOLERANCE_PX);
              } else {
                // Stacked mode: chapter label must be fully below the book
                // title, not beside or overlapping it.
                expect(
                  bookBox.y + bookBox.height,
                  `${book.label} (${font} @ ${zoom}%): stacked RunningHead — chapter label overlaps book title vertically`
                ).toBeLessThanOrEqual(chapterBox.y + OVERFLOW_TOLERANCE_PX);
              }

              // Neither span may spill outside the header's own box (this
              // would mean the internal shrink-to-fit measurement itself is
              // wrong, independent of the other span).
              for (const [name, box] of [['book title', bookBox], ['chapter label', chapterBox]]) {
                expect(
                  box.x,
                  `${book.label} (${font} @ ${zoom}%): ${name} starts left of RunningHead container`
                ).toBeGreaterThanOrEqual(headBox.x - OVERFLOW_TOLERANCE_PX);
                expect(
                  box.x + box.width,
                  `${book.label} (${font} @ ${zoom}%): ${name} extends right of RunningHead container`
                ).toBeLessThanOrEqual(headBox.x + headBox.width + OVERFLOW_TOLERANCE_PX);
              }
            }

            // ── Two-column verse text: nothing may cross into the divider ──
            const container = page.getByTestId('kjb-two-col-container');
            if (await container.count()) {
              const result = await container.evaluate((el, tolerance) => {
                const containerRect = el.getBoundingClientRect();
                const style = getComputedStyle(el);
                const gapPx = parseFloat(style.columnGap) || 0;
                const leftColumnRightEdge = containerRect.left + (containerRect.width - gapPx) / 2;
                const rightColumnLeftEdge = leftColumnRightEdge + gapPx;
                const containerCenter = containerRect.left + containerRect.width / 2;

                const overflows = [];
                // Any leaf element with visible text — this is what actually
                // paints pixels, so it's what can visually "leak."
                const candidates = el.querySelectorAll('*');
                for (const node of candidates) {
                  if (node.children.length > 0) continue; // only leaves
                  const text = (node.textContent || '').trim();
                  if (!text) continue;
                  const rects = node.getClientRects();
                  for (const rect of rects) {
                    if (rect.width === 0 || rect.height === 0) continue;
                    const rectCenter = rect.left + rect.width / 2;
                    if (rectCenter < containerCenter) {
                      // Left column: right edge must not pass the divider's
                      // left-column boundary.
                      if (rect.right > leftColumnRightEdge + tolerance) {
                        overflows.push({
                          text: text.slice(0, 40),
                          side: 'left',
                          overBy: Math.round((rect.right - leftColumnRightEdge) * 10) / 10,
                        });
                      }
                    } else {
                      // Right column: left edge must not start before the
                      // divider's right-column boundary.
                      if (rect.left < rightColumnLeftEdge - tolerance) {
                        overflows.push({
                          text: text.slice(0, 40),
                          side: 'right',
                          overBy: Math.round((rightColumnLeftEdge - rect.left) * 10) / 10,
                        });
                      }
                    }
                  }
                }
                return {
                  overflows,
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                };
              }, OVERFLOW_TOLERANCE_PX);

              expect(
                result.overflows,
                `${book.label} (${font} @ ${zoom}%): text leaking across the column divider:\n` +
                  result.overflows.map((o) => `  "${o.text}" (${o.side} column, over by ${o.overBy}px)`).join('\n')
              ).toEqual([]);

              // Whole-container overflow (e.g. a word too wide to break at
              // all) shows up as horizontal scroll on the container itself.
              expect(
                result.scrollWidth,
                `${book.label} (${font} @ ${zoom}%): two-column container has horizontal overflow`
              ).toBeLessThanOrEqual(result.clientWidth + OVERFLOW_TOLERANCE_PX);
            }
          });
        }
      }
    }
  });
}
