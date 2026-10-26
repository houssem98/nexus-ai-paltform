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

// storage reads cwd when the module loads, so import it only after chdir.
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-storage-'));
process.chdir(dir);
const storeFile = path.join(dir, 'data', 'nexus-store.json');
const { db, settingsOf } = await import('./storage');
const { app } = await import('../server');
// Settings are per org since L1 T4; the session below is the seed org's admin.
const seedSettings = () => settingsOf(db.getState(), 'org_nexus_enterprises');
const { createSession, SESSION_COOKIE } = await import('./auth');

const server = app.listen(0);
await once(server, 'listening');
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

test('storage seeds an empty directory', () => {
  const onDisk = JSON.parse(fs.readFileSync(storeFile, 'utf-8'));
  assert.equal(onDisk.organizations[0].id, 'org_nexus_enterprises');
  assert.deepEqual(onDisk, db.getState());
});

// L1 T8: the store survives a crash, refuses to boot from a damaged file, and a failed write fails the request.
test('a simulated crash mid-write leaves the previous state readable', () => {
  const before = fs.readFileSync(storeFile, 'utf-8');
  const write = fs.writeFileSync;
  const crash = mock.method(fs, 'writeFileSync', (file: any, data: any, opts: any) => {
    write(file, String(data).slice(0, 100), opts);
    throw new Error('simulated crash');
  });
  try {
    assert.throws(() => db.mutate((s) => { settingsOf(s, 'org_nexus_enterprises').dataRetentionDays = 7; }), /simulated crash/);
  } finally {
    crash.mock.restore();
  }
  assert.equal(fs.readFileSync(storeFile, 'utf-8'), before);
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
});

test('a write error returns 5xx', async () => {
  const before = seedSettings().dataRetentionDays;
  const full = mock.method(fs, 'writeFileSync', () => {
    throw Object.assign(new Error('ENOSPC: no space left on device'), { code: 'ENOSPC' });
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
test('keys stored in plain text before L1 T7 stop working at the next boot', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-keys-'));
  const storage = new URL('./storage.ts', import.meta.url).href;
  fs.writeFileSync(path.join(dir, 'boot.mjs'), `const { db } = await import(${JSON.stringify(storage)});\nconsole.log(JSON.stringify(db.getState().deployments));\n`);
  const boot = () => spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), 'boot.mjs'], { cwd: dir, encoding: 'utf-8' });
  assert.equal(boot().status, 0, 'first boot seeds the store');
  const file = path.join(dir, 'data', 'nexus-store.json');
  const old = JSON.parse(fs.readFileSync(file, 'utf-8'));
  for (const d of old.deployments) {
    delete d.apiKeyHash;
    d.apiKey = 'nx_live_leaked';
  }
  fs.writeFileSync(file, JSON.stringify(old));
  const out = boot();
  assert.equal(out.status, 0, out.stderr);
  const deployments = JSON.parse(out.stdout.trim().split('\n').pop()!);
  assert.ok(deployments.length > 0);
  for (const d of deployments) {
    assert.equal(d.apiKey, undefined);
    assert.match(d.apiKeyHash, /^[0-9a-f]{64}$/);
    assert.notEqual(d.apiKeyHash, createHash('sha256').update('nx_live_leaked').digest('hex'), 'the leaked key no longer matches');
  }
});
