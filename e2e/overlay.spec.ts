import { expect, test, type Page } from '@playwright/test';
import { loadFixture, openApp, pressOn, swatchHexes } from './helpers';

async function overlayPixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.getByTestId('overlay-canvas').evaluate(
    (c: HTMLCanvasElement, [px, py]) => Array.from(c.getContext('2d')!.getImageData(px!, py!, 1, 1).data),
    [x, y],
  );
}

// Canvas stores premultiplied alpha, so a translucent pixel read back can differ by 1 per color channel
// from what putImageData wrote (e.g. 0x5B at alpha 153 reads back as 0x5C). Alpha is exact.
function closeTo(expected: number[]) {
  return (actual: number[]) => actual[3] === expected[3] && actual.slice(0, 3).every((c, i) => Math.abs(c - expected[i]!) <= 1);
}

test('out-of-range overlay on the gray gradient, range 40–60', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'gradient-gray.png');
  await page.getByTestId('overlay-toggle').click();
  await expect(page.getByTestId('overlay-toggle')).toHaveAttribute('aria-pressed', 'true');
  await pressOn(page, 'ctl-range-thumb-0', 'PageUp', 'PageUp', 'PageUp', 'PageUp');
  await pressOn(page, 'ctl-range-thumb-1', 'PageDown', 'PageDown', 'PageDown', 'PageDown');
  await expect(page.getByTestId('ctl-range-thumb-1')).toHaveAttribute('aria-valuenow', '60');
  await swatchHexes(page);

  // Tint: blue below, magenta above, alpha round(0.6 × 255) = 153.
  await expect.poll(async () => closeTo([0x1e, 0x5b, 0xff, 153])(await overlayPixel(page, 70, 32))).toBe(true);
  expect((await overlayPixel(page, 71, 32))[3]).toBe(0);
  expect((await overlayPixel(page, 129, 32))[3]).toBe(0);
  expect(closeTo([0xff, 0x1e, 0xc8, 153])(await overlayPixel(page, 130, 32))).toBe(true);

  // Dim: column 70 has value 39 → gray of round(39 × 0.5) = 20 → #161616.
  await page.getByRole('button', { name: 'Overlay settings' }).click();
  await page.getByTestId('overlay-settings').getByLabel('Dim').check();
  await expect.poll(async () => closeTo([0x16, 0x16, 0x16, 153])(await overlayPixel(page, 70, 32))).toBe(true);

  await page.screenshot({ path: 'artifacts/phase-7/overlay-dim.png', fullPage: true });
});

test('overlay settings persist across a reload', async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'gradient-gray.png');
  await page.getByTestId('overlay-toggle').click();
  await page.reload();
  await loadFixture(page, 'gradient-gray.png');
  await expect(page.getByTestId('overlay-toggle')).toHaveAttribute('aria-pressed', 'true');
});
