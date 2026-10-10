import { useEffect, useState } from 'react';
import { getEngineClient } from '../platform/engineClient';

type WorkerStatus = 'pending' | 'ok' | 'error';

export function App() {
  const [ready, setReady] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('pending');

  useEffect(() => {
    setReady(true);
    let cancelled = false;
    getEngineClient().ping().then(
      () => { if (!cancelled) setWorkerStatus('ok'); },
      () => { if (!cancelled) setWorkerStatus('error'); },
    );
    return () => { cancelled = true; };
  }, []);

  return (
    <main>
      <h1>Palette Picker</h1>
      <p data-testid="worker-status">worker: {workerStatus}</p>
      {ready && <span data-testid="app-ready" hidden />}
    </main>
  );
}
