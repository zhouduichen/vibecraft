import { expect, test } from '@playwright/test';

test('template market redirects anonymous users to login', async ({ page }) => {
  await page.goto('/templates');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'VibeCraft' })).toBeVisible();
});

test('template preview endpoint serves html', async ({ request }) => {
  const response = await request.get('/api/templates/ledger/preview');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('text/html');
  await expect(await response.text()).toContain('<!DOCTYPE html>');
});
