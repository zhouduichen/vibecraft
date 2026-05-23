import { expect, test } from './fixtures';

test('authenticated fixture can reach the creation surface', async ({ authenticatedPage: page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('main input[type="text"]')).toBeVisible();
});

test('authenticated fixture can reach the template market', async ({ authenticatedPage: page }) => {
  await page.goto('/templates');

  await expect(page).toHaveURL(/\/templates$/);
  await expect(page.locator('main [role="tablist"]')).toBeVisible();
});
