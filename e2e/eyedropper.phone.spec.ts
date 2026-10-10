import { expect, test } from '@playwright/test';
import { canvasPoint, loadFixture, openApp, swatchHexes } from './helpers';

test('touch: a tap with the eyedropper picks the color under the finger', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.getByTestId('eyedropper').tap();
  const p = await canvasPoint(page, 250, 50);                        // red stripe
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.locator('[data-testid="swatch"][data-locked="true"]')).toHaveAttribute('data-hex', '#FF0000');
});
