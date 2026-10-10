import { describe, expect, it } from 'vitest';
import { formatHex } from './color';
import { PaletteEngine } from './engine';
import { handleMessage } from './handleMessage';
import { STALE_IMAGE, toRgbaMsg, type Res } from './protocol';
import type { ExtractParams, RgbaImage } from './types';

function stripes(): RgbaImage {
  const cols = [[0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
  const data = new Uint8ClampedArray(600 * 100 * 4);
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 600; x++) data.set([...cols[Math.floor(x / 100)]!, 255], (y * 600 + x) * 4);
  return { width: 600, height: 100, data };
}

const params: ExtractParams = {
  controls: { size: 6, variety: 50, hueWeight: 35, valueRange: { min: 0, max: 100 } },
  locked: [],
  excluded: [],
};

function expectKind<K extends Res['kind']>(res: Res, kind: K): Extract<Res, { kind: K }> {
  expect(res.kind).toBe(kind);
  return res as Extract<Res, { kind: K }>;
}

describe('handleMessage', () => {
  it('answers ping with pong carrying the same reqId', () => {
    const { res, transfer } = handleMessage(new PaletteEngine(), { kind: 'ping', reqId: 42 });
    expect(res).toEqual({ kind: 'pong', reqId: 42 });
    expect(transfer).toEqual([]);
  });

  it('turns an unknown request into an error instead of throwing', () => {
    const { res } = handleMessage(new PaletteEngine(), { kind: 'nope', reqId: 7 } as never);
    expect(res.kind).toBe('error');
    expect(res.reqId).toBe(7);
  });

  it('load → loaded with sizes, histogram and value map', () => {
    const img = stripes();
    const { res, transfer } = handleMessage(new PaletteEngine(), { kind: 'load', reqId: 1, imageId: 3, display: toRgbaMsg(img) });
    const loaded = expectKind(res, 'loaded');
    expect(loaded.imageId).toBe(3);
    expect(loaded.processing).toEqual({ width: 300, height: 50 });
    expect(loaded.histogram.reduce((a, b) => a + b, 0)).toBe(300 * 50);
    expect([loaded.valueMap.width, loaded.valueMap.height]).toEqual([600, 100]);
    expect(loaded.valueMap.buffer.byteLength).toBe(600 * 100);
    expect(transfer).toEqual([loaded.valueMap.buffer]);
  });

  it('extract → expected picks for stripes', () => {
    const engine = new PaletteEngine();
    handleMessage(engine, { kind: 'load', reqId: 1, imageId: 3, display: toRgbaMsg(stripes()) });
    const { res } = handleMessage(engine, { kind: 'extract', reqId: 2, imageId: 3, params });
    const ex = expectKind(res, 'extracted');
    expect(ex.reqId).toBe(2);
    expect(ex.result.picks.map((p) => p.hex).sort()).toEqual(
      ['#000000', '#0000FF', '#00FF00', '#FF0000', '#FFFF00', '#FFFFFF'].sort(),
    );
    expect(ex.excluded).toEqual([]);
  });

  it('extract with reroll excludes the current picks', () => {
    const engine = new PaletteEngine();
    handleMessage(engine, { kind: 'load', reqId: 1, imageId: 3, display: toRgbaMsg(stripes()) });
    const p = { ...params, controls: { ...params.controls, size: 3, variety: 0 } };
    const first = expectKind(handleMessage(engine, { kind: 'extract', reqId: 2, imageId: 3, params: p }).res, 'extracted');
    const picks = first.result.picks.map((x) => x.candidateIndex);
    const again = expectKind(handleMessage(engine, { kind: 'extract', reqId: 3, imageId: 3, params: p, reroll: { currentPicks: picks } }).res, 'extracted');
    expect(again.excluded).toEqual([...picks].sort((a, b) => a - b));
    expect(again.result.picks.map((x) => x.candidateIndex).some((i) => picks.includes(i))).toBe(false);
  });

  it('extract before load → error', () => {
    const { res } = handleMessage(new PaletteEngine(), { kind: 'extract', reqId: 5, imageId: 1, params });
    expect(expectKind(res, 'error').reqId).toBe(5);
  });

  it('extract for an old image → stale-image error', () => {
    const engine = new PaletteEngine();
    handleMessage(engine, { kind: 'load', reqId: 1, imageId: 2, display: toRgbaMsg(stripes()) });
    const { res } = handleMessage(engine, { kind: 'extract', reqId: 2, imageId: 1, params });
    expect(expectKind(res, 'error').message).toBe(STALE_IMAGE);
  });

  it('load accepts an explicit processing image', () => {
    const tiny: RgbaImage = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255]) };
    const engine = new PaletteEngine();
    const { res } = handleMessage(engine, { kind: 'load', reqId: 1, imageId: 1, display: toRgbaMsg(stripes()), processing: toRgbaMsg(tiny) });
    expect(expectKind(res, 'loaded').processing).toEqual({ width: 2, height: 1 });
    const ex = expectKind(handleMessage(engine, { kind: 'extract', reqId: 2, imageId: 1, params }).res, 'extracted');
    expect(ex.result.picks.map((p) => p.hex)).toEqual([formatHex(255, 0, 0)]);
  });
});

describe('handleMessage: coverage and label map', () => {
  it('coverage and labelMap for stripes', () => {
    const engine = new PaletteEngine();
    handleMessage(engine, { kind: 'load', reqId: 1, imageId: 1, display: toRgbaMsg(stripes()) });
    const range = { min: 0, max: 100 };
    const cov = expectKind(handleMessage(engine, { kind: 'coverage', reqId: 2, imageId: 1, palette: ['#000000', '#FFFFFF'], valueRange: range }).res, 'coverage');
    expect(cov.shares[0]).toBeCloseTo(1 / 3, 10);
    expect(cov.palette).toEqual(['#000000', '#FFFFFF']);
    const { res, transfer } = handleMessage(engine, { kind: 'labelMap', reqId: 3, imageId: 1, palette: ['#000000', '#FFFFFF'], valueRange: range });
    const lm = expectKind(res, 'labelMap');
    expect([lm.width, lm.height]).toEqual([600, 100]);
    expect(lm.buffer.byteLength).toBe(600 * 100);
    expect(transfer).toEqual([lm.buffer]);
    expect(new Uint8Array(lm.buffer)[50]).toBe(0);
  });
});
