import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { User } from './storage';

// L1 T1: two orgs with one user per role, a helper that calls any route as one of them,
// and a table that says which routes have cross-tenant tests.
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-tenancy-')));
const { app } = await import('../server');
const { db } = await import('./storage');
const { hashPassword, verifyPassword, bootstrapAdmin } = await import('./auth');

const server = app.listen(0);
await once(server, 'listening');
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const roles: User['role'][] = ['org_admin', 'workspace_admin', 'builder', 'operator', 'evaluator', 'viewer'];
const orgs = ['a', 'b'] as const;
const users = Object.fromEntries(
  orgs.flatMap((o) => roles.map((role) => [`${o}_${role}`, {
    id: `usr_${o}_${role}`, name: `Org ${o} ${role}`, email: `${role}@org-${o}.test`, role, orgId: `org_${o}`, workspaceId: `ws_${o}`,
  } satisfies User])),
) as Record<`${(typeof orgs)[number]}_${User['role']}`, User>;
const password = (u: User) => `pw-${u.id}`;

db.mutate((s) => {
  for (const o of orgs) {
    s.organizations.push({ id: `org_${o}`, name: `Org ${o}`, slug: `org-${o}`, plan: 'enterprise', createdAt: '2026-10-26T00:00:00Z' });
    for (const ws of [`ws_${o}`, `ws_${o}_2`]) {
      s.workspaces.push({ id: ws, orgId: `org_${o}`, name: ws, description: '', department: 'Operations', createdAt: '2026-10-26T00:00:00Z' });
    }
  }
  s.users.push(...Object.values(users).map((u) => ({ ...u, passwordHash: hashPassword(password(u)) })));
});

const login = (email: string, pw: string) => fetch(base + '/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: pw }),
});
async function signIn(user: User) {
  const res = await login(user.email, password(user));
  assert.equal(res.status, 200, `sign-in as ${user.id}`);
  return res.headers.get('set-cookie')!.split(';')[0];
}

// The one place that decides how a request says who it is: a session cookie from a real sign-in.
const cookies = new Map<string, string>();
const as = (user: User) => async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
  if (!cookies.has(user.id)) cookies.set(user.id, await signIn(user));
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', cookie: cookies.get(user.id)!, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const registered = (): string[] => (app as any)._router.stack
  .filter((l: any) => l.route)
  .flatMap((l: any) => Object.keys(l.route.methods).map((m) => `${m.toUpperCase()} ${l.route.path}`));

