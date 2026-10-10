// Screenshots for async review (blueprint §2.6). Grows phase by phase; artifacts/ is git-ignored.
import { test } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

test('phase 5: desktop with an image loaded', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await page.screenshot({ path: 'artifacts/phase-5/desktop-loaded.png', fullPage: true });
});

test('phase 6: desktop palette', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.screenshot({ path: 'artifacts/phase-6/desktop-palette.png', fullPage: true });
});

test('phase 7: overlay and histogram', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'gradient-gray.png');
  await page.getByTestId('overlay-toggle').click();
  await swatchHexes(page);
  await page.screenshot({ path: 'artifacts/phase-7/desktop-overlay.png', fullPage: true });
});

test('phase 8: PNG swatch card', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-png').click()]);
  await download.saveAs('artifacts/phase-8/card.png');
  await page.screenshot({ path: 'artifacts/phase-8/desktop-export.png', fullPage: true });
});

test('phase 11: locked swatch and re-roll', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.locator('[data-testid="swatch"][data-hex="#0000FF"]').getByTestId('lock').click();
  await page.locator('[data-testid="swatch"][data-hex="#FF0000"]').hover();
  await page.getByTestId('palette').screenshot({ path: 'artifacts/phase-11/palette-locked.png' });
});

test('phase 14: sort menu', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await page.getByTestId('sort-select').selectOption('hue');
  await swatchHexes(page);
  await page.screenshot({ path: 'artifacts/phase-14/desktop-sort.png', fullPage: true });
});
