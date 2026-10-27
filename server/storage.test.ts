import test, { after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { StatementSync } from 'node:sqlite';

// storage reads cwd when the module loads, so import it only after chdir.
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-storage-'));
process.chdir(dir);
const { db, settingsOf } = await import('./storage');
const { app } = await import('../server');
// Settings are per org since L1 T4; the session below is the seed org's admin.
const seedSettings = () => settingsOf(db.getState(), 'org_nexus_enterprises');
const { createSession, SESSION_COOKIE } = await import('./auth');
// What a fresh process would load from this directory's store.
const dataDir = path.join(dir, 'data');
const restart = async () => {
  const { StorageManager } = await import('./storage');
  return JSON.parse(JSON.stringify(new StorageManager(dataDir).getState()));
};
const bootIn = (cwd: string, script: string) => spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), script], { cwd, encoding: 'utf-8' });

const server = app.listen(0);
await once(server, 'listening');
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

test('storage seeds an empty directory', async () => {
  const onDisk = await restart();
  assert.equal(onDisk.organizations[0].id, 'org_nexus_enterprises');
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(db.getState())));
});

// L1 T8: the store survives a crash, refuses to boot from a damaged file, and a failed write fails the request.
test('a simulated crash mid-write leaves the previous state readable', async () => {
  const before = JSON.stringify(await restart());
  // The second row of a two-row write fails, after the first was written inside the transaction.
  const run = StatementSync.prototype.run;
  let rows = 0;
  const crash = mock.method(StatementSync.prototype, 'run', function (this: StatementSync, ...args: any[]) {
    if (++rows === 2) throw new Error('simulated crash');
    return run.apply(this, args as any);
  });
  try {
    assert.throws(() => db.mutate((s) => {
      settingsOf(s, 'org_nexus_enterprises').dataRetentionDays = 7;
      s.agents[0].name = 'half written';
    }), /simulated crash/);
  } finally {
    crash.mock.restore();
  }
  assert.equal(JSON.stringify(await restart()), before, 'the database holds neither change');
  assert.notEqual(seedSettings().dataRetentionDays, 7, 'memory keeps no change the disk refused');
});

test('a corrupt store makes boot fail without modifying the file', () => {
  const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-corrupt-'));
  fs.mkdirSync(path.join(bad, 'data'));
  const file = path.join(bad, 'data', 'nexus-store.json');
  fs.writeFileSync(file, '{"organizations": [');
  const boot = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), fileURLToPath(new URL('./storage.ts', import.meta.url))], { cwd: bad, encoding: 'utf-8' });
  assert.notEqual(boot.status, 0, 'boot must fail');
  assert.match(boot.stderr, /store file .* cannot be read/);
  assert.equal(fs.readFileSync(file, 'utf-8'), '{"organizations": [');

  // The same for a damaged database.
  const badDb = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-corrupt-'));
  fs.mkdirSync(path.join(badDb, 'data'));
  const dbFile = path.join(badDb, 'data', 'nexus.db');
  const garbage = 'not a database, only bytes that look like one. '.repeat(40);
  fs.writeFileSync(dbFile, garbage);
  const bootDb = bootIn(badDb, fileURLToPath(new URL('./storage.ts', import.meta.url)));
  assert.notEqual(bootDb.status, 0, 'boot must fail on a damaged database');
  assert.match(bootDb.stderr, /store file .* cannot be read/);
  assert.equal(fs.readFileSync(dbFile, 'utf-8'), garbage);
});

test('a write error returns 5xx', async () => {
  const before = seedSettings().dataRetentionDays;
  const full = mock.method(StatementSync.prototype, 'run', () => {
    throw Object.assign(new Error('database or disk is full'), { code: 'ERR_SQLITE_ERROR', errcode: 13 });
  });
  let status: number;
  try {
    const res = await fetch(base + '/api/v1/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE}=${createSession(db.getState().users[0])}` },
      body: JSON.stringify({ dataRetentionDays: before + 1 }),
    });
    status = res.status;
  } finally {
    full.mock.restore();
  }
  assert.ok(status >= 500, `got ${status}`);
  assert.equal(seedSettings().dataRetentionDays, before);
});

// L1 T7: keys stored in plain text before L1 T7 sat in a git-tracked file, so they count as leaked.
// A store from before L1 T10: the seed as one JSON file, changed by `edit`, in a directory with no database yet.
const oldStore = (edit: (state: any) => void) => {
  const scripts = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-old-'));
  const boot = path.join(scripts, 'boot.mjs');
  fs.writeFileSync(boot, `const { db } = await import(${JSON.stringify(new URL('./storage.ts', import.meta.url).href)});\nconsole.log(JSON.stringify(db.getState()));\n`);
  const seeded = bootIn(scripts, boot);
  assert.equal(seeded.status, 0, seeded.stderr);
  const state = JSON.parse(seeded.stdout.trim().split('\n').pop()!);
  edit(state);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-old-'));
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'nexus-store.json'), JSON.stringify(state));
  return { dir, json: path.join(dir, 'data', 'nexus-store.json'), boot: () => bootIn(dir, boot) };
};

test('an older JSON store is imported once, then left alone', () => {
  const old = oldStore((s) => { s.organizations[0].name = 'Imported Org'; });
  const before = fs.readFileSync(old.json, 'utf-8');
  const first = old.boot();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(JSON.parse(first.stdout.trim().split('\n').pop()!).organizations[0].name, 'Imported Org');
  assert.equal(fs.readFileSync(old.json, 'utf-8'), before, 'the JSON file is left as it was');
  fs.writeFileSync(old.json, before.replace('Imported Org', 'Edited Later'));
  const second = old.boot();
  assert.equal(JSON.parse(second.stdout.trim().split('\n').pop()!).organizations[0].name, 'Imported Org', 'the database wins once it exists');
});

