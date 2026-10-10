// Phone screenshots for async review (blueprint §2.6).
import { expect, test } from '@playwright/test';
import { canvasPoint, loadFixture, openApp, swatchHexes } from './helpers';

test('phase 9: phone empty and loaded', async ({ page }) => {
  await openApp(page);
  await page.screenshot({ path: 'artifacts/phase-9/phone-empty.png', fullPage: true });
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.screenshot({ path: 'artifacts/phase-9/phone.png', fullPage: true });
});

test('phase 12: touch eyedropper loupe', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
  await page.getByTestId('eyedropper').tap();
  const p = await canvasPoint(page, 300, 50);                        // the green/blue boundary
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'artifacts/phase-12/phone-loupe.png' });
  // The loupe stays fully on screen even when pressing near the top.
  const box = (await page.getByTestId('loupe').boundingBox())!;
  const vp = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
});
