import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// npm test runs in a temporary cwd, so resolve repo files from this file.
const doc = fs.readFileSync(new URL('../docs/architecture/TARGET_ARCHITECTURE.md', import.meta.url), 'utf-8').replace(/\r/g, '');
const decisions = doc.split(/^### (?=D\d)/m).slice(1);

test('the target architecture decides identity, tenancy, store and runtime, each naming the files it changes', () => {
  const titles = decisions.map((d) => d.split('\n')[0].toLowerCase());
  for (const topic of ['identity', 'tenancy', 'store', 'runtime']) {
    assert.ok(titles.some((t) => t.includes(topic)), `no decision on ${topic}`);
  }
  for (const d of decisions) {
    assert.match(d, /^Changes: .*`[\w./-]+\.(ts|tsx|mjs|js|json|md|html|css)(#[^`]+)?`/m, `${d.split('\n')[0]}: no cited file`);
  }
});
