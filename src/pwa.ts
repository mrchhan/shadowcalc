/**
 * Registers the service worker that caches the app for offline use.
 * Skipped inside the Electron desktop app (files are already local) and in
 * development.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  if (!/^https?:$/.test(location.protocol)) return; // app:// in the desktop app
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline support is progressive; the app still works without it.
    });
  });
}
