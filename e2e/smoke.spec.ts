import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('app loads and the worker answers', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'Palette Picker' })).toBeVisible();
  await expect(page.getByTestId('worker-status')).toHaveText('worker: ok');
});
