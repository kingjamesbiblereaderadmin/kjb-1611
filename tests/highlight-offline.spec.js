/**
 * Highlight persistence across offline/online — companion to the saved-verse
 * and settings persistence tests in offline-online.spec.js, specifically
 * for verse highlights (a separate localStorage key from saved verses).
 * Uses the real VerseTapBar UI (Highlight dropdown -> color choice).
 */
import { test, expect } from '@playwright/test';
import { checkOverflow } from './utils/overflow.js';

const TOLERANCE_PX = 1.5;

async function assertNoOverflow(page, label) {
  const offenders = await page.evaluate(checkOverflow, TOLERANCE_PX);
  expect(offenders, `${label}: horizontal overflow:\n` + offenders.map((o) => `  <${o.tag}> "${o.text}" (over by ${o.overBy}px)`).join('\n')).toEqual([]);
}

function verseLocator(page, n) {
  return page.locator(`#v${n} .kjb-verse-text`);
}

async function applyFirstColorHighlight(page) {
  await page.getByRole('button', { name: /^Highlight$/ }).click();
  const firstColor = page.getByRole('menuitem').first();
  await expect(firstColor).toBeVisible({ timeout: 5000 });
  await firstColor.click();
  await expect(page.getByRole('button', { name: /^Highlighted/ })).toBeVisible({ timeout: 10000 });
}

test.describe('Highlight persistence offline/online', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.removeItem('kjb-highlighted-verses'); } catch {}
    });
  });

  test('highlight applied online survives going offline', async ({ page, context }) => {
    await page.goto('/read?book=JHN&chapter=3');
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

    await verseLocator(page, 16).click();
    await applyFirstColorHighlight(page);

    const storedOnline = await page.evaluate(() => localStorage.getItem('kjb-highlighted-verses'));
    expect(storedOnline, 'highlight was not persisted while online').toBeTruthy();

    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

    const storedOffline = await page.evaluate(() => localStorage.getItem('kjb-highlighted-verses'));
    expect(storedOffline, 'highlight lost after going offline').toBe(storedOnline);

    await assertNoOverflow(page, 'highlighted verse rendered offline');
    await context.setOffline(false);
  });

  test('highlight applied while offline persists after reconnecting', async ({ page, context }) => {
    await page.goto('/read?book=JHN&chapter=3');
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

    await context.setOffline(true);
    await verseLocator(page, 16).click();
    await applyFirstColorHighlight(page);

    const storedOffline = await page.evaluate(() => localStorage.getItem('kjb-highlighted-verses'));
    expect(storedOffline, 'highlight applied offline was not saved').toBeTruthy();

    await context.setOffline(false);
    await page.reload();
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

    const storedOnline = await page.evaluate(() => localStorage.getItem('kjb-highlighted-verses'));
    expect(storedOnline, 'highlight applied offline was lost after reconnecting').toBe(storedOffline);
  });

  test('un-highlighting offline actually removes it, not just visually', async ({ page, context }) => {
    await page.goto('/read?book=JHN&chapter=3');
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });

    await verseLocator(page, 16).click();
    await applyFirstColorHighlight(page);

    await context.setOffline(true);
    await page.getByRole('button', { name: /^Highlighted/ }).click();
    await page.getByRole('menuitem', { name: 'Remove Highlight' }).click();
    await expect(page.getByRole('button', { name: /^Highlight$/ })).toBeVisible({ timeout: 10000 });

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('kjb-highlighted-verses');
      return raw ? JSON.parse(raw) : null;
    });
    const stillThere = stored && JSON.stringify(stored).includes('"16"') && JSON.stringify(stored).includes('JHN');
    expect(stillThere, 'un-highlight while offline did not actually clear storage').toBeFalsy();

    await context.setOffline(false);
  });
});
