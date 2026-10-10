// Draws the PNG swatch card (A22) synchronously, so it can run inside a click handler (Appendix G #11).
import { cardLayout } from '../core/export/pngCardLayout';
import { CARD_BG, CARD_FONT, CARD_SCALE, CARD_SWATCH_STROKE, CARD_TEXT } from '../core/tuning';
import type { Hex } from '../core/types';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// CARD_FONT is written for 1× (e.g. "600 22px …"); the context is scaled, so draw it as written.
export function renderPngCard(hexes: readonly Hex[]): Uint8Array {
  const layout = cardLayout(hexes);
  const canvas = document.createElement('canvas');
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(CARD_SCALE, CARD_SCALE);
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.font = CARD_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 1;
  for (const c of layout.cells) {
    ctx.fillStyle = c.hex;
    ctx.fillRect(c.x, c.y, layout.swatch, layout.swatch);
    ctx.strokeStyle = CARD_SWATCH_STROKE;
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, layout.swatch - 1, layout.swatch - 1);
    ctx.fillStyle = CARD_TEXT;
    ctx.fillText(c.hex, c.labelX, c.labelY);
  }
  return dataUrlToBytes(canvas.toDataURL('image/png'));
}
