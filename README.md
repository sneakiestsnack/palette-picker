# Palette Picker

A private, offline-capable web app that pulls a palette of clearly different colors from any image, made for painting in Clip Studio Paint.

- Give it an image: drop it, paste it (Ctrl+V), browse, or use the phone's camera or photo library.
- It finds the image's most common colors, keeps them clearly different from each other, and limits them to a value (lightness) range you choose.
- Click a swatch to copy its hex code (copied without `#`, which is what Clip Studio Paint's HEX field accepts), or copy them all.
- Export a Photoshop `.aco` swatch file (Clip Studio Paint imports it as a color set) or a PNG swatch card.
- Everything runs on your device. No image ever leaves it, and the app makes no network requests beyond loading its own files.

Installable as an app (PWA) and works offline after the first visit.

## Development

Requires Node 24.

```
npm install          # once
npm run dev          # dev server at http://localhost:5173/palette-picker/
npm run check        # typecheck + unit tests + production build
npm run e2e          # browser tests (Chromium) against the production build
```

`npm run e2e` builds the app and serves it with `vite preview` on port 4173; make sure nothing else is using that port.

Project layout and the full build plan are in `docs/BLUEPRINT.md`; progress is recorded in `BUILD_LOG.md`.

- `src/core/` — pure TypeScript: color math (OKLab), clustering, palette selection, encoders. No DOM, no randomness.
- `src/worker/` — the Web Worker that runs the engine off the main thread.
- `src/platform/` — browser adapters (image decoding, clipboard, files, storage, PWA).
- `src/state/` — app state (a pure reducer) and React glue.
- `src/ui/` — React components.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: it installs dependencies, typechecks, runs the unit tests, builds, and publishes `dist/` to GitHub Pages at `https://<user>.github.io/palette-picker/`.

One-time setup: in the GitHub repository, **Settings → Pages → Source: GitHub Actions**.

The site path comes from the repository name and is set in one place: `BASE` in `vite.config.ts`.
