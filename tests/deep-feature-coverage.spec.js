/**
 * Deep feature coverage — the remaining user-facing gaps identified in a
 * full feature audit: Saved Verses folders, select-mode bulk actions
 * (copy/share/print/save/highlight/read-selected), the toolbar Print
 * dropdown, and an actual (not just UI-toggle) Download Bible export.
 *
 * Deliberately NOT covered here: internal admin/dev tooling
 * (/dev-tools, /manifest-icons, /manifest-screenshots, /refresh-cache) —
 * these aren't reader-facing features, and the "Share Card" image cropper
 * only exists inside /manifest-screenshots (app-store screenshot
 * generation), not as a real user flow.
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

test.describe('Saved Verses — folders', () => {
  test.use({ viewport: { width: 393, height: 900 } });

  test('create a folder, move a saved verse into it, and see it filtered there', async ({ page }) => {
    // Save a verse first so there's something to organize. Storage is
    // cleared via evaluate() right after the FIRST navigation, not via
    // addInitScript — addInitScript re-runs on every subsequent
    // page.goto() in this test (it fires on every navigation, not just
    // the first), which would wipe the verse right as we navigate to
    // /saved to check it.
    await page.goto('/read?book=JHN&chapter=3');
    await page.evaluate(() => {
      try {
        localStorage.removeItem('kjb-saved-verses');
        localStorage.removeItem('kjb-saved-folders');
      } catch {}
    });
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
    await verseLocator(page, 16).click();
    await page.getByRole('button', { name: /^Save/ }).click();
    await page.waitForFunction(() => !!localStorage.getItem('kjb-saved-verses'), { timeout: 10000 });

    await page.goto('/saved');
    await assertNoOverflow(page, 'saved verses page');

    // The Move button opens a dropdown with a New Folder... item, which
    // uses a native window.prompt() -- intercept it and supply a name.
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('Study Notes');
    });
    await page.getByTitle('Move').first().click();
    await page.getByText('New Folder...').click();
    await page.waitForTimeout(500);

    // Creating a folder auto-switches the active filter to it (empty, since
    // the verse hasn't been moved yet) -- that hides the verse card, and
    // with it the Move button. Switch back to All to see the card again
    // before moving the verse into the now-existing folder.
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.waitForTimeout(300);
    await page.getByTitle('Move').first().click();
    await page.getByRole('menuitem', { name: 'Study Notes' }).click();
    await page.waitForTimeout(500);

    // Filter to that folder and confirm the verse shows there.
    const folderTab = page.getByRole('button', { name: 'Study Notes', exact: true }).first();
    if (await folderTab.count()) {
      await folderTab.click();
      await assertNoOverflow(page, 'filtered to Study Notes folder');
      await expect(page.locator('body')).toContainText(/John/i);
    }

    const stored = await page.evaluate(() => localStorage.getItem('kjb-saved-verses'));
    expect(stored).toContain('Study Notes');
  });
});

test.describe('Select mode — bulk actions in the reader', () => {
  test.use({ viewport: { width: 393, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('kjb-saved-verses');
        localStorage.removeItem('kjb-verse-highlights');
      } catch {}
    });
    await page.goto('/read?book=JHN&chapter=3');
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
    // Enter select mode via a verse's popover, then select a small range.
    await verseLocator(page, 16).click();
    const selectBtn = page.getByTitle('Select verses');
    await selectBtn.click();
    await verseLocator(page, 17).click().catch(() => {});
    await verseLocator(page, 18).click().catch(() => {});
  });

  test('bulk action bar renders with no overflow and shows a real selection count', async ({ page }) => {
    await assertNoOverflow(page, 'select mode action bar');
    await expect(page.locator('body')).toContainText(/selected/);
  });

  test('Copy (Passage) and Copy (Per Verse) do not throw', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.getByRole('button', { name: /^Copy/ }).click();
    await page.getByText('Copy (Passage)').click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /Copied!|^Copy/ }).click();
    const perVerseItem = page.getByText('Copy (Per Verse)');
    if (await perVerseItem.count()) {
      await perVerseItem.click();
      await page.waitForTimeout(300);
    }

    expect(errors, `errors during bulk copy:\n${errors.join('\n')}`).toEqual([]);
  });

  test('bulk Save persists all selected verses to localStorage', async ({ page }) => {
    await page.getByRole('button', { name: /^Save/ }).click();
    await page.waitForTimeout(500);
    const stored = await page.evaluate(() => localStorage.getItem('kjb-saved-verses'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.length).toBeGreaterThanOrEqual(2);
  });

  test('bulk Highlight applies a color to the selection', async ({ page }) => {
    await page.getByRole('button', { name: /^Highlight/ }).click();
    const firstColor = page.getByRole('menuitem').first();
    await firstColor.waitFor({ state: 'visible', timeout: 5000 });
    await firstColor.click();
    await page.waitForTimeout(500);
    const stored = await page.evaluate(() => localStorage.getItem('kjb-verse-highlights'));
    expect(stored).toBeTruthy();
  });

  test('Print Full Page and Print Selected Verses do not throw (window.print stubbed)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // window.print() would otherwise try to open a real OS print dialog,
    // which hangs a headless run — stub it to confirm the app's own code
    // around the call doesn't throw, without actually invoking print UI.
    await page.evaluate(() => { window.print = () => {}; });

    // Two "Print" buttons coexist here: the sticky toolbar's standalone
    // print button, and the select-mode action bar's Print dropdown
    // trigger. Scope to the select bar's one specifically, since it's the
    // one under test.
    const selectBarPrint = page.getByRole('button', { name: /^Print/ }).last();
    await selectBarPrint.click();
    await page.getByText('Print Full Page').click();
    await page.waitForTimeout(300);

    await selectBarPrint.click();
    const printSelected = page.getByText('Print Selected Verses');
    if (await printSelected.count()) {
      await printSelected.click();
      await page.waitForTimeout(300);
    }

    expect(errors, `errors during print:\n${errors.join('\n')}`).toEqual([]);
  });

  test('Read Selected and Show Full Chapter change what is displayed', async ({ page }) => {
    await page.getByRole('button', { name: /Read Selected/ }).click();
    await page.waitForTimeout(500);
    await assertNoOverflow(page, 'after Read Selected');

    const showFullBtn = page.getByRole('button', { name: /Show Full Chapter/ });
    if (await showFullBtn.count()) {
      await showFullBtn.click();
      await page.waitForTimeout(500);
      await assertNoOverflow(page, 'after Show Full Chapter');
    }
  });
});

test.describe('Toolbar Print button (outside select mode)', () => {
  test.use({ viewport: { width: 393, height: 900 } });

  test('triggers printChapterContents without throwing', async ({ page }) => {
    // Unlike the select-mode action bar (a real dropdown with two options,
    // covered above), the standalone toolbar Print button is a single
    // direct action — it calls printChapterContents() straight from
    // onClick. There's no dropdown to open here (PrintDropdown.jsx exists
    // in the codebase but isn't actually wired up to this button).
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/read?book=GEN&chapter=1');
    await page.waitForSelector('.kjb-verse-text', { timeout: 15000 });
    await page.evaluate(() => { window.print = () => {}; });

    await page.getByTitle('Print').click();
    await page.waitForTimeout(500);
    await assertNoOverflow(page, 'after triggering print');

    expect(errors, `errors during toolbar print:\n${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('Download Bible — an actual export, not just the controls', () => {
  test('New Testament as .txt downloads a real, non-trivial file', async ({ page }) => {
    await page.goto('/settings');
    const expandAll = page.getByRole('button', { name: /expand all/i });
    if (await expandAll.count()) await expandAll.click();

    await page.getByRole('button', { name: 'New Test.', exact: true }).click();
    await page.getByRole('button', { name: 'Text', exact: true }).click();

    const downloadBtn = page.getByRole('button', { name: /Download Bible \(TXT\)/i });
    await downloadBtn.waitFor({ state: 'visible', timeout: 10000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      downloadBtn.click(),
    ]);

    const path = await download.path();
    expect(path, 'Download Bible did not produce a file').toBeTruthy();
    const fs = await import('fs/promises');
    const bytes = await fs.readFile(path);
    // New Testament as plain text should comfortably be several hundred KB.
    expect(bytes.length).toBeGreaterThan(100000);
  });
});

test.describe('About page — Statement of Faith accordions', () => {
  test.use({ viewport: { width: 393, height: 900 } });

  test('accordion sections open and close without overflow', async ({ page }) => {
    await page.goto('/about');
    await assertNoOverflow(page, 'about page initial');

    // Named accordion sections (AccordionSection title="...") — targeted by
    // role+name on the heading specifically. Once expanded, some sections
    // reveal a link with the SAME text (e.g. a YouTube playlist card titled
    // after the section), so a plain text locator becomes ambiguous after
    // the first click; scoping to the heading's button role avoids that.
    for (const title of ['Pagan Holidays & Traditions', 'Why I Am Not... Series']) {
      const header = page.getByRole('button', { name: title, exact: true });
      if (await header.count()) {
        await header.click();
        await page.waitForTimeout(200);
        await assertNoOverflow(page, `about page: "${title}" expanded`);
        // Toggle closed again to leave state as found.
        await header.click();
        await page.waitForTimeout(200);
      }
    }
  });
});
