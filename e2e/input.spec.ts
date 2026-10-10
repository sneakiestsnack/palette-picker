import { expect, test } from '@playwright/test';
import { canvasPixel, canvasSize, fixtureBase64, loadFixture, openApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('every image fixture loads via the file input', async ({ page }) => {
  for (const name of ['stripes-6.png', 'gradient-gray.png', 'transparent-half.png', 'near-duplicates.png', 'animated.gif', 'orient6.jpg']) {
    await loadFixture(page, name);
    await expect(page.getByTestId('image-status')).toContainText(name);
  }
});

test('stripes canvas is 600×100', async ({ page }) => {
  await loadFixture(page, 'stripes-6.png');
  expect(await canvasSize(page)).toEqual([600, 100]);
});

test('orient6.jpg is shown upright (EXIF applied once)', async ({ page }) => {
  await loadFixture(page, 'orient6.jpg');
  expect(await canvasSize(page)).toEqual([20, 40]);
  const top = await canvasPixel(page, 10, 5);
  const bottom = await canvasPixel(page, 10, 35);
  expect(top[0]).toBeGreaterThan(200);
  expect(top[2]).toBeLessThan(60);
  expect(bottom[2]).toBeGreaterThan(200);
  expect(bottom[0]).toBeLessThan(60);
});

test('animated.gif shows its first frame', async ({ page }) => {
  await loadFixture(page, 'animated.gif');
  const px = await canvasPixel(page, 4, 4);
  expect(px[0]).toBeGreaterThan(200);
  expect(px[2]).toBeLessThan(60);
});

test('paste loads an image', async ({ page }) => {
  await page.evaluate((b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'stripes-6.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }, fixtureBase64('stripes-6.png'));
  await expect(page.getByTestId('image-status')).toHaveAttribute('data-state', 'ready');
  expect(await canvasSize(page)).toEqual([600, 100]);
});

test('drop loads an image file', async ({ page }) => {
  await page.getByTestId('drop-zone').evaluate((zone, b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'stripes-6.png', { type: 'image/png' }));
    zone.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, fixtureBase64('stripes-6.png'));
  await expect(page.getByTestId('image-status')).toHaveAttribute('data-state', 'ready');
  expect(await canvasSize(page)).toEqual([600, 100]);
});

test('dropping a link without a file shows ERR_DROPPED_URL', async ({ page }) => {
  await page.getByTestId('drop-zone').evaluate((zone) => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://example.com/cat.jpg');
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByTestId('error-banner')).toHaveText(
    'That was a link, not an image file. Save the image first, or right-click it, choose Copy image, and paste here.',
  );
});

test('a text file shows ERR_NOT_IMAGE', async ({ page }) => {
  await page.getByTestId('file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByTestId('error-banner')).toHaveText(
    "That file isn't an image this app can read. Try JPEG, PNG, WebP or GIF.",
  );
  await expect(page.getByTestId('image-status')).toHaveAttribute('data-state', 'error');
});

test('a 50 MP image loads to 2048×1600 in under 15 s', async ({ page }) => {
  test.setTimeout(90_000);
  // Build the PNG in the page first; the timer covers only the app's loading.
  await page.evaluate(async () => {
    const w = 8000;
    const h = 6250;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    const quads: [string, number, number][] = [['#FF0000', 0, 0], ['#00FF00', w / 2, 0], ['#0000FF', 0, h / 2], ['#FFFF00', w / 2, h / 2]];
    for (const [color, x, y] of quads) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w / 2, h / 2);
    }
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    (window as unknown as { bigFile: File }).bigFile = new File([blob], 'big-50mp.png', { type: 'image/png' });
  });
  const t0 = Date.now();
  await page.getByTestId('file-input').evaluate((input: HTMLInputElement) => {
    const dt = new DataTransfer();
    dt.items.add((window as unknown as { bigFile: File }).bigFile);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('image-status')).toHaveAttribute('data-state', 'ready', { timeout: 15_000 });
  const elapsed = Date.now() - t0;
  console.log(`50 MP load: ${elapsed} ms`);
  expect(elapsed).toBeLessThan(15_000);
  expect(await canvasSize(page)).toEqual([2048, 1600]);
});
