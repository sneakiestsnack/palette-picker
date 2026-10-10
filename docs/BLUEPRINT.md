# Palette Picker — Build Blueprint (for the Builder AI)

**Version:** 1.0 (2026-10-10) · **Target:** static web app / PWA — TypeScript 7 + React 19 + Vite 8, Vitest 5, Playwright 1.64 (Chromium), vite-plugin-pwa 2, deployed to GitHub Pages · **Consumer:** an AI coding agent (Claude Code) with terminal access in `G:\pallette app` on Windows 11, Node 24, Git 2.50.

**Source spec:** `docs/design-doc.md` ("Palette Picker – Design Doc", Draft v0.1, @Sammi). It is background reading only. **This blueprint is self-contained and authoritative**: where it decides something the spec left open, or resolves a conflict in the spec, that decision is final and is listed in §1.2. Do not go back to the design doc to re-decide anything.

**How to read this document.** §0 is for the human. §1–§6 are the context you need before any code: decisions, working rules, architecture, conventions, data model, fixtures. §7 is the build sequence, Phases 0–20, grouped into milestones M1–M4. The appendices hold the exact algorithms with **mandatory test vectors** (Appendix A), worked examples (B), contracts (C), UI spec (D), the acceptance checklist (E), deferred-feature hooks (F), environment gotchas (G) and backup fixture data (H). When a phase says "per A7", open Appendix A §A7 and implement exactly that.

---

## 0. For the human — one-time setup

Do these yourself; the builder must not install software, create accounts or change system settings.

### 0.1 Before Phase 0

1. **Check the tools** (already present on this PC as of 2026-10-10: Node v24.18.0, npm 11.16.0, Git 2.50.0). If Git doesn't know who you are yet, run once:
   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
2. **Install the project dependencies.** Open PowerShell and run these one at a time (the folder name has a space, so keep the quotes). `npm init -y` creates `package.json`; it won't touch the `docs/` and `fixtures/` folders that are already there.
   ```
   cd "G:\pallette app"
   npm init -y
   npm install react@^19.3 react-dom@^19.3 idb@^8
   npm install -D typescript@^7 vite@^8 @vitejs/plugin-react@^6 vitest@^5 jsdom@^30 @testing-library/react@^16 @testing-library/dom @testing-library/user-event @types/react@^19 @types/react-dom@^19 @types/node@^24 vite-plugin-pwa@^2 workbox-window@^7 @vite-pwa/assets-generator@^2 @playwright/test@^1.64 fake-indexeddb@^6
   npx playwright install chromium
   ```
   If npm prints an `ERESOLVE` peer-dependency error, don't use `--force`; tell the builder the exact message and it will pick compatible versions with you. The `G:` drive is a USB hard disk, so installs take a few minutes.
3. **Create the GitHub repository** (needed by Phase 10; doing it now is fine): on github.com create a **public** repository named **`palette-picker`** with no README, .gitignore or license (the builder creates those). Free GitHub Pages needs a public repo. If you choose a different name, tell the builder: the name becomes the site's path (`https://<you>.github.io/palette-picker/`) and is set in exactly one place (`vite.config.ts`).
4. **Start the builder:** open Claude Code in `G:\pallette app`, and give it this file: *"Read docs/BLUEPRINT.md and start at Phase 0."*

### 0.2 Where the builder will stop and wait for you

| When | What you do |
|---|---|
| End of Phase 6 (M1 done) | Run `npm run dev`, open the URL it prints, try your own images (paste, drag, sliders, click to copy). Reply "continue" or describe problems. |
| Phase 8 | Import the downloaded `.aco` into Clip Studio Paint (Color Set palette → menu → *Import color set…*, or drag the file onto the palette). Also paste a copied hex code such as `#FFBE98` into the HEX field of CSP's *Color Settings* dialog and say whether the `#` was accepted. |
| Phase 10 (M2 done) | Push to GitHub (`git remote add origin https://github.com/<you>/palette-picker.git` then `git push -u origin main`); in the repo go to **Settings → Pages → Source: GitHub Actions**. When the Action finishes, open the site on your phone, install it (iPhone: Share → *Add to Home Screen*; Android: menu → *Install app*), and run the "device" rows of Appendix E. |
| End of Phase 14 (M3 done) | Push; try locks, re-roll, eyedropper, show-where, sorting on PC and phone. |
| Phase 19 | Import the downloaded `.cls` into Clip Studio Paint (both the menu import and drag-and-drop). |
| End of Phase 20 (M4 done) | Push; run the full Appendix E checklist, including saving on the phone, exporting a palette file, and importing it on the PC. |

### 0.3 Test images to collect (any time before Phase 10)

