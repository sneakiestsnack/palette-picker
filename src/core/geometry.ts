// Pointer → image pixel (A29).

export interface Rect { readonly left: number; readonly top: number; readonly width: number; readonly height: number }

export function clientToImage(cx: number, cy: number, rect: Rect, imgW: number, imgH: number): { x: number; y: number } | null {
  const x = Math.floor(((cx - rect.left) / rect.width) * imgW);
  const y = Math.floor(((cy - rect.top) / rect.height) * imgH);
  if (!(x >= 0 && x < imgW && y >= 0 && y < imgH)) return null;
  return { x, y };
}
