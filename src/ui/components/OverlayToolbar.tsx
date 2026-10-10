import { useEffect, useRef, useState } from 'react';
import { parseHex } from '../../core';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { STRINGS } from '../strings';
import { Slider } from './Slider';
import styles from './OverlayToolbar.module.css';

export function OverlayToolbar() {
  const { state, dispatch } = useApp();
  const { overlay } = state;
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close the popover on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setColor = (key: 'darkTint' | 'lightTint') => (raw: string) => {
    const hex = parseHex(raw);                                // <input type="color"> gives lowercase
    if (hex) dispatch(actions.overlayChanged({ [key]: hex }));
  };

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={overlay.enabled ? styles.on : undefined}
        aria-pressed={overlay.enabled}
        data-testid="overlay-toggle"
        onClick={() => dispatch(actions.overlayChanged({ enabled: !overlay.enabled }))}
      >
        {STRINGS.OUT_OF_RANGE}
      </button>
      <button
        ref={btnRef}
        type="button"
        aria-label={STRINGS.OVERLAY_SETTINGS}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <div ref={popRef} className={styles.popover} data-testid="overlay-settings" role="dialog" aria-label={STRINGS.OVERLAY_SETTINGS}>
          <fieldset className={styles.fieldset}>
            <legend>{STRINGS.OVERLAY_STYLE}</legend>
            {(['tint', 'dim'] as const).map((mode) => (
              <label key={mode} className={styles.radio}>
                <input
                  type="radio"
                  name="overlay-mode"
                  value={mode}
                  checked={overlay.mode === mode}
                  onChange={() => dispatch(actions.overlayChanged({ mode }))}
                />
                {mode === 'tint' ? STRINGS.OVERLAY_TINT : STRINGS.OVERLAY_DIM}
              </label>
            ))}
          </fieldset>
          <label className={styles.colorRow}>
            <span>{STRINGS.OVERLAY_DARK}</span>
            <input type="color" value={overlay.darkTint.toLowerCase()} disabled={overlay.mode !== 'tint'} onChange={(e) => setColor('darkTint')(e.target.value)} />
          </label>
          <label className={styles.colorRow}>
            <span>{STRINGS.OVERLAY_LIGHT}</span>
            <input type="color" value={overlay.lightTint.toLowerCase()} disabled={overlay.mode !== 'tint'} onChange={(e) => setColor('lightTint')(e.target.value)} />
          </label>
          <Slider
            label={STRINGS.OVERLAY_OPACITY}
            value={overlay.opacity}
            lo={10}
            hi={100}
            testId="overlay-opacity"
            onChange={(opacity) => dispatch(actions.overlayChanged({ opacity }))}
          />
        </div>
      )}
    </div>
  );
}