// L1 T7: keys stored in plain text before L1 T7 sat in a git-tracked file, so they count as leaked.
test('keys stored in plain text before L1 T7 stop working at the next boot', () => {
  const old = oldStore((s) => {
    for (const d of s.deployments) {
      delete d.apiKeyHash;
      d.apiKey = 'nx_live_leaked';
    }
  });
  const out = old.boot();
  assert.equal(out.status, 0, out.stderr);
  const deployments = JSON.parse(out.stdout.trim().split('\n').pop()!).deployments;
  assert.ok(deployments.length > 0);
  for (const d of deployments) {
    assert.equal(d.apiKey, undefined);
    assert.match(d.apiKeyHash, /^[0-9a-f]{64}$/);
    assert.notEqual(d.apiKeyHash, createHash('sha256').update('nx_live_leaked').digest('hex'), 'the leaked key no longer matches');
  }
});

// L1 T10: the store is SQLite, written in transactions; a restart reads back exactly what was written.
const asSeedAdmin = (method: string, url: string, body?: unknown) => fetch(base + url, {
  method,
  headers: { 'content-type': 'application/json', cookie: `${SESSION_COOKIE}=${createSession(db.getState().users[0])}` },
  body: body === undefined ? undefined : JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

test('two interleaved mutating requests lose no update', async () => {
  // Creates arrive together, interleaved with workflow runs that await between their steps.
  const workflow = db.getState().workflows.find((w) => w.orgId === 'org_nexus_enterprises')!;
  // Every request sees the same millisecond, the worst case for ids built from the clock.
  const now = Date.now();
  const clock = mock.method(Date, 'now', () => now);
  const answers = await Promise.all([
    ...Array.from({ length: 20 }, (_, i) => asSeedAdmin('POST', '/api/v1/agents', { name: `concurrent ${i}` })),
    ...Array.from({ length: 10 }, (_, i) => asSeedAdmin('POST', '/api/v1/knowledge', { title: `doc ${i}`, content: `text ${i}` })),
    ...Array.from({ length: 3 }, () => asSeedAdmin('POST', `/api/v1/workflows/${workflow.id}/execute`, { amount: 10 })),
  ]).finally(() => clock.mock.restore());
  for (const a of answers) assert.ok(a.status < 300, `${a.status} ${JSON.stringify(a.body).slice(0, 100)}`);
  const agents = answers.slice(0, 20).map((a) => a.body.agent.id);
  const docs = answers.slice(20, 30).map((a) => a.body.document.id);
  const runs = answers.slice(30).map((a) => a.body.execution.id);
  assert.equal(new Set([...agents, ...docs, ...runs]).size, 33, 'every new record has its own id');
  const after = await restart();
  for (const id of agents) assert.ok(after.agents.some((x: { id: string }) => x.id === id), `agent ${id} survived`);
  for (const id of docs) assert.ok(after.knowledge.some((x: { id: string }) => x.id === id), `document ${id} survived`);
  for (const id of runs) assert.ok(after.executions.some((x: { id: string }) => x.id === id), `run ${id} survived`);
});

test('state survives a restart', async () => {
  assert.equal((await asSeedAdmin('PATCH', '/api/v1/settings', { dataRetentionDays: 30 })).status, 200);
  const workflow = db.getState().workflows.find((w) => w.orgId === 'org_nexus_enterprises')!;
  assert.equal((await asSeedAdmin('POST', '/api/v1/deployments', { workflowId: workflow.id })).status, 201);
  const agent = (await asSeedAdmin('POST', '/api/v1/agents', { name: 'to delete' })).body.agent;
  db.mutate((s) => { s.agents = s.agents.filter((a) => a.id !== agent.id); });
  const after = await restart();
  assert.deepEqual(after, JSON.parse(JSON.stringify(db.getState())));
  assert.equal(after.settings.org_nexus_enterprises.dataRetentionDays, 30);
  assert.ok(!after.agents.some((a: { id: string }) => a.id === agent.id), 'a removed record stays removed');
});

test('the suite never touches data/nexus-store.json', () => {
  // This process's store lives in its temporary directory, never in the repository.
  const repo = fileURLToPath(new URL('..', import.meta.url));
  assert.ok(!path.resolve(db.file).startsWith(path.resolve(repo)), db.file);
  // A test file that loads the store must change into a temporary directory first, so it loads it dynamically.
  const storeModules = /^import (?!type)[^\n]*from '\.\.?\/(server|storage|engine)'|await import\('\.\.?\/(server|storage|engine)'\)/m;
  for (const file of fs.readdirSync(fileURLToPath(new URL('.', import.meta.url))).filter((f) => f.endsWith('.test.ts'))) {
    const text = fs.readFileSync(new URL(`./${file}`, import.meta.url), 'utf-8');
    const first = text.search(storeModules);
    if (first < 0) continue;
    assert.ok(!/^import (?!type)[^\n]*from '\.\.?\/(server|storage|engine)'/m.test(text), `${file} imports the store before it can change directory`);
    const chdir = text.search(/process\.chdir\(/);
    assert.ok(chdir >= 0 && chdir < first, `${file} loads the store before changing into a temporary directory`);
  }
});
