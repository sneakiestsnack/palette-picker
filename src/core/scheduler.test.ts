import { describe, expect, it } from 'vitest';
import { LatestOnlyScheduler } from './scheduler';

describe('A19 LatestOnlyScheduler', () => {
  it('follows the vectors', () => {
    const sent: [string, number][] = [];
    const s = new LatestOnlyScheduler<string>((p, id) => sent.push([p, id]));

    s.request('A');
    expect(sent).toEqual([['A', 1]]);
    s.request('B');
    s.request('C');
    expect(sent).toEqual([['A', 1]]);
    expect(s.onResponse(1)).toBe(true);
    expect(sent).toEqual([['A', 1], ['C', 2]]);
    expect(s.onResponse(2)).toBe(true);
    expect(sent.length).toBe(2);

    s.request('D');
    expect(sent.at(-1)).toEqual(['D', 3]);
    s.reset();
    expect(s.onResponse(3)).toBe(false);
    s.request('E');
    expect(sent.at(-1)).toEqual(['E', 4]);
  });

  it('ignores unknown response ids', () => {
    const s = new LatestOnlyScheduler<number>(() => {});
    s.request(1);
    expect(s.onResponse(99)).toBe(false);
    expect(s.onResponse(1)).toBe(true);
  });
});
