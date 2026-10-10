import { useEffect } from 'react';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { STRINGS, showingLabel } from '../strings';
import styles from './ImageStage.module.css';

export function ShowWhereButton() {
  const { state, dispatch } = useApp();
  return (
    <button
      type="button"
      className={state.showWhere ? styles.toolOn : undefined}
      aria-pressed={state.showWhere}
      data-testid="show-where"
      onClick={() => dispatch(actions.showWhereToggled())}
    >
      {STRINGS.SHOW_WHERE}
    </button>
  );
}

// "Showing #HEX ×": the current selection; × clears it. Esc clears it too.
export function SelectionChip() {
  const { state, dispatch } = useApp();
  const hex = state.selectedHex;
  const valid = hex !== null && state.palette.entries.some((e) => e.hex === hex);

  useEffect(() => {
    if (hex === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch(actions.swatchSelected(null)); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hex, dispatch]);

  if (!valid) return null;
  return (
    <span className={styles.selectionChip} data-testid="selection-chip">
      <span className={styles.chipSwatch} style={{ background: hex }} aria-hidden="true" />
      <span>{showingLabel(hex)}</span>
      <button type="button" aria-label={STRINGS.CLEAR_SELECTION} onClick={() => dispatch(actions.swatchSelected(null))}>×</button>
    </span>
  );
}
