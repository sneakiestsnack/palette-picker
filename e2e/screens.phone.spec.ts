// Phone screenshots for async review (blueprint §2.6).
import { test } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

test('phase 9: phone empty and loaded', async ({ page }) => {
  await openApp(page);
  await page.screenshot({ path: 'artifacts/phase-9/phone-empty.png', fullPage: true });
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.screenshot({ path: 'artifacts/phase-9/phone.png', fullPage: true });
});
