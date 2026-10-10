// React glue between state and the engine client. Effects only subscribe; the worker is a module singleton.
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { DecodeError, decodeImage } from '../platform/decodeImage';
import { getEngineClient } from '../platform/engineClient';
import { actions, type Action } from './actions';
import type { Hex } from '../core';
import type { AppState } from './appState';

export type WorkerStatus = 'pending' | 'ok' | 'error';

export interface LabelMapData { palette: Hex[]; width: number; height: number; labels: Uint8Array }

export interface EngineBinding {
  workerStatus: WorkerStatus;
  displayCanvas: HTMLCanvasElement | null;                  // decoded display-size image (main thread copy)
  valueMap: Uint8Array | null;                              // display resolution, 255 = transparent
  labelMap: LabelMapData | null;                            // show-where labels at mask resolution (Phase 13)
  loadFile(file: Blob, name: string): Promise<void>;
}

export function useEngine(state: AppState, dispatch: Dispatch<Action>): EngineBinding {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus>('pending');
  const [displayCanvas, setDisplayCanvas] = useState<HTMLCanvasElement | null>(null);
  const [valueMap, setValueMap] = useState<Uint8Array | null>(null);
  const [labelMap, setLabelMap] = useState<LabelMapData | null>(null);
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
    const offCoverage = client.onCoverage((palette, shares) => dispatch(actions.coverageReceived(palette, shares)));
    const offLabelMap = client.onLabelMap((palette, width, height, labels) => setLabelMap({ palette, width, height, labels }));
    const offError = client.onError((message, request) => {
      if (request !== undefined) dispatch(actions.extractionFailed(message, request));
    });
    return () => {
      offExtracted();
      offCoverage();
      offLabelMap();
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

  // Coverage after every change to the entries (in entries order) or the value range (Phase 13).
  const hexKey = state.palette.entries.map((e) => e.hex).join(',');
  const { min, max } = state.controls.valueRange;
  useEffect(() => {
    if (imageId === undefined) return;
    getEngineClient().coverage(hexKey === '' ? [] : hexKey.split(','), { min, max });
  }, [hexKey, min, max, imageId]);

  // Label map only while a swatch is selected with show-where on; it depends on palette and range, not on which swatch.
  const wantLabels = state.selectedHex !== null && state.showWhere;
  useEffect(() => {
    if (imageId === undefined || !wantLabels || hexKey === '') return;
    getEngineClient().labelMap(hexKey.split(','), { min, max });
  }, [wantLabels, hexKey, min, max, imageId]);

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
      setLabelMap(null);
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

  return useMemo(
    () => ({ workerStatus, displayCanvas, valueMap, labelMap, loadFile }),
    [workerStatus, displayCanvas, valueMap, labelMap, loadFile],
  );
}
