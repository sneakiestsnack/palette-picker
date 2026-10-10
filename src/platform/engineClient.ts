// Engine client (Appendix C §C2). Phase 0: ping only; Phase 4 adds load/extract and the schedulers.
import type { Req, Res } from '../core/protocol';

export interface EngineClient {
  ping(): Promise<void>;
}

type Pending = { resolve: () => void; reject: (err: Error) => void };

function createEngineClient(): EngineClient {
  // Vite detects this literal pattern statically (Appendix G #5); keep it exactly as is.
  const worker = new Worker(new URL('../worker/engine.worker.ts', import.meta.url), { type: 'module' });
  let nextReqId = 1;
  const pending = new Map<number, Pending>();

  worker.onmessage = (e: MessageEvent<Res>) => {
    const res = e.data;
    const p = pending.get(res.reqId);
    if (!p) return;
    pending.delete(res.reqId);
    if (res.kind === 'error') p.reject(new Error(res.message));
    else p.resolve();
  };

  function send(req: Req, p: Pending): void {
    pending.set(req.reqId, p);
    worker.postMessage(req);
  }

  return {
    ping() {
      return new Promise<void>((resolve, reject) => {
        send({ kind: 'ping', reqId: nextReqId++ }, { resolve, reject });
      });
    },
  };
}

let client: EngineClient | null = null;

// Module-level singleton: React StrictMode runs effects twice, so the Worker must not be created in an effect (Appendix G #17).
export function getEngineClient(): EngineClient {
  client ??= createEngineClient();
  return client;
}
