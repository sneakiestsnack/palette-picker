// PWA hooks: update prompt (never auto-reload: it would wipe the current image) and the install prompt.
import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useUpdatePrompt(): { updateReady: boolean; reload(): void; dismiss(): void } {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  return {
    updateReady: needRefresh,
    reload: () => { void updateServiceWorker(true); },
    dismiss: () => setNeedRefresh(false),
  };
}

function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function useInstallPrompt(): { canInstall: boolean; install(): void } {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(() => {
    if (!event) return;
    void event.prompt();
    void event.userChoice.finally(() => setEvent(null));    // the event can be used only once
  }, [event]);

  return { canInstall: event !== null, install };
}
