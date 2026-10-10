// Screenshots for async review (blueprint §2.6). Grows phase by phase; artifacts/ is git-ignored.
import { test } from '@playwright/test';
import { loadFixture, openApp } from './helpers';

test('phase 5: desktop with an image loaded', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await page.screenshot({ path: 'artifacts/phase-5/desktop-loaded.png', fullPage: true });
});
