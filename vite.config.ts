import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { manifest } from './src/pwa/manifest.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Update flow (ADR-027): the new SW installs, skips waiting and claims clients at once, so the
      // next load always gets the new shell. The open page is NOT force-reloaded; a lazy chunk of the
      // old build requested before reload may 404 (old precache is cleaned up). Revisit if that bites.
      registerType: 'autoUpdate',
      manifest,
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      reporter: ['text-summary', 'lcov'],
      // Money maths has no untested branch (docs/plan/M1.md, "Готово, когда").
      thresholds: {
        'src/domain/money/**': { branches: 100 },
        'src/domain/fx/**': { branches: 100 },
      },
    },
  },
});
