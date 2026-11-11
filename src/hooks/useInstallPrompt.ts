import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Exposes the browser's "Install app" prompt (Chrome/Edge on desktop and
 * Android). Returns null when installing isn't available, e.g. already
 * installed, inside the desktop app, or on iOS (use Share → Add to Home Screen).
 */
export function useInstallPrompt(): (() => Promise<void>) | null {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
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

  if (!event) return null;
  return async () => {
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };
}