// Every route registered in server.ts: covered by a cross-tenant test, or pending on the L1 task that will cover it.
const coverage: Record<string, 'covered' | `pending:T${number}`> = {
  'POST /api/v1/auth/login': 'covered',
  'POST /api/v1/auth/logout': 'covered',
  'GET /api/v1/me': 'covered',
  'POST /api/v1/auth/switch-context': 'covered',
  'GET /api/v1/agents': 'pending:T4',
  'GET /api/v1/agents/:id': 'pending:T4',
  'POST /api/v1/agents': 'pending:T4',
  'PUT /api/v1/agents/:id': 'pending:T4',
  'POST /api/v1/agents/:id/test': 'pending:T4',
  'GET /api/v1/workflows': 'pending:T4',
  'GET /api/v1/workflows/:id': 'pending:T4',
  'POST /api/v1/workflows': 'pending:T4',
  'PUT /api/v1/workflows/:id': 'pending:T4',
  'POST /api/v1/workflows/:id/validate': 'pending:T4',
  'POST /api/v1/workflows/:id/execute': 'pending:T4',
  'GET /api/v1/analytics/trends': 'pending:T4',
  'GET /api/v1/executions': 'pending:T4',
  'GET /api/v1/executions/:id': 'pending:T4',
  'POST /api/v1/executions/:id/approve': 'pending:T4',
  'POST /api/v1/executions/:id/cancel': 'pending:T4',
  'GET /api/v1/knowledge': 'pending:T4',
  'POST /api/v1/knowledge': 'pending:T4',
  'POST /api/v1/knowledge/search': 'pending:T4',
  'DELETE /api/v1/knowledge/:id': 'pending:T4',
  'POST /api/v1/knowledge/:id/reindex': 'pending:T4',
  'GET /api/v1/integrations': 'pending:T4',
  'POST /api/v1/integrations/:id/test': 'pending:T4',
  'POST /api/v1/integrations': 'pending:T4',
  'DELETE /api/v1/integrations/:id': 'pending:T4',
  'GET /api/v1/evaluations': 'pending:T4',
  'POST /api/v1/evaluations/datasets': 'pending:T4',
  'POST /api/v1/evaluations/runs': 'pending:T4',
  'GET /api/v1/deployments': 'pending:T4',
  'POST /api/v1/deployments/:id/execute': 'pending:T4',
  'POST /api/v1/deployments': 'pending:T4',
  'PATCH /api/v1/deployments/:id/status': 'pending:T4',
  'DELETE /api/v1/deployments/:id': 'pending:T4',
  'GET /api/v1/audit-events': 'pending:T4',
  'POST /api/v1/audit-events/simulate': 'pending:T4',
  'GET /api/v1/approvals': 'pending:T4',
  'GET /api/v1/audit-events/export': 'pending:T4',
  'GET /api/v1/settings': 'pending:T4',
  'PATCH /api/v1/settings': 'pending:T4',
  'GET /api/v1/fine-tuning': 'pending:T4',
  'POST /api/v1/fine-tuning': 'pending:T4',
  'POST /api/v1/fine-tuning/:id/deploy': 'pending:T4',
  'DELETE /api/v1/fine-tuning/:id': 'pending:T4',
  'GET /api/v1/data-foundry': 'pending:T4',
  'POST /api/v1/data-foundry/generate': 'pending:T4',
  'POST /api/v1/data-foundry/annotate': 'pending:T4',
  'DELETE /api/v1/data-foundry/:id': 'pending:T4',
  'GET /api/v1/red-teaming': 'pending:T4',
  'POST /api/v1/red-teaming/execute': 'pending:T4',
  'POST /api/v1/red-teaming/test-probe': 'pending:T4',
  'PATCH /api/v1/red-teaming/guardrails': 'pending:T4',
  'GET /api/v1/roadmap': 'pending:T4',
  'POST /api/v1/ai/think-and-generate': 'pending:T4',
  'GET /api/v1/system/self-test': 'pending:T4',
  'POST /api/v1/deployments/:id/test-invoke': 'pending:T4',
  'POST /api/v1/knowledge/reindex-all': 'pending:T4',
  'POST /api/v1/governance/compliance-scan': 'pending:T4',
  'POST /api/v1/agents/:id/duplicate': 'pending:T4',
  'POST /api/v1/workflows/:id/duplicate': 'pending:T4',
  'POST /api/v1/integrations/:id/sync': 'pending:T4',
};

