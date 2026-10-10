import type { PaletteEntry } from '../../core';
import { actions } from '../../state/actions';
import { isCoverageSettled } from '../../state/appState';
import { useApp } from '../../state/AppProvider';
import { proportionLabel } from '../strings';
import styles from './PaletteSection.module.css';

// How much of the in-range image each swatch represents, in display order (A14).
export function ProportionBar({ display }: { display: readonly PaletteEntry[] }) {
  const { state, dispatch } = useApp();
  const cov = state.coverage;
  const shareOf = (hex: string) => {
    const i = cov ? cov.palette.indexOf(hex) : -1;
    return i >= 0 ? cov!.shares[i]! : 0;
  };
  return (
    <div className={styles.proportionBar} data-testid="proportion-bar" data-coverage-settled={String(isCoverageSettled(state))}>
      {display.map((e) => {
        const share = shareOf(e.hex);
        const label = proportionLabel(e.hex, share);
        return (
          <span
            key={e.hex}
            className={styles.segment}
            style={{ flexGrow: share, background: e.hex }}
            title={label}
            aria-label={label}
            role="img"
            onClick={() => dispatch(actions.swatchSelected(e.hex))}
          />
        );
      })}
    </div>
  );
}
