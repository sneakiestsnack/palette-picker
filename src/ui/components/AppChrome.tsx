import { useInstallPrompt, useUpdatePrompt } from '../../platform/pwa';
import { STRINGS } from '../strings';
import styles from './AppChrome.module.css';

export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <button type="button" data-testid="install-button" onClick={install}>{STRINGS.INSTALL_APP}</button>
  );
}

export function UpdateBanner() {
  const { updateReady, reload, dismiss } = useUpdatePrompt();
  if (!updateReady) return null;
  return (
    <div className={styles.banner} role="status" data-testid="update-banner">
      <span>{STRINGS.UPDATE_READY}</span>
      <button type="button" onClick={reload}>{STRINGS.RELOAD}</button>
      <button type="button" aria-label={STRINGS.CLOSE} onClick={dismiss}>×</button>
    </div>
  );
}
