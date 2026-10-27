import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createServer } from 'vite';

// `npm start` runs Vite's dev middleware (server.ts, whenever NODE_ENV is not production),
// and Vite serves files from the project root unless its fs.deny list says otherwise.
test('the dev server does not serve the data store or the server source', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  // No dependency pre-bundling: closing the server mid-bundle left a 10 MB deps_temp folder behind on every run.
  const vite = await createServer({
    root, configFile: `${root}vite.config.ts`, server: { middlewareMode: true }, appType: 'spa', logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
  });
  const server = express().use(vite.middlewares).listen(0, '127.0.0.1');
  await once(server, 'listening');
  // Vite refuses only files that exist, and a fresh checkout has no store yet, so a probe file stands in for it.
  const probe = `data/dev-server-probe-${process.pid}.db`;
  fs.mkdirSync(`${root}data`, { recursive: true });
  fs.writeFileSync(root + probe, 'probe');
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const file of [`/${probe}`, '/server/storage.ts', '/server.ts']) {
      assert.equal((await fetch(base + file)).status, 403, file);
    }
    // The client itself must still be served.
    assert.equal((await fetch(`${base}/src/main.tsx`)).status, 200, '/src/main.tsx');
  } finally {
    fs.rmSync(root + probe, { force: true });
    await vite.close();
    server.close();
  }
});
