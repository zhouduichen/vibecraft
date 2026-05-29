import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('repair route catches worker bridge errors and returns stable JSON responses', () => {
  const route = readFileSync(new URL('../../src/app/api/chat/repair/route.ts', import.meta.url), 'utf8');

  assert.match(route, /WorkerUnreachableError/);
  assert.match(route, /WorkerHttpError/);
  assert.match(route, /WorkerSchemaError/);
  assert.match(route, /try\s*\{[\s\S]*runPipeline/);
  assert.match(route, /catch\s*\([^)]*\)\s*\{[\s\S]*WorkerUnreachableError/);
  assert.match(route, /修复服务暂时不可用/);
});
