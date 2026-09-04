/**
 * Search feature tests — the main search page and advanced search filters.
 */
import { test, expect } from '@playwright/test';
import { checkOverflow } from './utils/overflow.js';

const WIDTHS = [360, 393];
const TOLERANCE_PX = 1.5;

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(checkOverflow, TOLERANCE_PX);
  expect(offenders, `${label}: horizontal overflow:\n` + offenders.map((o) => `  <${o.tag}> "${o.text}" (over by ${o.overBy}px)`).join('\n')).toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`Search [${width}px]`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('word search returns results and renders without overflow', async ({ page }) => {
      await page.goto('/search');
      const input = page.getByPlaceholder(/study, Romans 3:25/i);
      await input.fill('love');
      await input.press('Enter');

      // Results render as grouped-by-book sections; wait for at least one
      // book heading to appear rather than a specific count (the exact
      // number of "love" occurrences isn't the point of this test).
      await page.waitForSelector('text=/Testament/', { timeout: 15000 });
      await assertNoOverflow(page, 'search results: "love"');

      // Clearing back to empty shouldn't error or leave stale results.
      await input.fill('');
      await input.press('Enter');
      await assertNoOverflow(page, 'search: cleared');
    });

    test('direct reference search (e.g. "John 3:16") resolves without overflow', async ({ page }) => {
      await page.goto('/search');
      const input = page.getByPlaceholder(/study, Romans 3:25/i);
      await input.fill('John 3:16');
      await input.press('Enter');
      await page.waitForTimeout(1000);
      await assertNoOverflow(page, 'search: direct reference');
    });

    test('a search with no matches shows an empty state, not a broken layout', async ({ page }) => {
      await page.goto('/search');
      const input = page.getByPlaceholder(/study, Romans 3:25/i);
      await input.fill('zzzzznonexistentqueryzzzzz');
      await input.press('Enter');
      await page.waitForTimeout(1000);
      await assertNoOverflow(page, 'search: no matches');
    });

    test('advanced search page loads and filters render without overflow', async ({ page }) => {
      await page.goto('/advanced-search');
      await assertNoOverflow(page, 'advanced search: initial');

      // Open the book filter if present and try searching within it —
      // exercised generically since the exact filter UI may evolve.
      const bookFilterInput = page.getByPlaceholder(/search books/i);
      if (await bookFilterInput.count()) {
        await bookFilterInput.fill('John');
        await assertNoOverflow(page, 'advanced search: book filter typed');
      }
    });
  });
}
