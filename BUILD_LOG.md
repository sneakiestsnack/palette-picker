# Build log

## Phase 0 — Scaffold and prove the verification loop — 2026-10-10
- Built: git repo (`main`), `.gitignore`, `.gitattributes`, first commit of `docs/` + `fixtures/`; `package.json` scripts (§2.2); all five tsconfigs, `vite.config.ts`, `playwright.config.ts`, `index.html`; `src/core/{tuning,types,index,protocol,handleMessage,engine}.ts`; `src/worker/engine.worker.ts`; `src/platform/engineClient.ts` (module-level singleton, `ping()`); `src/main.tsx`, `src/ui/App.tsx` (`worker-status`, `app-ready`); `tests/architecture.test.ts`, `tests/fixtures.test.ts`, `src/core/handleMessage.test.ts`; `e2e/helpers.ts`, `e2e/smoke.spec.ts`.
- Tests: 15 unit (3 files), 1 e2e. `npm run check` and `npm run e2e` green. Build: worker emitted as its own chunk (`engine.worker-*.js`).
- Ban enforcement proven:
  - appended `export const t = document.title;` to `src/core/engine.ts` → `tsc -p tsconfig.core.json` failed with TS2584 "Cannot find name 'document'" → reverted;
  - appended `export const r = Math.random();` → `tests/architecture.test.ts` failed ("src/core/engine.ts: Math.random") → reverted.
- Deviations from blueprint:
  - `package.json` was written by the builder (scripts per §2.2) before `npm init -y` was run; the human's `npm install` commands then added the dependencies to it.
  - `src/core/engine.ts` exists as an empty `PaletteEngine` placeholder so the worker shell has its final A13 shape from Phase 0; Phase 3 fills it in.
- Notes for the human: all 8 fixture hashes verified OK. Installed versions: TypeScript 7.0.2, Vite 8.3.4, Vitest 5.0.3, Playwright 1.64.0, React 19.3.0.

## Phase 1 — Core color math — 2026-10-10
- Built: `src/core/color.ts` (sRGB decode table + encode/`to8`, OKLab forward/inverse, `rgb8ToLab`, `hexToRgb8`, `hexToLab`, `labToHex` with clipping, `valueOfL`, `valueOfHex`, `formatHex`, `parseHex`, `labToLch`, `lchToLab`, `grayHexForValue`); `src/core/distance.ts` (`deltaE`, `weightedDistance`, `varietyFactor`, `hueFactor`). `core/index.ts` exports the C4 color helpers.
- Tests: 68 unit (all A1–A4 vectors incl. HSV trap, hue wraparound, near-gray immunity, clipping, 256-value round trip), 1 e2e.
- Deviations from blueprint: none. (Small extra exports: `clamp01`, `encodeSrgb`, `linearToLab`, `labToLinear`, `hexToRgb8` — later phases need them.)
- Notes for the human: none.

## Phase 2 — Core image operations — 2026-10-10
- Built: `src/core/image.ts`: `scaledSize`, `downsampleBox` (linear-light box filter, alpha rule), `toLabPixels`, `valueMap` (sentinel `TRANSPARENT_VALUE = 255`), `valueHistogram`, `inRangeIndices`. OKLab matrices inlined in the per-pixel loops; no per-pixel allocation.
- Tests: 81 unit (all A5/A6 vectors), 1 e2e.
- Deviations from blueprint: none.
- Notes for the human: none.

## Phase 3 — Palette engine (pure) — 2026-10-10
- Built: `src/core/cluster.ts` (`medianCut` A7, `refine` A8, `buildCandidates` A9); `src/core/select.ts` (`selectPalette` A10, plus `scoreCandidate` helper); `src/core/engine.ts` `PaletteEngine` with `load` (returns `LoadedInfo`: display size, value map, histogram, processing size) and `extract`, candidates cached per `"min-max"` range, LRU 8.
- Tests: 135 unit, 1 e2e. B1 vectors incl. intermediate scores, locked anchor, prefix stability; A9 candidate order for stripes and near-duplicates; engine on synthetic stripes / near-duplicates / transparent-half → exact §6 palettes; empty range; floor + determinism on the seeded perf image (27 size×variety×hue combos + 3 ranges).
- Perf (seeded 300×300, Node 24 on this PC): load + extract **62 ms** (budget 400), cached re-extract with variety changed **0.1 ms** (budget 20).
- Deviations from blueprint: none. `reroll`, `coverage`, `labelMap`, `getProcessing` are left for their phases (11, 13, 16).
- Notes for the human: none.

