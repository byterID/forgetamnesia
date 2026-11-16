import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker; with autoUpdate a new version replaces the shell on next load. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  registerSW({ immediate: true });
}
