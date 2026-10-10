import type { PaletteEngine } from './engine';
import type { Req, Res } from './protocol';

// Never throws: any failure becomes an `error` response (A13).
export function handleMessage(_engine: PaletteEngine, req: Req): { res: Res; transfer: ArrayBuffer[] } {
  const reqId = typeof req?.reqId === 'number' ? req.reqId : -1;
  try {
    switch (req.kind) {
      case 'ping':
        return { res: { kind: 'pong', reqId }, transfer: [] };
      default:
        return { res: { kind: 'error', reqId, message: `unknown request: ${String((req as { kind?: unknown }).kind)}` }, transfer: [] };
    }
  } catch (err) {
    return { res: { kind: 'error', reqId, message: err instanceof Error ? err.message : String(err) }, transfer: [] };
  }
}
