import { expect, test } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

test('manifest, service worker, and offline use', async ({ page, context }) => {
  await openApp(page);

  // The manifest link resolves relative to the base path.
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await page.evaluate(async (h) => (await fetch(h!)).json(), href);
  expect(manifest.name).toBe('Palette Picker');
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);

  // The app registers the service worker itself (injectRegister: false → useRegisterSW).
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  // With registerType 'prompt' the worker doesn't claim the page that installed it; after a reload it controls it.
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Palette Picker' })).toBeVisible();
  await expect(page.getByTestId('worker-status')).toHaveText('worker: ok');   // the worker chunk is precached
  await loadFixture(page, 'stripes-6.png');
  expect(await swatchHexes(page)).toEqual(['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF']);
  await context.setOffline(false);
});
