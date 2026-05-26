import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('preview iframe ready protocol is shared by bridge and host', () => {
  const bridge = readFileSync(new URL('../../src/lib/ai/slot-bridge.ts', import.meta.url), 'utf8');
  const host = readFileSync(new URL('../../src/components/PreviewPane.tsx', import.meta.url), 'utf8');

  assert.match(bridge, /RENDER_READY/);
  assert.match(host, /RENDER_READY/);
});
