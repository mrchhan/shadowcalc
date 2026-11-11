import { useSyncExternalStore } from 'react';

const subscribe = (callback: () => void) => {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
};

/** Live online/offline status from the browser. */
export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine !== false,
    () => true,
  );
