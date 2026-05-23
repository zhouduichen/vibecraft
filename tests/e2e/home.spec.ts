import { expect, test } from '@playwright/test';

test('home page redirects anonymous users to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'VibeCraft' })).toBeVisible();
  await expect(page.getByRole('button', { name: /GitHub/ })).toBeVisible();
});
