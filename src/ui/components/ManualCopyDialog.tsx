import { useEffect, useRef } from 'react';
import { STRINGS } from '../strings';
import styles from './ManualCopyDialog.module.css';

// Last-resort copy: the codes in a selected text area.
export function ManualCopyDialog({ text, onClose }: { text: string; onClose(): void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    areaRef.current?.select();
  }, []);

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <p>{STRINGS.COPY_FAILED}</p>
      <textarea ref={areaRef} className={styles.area} readOnly value={text} rows={Math.min(16, text.split('\n').length)} />
      <form method="dialog">
        <button type="submit">{STRINGS.CLOSE}</button>
      </form>
    </dialog>
  );
}
