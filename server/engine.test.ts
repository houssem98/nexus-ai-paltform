import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The engine loads the store from the working directory, so move into a temporary one first.
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-engine-')));
const { validateGraph } = await import('./engine');

test('validateGraph rejects a graph with no Start node', () => {
  const result = validateGraph([{ id: 'n_end', type: 'end', label: 'End', x: 0, y: 0, config: {} }], []);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Workflow must contain at least one Start trigger node.']);
});
