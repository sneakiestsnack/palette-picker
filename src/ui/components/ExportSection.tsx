import { useMemo, useState } from 'react';
import { ACO_MIME, aco, exportFileName, sortEntries } from '../../core';
import { isTouchDevice } from '../../platform/device';
import { renderPngCard } from '../../platform/renderPngCard';
import { nowParts, saveFile } from '../../platform/saveFile';
import { useApp } from '../../state/AppProvider';
import { STRINGS } from '../strings';
import styles from './ExportSection.module.css';

// Exports use the display order. Encoders are synchronous so saving stays inside the click handler.
export function ExportSection() {
  const { state } = useApp();
  const hexes = useMemo(() => sortEntries(state.palette.entries, 'value').map((e) => e.hex), [state.palette.entries]);
  const disabled = state.image === null || hexes.length === 0;
  const [touch] = useState(isTouchDevice);                  // touch devices prefer the share sheet for the card

  return (
    <div className={styles.buttons}>
      <button
        type="button"
        data-testid="export-aco"
        disabled={disabled}
        onClick={() => saveFile(aco(hexes), exportFileName(null, nowParts(), 'aco'), ACO_MIME)}
      >
        {STRINGS.DOWNLOAD_ACO}
      </button>
      <button
        type="button"
        data-testid="export-png"
        disabled={disabled}
        onClick={() => saveFile(renderPngCard(hexes), exportFileName(null, nowParts(), 'png'), 'image/png')}
      >
        {touch ? STRINGS.SAVE_IMAGE : STRINGS.DOWNLOAD_PNG}
      </button>
    </div>
  );
}
