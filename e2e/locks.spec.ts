import { expect, test, type Page } from '@playwright/test';
import { loadFixture, openApp, pressOn, swatchHexes } from './helpers';

const swatch = (page: Page, hex: string) => page.locator(`[data-testid="swatch"][data-hex="${hex}"]`);
const lockedHexes = (page: Page) =>
  page.locator('[data-testid="swatch"][data-locked="true"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-hex')));

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await pressOn(page, 'ctl-size', 'End', ...Array<string>(13).fill('ArrowLeft'));
  await pressOn(page, 'ctl-variety', 'Home');
  expect(await swatchHexes(page)).toEqual(['#000000', '#0000FF', '#FF0000']);
});

test('a locked color survives slider changes', async ({ page }) => {
  const before = await page.getByTestId('palette').getAttribute('data-settled');
  await swatch(page, '#0000FF').getByTestId('lock').click();
  await expect(swatch(page, '#0000FF')).toHaveAttribute('data-locked', 'true');
  await expect(swatch(page, '#0000FF').getByTestId('lock')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.getByTestId('palette').getAttribute('data-settled')).toBe(before);   // locking doesn't re-extract

  await pressOn(page, 'ctl-variety', 'End');
  const hexes = await swatchHexes(page);
  expect(hexes).toContain('#0000FF');
  expect(hexes.length).toBe(3);
  expect(await lockedHexes(page)).toEqual(['#0000FF']);

  await pressOn(page, 'ctl-hue', 'Home');
  await pressOn(page, 'ctl-range-thumb-0', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp');   // range 60–100 excludes blue (45)
  expect(await swatchHexes(page)).toContain('#0000FF');                                                // locks ignore the range
});

test('Re-roll changes the unlocked swatches and keeps the locked one', async ({ page }) => {
  await swatch(page, '#0000FF').getByTestId('lock').click();
  const before = (await swatchHexes(page)).filter((h) => h !== '#0000FF');
  await page.getByTestId('reroll').click();
  const after = await swatchHexes(page);
  expect(after).toContain('#0000FF');
  expect(after.length).toBe(3);
  const unlockedAfter = after.filter((h) => h !== '#0000FF');
  expect(unlockedAfter.some((h) => before.includes(h))).toBe(false);
});

test('the size slider cannot go below the number of locked colors', async ({ page }) => {
  for (const hex of ['#000000', '#0000FF', '#FF0000']) await swatch(page, hex).getByTestId('lock').click();
  await pressOn(page, 'ctl-size', 'Home');
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuemin', '3');
});

test('removing a locked color refills the palette', async ({ page }) => {
  await swatch(page, '#0000FF').getByTestId('lock').click();
  await swatch(page, '#0000FF').getByTestId('remove').click();
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '2');
  const hexes = await swatchHexes(page);
  expect(hexes.length).toBe(2);
  expect(hexes).not.toContain('#0000FF');
});
