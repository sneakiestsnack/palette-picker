import { expect, type Page } from '@playwright/test';

// The base URL has a path (/palette-picker/), so navigate relative to it: './', never '/'.
export async function openApp(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.getByTestId('app-ready')).toBeAttached();
}
