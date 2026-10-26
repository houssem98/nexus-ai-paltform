import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createServer } from 'vite';

// `npm start` runs Vite's dev middleware (server.ts, whenever NODE_ENV is not production),
// and Vite serves files from the project root unless its fs.deny list says otherwise.
test('the dev server does not serve the data store or the server source', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const vite = await createServer({ root, configFile: `${root}vite.config.ts`, server: { middlewareMode: true }, appType: 'spa', logLevel: 'silent' });
  const server = express().use(vite.middlewares).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const file of ['/data/nexus-store.json', '/server/storage.ts', '/server.ts']) {
      assert.equal((await fetch(base + file)).status, 403, file);
    }
    // The client itself must still be served.
    assert.equal((await fetch(`${base}/src/main.tsx`)).status, 200, '/src/main.tsx');
  } finally {
    await vite.close();
    server.close();
  }
});
