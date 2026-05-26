import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('project delete route removes dependent rows before deleting the project', () => {
  const route = readFileSync(new URL('../../src/app/api/projects/[id]/route.ts', import.meta.url), 'utf8');

  const publishedAppsDelete = route.indexOf(".from('published_apps')");
  const versionsDelete = route.indexOf(".from('versions')");
  const projectDelete = route.lastIndexOf(".from('projects')");

  assert.notEqual(publishedAppsDelete, -1);
  assert.notEqual(versionsDelete, -1);
  assert.notEqual(projectDelete, -1);
  assert.ok(publishedAppsDelete < versionsDelete);
  assert.ok(versionsDelete < projectDelete);
  assert.match(route, /\.from\('credit_transactions'\)[\s\S]*\.update\(\{\s*project_id:\s*null\s*\}\)/);
});
