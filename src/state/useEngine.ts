// React glue between state and the engine client. Effects only subscribe; the worker is a module singleton.
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { DecodeError, decodeImage } from '../platform/decodeImage';
import { getEngineClient } from '../platform/engineClient';
import { actions, type Action } from './actions';
import type { AppState } from './appState';

export type WorkerStatus = 'pending' | 'ok' | 'error';

export interface EngineBinding {
  workerStatus: WorkerStatus;
  displayCanvas: HTMLCanvasElement | null;                  // decoded display-size image (main thread copy)
  valueMap: Uint8Array | null;                              // display resolution, 255 = transparent
  loadFile(file: Blob, name: string): Promise<void>;
}

export function useEngine(state: AppState, dispatch: Dispatch<Action>): EngineBinding {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('pending');
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const [valueMap, setValueMap] = useState<Uint8Array | null>(null);
  const loadSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    getEngineClient().ping().then(
      () => { if (!cancelled) setWorkerStatus('ok'); },
      () => { if (!cancelled) setWorkerStatus('error'); },
    );
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const client = getEngineClient();
    const offExtracted = client.onExtracted((result, excluded, request) => {
      dispatch(actions.extractionSucceeded(result, excluded, request));
    });
    const offError = client.onError((message, request) => {
      if (request !== undefined) dispatch(actions.extractionFailed(message, request));
    });
    return () => {
      offExtracted();
      offError();
    };
  }, [dispatch]);

  // Extraction is requested only by bumping palette.extractionRequest (blueprint §3.4).
  const latest = useRef(state);
  latest.current = state;
  const { extractionRequest } = state.palette;
  const imageId = state.image?.imageId;
  useEffect(() => {
    const s = latest.current;
    if (imageId === undefined || extractionRequest === s.palette.appliedRequest) return;
    dispatch(actions.extractionStarted(extractionRequest));
    const { entries } = s.palette;
    const params = { controls: s.controls, locked: entries.filter((e) => e.locked).map((e) => e.hex), excluded: s.excluded };
    // Re-roll: currentPicks = candidate indexes of the unlocked entries, in entries order.
    const reroll = s.palette.rerollFor === extractionRequest
      ? { currentPicks: entries.filter((e) => !e.locked && e.candidateIndex !== null).map((e) => e.candidateIndex!) }
      : undefined;
    getEngineClient().extract(params, extractionRequest, reroll);
  }, [extractionRequest, imageId, dispatch]);

  const loadFile = useCallback(async (file: Blob, name: string) => {
    const seq = ++loadSeq.current;
    dispatch(actions.imageLoadStarted(name));
    try {
      const decoded = await decodeImage(file, name);
      if (seq !== loadSeq.current) return;
      const loaded = await getEngineClient().load(decoded.rgba);
      if (seq !== loadSeq.current) return;
      setDisplayCanvas(decoded.canvas);
      setValueMap(loaded.valueMap);
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

  return useMemo(() => ({ workerStatus, displayCanvas, valueMap, loadFile }), [workerStatus, displayCanvas, valueMap, loadFile]);
}
