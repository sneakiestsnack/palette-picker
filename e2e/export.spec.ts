import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { aco } from '../src/core/export/aco';
import { loadFixture, openApp, swatchHexes } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await loadFixture(page, 'stripes-6.png');
});

test('.aco download equals the core encoder output for the displayed palette', async ({ page }) => {
  const hexes = await swatchHexes(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-aco').click()]);
  expect(download.suggestedFilename()).toMatch(/^palette-\d{8}-\d{4}\.aco$/);
  const bytes = readFileSync((await download.path())!);
  expect(Array.from(bytes)).toEqual(Array.from(aco(hexes)));
});

test('PNG card download is 2208×536 for six colors', async ({ page }) => {
  await swatchHexes(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-png').click()]);
  expect(download.suggestedFilename()).toMatch(/^palette-\d{8}-\d{4}\.png$/);
  const bytes = readFileSync((await download.path())!);
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([2208, 536]);
});
