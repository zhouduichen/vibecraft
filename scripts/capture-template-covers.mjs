// Captures production-quality PNG covers for all templates using Playwright.
// Prerequisites: npm install -D playwright && npx playwright install chromium
// Requires: dev server running (npm run dev)
// Run: node scripts/capture-template-covers.mjs

import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public', 'templates', 'local');

const TEMPLATES = [
  'ledger',
  'todo',
  'checkin',
  'personal-portfolio',
  'product-landing',
  'restaurant-menu',
  'reading-notes',
  'resume-page',
  'content-calendar',
];

// Use whichever port the dev server is on
const BASE_URL = process.env.PREVIEW_BASE || 'http://localhost:3008';

async function capture(context, id, outPath) {
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    const url = `${BASE_URL}/api/templates/${id}/preview`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for content to render
    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        if (root && root.children.length > 0) return true;
        if (!root && document.body.children.length > 2) return true;
        return false;
      }, { timeout: 10000 });
    } catch {
      errors.push('Render timeout — capturing current state');
    }

    // Settle time for CSS animations/fonts
    await page.waitForTimeout(500);

    await page.screenshot({ path: outPath, type: 'png', fullPage: false });

    const rootHTML = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 'no #root';
    });
    console.log(`  ${id}: root=${rootHTML} chars, errors=${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(e => console.log(`    [err] ${e}`));
    }
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch();

  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });

  for (const id of TEMPLATES) {
    const outPath = join(PUBLIC_DIR, id, 'cover.png');

    try {
      console.log(`Capturing ${id}...`);
      await capture(context, id, outPath);
    } catch (err) {
      console.error(`  FAILED: ${id} — ${err.message}`);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main();
