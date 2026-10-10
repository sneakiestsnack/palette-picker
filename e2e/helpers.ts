import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

// The base URL has a path (/palette-picker/), so navigate relative to it: './', never '/'.
export async function openApp(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.getByTestId('app-ready')).toBeAttached();
}

export function fixturePath(name: string): string {
  return fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
}

export function fixtureBase64(name: string): string {
  return readFileSync(fixturePath(name)).toString('base64');
}

export async function loadFixture(page: Page, name: string): Promise<void> {
  await page.getByTestId('file-input').setInputFiles(fixturePath(name));
  await expect(page.getByTestId('image-status')).toHaveAttribute('data-state', 'ready');
}

export async function canvasSize(page: Page): Promise<[number, number]> {
  return page.getByTestId('image-canvas').evaluate((c: HTMLCanvasElement) => [c.width, c.height] as [number, number]);
}

export async function canvasPixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.getByTestId('image-canvas').evaluate(
    (c: HTMLCanvasElement, [px, py]) => Array.from(c.getContext('2d')!.getImageData(px!, py!, 1, 1).data),
    [x, y],
  );
}
