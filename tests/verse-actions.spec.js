/**
 * Verse action tests — tap a verse, use the inline VerseTapBar (Highlight
 * dropdown with color choices/Copy/Share/Save/Close), and confirm the Saved
 * Verses page reflects saves and deletions correctly (round-trips through
 * real localStorage, not mocked).
 */
import { test, expect } from '@playwright/test';
import { checkOverflow } from './utils/overflow.js';

const WIDTHS = [360, 393];
const TOLERANCE_PX = 1.5;

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(checkOverflow, TOLERANCE_PX);
  expect(offenders, `${label}: horizontal overflow:\n` + offenders.map((o) => `  <${o.tag}> "${o.text}" (over by ${o.overBy}px)`).join('\n')).toEqual([]);
}

// The clickable target is the inner `.kjb-verse-text` span, not the outer
// `#v{n}` wrapper (which also contains the verse-number <sup> and has extra
// padding) — clicking the wrapper's bounding-box center can miss the
// element that actually has the onClick handler.
function verseLocator(page, n) {
  return page.locator(`#v${n} .kjb-verse-text`);
}

for (const width of WIDTHS) {
  test.describe(`Verse actions [${width}px]`, () => {
    test.use({ viewport: { width, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.removeItem('kjb-saved-verses');
          localStorage.removeItem('kjb-highlighted-verses');
        } catch {}
      });
    });

    test('tap verse, highlight it with a color, then remove — bar has no overflow', async ({ page }) => {
      await page.goto('/read?book=JHN&chapter=3');
      await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

      await verseLocator(page, 16).click();
      const highlightTrigger = page.getByRole('button', { name: /^Highlight/ });
      await expect(highlightTrigger).toBeVisible({ timeout: 10000 });
      await assertNoOverflow(page, 'VerseTapBar open');

      await highlightTrigger.click();
      const firstColor = page.getByRole('menuitem').first();
      await expect(firstColor).toBeVisible({ timeout: 5000 });
      await firstColor.click();

      // Button label flips to "Highlighted" once applied.
      await expect(page.getByRole('button', { name: /^Highlighted/ })).toBeVisible({ timeout: 10000 });

      const stored = await page.evaluate(() => localStorage.getItem('kjb-highlighted-verses'));
      expect(stored, 'highlight was not persisted').toBeTruthy();

      // Remove it via the dropdown's "Remove Highlight" item.
      await page.getByRole('button', { name: /^Highlighted/ }).click();
      await page.getByRole('menuitem', { name: 'Remove Highlight' }).click();
      await expect(page.getByRole('button', { name: /^Highlight$/ })).toBeVisible({ timeout: 10000 });
    });

    test('copy and share actions do not throw', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto('/read?book=JHN&chapter=3');
      await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
      await verseLocator(page, 16).click();

      await page.getByRole('button', { name: /^Copy/ }).click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /^Share/ }).click().catch(() => {});
      await page.waitForTimeout(300);

      expect(errors, `errors during copy/share:\n${errors.join('\n')}`).toEqual([]);
    });

    test('save a verse via the tap bar, see it on Saved Verses, then remove it', async ({ page }) => {
      await page.goto('/read?book=JHN&chapter=3');
      await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

      await verseLocator(page, 16).click();
      await page.getByRole('button', { name: /^Save/ }).click();

      await page.waitForTimeout(500);
      const saved = await page.evaluate(() => localStorage.getItem('kjb-saved-verses'));
      expect(saved, 'verse was not persisted after Save').toBeTruthy();

      await page.goto('/saved');
      await assertNoOverflow(page, 'saved verses list');
      await expect(page.locator('body')).toContainText(/John/i);

      const removeBtn = page.getByTitle('Remove').first();
      if (await removeBtn.count()) {
        await removeBtn.click();
        await page.waitForTimeout(300);
        const savedAfterRemove = await page.evaluate(() => localStorage.getItem('kjb-saved-verses'));
        const parsed = savedAfterRemove ? JSON.parse(savedAfterRemove) : [];
        expect(parsed.length, 'verse still present in storage after removing').toBe(0);
      }
    });

    test('close button dismisses the tap bar', async ({ page }) => {
      await page.goto('/read?book=JHN&chapter=3');
      await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

      await verseLocator(page, 16).click();
      const highlightTrigger = page.getByRole('button', { name: /^Highlight/ });
      await expect(highlightTrigger).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /^Close$/ }).click();
      await expect(highlightTrigger).toBeHidden({ timeout: 5000 });
    });
  });
}