test('every org has one user per role, and the helper calls a route as that user', async () => {
  for (const o of orgs) assert.deepEqual(Object.values(users).filter((u) => u.orgId === `org_${o}`).map((u) => u.role), roles);
  const me = await as(users.b_viewer)('GET', '/api/v1/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, 'usr_b_viewer');
  assert.equal(me.body.organization.id, 'org_b');
});

test('the coverage table lists every registered route, and nothing else', () => {
  const routes = registered();
  assert.ok(routes.length > 0, 'no routes found');
  assert.deepEqual(routes.filter((r: string) => !(r in coverage)), [], 'routes missing from the coverage table');
  assert.deepEqual(Object.keys(coverage).filter((r) => !routes.includes(r)), [], 'table rows for routes that do not exist');
});

test('a pending row names an L1 task that is not ticked yet', () => {
  const l1 = fs.readFileSync(new URL('../docs/loops/L1_TRUST.md', import.meta.url), 'utf-8').replace(/\r/g, '').split('\n');
  for (const [route, status] of Object.entries(coverage)) {
    if (status === 'covered') continue;
    const task = status.slice('pending:'.length);
    assert.ok(l1.some((l) => l.startsWith(`- [ ] ${task} `)), `${route}: ${task} is not an open L1 task`);
  }
});

// L1 T3: identity comes from a signed-in session on every request, never from headers or shared variables.
test('an unauthenticated request gets 401', async () => {
  // Signing in, and deployment calls, which carry their own API key (L1 T7), are the only routes open without a session.
  const open = ['POST /api/v1/auth/login', 'POST /api/v1/deployments/:id/execute'];
  for (const route of registered().filter((r) => !open.includes(r))) {
    const [method, url] = route.split(' ');
    const res = await fetch(base + url.replace(/:\w+/g, 'x'), {
      method,
      headers: { 'content-type': 'application/json', 'x-user-id': 'usr_admin', 'x-org-id': 'org_nexus_enterprises' },
    });
    assert.equal(res.status, 401, `${route} without a session, claiming usr_admin by header`);
  }
});

test('two interleaved requests as different users each see their own context', async () => {
  const a = as(users.a_org_admin);
  assert.equal((await a('POST', '/api/v1/auth/switch-context', { workspaceId: 'ws_a_2' })).status, 200);
  const pairs = await Promise.all(Array.from({ length: 20 }, (_, i) => {
    const u = i % 2 ? users.a_org_admin : users.b_builder;
    // A header naming the other user changes nothing.
    return as(u)('GET', '/api/v1/me', undefined, { 'x-user-id': i % 2 ? 'usr_b_builder' : 'usr_a_org_admin' }).then((r) => [u, r] as const);
  }));
  for (const [u, r] of pairs) {
    assert.equal(r.body.user.id, u.id);
    assert.equal(r.body.organization.id, u.orgId);
    assert.equal(r.body.workspace.id, u === users.a_org_admin ? 'ws_a_2' : 'ws_b', `${u.id} sees its own workspace`);
  }
  assert.equal((await a('POST', '/api/v1/auth/switch-context', { workspaceId: 'ws_a' })).status, 200);
});

test('switching into a foreign org gets 403', async () => {
  const b = as(users.b_org_admin);
  for (const body of [{ orgId: 'org_a' }, { workspaceId: 'ws_a' }, { userId: 'usr_a_org_admin' }, { userId: 'usr_b_viewer' }, { workspaceId: 'ws_missing' }]) {
    assert.equal((await b('POST', '/api/v1/auth/switch-context', body)).status, 403, JSON.stringify(body));
  }
  const me = await b('GET', '/api/v1/me');
  assert.deepEqual([me.body.user.id, me.body.organization.id, me.body.workspace.id], ['usr_b_org_admin', 'org_b', 'ws_b']);
  assert.equal((await b('POST', '/api/v1/auth/switch-context', { workspaceId: 'ws_b_2' })).status, 200);
  assert.equal((await b('GET', '/api/v1/me')).body.workspace.id, 'ws_b_2');
  assert.equal((await b('POST', '/api/v1/auth/switch-context', { workspaceId: 'ws_b' })).status, 200);
});

test("an unknown user gets 401, and the me route lists only the caller's org", async () => {
  const me = await as(users.a_viewer)('GET', '/api/v1/me');
  assert.ok(me.body.availableUsers.length === roles.length, 'the six users of org a');
  assert.ok(me.body.availableUsers.every((u: User) => u.orgId === 'org_a'));
  assert.ok(me.body.availableWorkspaces.every((w: { orgId: string }) => w.orgId === 'org_a'));
  assert.ok(!JSON.stringify(me.body).includes('scrypt'), 'no password hash leaves the server');

  const ghost = { ...users.a_viewer, id: 'usr_ghost', email: 'ghost@org-a.test' };
  db.mutate((s) => { s.users.push({ ...ghost, passwordHash: hashPassword(password(ghost)) }); });
  const asGhost = as(ghost);
  assert.equal((await asGhost('GET', '/api/v1/me')).status, 200);
  db.mutate((s) => { s.users = s.users.filter((u) => u.id !== 'usr_ghost'); });
  assert.equal((await asGhost('GET', '/api/v1/me')).status, 401, 'a session whose user no longer exists');
});

test('signing in needs the right password, and signing out ends the session', async () => {
  assert.equal((await login(users.a_viewer.email, 'wrong')).status, 401);
  assert.equal((await login('nobody@org-a.test', password(users.a_viewer))).status, 401);
  assert.equal((await login(users.a_viewer.email, '')).status, 401);
  const ok = await login(users.a_viewer.email.toUpperCase(), password(users.a_viewer));
  assert.equal(ok.status, 200);
  assert.ok(!JSON.stringify(await ok.json()).includes('scrypt'));
  assert.match(ok.headers.get('set-cookie')!, /^nexus_session=[0-9a-f]{64}; HttpOnly; SameSite=Strict; Path=\//);

  const cookie = await signIn(users.b_viewer);
  const out = await fetch(base + '/api/v1/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(out.status, 200);
  assert.equal((await fetch(base + '/api/v1/me', { headers: { cookie } })).status, 401, 'the old cookie no longer works');
});

test('NEXUS_ADMIN_PASSWORD gives the first org admin a password once, stored only as a hash', () => {
  const list: User[] = [{ ...users.a_viewer }, { ...users.a_org_admin }, { ...users.b_org_admin }];
  assert.equal(bootstrapAdmin(list, undefined), undefined);
  const admin = bootstrapAdmin(list, 'first-boot-secret');
  assert.equal(admin?.id, 'usr_a_org_admin');
  assert.ok(verifyPassword('first-boot-secret', admin!.passwordHash));
  assert.ok(!admin!.passwordHash!.includes('first-boot-secret'));
  assert.equal(list[0].passwordHash, undefined);
  assert.equal(bootstrapAdmin(list, 'another'), undefined, 'once an admin has a password, the variable changes nothing');
  assert.ok(verifyPassword('first-boot-secret', admin!.passwordHash));
});
