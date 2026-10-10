import { expect, test } from '@playwright/test';
import { loadFixture, openApp, pressOn, swatchHexes } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

const STRIPES = ['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF'];

test('stripes with default controls', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  expect(await swatchHexes(page)).toEqual(STRIPES);
  await expect(page.getByTestId('shortfall')).toHaveCount(0);
});

test('size 3 with variety 0 and 100', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  await pressOn(page, 'ctl-size', 'End', ...Array<string>(13).fill('ArrowLeft'));
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '3');
  await pressOn(page, 'ctl-variety', 'Home');
  expect(await swatchHexes(page)).toEqual(['#000000', '#0000FF', '#FF0000']);
  await pressOn(page, 'ctl-variety', 'End');
  expect(await swatchHexes(page)).toEqual(['#000000', '#0000FF', '#FFFFFF']);
});

test('value range 40–90 → three colors and the shortfall notice', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  await pressOn(page, 'ctl-range-thumb-0', 'PageUp', 'PageUp', 'PageUp', 'PageUp');
  await pressOn(page, 'ctl-range-thumb-1', 'PageDown');
  await expect(page.getByTestId('ctl-range-thumb-0')).toHaveAttribute('aria-valuenow', '40');
  await expect(page.getByTestId('ctl-range-thumb-1')).toHaveAttribute('aria-valuenow', '90');
  expect(await swatchHexes(page)).toEqual(['#0000FF', '#FF0000', '#00FF00']);
  await expect(page.getByTestId('shortfall')).toHaveText('Only 3 clearly different colors in this value range.');
});

test('near-duplicates and transparent-half', async ({ page }) => {
  await loadFixture(page, 'near-duplicates.png');
  expect(await swatchHexes(page)).toEqual(['#3060C0', '#E02020']);
  await expect(page.getByTestId('shortfall')).toBeVisible();
  await loadFixture(page, 'transparent-half.png');
  await expect(page.getByTestId('image-status')).toContainText('transparent-half.png');
  expect(await swatchHexes(page)).toEqual(['#FF0000']);
});

test('click copies one hex; Copy all copies every hex in display order', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  // Record exactly what the app writes; the OS clipboard may rewrite line endings (Windows: \r\n).
  await page.evaluate(() => {
    const original = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = (text: string) => {
      (window as unknown as { lastCopied: string }).lastCopied = text;
      return original(text);
    };
  });
  const lastCopied = () => page.evaluate(() => (window as unknown as { lastCopied: string }).lastCopied);
  const readClipboard = () => page.evaluate(() => navigator.clipboard.readText().then((t) => t.replace(/\r\n/g, '\n')));

  await page.getByTestId('swatch').first().click();
  await expect(page.getByTestId('toast')).toHaveText('Copied #000000');
  expect(await lastCopied()).toBe('#000000');
  expect(await readClipboard()).toBe('#000000');

  await page.getByTestId('copy-all').click();
  await expect(page.getByTestId('toast')).toHaveText('Copied 6 colors');
  expect(await lastCopied()).toBe(STRIPES.join('\n'));
  expect(await readClipboard()).toBe(STRIPES.join('\n'));
});

test('controls are restored after a reload', async ({ page }) => {
  await pressOn(page, 'ctl-size', 'Home', 'ArrowRight');
  await pressOn(page, 'ctl-variety', 'Home');
  await pressOn(page, 'ctl-hue', 'End');
  await pressOn(page, 'ctl-range-thumb-0', 'PageUp');
  await page.reload();
  await expect(page.getByTestId('app-ready')).toBeAttached();
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByTestId('ctl-variety')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('ctl-hue')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByTestId('ctl-range-thumb-0')).toHaveAttribute('aria-valuenow', '10');
});
