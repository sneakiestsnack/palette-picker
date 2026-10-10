// React glue between state and the engine client. Effects only subscribe; the worker is a module singleton.
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { DecodeError, decodeImage } from '../platform/decodeImage';
import { getEngineClient } from '../platform/engineClient';
import { actions, type Action } from './actions';

export type WorkerStatus = 'pending' | 'ok' | 'error';

export interface EngineBinding {
  workerStatus: WorkerStatus;
  displayCanvas: HTMLCanvasElement | null;                  // decoded display-size image (main thread copy)
  loadFile(file: Blob, name: string): Promise<void>;
}

export function useEngine(dispatch: Dispatch<Action>): EngineBinding {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('pending');
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getEngineClient().ping().then(
      () => { if (!cancelled) setWorkerStatus('ok'); },
      () => { if (!cancelled) setWorkerStatus('error'); },
    );
    return () => { cancelled = true; };
  }, []);

  const loadFile = useCallback(async (file: Blob, name: string) => {
    const seq = ++loadSeq.current;
    dispatch(actions.imageLoadStarted(name));
    try {
      const decoded = await decodeImage(file, name);
      if (seq !== loadSeq.current) return;
      const loaded = await getEngineClient().load(decoded.rgba);
      if (seq !== loadSeq.current) return;
      setDisplayCanvas(decoded.canvas);
      dispatch(actions.imageLoaded({
        imageId: loaded.imageId,
        name,
        width: decoded.canvas.width,
        height: decoded.canvas.height,
        originalWidth: decoded.originalWidth,
        originalHeight: decoded.originalHeight,
        histogram: loaded.histogram,
        processingWidth: loaded.processingWidth,
        processingHeight: loaded.processingHeight,
      }));
    } catch (err) {
      if (seq !== loadSeq.current) return;
      dispatch(actions.imageLoadFailed(err instanceof DecodeError ? err.key : 'ERR_DECODE'));
    }
  }, [dispatch]);

  return useMemo(() => ({ workerStatus, displayCanvas, loadFile }), [workerStatus, displayCanvas, loadFile]);
}