Put these in `G:\pallette app\fixtures\manual\` (that folder is git-ignored, so private photos never get committed):
- a normal phone photo (from an iPhone it can be `.heic`), and a full-size one around 48–50 megapixels if your phone can take them;
- an animated GIF; a PNG with a transparent background;
- a sunset or other colorful scene, and a moody low-key image (for the value-range use case).

---

## 1. Mission & locked decisions

### 1.1 Mission

Build **Palette Picker**, a private, offline-capable web app for a digital artist working mainly in Clip Studio Paint (CSP). The user gives it an image (drop, browse, paste, phone camera/library). The app pulls out a palette of the image's most common colors, keeps those colors clearly different from each other, and limits them to a chosen value (lightness) range. The palette is shown as large swatches that can be clicked to copy hex codes, and can be exported as a Photoshop `.aco` swatch file, a PNG swatch card, or (M4) CSP's own `.cls` color set. Later milestones add locking and re-rolling, an eyedropper, coverage views, sorting, an on-device saved library with portable palette files, a value-study view, and harmony suggestions. Everything runs on the user's device; no image ever leaves it.

The deliverable at each milestone is a working build that passes `npm run check` and `npm run e2e` and satisfies its rows of the verification matrix (Appendix E). It is deployed to GitHub Pages from M2 onwards.

### 1.2 Decisions already made — do NOT re-open

| Topic | Decision |
|---|---|
| Scope | Milestones M1–M4 are all specified here and are built in order (Phases 0–20). |
| Not built | Manual swatch editing (seam only, Appendix F), paint-mixing hints (parked), accounts/sync/sharing, image editing, animated-GIF playback (first frame only), Web Share Target / file handlers, any server. |
| Platform | Static single-page web app + PWA. No backend; at runtime the app makes no network requests except loading its own files. No analytics, no CDNs, no web fonts (system fonts only). |
| Stack | TypeScript 7, React 19 (function components + hooks), Vite 8, plain CSS Modules (`*.module.css`) with CSS custom properties. Runtime dependencies: `react`, `react-dom`, `idb` (M4), `workbox-window` (pulled in by the PWA plugin). **No other runtime libraries**: no UI kit, no state library, no color library. The color math is ours and covered by tests. |
| Testing | Vitest 5 for logic (Node environment; `jsdom` only for the few component tests). Playwright for browser tests, **Chromium only**, run against the production build (`vite preview`). |
| Lint | No ESLint (typescript-eslint doesn't support TS 7). Architecture rules are enforced by a separate tsconfig for the core plus an architecture test (§3.2). |
| Hosting | GitHub Pages via GitHub Actions; repo `palette-picker`; Vite `base: '/palette-picker/'` in dev **and** prod, so path bugs show up locally. |
| Routing | No URL paths. The Picker/Library switch (M4) uses the hash `#/library` (empty hash = Picker), which GitHub Pages can't 404. |
| Color pipeline | Input pixels are 8-bit sRGB from a 2D canvas (wide-gamut photos are converted to sRGB by the canvas). All color math happens in **OKLab/OKLCH**. Hex codes are sRGB. |
| "Value" | `value = clamp(round(OKLab L × 100), 0, 100)` as an integer. **One function** (`valueOfL`), used by the value slider, the pixel filter, the overlay, the histogram, the notan view and everything else. Never HSV V or HSL L. |
| Palette size | 2–16, default 6. |
| Variety | Slider 0–100, default 50; `v = slider / 100`. |
| Hue weight | Slider 0–100, default 35; `h = 0.1 + 0.9 × slider / 100` (so `h` runs 0.1–1.0, default 0.415). It scales only the hue part of the color distance. |
| Value range | Two integers 0–100, inclusive, default 0–100, `min ≤ max` (equal allowed). |
| Distinctness | Hard floor: no two colors in an extracted palette are closer than `MIN_DISTINCT_DE = 0.04` (plain OKLab ΔE), at every slider setting. If the image or range can't supply enough distinct colors, the palette is **shorter** and a notice says so. Locked and eyedropper colors obey the same floor (A12). |
| Algorithm | Median cut (48 boxes) → 4 Lloyd/k-means passes → candidates ≥ 0.2 % of in-range pixels → greedy pick with score `share^(1−v) × D^v`, where `D` = min hue-weighted distance to colors already chosen (A7–A10). Fully deterministic: **no randomness anywhere**, re-roll included. |
| Processing size | The pipeline downsamples to ≤ 300 px on the longest edge (box filter in linear light). Display canvas ≤ 2048 px; show-where label map ≤ 800 px. |
| Transparency | Pixels with alpha < 128 are ignored everywhere (palette, histogram, overlay, coverage). |
| Swatch order | Displayed dark → light (value ascending) through M2; M3 adds a Sort menu (Value / Hue / Saturation / Frequency), default Value. |
| Copy | Click a swatch → copies `#RRGGBB` (uppercase). "Copy all" → codes in display order, one per line (`\n`), no trailing newline. The `#` prefix is one constant (`COPY_PREFIX`), flipped to `''` if the human finds CSP rejects it (Phase 8). |
| Exports | `.aco` (Photoshop swatches, version 1 + version 2 sections, big-endian, names = hex codes); PNG swatch card (white background, hex labels, 2× scale); `.cls` in M4 (little-endian, reverse-engineered format, byte-exact vectors). |
| Phone → PC (MVP) | Through the `.aco` / PNG downloads (moved however the user likes). The library and palette files come in M4. |
| Saved library (M4) | IndexedDB on the device. Each saved palette stores colors (with lock state), control settings, sort mode, name, tags, a 160 px JPEG thumbnail, **and a reduced copy of the image**: the exact 300 px processing image as PNG plus a ≤ 1280 px JPEG (q 0.85) for display. Reopening restores everything and stays fully editable. |
| Palette file (M4) | JSON, extension `.palette.json`, schema v1 (Appendix C §C6); holds one or many palettes with base64 images. Import merges by `id`; the newer `updatedAt` wins; nothing is ever deleted by an import. |
| Locks (M3) | Locked colors persist across slider changes, act as fixed anchors in selection, and ignore the value range. The palette size can't go below the number of locked colors (the size slider's minimum follows it). Locking or unlocking never triggers re-extraction. |
| Re-roll (M3) | Deterministic "show me different ones": excludes the candidates currently shown unlocked, cycling back when it runs out (A11). Exclusions reset on any slider change or new image. |
| Eyedropper (M3) | Samples one exact pixel of the display image. The picked color is added as a **locked** entry (rules in A12). Desktop: click while in eyedropper mode. Touch: press-and-hold shows a magnifier loupe; release picks. |
| Show-where & proportions (M3) | Each in-range pixel is assigned to its nearest palette color (plain ΔE). The proportion bar shows those shares; show-where highlights the pixels of the selected swatch. Both use the same assignment (A14). |
| Selection (M3) | Clicking a swatch copies it **and** selects it. Esc, clicking the image, or the chip's × clears the selection. |
| Value study (M4) | View switcher: Color / Gray / Notan. Gray = each pixel's value as a neutral gray (101 levels). Notan = 2–5 bands; thresholds default to evenly spaced points between the 2nd and 98th percentile of image values and can be adjusted on a multi-handle slider (A16). |
| Harmony (M4) | Complementary accent (opposite of the palette's weighted mean hue) and warmer/cooler versions (hues rotated 12° toward 60°/250°, neutrals tinted). Gamut-mapped by reducing chroma (A17–A18). Applying makes entries locked, with one-level Undo. |
| UI theme | Neutral grays only (no colored chrome near swatches, since colored UI skews color judgement); follows the system light/dark setting. Overlay tints are the only saturated UI colors. |
| Persistence of prefs | `localStorage` key `palette-picker:settings:v1`: controls, overlay settings, sort, view, notan bands, phone-controls-open. Never images or palettes. |
| PWA updates | `registerType: 'prompt'`: an "Update available — Reload" banner. Never auto-reload, which would wipe the user's current image. |
| Browsers | Current Chrome/Edge/Firefox on desktop; Safari 17+ on macOS/iOS; Chrome on Android. |
| Language | English UI; all user-visible strings in `src/ui/strings.ts`. |

### 1.3 Spec conflicts and how they were resolved (for your understanding)

- **.cls timing.** The spec lists `.cls` in the MVP features as a "stretch goal" but the milestones put it in M4. Resolved: **M4** (Phase 19).
- **Use case 2 vs MVP.** "Make a palette on the phone, use it later at the PC" needs the library, which is M4. Resolved: in the MVP the `.aco`/PNG downloads carry it; M4 adds the library and palette files.
- **"Never five near-identical colors" vs Variety at its lowest.** At Variety 0, pure frequency would return near-duplicates. Resolved: a hard distinctness floor at every setting; return fewer colors rather than duplicates.
- **Manual swatch editing** appears in the feature table but in no milestone. Resolved: not built; seam kept.

---

## 2. Working protocol (builder: read this twice)

### 2.1 The loop
For every change: **edit → `npm run typecheck` → read every error → fix → run the relevant tests → continue.** Work in small batches (one module, or one component and its test) and verify each before starting the next; never stack several untested features. If a command fails, read the full output before changing anything. A green test you haven't actually run is not a green test.

### 2.2 Commands (exact `package.json` scripts)

```json
{
  "name": "palette-picker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc -p tsconfig.app.json && tsc -p tsconfig.core.json && tsc -p tsconfig.worker.json && tsc -p tsconfig.node.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "vite build",
    "preview": "vite preview --port 4173 --strictPort",
    "e2e": "playwright test",
    "check": "npm run typecheck && npm run test && npm run build"
  }
}
```
(Keep the `dependencies`/`devDependencies` that `npm install` wrote; replace everything else in `package.json` with the above.)

- **Gate command:** `npm run check` and `npm run e2e` must both pass at every gate, from Phase 0 on.
- Run a single test file with `npx vitest run src/core/color.test.ts`, and a single e2e spec with `npx playwright test e2e/input.spec.ts`.
- **Fallback verifier:** if Playwright's `webServer` fails to start, run `npm run build` and then `npm run preview` in a separate terminal, and run Playwright with `reuseExistingServer` temporarily `true` **only for that session** (log it). Never leave a stale preview server running: the e2e config uses `reuseExistingServer: false`, so a leftover server makes the run fail loudly instead of silently testing an old build.

### 2.3 Version control
- Phase 0 runs `git init -b main`, writes `.gitignore` and `.gitattributes` exactly as below, and commits `docs/` and `fixtures/` first.
- **Commit at every gate**, with message `phase N: <short summary>`. Commit more often within a phase if useful. Tag milestone ends: `git tag m1`, `m2`, `m3`, `m4`.
- Never rewrite history (`--amend` on pushed commits, `rebase`, `reset --hard` on committed work, `push --force`). To undo, make a new commit or check out the last good gate.
- **Don't push** unless the human has said to in this session; the human pushes at milestone checkpoints (§0.2).

`.gitignore`:
```
node_modules/
dist/
dev-dist/
coverage/
artifacts/
test-results/
playwright-report/
blob-report/
fixtures/manual/
*.log
.vite/
.DS_Store
Thumbs.db
```

`.gitattributes` (binary fixtures **must** be protected from CRLF conversion, or byte-exact tests break on Windows):
```
* text=auto eol=lf
*.png binary
*.jpg binary
*.gif binary
*.ico binary
*.cls binary
*.aco binary
```

### 2.4 BUILD_LOG.md
Create `BUILD_LOG.md` in Phase 0. Append one entry per phase:
```
## Phase N — <name> — <date>
- Built: <files / behavior>
- Tests: <unit count passing> unit, <e2e count passing> e2e
- Deviations from blueprint: <none | what, why, smallest-change reasoning>
- Notes for the human: <anything they should look at; screenshot paths>
```
If the blueprint conflicts with reality (an API behaves differently, a test vector seems wrong), **first re-check your implementation against the appendix**. The vectors were verified with a reference implementation. If reality truly differs, take the smallest deviation that preserves the intent, and log it. Never silently redesign.

### 2.5 Stop and ask the human when…
- a dependency is missing or you believe a new one is needed (you may not run `npm install <pkg>`; you may run `npm ci`/`npm install` with no package name if `node_modules` is broken);
- a test vector in this blueprint fails after you've checked your code twice against the appendix;
- a step needs an account, a credential, a push, a GitHub setting, or a real phone/CSP;
- you reach a checkpoint in §0.2.

### 2.6 Screenshots for async review
From Phase 5 on, each gate's e2e run saves screenshots to `artifacts/phase-N/*.png` (git-ignored) using `page.screenshot({ path, fullPage: true })` in a dedicated `e2e/screens.spec.ts` that grows phase by phase. List the paths in the BUILD_LOG entry.

### 2.7 Windows specifics
- The project path contains a space: always quote it (`"G:\pallette app"`). Never write absolute paths into any config or source file; the drive letter of a USB disk can change.
- Your PowerShell is 5.1, which has no `&&` (use `;` or the Bash tool). npm scripts run under `cmd`, where `&&` works, so the scripts above are fine.
- Author everything from code. There are no GUI steps for you in this project.

---

## 3. Architecture contract

### 3.1 The load-bearing split

```
 ui/ (React components)  ──►  state/ (reducer + hooks)  ──►  platform/ (browser adapters, engine client)
                                     │                                    │ postMessage
                                     ▼                                    ▼
                               core/ (pure TypeScript)  ◄──────  worker/engine.worker.ts (5-line shell)
```

- **`src/core/` — pure logic.** Color math, image operations on plain typed arrays, clustering, selection, re-roll, coverage, lookup tables (LUTs), sorting, slider math, settings parsing, file encoders (`.aco`, `.cls`, palette JSON), base64/UTF-8, library helpers, harmony, notan, the `PaletteEngine` class, the worker message handler, and the request scheduler. Everything that has a "right answer" lives here, because here it can be tested in milliseconds under Node with exact vectors.
- **`src/worker/engine.worker.ts`** creates one `PaletteEngine` and forwards messages to `core/handleMessage.ts`. Nothing else. The heavy work runs off the main thread so sliders stay smooth.
- **`src/platform/`** — thin adapters to browser APIs: image decoding (img/canvas), the engine client (worker + scheduler), clipboard, file saving/sharing, PNG card rendering, settings storage, device detection, the IndexedDB repository (M4), and PWA hooks. Keep logic out of here: if an adapter needs a calculation, the calculation goes in core and the adapter calls it.
- **`src/state/`** — the app state type, a **pure reducer** (unit-tested), and React glue (`AppProvider`, `useEngine`) that turns state changes into engine requests and engine responses into actions.
- **`src/ui/`** — React components. They render state and dispatch actions. They do no color math (they call core helpers such as `formatHex` and `sortEntries`).

**Why:** the palette logic is the product. Isolating it gives fast, deterministic tests with exact expected values, lets the worker reuse it unchanged, and keeps React re-render subtleties away from correctness.

### 3.2 Bans and how they're enforced

| Ban (in `src/core/`) | Reason | Enforcement |
|---|---|---|
| No DOM / Web APIs (`document`, `window`, `HTMLCanvasElement`, `ImageData`, `TextEncoder`, `atob`/`btoa`, `crypto`, `localStorage`, `indexedDB`, `fetch`) | Core must run in Node tests and in the worker | `tsconfig.core.json` compiles `src/core/**` with `"lib": ["ES2022"]` and `"types": []`, so any DOM reference is a type error. Use the core's own `RgbaImage` type instead of `ImageData`, and the core's `utf8.ts`/`base64.ts`. |
| No imports from outside `src/core/` and no package imports | Keeps the dependency direction one-way | `tests/architecture.test.ts` scans every `src/core/**/*.ts` (non-test) file: every `import … from '<spec>'` must start with `./` or `../` and resolve inside `src/core/`. |
| No `Math.random`, `Date.now`, `new Date`, `performance.now` | Determinism: the same input must always give the same palette, so tests can assert exact hexes | The same architecture test fails on these substrings in non-test core files. Callers pass time in (`now: string`) when a timestamp is needed. |
| No `async`/Promises | Core is synchronous computation; asynchrony belongs to platform/state | Architecture test fails on `async ` / `Promise` in non-test core files. |
| No React in core or worker; no color math in `ui/` | Keep layers honest | The architecture test also fails if any file in `src/ui/` or `src/state/` imports a core module other than `src/core/index.ts` (its exports are listed in Appendix C §C4). `src/platform/` may import core modules directly. |

Prove the enforcement works once in Phase 0: temporarily add `document.title` to a core file, confirm `npm run typecheck` fails, revert, and note it in the BUILD_LOG.

### 3.3 Folder layout (final state; files appear phase by phase)

```
G:\pallette app\
├─ docs/                BLUEPRINT.md (this), design-doc.md
├─ fixtures/            stripes-6.png, gradient-gray.png, transparent-half.png, near-duplicates.png,
│                       animated.gif, orient6.jpg, cls/AABBCC.cls, cls/unicode.cls, cls/SOURCE.md + license,
│                       SHA256SUMS.txt, manual/ (git-ignored, human's photos)
├─ public/              icon.svg + generated icons (Phase 10)
├─ src/
│  ├─ core/             index.ts (public surface for ui/), tuning.ts, types.ts, color.ts, distance.ts,
│  │                    image.ts, cluster.ts, select.ts, reroll.ts, engine.ts, protocol.ts, handleMessage.ts,
│  │                    scheduler.ts, sliderLogic.ts, settings.ts, paletteOps.ts, lut.ts, fileNames.ts,
│  │                    coverage.ts, sort.ts, geometry.ts, notan.ts, gamut.ts, harmony.ts, base64.ts,
│  │                    utf8.ts, library.ts, paletteFile.ts,
│  │                    export/aco.ts, export/cls.ts, export/pngCardLayout.ts
│  │                    (+ colocated *.test.ts)
│  ├─ worker/           engine.worker.ts
│  ├─ platform/         engineClient.ts, decodeImage.ts, clipboard.ts, saveFile.ts, renderPngCard.ts,
│  │                    settingsStore.ts, device.ts, pwa.ts, libraryRepo.ts (+ libraryRepo.test.ts)
│  ├─ state/            appState.ts, actions.ts, reducer.ts (+ reducer.test.ts), AppProvider.tsx, useEngine.ts
│  ├─ ui/               App.tsx, strings.ts, theme.css, components/*.tsx + *.module.css
│  └─ main.tsx
├─ tests/               architecture.test.ts, fixtures.test.ts
├─ e2e/                 helpers.ts, *.spec.ts (desktop), *.phone.spec.ts (phone), screens.spec.ts
├─ .github/workflows/deploy.yml
├─ index.html, vite.config.ts, playwright.config.ts, pwa-assets.config.ts
├─ tsconfig.base.json, tsconfig.app.json, tsconfig.core.json, tsconfig.worker.json, tsconfig.node.json
├─ package.json, package-lock.json, .gitignore, .gitattributes, BUILD_LOG.md, README.md
```

Dependency direction: `ui → state → platform → core`; `worker → core`; `core →` nothing outside itself.

### 3.4 Data flow

1. **Image in:** the user drops, pastes or picks a file → `platform/decodeImage` → display canvas (≤ 2048 px) plus its RGBA pixels → `engineClient.load(display)` (the buffer is transferred to the worker) → the worker computes the processing image (≤ 300 px), OKLab pixels, the value map (display resolution, 1 byte per pixel) and the histogram → `loaded` response → reducer `imageLoaded` → an extraction is requested.
2. **Controls:** slider input → reducer `controlsChanged` (increments `extractionRequest`) → `useEngine` sees the counter change → `engineClient.extract(params)` through the latest-only scheduler → `extracted` → reducer `extractionSucceeded` → `mergeExtraction` (A12) → UI re-renders.
3. **Overlay / views** are drawn on the main thread from the value map with a 256-entry lookup table (A15): fast enough for live dragging, and no worker round trip.
4. **Coverage, label map (M3) and processing-image fetch (M4)** are further worker channels (Appendix C §C1).

Extraction is triggered **only** by `imageLoaded`, `controlsChanged`, `rerollRequested`, and an `entryRemoved` that leaves the palette below its size (A12). `paletteOpened` restores the saved colors exactly, without extracting; the next control change extracts as usual. Lock toggles, eyedropper picks, selection, sorting, view and overlay changes never re-extract.

### 3.5 Concurrency: latest-only scheduling

Dragging a slider fires dozens of requests per second. The engine client uses one `LatestOnlyScheduler` per channel (`extract`, `coverage`, `labelMap`), specified in A19. In short: **at most one request in flight per channel; a newer request replaces any queued one; every in-flight response is delivered (results arrive in order, each one newer than the last), and then the queued request is sent.** Every response also carries `imageId`; responses for an old image are dropped. This gives live updates while dragging and guarantees the final state matches the final slider position.

### 3.6 Determinism
No randomness in the product. Sorting uses explicit, total tie-breakers everywhere (each algorithm says which). JavaScript's `Array.prototype.sort` is stable; rely on it only together with full comparators. Floating-point results can differ in the last bit between browser engines; tests compare floats with `toBeCloseTo(x, 4)` and compare **hex strings** exactly.

---

## 4. Conventions (single source of truth; deviations are bugs)

- **Hex:** type `Hex` is a string matching `/^#[0-9A-F]{6}$/`, always uppercase with leading `#`. Produced only by `formatHex(r,g,b)`; parsed only by `parseHex(s)` (accepts an optional `#`, either case, exactly 6 hex digits; anything else returns `null`). Zero-pad each channel: rgb(0,15,10) → `#000F0A`.
- **Color tuples:** `Rgb8 = readonly [r, g, b]`, integers 0–255. `Lab = readonly [L, a, b]` (OKLab floats; L in 0–1). `Lch = readonly [L, C, h]` (OKLCH; C ≥ 0; h in degrees, in [0, 360)). Hot loops use `Float64Array` with interleaved `L,a,b` per pixel.
- **The swatch's color is its Hex.** Once a candidate is turned into a hex (with clipping), all later distances, values, exports and comparisons use `hexToLab(hex)`, not the unclipped centroid. What you see is what you measure.
- **Value:** `valueOfL(L) = min(100, max(0, Math.round(L * 100)))`. In range ⇔ `min ≤ value ≤ max` (both inclusive). Transparent pixels have no value (sentinel `255` in value maps).
- **Rounding:** `Math.round` rounds half up for positive numbers; that's what we want for every 8-bit and integer conversion here, and every rounded quantity is non-negative. Never use `toFixed` to round a number that goes into a hex or an integer value.
- **8-bit encode:** `byte = Math.round(clamp01(encodeSrgb(linear)) * 255)`. Always clamp *before* scaling: an averaged OKLab color can be slightly out of gamut, and without the clamp you get values like 256 or −1 and a broken hex.
- **Slider units in state:** integers 0–100 (size: 2–16). Converted to factors only by `varietyFactor(s) = s / 100` and `hueFactor(s) = 0.1 + 0.9 * s / 100` in `core/distance.ts`.
- **Image coordinates:** origin top-left, x right, y down; pixel index `i = y * width + x`; RGBA interleaved, 4 bytes per pixel.
- **Image resolutions (four tiers):**

  | Tier | Max longest edge | Made by | Used for |
  |---|---|---|---|
  | Original | (whatever the file is; up to 80 MP accepted) | the browser's decoder | never read into JS arrays at full size |
  | Display | `DISPLAY_MAX_EDGE` = 2048 | canvas `drawImage` (browser resampling, quality "high") | on-screen image, eyedropper, value map, overlay, gray/notan views |
  | Mask | `MASK_MAX_EDGE` = 800 | `downsampleBox` from display (core) | show-where label map |
  | Processing | `PROCESS_MAX_EDGE` = 300 | `downsampleBox` from display (core) | palette extraction, histogram, coverage, notan percentiles |

  Scaling rule (`scaledSize`): `s = min(1, maxEdge / max(w, h))`; `newW = max(1, round(w × s))`, `newH = max(1, round(h × s))`. Never upscale.
- **Alpha:** a pixel is *opaque* if `alpha ≥ 128`. Only opaque pixels count, anywhere.
- **Entry identity:** within a palette, hexes are unique (the distinctness floor guarantees it), so `hex` is the React key and the identity used for lock, select and remove.
- **Selection order vs display order:** `entries` in state are kept in *selection order* (locked first, in the order they were locked or added; then extracted picks in pick order). The UI shows `sortEntries(entries, sortMode, coverage)` (A20). "Last picked" means the last unlocked entry in `entries`.
- **Strings:** all user-visible text is in `src/ui/strings.ts` (Appendix D §D8).
- **CSS:** CSS Modules per component; theme tokens as CSS custom properties in `src/ui/theme.css` (§5.4). Touch targets ≥ 44 × 44 CSS px on phone layouts.
- **Test IDs:** stable `data-testid` attributes listed in Appendix C §C5; e2e tests select only by these or by ARIA role/name.
- **File naming:** core modules `camelCase.ts`; React components `PascalCase.tsx`; tests next to their module as `*.test.ts(x)`; Playwright specs in `e2e/`.

---

## 5. Data model & tuning

### 5.1 Core types (`src/core/types.ts`)

```ts
export type Hex = string;                                  // /^#[0-9A-F]{6}$/
export type Rgb8 = readonly [r: number, g: number, b: number];
export type Lab = readonly [L: number, a: number, b: number];
export type Lch = readonly [L: number, C: number, h: number];

export interface RgbaImage {                               // replaces DOM ImageData inside core
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;                        // RGBA, row-major, length = width*height*4
}

export interface ValueRange { readonly min: number; readonly max: number }   // ints 0..100, min <= max

export interface Controls {
  readonly size: number;        // 2..16
  readonly variety: number;     // 0..100
  readonly hueWeight: number;   // 0..100
  readonly valueRange: ValueRange;
}

export interface LabPixels {                               // opaque processing pixels only
  readonly count: number;
  readonly lab: Float64Array;                              // 3*count, interleaved L,a,b
  readonly value: Uint8Array;                              // count, 0..100
}

export interface Candidate {
  readonly index: number;                                  // position after the A9 sort
  readonly hex: Hex;
  readonly lab: Lab;                                       // = hexToLab(hex)
  readonly value: number;
  readonly count: number;
  readonly share: number;                                  // count / inRangePixelCount
}

export interface ExtractParams {
  readonly controls: Controls;
  readonly locked: readonly Hex[];                         // [] until M3
  readonly excluded: readonly number[];                    // candidate indexes; [] until M3
}

export interface Pick { readonly hex: Hex; readonly candidateIndex: number }

export interface ExtractResult {
  readonly picks: readonly Pick[];                         // selection order, excludes locked
  readonly shortfall: boolean;                             // picks.length < size - locked.length
  readonly inRangePixelCount: number;
  readonly candidateCount: number;
}

export type EntryOrigin = 'extracted' | 'eyedropper' | 'harmony';
export interface PaletteEntry {
  readonly hex: Hex;
  readonly locked: boolean;
  readonly origin: EntryOrigin;
  readonly candidateIndex: number | null;                  // null unless origin 'extracted' and fresh
}

export type SortMode = 'value' | 'hue' | 'saturation' | 'frequency';
export type ViewMode = 'color' | 'gray' | 'notan';
export interface OverlaySettings {
  readonly enabled: boolean;
  readonly mode: 'tint' | 'dim';
  readonly darkTint: Hex;
  readonly lightTint: Hex;
  readonly opacity: number;                                // 10..100 (percent)
}
```

### 5.2 App state (`src/state/appState.ts`)

Fields are tagged with the phase that introduces them. Add each field in its phase, not before.

```ts
export interface AppState {
  // Phase 5
  image: null | {
    imageId: number; name: string;
    width: number; height: number;                         // display canvas size
    originalWidth: number; originalHeight: number;
    histogram: number[];                                   // 101 bins, opaque processing pixels
    processingWidth: number; processingHeight: number;
  };
  loading: boolean;
  error: string | null;                                    // a strings.ts message
  // Phase 6
  controls: Controls;
  palette: {
    entries: PaletteEntry[];
    shortfall: boolean;
    pending: boolean;                                      // an extraction is in flight
    extractionRequest: number;                             // bump to request extraction
    appliedRequest: number;                                // extractionRequest of the last applied result
  };                                                       // "settled" ⇔ !pending && appliedRequest === extractionRequest
  toast: null | { id: number; text: string; undo?: boolean };
  // Phase 7
  overlay: OverlaySettings;
  // Phase 9
  phoneControlsOpen: boolean;
  // Phase 11
  excluded: number[];                                      // re-roll exclusions
  // Phase 12
  eyedropper: boolean;
  // Phase 13
  selectedHex: Hex | null;
  showWhere: boolean;                                      // default true
  coverage: null | { palette: Hex[]; shares: number[] };
  // Phase 14
  sortMode: SortMode;
  // Phase 16
  route: 'picker' | 'library';
  saved: null | { id: string; name: string; tags: string[]; createdAt: string; dirty: boolean };
  // Phase 18
  view: ViewMode;
  notan: { bands: number; thresholds: number[] | null };   // null = automatic (A16)
  // Phase 20
  undo: null | { entries: PaletteEntry[]; size: number; label: string };
}
```

The action list and reducer rules are in Appendix C §C3.

### 5.3 The one tuning file (`src/core/tuning.ts`)

Every number and default below lives **only** here. No other file hardcodes a tunable; derived values go through named functions.

| Constant | Value | Meaning |
|---|---|---|
| `PALETTE_SIZE_MIN` / `MAX` / `DEFAULT` | 2 / 16 / 6 | palette size |
| `VARIETY_DEFAULT` | 50 | slider units |
| `HUE_WEIGHT_DEFAULT` | 35 | slider units → factor 0.415 |
| `HUE_WEIGHT_MIN_FACTOR` | 0.1 | `hueFactor(0)` |
| `VALUE_RANGE_DEFAULT` | `{min: 0, max: 100}` | |
| `MIN_DISTINCT_DE` | 0.04 | plain OKLab ΔE floor between palette colors |
| `CANDIDATE_COUNT` | 48 | median-cut boxes |
| `KMEANS_ITERATIONS` | 4 | Lloyd refinement passes |
| `MIN_CANDIDATE_SHARE` | 0.002 | candidates below 0.2 % of in-range pixels are dropped |
| `ALPHA_OPAQUE_MIN` | 128 | |
| `PROCESS_MAX_EDGE` / `MASK_MAX_EDGE` / `DISPLAY_MAX_EDGE` | 300 / 800 / 2048 | px, longest edge |
| `MAX_INPUT_PIXELS` | 80_000_000 | larger originals are rejected |
| `MAX_INPUT_BYTES` | 104_857_600 | 100 MB |
| `ACHROMATIC_C` | 0.02 | OKLCH chroma below which hue is meaningless |
| `HISTOGRAM_BINS` | 101 | one per value 0..100 |
| `OVERLAY_DEFAULT` | `{enabled: false, mode: 'tint', darkTint: '#1E5BFF', lightTint: '#FF1EC8', opacity: 60}` | blue below min, magenta above max |
| `OVERLAY_DIM_FACTOR` | 0.5 | dim mode: gray of `round(value × 0.5)` |
| `SHOW_WHERE_DIM_ALPHA` | 191 | 0–255; non-matching pixels are darkened with black at 75 % |
| `COPY_PREFIX` | `'#'` | flip to `''` if CSP rejects `#` (Phase 8 human check) |
| `COPY_ALL_SEPARATOR` | `'\n'` | |
| `TOAST_MS` / `UNDO_TOAST_MS` | 1200 / 8000 | |
| `PENDING_INDICATOR_DELAY_MS` | 150 | show "Working…" only if an extraction takes longer |
| `SETTINGS_SAVE_DEBOUNCE_MS` | 300 | |
| `CARD_SWATCH` / `CARD_LABEL_H` / `CARD_GAP` / `CARD_PAD` / `CARD_COLS_MAX` / `CARD_SCALE` | 160 / 44 / 16 / 32 / 8 / 2 | PNG card layout (A22) |
| `CARD_BG` / `CARD_TEXT` / `CARD_SWATCH_STROKE` | `'#FFFFFF'` / `'#1A1A1A'` / `'rgba(0,0,0,0.12)'` | |
| `CARD_FONT` | `'600 22px ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace'` | multiplied by `CARD_SCALE` when drawing |
| `GRADIENT_STOPS` | 11 | gray stops on the value-slider track (values 0,10,…,100) |
| `LOUPE_SIZE_PX` / `LOUPE_ZOOM` / `LOUPE_OFFSET_Y_PX` | 120 / 8 / 90 | touch eyedropper magnifier |
| `NOTAN_BANDS_MIN` / `MAX` / `DEFAULT` | 2 / 5 / 3 | |
| `NOTAN_PERCENTILE_LOW` / `HIGH` | 2 / 98 | |
| `HARMONY_WARM_HUE` / `HARMONY_COOL_HUE` | 60 / 250 | OKLCH degrees |
| `HARMONY_TEMP_SHIFT_DEG` | 12 | |
| `HARMONY_NEUTRAL_TINT_C` | 0.02 | chroma given to neutrals in warmer/cooler |
| `GAMUT_BISECT_STEPS` | 24 | |
| `THUMBNAIL_EDGE` / `THUMBNAIL_JPEG_Q` | 160 / 0.8 | |
| `STORED_DISPLAY_EDGE` / `STORED_DISPLAY_JPEG_Q` | 1280 / 0.85 | |
| `TAGS_MAX` / `TAG_MAX_LEN` / `NAME_MAX_LEN` | 20 / 30 / 100 | |
| `SETTINGS_KEY` | `'palette-picker:settings:v1'` | |
| `DB_NAME` / `DB_VERSION` | `'palette-picker'` / 1 | |
| `PALETTE_FILE_FORMAT` / `PALETTE_FILE_VERSION` / `PALETTE_FILE_EXT` | `'palette-picker'` / 1 / `'.palette.json'` | |
| `PHONE_BREAKPOINT_PX` | 900 | below = phone layout (used in CSS as a literal `@media (max-width: 899.98px)`; keep both in sync and comment the CSS) |

### 5.4 Theme tokens (`src/ui/theme.css`)

Neutral only. Light (default) / dark via `@media (prefers-color-scheme: dark)`:

| Token | Light | Dark |
|---|---|---|
| `--bg` (page) | `#ECECEC` | `#1E1E1E` |
| `--panel` | `#F7F7F7` | `#262626` |
| `--panel-2` (inputs, tracks) | `#E2E2E2` | `#333333` |
| `--text` | `#1A1A1A` | `#E8E8E8` |
| `--text-muted` | `#5C5C5C` | `#A6A6A6` |
| `--border` | `#CFCFCF` | `#3D3D3D` |
| `--focus` | `#1A1A1A` | `#E8E8E8` (2 px outline, offset 2 px) |
| `--chip` (icon buttons over swatches/images) | `rgba(0,0,0,0.55)` with white icons | same |

Font: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; hex codes in `ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace`.

---

## 6. Fixed inputs (fixtures)

These files are **already in `fixtures/`** (the human's setup put them there), with SHA-256 hashes in `fixtures/SHA256SUMS.txt`. `tests/fixtures.test.ts` verifies the hashes (format per line: `<64 hex><space><space or *><path>`). If a file is missing or corrupt, recreate it from the base64 in Appendix H. Do not regenerate or "fix" fixtures in any other way.

| File | Content | Expected behavior (defaults unless noted: size 6, variety 50, hue weight 35, range 0–100) |
|---|---|---|
| `stripes-6.png` | 600×100, six 100 px vertical stripes: `#000000 #FFFFFF #FF0000 #00FF00 #0000FF #FFFF00` | Display canvas 600×100; processing 300×50 (exact colors survive the 2:1 box filter). Palette (display order): `#000000 #0000FF #FF0000 #00FF00 #FFFF00 #FFFFFF`, no shortfall. Values: 0, 45, 63, 87, 97, 100. **Size 3, variety 0** → `#000000 #0000FF #FF0000`. **Size 3, variety 100** → selection `#000000, #FFFFFF, #0000FF` → display `#000000 #0000FF #FFFFFF`. **Range 40–90** → `#0000FF #FF0000 #00FF00` + shortfall notice "Only 3 …". |
| `gradient-gray.png` | 256×64 grayscale, column *x* has gray level *x* | Value by column: 68–70 → 39; 71–72 → 40; 124–126 → 59; 127–129 → 60; 130–132 → 61. Overlay with range 40–60: column 70 dark tint, columns 71–129 untinted, column 130 light tint. |
| `transparent-half.png` | 100×100 RGBA; left 50 columns fully transparent (green, alpha 0); right 50 opaque `#FF0000` | Palette = `#FF0000` only; shortfall. |
| `near-duplicates.png` | 300×200 vertical bands, widths 120/60/45/30/30/15 px: `#3060C0 #3161C1 #3262C2 #2F5FBF #3060C2 #E02020` | The five blues are all within ΔE 0.0097 of each other. Palette at **any** variety = `#3060C0 #E02020` (values 51, 58) + shortfall. |
| `animated.gif` | 8×8, 2 frames: frame 1 `#FF0000`, frame 2 `#0000FF` | Palette = `#FF0000` only (first frame). |
| `orient6.jpg` | stored 40×20 (left half red, right half blue), EXIF Orientation = 6 | Displayed upright as **20×40**, red on top: pixel (10,5) has R > 200 and B < 60; pixel (10,35) has B > 200 and R < 60. |
| `cls/AABBCC.cls`, `cls/unicode.cls` | CSP color sets from the MIT-licensed CLSEncoderDecoder project (see `cls/SOURCE.md`) | Byte-exact targets for the `.cls` writer (A24). |

Synthetic inputs made inside tests (not files):
- **Big image (Phase 5 e2e):** an 8000×6250 (50 MP) PNG created in the page with `OffscreenCanvas` + `convertToBlob({type: 'image/png'})`, four solid quadrants `#FF0000 #00FF00 #0000FF #FFFF00`, fed through the file input with a `DataTransfer`. It must load with a display canvas of 2048×1600, and for each quadrant color the palette must contain a swatch within ΔE 0.02 of it. (Browser resampling blends a few pixels at the quadrant borders, so exact hex equality isn't guaranteed here, and one or two extra blend colors may appear.)
- **Perf image (Phase 3 unit test):** a 300×300 `RgbaImage` filled by a seeded LCG: `state = (state * 1664525 + 1013904223) >>> 0`, starting at `state = 12345`; each channel byte = `state >>> 24`. Test code is allowed to use this generator; product code never uses randomness.

---

## 7. Phases

Phases are strictly sequential. Don't start Phase N+1 until Phase N's gate passes and is committed. Don't build anything tagged for a later phase, even if it's easy; leave the seam described in Appendix F. Each gate means **`npm run check` green + `npm run e2e` green + BUILD_LOG entry + commit**, plus whatever extra the phase states.

### Milestone M1 — Prototype (desktop)

#### Phase 0 — Scaffold and prove the verification loop

**Build**
1. `git init -b main`; write `.gitignore` and `.gitattributes` (§2.3); commit `docs/` and `fixtures/` as `phase 0: import blueprint and fixtures`.
2. `package.json` scripts (§2.2). Config files, exactly:

`tsconfig.base.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```
`tsconfig.core.json`
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022"], "types": [] },
  "include": ["src/core/**/*.ts"],
  "exclude": ["src/core/**/*.test.ts"]
}
```
`tsconfig.worker.json`
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "WebWorker"], "types": [] },
  "include": ["src/worker/**/*.ts", "src/core/**/*.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```
`tsconfig.app.json` (Phase 10 adds `"vite-plugin-pwa/react"` to `types`)
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/worker/**"]
}
```
`tsconfig.node.json`
```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2023", "DOM", "DOM.Iterable"], "types": ["node"] },
  "include": ["vite.config.ts", "playwright.config.ts", "pwa-assets.config.ts", "tests/**/*.ts", "e2e/**/*.ts"]
}
```
`vite.config.ts`
```ts
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
```
`playwright.config.ts`
```ts
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
```
3. `index.html` (root `<div id="root">`, `<title>Palette Picker</title>`, viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`), `src/main.tsx`, and `src/ui/App.tsx`: renders an `<h1>Palette Picker</h1>` plus an element `data-testid="worker-status"` whose text becomes `worker: ok` after a ping/pong with the worker, and `data-testid="app-ready"` once mounted.
4. `src/core/tuning.ts` with **every** constant in §5.3 (it's just data); `src/core/types.ts` (§5.1); `src/core/index.ts`; `src/core/protocol.ts` with only `ping`/`pong` for now; `src/core/handleMessage.ts` (ping → pong); `src/worker/engine.worker.ts` (A13 shape); `src/platform/engineClient.ts` with `ping(): Promise<void>`. Create the worker in a **module-level singleton** (see Appendix G #17, React StrictMode).
5. `tests/architecture.test.ts` (rules in §3.2) and `tests/fixtures.test.ts` (SHA-256 of every file listed in `fixtures/SHA256SUMS.txt`, via `node:crypto` and `node:fs`).
6. `e2e/helpers.ts` with `openApp(page)` (`page.goto('./')`, which is relative to the base URL; `'/'` would be wrong) and an `e2e/smoke.spec.ts`: the heading is visible and `worker-status` reads `worker: ok`.
7. `BUILD_LOG.md`.

**Tests:** `handleMessage.test.ts` (ping → pong with the same `reqId`); the architecture test; the fixtures test; the smoke e2e. Then prove the bans bite: add `document.title` to a core file → `npm run typecheck` fails → revert; add `Math.random()` to a core file → architecture test fails → revert. Log both.

**Gate:** `npm run check` + `npm run e2e` green; commit `phase 0: scaffold and verification loop`.

#### Phase 1 — Core color math

**Build:** `src/core/color.ts`: sRGB decode table and encode (A1); OKLab forward/inverse (A2); `rgb8ToLab`, `hexToLab`, `labToHex` (clipping), `valueOfL`, `valueOfHex`, `formatHex`, `parseHex`, `labToLch`, `lchToLab`, `grayHexForValue` (A3). `src/core/distance.ts`: `deltaE`, `weightedDistance`, `varietyFactor`, `hueFactor` (A4).

**Tests:** every vector in A1–A4, including the HSV trap (yellow must be 97 and blue 45, not 100 and 100), the 0°/360° hue wraparound, near-gray hue immunity, the clipping case, and the 256-value sRGB round trip.

**Gate:** green + commit.

#### Phase 2 — Core image operations

**Build:** `src/core/image.ts`: `scaledSize`, `downsampleBox` (A5), `toLabPixels`, `valueMap`, `valueHistogram`, `inRangeIndices` (A6).

**Tests:** A5 vectors (the black/white average is 188, not 128; partition correctness; alpha rule; `scaledSize` cases); A6 vectors (transparent pixels skipped; value-map sentinel 255; histogram of a 4-pixel image).

**Gate:** green + commit.

#### Phase 3 — Palette engine (pure)

**Build:** `src/core/cluster.ts` (median cut A7, Lloyd refinement A8, `buildCandidates` A9); `src/core/select.ts` (`selectPalette`, A10); `src/core/engine.ts`: the `PaletteEngine` class (A13), holding the current image's processing pixels and a candidates cache keyed by value range (up to 8 entries, least recently used evicted).

**Tests**
- A10 vectors from Appendix B §B1 (the five-candidate example at variety 0, 0.25, 0.5, 1 and sizes 3–5; locked anchor; prefix stability: `select(size n+1)` starts with `select(size n)`).
- Engine on synthetic `RgbaImage`s that replicate the fixtures (build them in the test; the PNG files are used by e2e): stripes, near-duplicates, transparent-half → the exact palettes in §6.
- Floor property: on the seeded perf image, for 30 parameter combinations (sizes 2/6/16 × variety 0/50/100 × hue 0/35/100, plus ranges 0–100, 20–60, 70–100), every returned pair has ΔE ≥ 0.04, and running twice gives identical output (determinism).
- Empty range (e.g. range 0–10 on near-duplicates) → zero picks and `shortfall: true`.
- Perf smoke: on the seeded 300×300 image, `load + extract(defaults)` takes < 400 ms and a second `extract` with only variety changed takes < 20 ms (the candidates are cached). Log the measured times.

**Gate:** green + commit.

#### Phase 4 — Worker and engine client

**Build:** complete `src/core/protocol.ts` for `load` and `extract` (Appendix C §C1); `src/core/handleMessage.ts` returning `{ res, transfer }`; `src/core/scheduler.ts` `LatestOnlyScheduler` (A19); `src/platform/engineClient.ts` with `load(display: RgbaImage, processing?: RgbaImage): Promise<LoadedInfo>` and `extract(params, extractionRequest)`, which goes through the scheduler and delivers results through a callback. The client assigns `imageId`s and drops responses for stale images.

**Tests:** scheduler vectors (A19); `handleMessage` tests calling it directly with a `PaletteEngine` (no real Worker): load → `loaded` with correct sizes, histogram sum = opaque pixel count, and value-map length = display pixels; extract → expected picks for the synthetic stripes; extract before load → `error`. The e2e smoke still passes.

**Gate:** green + commit.

#### Phase 5 — App shell and image input (desktop)

**Build**
- `src/state/` skeleton: `appState.ts` (Phase 5 fields), `actions.ts`, `reducer.ts`, `AppProvider.tsx`, `useEngine.ts`.
- Desktop layout (Appendix D §D1): image stage left, panel right (empty sections are fine for now). Theme tokens (§5.4).
- `src/platform/decodeImage.ts` per Appendix D §D5: type checks, `<img>` + `decode()` for most formats, `createImageBitmap` for GIF, the size guard, drawing straight into a display-size canvas, error mapping.
- Input methods (§D4): drop zone with **window-level** dragover/drop guards; a browse button with a hidden `<input type="file" accept="image/*" data-testid="file-input">`; a document `paste` listener reading `clipboardData.items` image files; a dropped URL without a file → `ERR_DROPPED_URL`.
- The image stage shows the display canvas (`data-testid="image-canvas"`), the image name and size, and `data-testid="image-status"` with `data-state="empty|loading|ready|error"`. Errors appear in an inline banner (`data-testid="error-banner"`).
- After decoding: `engineClient.load(display)` → `imageLoaded`.

**Tests**
- Reducer: `imageLoadStarted` → loading; `imageLoaded` → ready and `extractionRequest` incremented; `imageLoadFailed` → error text, previous image kept.
- e2e `input.spec.ts`: each fixture via the file input reaches `ready`; stripes canvas is 600×100; `orient6.jpg` canvas is 20×40 with red on top (§6 thresholds); `animated.gif` canvas pixel (4,4) is red; a paste event (a `ClipboardEvent` with a `DataTransfer` holding the stripes file, created in the page from bytes passed by the test) loads it; a drop event with a file loads it; a drop with only `text/uri-list` shows `ERR_DROPPED_URL`; a `.txt` file shows `ERR_NOT_IMAGE`; the 50 MP synthetic image (§6) loads to 2048×1600 in under 15 s.
- Screenshot `artifacts/phase-5/desktop-loaded.png`.

**Gate:** green + commit.

#### Phase 6 — Controls, swatches, copy (completes M1)

**Build**
- `src/core/sliderLogic.ts` (A21), written for **N handles with a `minGap`** (the value range uses N = 2, minGap 0; the notan view reuses it with minGap 1 in Phase 18).
- Components: `Slider` (single value), `RangeSlider` (N handles; track gradient from `GRADIENT_STOPS` grays via `grayHexForValue`; keyboard support; ARIA per §D3).
- Controls panel: Colors (2–16), Variety, Hue weight, Value range, with live labels (§D2).
- Palette: `PaletteEntry` model from the start (all `locked: false, origin: 'extracted'`); `mergeExtraction` (A12); display sorted by value (`sortEntries(entries, 'value')`, A20; only the value mode is needed now).
- `SwatchGrid` + `SwatchTile`: color block plus a hex label below; click copies (`platform/clipboard.ts`: `navigator.clipboard.writeText`, falling back to a hidden textarea + `execCommand('copy')`, then a manual-copy dialog); a "Copy all" button; a toast (`aria-live="polite"`).
- Shortfall notice (`data-testid="shortfall"`), and a pending indicator after `PENDING_INDICATOR_DELAY_MS`.
- Palette container `data-testid="palette"` with `data-settled="true|false"` (Appendix C §C3).
- Settings persistence: `core/settings.ts` (A26) + `platform/settingsStore.ts` (try/catch around localStorage; debounced save).

**Tests**
- Unit: A21 slider vectors; A26 settings vectors; reducer: `controlsChanged` bumps `extractionRequest`; `extractionSucceeded` with a stale `extractionRequest` still applies (results arrive in order) but `settled` only when it matches.
- e2e `palette.spec.ts` (with `test.use({ permissions: ['clipboard-read', 'clipboard-write'] })`):
  - stripes defaults → swatch hexes, in order, exactly `#000000 #0000FF #FF0000 #00FF00 #FFFF00 #FFFFFF`;
  - set size 3 (focus the Colors slider, press End then Left ×13), variety 0 (Home) → `#000000 #0000FF #FF0000`; variety 100 (End) → `#000000 #0000FF #FFFFFF`;
  - value range 40–90 via the keyboard on the handles → `#0000FF #FF0000 #00FF00` and the shortfall text "Only 3 clearly different colors in this value range.";
  - near-duplicates → `#3060C0 #E02020` + shortfall; transparent-half → `#FF0000`;
  - click the first swatch → `navigator.clipboard.readText()` is `#000000`; Copy all → six lines in display order;
  - reload → the controls are restored from localStorage.
- Screenshot `artifacts/phase-6/desktop-palette.png`.

**Gate:** green + commit + `git tag m1`. **STOP for the human M1 review (§0.2).** Wait for "continue".

### Milestone M2 — MVP

#### Phase 7 — Out-of-range overlay and value histogram

**Build**
- `src/core/lut.ts`: `packRgba`, `overlayLut`, `applyLut` (A15).
- An overlay canvas stacked exactly on the image canvas (same pixel size, same CSS box, `pointer-events: none`), re-rendered on range or overlay-setting changes in a `requestAnimationFrame`-throttled effect.
- Toolbar above the image: an "Out-of-range" toggle button (`aria-pressed`) and a settings popover with Style (Tint / Dim), "Darker than range" color, "Lighter than range" color (`<input type="color">`; normalize the lowercase output with `parseHex`), and an Opacity slider (10–100). Persist with the settings.
- Histogram drawn behind the value-range track: 101 bars, height ∝ `sqrt(count / maxCount)`, in `--text-muted` at 35 % opacity.

**Tests:** A15 LUT vectors; e2e `overlay.spec.ts` on gradient-gray, overlay on, range 40–60: read the overlay canvas pixels at row 32 — column 70 = dark tint with alpha 153, columns 71 and 129 alpha 0, column 130 = light tint with alpha 153; switch to Dim → column 70 is `#161616` (the gray for value `round(39 × 0.5)` = 20) at alpha 153. Screenshot.

**Gate:** green + commit.

#### Phase 8 — Exports: .aco and PNG card

**Build:** `src/core/export/aco.ts` (A23); `src/core/export/pngCardLayout.ts` (A22); `src/core/fileNames.ts` (A28: timestamp names from date parts passed in; sanitizing); `src/platform/renderPngCard.ts` (canvas drawing from the layout; `toDataURL('image/png')` and a synchronous data-URL → Blob conversion, see Appendix G #11); `src/platform/saveFile.ts` (anchor download, revoking the object URL after 10 s). Export buttons in the panel: "Download .aco", "Download PNG card". Order = display order.

**Tests:** A23 byte vectors (48-byte and 88-byte files); A22 layout vectors; A28 filename vectors; e2e `export.spec.ts`: stripes → click "Download .aco" → `page.waitForEvent('download')` → the bytes equal `aco(display-ordered stripes palette)` computed in the test with the core function; PNG card download → read the PNG IHDR (bytes 16–23, big-endian width and height) → 2208 × 536.

**Gate:** green + commit. **Human check (§0.2):** CSP imports the `.aco`; and is `#` accepted in CSP's HEX field? If not, set `COPY_PREFIX = ''`, update the e2e expectation, and log it.

#### Phase 9 — Phone layout and touch

**Build:** the responsive layout (§D1, phone < 900 px): image on top (max-height 45dvh), swatch grid (4 columns), actions, a collapsible "Controls" section (`phoneControlsOpen`, persisted, open by default), exports. Empty-state buttons "Choose photo" (`accept="image/*"`) and "Take photo" (`accept="image/*" capture="environment"`, `data-testid="camera-input"`). Slider thumbs 44 × 44 px hit areas; `touch-action: none` on slider tracks; safe-area padding. `saveFile` gains the share path (§D6: iOS uses `navigator.share({ files })` when `canShare` allows; Android and desktop download). The PNG card button reads "Save image" on touch devices and prefers the share sheet.

**Tests:** e2e `layout.phone.spec.ts` (Pixel 7): no horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`); every slider thumb and swatch button's bounding box ≥ 44 × 44; the controls section collapses and expands; the stripes fixture loads via `file-input` and gives the same six swatches; tapping a swatch copies. Screenshot `artifacts/phase-9/phone.png`.

**Gate:** green + commit.

#### Phase 10 — PWA and deployment (completes M2)

**Build**
- `public/icon.svg`: a 512×512 rounded square in `#262626` holding a 2×2 grid of rounded swatches (`#E8A87C`, `#41B3A3`, `#C38D9E`, `#F2D16B`). `pwa-assets.config.ts`:
  ```ts
  import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';
  export default defineConfig({ preset, images: ['public/icon.svg'] });
  ```
  Run `npx pwa-assets-generator` once and commit the generated PNG/ICO files in `public/`.
- `vite.config.ts`: add `VitePWA` per Appendix C §C7 (`registerType: 'prompt'`, the manifest, workbox globs). Add `"vite-plugin-pwa/react"` to `tsconfig.app.json` `types`.
- `index.html` head links use `%BASE_URL%` (Appendix C §C7), never a leading `/`.
- `src/platform/pwa.ts`: `useRegisterSW` from `virtual:pwa-register/react` → an "A new version is ready" banner with a Reload button (`data-testid="update-banner"`); capture `beforeinstallprompt` → an "Install app" button in the header (hidden when unavailable or already installed).
- `.github/workflows/deploy.yml` (Appendix C §C8); `README.md` (what the app is, `npm run dev/check/e2e`, how deployment works).

**Tests:** e2e `pwa.spec.ts`: the manifest link resolves and its JSON has `name: "Palette Picker"` and a 512 px icon; `navigator.serviceWorker.ready` resolves; then `context.setOffline(true)`, reload, the heading is visible, and loading stripes still produces the six swatches (this proves the worker chunk is precached).

**Gate:** green + commit + `git tag m2`. **STOP for the human (§0.2):** push, enable Pages, run the device rows of Appendix E on a real phone, and report. Fix what they report (each fix gets a test where possible) before continuing.

### Milestone M3 — v1.1

#### Phase 11 — Lock and re-roll

**Build**
- A lock toggle on every swatch tile (top-right chip button, `aria-pressed`, `data-testid="lock"`); a locked tile shows a lock glyph and a 2 px `--text` outline. A remove chip (×, `data-testid="remove"`) on **locked** tiles only.
- Reducer actions `lockToggled(hex)`, `entryRemoved(hex)`, `rerollRequested()` with the rules in A12 and C3. The size slider's minimum becomes `max(PALETTE_SIZE_MIN, lockedCount)`.
- `extract` requests now send `locked` (hexes of locked entries, in entries order) and `excluded`. Re-roll: a "Re-roll" button next to "Copy all" sends `extract` with `reroll: { currentPicks }`; the worker runs A11 and returns the new `excluded`.
- `excluded` resets to `[]` on `controlsChanged` and `imageLoaded`.

**Tests:** A11 vectors (nine grays, Appendix B §B2); A12 `mergeExtraction` vectors; reducer: `lockToggled` does **not** change `extractionRequest`; `controlsChanged` resets `excluded`. e2e `locks.spec.ts`: stripes, size 3, variety 0 → lock `#0000FF` → variety 100 → `#0000FF` is still present and locked; Re-roll changes the unlocked swatches and keeps the locked one; the size slider can't go below the number of locked colors.

**Gate:** green + commit.

#### Phase 12 — Eyedropper

**Build:** `src/core/geometry.ts` `clientToImage` (A29); `src/core/paletteOps.ts` `addPickedColor` (A12). An eyedropper toggle in the image toolbar (`aria-pressed`, `data-testid="eyedropper"`; Esc exits). Desktop: crosshair cursor; a click samples `getImageData(x, y, 1, 1)` from the **color** display canvas (whatever view is showing) → `colorPicked(hex)`. Touch/pen: on `pointerdown` show a loupe (`LOUPE_SIZE_PX` circle, `LOUPE_OFFSET_Y_PX` above the finger, magnified ×`LOUPE_ZOOM` with `imageSmoothingEnabled = false`, a center crosshair and the hex label); it follows `pointermove`; `pointerup` picks; `pointercancel` aborts. While eyedropper mode is on, the image stage has `touch-action: none`. The mode stays on until toggled off. Messages (`EYEDROPPER_DUP`, `EYEDROPPER_FULL`) appear as toasts.

**Tests:** A12 `addPickedColor` vectors (all five cases); A29 vectors. e2e `eyedropper.spec.ts`: stripes, size 2, variety 100 → `#000000 #FFFFFF`; turn on the eyedropper and click the middle of the yellow stripe (canvas x 550, y 50, mapped through the canvas's bounding box) → the palette has 3 entries including a locked `#FFFF00`. Clicking the white stripe next replaces the unlocked `#FFFFFF` with a locked `#FFFFFF` (size stays 3); clicking it once more → toast "Already in the palette". Screenshot.

**Gate:** green + commit.

#### Phase 13 — Coverage: proportion bar, selection, show-where

**Build:** `src/core/coverage.ts` (`coverageShares`, `labelMap`, A14); worker channels `coverage` and `labelMap` (C1), each with its own `LatestOnlyScheduler`. A coverage request is sent after **every** change to `entries` or `valueRange` (the hexes in entries order). Proportion bar under the swatches (`data-testid="proportion-bar"`): segments in display order, width ∝ share, each with `title` and `aria-label` "#HEX — 23%" (rounded to whole percent). Clicking a swatch now **copies and selects** (`selectedHex`); a "Showing #HEX ×" chip above the image clears it; Esc and clicking the image (when not in eyedropper mode) also clear it. Toolbar toggle "Show where" (`showWhere`, default on). When a swatch is selected and `showWhere` is on: request a `labelMap`, draw the highlight canvas (mask resolution, CSS-scaled over the image with smoothing) using the highlight LUT (A15), and hide the out-of-range overlay while the highlight shows.

**Tests:** A14 vectors (stripes with palette `[#000000, #FFFFFF]` → shares 1/3, 2/3); e2e `coverage.spec.ts`: stripes defaults → six bar segments of equal width (±1 px); select `#FF0000` → the highlight canvas is transparent at the red stripe's center and has alpha 191 at the black stripe's center; Esc clears it. Screenshot.

**Gate:** green + commit.

#### Phase 14 — Sorting (completes M3)

**Build:** `src/core/sort.ts` (all four modes, A20); a "Sort" select in the swatch header (Value / Hue / Saturation / Frequency), persisted. Frequency uses the latest coverage; while coverage for the current entries is pending, keep the previous display order (don't flicker).

**Tests:** A20 vectors on the stripes palette for every mode; e2e: change the sort mode → the swatch order matches the vectors; Copy all follows the display order.

**Gate:** green + commit + `git tag m3`. **STOP for the human M3 check (§0.2).**

### Milestone M4 — v1.2

#### Phase 15 — Storage layer

**Build:** `src/core/library.ts` (record types per C6, `parseTags`, `matchesSearch`, A28); `src/platform/libraryRepo.ts` using `idb`: database `palette-picker` v1, stores `palettes` (keyPath `id`, index `updatedAt`) and `images` (keyPath `id`), API per C6. Images are stored as `{ mime, width, height, bytes: ArrayBuffer }`, **not Blobs** (Appendix G #14). `put` and `delete` each use **one** transaction across both stores. `list()` reads only the `palettes` store, sorted by `updatedAt` descending. A `QuotaExceededError` maps to the `ERR_STORAGE_FULL` string.

**Tests** (`libraryRepo.test.ts`, `import 'fake-indexeddb/auto'`): put → get round-trips every field, including ArrayBuffer bytes; list order; list never includes image bytes; `updateMeta`; delete removes both records; put with `images: null` keeps any existing images. A28 vectors.

**Gate:** green + commit.

#### Phase 16 — Library UI: save and reopen

**Build**
- Hash routing: `#/library` ⇔ `route: 'library'`; header tabs "Picker" / "Library" (`data-testid="tab-picker"`, `tab-library`) that set the hash; `hashchange` updates the state, so the phone's Back button returns to the Picker.
- Save flow (§D7): a "Save" button in the panel opens a dialog (name, default `Palette YYYY-MM-DD`; tags as comma-separated text). When the palette came from the library: "Save changes" (overwrite) and "Save as new". Saving builds:
  - a thumbnail (160 px JPEG from the display canvas);
  - the stored display image (≤ 1280 px JPEG q 0.85);
  - the stored processing image (worker `getProcessing` → PNG via a canvas);
  - the record (entries, controls, sortMode, name, tags, createdAt/updatedAt as ISO strings, `id` from `crypto.randomUUID()`).

  After the first successful save, call `navigator.storage?.persist?.()` once.
- `saved.dirty` becomes true on any change to entries, controls or sortMode; the Save button shows "Save changes •" while dirty.
- Library view (§D7): search box, cards (thumbnail, name, up to 16 mini swatches, tag chips, date), Open / Edit / Export / Delete (confirm dialog). Empty state. iOS hint banner when `isIOS && !isStandalone` (Appendix G #13).
- Open flow: if the current palette is saved and dirty, ask first (`CONFIRM_DISCARD`). Then decode the stored display JPEG (through `decodeImage`) and the stored PNG → `engineClient.load(display, processing)` → dispatch `paletteOpened(record)`, which sets controls, entries (exactly as saved), sortMode, `saved`, `excluded = []`, and **does not** bump `extractionRequest`. Switch to the Picker.

**Tests:** reducer (dirty rules; `paletteOpened` doesn't extract); e2e `library.spec.ts`: stripes, size 4, lock `#FF0000`, save as "Test" with tags "sky, warm" → the Library shows the card with the tags `sky` and `warm`; reload the page → open "Test" → the same four hexes, `#FF0000` locked, size 4; unlock everything, then move variety to 100 and back to 50 → the hexes equal the saved ones (deterministic, because the exact processing image was stored); search "warm" filters; Delete + confirm removes the card. Screenshots of the Library on desktop and phone.

**Gate:** green + commit.

#### Phase 17 — Palette files (export / import)

**Build:** `src/core/base64.ts` (A25), `src/core/paletteFile.ts` (`serializePaletteFile`, `parsePaletteFile`, `planImport`, A27). The card's Export → `<sanitized name>.palette.json`; the Library's "Export all" → `palette-library-YYYYMMDD.palette.json`; "Import file" (`accept=".json,application/json"`, `data-testid="import-input"`) → parse → plan → write → toast `IMPORT_DONE` ("Imported 3 palettes (1 updated, 2 skipped).") or an error string.

**Tests:** A25 RFC 4648 vectors; A27 validation and `planImport` vectors; serialize → parse round trip deep-equals (including image bytes). e2e `paletteFile.spec.ts`: save "Trip" → Export → capture the download → open a **new browser context** (empty IndexedDB) → Import that file → the card "Trip" exists → Open → the same hexes, and the image canvas size matches.

**Gate:** green + commit.

#### Phase 18 — Value study view

**Build:** `src/core/notan.ts` (percentiles, auto thresholds, `bandOf`, A16); `grayLut` and `notanLut` in `lut.ts` (A15). Toolbar segmented control "Color | Gray | Notan" (`data-testid="view-color|view-gray|view-notan"`). A view canvas (display resolution) sits between the image canvas and the overlay; it's hidden in Color mode and drawn with `applyLut(valueMap, lut)` otherwise. Notan controls (shown only in Notan mode, under the toolbar on desktop and in the Controls section on phone): a Bands stepper (2–5) and a `RangeSlider` with `bands − 1` handles and `minGap` 1 over the histogram, plus an "Auto" button (thresholds → `null`). Changing the number of bands resets the thresholds to auto. The overlay and show-where layers still render on top. The eyedropper still samples the color canvas.

**Tests:** A16 vectors (Appendix B §B4); LUT vectors (gray of value 0/50/60/100 → `#000000 #636363 #808080 #FFFFFF`); e2e `valueStudy.spec.ts`: stripes, Notan, 2 bands, auto → threshold 50 → the view-canvas pixels at the six stripe centers, in file order (black, white, red, green, blue, yellow), are `#000000 #FFFFFF #FFFFFF #FFFFFF #000000 #FFFFFF` (blue's value 45 is below the threshold). Gray mode: red stripe center = gray for value 63. Screenshot.

**Gate:** green + commit.

#### Phase 19 — .cls export

**Build:** `src/core/utf8.ts` (`utf8Encode`, handling surrogate pairs); `src/core/export/cls.ts` (A24); a "Download .cls" button. Color set name = saved name if any, else `Palette YYYY-MM-DD HH:mm`.

**Tests:** byte-exact against `fixtures/cls/AABBCC.cls` (name `AABBCC`, color `#AABBCC`) and `fixtures/cls/unicode.cls` (name `"a\u00A1\u0800\u{12000}"`); the two-color "Sunset" vector; UTF-8 vectors. e2e: the downloaded `.cls` for stripes starts with `53 4C 43 43 00 01` and is `30 + len(asciiName) + len(utf8Name) + 12 × 6` bytes long.

**Gate:** green + commit. **Human check:** CSP imports the `.cls` (menu import and drag-and-drop) with the right colors and name.

#### Phase 20 — Harmony suggestions (completes M4)

**Build:** `src/core/gamut.ts` (`lchToHexMapped`, A17); `src/core/harmony.ts` (`complementAccent`, `temperatureShift`, A18). A collapsible "Harmony" section (collapsed by default, §D2):
- "Accent": a swatch with an "Add" button, which goes through `addPickedColor` with origin `harmony`. A neutral palette shows `HARMONY_NONE`.
- "Warmer" and "Cooler": preview rows with an "Apply" button. Applying replaces `entries` with the shifted colors, all locked, origin `harmony`, deduplicated by the floor (keep the first of any too-close pair), with `size` = the new entries count. It also stores `undo` and shows a toast with "Undo" for `UNDO_TOAST_MS`. Undo restores the previous entries and size.

Harmony uses coverage shares when available (aligned by hex), else equal weights.

**Tests:** A17 and A18 vectors (Appendix B §B5); e2e: stripes → Apply Warmer → all entries locked and none equal to the originals except `#000000`/`#FFFFFF` (neutrals at L 0/1 stay the same); Undo → the original six. Then run the **full** Appendix E automated rows.

**Gate:** green + commit + `git tag m4`. **STOP for the human's final acceptance (§0.2).**

---

## Appendix A — Exact algorithms and mandatory test vectors

Every vector here was computed with an independent reference implementation. Write each one as a test. Floats: `toBeCloseTo(x, 4)` unless stated. Hexes and bytes: exact equality. When a vector fails, suspect your code first; the "trap" notes name the usual culprit.

### A1. sRGB transfer (`core/color.ts`)
```
decode8(c8):   c = c8 / 255;  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
SRGB_TO_LINEAR = Float64Array(256) filled with decode8 at module load
encode(l):     l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055
to8(l):        Math.round(clamp01(encode(l)) * 255)        // clamp BEFORE scaling
```
Trap: gamma 2.2 shortcuts, or doing color math on raw 0–255 values without linearizing.
Vectors: `SRGB_TO_LINEAR[0] = 0`, `[255] = 1`, `[128] ≈ 0.215861`; `to8(0.5) = 188`; `to8(1.2) = 255`; `to8(-0.1) = 0`; for **every** v in 0..255, `to8(SRGB_TO_LINEAR[v]) === v`.

### A2. OKLab (Björn Ottosson's matrices, use these exact constants)
```
linear sRGB → LMS:
  l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
  m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
  s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
l_ = Math.cbrt(l); m_ = Math.cbrt(m); s_ = Math.cbrt(s)       // NOT Math.pow(x, 1/3): NaN for x < 0
  L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
  a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
  b = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
inverse:
  l_ = L + 0.3963377774*a + 0.2158037573*b
  m_ = L - 0.1055613458*a - 0.0638541728*b
  s_ = L - 0.0894841775*a - 1.2914855480*b
  l = l_**3; m = m_**3; s = s_**3
  r =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s
  g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
  b = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
```
Vectors `hexToLab` (L, a, b):

| Hex | L | a | b |
|---|---|---|---|
| `#000000` | 0.000000 | 0.000000 | 0.000000 |
| `#FFFFFF` | 1.000000 | 0.000000 | 0.000000 |
| `#FF0000` | 0.627955 | 0.224863 | 0.125846 |
| `#00FF00` | 0.866440 | −0.233888 | 0.179498 |
| `#0000FF` | 0.452014 | −0.032457 | −0.311528 |
| `#FFFF00` | 0.967983 | −0.071369 | 0.198570 |
| `#808080` | 0.599871 | 0.000000 | 0.000000 |
| `#FFBE98` | 0.852111 | 0.056533 | 0.070913 |

And `labToHex(hexToLab(x)) === x` for every row.

### A3. Value, hex, OKLCH, grays
- `valueOfL(L) = min(100, max(0, Math.round(L * 100)))`; `valueOfHex(h) = valueOfL(hexToLab(h)[0])`.
  Vectors: `#000000`→0, `#0000FF`→45, `#808080`→60, `#FF0000`→63, `#FFBE98`→85, `#00FF00`→87, `#FFFF00`→97, `#FFFFFF`→100.
  **The HSV trap:** HSV "V" gives 100 for both `#FFFF00` and `#0000FF`, and HSL "L" gives 50 for both. The spec requires that a saturated yellow reads lighter than a saturated blue: 97 vs 45. If you get 100/100 or 50/50, you used the wrong model.
  Gray columns (gradient fixture): gray 68–70 → 39; 71–72 → 40; 124–126 → 59; 127–129 → 60; 130–132 → 61.
- `formatHex(0, 15, 10) = '#000F0A'`; `parseHex('ffbe98') = '#FFBE98'`; `parseHex(' #FFBE98 ') = '#FFBE98'` (trims); `parseHex('#FFF') = null`; `parseHex('#GGGGGG') = null`; `parseHex('FFBE98A') = null`.
- `labToHex` clamps each linear channel to [0, 1] before encoding: `labToHex([1.05, 0, 0]) = '#FFFFFF'`; `labToHex([0.627955, 0.30, 0.125846]) = '#FF0000'` (out of gamut: green goes negative, red > 1).
- `labToLch([L, a, b]) = [L, hypot(a, b), atan2(b, a) in degrees normalized to [0, 360)]` (for C = 0 the hue is 0). `lchToLab` is the inverse.
  Vectors: `#FF0000` → (0.6280, 0.2577, 29.23°); `#00FF00` → (0.8664, 0.2948, 142.50°); `#0000FF` → (0.4520, 0.3132, 264.05°); `#FFFF00` → (0.9680, 0.2110, 109.77°); `#FF8000` → (0.7319, 0.1858, 52.98°); `#3060C0` → (0.5099, 0.1598, 262.30°). Hue tolerance ±0.01°.
- `grayHexForValue(v)`: `g = to8((v / 100) ** 3)` (a neutral with OKLab L = v/100 has linear Y = L³) → `formatHex(g, g, g)`.
  Vectors: 0→`#000000`, 20→`#161616`, 45→`#555555`, 50→`#636363`, 60→`#808080`, 63→`#898989`, 100→`#FFFFFF`.

### A4. Distances (`core/distance.ts`)
```
deltaE(p, q)            = sqrt((pL-qL)² + (pa-qa)² + (pb-qb)²)
weightedDistance(p, q, h):
  dL = pL - qL;  da = pa - qa;  db = pb - qb
  C1 = hypot(pa, pb);  C2 = hypot(qa, qb);  dC = C1 - C2
  dH2 = max(0, da² + db² - dC²)          // hue difference from a,b — no angles
  return sqrt(dL² + dC² + h² · dH2)
varietyFactor(s) = s / 100
hueFactor(s)     = 0.1 + 0.9 · s / 100   // HUE_WEIGHT_MIN_FACTOR = 0.1
```
Why this form: `ΔH` computed from a/b has no 0°/360° wraparound bug, and colors with tiny chroma (near-grays) automatically get tiny hue differences. At `h = 1` it equals `deltaE` exactly.
Trap: computing `|h1 − h2|` in degrees (350° vs 10° looks like 340°) or using hue angles for near-grays.
Vectors (`polar(L, C, deg)` = `[L, C·cos(deg), C·sin(deg)]`):
- `[0.7, 0.1, 0]` vs `[0.7, −0.1, 0]`: h=1 → 0.200000; h=0.25 → 0.050000; h=0.1 → 0.020000.
- `polar(0.7, 0.1, 350)` vs `polar(0.7, 0.1, 10)`: h=1 → 0.034730; and `polar(0.7,0.1,170)` vs `polar(0.7,0.1,190)` → 0.034730 (symmetric; no wraparound).
- `[0.6, 0.001, 0]` vs `[0.6, −0.001, 0]`: h=1 → 0.002000; h=0.1 → 0.000200.
- `polar(0.5, 0.1, 30)` vs `polar(0.6, 0.15, 120)`: h=0.415 → 0.132916; h=1 → 0.206155 (= deltaE).
- `hueFactor(0) = 0.1`, `hueFactor(35) ≈ 0.415`, `hueFactor(100) = 1`; `varietyFactor(50) = 0.5`.

### A5. Resizing (`core/image.ts`)
```
scaledSize(w, h, maxEdge): s = min(1, maxEdge / max(w, h)); return [max(1, round(w*s)), max(1, round(h*s))]

downsampleBox(src: RgbaImage, maxEdge): RgbaImage
  [dw, dh] = scaledSize(src.width, src.height, maxEdge)
  if dw === src.width && dh === src.height: return a COPY
  for dy in 0..dh-1:  y0 = floor(dy*H/dh);  y1 = floor((dy+1)*H/dh)
    for dx in 0..dw-1: x0 = floor(dx*W/dw);  x1 = floor((dx+1)*W/dw)
      n = (x1-x0)*(y1-y0); k = 0; sum = [0,0,0]
      for each source pixel in [x0,x1)×[y0,y1) with alpha >= 128:
        k++; sum += SRGB_TO_LINEAR[r,g,b]
      if 2*k >= n: out = (to8(sum.r/k), to8(sum.g/k), to8(sum.b/k), 255)
      else:        out = (0, 0, 0, 0)
```
The integer ranges partition the source exactly (each source pixel belongs to exactly one destination pixel), because we never upscale. Averaging happens in **linear light**.
Trap: averaging raw sRGB bytes. Black+white must average to 188 (`#BCBCBC`), not 128.
Vectors:
- `scaledSize(600,100,300) = [300,50]`; `(8000,6250,2048) = [2048,1600]`; `(8000,6000,2048) = [2048,1536]`; `(1,5000,300) = [1,300]`; `(200,100,300) = [200,100]`.
- 4×1 `[black, white, black, white]`, maxEdge 2 → 2×1, both pixels `(188,188,188,255)`.
- 3×1 `[#FF0000, #000000, #FFFFFF]`, maxEdge 2 → 2×1: pixel 0 = `(255,0,0,255)` (source range [0,1)); pixel 1 = `(188,188,188,255)` (source range [1,3)).
- 2×1 `[opaque red, transparent]`, maxEdge 1 → `(255,0,0,255)` (k=1, n=2 → opaque). 4×1 `[transparent ×3, opaque red]`, maxEdge 1 → `(0,0,0,0)`.
- No scaling → output equals input byte-for-byte but is a different array object.

### A6. Pixel lists, value map, histogram
```
toLabPixels(img): LabPixels      // opaque pixels only, in row-major order
valueMap(img): Uint8Array(w*h)   // valueOfL(L) for opaque pixels; 255 for transparent
valueHistogram(px): number[101]  // counts of px.value
inRangeIndices(px, range): Int32Array   // ascending indexes i with min <= px.value[i] <= max
```
Speed: use `SRGB_TO_LINEAR` and inline the matrices in loops; no per-pixel allocations.
Vector: 2×2 image `[#000000, #808080 alpha 0, #FFFFFF, #0000FF]` → `count = 3`; `value = [0, 100, 45]`; `valueMap = [0, 255, 100, 45]`; histogram has 1 at 0, 45 and 100 and sums to 3; `inRangeIndices(range 40–100) = [1, 2]`.

### A7. Median cut (`core/cluster.ts`)
```
medianCut(px: LabPixels, ids: Int32Array /* in-range, ascending */, K = CANDIDATE_COUNT): Box[]
  Box = { ids, count, min[3], max[3] };  extent(axis) = max[axis] - min[axis];  maxExtent = max of the 3
  boxes = [makeBox(ids)]
  while boxes.length < K:
    choose the box with the greatest priority = count × maxExtent,
      among boxes with count >= 2 and maxExtent > 0;  ties → lowest position in `boxes`
    if none: break
    axis = argmax extent, ties L before a before b
    sort the box's ids ascending by (coord[axis], L, a, b, id)
    m = floor(count / 2)
    boxes[position] = makeBox(ids[0 .. m));   boxes.push(makeBox(ids[m .. count)))
  return boxes
```
The left half replaces its parent in place and the right half is appended. Positions matter for tie-breaking, so keep exactly this.

### A8. Lloyd refinement
```
centroids = boxes.map(meanLab)                     // in box order
repeat KMEANS_ITERATIONS (4) times:
  assign each in-range pixel (ascending index order) to the nearest centroid by squared deltaE; ties → lower centroid index
  recompute each centroid as the mean of its pixels; remove centroids with zero pixels (keep order)
final pass: assign once more → counts per centroid
```
On images whose colors are exactly a few distinct values (the fixtures), this converges to those exact colors: duplicate centroids lose all their pixels to the lower index and are removed.

### A9. Candidates
```
buildCandidates(px, range):
  ids = inRangeIndices(px, range); total = ids.length; if total == 0 → []
  centroids, counts = refine(medianCut(px, ids))
  entries = centroids.map(c → { hex: labToHex(c), count })
  merge entries with identical hex (sum counts)
  keep entries with count / total >= MIN_CANDIDATE_SHARE   (if that removes all, keep all)
  sort by count desc, then valueOfHex asc, then hex asc (plain string compare)
  index = position; lab = hexToLab(hex); value = valueOfHex(hex); share = count / total
```
Stripes (synthetic, 300×50) → six candidates, each share 1/6, in index order `#000000 #0000FF #FF0000 #00FF00 #FFFF00 #FFFFFF`. Near-duplicates → `#3060C0` (0.40), `#3161C1` (0.20), `#3262C2` (0.15), then `#2F5FBF`/`#3060C2` (0.10 each, ordered by value then hex), `#E02020` (0.05).

### A10. Greedy selection (`core/select.ts`)
```
selectPalette(cands, controls, locked: Hex[], excluded: number[]): ExtractResult
  v = varietyFactor(controls.variety);  h = hueFactor(controls.hueWeight)
  chosen = locked.map(hexToLab)
  eligible = cands (index order) where index ∉ excluded and deltaE(c.lab, x) >= MIN_DISTINCT_DE for every x in chosen
  target = controls.size - locked.length;  picks = []
  while picks.length < target and eligible not empty:
    if chosen is empty:  best = eligible[0]                               // largest share
    else:
      for c in eligible (index order):
        D = min over x in chosen of weightedDistance(c.lab, x, h)
        score = Math.pow(c.share, 1 - v) * Math.pow(D, v)                 // Math.pow(y, 0) === 1
        if score > bestScore: best = c                                    // strict ">" → ties keep lower index
    picks.push({ hex: best.hex, candidateIndex: best.index });  chosen.push(best.lab)
    eligible = eligible.filter(c => deltaE(c.lab, best.lab) >= MIN_DISTINCT_DE)   // also removes best
  shortfall = picks.length < target
```
Why multiplicative: `share^(1−v) · D^v` is invariant to scaling either factor, so no normalization constants are needed. v=0 is pure frequency, v=1 pure distinctness, and the floor holds at both ends.
Traps: an additive score with ad-hoc normalization; skipping the floor at low variety; using the weighted distance for the floor (then colors that differ only in hue look identical at low hue weight; the floor must use plain ΔE); ignoring locked colors as anchors.
Properties to test: prefix stability (for the same inputs, the size-n picks are the first n of the size-(n+1) picks); no pair in `locked ∪ picks` is closer than 0.04; determinism.
Vectors: Appendix B §B1, plus the stripes expectations in §6.

### A11. Re-roll (`core/reroll.ts`)
```
reroll(cands, params, prevExcluded, currentPicks /* candidate indexes of unlocked extracted entries shown */):
  target = currentPicks.length
  e1 = sortedUnion(prevExcluded, currentPicks);  r = select(..., e1);  if r.picks.length >= target → return { r, excluded: e1 }
  e2 = sorted(currentPicks);                     r = select(..., e2);  if r.picks.length >= target → return { r, excluded: e2 }
  return { r: select(..., []), excluded: [] }
```
Vectors: Appendix B §B2.

### A12. Palette entry operations (`core/paletteOps.ts`)
Invariant: `entries` = locked entries first, then unlocked, and hexes are unique.
```
mergeExtraction(prev, picks, size):
  locked = prev.filter(e => e.locked)
  fresh  = picks.filter(p => every l in locked: deltaE(lab(p.hex), lab(l.hex)) >= MIN_DISTINCT_DE)
                .map(p => ({ hex: p.hex, locked: false, origin: 'extracted', candidateIndex: p.candidateIndex }))
  return [...locked, ...fresh].slice(0, max(size, locked.length))

addPickedColor(entries, size, hex, origin): { entries, size, outcome }
  lab = hexToLab(hex);  newE = { hex, locked: true, origin, candidateIndex: null }
  if some locked e has deltaE(lab(e.hex), lab) < MIN_DISTINCT_DE → outcome 'duplicate' (no change)
  u = first unlocked e with deltaE(lab(e.hex), lab) < MIN_DISTINCT_DE
  if u:  remove u; insert newE right after the last locked entry → 'replaced' (size unchanged)
  elif size < PALETTE_SIZE_MAX:  insert newE after the last locked entry; size + 1 → 'added'
  elif some unlocked entry exists:  remove the LAST unlocked entry; insert newE after the last locked → 'added' (size 16)
  else → 'full' (no change)

removeEntry(entries, size, hex): { entries, size, needsExtraction }
  entries' = entries without hex;  size' = max(PALETTE_SIZE_MIN, size - 1)
  needsExtraction = entries'.length < size'
sizeMin(entries) = max(PALETTE_SIZE_MIN, count of locked)
```
Vectors (U = unlocked extracted, L = locked):
- `E0 = [#000000 U, #FFFFFF U]`, size 2. `add #FFFF00` → `[#FFFF00 L, #000000 U, #FFFFFF U]`, size 3, `added`.
- `add #FFFFFF` to E0 → `[#FFFFFF L, #000000 U]`, size 2, `replaced`.
- `[#FFFFFF L, #000000 U]` + `#FEFEFE` → `duplicate`.
- 16 entries = grays `grayHexForValue(6k)` for k = 0..15, first locked, rest unlocked, size 16; add `#FF0000` → entries `[gray0 L, #FF0000 L, gray6 … gray84 U]` (gray90 removed), size 16, `added`.
- the same 16 all locked + `#FF0000` → `full`.
- `mergeExtraction([#0000FF L], picks [#000000 (idx0), #0000FF (idx1), #FF0000 (idx2)], 3)` → `[#0000FF L, #000000 U, #FF0000 U]` (the duplicate pick is dropped).
- `removeEntry([#FF0000 L, #000000 U], 2, '#FF0000')` → `[#000000 U]`, size 2, `needsExtraction: true`.

### A13. Engine, message handler, worker shell
```ts
class PaletteEngine {
  load(imageId: number, display: RgbaImage, processing?: RgbaImage): LoadedInfo
    // processing ??= downsampleBox(display, PROCESS_MAX_EDGE); pixels = toLabPixels(processing)
    // histogram = valueHistogram(pixels); valueMap = valueMap(display); keep display for the lazy mask image
    // clear caches; remember imageId
  extract(params: ExtractParams): ExtractResult                 // candidates cached per "min-max", LRU 8
  reroll(params: ExtractParams, currentPicks: number[]): { result: ExtractResult; excluded: number[] }
  coverage(palette: Hex[], range: ValueRange): { shares: number[]; inRangePixelCount: number }
  labelMap(palette: Hex[], range: ValueRange): { width: number; height: number; labels: Uint8Array } // mask image built once lazily
  getProcessing(): RgbaImage
}
handleMessage(engine, req): { res: Res; transfer: ArrayBuffer[] }   // never throws; errors → { kind: 'error', reqId, imageId, message }
```
Requests whose `imageId` differs from the engine's current one return `error` with message `'stale-image'`; the client silently ignores those.
`src/worker/engine.worker.ts`, complete:
```ts
import { PaletteEngine } from '../core/engine';
import { handleMessage } from '../core/handleMessage';
import type { Req } from '../core/protocol';

const engine = new PaletteEngine();
self.onmessage = (e: MessageEvent<Req>) => {
  const { res, transfer } = handleMessage(engine, e.data);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(res, transfer);
};
```

### A14. Coverage and label map (`core/coverage.ts`)
```
nearestIndex(lab, paletteLabs): argmin squared deltaE; ties → lower index
coverageShares(px, range, palette): for each in-range processing pixel, counts[nearestIndex]++;
  shares[i] = counts[i] / inRangeCount   (all 0 when inRangeCount = 0)
labelMap(mask: RgbaImage, range, palette): Uint8Array(w*h); transparent or out-of-range → 255; else nearestIndex
```
Vectors: synthetic stripes with palette `[#000000, #FFFFFF]` → shares `[1/3, 2/3]` (blue → black at ΔE 0.5499; red 0.4526, green 0.3237 and yellow 0.2134 → white). With the six stripe colors → each 1/6. Range 0–10 → `[0, 0]`, inRangePixelCount 0.

### A15. Lookup-table rendering (`core/lut.ts`)
```
packRgba(r, g, b, a) = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0     // little-endian: Uint32 over RGBA bytes
applyLut(map: Uint8Array, lut: Uint32Array /*256*/, out: Uint32Array) → out[i] = lut[map[i]]
overlayLut(range, s: OverlaySettings):
  alpha = round(s.opacity / 100 × 255);  lut = Uint32Array(256) (zeros)
  for v in 0..100:
    if v < range.min: lut[v] = s.mode === 'tint' ? pack(s.darkTint, alpha)  : pack(gray(round(v × OVERLAY_DIM_FACTOR)), alpha)
    if v > range.max: lut[v] = s.mode === 'tint' ? pack(s.lightTint, alpha) : pack(gray(round(v × OVERLAY_DIM_FACTOR)), alpha)
grayLut():                     lut[v] = pack(grayHexForValue(v), 255) for v ≤ 100
notanLut(thresholds, bands):   lut[v] = pack(grayHexForValue(round(bandOf(v, t) / (bands − 1) × 100)), 255)
highlightLut(selected):        lut[i] = i === selected ? 0 : packRgba(0, 0, 0, SHOW_WHERE_DIM_ALPHA)   (for all 256, including 255)
```
Index 255 (transparent) is always 0, except in `highlightLut`, where it's dimmed like any non-match.
Main-thread render: `const img = new ImageData(w, h); applyLut(map, lut, new Uint32Array(img.data.buffer)); ctx.putImageData(img, 0, 0);`. One write per pixel keeps live dragging fast even at 2048 px.
Vectors: `packRgba(255,0,0,255) = 0xFF0000FF`. Range 40–60, opacity 60 (alpha 153), defaults: `lut[39] = pack(0x1E,0x5B,0xFF,153)`, `lut[40] = 0`, `lut[60] = 0`, `lut[61] = pack(0xFF,0x1E,0xC8,153)`, `lut[255] = 0`. Dim mode: `lut[39] = pack(0x16,0x16,0x16,153)` (value `round(19.5) = 20` → `#161616`). `grayLut()[63] = pack(0x89,0x89,0x89,255)`.

### A16. Notan (`core/notan.ts`)
```
percentile(hist, p): N = sum(hist); if N == 0 → 0; k = max(1, ceil(p/100 · N)); return smallest v with cumulative(v) >= k
autoThresholds(hist, bands):
  lo = percentile(hist, NOTAN_PERCENTILE_LOW);  hi = percentile(hist, NOTAN_PERCENTILE_HIGH)
  if hi - lo < bands: lo = 0; hi = 100
  return [ round(lo + i · (hi - lo) / bands)  for i = 1 .. bands-1 ]          // strictly increasing, within 1..100
bandOf(v, t) = count of t_i with t_i <= v
```
Manual thresholds come from the multi-handle slider (minGap 1, bounds 1..100).
Vectors: Appendix B §B4.

### A17. Gamut mapping (`core/gamut.ts`)
```
inGamut(lab): every channel of labToLinear(lab) is within [-1e-6, 1 + 1e-6]
lchToHexMapped(L, C, h):
  L = clamp(L, 0, 1)
  if inGamut(lchToLab(L, C, h)) return labToHex(lchToLab(L, C, h))
  lo = 0; hi = C
  repeat GAMUT_BISECT_STEPS (24): mid = (lo + hi) / 2; if inGamut(lchToLab(L, mid, h)) lo = mid else hi = mid
  return labToHex(lchToLab(L, lo, h))
```
Keeps lightness and hue and gives up chroma (the artist-friendly choice). Vectors: `lchToHexMapped(0.7, 0.4, 150) = '#00BE58'` (result L 0.7005, h 150.03°); `lchToHexMapped(0.5, 0.1, 30) = '#944B40'` (already in gamut).

### A18. Harmony (`core/harmony.ts`)
```
complementAccent(hexes, shares | null): Hex | null
  w_i = shares ? shares[i] : 1 / n
  over entries with C_i >= ACHROMATIC_C:  X = Σ w_i·C_i·cos(h_i);  Y = Σ w_i·C_i·sin(h_i)
  if none chromatic or hypot(X, Y) < 1e-6 → null
  H = atan2(Y, X) in degrees [0, 360);  accentHue = (H + 180) mod 360
  L = median of ALL entries' L (even count → mean of the two middle values)
  C = max C among chromatic entries
  hex = lchToHexMapped(L, C, accentHue);  if deltaE to any entry < MIN_DISTINCT_DE → null;  return hex

shiftToward(h, anchor, step):
  d = ((anchor - h) mod 360 + 360) mod 360;  if d > 180: d -= 360        // d in (-180, 180]; exactly 180 → +180
  return normalize360(h + sign(d) · min(|d|, step))

temperatureShift(hexes, anchor):   // anchor = HARMONY_WARM_HUE (60) or HARMONY_COOL_HUE (250)
  each hex: [L, C, h] = lch;  C < ACHROMATIC_C ? lchToHexMapped(L, HARMONY_NEUTRAL_TINT_C, anchor)
                                               : lchToHexMapped(L, C, shiftToward(h, anchor, HARMONY_TEMP_SHIFT_DEG))
  then drop any result closer than MIN_DISTINCT_DE to an earlier one (keep first)
```
Vectors: Appendix B §B5.

### A19. LatestOnlyScheduler (`core/scheduler.ts`)
```
class LatestOnlyScheduler<P> {
  constructor(send: (payload: P, reqId: number) => void)
  request(p): if nothing in flight → id = nextId++; inFlight = id; send(p, id)   else pending = p (replaces older pending)
  onResponse(reqId): boolean            // true = deliver this response to the app
    if reqId !== inFlight → return false
    inFlight = null; if pending → send it (as in request) and clear pending
    return true
  reset(): inFlight = null; pending = null
}
```
Vectors: `request(A)` → `send(A,1)`; `request(B)`, `request(C)` → nothing sent; `onResponse(1)` → `true` and `send(C,2)`; `onResponse(2)` → `true`, nothing sent. After `request(D)` (`send(D,3)`) and `reset()`: `onResponse(3)` → `false`. `request(E)` after reset → `send(E,4)` immediately.
Trap: discarding in-flight results whenever something newer is queued means **no** live updates during a continuous drag. Deliver them; they're in order.

### A20. Sorting (`core/sort.ts`)
```
value:       value asc, then L asc, then hex asc
hue:         chromatic (C >= ACHROMATIC_C) first by hue asc, then value asc, then hex;
             then achromatic by value asc, then hex
saturation:  C desc, then value asc, then hex
frequency:   coverage share desc (missing → -1), then value asc, then hex
```
Vectors, stripes palette:
- value → `#000000 #0000FF #FF0000 #00FF00 #FFFF00 #FFFFFF`
- hue → `#FF0000 #FFFF00 #00FF00 #0000FF #000000 #FFFFFF`
- saturation → `#0000FF #00FF00 #FF0000 #FFFF00 #000000 #FFFFFF`
- frequency, palette `[#000000, #FFFFFF]` with shares `[1/3, 2/3]` → `#FFFFFF #000000`

### A21. Slider logic (`core/sliderLogic.ts`, N handles)
```
posToValue(x, left, width, lo, hi): clamp(round((x - left) / width · (hi - lo)) + lo, lo, hi)
moveHandle(values, i, target, minGap, lo, hi): copy; values[i] = clamp(target,
      i > 0 ? values[i-1] + minGap : lo,  i < n-1 ? values[i+1] - minGap : hi)       // never crosses or pushes
pickHandle(values, v): index | null
  nearest by |values[i] - v|; equidistant distinct handles → lower index
  if the nearest handles are stacked (equal values): v < value → lowest of them; v > value → highest; v == value → null
  (null: decide on the first pointermove: moving down → lowest stacked index, up → highest)
keys: ArrowLeft/ArrowDown −1; ArrowRight/ArrowUp +1; PageDown/Shift+Arrow −10/+10; Home → lower bound; End → upper bound
```
Vectors (lo 0, hi 100): `posToValue(150, 100, 200) = 25`; `posToValue(50, 100, 200) = 0`; `posToValue(310, 100, 200) = 100`; `moveHandle([20,60], 0, 70, 0) = [60,60]`; `moveHandle([20,60], 1, 10, 0) = [20,20]`; `moveHandle([20,40,60], 1, 60, 1) = [20,59,60]`; `pickHandle([20,60], 30) = 0`; `pickHandle([20,60], 40) = 0`; `pickHandle([50,50], 30) = 0`; `pickHandle([50,50], 70) = 1`; `pickHandle([50,50], 50) = null`.

### A22. PNG card layout (`core/export/pngCardLayout.ts`)
```
cols = min(n, CARD_COLS_MAX); rows = ceil(n / CARD_COLS_MAX)
width  = 2·PAD + cols·SW + (cols−1)·GAP
height = 2·PAD + rows·(SW + LABEL_H) + (rows−1)·GAP
cell i: col = i mod cols; row = floor(i / cols); x = PAD + col·(SW + GAP); y = PAD + row·(SW + LABEL_H + GAP)
swatch rect (x, y, SW, SW) + 1 px inner stroke; label = hex, centered at x + SW/2, baseline y + SW + 30
canvas = (width·CARD_SCALE) × (height·CARD_SCALE); draw with ctx.scale(CARD_SCALE, CARD_SCALE); background CARD_BG
```
Vectors: n=2 → 400×268; n=6 → 1104×268 (PNG 2208×536); n=8 → 1456×268; n=9 → 1456×488 with cell 8 at (32, 252); n=16 → 1456×488.

### A23. `.aco` writer (`core/export/aco.ts`), big-endian
```
section 1: u16 1, u16 n, then per color: u16 0 (RGB), u16 r·257, u16 g·257, u16 b·257, u16 0
section 2: u16 2, u16 n, then per color: the same 10 bytes, u32 (name.length + 1), name as UTF-16BE code units, u16 0
name = the hex code with '#'; colors in display order; MIME application/octet-stream
```
Traps: ×256 (255 → 65280, not full intensity), little-endian, omitting section 1, forgetting the `+1`/terminator.
Vector, `[#FFBE98]` (48 bytes):
`00 01 00 01 00 00 FF FF BE BE 98 98 00 00 00 02 00 01 00 00 FF FF BE BE 98 98 00 00 00 00 00 08 00 23 00 46 00 46 00 42 00 45 00 39 00 38 00 00`
Vector, `[#000000, #0A1B2C]` (88 bytes):
`00 01 00 02 00 00 00 00 00 00 00 00 00 00 00 00 0A 0A 1B 1B 2C 2C 00 00 00 02 00 02 00 00 00 00 00 00 00 00 00 00 00 00 00 08 00 23 00 30 00 30 00 30 00 30 00 30 00 30 00 00 00 00 0A 0A 1B 1B 2C 2C 00 00 00 00 00 08 00 23 00 30 00 41 00 31 00 42 00 32 00 43 00 00`

### A24. `.cls` writer (`core/export/cls.ts`), **little-endian**
```
ASCII "SLCC" (53 4C 43 43); u16 256
u32 headerLen = asciiName.length + utf8Name.length + 8
u16 asciiName.length; asciiName       // per UTF-16 CODE UNIT (index loop, not for..of): < 128 kept, else '?' (0x3F)
u32 0
u16 utf8Name.length; utf8Name         // UTF-8 bytes (core/utf8.ts)
u32 4; u32 colorCount; u32 colorCount·12
per color: u32 8; R, G, B, 0xFF; u32 0
```
The name is cut to `NAME_MAX_LEN` characters first. Alpha is always 0xFF (CSP treats any non-zero alpha as opaque).
Trap: writing big-endian like `.aco`. These two formats use **opposite** byte orders.
Vectors: name `AABBCC`, color `#AABBCC` → must equal `fixtures/cls/AABBCC.cls` (54 bytes):
`53 4C 43 43 00 01 14 00 00 00 06 00 41 41 42 42 43 43 00 00 00 00 06 00 41 41 42 42 43 43 04 00 00 00 01 00 00 00 0C 00 00 00 08 00 00 00 AA BB CC FF 00 00 00 00`
Name `"a\u00A1\u0800\u{12000}"`, color `#AABBCC` → must equal `fixtures/cls/unicode.cls` (57 bytes; the ASCII name is `a????`, five code units):
`53 4C 43 43 00 01 17 00 00 00 05 00 61 3F 3F 3F 3F 00 00 00 00 0A 00 61 C2 A1 E0 A0 80 F0 92 80 80 04 00 00 00 01 00 00 00 0C 00 00 00 08 00 00 00 AA BB CC FF 00 00 00 00`
Name `Sunset`, colors `#FFBE98, #203040` (66 bytes):
`53 4C 43 43 00 01 14 00 00 00 06 00 53 75 6E 73 65 74 00 00 00 00 06 00 53 75 6E 73 65 74 04 00 00 00 02 00 00 00 18 00 00 00 08 00 00 00 FF BE 98 FF 00 00 00 00 08 00 00 00 20 30 40 FF 00 00 00 00`
UTF-8 vectors: `"a"` → `61`; `"\u00A1"` → `C2 A1`; `"\u0800"` → `E0 A0 80`; `"\u{12000}"` → `F0 92 80 80`; a lone surrogate `"\uD800"` → `EF BF BD`.

### A25. Base64 (`core/base64.ts`)
RFC 4648 standard alphabet with `=` padding. `decode` strips ASCII whitespace and returns `null` for any other invalid input.
Vectors: `""`→`""`; `"f"`→`"Zg=="`; `"fo"`→`"Zm8="`; `"foo"`→`"Zm9v"`; `"foob"`→`"Zm9vYg=="`; `"fooba"`→`"Zm9vYmE="`; `"foobar"`→`"Zm9vYmFy"`; bytes `00 FF 10 80` → `"AP8QgA=="`; `decode("Zm9v!") = null`; round trip of a 1 MB seeded buffer.
Trap: `btoa(String.fromCharCode(...bytes))` overflows the call stack on large images; and `btoa` isn't available in core anyway.

### A26. Settings (`core/settings.ts`)
```
parseSettings(raw: string | null): Settings      // never throws
  null, invalid JSON, non-object, or v !== 1 → defaults
  each field validated on its own; invalid → that field's default
  numbers: Math.round then clamp to their ranges; valueRange with min > max → swap
  colors via parseHex; enums checked; booleans must be booleans
serializeSettings(s) → JSON with "v": 1
```
Vectors: `null` → defaults; `'garbage'` → defaults; `'{"v":2}'` → defaults; `'{"v":1,"controls":{"size":40}}'` → size 16, everything else default; `'{"v":1,"controls":{"valueRange":{"min":70,"max":20}}}'` → `{min:20,max:70}`; `'{"v":1,"overlay":{"darkTint":"#abc123"}}'` → darkTint `#ABC123`; `'{"v":1,"controls":{"variety":"high"}}'` → variety 50.

### A27. Palette file (`core/paletteFile.ts`). Schema in Appendix C §C6.
```
parsePaletteFile(text, now): { ok: true; palettes: ImportedPalette[]; skipped: number } | { ok: false; error: StringKey }
  JSON.parse fails → 'ERR_FILE_NOT_JSON'
  format !== 'palette-picker' or palettes not an array or version not an integer ≥ 1 → 'ERR_FILE_WRONG_FORMAT'
  version > 1 → 'ERR_FILE_NEWER_VERSION'
  each palette (invalid ones are skipped and counted):
    id: string, 1–100 chars (required)
    name: trimmed, cut to NAME_MAX_LEN; empty → 'Untitled'
    tags: parseTags(tags.join(','))
    colors: 1–16 items, each { hex: parseHex (required), locked: boolean (default false), origin: enum (default 'extracted') };
            drop repeated hexes; none valid → skip palette
    controls: validated like settings (invalid → defaults); size = clamp(size, max(2, lockedCount), 16)
    sortMode: enum, default 'value'
    createdAt / updatedAt: must match /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/ else `now`
    thumbnail: { mime ∈ image/jpeg|image/png|image/webp, base64 decodes } else null
    image: null or both { display: {mime jpeg|png, width, height, base64}, processing: {mime 'image/png', width, height, base64} } valid, else null
  no palettes and skipped == 0 → 'ERR_FILE_EMPTY'

planImport(existing: Map<id, updatedAt>, incoming): { insert: string[]; update: string[]; skip: string[] }
  within incoming, a repeated id keeps the newest updatedAt (others → skip)
  id not in existing → insert;  incoming.updatedAt > existing.updatedAt (string compare; same ISO format) → update;  else → skip
```
Vectors: existing `{A: 2026-10-01T00:00:00.000Z, B: 2026-10-05T00:00:00.000Z}`, incoming `[A @ 2026-10-03…, B @ 2026-10-04…, C @ 2026-10-02…]` → `{insert: [C], update: [A], skip: [B]}`. A file with `"version": 2` → `ERR_FILE_NEWER_VERSION`. A palette with 17 colors, or with a bad hex as its only color → skipped. Round trip: `parsePaletteFile(serializePaletteFile(x))` deep-equals `x`, including image bytes.

### A28. Library helpers and file names (`core/library.ts`, `core/fileNames.ts`)
- `parseTags(text)`: split on commas → trim → lowercase → drop empties → dedupe (keep first) → cut each to `TAG_MAX_LEN` → at most `TAGS_MAX`. Vector: `"Sky, warm ,sky,, Sunset "` → `["sky","warm","sunset"]`.
- `matchesSearch(record, q)`: `q.trim().toLowerCase()`; empty → true; otherwise the name or any tag contains it.
- `sanitizeFileBase(name)`: remove characters outside `[A-Za-z0-9 _-]` → trim → collapse whitespace runs to `-` → cut to 60 → empty → `palette`. Vectors: `"Sunset / Beach #2"` → `"Sunset-Beach-2"`; `"  ***  "` → `"palette"`; `"Café au lait"` → `"Caf-au-lait"`.
- `timestampPart({y,mo,d,h,mi})` → `"20261010-1403"`; `datePart` → `"20261010"`; `defaultPaletteName` → `"Palette 2026-10-10"`; `defaultColorSetName` → `"Palette 2026-10-10 14:03"`. (The platform layer reads the local clock and passes the parts in.)
- Names: unsaved → `palette-20261010-1403.aco|.png|.cls`; saved → `<sanitized>.aco|.png|.cls`; palette file → `<sanitized>.palette.json`; export all → `palette-library-20261010.palette.json`.

### A29. Pointer → image pixel (`core/geometry.ts`)
```
clientToImage(cx, cy, rect {left, top, width, height}, imgW, imgH): {x, y} | null
  x = floor((cx - rect.left) / rect.width · imgW);  y = floor((cy - rect.top) / rect.height · imgH)
  outside [0, imgW) × [0, imgH) → null
```
Vectors, rect `{left:100, top:50, width:300, height:50}`, image 600×100: `(250,75)` → `{x:300,y:50}`; `(100,50)` → `{0,0}`; `(399.9,99.9)` → `{599,99}`; `(400,75)` → `null`; `(99,75)` → `null`.

---

## Appendix B — Worked examples (each becomes a test)

### B1. Greedy selection on five candidates (`select.test.ts`)
Candidates are given directly (shares sum to 1; `hueWeight` factor h = 1, so the weighted distance equals ΔE; to get h = 1 pass slider value 100):

| idx | name | L | a | b | share |
|---|---|---|---|---|---|
| 0 | c0 | 0.30 | 0.00 | 0.00 | 0.40 |
| 1 | c1 | 0.33 | 0.00 | 0.00 | 0.25 |
| 2 | c2 | 0.40 | 0.00 | 0.00 | 0.15 |
| 3 | c3 | 0.80 | 0.10 | 0.05 | 0.12 |
| 4 | c4 | 0.60 | −0.10 | −0.10 | 0.08 |

Distances: c0–c1 0.0300 (< 0.04 → c1 is knocked out as soon as c0 is chosen), c0–c2 0.1000, c0–c3 0.512348, c0–c4 0.331662, c2–c3 0.415331, c3–c4 0.320156.

*(For this test, build `Candidate` objects with these `lab`s and shares and give each a placeholder hex such as `#000001`…`#000005`; selection reads only `lab`, `share`, `index`.)*

| size | variety | result (selection order) | shortfall |
|---|---|---|---|
| 3 | 0 | c0, c2, c3 | no |
| 3 | 25 | c0, c3, c2 | no |
| 3 | 50 | c0, c3, c4 | no |
| 3 | 75 | c0, c3, c4 | no |
| 3 | 100 | c0, c3, c4 | no |
| 4 | 0 | c0, c2, c3, c4 | no |
| 5 | 0 | c0, c2, c3, c4 | **yes** (c1 can never enter) |
| 3, hue slider 0 (h = 0.1) | 50 | c0, c3, c4 | no |
| 3, locked = [c3's color] | 0 | picks c0, c2 (c3 is the anchor) | no |

Walk-through, variety 25 (v = 0.25): round 1 picks c0 (largest share). Round 2: D(c2) = 0.10000 → score `0.15^0.75 · 0.10^0.25` = 0.13554; D(c3) = 0.51235 → 0.17250; D(c4) = 0.33166 → 0.11415; pick **c3**. Round 3: c2 D = min(0.10000, 0.41533) = 0.10000 → 0.13554; c4 D = min(0.33166, 0.32016) = 0.32016 → 0.11315; pick **c2**. Assert these intermediate scores if you expose a `scoreCandidate` helper.

### B2. Re-roll on nine grays (`reroll.test.ts`)
Candidates g1…g9: `lab = [0.1·k, 0, 0]`, `share = (10 − k) / 45` for k = 1..9 (index = k − 1). Size 3, variety 0, nothing locked.
1. Initial `select` → g1, g2, g3.
2. `reroll(prevExcluded [], currentPicks [0,1,2])` → g4, g5, g6; excluded `[0,1,2]`.
3. `reroll([0,1,2], [3,4,5])` → g7, g8, g9; excluded `[0,1,2,3,4,5]`.
4. `reroll([0..5], [6,7,8])` → first try excludes everything (0 picks); second try excludes only `[6,7,8]` → g1, g2, g3; excluded `[6,7,8]`. **Cycles back.**
5. With g1 locked (size 3): initial picks g2, g3; `reroll([], [1,2])` → g4, g5.

### B3. Why linear-light averaging and OKLab value matter
- A 2×1 black|white image averaged in sRGB bytes gives 128 (`#808080`, value 60). Averaged in linear light it gives 188 (`#BCBCBC`, value ≈ 78), which is what the eye sees when the pixels blur together. Test: `downsampleBox` gives 188.
- HSV puts `#FFFF00` and `#0000FF` both at V = 100; OKLab puts them at 97 and 45. A "moody darks only" range of 0–50 must include `#0000FF` and exclude `#FFFF00`. Test: on the stripes, range 0–50 → `#000000 #0000FF` + shortfall.

### B4. Notan thresholds (`notan.test.ts`)
Histogram: 10 pixels at value 5, 490 at 30, 400 at 60, 100 at 90 (N = 1000).
- p2: k = ceil(20) = 20 → cumulative(5) = 10 < 20, cumulative(30) = 500 ≥ 20 → **30**. p98: k = 980 → cumulative(60) = 900 < 980, cumulative(90) = 1000 → **90**.

| bands | thresholds | band grays |
|---|---|---|
| 2 | [60] | `#000000 #FFFFFF` |
| 3 | [50, 70] | `#000000 #636363 #FFFFFF` |
| 4 | [45, 60, 75] | `#000000 #353535 #959595 #FFFFFF` |
| 5 | [42, 54, 66, 78] | `#000000 #222222 #636363 #AEAEAE #FFFFFF` |

- `bandOf(49, [50,70]) = 0`; `bandOf(50, [50,70]) = 1`; `bandOf(70, [50,70]) = 2`.
- Degenerate: all 1000 pixels at value 50 → p2 = p98 = 50 → span 0 < bands → use 0..100 → 3 bands → [33, 67].
- Stripes processing histogram (2500 px each at 0, 45, 63, 87, 97, 100): p2 = 0, p98 = 100 → 2 bands → [50].

### B5. Harmony (`harmony.test.ts`, `gamut.test.ts`)
- Accent: hexes `[#FF8000, #CC5500, #404040]`, shares `[0.5, 0.3, 0.2]` → weighted mean hue 50.34° (the gray is achromatic and ignored), accent hue 230.34°, L = median(0.3715, 0.5948, 0.7319) = 0.5948, C = 0.1858 → out of gamut → mapped to **`#008AB8`** (resulting C ≈ 0.1195, h ≈ 230.8°).
- Neutral palette `[#000000, #808080, #FFFFFF]` → `null`.
- `shiftToward` toward 60 by 12: 100→88, 65→60, 300→312, 60→60, 240→252 (exactly 180° away → rotate toward increasing hue). Toward 250: 300→288, 70→82, 250→250, 100→112.
- `temperatureShift` on single colors: warmer `#808080` → `#8A7E74`, cooler `#808080` → `#77818C`; warmer `#FF0000` → `#E35300`, cooler `#FF0000` → `#FC004D`.
- Stripes palette (value order `#000000 #0000FF #FF0000 #00FF00 #FFFF00 #FFFFFF`): warmer → `#000000 #4200EC #E35300 #9CF000 #FFF6C8 #FFFFFF`; cooler → `#000000 #00569E #FC004D #00FB90 #EAFFB9 #FFFFFF`. (Black and white can't hold chroma, so the gamut mapping returns them unchanged. Yellow loses most of its chroma because hue ≈ 98° at L 0.97 is far outside sRGB. Expected.)

### B6. Import merge (`paletteFile.test.ts`)
Existing library: A (updated 2026-10-01T00:00:00.000Z), B (2026-10-05T00:00:00.000Z). The file contains A (2026-10-03…), B (2026-10-04…), C (2026-10-02…) → insert C, update A, skip B → toast "Imported 2 palettes (1 updated, 1 skipped)." Wording rule: `Imported {inserted + updated} palettes ({updated} updated, {skipped} skipped).`; use "palette" when the count is 1.

---

## Appendix C — Contracts

### C1. Worker protocol (`core/protocol.ts`)
```ts
export interface RgbaMsg { width: number; height: number; buffer: ArrayBuffer }   // RGBA bytes; always transferred

export type Req =
  | { kind: 'ping'; reqId: number }
  | { kind: 'load'; reqId: number; imageId: number; display: RgbaMsg; processing?: RgbaMsg }
  | { kind: 'extract'; reqId: number; imageId: number; params: ExtractParams; reroll?: { currentPicks: number[] } }   // reroll: Phase 11
  | { kind: 'coverage'; reqId: number; imageId: number; palette: Hex[]; valueRange: ValueRange }                     // Phase 13
  | { kind: 'labelMap'; reqId: number; imageId: number; palette: Hex[]; valueRange: ValueRange }                     // Phase 13
  | { kind: 'getProcessing'; reqId: number; imageId: number };                                                       // Phase 16

export type Res =
  | { kind: 'pong'; reqId: number }
  | { kind: 'loaded'; reqId: number; imageId: number; valueMap: RgbaLikeMap; histogram: number[];
      processing: { width: number; height: number } }
  | { kind: 'extracted'; reqId: number; imageId: number; result: ExtractResult; excluded: number[] }
  | { kind: 'coverage'; reqId: number; imageId: number; palette: Hex[]; shares: number[]; inRangePixelCount: number }
  | { kind: 'labelMap'; reqId: number; imageId: number; palette: Hex[]; width: number; height: number; buffer: ArrayBuffer }
  | { kind: 'processing'; reqId: number; imageId: number; image: RgbaMsg }
  | { kind: 'error'; reqId: number; imageId?: number; message: string };

export interface RgbaLikeMap { width: number; height: number; buffer: ArrayBuffer }   // Uint8 value map, 1 byte/pixel
```
After `postMessage(x, [buffer])` the sender's buffer is **detached** (length 0). Never reuse it.

### C2. Engine client (`platform/engineClient.ts`)
```ts
export interface EngineClient {
  ping(): Promise<void>;
  load(display: RgbaImage, processing?: RgbaImage): Promise<{ imageId: number; valueMap: Uint8Array; histogram: number[]; processingWidth: number; processingHeight: number }>;
  extract(params: ExtractParams, extractionRequest: number, reroll?: { currentPicks: number[] }): void;   // result via onExtracted
  coverage(palette: Hex[], range: ValueRange): void;                                                      // via onCoverage
  labelMap(palette: Hex[], range: ValueRange): void;                                                      // via onLabelMap
  getProcessing(): Promise<RgbaImage>;
  onExtracted(cb: (r: ExtractResult, excluded: number[], extractionRequest: number) => void): () => void;
  onCoverage(cb: (palette: Hex[], shares: number[]) => void): () => void;
  onLabelMap(cb: (palette: Hex[], width: number, height: number, labels: Uint8Array) => void): () => void;
  onError(cb: (message: string) => void): () => void;
}
export function getEngineClient(): EngineClient;   // module-level singleton; creates the Worker once
```
`load` bumps `imageId` and resets all schedulers. Results for an old `imageId` are dropped. Each scheduler payload carries the `extractionRequest` (or the palette) so the callback can report it.

### C3. Reducer actions and rules (`state/actions.ts`, `state/reducer.ts`)

| Action | Phase | Effect |
|---|---|---|
| `imageLoadStarted(name)` | 5 | `loading = true`, `error = null` |
| `imageLoaded(info)` | 5 | set `image`; `loading = false`; `excluded = []`; `selectedHex = null`; `coverage = null`; `saved = null`; bump `extractionRequest` |
| `imageLoadFailed(stringKey)` | 5 | `loading = false`; `error` = message; previous image kept |
| `controlsChanged(partial)` | 6 | merge (size clamped to `sizeMin`..16); `excluded = []`; bump `extractionRequest`; `saved.dirty = true` |
| `extractionStarted(request)` | 6 | `pending = true` |
| `extractionSucceeded(result, excluded, request)` | 6 | `entries = mergeExtraction(...)`; `shortfall`; `excluded` (Phase 11+); `appliedRequest = request`; `pending = false` when `request === extractionRequest` |
| `extractionFailed(message, request)` | 6 | `pending = false`; `appliedRequest = request`; toast with `ERR_ENGINE` |
| `toastShown(text, undo?)` / `toastHidden(id)` | 6 | toast |
| `overlayChanged(partial)` | 7 | merge |
| `phoneControlsToggled()` | 9 | flip |
| `lockToggled(hex)` | 11 | flip `locked`; reorder to keep locked-first (a newly locked entry goes after the existing locked ones; a newly unlocked one goes to the front of the unlocked group); clamp `size ≥ sizeMin`; **no** extraction; dirty |
| `entryRemoved(hex)` | 11 | `removeEntry`; bump `extractionRequest` only if `needsExtraction`; dirty |
| `rerollRequested()` | 11 | bump `extractionRequest` with a reroll flag (`useEngine` sends `currentPicks` = candidateIndex of the unlocked entries, in entries order) |
| `eyedropperToggled(on?)` | 12 | flip/set |
| `colorPicked(hex, origin)` | 12 / 20 | `addPickedColor`; toast for `duplicate`/`full`; dirty; **no** extraction |
| `swatchSelected(hex \| null)` | 13 | `selectedHex` |
| `showWhereToggled()` | 13 | flip |
| `coverageReceived(palette, shares)` | 13 | store only if `palette` equals the current entries' hexes (in order) |
| `sortChanged(mode)` | 14 | `sortMode`; dirty |
| `routeChanged(route)` | 16 | `route` |
| `paletteSaved(meta)` | 16 | `saved = {…meta, dirty: false}` |
| `paletteOpened(record, info)` | 16 | set image (from info), controls, entries, sortMode, `saved` (dirty false), `excluded = []`, `selectedHex = null`; **do not** bump `extractionRequest`; set `appliedRequest = extractionRequest` |
| `viewChanged(mode)` / `notanChanged(partial)` | 18 | set; changing `bands` resets `thresholds = null` |
| `harmonyApplied(entries, label)` | 20 | `undo = {entries: old, size: old size, label}`; entries = new; size = new length; dirty; toast with Undo |
| `undoRequested()` | 20 | restore `undo` entries + size; `undo = null` |

**Settled** (for tests, exposed as `data-settled` on `palette`): `image === null || (!pending && appliedRequest === extractionRequest)`. Coverage settled (`data-coverage-settled` on `proportion-bar`): `coverage !== null && coverage.palette` equals the current hexes.

### C4. `core/index.ts`: the only core entry point for `ui/` and `state/`
Export: types; tuning constants; `formatHex`, `parseHex`, `hexToLab`, `valueOfHex`, `grayHexForValue`, `labToLch`; `sortEntries`; `mergeExtraction`, `addPickedColor`, `removeEntry`, `sizeMin`; LUT builders + `applyLut`; `posToValue`, `moveHandle`, `pickHandle`; `clientToImage`; settings parse/serialize; file-name helpers; `aco`, `cls`, `cardLayout`; library helpers; palette-file functions; `autoThresholds`; `complementAccent`, `temperatureShift`. (Platform code may import core modules directly.)

### C5. `data-testid` registry
`app-ready`, `worker-status`, `file-input`, `camera-input`, `import-input`, `drop-zone`, `image-status` (`data-state`), `image-canvas`, `view-canvas`, `overlay-canvas`, `highlight-canvas`, `error-banner`, `toast`, `palette` (`data-settled`), `swatch` (`data-hex`, `data-locked`, `data-selected`), `lock`, `remove`, `copy-all`, `reroll`, `shortfall`, `pending`, `ctl-size`, `ctl-variety`, `ctl-hue`, `ctl-range` (its thumbs: `ctl-range-thumb-0`, `ctl-range-thumb-1`), `overlay-toggle`, `overlay-settings`, `eyedropper`, `show-where`, `selection-chip`, `proportion-bar` (`data-coverage-settled`), `sort-select`, `export-aco`, `export-png`, `export-cls`, `save`, `save-dialog`, `tab-picker`, `tab-library`, `library-search`, `library-card` (`data-id`), `card-open`, `card-edit`, `card-export`, `card-delete`, `confirm-ok`, `confirm-cancel`, `export-all`, `view-color`, `view-gray`, `view-notan`, `notan-bands`, `notan-thresholds`, `notan-auto`, `harmony`, `harmony-accent-add`, `harmony-warmer-apply`, `harmony-cooler-apply`, `undo`, `update-banner`, `install-button`, `controls-toggle`.

### C6. Library records, repository API, palette file schema
```ts
export interface StoredImage { mime: 'image/jpeg' | 'image/png'; width: number; height: number; bytes: ArrayBuffer }
export interface PaletteRecord {
  id: string; name: string; tags: string[];
  entries: { hex: Hex; locked: boolean; origin: EntryOrigin }[];
  controls: Controls; sortMode: SortMode;
  createdAt: string; updatedAt: string;                 // new Date().toISOString() (platform layer)
  thumbnail: { mime: 'image/jpeg' | 'image/png' | 'image/webp'; bytes: ArrayBuffer } | null;
  hasImages: boolean;
}
export interface StoredImages { id: string; display: StoredImage; processing: StoredImage }

export interface LibraryRepo {
  list(): Promise<PaletteRecord[]>;                     // palettes store only, updatedAt desc
  get(id: string): Promise<PaletteRecord | null>;
  getImages(id: string): Promise<StoredImages | null>;
  put(record: PaletteRecord, images: StoredImages | null): Promise<void>;   // one transaction; null keeps existing images
  updateMeta(id: string, patch: { name?: string; tags?: string[]; updatedAt: string }): Promise<void>;
  delete(id: string): Promise<void>;                    // one transaction, both stores
}
```
A palette whose `hasImages` is false (possible only via import) opens with its swatches. The controls are disabled and the notice `NO_IMAGE_STORED` is shown, with a "Load image" button that keeps the locked entries.

Palette file (`*.palette.json`), version 1. No indentation (it's mostly base64).
```json
{
  "format": "palette-picker",
  "version": 1,
  "exportedAt": "2026-10-10T14:03:00.000Z",
  "palettes": [
    {
      "id": "6f1c…",
      "name": "Sunset",
      "tags": ["sky", "warm"],
      "colors": [ { "hex": "#FFBE98", "locked": true, "origin": "extracted" } ],
      "controls": { "size": 6, "variety": 50, "hueWeight": 35, "valueRange": { "min": 0, "max": 100 } },
      "sortMode": "value",
      "createdAt": "2026-10-09T18:22:10.512Z",
      "updatedAt": "2026-10-10T14:01:00.000Z",
      "thumbnail": { "mime": "image/jpeg", "base64": "…" },
      "image": {
        "display":    { "mime": "image/jpeg", "width": 1280, "height": 960, "base64": "…" },
        "processing": { "mime": "image/png",  "width": 300,  "height": 225, "base64": "…" }
      }
    }
  ]
}
```

### C7. PWA configuration
`vite.config.ts` (add to the plugins):
```ts
import { VitePWA } from 'vite-plugin-pwa';
// …
VitePWA({
  registerType: 'prompt',
  injectRegister: false,                 // we register via useRegisterSW in platform/pwa.ts
  includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'Palette Picker',
    short_name: 'Palettes',
    description: 'Pull a palette of clearly different colors from any image.',
    theme_color: '#1E1E1E',
    background_color: '#1E1E1E',
    display: 'standalone',
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
    cleanupOutdatedCaches: true,
  },
  devOptions: { enabled: false },
}),
```
Don't set `start_url` or `scope`: the plugin derives them from `base`. `index.html` head:
```html
<link rel="icon" href="%BASE_URL%favicon.ico" sizes="48x48">
<link rel="icon" href="%BASE_URL%icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="%BASE_URL%apple-touch-icon-180x180.png">
<meta name="theme-color" content="#1E1E1E">
```
(The manifest link is injected by the plugin.)

### C8. `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```
(These were the latest major versions on 2026-10-10. If a run fails with a deprecation error, bump to the newest major and log it. If `npm ci` fails with a missing native binding, see Appendix G #20.)

---

## Appendix D — UI specification

### D1. Layout
**Desktop (≥ 900 px wide):** a full-viewport CSS grid with columns `1fr 400px`.
- Header row (48 px, spanning both columns): "Palette Picker" at the left; from Phase 16 the Picker/Library tabs; the Install button (Phase 10) at the right.
- Left: the **image stage**. A toolbar row (44 px) with: Out-of-range toggle + settings, Eyedropper (12), Show where (13), the view switcher (18), and the selection chip (13). Below it, the image area, centered, as large as fits. The canvases stack in a wrapper with `aspect-ratio: W / H; max-width: 100%; max-height: 100%`, all `position: absolute; inset: 0; width: 100%; height: 100%`, in this order: image → view → overlay → highlight → (loupe outside the wrapper). With no image, the area is the drop zone: a dashed `--border` rectangle with the text `EMPTY_DESKTOP` and a "Browse…" button.
- Right: the **panel** (`--panel`, scrolls vertically, 20 px padding), sections top to bottom: Controls (Colors, Variety, Hue weight, Value range; plus Notan controls in Phase 18 when that view is on) → Palette (header: title, Sort select (14), Copy all, Re-roll (11); swatch grid; shortfall notice; proportion bar (13)) → Export (.aco, PNG card, .cls (19)) → Save (16) → Harmony (20, collapsed).

**Phone (< 900 px):** a single column. The header (44 px; tabs from Phase 16). The image stage (toolbar as 44 px icon buttons with `aria-label`s, the image at most `45dvh` tall). The palette section. A "Controls" disclosure (`controls-toggle`, open by default, persisted). Export. Save. Harmony. With no image: two large buttons, "Choose photo" and "Take photo", plus `EMPTY_PHONE` text. Respect `env(safe-area-inset-*)`. No horizontal scrolling at 360 px wide.

### D2. Controls and swatches
- **Colors:** slider 2–16, step 1, label "Colors" and the current number. Minimum `sizeMin` from Phase 11.
- **Variety:** slider 0–100, label "Variety", end captions "Common" / "Distinct".
- **Hue weight:** slider 0–100, label "Hue weight", end captions "Value & saturation" / "Hue too".
- **Value range:** `RangeSlider` with two handles, label "Value range" and "min – max" numbers; the track shows a dark-to-light gradient of 11 perceptual gray stops and the histogram (Phase 7).
- **Swatch grid:** CSS grid `repeat(auto-fill, minmax(84px, 1fr))` with an 8 px gap on desktop; 4 equal columns on phone. Each tile is a `<button>` (`aria-label` "Copy #FFBE98") with a square color block (border-radius 6 px, 1 px `--border` outline so white is visible) and the hex below it in the monospace font, `--text`, 13 px. The background stays `--panel` (solid, screenshot-friendly). Lock/remove chips sit in the corners of the color block, using the `--chip` style.
- Hover: a subtle 1 px `--text-muted` outline; focus: a `--focus` outline. A selected tile (Phase 13): a 2 px `--text` underline bar below the label.
- **Toast:** bottom-center, `--panel` background with `--border`, 13 px, auto-hides after `TOAST_MS` (or `UNDO_TOAST_MS` with an Undo button).

### D3. Slider component behavior (`Slider`, `RangeSlider`)
- Built from divs with pointer events (**not** two stacked `<input type="range">`, whose thumbs get stuck when they overlap). Each thumb is a focusable element with `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-label` ("Minimum value", "Maximum value", "Threshold 1"…).
- `pointerdown` on the track or a thumb: `pickHandle` (A21), `setPointerCapture`, move per `posToValue` + `moveHandle`; on `pointermove`, if `pickHandle` returned null, decide by the movement direction. `pointerup`/`pointercancel` releases.
- The track has `touch-action: none`. Thumbs are 20 px visually with a 44 × 44 px hit area (pseudo-element).
- Every value change dispatches immediately (live updates; the engine scheduler coalesces).

### D4. Input methods
- **Drop:** `dragover`/`drop` listeners on `window` call `preventDefault()` always (so a stray drop never navigates away from the app). A drop on the stage: use `dataTransfer.files[0]` if present; otherwise, if `types` includes `text/uri-list` or `text/html`, show `ERR_DROPPED_URL`. While dragging over the stage, show a highlight.
- **Browse:** the hidden `file-input`, `accept="image/*"`. Reset `value` after each pick so the same file can be chosen twice.
- **Paste:** a `document` `paste` listener. If `clipboardData.items` has a `kind === 'file'` item with an `image/*` type, load it and `preventDefault()` (even when a text field has focus). Otherwise ignore the event (normal text paste). Never call `navigator.clipboard.read()`.
- **Camera / library (phone):** `camera-input` with `capture="environment"`, and the normal `file-input` for the photo library.

### D5. Decode pipeline (`platform/decodeImage.ts`)
```
decodeImage(file: Blob, name): Promise<{ canvas, rgba: RgbaImage, originalWidth, originalHeight }>
  size 0 or > MAX_INPUT_BYTES → ERR_NOT_IMAGE / ERR_TOO_LARGE
  type: accept image/jpeg, png, webp, gif, heic, heif, avif, bmp (or, when type is empty, those file extensions);
        reject image/svg+xml and everything else → ERR_NOT_IMAGE
  GIF → source = await createImageBitmap(file)            // spec: first frame of an animation
  else → url = URL.createObjectURL(file); img = new Image(); img.src = url; await img.decode()
         (decode rejects → HEIC/HEIF → ERR_HEIC, else ERR_DECODE); w/h = naturalWidth/naturalHeight (EXIF-oriented)
  w·h > MAX_INPUT_PIXELS → ERR_TOO_LARGE
  [dw, dh] = scaledSize(w, h, DISPLAY_MAX_EDGE)
  canvas = document.createElement('canvas'); canvas.width = dw; canvas.height = dh       // never a full-size canvas
  ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(source, 0, 0, dw, dh)
  rgba = ctx.getImageData(0, 0, dw, dh)  → wrap as RgbaImage (copy the data into a new buffer for transfer)
  cleanup: URL.revokeObjectURL(url); bitmap?.close()
```
Don't apply EXIF rotation yourself: browsers already do it for `<img>`, and doing it again double-rotates. The `orient6.jpg` e2e test guards this.

### D6. Saving files (`platform/saveFile.ts`)
| Situation | Method |
|---|---|
| iOS/iPadOS (any mode) and `navigator.canShare?.({ files: [file] })` is true | `navigator.share({ files: [file] })`. Call it **synchronously inside the click handler**, with the bytes already prepared (Appendix G #11). If the user cancels (`AbortError`), do nothing. |
| PNG card on any touch device where `canShare` accepts it | share (so it can go to Photos) |
| Everything else (desktop; Android with .aco/.cls/.json) | `<a download>` with an object URL, revoked after 10 s |

### D7. Library and dialogs
- **Save dialog** (`save-dialog`, a modal `<dialog>`): Name (prefilled `defaultPaletteName` or the saved name; 1–100 chars), Tags (comma-separated; shows the parsed chips live), buttons Save / Cancel; for an already-saved palette, "Save changes" and "Save as new". Enter submits; Esc cancels.
- **Library view:** a toolbar with a search input (`library-search`, placeholder "Search names and tags"), "Import file", and "Export all". Below it, a grid of cards (`repeat(auto-fill, minmax(220px, 1fr))`). Each card: thumbnail (4:3 box, `object-fit: cover`), name, a strip of up to 16 swatches (12 px each), tag chips (clicking one fills the search box), the date (`toLocaleDateString`), and buttons Open / Edit / Export / Delete. Edit opens the same dialog in rename/tags mode. Delete opens a confirm dialog `CONFIRM_DELETE` (`confirm-ok`, `confirm-cancel`). Empty state: `LIBRARY_EMPTY`.
- **iOS hint** (Phase 16): a dismissible banner in the Library when on iOS and not installed: `IOS_STORAGE_HINT` (dismissal stored in localStorage key `palette-picker:ios-hint-dismissed`).

### D8. Strings (`src/ui/strings.ts`), exact text
| Key | Text |
|---|---|
| `EMPTY_DESKTOP` | Drop an image here, paste with Ctrl+V, or browse. |
| `EMPTY_PHONE` | Pick a photo or take a new one. Everything stays on your device. |
| `ERR_NOT_IMAGE` | That file isn't an image this app can read. Try JPEG, PNG, WebP or GIF. |
| `ERR_HEIC` | This browser can't open HEIC photos. Try Safari, or save the photo as JPEG first. |
| `ERR_DECODE` | Couldn't read this image. It may be damaged or in an unsupported format. |
| `ERR_TOO_LARGE` | This image is too large (the limit is 80 megapixels or 100 MB). |
| `ERR_DROPPED_URL` | That was a link, not an image file. Save the image first, or right-click it, choose Copy image, and paste here. |
| `ERR_ENGINE` | Something went wrong while making the palette. Try moving a slider or loading the image again. |
| `ERR_STORAGE_FULL` | Your device's storage for this app is full. Delete some saved palettes and try again. |
| `ERR_FILE_NOT_JSON` / `ERR_FILE_WRONG_FORMAT` | That file isn't a Palette Picker file. |
| `ERR_FILE_NEWER_VERSION` | That file was made by a newer version of Palette Picker. Reload the app to update it. |
| `ERR_FILE_EMPTY` | That file doesn't contain any palettes. |
| `SHORTFALL` | Only {n} clearly different colors in this value range. (n = 1 → "Only 1 clearly different color in this value range.") |
| `NO_PIXELS` | No part of the image falls in this value range. |
| `COPIED_ONE` / `COPIED_ALL` | Copied {hex} / Copied {n} colors |
| `COPY_FAILED` | Couldn't copy automatically. Select the codes below and copy them. |
| `EYEDROPPER_DUP` | Already in the palette |
| `EYEDROPPER_FULL` | The palette is full. Unlock or remove a color first. |
| `HARMONY_NONE` | This palette is neutral, so there's no clear hue to complement. |
| `APPLIED_WARMER` / `APPLIED_COOLER` | Applied the warmer version / Applied the cooler version |
| `SAVED` | Saved "{name}" |
| `CONFIRM_DELETE` | Delete "{name}"? This can't be undone. |
| `CONFIRM_DISCARD` | Discard unsaved changes to "{name}"? |
| `LIBRARY_EMPTY` | No saved palettes yet. Make one in the Picker and press Save. |
| `IMPORT_DONE` | Imported {k} palettes ({u} updated, {s} skipped). |
| `NO_IMAGE_STORED` | This palette was saved without its image. Load an image to keep adjusting it; locked colors stay. |
| `IOS_STORAGE_HINT` | Tip: add Palette Picker to your Home Screen (Share → Add to Home Screen). Safari may clear saved palettes for websites you haven't opened in a week. Export a backup file now and then. |
| `UPDATE_READY` | A new version is ready. |
| `WORKING` | Working… |

---

## Appendix E — Verification matrix (acceptance checklist)

"Auto" rows must be covered by the named test before the milestone gate. "Manual" rows are the human's checklist (§0.2); "device" means a real phone using the deployed HTTPS site.

| # | Feature | How to observe | Expected | Check |
|---|---|---|---|---|
| **M1** | | | | |
| E1 | Drag & drop | Drag an image file from Explorer onto the stage | Image shows; palette appears in < 1 s for a normal photo | auto `input.spec` + manual |
| E2 | Browse | Click Browse…, pick a file | Same as E1 | auto |
| E3 | Paste | In a browser, right-click an image → Copy image; in the app press Ctrl+V | Image loads | auto (synthetic) + manual |
| E4 | Dragged link | Drag an image from another browser tab | Either it loads (if the browser supplied a file) or `ERR_DROPPED_URL` shows; the app never navigates away | auto + manual |
| E5 | Formats | Load JPEG, PNG, WebP, animated GIF; HEIC in Safari; HEIC in Chrome | All load; the GIF uses frame 1; HEIC in Chrome shows `ERR_HEIC` | auto (GIF) + manual |
| E6 | Big photos | Load a 48–50 MP photo | Loads (desktop < 10 s); display ≤ 2048 px | auto (50 MP synthetic) + manual + device |
| E7 | Orientation | Load a portrait phone photo | Upright | auto `orient6` + device |
| E8 | Private | During image load and slider use, record network requests (e2e `page.on('request')`) | Zero requests | auto |
| E9 | Palette size | Move Colors 2 → 16 | Swatch count follows live (or shows the shortfall notice) | auto |
| E10 | Variety | Stripes, size 3: variety 0 vs 100 | `#000000 #0000FF #FF0000` vs `#000000 #0000FF #FFFFFF` | auto |
| E11 | Hue weight | Colorful image with similar values: hue weight 0 vs 100 | At 0 the palette spreads mostly in value/saturation; at 100 more distinct hues | unit (A4/B1) + manual |
| E12 | Distinct colors | near-duplicates fixture at any variety | Two swatches + shortfall notice; never two near-identical blues | auto |
| E13 | Value range | Drag both handles; keyboard arrows on each; handles can meet | Palette limited to the range; the track shows a dark→light gradient | auto + manual |
| E14 | Swatch display | Look at the palette area | Large swatches, hex under each, solid neutral background, nothing else inside; a screenshot pastes cleanly into CSP | manual |
| E15 | Click to copy | Click a swatch; click Copy all | Clipboard `#RRGGBB`; "Copied …" toast; Copy all = one code per line | auto |
| E16 | Into CSP | Paste a copied code into CSP Color Settings → HEX | CSP accepts it (else `COPY_PREFIX` is changed) | manual |
| E17 | Remembered settings | Change sliders, reload | Same settings | auto |
| **M2** | | | | |
| E18 | Out-of-range overlay | gradient-gray, overlay on, range 40–60 | Blue tint at value < 40, magenta at > 60, untinted 40–60 inclusive | auto `overlay.spec` |
| E19 | Overlay settings | Change both tint colors, opacity, switch to Dim | Visible immediately; remembered after reload | auto + manual |
| E20 | Histogram | Load a low-key image | Bars concentrated on the left of the value track | manual (screenshot) |
| E21 | .aco | Download .aco; import into CSP (menu and drag-drop) | A color set with the same colors in display order | auto (bytes) + manual |
| E22 | PNG card | Download PNG card | 2× image, white background, hex labels; pastes into CSP as a layer | auto (dimensions) + manual |
| E23 | Phone layout | Open on a phone | Image on top, swatch grid, collapsible controls, no sideways scrolling, handles easy to drag | auto (Pixel 7) + device |
| E24 | Phone input | Choose photo; Take photo | Photo library picker; camera opens | device |
| E25 | Phone copy | Tap a swatch | Hex copied (paste into Notes to check) | device |
| E26 | Phone save | Save .aco and PNG card on iPhone and Android | iPhone: share sheet (Save to Files / Save Image); Android: download | device |
| E27 | Installable + offline | Install to Home Screen; turn on airplane mode; open it; load a photo | Opens standalone; works fully offline | auto (offline) + device |
| E28 | Updates | Deploy a new version; reopen the installed app | "A new version is ready" + Reload; the current image isn't lost until Reload is pressed | manual |
| **M3** | | | | |
| E29 | Lock | Lock a swatch; move every slider | The locked color stays; the size can't go below the locked count | auto `locks.spec` |
| E30 | Re-roll | Press Re-roll repeatedly | Unlocked colors change each time and eventually cycle; locked ones stay | auto |
| E31 | Eyedropper (desktop) | Eyedropper on, click the image | That exact pixel's color is added, locked; picking an existing locked color says "Already in the palette" | auto |
| E32 | Eyedropper (touch) | Press and hold on the image | A magnifier above the finger; releasing picks the color under the crosshair | device |
| E33 | Proportion bar | stripes | Six equal segments; hovering/tapping shows "#HEX — 17%" | auto |
| E34 | Show where | Click a swatch | The image dims except the areas that color represents; Esc / the chip × clears | auto |
| E35 | Sort | Each sort mode | Orders per A20; Copy all follows the shown order | auto |
| **M4** | | | | |
| E36 | Save | Save with a name and tags | Card with thumbnail, name, swatches, tags; search by name or tag works | auto `library.spec` |
| E37 | Reopen | Reload, open the card | Same image, sliders, colors, locks; sliders keep working | auto |
| E38 | Delete | Delete → confirm | Card gone | auto |
| E39 | Phone → PC | Save on the phone → Export file → move it to the PC → Import | The same palette on the PC, editable | auto (two contexts) + device |
| E40 | Storage safety | iPhone Safari (not installed): open Library | Hint banner about Home Screen and backups | device |
| E41 | Value study | Gray; Notan with 2–5 bands; drag thresholds; Auto | Correct gray/bands; thresholds adjustable; Auto restores | auto + manual |
| E42 | .cls | Download .cls; import into CSP (menu and drag-drop) | A color set with the right name and colors | auto (bytes) + manual |
| E43 | Harmony | Add accent; Apply warmer; Undo; Apply cooler | Accent added as locked; versions applied and locked; Undo restores | auto |
| E44 | Use case 3 | Moody image: range 0–50, overlay on | Only darks and midtones in the palette; the overlay shows what's excluded | manual |
| E45 | Use case 4 | Overlay + Notan on a reference | The light/dark structure is easy to read | manual |
| E46 | Feel | Drag Variety and the value handles continuously, desktop and phone | The palette updates while dragging, not only on release; no jank | manual + device |
| E47 | Keyboard | Tab through the controls; arrows on sliders; Esc closes dialogs, exits the eyedropper, clears the selection | Everything works without a mouse | manual |

---

## Appendix F — Deferred hooks (do not build; do not break the seam)

| Deferred feature | The seam that must keep existing |
|---|---|
| Manual swatch editing (nudge hue/saturation/value) | `EntryOrigin` is a union (a future `'edited'`); the entry ops in `paletteOps.ts` keep the distinctness floor; OKLCH conversion (A3) and `lchToHexMapped` (A17) are in core; edited entries would be locked, like eyedropper picks. No UI now. |
| Paint-mixing hints (parked) | A pure `core/` function `(entries, shares) → hints` would render inside the Harmony section. Nothing now. |
| Accounts / sync / sharing | All persistence goes through the `LibraryRepo` interface (C6); the palette file has `format` + `version`. |
| "Open with" / share target / file handlers | `decodeImage(file: Blob, name)` is the single entry point for any image source. |
| Animated-GIF frame choice | GIF handling is one branch in `decodeImage`. |
| Wide-gamut (P3) hex output | All conversions are in `core/color.ts`; the canvas color space is chosen in one place (`decodeImage`); `Hex` is documented as sRGB. |
| More export formats (.ase, .gpl, Procreate) | Encoders in `core/export/` share the signature `(colors: Hex[], name: string) => Uint8Array`; the export buttons render from one array of `{ label, ext, mime, encode }`. |
| Other languages | All strings are in `ui/strings.ts`. |
| Library schema changes | `DB_VERSION` + `onupgradeneeded` live only in `libraryRepo.ts`; palette files carry `version`. |

---

## Appendix G — Environment gotchas

**Tooling and Windows**
1. The path `G:\pallette app` has a space and sits on a USB hard disk: quote it, expect slower installs, and never write absolute paths into configs or code.
2. Your PowerShell is 5.1: no `&&`. Use `;`, the Bash tool, or npm scripts.
3. Binary fixtures need `.gitattributes` (§2.3). If the fixtures hash test fails right after a checkout, CRLF conversion is the likely cause.
4. **TypeScript 7 is the native (Go) compiler.** Several legacy options are removed or rejected (`baseUrl`, `moduleResolution: "node"`/`"node10"`, `target: "ES5"`, `outFile`, …). Use the tsconfigs from Phase 0 as written. Global `types` are listed explicitly (`vite/client`, `node`, later `vite-plugin-pwa/react`); if `import.meta.env` or `new URL(…, import.meta.url)` fails to type-check, a missing `types` entry is the cause. There's no ESLint because typescript-eslint doesn't support TS 7.
5. **Vite 8 (Rolldown):** create the worker with exactly `new Worker(new URL('../worker/engine.worker.ts', import.meta.url), { type: 'module' })`. Vite detects this literal pattern statically; a computed URL won't be bundled.
6. **Vitest 5:** `environmentMatchGlobs` no longer exists; put `// @vitest-environment jsdom` at the top of component tests. Keep `/// <reference types="vitest/config" />` in `vite.config.ts`.
7. **Playwright:** the base URL contains a path, so navigate with `page.goto('./')`, never `'/'`. Only Chromium is installed, and the iPhone device presets default to WebKit, so use Pixel 7 for phone tests. `reuseExistingServer: false` prevents testing stale builds. Clipboard reads need `permissions: ['clipboard-read', 'clipboard-write']`. Downloads: `const d = await page.waitForEvent('download')`, then read `await d.path()`. Canvas pixels: `page.evaluate` + `getContext('2d').getImageData(x, y, 1, 1).data`.
8. **Synthetic paste/drop in e2e:** in `page.evaluate`, build `const dt = new DataTransfer(); dt.items.add(new File([bytes], name, { type }))`, then dispatch `new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })` on `document`, or `dragover` + `drop` `DragEvent`s with `dataTransfer: dt` on the stage. Pass the bytes from Node as a number array or base64.

**Browser behavior**
9. **Canvas limits:** iOS Safari caps canvas area at about 16.7 MP and fails *silently* (blank canvas). Never create a canvas bigger than the display size; draw from `<img>` straight into the small canvas. If a real 48 MP iPhone photo still fails on device, switch the non-GIF branch to `createImageBitmap(file, { resizeWidth: dw, resizeHeight: dh, resizeQuality: 'high' })` with `dw/dh` from the decoded `<img>`'s natural size, and log it.
10. **EXIF orientation** is applied by the browser for `<img>`/`drawImage`. Don't rotate manually (double rotation). Non-GIF images go through `<img>` because `createImageBitmap`'s orientation default has varied between engines.
11. **User activation:** `navigator.share` (and, on Safari, clipboard writes) must run inside the click handler without first awaiting slow async work, or Safari rejects them. The `.aco`/`.cls` encoders are synchronous. For the PNG card use `canvas.toDataURL('image/png')` plus a synchronous base64 → bytes conversion, not `toBlob`. Call `clipboard.writeText` first thing in the handler.
12. **Secure context:** the Clipboard API, `crypto.randomUUID`, service workers and installability all need HTTPS or `localhost`. Phone testing goes through the GitHub Pages URL, not `http://<LAN-IP>:5173`. Read pasted images from the `paste` event; `navigator.clipboard.read()` triggers permission prompts.
13. **Safari storage eviction:** Safari deletes script-written storage (IndexedDB, localStorage) for websites not visited for 7 days, unless the app is installed to the Home Screen. Mitigations: the iOS hint, `navigator.storage.persist()`, and palette-file backups.
14. **IndexedDB:** store `ArrayBuffer`s, not Blobs (history of Safari bugs). Prepare all bytes **before** opening a transaction: awaiting anything that isn't an IDB request inside an open transaction lets it auto-commit, causing `TransactionInactiveError`. Use one readwrite transaction spanning both stores for put/delete.
15. **Drag and drop:** without `preventDefault()` on `window` `dragover` and `drop`, a drop outside the stage makes the browser navigate to the file, losing the user's work.
16. **Object URLs:** revoke after `img.decode()`. For downloads, revoke after a delay (10 s); revoking immediately can cancel the download.
17. **React 19 StrictMode** runs effects twice in dev. A Worker created in `useEffect` becomes two workers with duplicate requests. Use the module-level `getEngineClient()` singleton; effects only subscribe and unsubscribe.
18. **Transfer detaches buffers:** after `postMessage(msg, [buf])`, `buf` is empty on the sender. The display canvas keeps its own pixels, so the main thread doesn't need the transferred copy.
19. **Uint32 pixel writes** assume little-endian byte order (true on every target device). Check once at startup and log an error if not.
20. **CI and native packages:** a lockfile written on Windows can miss Linux-only optional packages (Rolldown's `@rolldown/binding-linux-x64-gnu`, `sharp`). If `npm ci` or `vite build` fails in Actions with "Cannot find module …binding…", change that workflow step to `npm install --no-audit --no-fund` and log it. Don't delete the lockfile.
21. **GitHub Pages base path:** any URL starting with `/` breaks on Pages. Use relative module imports, `%BASE_URL%` in `index.html`, and `import.meta.env.BASE_URL` in code if ever needed. `base` is set in dev too, so these bugs show up locally.
22. **Service worker:** it exists only in the production build (`vite preview`, `devOptions.enabled: false`), so test PWA behavior through `npm run e2e`. A service worker installed in your normal browser can serve stale files after config changes; use a private window or unregister it in DevTools → Application.
23. `<input type="color">` returns lowercase hex; normalize with `parseHex`.
24. On iOS, `<input type="file" accept="image/*">` usually converts HEIC to JPEG automatically. Desktop Chrome can't decode HEIC, so `ERR_HEIC` is expected there.
25. Android's Web Share rejects most non-media files (`.aco`, `.cls`, `.json`): `canShare` returns false and we download instead (D6). In installed iOS web apps, `<a download>` with blob URLs has historically opened a preview with no way back, which is why iOS uses the share sheet.
26. **Phone performance:** the main thread only does LUT passes and drawing. Never compute OKLab per pixel on the main thread.
27. **Cross-browser resampling:** the display image is downscaled by the browser, and Chrome's and Safari's filters differ slightly, so the same photo can give a marginally different palette in different browsers. Determinism is guaranteed per browser and for the stored processing image (library reopen), which is enough.

---

## Appendix H — Fixture bytes (backup)

Only use this if a file in `fixtures/` is missing or fails the hash test. Recreate each with Node, e.g. `node -e "require('fs').writeFileSync('fixtures/stripes-6.png', Buffer.from('<base64>', 'base64'))"`, then re-run `tests/fixtures.test.ts`. The `.cls` files come from the CLSEncoderDecoder repository (MIT); if lost, their exact bytes are in A24.

| File | Base64 |
|---|---|
| `animated.gif` | `R0lGODlhCAAIAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAKAAAACwAAAAACAAIAAAIDwABCBxIsKDBgwgTKkwYEAAh+QQAKAAAACwAAAAACAAIAIEAAP8AAAAAAAAAAAAIDwABCBxIsKDBgwgTKkwYEAA7` |
| `gradient-gray.png` | `iVBORw0KGgoAAAANSUhEUgAAAQAAAABACAAAAADQNvZiAAAAYUlEQVR42u3QAQEAAAgCIO3/6H4UTKDpb5PnBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIEDABQvUIgF/FSEOyQAAAABJRU5ErkJggg==` |
| `near-duplicates.png` | `iVBORw0KGgoAAAANSUhEUgAAASwAAADICAIAAADdvUsCAAAByUlEQVR42u3T0QnAIAxAQaMLdSJxREdwsUBXKIXgz913kER48azTqBcRdv4nM8sOHEUv7zO/D3d5wF0iBBGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgggBEYIIARGCCAERgghBhL4ARAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgRECCIERAgiBEQIIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBECIgQRAiIEEQIiBBGCCAERggiBW144IQewQZnQXQAAAABJRU5ErkJggg==` |
| `orient6.jpg` | `/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAUACgDAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD4vr+Uz/fwKAPIf2qv+YD/ANvX/tGv9VP2Zf8AzVf/AHI/+7h/mv8AtDP+aZ/7nf8A3UPIa/1UP81woA+vK/5Vz/pQCgDyH9qr/mA/9vX/ALRr/VT9mX/zVf8A3I/+7h/mv+0M/wCaZ/7nf/dQ8hr/AFUP81woA+vK/wCVc/6UAoA8h/aq/wCYD/29f+0a/wBVP2Zf/NV/9yP/ALuH+a/7Qz/mmf8Aud/91DyGv9VD/NcKAP/Z` |
| `stripes-6.png` | `iVBORw0KGgoAAAANSUhEUgAAAlgAAABkCAIAAADVI9l0AAABWUlEQVR42u3VsREAIAwDMcL+O5sFKNykk0bwEX4OtSRGaM3YoJ3KszLWyn/lBlvXBAAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQAIIQBCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCABCCAA/D2HpB8bYgK2DAAAAAElFTkSuQmCC` |
| `transparent-half.png` | `iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAApElEQVR42u3RAREAAAgCMbR/Z+3B7RvAJpeKbjqWbAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAREQIAICBABASIgQAQEiAuACAgQAQEiIEAEBIiACAgQAQEiIOU9CDgDxi0/Y48AAAAASUVORK5CYII=` |
