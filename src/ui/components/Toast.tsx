import { useEffect } from 'react';
import { TOAST_MS, UNDO_TOAST_MS } from '../../core';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { toastText } from '../strings';
import styles from './Toast.module.css';

export function Toast() {
  const { state, dispatch } = useApp();
  const toast = state.toast;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(actions.toastHidden(toast.id)), toast.undo ? UNDO_TOAST_MS : TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  return (
    <div className={styles.region} aria-live="polite">
      {toast && <div className={styles.toast} data-testid="toast">{toastText(toast.message)}</div>}
    </div>
  );
}
