import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// npm test runs in a temporary cwd, so resolve repo files from this file.
const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf-8').replace(/\r/g, '');
const findings = read('../docs/audit/SECURITY_FINDINGS.md').split(/^### (?=S\d)/m).slice(1);
const l1 = read('../docs/loops/L1_TRUST.md');
const ledgers = new Map([...read('../docs/LOOP_GRAPH.md').matchAll(/^- \[[ x]\] (L\d+) .*ledger: `([^`]+)`/gm)].map((m) => [m[1], m[2]]));

test('every security finding has a severity, a confidence, an evidence citation and an L1 test name', () => {
  assert.ok(findings.length > 0, 'no findings parsed');
  for (const f of findings) {
    const id = f.split(' ')[0];
    assert.match(f, /^S\d+ · [a-z ]+ · (critical|high|medium|low) · confidence (high|medium|low)\n/, `${id}: heading`);
    assert.match(f, /^Evidence: .*`[\w./-]+\.(ts|tsx|mjs|js|json|md|html|css)#[^`]+`/m, `${id}: evidence citation`);
    const t = f.match(/^Test: L1 (T\d+): (.+)$/m);
    assert.ok(t, `${id}: test name`);
    const task = l1.match(new RegExp(`^- \\[[ x]\\] ${t[1]} .*$`, 'm'));
    assert.ok(task, `${id}: ${t[1]} is not an L1 task`);
    assert.ok(task[0].includes(t[2]), `${id}: ${t[1]} does not name the test "${t[2]}"`);
  }
});

// What a finding leaves open goes to a later loop's task, which must name the test that closes it.
test('every test a finding names, in any loop, is named word for word by that loop\'s task', () => {
  for (const f of findings) {
    const id = f.split(' ')[0];
    for (const [, loop, n, name] of f.matchAll(/^Test: (L\d+) (T\d+): (.+)$/gm)) {
      assert.ok(ledgers.has(loop), `${id}: ${loop} is not a loop`);
      const task = read(`../${ledgers.get(loop)}`).match(new RegExp(`^- \\[[ x]\\] ${n} .*$`, 'm'));
      assert.ok(task, `${id}: ${n} is not an ${loop} task`);
      assert.ok(task[0].includes(name), `${id}: ${loop} ${n} does not name the test "${name}"`);
    }
  }
});
