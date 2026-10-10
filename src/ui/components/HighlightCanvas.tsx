import { useEffect, useRef } from 'react';
import { applyLut, highlightLut } from '../../core';
import { useApp } from '../../state/AppProvider';
import type { AppState } from '../../state/appState';
import type { LabelMapData } from '../../state/useEngine';

// Which palette index is highlighted, or -1 when show-where isn't active. The label map must be for exactly
// the current entries, so a stale map never highlights the wrong pixels.
export function highlightIndex(state: AppState, labelMap: LabelMapData | null): number {
  if (!state.showWhere || state.selectedHex === null || !labelMap) return -1;
  const hexes = state.palette.entries.map((e) => e.hex);
  if (labelMap.palette.length !== hexes.length || !labelMap.palette.every((h, i) => h === hexes[i])) return -1;
  return hexes.indexOf(state.selectedHex);
}

// Show-where layer: mask resolution, CSS-scaled over the image (smoothed by the browser).
export function HighlightCanvas({ className }: { className: string }) {
  const { state, labelMap } = useApp();
  const ref = useRef<HTMLCanvasElement>(null);
  const index = highlightIndex(state, labelMap);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      if (index < 0 || !labelMap) {
        canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      canvas.width = labelMap.width;
      canvas.height = labelMap.height;
      const img = new ImageData(labelMap.width, labelMap.height);
      applyLut(labelMap.labels, highlightLut(index), new Uint32Array(img.data.buffer));
      canvas.getContext('2d', { willReadFrequently: true })!.putImageData(img, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [index, labelMap]);

  return <canvas ref={ref} className={className} data-testid="highlight-canvas" data-active={String(index >= 0)} />;
}
