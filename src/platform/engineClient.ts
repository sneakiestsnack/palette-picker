// Engine client (Appendix C §C2): ping, load, and three latest-only channels (extract, coverage, labelMap).
import { STALE_IMAGE, toRgbaMsg, type Req, type Res } from '../core/protocol';
import { LatestOnlyScheduler } from '../core/scheduler';
import type { ExtractParams, ExtractResult, Hex, RgbaImage, ValueRange } from '../core/types';

export interface LoadResult {
  imageId: number;
  valueMap: Uint8Array;
  histogram: number[];
  processingWidth: number;
  processingHeight: number;
}

export interface EngineClient {
  ping(): Promise<void>;
  load(display: RgbaImage, processing?: RgbaImage): Promise<LoadResult>;
  extract(params: ExtractParams, extractionRequest: number, reroll?: { currentPicks: number[] }): void;   // result via onExtracted
  coverage(palette: Hex[], range: ValueRange): void;                                                      // via onCoverage
  labelMap(palette: Hex[], range: ValueRange): void;                                                      // via onLabelMap
  onExtracted(cb: (r: ExtractResult, excluded: number[], extractionRequest: number) => void): () => void;
  onCoverage(cb: (palette: Hex[], shares: number[]) => void): () => void;
  onLabelMap(cb: (palette: Hex[], width: number, height: number, labels: Uint8Array) => void): () => void;
  onError(cb: (message: string, extractionRequest?: number) => void): () => void;
}

interface ExtractPayload { params: ExtractParams; extractionRequest: number; reroll?: { currentPicks: number[] } }
interface PalettePayload { palette: Hex[]; range: ValueRange }

type Channel = 'extract' | 'coverage' | 'labelMap';
type Route =
  | { channel: 'call'; resolve: (res: Res) => void; reject: (err: Error) => void }
  | { channel: Channel; schedulerId: number; imageId: number; extractionRequest?: number };

function subscribe<T>(set: Set<T>, cb: T): () => void {
  set.add(cb);
  return () => { set.delete(cb); };
}

function createEngineClient(): EngineClient {
  // Vite detects this literal pattern statically (Appendix G #5); keep it exactly as is.
  const worker = new Worker(new URL('../worker/engine.worker.ts', import.meta.url), { type: 'module' });
  let nextReqId = 1;
  let imageId = 0;                                          // 0 = no image loaded yet
  const routes = new Map<number, Route>();
  const extractedCbs = new Set<(r: ExtractResult, excluded: number[], extractionRequest: number) => void>();
  const coverageCbs = new Set<(palette: Hex[], shares: number[]) => void>();
  const labelMapCbs = new Set<(palette: Hex[], width: number, height: number, labels: Uint8Array) => void>();
  const errorCbs = new Set<(message: string, extractionRequest?: number) => void>();

  function post(req: Req, route: Route, transfer: Transferable[] = []): void {
    routes.set(req.reqId, route);
    worker.postMessage(req, transfer);
  }

  function call(build: (reqId: number) => Req, transfer: Transferable[] = []): Promise<Res> {
    return new Promise<Res>((resolve, reject) => {
      post(build(nextReqId++), { channel: 'call', resolve, reject }, transfer);
    });
  }

  const schedulers = {
    extract: new LatestOnlyScheduler<ExtractPayload>((p, schedulerId) => {
      post(
        { kind: 'extract', reqId: nextReqId++, imageId, params: p.params, ...(p.reroll ? { reroll: p.reroll } : {}) },
        { channel: 'extract', schedulerId, imageId, extractionRequest: p.extractionRequest },
      );
    }),
    coverage: new LatestOnlyScheduler<PalettePayload>((p, schedulerId) => {
      post({ kind: 'coverage', reqId: nextReqId++, imageId, palette: p.palette, valueRange: p.range }, { channel: 'coverage', schedulerId, imageId });
    }),
    labelMap: new LatestOnlyScheduler<PalettePayload>((p, schedulerId) => {
      post({ kind: 'labelMap', reqId: nextReqId++, imageId, palette: p.palette, valueRange: p.range }, { channel: 'labelMap', schedulerId, imageId });
    }),
  };

  function emitError(message: string, extractionRequest?: number): void {
    for (const cb of errorCbs) cb(message, extractionRequest);
  }

  worker.onmessage = (e: MessageEvent<Res>) => {
    const res = e.data;
    const route = routes.get(res.reqId);
    if (!route) return;
    routes.delete(res.reqId);

    if (route.channel === 'call') {
      if (res.kind === 'error') route.reject(new Error(res.message));
      else route.resolve(res);
      return;
    }

    // Scheduled channels: results for an old image are dropped (load() reset the schedulers).
    if (route.imageId !== imageId) return;
    if (!schedulers[route.channel].onResponse(route.schedulerId)) return;
    switch (res.kind) {
      case 'extracted':
        for (const cb of extractedCbs) cb(res.result, res.excluded, route.extractionRequest!);
        break;
      case 'coverage':
        for (const cb of coverageCbs) cb(res.palette, res.shares);
        break;
      case 'labelMap': {
        const labels = new Uint8Array(res.buffer);
        for (const cb of labelMapCbs) cb(res.palette, res.width, res.height, labels);
        break;
      }
      case 'error':
        if (res.message !== STALE_IMAGE) emitError(res.message, route.extractionRequest);
        break;
    }
  };

  worker.onerror = (e) => emitError(e.message || 'worker error');

  return {
    async ping() {
      await call((reqId) => ({ kind: 'ping', reqId }));
    },

    async load(display, processing) {
      const id = ++imageId;
      for (const s of Object.values(schedulers)) s.reset();
      const displayMsg = toRgbaMsg(display);
      const processingMsg = processing && toRgbaMsg(processing);
      const transfer = processingMsg ? [displayMsg.buffer, processingMsg.buffer] : [displayMsg.buffer];
      const res = await call((reqId) => ({ kind: 'load', reqId, imageId: id, display: displayMsg, processing: processingMsg }), transfer);
      if (id !== imageId) throw new Error(STALE_IMAGE);    // a newer load started meanwhile
      if (res.kind !== 'loaded') throw new Error(`unexpected response: ${res.kind}`);
      return {
        imageId: id,
        valueMap: new Uint8Array(res.valueMap.buffer),
        histogram: res.histogram,
        processingWidth: res.processing.width,
        processingHeight: res.processing.height,
      };
    },

    extract(params, extractionRequest, reroll) {
      if (imageId !== 0) schedulers.extract.request({ params, extractionRequest, reroll });
    },
    coverage(palette, range) {
      if (imageId !== 0) schedulers.coverage.request({ palette, range });
    },
    labelMap(palette, range) {
      if (imageId !== 0) schedulers.labelMap.request({ palette, range });
    },

    onExtracted: (cb) => subscribe(extractedCbs, cb),
    onCoverage: (cb) => subscribe(coverageCbs, cb),
    onLabelMap: (cb) => subscribe(labelMapCbs, cb),
    onError: (cb) => subscribe(errorCbs, cb),
  };
}

let client: EngineClient | null = null;

// Module-level singleton: React StrictMode runs effects twice, so the Worker must not be created in an effect (Appendix G #17).
export function getEngineClient(): EngineClient {
  client ??= createEngineClient();
  return client;
}
