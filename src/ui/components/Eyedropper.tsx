import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { LOUPE_OFFSET_Y_PX, LOUPE_SIZE_PX, LOUPE_ZOOM, clientToImage, formatHex, type Hex } from '../../core';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { STRINGS } from '../strings';
import styles from './ImageStage.module.css';

export function EyedropperButton() {
  const { state, dispatch } = useApp();
  return (
    <button
      type="button"
      className={state.eyedropper ? styles.toolOn : undefined}
      aria-pressed={state.eyedropper}
      data-testid="eyedropper"
      onClick={() => dispatch(actions.eyedropperToggled())}
    >
      {STRINGS.EYEDROPPER}
    </button>
  );
}

interface Loupe { clientX: number; clientY: number; x: number; y: number; hex: Hex }

// Pointer handling for eyedropper mode on the image wrapper. Desktop: a click picks. Touch/pen: press shows a
// magnifier loupe above the finger that follows it; releasing picks; pointercancel aborts.
// Always samples the color display canvas, whatever view is showing.
export function useEyedropper(imageCanvasRef: RefObject<HTMLCanvasElement | null>) {
  const { state, dispatch, displayCanvas } = useApp();
  const on = state.eyedropper && state.image !== null;
  const [loupe, setLoupe] = useState<Loupe | null>(null);
  const pointerType = useRef<string>('mouse');

  // Esc leaves eyedropper mode.
  useEffect(() => {
    if (!state.eyedropper) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch(actions.eyedropperToggled(false)); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [state.eyedropper, dispatch]);

  const sample = (clientX: number, clientY: number): Loupe | null => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !displayCanvas) return null;
    const p = clientToImage(clientX, clientY, canvas.getBoundingClientRect(), displayCanvas.width, displayCanvas.height);
    if (!p) return null;
    const d = displayCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(p.x, p.y, 1, 1).data;
    return { clientX, clientY, x: p.x, y: p.y, hex: formatHex(d[0]!, d[1]!, d[2]!) };
  };

  const handlers = on
    ? {
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          pointerType.current = e.pointerType;
          if (e.pointerType === 'mouse') return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setLoupe(sample(e.clientX, e.clientY));
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType === 'mouse' || !loupe) return;
          setLoupe(sample(e.clientX, e.clientY) ?? loupe);
        },
        onPointerUp: (e: PointerEvent<HTMLElement>) => {
          if (e.pointerType === 'mouse') return;
          const picked = sample(e.clientX, e.clientY) ?? loupe;
          setLoupe(null);
          if (picked) dispatch(actions.colorPicked(picked.hex));
        },
        onPointerCancel: () => setLoupe(null),
        onClick: (e: MouseEvent<HTMLElement>) => {
          if (pointerType.current !== 'mouse') return;             // touch already picked on pointerup
          const picked = sample(e.clientX, e.clientY);
          if (picked) dispatch(actions.colorPicked(picked.hex));
        },
      }
    : {};

  const loupeElement = on && loupe && displayCanvas ? <LoupeView loupe={loupe} source={displayCanvas} /> : null;
  return { on, handlers, loupeElement };
}

function LoupeView({ loupe, source }: { loupe: Loupe; source: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = LOUPE_SIZE_PX;
  const span = size / LOUPE_ZOOM;                                   // source pixels shown across the loupe

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const sx = loupe.x - Math.floor(span / 2);
    const sy = loupe.y - Math.floor(span / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(source, sx, sy, span, span, 0, 0, size, size);
    // Crosshair: outline the sampled pixel.
    const c = (loupe.x - sx) * LOUPE_ZOOM;
    const r = (loupe.y - sy) * LOUPE_ZOOM;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(c - 1, r - 1, LOUPE_ZOOM + 2, LOUPE_ZOOM + 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(c + 1, r + 1, LOUPE_ZOOM - 2, LOUPE_ZOOM - 2);
  }, [loupe, source, size, span]);

  // Above the finger; flipped below it when there's no room at the top. Kept inside the viewport sideways.
  const margin = 8;
  const above = loupe.clientY - LOUPE_OFFSET_Y_PX - size / 2;
  const top = above >= margin ? above : loupe.clientY + LOUPE_OFFSET_Y_PX - size / 2;
  const left = Math.min(Math.max(margin, loupe.clientX - size / 2), window.innerWidth - size - margin);

  return (
    <div className={styles.loupe} style={{ left, top, width: size }} aria-hidden="true" data-testid="loupe">
      <canvas ref={ref} width={size} height={size} className={styles.loupeCanvas} />
      <span className={styles.loupeHex}>{loupe.hex}</span>
    </div>
  );
}
