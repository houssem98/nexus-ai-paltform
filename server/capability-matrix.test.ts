import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// npm test runs in a temporary cwd, so resolve repo files from this file.
const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf-8').replace(/\r/g, '');
const matrix = read('../docs/audit/CAPABILITY_MATRIX.md');
const STATUS = '(REAL|PARTIAL|SIMULATED|BROKEN|UNVERIFIED)';

const registered = [...read('../server.ts').matchAll(/^app\.(get|post|put|patch|delete)\('([^']+)'/gm)].map(
  (m) => `${m[1].toUpperCase()} ${m[2]}`,
);
const routeRows = [...matrix.matchAll(new RegExp(`^\\| (GET|POST|PUT|PATCH|DELETE) \\| \`([^\`]+)\` \\| ${STATUS} \\|.*\\| ([^|]+) \\|$`, 'gm'))];
const screenRows = [...matrix.matchAll(new RegExp(`^\\| \`src/components/(\\w+)\\.tsx\` \\| ${STATUS} \\|.*\\| ([^|]+) \\|$`, 'gm'))];

test('every route registered in server.ts has a capability matrix row', () => {
  const rows = new Set(routeRows.map((m) => `${m[1]} ${m[2]}`));
  assert.deepEqual(registered.filter((r) => !rows.has(r)), []);
});

test('every capability matrix route row names a route registered in server.ts', () => {
  assert.deepEqual(routeRows.map((m) => `${m[1]} ${m[2]}`).filter((r) => !registered.includes(r)), []);
});

test('every component in src/components has a capability matrix row', () => {
  const rows = new Set(screenRows.map((m) => m[1]));
  const components = fs.readdirSync(new URL('../src/components/', import.meta.url)).map((f) => f.replace(/\.tsx$/, ''));
  assert.deepEqual(components.filter((c) => !rows.has(c)), []);
});

test('a REAL capability matrix row names a test that exists', () => {
  const tests = fs
    .readdirSync(new URL('./', import.meta.url))
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => read(`./${f}`))
    .join('\n');
  for (const [status, knownBy] of [...routeRows, ...screenRows].map((m) => m.slice(-2))) {
    if (status !== 'REAL') continue;
    const name = knownBy.match(/^test: (.+)$/)?.[1];
    assert.ok(name && tests.includes(`'${name}'`), `REAL row needs "test: <name>" of an existing test, got "${knownBy}"`);
  }
});
