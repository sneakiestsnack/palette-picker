import { expect, test, type Page } from '@playwright/test';
import { loadFixture, openApp, swatchHexes } from './helpers';

async function highlightPixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.getByTestId('highlight-canvas').evaluate(
    (c: HTMLCanvasElement, [px, py]) => Array.from(c.getContext('2d')!.getImageData(px!, py!, 1, 1).data),
    [x, y],
  );
}

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
  await swatchHexes(page);
});

test('proportion bar: six equal segments with percentage labels', async ({ page }) => {
  const bar = page.getByTestId('proportion-bar');
  await expect(bar).toHaveAttribute('data-coverage-settled', 'true');
  const segments = bar.locator('span');
  await expect(segments).toHaveCount(6);
  const widths = await segments.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  for (const w of widths) expect(Math.abs(w - widths[0]!)).toBeLessThanOrEqual(1);
  await expect(segments.first()).toHaveAttribute('aria-label', '#000000 — 17%');
});

test('selecting a swatch highlights where it is; Esc clears it', async ({ page }) => {
  await page.locator('[data-testid="swatch"][data-hex="#FF0000"]').click();
  await expect(page.locator('[data-testid="swatch"][data-hex="#FF0000"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('selection-chip')).toContainText('Showing #FF0000');
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'true');

  // Red stripe center (x 250) stays clear; the black stripe (x 50) is darkened at alpha 191.
  await expect.poll(async () => (await highlightPixel(page, 50, 50))[3]).toBe(191);
  expect((await highlightPixel(page, 250, 50))[3]).toBe(0);
  await page.screenshot({ path: 'artifacts/phase-13/show-where.png', fullPage: true });

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('selection-chip')).toHaveCount(0);
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'false');
  await expect.poll(async () => (await highlightPixel(page, 50, 50))[3]).toBe(0);
});

test('the chip × and Show where toggle both turn the highlight off', async ({ page }) => {
  await page.locator('[data-testid="swatch"][data-hex="#00FF00"]').click();
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'true');
  await page.getByTestId('show-where').click();
  await expect(page.getByTestId('show-where')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'false');
  await page.getByTestId('show-where').click();
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'true');
  await page.getByTestId('selection-chip').getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.getByTestId('highlight-canvas')).toHaveAttribute('data-active', 'false');
});
