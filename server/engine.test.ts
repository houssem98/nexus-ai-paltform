import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGraph } from './engine';

test('validateGraph rejects a graph with no Start node', () => {
  const result = validateGraph([{ id: 'n_end', type: 'end', label: 'End', x: 0, y: 0, config: {} }], []);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['Workflow must contain at least one Start trigger node.']);
});
