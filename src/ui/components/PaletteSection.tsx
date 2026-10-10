import { useEffect, useMemo, useState } from 'react';
import { PENDING_INDICATOR_DELAY_MS, copyTextForAll, copyTextForHex, sortEntries } from '../../core';
import { copyText } from '../../platform/clipboard';
import { actions } from '../../state/actions';
import { isSettled } from '../../state/appState';
import { useApp } from '../../state/AppProvider';
import { STRINGS, copyLabel, shortfallText } from '../strings';
import { ManualCopyDialog } from './ManualCopyDialog';
import styles from './PaletteSection.module.css';

export function PaletteSection() {
  const { state, dispatch } = useApp();
  const { entries, shortfall, pending } = state.palette;
  const display = useMemo(() => sortEntries(entries, 'value'), [entries]);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShowPending(false);
      return;
    }
    const t = setTimeout(() => setShowPending(true), PENDING_INDICATOR_DELAY_MS);
    return () => clearTimeout(t);
  }, [pending]);

  // Clipboard write starts first thing in the handler (Safari user activation, Appendix G #11).
  const copy = (text: string, onDone: () => void) => {
    void copyText(text).then((ok) => (ok ? onDone() : setManualCopy(text)));
  };

  const hexes = display.map((e) => e.hex);
  return (
    <div className={styles.palette} data-testid="palette" data-settled={String(isSettled(state))}>
      <div className={styles.header}>
        <h2 className={styles.title}>{STRINGS.PALETTE}</h2>
        {showPending && <span className={styles.pending} data-testid="pending">{STRINGS.WORKING}</span>}
        <button
          type="button"
          data-testid="copy-all"
          disabled={hexes.length === 0}
          onClick={() => copy(copyTextForAll(hexes), () => dispatch(actions.toastShown({ kind: 'copiedAll', n: hexes.length })))}
        >
          {STRINGS.COPY_ALL}
        </button>
      </div>

      {state.image === null ? (
        <p className={styles.note}>{STRINGS.PALETTE_EMPTY}</p>
      ) : (
        <div className={styles.grid}>
          {display.map((e) => (
            <button
              key={e.hex}
              type="button"
              className={styles.tile}
              data-testid="swatch"
              data-hex={e.hex}
              aria-label={copyLabel(e.hex)}
              onClick={() => copy(copyTextForHex(e.hex), () => dispatch(actions.toastShown({ kind: 'copiedOne', hex: e.hex })))}
            >
              <span className={styles.block} style={{ background: e.hex }} />
              <span className={styles.hex}>{e.hex}</span>
            </button>
          ))}
        </div>
      )}

      {state.image !== null && shortfall && isSettled(state) && (
        <p className={styles.note} data-testid="shortfall">
          {entries.length === 0 ? STRINGS.NO_PIXELS : shortfallText(entries.length)}
        </p>
      )}

      {manualCopy !== null && <ManualCopyDialog text={manualCopy} onClose={() => setManualCopy(null)} />}
    </div>
  );
}
