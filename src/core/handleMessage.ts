import type { PaletteEngine } from './engine';
import { STALE_IMAGE, fromRgbaMsg, type Req, type Res } from './protocol';

// Never throws: any failure becomes an `error` response (A13).
export function handleMessage(engine: PaletteEngine, req: Req): { res: Res; transfer: ArrayBuffer[] } {
  const reqId = typeof req?.reqId === 'number' ? req.reqId : -1;
  const imageId = req && 'imageId' in req ? req.imageId : undefined;
  try {
    switch (req.kind) {
      case 'ping':
        return { res: { kind: 'pong', reqId }, transfer: [] };
      case 'load': {
        const info = engine.load(req.imageId, fromRgbaMsg(req.display), req.processing && fromRgbaMsg(req.processing));
        const buffer = info.valueMap.buffer as ArrayBuffer;
        return {
          res: {
            kind: 'loaded', reqId, imageId: req.imageId,
            valueMap: { width: info.width, height: info.height, buffer },
            histogram: info.histogram,
            processing: { width: info.processingWidth, height: info.processingHeight },
          },
          transfer: [buffer],
        };
      }
      case 'extract': {
        if (req.imageId !== engine.currentImageId) return { res: { kind: 'error', reqId, imageId, message: STALE_IMAGE }, transfer: [] };
        if (req.reroll) {
          const { result, excluded } = engine.reroll(req.params, req.reroll.currentPicks);
          return { res: { kind: 'extracted', reqId, imageId: req.imageId, result, excluded }, transfer: [] };
        }
        const result = engine.extract(req.params);
        return { res: { kind: 'extracted', reqId, imageId: req.imageId, result, excluded: [...req.params.excluded] }, transfer: [] };
      }
      case 'coverage': {
        if (req.imageId !== engine.currentImageId) return { res: { kind: 'error', reqId, imageId, message: STALE_IMAGE }, transfer: [] };
        const { shares, inRangePixelCount } = engine.coverage(req.palette, req.valueRange);
        return { res: { kind: 'coverage', reqId, imageId: req.imageId, palette: req.palette, shares, inRangePixelCount }, transfer: [] };
      }
      case 'labelMap': {
        if (req.imageId !== engine.currentImageId) return { res: { kind: 'error', reqId, imageId, message: STALE_IMAGE }, transfer: [] };
        const { width, height, labels } = engine.labelMap(req.palette, req.valueRange);
        const buffer = labels.buffer as ArrayBuffer;
        return { res: { kind: 'labelMap', reqId, imageId: req.imageId, palette: req.palette, width, height, buffer }, transfer: [buffer] };
      }
      default:
        return { res: { kind: 'error', reqId, message: `unknown request: ${String((req as { kind?: unknown }).kind)}` }, transfer: [] };
    }
  } catch (err) {
    return { res: { kind: 'error', reqId, imageId, message: err instanceof Error ? err.message : String(err) }, transfer: [] };
  }
}
