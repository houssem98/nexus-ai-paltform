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

db.mutate((s) => {
  for (const o of orgs) {
    s.organizations.push({ id: `org_${o}`, name: `Org ${o}`, slug: `org-${o}`, plan: 'enterprise', createdAt: '2026-10-26T00:00:00Z' });
    s.workspaces.push({ id: `ws_${o}`, orgId: `org_${o}`, name: `Org ${o} workspace`, description: '', department: 'Operations', createdAt: '2026-10-26T00:00:00Z' });
  }
  s.users.push(...Object.values(users));
});

// The one place that decides how a request says who it is; L1 T3 replaces the headers with a session.
const as = (user: User) => async (method: string, url: string, body?: unknown) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', 'x-user-id': user.id, 'x-org-id': user.orgId, 'x-workspace-id': user.workspaceId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

// Every route registered in server.ts: covered by a cross-tenant test, or pending on the L1 task that will cover it.
const coverage: Record<string, 'covered' | `pending:T${number}`> = {
  'GET /api/v1/me': 'pending:T3',
  'POST /api/v1/auth/switch-context': 'pending:T3',
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
  const registered = (app as any)._router.stack
    .filter((l: any) => l.route)
    .flatMap((l: any) => Object.keys(l.route.methods).map((m) => `${m.toUpperCase()} ${l.route.path}`));
  assert.ok(registered.length > 0, 'no routes found');
  assert.deepEqual(registered.filter((r: string) => !(r in coverage)), [], 'routes missing from the coverage table');
  assert.deepEqual(Object.keys(coverage).filter((r) => !registered.includes(r)), [], 'table rows for routes that do not exist');
});

test('a pending row names an L1 task that is not ticked yet', () => {
  const l1 = fs.readFileSync(new URL('../docs/loops/L1_TRUST.md', import.meta.url), 'utf-8').replace(/\r/g, '').split('\n');
  for (const [route, status] of Object.entries(coverage)) {
    if (status === 'covered') continue;
    const task = status.slice('pending:'.length);
    assert.ok(l1.some((l) => l.startsWith(`- [ ] ${task} `)), `${route}: ${task} is not an open L1 task`);
  }
});
