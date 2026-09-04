import { test, expect } from '@playwright/test';

/**
 * Starter smoke coverage for the guest marketplace and login flows described
 * in the brief's Testing section. Requires the API (and a seeded database)
 * to be running against the same VITE_API_URL the preview server was built
 * with - see docs/DEVELOPMENT.md for running the full stack before `pnpm
 * --filter @ptg/web test:e2e`.
 */

test('guest can browse the public catalog without signing in', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.getByRole('heading', { name: /shop/i })).toBeVisible();
});

test('login page rejects an invalid member ID / password combination', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/member id/i).fill('PTG-DOES-NOT-EXIST');
  await page.getByLabel(/^password/i).fill('wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/invalid member id or password/i)).toBeVisible();
});

test('unauthenticated visitor is redirected to /login when opening a partner-only route', async ({ page }) => {
  await page.goto('/app/wallet');
  await expect(page).toHaveURL(/\/login/);
});
