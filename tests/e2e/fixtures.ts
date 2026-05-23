import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ context, page, baseURL }, provide) => {
    const url = new URL(baseURL || 'http://127.0.0.1:3000');
    await context.addCookies([
      {
        name: 'vibecraft-e2e-auth',
        value: '1',
        domain: url.hostname,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await provide(page);
  },
});

export { expect } from '@playwright/test';