## Phase 4 — Worker and engine client — 2026-10-10
- Built: `src/core/protocol.ts` (ping/load/extract + `RgbaMsg`, `toRgbaMsg`/`fromRgbaMsg`, `STALE_IMAGE`); `src/core/handleMessage.ts` returning `{ res, transfer }` (value-map buffer transferred; stale `imageId` → `error 'stale-image'`); `src/core/scheduler.ts` `LatestOnlyScheduler` (A19); `src/platform/engineClient.ts`: assigns `imageId`s, transfers display/processing buffers, routes responses by worker `reqId`, extract channel through the scheduler, drops old-image and stale-image responses, `onExtracted`/`onError` subscriptions.
- Tests: 142 unit (A19 vectors; handleMessage load/extract/before-load/stale/explicit-processing), 1 e2e.
- Deviations from blueprint: `onError`'s callback gets an optional second argument `extractionRequest` (so the reducer's `extractionFailed(message, request)` can be dispatched in Phase 6). Additive, compatible with C2. `load()` rejects with `'stale-image'` if a newer load started before it finished.
- Notes for the human: none.

## Phase 5 — App shell and image input (desktop) — 2026-10-10
- Built: `src/state/` (`appState.ts`, `actions.ts`, `reducer.ts`, `AppProvider.tsx`, `useEngine.ts` — ping, decode → `engineClient.load` → `imageLoaded`, stale loads ignored via a sequence counter); `src/platform/decodeImage.ts` per D5 (type/size checks, `<img>.decode()` with EXIF orientation from the browser, `createImageBitmap` for GIF first frame, display-size canvas only, error mapping); `src/ui/theme.css` (§5.4 tokens, light/dark), `App.tsx` (D1 grid, window-level dragover/drop guards), `components/ImageStage.tsx` (drop zone, browse + hidden `file-input` reset after each pick, document paste listener, dropped-URL error, `image-canvas`, `image-status[data-state]`, `error-banner`, name + size caption), `components/Panel.tsx` (empty sections), `strings.ts`.
- Tests: 145 unit, 11 e2e (`input.spec.ts`: all fixtures load; stripes 600×100; orient6 20×40 red on top; GIF first frame red; paste; drop; dropped URL → `ERR_DROPPED_URL`; `.txt` → `ERR_NOT_IMAGE`; 50 MP synthetic → 2048×1600 in **898 ms**).
- Deviations from blueprint:
  - `state.error` stores the error **key** (`ErrorKey`), and the UI maps it to text from `strings.ts`; storing the text would make `state/` import from `ui/`, against the dependency direction.
  - `state.palette` exists in Phase 5 with only `extractionRequest`, since the Phase 5 reducer test requires `imageLoaded` to bump it; Phase 6 adds the remaining palette fields.
  - `DecodeErrorKey` lives in `platform/decodeImage.ts` (state imports it) for the same dependency-direction reason.
  - `worker-status` moved into the header as a small diagnostic label; the worker ping now runs in `useEngine`.
- Notes for the human: screenshot `artifacts/phase-5/desktop-loaded.png`.

