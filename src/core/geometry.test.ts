import { describe, expect, it } from 'vitest';
import { clientToImage } from './geometry';

describe('A29 clientToImage', () => {
  const rect = { left: 100, top: 50, width: 300, height: 50 };
  it.each([
    [250, 75, { x: 300, y: 50 }],
    [100, 50, { x: 0, y: 0 }],
    [399.9, 99.9, { x: 599, y: 99 }],
    [400, 75, null],
    [99, 75, null],
  ] as const)('(%f, %f)', (cx, cy, expected) => {
    expect(clientToImage(cx, cy, rect, 600, 100)).toEqual(expected);
  });
});
