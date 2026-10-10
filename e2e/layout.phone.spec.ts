import { expect, test } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const STRIPES = ['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF'];

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('empty state offers Choose photo and Take photo', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Choose photo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible();
  await expect(page.getByTestId('camera-input')).toHaveAttribute('capture', 'environment');
});

test('no horizontal overflow, and touch targets are at least 44 × 44', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  expect(await swatchHexes(page)).toEqual(STRIPES);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const targets = [
    ...(await page.getByRole('slider').all()),
    ...(await page.getByTestId('swatch').all()),
  ];
  expect(targets.length).toBe(5 + 6);
  for (const t of targets) {
    const box = (await t.boundingBox())!;
    expect(box.width, await t.getAttribute('aria-label') ?? '').toBeGreaterThanOrEqual(44);
    expect(box.height, await t.getAttribute('aria-label') ?? '').toBeGreaterThanOrEqual(44);
  }
});

test('no horizontal overflow at 360 px wide', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the Controls section collapses and expands, and stays as left after a reload', async ({ page }) => {
  const toggle = page.getByTestId('controls-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('ctl-size')).toBeVisible();
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('ctl-size')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('controls-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.getByTestId('controls-toggle').tap();
  await expect(page.getByTestId('ctl-size')).toBeVisible();
});

test('stripes gives the same six swatches and tapping one copies it', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  expect(await swatchHexes(page)).toEqual(STRIPES);
  await page.getByTestId('swatch').nth(2).tap();
  await expect(page.getByTestId('toast')).toHaveText('Copied #FF0000');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('FF0000');
  await expect(page.getByTestId('export-png')).toHaveText('Save image');
});
