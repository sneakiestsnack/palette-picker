import { describe, expect, it } from 'vitest';
import { datePart, exportFileName, sanitizeFileBase, timestampPart } from '../fileNames';
import { aco } from './aco';
import { cardLayout } from './pngCardLayout';

const hexBytes = (s: string) => s.split(' ').map((b) => parseInt(b, 16));

describe('A23 .aco writer', () => {
  it('one color (48 bytes)', () => {
    const out = aco(['#FFBE98']);
    expect(out.length).toBe(48);
    expect(Array.from(out)).toEqual(hexBytes(
      '00 01 00 01 00 00 FF FF BE BE 98 98 00 00 00 02 00 01 00 00 FF FF BE BE 98 98 00 00 00 00 00 08 00 23 00 46 00 46 00 42 00 45 00 39 00 38 00 00',
    ));
  });

  it('two colors (88 bytes)', () => {
    const out = aco(['#000000', '#0A1B2C']);
    expect(out.length).toBe(88);
    expect(Array.from(out)).toEqual(hexBytes(
      '00 01 00 02 00 00 00 00 00 00 00 00 00 00 00 00 0A 0A 1B 1B 2C 2C 00 00 00 02 00 02 00 00 00 00 00 00 00 00 00 00 00 00 00 08 00 23 00 30 00 30 00 30 00 30 00 30 00 30 00 00 00 00 0A 0A 1B 1B 2C 2C 00 00 00 00 00 08 00 23 00 30 00 41 00 31 00 42 00 32 00 43 00 00',
    ));
  });
});

describe('A22 PNG card layout', () => {
  const hexes = (n: number) => Array.from({ length: n }, () => '#000000');
  it.each([
    [2, 400, 268], [6, 1104, 268], [8, 1456, 268], [9, 1456, 488], [16, 1456, 488],
  ] as const)('n=%i → %i×%i', (n, w, h) => {
    const l = cardLayout(hexes(n));
    expect([l.width, l.height]).toEqual([w, h]);
  });

  it('PNG is 2× and cell 8 wraps', () => {
    expect([cardLayout(hexes(6)).canvasWidth, cardLayout(hexes(6)).canvasHeight]).toEqual([2208, 536]);
    const c8 = cardLayout(hexes(9)).cells[8]!;
    expect([c8.x, c8.y]).toEqual([32, 252]);
    expect([c8.labelX, c8.labelY]).toEqual([112, 442]);
  });
});

describe('A28 file names', () => {
  const parts = { y: 2026, mo: 10, d: 10, h: 14, mi: 3 };
  it('timestamps', () => {
    expect(timestampPart(parts)).toBe('20261010-1403');
    expect(datePart(parts)).toBe('20261010');
  });

  it('sanitizeFileBase', () => {
    expect(sanitizeFileBase('Sunset / Beach #2')).toBe('Sunset-Beach-2');
    expect(sanitizeFileBase('  ***  ')).toBe('palette');
    expect(sanitizeFileBase('Café au lait')).toBe('Caf-au-lait');
  });

  it('export names', () => {
    expect(exportFileName(null, parts, 'aco')).toBe('palette-20261010-1403.aco');
    expect(exportFileName(null, parts, 'png')).toBe('palette-20261010-1403.png');
    expect(exportFileName('Sunset / Beach #2', parts, 'cls')).toBe('Sunset-Beach-2.cls');
  });
});
