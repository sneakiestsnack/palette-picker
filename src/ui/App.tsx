import { useEffect } from 'react';
import { AppProvider, useApp } from '../state/AppProvider';
import styles from './App.module.css';
import { InstallButton, UpdateBanner } from './components/AppChrome';
import { ImageStage } from './components/ImageStage';
import { Panel } from './components/Panel';
import { Toast } from './components/Toast';
import { STRINGS } from './strings';

function Shell() {
  const { workerStatus } = useApp();

  // Without these, a drop anywhere outside the stage navigates the browser to the file (Appendix G #15).
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div className={styles.app} data-testid="app-ready">
      <header className={styles.header}>
        <h1 className={styles.title}>{STRINGS.APP_TITLE}</h1>
        <div className={styles.headerRight}>
          <span className={styles.workerStatus} data-testid="worker-status">worker: {workerStatus}</span>
          <InstallButton />
        </div>
      </header>
      <UpdateBanner />
      <ImageStage />
      <Panel />
      <Toast />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
