import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type DragEvent } from 'react';
import { actions } from '../../state/actions';
import { useApp } from '../../state/AppProvider';
import { ERRORS, STRINGS, imageSizeLabel } from '../strings';
import styles from './ImageStage.module.css';
import { EyedropperButton, useEyedropper } from './Eyedropper';
import { OverlayCanvas } from './OverlayCanvas';
import { OverlayToolbar } from './OverlayToolbar';

function imageFileFromItems(items: DataTransferItemList): File | null {
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

export function ImageStage() {
  const { state, dispatch, displayCanvas, loadFile } = useApp();
  const { image, loading, error } = state;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const eyedropper = useEyedropper(canvasRef);

  // Copy the decoded display canvas into the on-screen one (same size, so the pixels are exact).
  useEffect(() => {
    const target = canvasRef.current;
    if (!target || !displayCanvas) return;
    target.width = displayCanvas.width;
    target.height = displayCanvas.height;
    target.getContext('2d')?.drawImage(displayCanvas, 0, 0);
  }, [displayCanvas, image]);

  // Paste an image from anywhere in the document; plain text pastes pass through.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      const file = items ? imageFileFromItems(items) : null;
      if (!file) return;
      e.preventDefault();
      void loadFile(file, file.name || 'pasted image');
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [loadFile]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
      void loadFile(file, file.name);
    } else if (dt.types.includes('text/uri-list') || dt.types.includes('text/html')) {
      dispatch(actions.imageLoadFailed('ERR_DROPPED_URL'));
    }
  };

  const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';                             // so the same file can be picked twice
    if (file) void loadFile(file, file.name);
  };

  const status = loading ? 'loading' : error ? 'error' : image ? 'ready' : 'empty';
  const wrapperStyle = image ? ({ '--w': image.width, '--h': image.height } as CSSProperties) : undefined;

  return (
    <section className={styles.stage}>
      <div className={styles.toolbar}>
        {image && <OverlayToolbar />}
        {image && <EyedropperButton />}
      </div>
      {error && (
        <div className={styles.errorBanner} role="alert" data-testid="error-banner">{ERRORS[error]}</div>
      )}
      <div
        className={`${styles.area} ${dragOver ? styles.dragOver : ''}`}
        data-testid="drop-zone"
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {image ? (
          <div className={`${styles.wrapper} ${eyedropper.on ? styles.picking : ''}`} style={wrapperStyle} {...eyedropper.handlers}>
            <canvas ref={canvasRef} className={styles.canvas} data-testid="image-canvas" />
            <OverlayCanvas className={styles.layer} />
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.desktopOnly}>
              <p>{STRINGS.EMPTY_DESKTOP}</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}>{STRINGS.BROWSE}</button>
            </div>
            <div className={styles.phoneOnly}>
              <button type="button" className={styles.bigButton} onClick={() => fileInputRef.current?.click()}>{STRINGS.CHOOSE_PHOTO}</button>
              <button type="button" className={styles.bigButton} onClick={() => cameraInputRef.current?.click()}>{STRINGS.TAKE_PHOTO}</button>
              <p>{STRINGS.EMPTY_PHONE}</p>
            </div>
          </div>
        )}
      </div>
      <div className={styles.caption} data-testid="image-status" data-state={status}>
        {loading ? STRINGS.LOADING : image ? (
          <>
            <span className={styles.name}>{image.name}</span>
            <span>{imageSizeLabel(image.width, image.height, image.originalWidth, image.originalHeight)}</span>
            <button type="button" onClick={() => fileInputRef.current?.click()}>{STRINGS.BROWSE}</button>
          </>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        data-testid="file-input"
        onChange={onFilePicked}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="camera-input"
        onChange={onFilePicked}
      />
      {eyedropper.loupeElement}
    </section>
  );
}
