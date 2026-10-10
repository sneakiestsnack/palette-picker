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
