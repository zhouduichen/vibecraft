import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const serverURL = new URL(baseURL);
const serverPort = serverURL.port || (serverURL.protocol === 'https:' ? '443' : '80');
const serverHostname = serverURL.hostname;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node -e "process.env.PORT='${serverPort}'; process.env.HOSTNAME='${serverHostname}'; process.env.AUTH_URL='${baseURL}'; process.env.AUTH_SECRET='playwright-test-secret-playwright-test-secret'; process.env.E2E_AUTH_BYPASS='1'; require('./.next/standalone/server.js')"`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
