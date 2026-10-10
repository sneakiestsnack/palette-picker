import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { STRINGS } from '../strings';
import { Controls } from './Controls';
import { ExportSection } from './ExportSection';
import styles from './Panel.module.css';
import { PaletteSection } from './PaletteSection';

// Right-hand panel on desktop; on phones the sections reorder (palette, controls, export) and
// Controls becomes a disclosure (Appendix D §D1).
export function Panel() {
  const { state, dispatch } = useApp();
  const open = state.phoneControlsOpen;
  return (
    <aside className={styles.panel}>
      <section className={`${styles.section} ${styles.controls}`}>
        <h2 className={`${styles.heading} ${styles.desktopOnly}`}>{STRINGS.CONTROLS}</h2>
        <button
          type="button"
          className={`${styles.disclosure} ${styles.phoneOnly}`}
          aria-expanded={open}
          aria-controls="controls-body"
          data-testid="controls-toggle"
          onClick={() => dispatch(actions.phoneControlsToggled())}
        >
          <span>{STRINGS.CONTROLS}</span>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
        <div id="controls-body" className={open ? undefined : styles.collapsed}>
          <Controls />
        </div>
      </section>
      <section className={`${styles.section} ${styles.palette}`}>
        <PaletteSection />
      </section>
      <section className={`${styles.section} ${styles.export}`}>
        <h2 className={styles.heading}>{STRINGS.EXPORT}</h2>
        <ExportSection />
      </section>
    </aside>
  );
}
