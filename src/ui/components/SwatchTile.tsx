import type { PaletteEntry } from '../../core';
import { copyLabel, lockLabel, removeLabel } from '../strings';
import styles from './PaletteSection.module.css';

interface SwatchTileProps {
  entry: PaletteEntry;
  onCopy(): void;
  onLock(): void;
  onRemove(): void;
}

// Monochrome (white on the --chip background): no colored chrome next to swatches.
function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill={locked ? 'currentColor' : 'none'} />
      <path d={locked ? 'M5 7V5a3 3 0 0 1 6 0v2' : 'M5 7V5a3 3 0 0 1 5.6-1.5'} />
    </svg>
  );
}

// The tile is a group, not a button, so the lock/remove chips aren't nested inside the copy button.
export function SwatchTile({ entry, onCopy, onLock, onRemove }: SwatchTileProps) {
  const { hex, locked } = entry;
  return (
    <div
      className={`${styles.tile} ${locked ? styles.locked : ''}`}
      data-testid="swatch"
      data-hex={hex}
      data-locked={String(locked)}
    >
      <button type="button" className={styles.copy} aria-label={copyLabel(hex)} onClick={onCopy}>
        <span className={styles.block} style={{ background: hex }} />
        <span className={styles.hex}>{hex}</span>
      </button>
      <button
        type="button"
        className={`${styles.chip} ${styles.lockChip}`}
        aria-pressed={locked}
        aria-label={lockLabel(hex, locked)}
        data-testid="lock"
        onClick={onLock}
      >
        <LockIcon locked={locked} />
      </button>
      {locked && (
        <button
          type="button"
          className={`${styles.chip} ${styles.removeChip}`}
          aria-label={removeLabel(hex)}
          data-testid="remove"
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </div>
  );
}
