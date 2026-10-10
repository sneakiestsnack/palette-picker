import { expect, test } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const ORDERS = {
  value: ['#000000', '#0000FF', '#FF0000', '#00FF00', '#FFFF00', '#FFFFFF'],
  hue: ['#FF0000', '#FFFF00', '#00FF00', '#0000FF', '#000000', '#FFFFFF'],
  saturation: ['#0000FF', '#00FF00', '#FF0000', '#FFFF00', '#000000', '#FFFFFF'],
} as const;

test('each sort mode orders the swatches per A20; Copy all follows; the mode is remembered', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  expect(await swatchHexes(page)).toEqual(ORDERS.value);

  for (const mode of ['hue', 'saturation', 'value'] as const) {
    await page.getByTestId('sort-select').selectOption(mode);
    expect(await swatchHexes(page)).toEqual(ORDERS[mode]);
  }

  await page.getByTestId('sort-select').selectOption('hue');
  await page.getByTestId('copy-all').click();
  await expect(page.getByTestId('toast')).toHaveText('Copied 6 colors');
  const copied = await page.evaluate(() => navigator.clipboard.readText().then((t) => t.replace(/\r\n/g, '\n')));
  expect(copied).toBe(ORDERS.hue.map((h) => h.slice(1)).join('\n'));

  await page.reload();
  await expect(page.getByTestId('sort-select')).toHaveValue('hue');
});

test('frequency: the most common color comes first', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'near-duplicates.png');
  await swatchHexes(page);
  await page.getByTestId('sort-select').selectOption('frequency');
  await expect(page.getByTestId('proportion-bar')).toHaveAttribute('data-coverage-settled', 'true');
  // The blue band covers 95 % of the image (it absorbs the other blues); red covers 5 %.
  expect(await swatchHexes(page)).toEqual(['#3060C0', '#E02020']);
  await page.getByTestId('sort-select').selectOption('value');
  expect(await swatchHexes(page)).toEqual(['#3060C0', '#E02020']);
});
