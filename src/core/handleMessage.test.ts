import { describe, expect, it } from 'vitest';
import { PaletteEngine } from './engine';
import { handleMessage } from './handleMessage';

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
});
