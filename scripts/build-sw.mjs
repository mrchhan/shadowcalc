/**
 * Generates dist/sw.js after `vite build`. The service worker precaches the
 * whole app shell so ShadowCalc opens and works with no internet connection.
 *
 * Exchange-rate API calls are deliberately NOT cached here: the app keeps its
 * own rates cache so offline rates are always shown with their real date.
 */
import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{js,css,html,png,ico,svg,webmanifest}'],
  swDest: 'dist/sw.js',
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  sourcemap: false,
  mode: 'production',
});

for (const warning of warnings) console.warn(warning);
console.log(`Service worker: precached ${count} files (${(size / 1024).toFixed(0)} KiB)`);
