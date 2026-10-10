/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub repository name: the site is served from https://<user>.github.io/palette-picker/.
// Used in dev too, so base-path bugs show up locally. Change only if the repo is renamed.
const BASE = '/palette-picker/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    environment: 'node',
  },
});
