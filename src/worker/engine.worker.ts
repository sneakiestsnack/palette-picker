import { PaletteEngine } from '../core/engine';
import { handleMessage } from '../core/handleMessage';
import type { Req } from '../core/protocol';

const engine = new PaletteEngine();
self.onmessage = (e: MessageEvent<Req>) => {
  const { res, transfer } = handleMessage(engine, e.data);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(res, transfer);
};
