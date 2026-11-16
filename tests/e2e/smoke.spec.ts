import { expect, test } from '@playwright/test';

test('opens the app and switches tabs via the bottom nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Основная навигация' });
  for (const name of ['Операции', 'Календарь', 'Цели']) {
    await nav.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }
});

test('has no horizontal scroll at phone width', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test('shell renders on offline reload after the service worker took control', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Wait until the SW controls the page (clientsClaim).
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Основная навигация' })).toBeVisible();

  // Deep link also falls back to the shell.
  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Календарь' })).toBeVisible();
});
