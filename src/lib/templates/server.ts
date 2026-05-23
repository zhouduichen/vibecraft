import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TEMPLATE_CATALOG } from './catalog';

const TEMPLATE_ROOT = path.join(process.cwd(), 'templates', 'local');

const TEMPLATE_FILE_MAP: Record<string, string> = {
  ledger: path.join('ledger', 'template.html'),
  todo: path.join('todo', 'template.html'),
  checkin: path.join('checkin', 'template.html'),
  'personal-portfolio': path.join('personal-portfolio', 'template.html'),
  'product-landing': path.join('product-landing', 'template.html'),
  'restaurant-menu': path.join('restaurant-menu', 'template.html'),
  'reading-notes': path.join('reading-notes', 'template.html'),
  'resume-page': path.join('resume-page', 'template.html'),
  'content-calendar': path.join('content-calendar', 'template.html'),
};

export function getTemplateMeta(id: string | undefined) {
  if (!id) return null;
  return TEMPLATE_CATALOG.find((t) => t.id === id) ?? null;
}

export async function loadTemplateHtml(id: string): Promise<string> {
  const relativePath = TEMPLATE_FILE_MAP[id];
  if (!relativePath) {
    throw new Error(`Template not found: ${id}`);
  }

  const fullPath = path.resolve(TEMPLATE_ROOT, relativePath);
  const rootWithSeparator = `${path.resolve(TEMPLATE_ROOT)}${path.sep}`;
  if (!fullPath.startsWith(rootWithSeparator)) {
    throw new Error(`Template path escaped root: ${id}`);
  }

  return readFile(fullPath, 'utf8');
}
