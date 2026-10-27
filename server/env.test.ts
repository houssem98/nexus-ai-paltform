import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// L2 T1 keeps the provider key in .env, and the engine reads the key once, as its module loads.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-env-'));
fs.writeFileSync(path.join(dir, '.env'), 'GEMINI_API_KEY=not-a-real-key\n');
process.chdir(dir);
delete process.env.GEMINI_API_KEY;
process.env.NODE_ENV = 'test';
await import('../server');
const { providerConfigured } = await import('./engine');

test('a key kept only in .env reaches the engine', () => {
  assert.equal(providerConfigured(), true);
});
