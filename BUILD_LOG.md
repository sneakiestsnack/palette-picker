# Build log

## Phase 0 — Scaffold and prove the verification loop — 2026-10-10 (in progress)
- Built: git repo (`main`), `.gitignore`, `.gitattributes`, first commit of `docs/` + `fixtures/`; `package.json` scripts (§2.2); all five tsconfigs, `vite.config.ts`, `playwright.config.ts`, `index.html`; `src/core/{tuning,types,index,protocol,handleMessage,engine}.ts`; `src/worker/engine.worker.ts`; `src/platform/engineClient.ts` (module-level singleton, `ping()`); `src/main.tsx`, `src/ui/App.tsx`; `tests/architecture.test.ts`, `tests/fixtures.test.ts`, `src/core/handleMessage.test.ts`; `e2e/helpers.ts`, `e2e/smoke.spec.ts`.
- Tests: not yet run — dependencies not installed (§0.1 step 2 pending).
- Deviations from blueprint:
  - `package.json` was written by the builder (scripts per §2.2) because `npm init -y` hadn't been run; the human's `npm install` commands add the dependencies to it.
  - `src/core/engine.ts` exists as an empty `PaletteEngine` placeholder so the worker shell has its final A13 shape from Phase 0; Phase 3 fills it in.
- Notes for the human: all 8 fixture hashes verified OK with `sha256sum -c` before the first commit.