## Phase 6 — Controls, swatches, copy (completes M1) — 2026-10-10
- Built: core `sliderLogic.ts` (A21, N handles + `minGap`, `pickStackedByDirection`, `keyTarget`), `sort.ts` (value mode; other modes Phase 14), `paletteOps.ts` (`mergeExtraction`, `copyTextForHex`/`copyTextForAll` using `COPY_PREFIX`/`COPY_ALL_SEPARATOR`), `settings.ts` (A26, all persisted fields); platform `clipboard.ts` (writeText → execCommand fallback → manual-copy dialog in UI), `settingsStore.ts` (try/catch, 300 ms debounce, flushed on `pagehide`/hidden); state Phase 6 fields + `controlsChanged`/`extraction*`/`toast*` actions, `isSettled`, `useEngine` extraction effect + `onExtracted`/`onError` subscriptions, settings load at init and save on change; UI `SliderTrack` (pointer + keyboard, ARIA, 44 px hit area), `Slider`, `RangeSlider` (11-stop gray gradient), `Controls`, `PaletteSection` (swatch grid, Copy all, shortfall/NO_PIXELS notice, delayed `pending` indicator, `data-settled`), `Toast`, `ManualCopyDialog`.
- Tests: 168 unit, 18 e2e (`palette.spec.ts` covers every Phase 6 bullet; the 50 MP test now also checks each quadrant color has a swatch within ΔE 0.02).
- Deviations from blueprint:
  - `state.toast` holds a structured `message` (`copiedOne` / `copiedAll` / `error` key) instead of `text`, so `state/` doesn't import `ui/strings.ts`; the UI formats it.
  - The copy e2e test records the exact string the app passes to `clipboard.writeText` and compares the OS clipboard read-back with `\r\n` normalized: on Windows, `readText()` returns CRLF even though the app writes `\n`.
  - Toast ids come from a module-level counter in `reducer.ts` (ids only need to be unique; StrictMode's double reducer call just skips numbers).
- Notes for the human: screenshot `artifacts/phase-6/desktop-palette.png`. **M1 checkpoint**: run `npm run dev` and try your own images.

## Phase 7 — Out-of-range overlay and value histogram — 2026-10-10
- Built: `src/core/lut.ts` (`packRgba`, `applyLut`, `overlayLut`); state `overlay` + `overlayChanged`, persisted with settings; `useEngine` exposes the display-resolution `valueMap`; `OverlayCanvas` (stacked on the image, same pixel size, `pointer-events: none`, one render per animation frame); `OverlayToolbar` (Out-of-range toggle with `aria-pressed`, settings popover: Tint/Dim, dark/light colors via `<input type="color">` normalized with `parseHex`, Opacity 10–100; closes on outside click/Esc); `Histogram` (101 sqrt-scaled bars, `--text-muted` at 35 %) behind the value-range track.
- Tests: 172 unit (A15 vectors), 21 e2e (`overlay.spec.ts`: tint/dim pixels at row 32 on gradient-gray, range 40–60; overlay setting persists).
- Deviations from blueprint: overlay pixel checks allow ±1 on the R/G/B channels (alpha exact). Chrome's canvas stores premultiplied alpha, so `0x5B` written at alpha 153 reads back as `0x5C`; the LUT itself is checked exactly in unit tests.
- Notes for the human: screenshots `artifacts/phase-7/desktop-overlay.png`, `artifacts/phase-7/overlay-dim.png`.

## Phase 8 — Exports: .aco and PNG card — 2026-10-10
- Built: `src/core/export/aco.ts` (A23, big-endian v1 + v2, names = hex codes), `src/core/export/pngCardLayout.ts` (A22), `src/core/fileNames.ts` (`datePart`, `timestampPart`, `sanitizeFileBase`, `exportFileName`; the M4 name helpers come with the library); `src/platform/renderPngCard.ts` (synchronous canvas draw at 2×, `toDataURL` → bytes via `atob`), `src/platform/saveFile.ts` (anchor download, object URL revoked after 10 s; `nowParts()` reads the local clock); `ExportSection` with "Download .aco" / "Download PNG card" in display order.
- Tests: 183 unit (A23 48- and 88-byte vectors, A22 layouts incl. cell 8, A28 names), 24 e2e (`export.spec.ts`: `.aco` bytes equal `aco(displayed hexes)`; PNG IHDR 2208×536; file names `palette-YYYYMMDD-HHMM.*`).
- Deviations from blueprint: none.
- Notes for the human: sample card `artifacts/phase-8/card.png`. **Human check pending**: import an `.aco` into Clip Studio Paint, and test whether CSP's HEX field accepts a pasted `#FFBE98`.
- Human check result (2026-10-10): `.aco` imports into CSP correctly. CSP's HEX field ignores a pasted `#`, so `COPY_PREFIX` is now `''` (click and Copy all give `91462B`-style codes; swatch labels and toasts still show `#`). Unit + e2e expectations updated. A wrong color the human saw came from pasting into a HEX field that wasn't cleared first (`91462B` became `091462`), not from the app.

## Phase 9 — Phone layout and touch — 2026-10-10
- Built: phone layout below 900 px (single column; 44 px header; image at most 45dvh; panel sections reordered palette → controls → export; 4-column swatch grid; 44 px toolbar/header buttons; safe-area padding); `Controls` disclosure (`controls-toggle`, `phoneControlsOpen` state + `phoneControlsToggled`, persisted, open by default); phone empty state "Choose photo" / "Take photo" with `camera-input` (`capture="environment"`); slider thumbs are now 44 × 44 elements with the 20 px circle drawn inside; `platform/device.ts` (`isIOS`, `isTouchDevice`); `saveFile` share path (iOS any file, or images on touch devices, when `canShare` accepts; `AbortError` ignored; other failures fall back to download); PNG button reads "Save image" on touch devices.
- Tests: 184 unit, 30 e2e (24 desktop + 6 phone: `layout.phone.spec.ts` overflow at Pixel 7 and 360 px, 44 × 44 targets for all 5 slider thumbs and 6 swatches, disclosure collapse/expand + persistence, stripes swatches, tap-to-copy; `screens.phone.spec.ts`).
- Deviations from blueprint: none.
- Notes for the human: screenshots `artifacts/phase-9/phone.png`, `artifacts/phase-9/phone-empty.png`.

## Phase 10 — PWA and deployment (completes M2) — 2026-10-10
- Built: `public/icon.svg` + generated icons (`npx pwa-assets-generator`: favicon.ico, apple-touch-icon-180x180, pwa-64/192/512, maskable-512); `pwa-assets.config.ts`; `VitePWA` per C7 (`registerType: 'prompt'`, `injectRegister: false`, manifest, workbox globs; precache 21 entries incl. the worker chunk); `tsconfig.app.json` types + `vite-plugin-pwa/react`; `index.html` head links with `%BASE_URL%`; `src/platform/pwa.ts` (`useUpdatePrompt` via `useRegisterSW`, `useInstallPrompt` capturing `beforeinstallprompt`, hidden when standalone/installed); header "Install app" button + "A new version is ready. Reload" banner (`update-banner`); little-endian startup check (G #19); `.github/workflows/deploy.yml` (C8); `README.md`.
- Tests: 184 unit, 31 e2e (`pwa.spec.ts`: manifest name + 512 px icon; service worker ready; offline reload shows the app, the worker answers, and stripes still gives six swatches).
- Deviations from blueprint: none. (In the PWA test the page is reloaded once before going offline: with `registerType: 'prompt'` the new service worker controls the page only after a navigation.)
- Lockfile check (G #20): `package-lock.json` already lists `@rolldown/binding-linux-x64-gnu`, so `npm ci` should work in Actions.
- Notes for the human: **M2 checkpoint**: push, enable Pages (Source: GitHub Actions), install on your phone, run the device rows of Appendix E.
- M2 checkpoint (2026-10-10): repo pushed to github.com/sneakiestsnack/palette-picker; Pages source set to GitHub Actions. First deploy run failed at `configure-pages` ("Get Pages site failed") because it ran on push before Pages was enabled; build/typecheck/184 unit tests passed in CI. After a re-run the site is live at https://sneakiestsnack.github.io/palette-picker/ (HTTP 200, manifest served). Human reports it works on their phone so far.
