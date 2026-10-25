import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('storage seeds an empty directory', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-storage-'));
  process.chdir(dir);
  // storage reads cwd when the module loads, so import it only after chdir.
  const { db } = await import('./storage');
  const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'data', 'nexus-store.json'), 'utf-8'));
  assert.equal(onDisk.organizations[0].id, 'org_nexus_enterprises');
  assert.deepEqual(onDisk, db.getState());
});
