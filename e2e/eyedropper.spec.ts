import { expect, test, type Page } from '@playwright/test';
import { canvasPoint, loadFixture, openApp, pressOn, swatchHexes } from './helpers';

const lockedHexes = (page: Page) =>
  page.locator('[data-testid="swatch"][data-locked="true"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-hex')));

async function clickPixel(page: Page, x: number, y: number) {
  const p = await canvasPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}

test('eyedropper adds, replaces, and reports duplicates', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await pressOn(page, 'ctl-size', 'Home');
  await pressOn(page, 'ctl-variety', 'End');
  expect(await swatchHexes(page)).toEqual(['#000000', '#FFFFFF']);

  await page.getByTestId('eyedropper').click();
  await expect(page.getByTestId('eyedropper')).toHaveAttribute('aria-pressed', 'true');

  await clickPixel(page, 550, 50);                                   // yellow stripe
  expect((await swatchHexes(page)).length).toBe(3);
  expect(await lockedHexes(page)).toEqual(['#FFFF00']);
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '3');

  await clickPixel(page, 150, 50);                                   // white stripe: replaces the unlocked white
  const hexes = await swatchHexes(page);
  expect(hexes.length).toBe(3);
  expect(hexes).toContain('#FFFFFF');
  expect((await lockedHexes(page)).sort()).toEqual(['#FFFF00', '#FFFFFF']);
  await expect(page.getByTestId('ctl-size')).toHaveAttribute('aria-valuenow', '3');

  await clickPixel(page, 150, 50);
  await expect(page.getByTestId('toast')).toHaveText('Already in the palette');

  await page.screenshot({ path: 'artifacts/phase-12/eyedropper.png', fullPage: true });

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('eyedropper')).toHaveAttribute('aria-pressed', 'false');
});
