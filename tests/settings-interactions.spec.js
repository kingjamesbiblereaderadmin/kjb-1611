/**
 * Settings-page interaction tests.
 *
 * Every customization control on Settings, exercised for real (clicked, not
 * just rendered), checking for horizontal overflow after each change. This
 * is the "click every button" coverage the route crawl can't give you on
 * its own, since most controls here only appear after a click (expanding a
 * section) or change what's rendered (a different font, a stacked layout at
 * an extreme zoom).
 */
import { test, expect } from '@playwright/test';
import { checkOverflow } from './utils/overflow.js';

const WIDTHS = [320, 360, 393];
const TOLERANCE_PX = 1.5;

const THEME_MODES = ['☀️ Light', '🌙 Dark', '🕐 Auto', '📱 System'];
const READING_FONTS = ['Serif (Merriweather)', 'Sans Serif (Inter)', 'Mono', 'Cursive', 'Times New Roman'];
const A11Y_FONTS = ['OpenDyslexic', 'Atkinson Hyperlegible'];

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(checkOverflow, TOLERANCE_PX);
  expect(
    offenders,
    `${label}: horizontal overflow:\n` + offenders.map((o) => `  <${o.tag}> "${o.text}" (over by ${o.overBy}px)`).join('\n')
  ).toEqual([]);
}

for (const width of WIDTHS) {
  test.describe(`Settings interactions [${width}px]`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('every theme mode renders without overflow', async ({ page }) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: /expand all/i }).click();
      for (const label of THEME_MODES) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await assertNoOverflow(page, `theme=${label}`);
      }
    });

    test('every reading font renders without overflow', async ({ page }) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: /expand all/i }).click();
      for (const label of READING_FONTS) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await assertNoOverflow(page, `font=${label}`);
      }
      // Reset back to default so it doesn't affect the a11y-font test below
      const resetBtn = page.getByRole('button', { name: 'Reset to Default' });
      if (await resetBtn.count()) await resetBtn.click();
    });

    test('every accessibility font renders without overflow', async ({ page }) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: /expand all/i }).click();
      for (const label of A11Y_FONTS) {
        await page.locator('button', { hasText: label }).first().click();
        await assertNoOverflow(page, `a11y-font=${label}`);
      }
      const disableBtn = page.getByRole('button', { name: /disable/i });
      if (await disableBtn.count()) await disableBtn.first().click();
    });

    test('text size and app zoom, full range, no overflow', async ({ page }) => {
      await page.goto('/settings');
      await page.getByRole('button', { name: /expand all/i }).click();

      // Text size: 75% -> 150% -> back down. Each step is a real click, not
      // a localStorage shortcut, so it exercises the actual UI state.
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Increase text size' }).click();
        await assertNoOverflow(page, `text-size step ${i}`);
      }
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Decrease text size' }).click();
        await assertNoOverflow(page, `text-size step down ${i}`);
      }

      // App zoom scales the whole page's layout, including this very
      // settings page — a prime spot for something to clip.
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Increase app zoom' }).click();
        await assertNoOverflow(page, `app-zoom step ${i}`);
      }
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: 'Decrease app zoom' }).click();
        await assertNoOverflow(page, `app-zoom step down ${i}`);
      }
    });

    test('reader font x cursive/long-title combo via settings, then verify in reader', async ({ page }) => {
      // Regression coverage for the exact bug class already found: set
      // cursive font + max zoom from Settings, then open the longest book
      // title and confirm nothing leaks.
      await page.goto('/settings');
      await page.getByRole('button', { name: /expand all/i }).click();
      await page.getByRole('button', { name: 'Cursive', exact: true }).click();
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Increase text size' }).click();
      }
      await page.goto('/read?book=1KI&chapter=16');
      await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
      await assertNoOverflow(page, 'reader after settings-driven cursive+zoom change');
    });
  });
}
