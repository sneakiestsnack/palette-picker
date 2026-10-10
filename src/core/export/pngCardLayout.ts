// PNG swatch card layout (A22), in CSS-pixel units; the platform draws it at CARD_SCALE.
import { CARD_COLS_MAX, CARD_GAP, CARD_LABEL_H, CARD_PAD, CARD_SCALE, CARD_SWATCH } from '../tuning';
import type { Hex } from '../types';

export interface CardCell {
  readonly hex: Hex;
  readonly x: number;
  readonly y: number;
  readonly labelX: number;                                   // centered
  readonly labelY: number;                                   // baseline
}

export interface CardLayout {
  readonly width: number;
  readonly height: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly swatch: number;
  readonly cells: readonly CardCell[];
}

const LABEL_BASELINE = 30;

export function cardLayout(hexes: readonly Hex[]): CardLayout {
  const n = hexes.length;
  const cols = Math.max(1, Math.min(n, CARD_COLS_MAX));
  const rows = Math.max(1, Math.ceil(n / CARD_COLS_MAX));
  const width = 2 * CARD_PAD + cols * CARD_SWATCH + (cols - 1) * CARD_GAP;
  const height = 2 * CARD_PAD + rows * (CARD_SWATCH + CARD_LABEL_H) + (rows - 1) * CARD_GAP;
  const cells = hexes.map((hex, i): CardCell => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = CARD_PAD + col * (CARD_SWATCH + CARD_GAP);
    const y = CARD_PAD + row * (CARD_SWATCH + CARD_LABEL_H + CARD_GAP);
    return { hex, x, y, labelX: x + CARD_SWATCH / 2, labelY: y + CARD_SWATCH + LABEL_BASELINE };
  });
  return { width, height, canvasWidth: width * CARD_SCALE, canvasHeight: height * CARD_SCALE, swatch: CARD_SWATCH, cells };
}
