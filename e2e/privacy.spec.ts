// Appendix E8: no network requests while loading an image and using the controls.
import { expect, test } from '@playwright/test';
import { loadFixture, openApp, pressOn, swatchHexes } from './helpers';

test('loading an image and moving sliders makes no network requests', async ({ page }) => {
  await openApp(page);
  await expect(page.getByTestId('worker-status')).toHaveText('worker: ok');
  await page.waitForLoadState('networkidle');

  const requests: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url());
  });

  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await pressOn(page, 'ctl-size', 'End');
  await pressOn(page, 'ctl-variety', 'Home', 'End');
  await pressOn(page, 'ctl-hue', 'Home');
  await pressOn(page, 'ctl-range-thumb-0', 'PageUp');
  await swatchHexes(page);
  await page.getByTestId('overlay-toggle').click();

  expect(requests).toEqual([]);
});
