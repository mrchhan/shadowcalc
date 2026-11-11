/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` produces relative asset URLs, so the same build works at a
// domain root, on GitHub Pages (/<repo>/), behind the Node server, and from
// disk inside the Electron desktop app. The offline service worker is
// generated after the build by scripts/build-sw.mjs.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // During development, forward /api/* to the optional rates proxy
    // (`npm run dev:server`). Only used when VITE_RATES_PROXY_URL is set.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
