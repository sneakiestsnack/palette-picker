import { defineConfig, devices } from '@playwright/test';

const URL = 'http://localhost:4173/palette-picker/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: URL, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: URL,
    reuseExistingServer: false,   // never test a stale build
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', testIgnore: /.*\.phone\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', testMatch: /.*\.phone\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
