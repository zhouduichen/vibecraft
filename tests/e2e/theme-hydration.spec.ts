import { expect, test } from '@playwright/test';

test('stored light theme does not cause a hydration mismatch on login', async ({ page }) => {
  const hydrationErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/hydration|server rendered html didn't match/i.test(text)) {
      hydrationErrors.push(text);
    }
  });
  page.on('pageerror', (error) => {
    if (/hydration|server rendered html didn't match/i.test(error.message)) {
      hydrationErrors.push(error.message);
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'light');
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'VibeCraft' })).toBeVisible();

  expect(hydrationErrors).toEqual([]);
});
