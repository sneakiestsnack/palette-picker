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
