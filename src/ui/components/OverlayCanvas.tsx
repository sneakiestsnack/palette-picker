import { useEffect, useRef } from 'react';
import { applyLut, overlayLut } from '../../core';
import { useApp } from '../../state/AppProvider';
import { highlightIndex } from './HighlightCanvas';

// Out-of-range overlay, stacked on the image canvas at the same pixel size. Drawn on the main thread
// from the value map with a 256-entry LUT (A15), throttled to one render per animation frame.
export function OverlayCanvas({ className }: { className: string }) {
  const { state, valueMap, labelMap } = useApp();
  const { image, overlay } = state;
  const { valueRange } = state.controls;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !image) return;
    const frame = requestAnimationFrame(() => {
      if (canvas.width !== image.width || canvas.height !== image.height) {
        canvas.width = image.width;
        canvas.height = image.height;
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      if (!overlay.enabled || !valueMap || valueMap.length !== image.width * image.height) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const img = new ImageData(image.width, image.height);
      applyLut(valueMap, overlayLut(valueRange, overlay), new Uint32Array(img.data.buffer));
      ctx.putImageData(img, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [image, valueMap, overlay, valueRange]);

  // Hidden (not cleared) while show-where highlights a swatch.
  const hidden = highlightIndex(state, labelMap) >= 0;
  return <canvas ref={ref} className={className} data-testid="overlay-canvas" style={hidden ? { visibility: 'hidden' } : undefined} />;
}
