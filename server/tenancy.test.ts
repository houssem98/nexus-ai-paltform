import test, { after, mock } from 'node:test';
import crypto from 'node:crypto';
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
const { db, settingsOf } = await import('./storage');
const { hashPassword, verifyPassword, bootstrapAdmin, hashApiKey } = await import('./auth');

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
  'GET /api/v1/agents': 'covered',
  'GET /api/v1/agents/:id': 'covered',
  'POST /api/v1/agents': 'covered',
  'PUT /api/v1/agents/:id': 'covered',
  'POST /api/v1/agents/:id/test': 'covered',
  'GET /api/v1/workflows': 'covered',
  'GET /api/v1/workflows/:id': 'covered',
  'POST /api/v1/workflows': 'covered',
  'PUT /api/v1/workflows/:id': 'covered',
  'POST /api/v1/workflows/:id/validate': 'covered',
  'POST /api/v1/workflows/:id/execute': 'covered',
  'GET /api/v1/analytics/trends': 'covered',
  'GET /api/v1/executions': 'covered',
  'GET /api/v1/executions/:id': 'covered',
  'POST /api/v1/executions/:id/approve': 'covered',
  'POST /api/v1/executions/:id/cancel': 'covered',
  'GET /api/v1/knowledge': 'covered',
  'POST /api/v1/knowledge': 'covered',
  'POST /api/v1/knowledge/search': 'covered',
  'DELETE /api/v1/knowledge/:id': 'covered',
  'POST /api/v1/knowledge/:id/reindex': 'covered',
  'GET /api/v1/integrations': 'covered',
  'POST /api/v1/integrations/:id/test': 'covered',
  'POST /api/v1/integrations': 'covered',
  'DELETE /api/v1/integrations/:id': 'covered',
  'GET /api/v1/evaluations': 'covered',
  'POST /api/v1/evaluations/datasets': 'covered',
  'POST /api/v1/evaluations/runs': 'covered',
  'GET /api/v1/deployments': 'covered',
  'POST /api/v1/deployments/:id/execute': 'covered',
  'POST /api/v1/deployments': 'covered',
  'PATCH /api/v1/deployments/:id/status': 'covered',
  'DELETE /api/v1/deployments/:id': 'covered',
  'GET /api/v1/audit-events': 'covered',
  'POST /api/v1/audit-events/simulate': 'covered',
  'GET /api/v1/approvals': 'covered',
  'GET /api/v1/audit-events/export': 'covered',
  'GET /api/v1/settings': 'covered',
  'PATCH /api/v1/settings': 'covered',
  'GET /api/v1/fine-tuning': 'covered',
  'POST /api/v1/fine-tuning': 'covered',
  'POST /api/v1/fine-tuning/:id/deploy': 'covered',
  'DELETE /api/v1/fine-tuning/:id': 'covered',
  'GET /api/v1/data-foundry': 'covered',
  'POST /api/v1/data-foundry/generate': 'covered',
  'POST /api/v1/data-foundry/annotate': 'covered',
  'DELETE /api/v1/data-foundry/:id': 'covered',
  'GET /api/v1/red-teaming': 'covered',
  'POST /api/v1/red-teaming/execute': 'covered',
  'POST /api/v1/red-teaming/test-probe': 'covered',
  'PATCH /api/v1/red-teaming/guardrails': 'covered',
  'GET /api/v1/roadmap': 'covered',
  'POST /api/v1/ai/think-and-generate': 'covered',
  'GET /api/v1/system/self-test': 'covered',
  'POST /api/v1/deployments/:id/test-invoke': 'covered',
  'POST /api/v1/knowledge/reindex-all': 'covered',
  'POST /api/v1/governance/compliance-scan': 'covered',
  'POST /api/v1/agents/:id/duplicate': 'covered',
  'POST /api/v1/workflows/:id/duplicate': 'covered',
  'POST /api/v1/integrations/:id/sync': 'covered',
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

// L1 T4: org B reaches none of org A's records, through any route. Org A's records are made through the API,
// so the server stamps their org; demo mode is on for both orgs so the demo-only routes answer too.
const A = as(users.a_org_admin);
const B = as(users.b_org_admin);
const SECRET = 'Org A private ledger: wire 4417 to Banco Azul';
db.mutate((s) => { settingsOf(s, 'org_a').demoMode = true; settingsOf(s, 'org_b').demoMode = true; });
const made = async (res: Promise<{ status: number; body: any }>, key: string) => {
  const r = await res;
  assert.ok(r.status < 300, `could not create ${key}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body[key];
};
const aWorkflow = await made(A('POST', '/api/v1/workflows', { name: 'A flow' }), 'workflow');
const aDeployment = await made(A('POST', '/api/v1/deployments', { workflowId: aWorkflow.id, name: 'A dep' }), 'deployment');
const a = {
  agent: (await made(A('POST', '/api/v1/agents', { name: 'A agent' }), 'agent')).id,
  workflow: aWorkflow.id,
  document: (await made(A('POST', '/api/v1/knowledge', { title: 'A ledger', content: SECRET }), 'document')).id,
  integration: (await made(A('POST', '/api/v1/integrations', { name: 'A connector' }), 'integration')).id,
  dataset: (await made(A('POST', '/api/v1/evaluations/datasets', { name: 'A cases' }), 'dataset')).id,
  deployment: aDeployment.id,
  execution: (await made(A('POST', `/api/v1/workflows/${aWorkflow.id}/execute`, { amount: 10 }), 'execution')).id,
  job: (await made(A('POST', '/api/v1/fine-tuning', { name: 'A tune' }), 'job')).id,
  synthetic: (await made(A('POST', '/api/v1/data-foundry/generate', { name: 'A synth' }), 'dataset')).id,
  redTeam: (await made(A('POST', '/api/v1/red-teaming/execute', { name: 'A probe' }), 'run')).id,
  approval: 'apr_org_a',
};
db.mutate((s) => {
  s.approvals.push({ id: a.approval, orgId: 'org_a', workspaceId: 'ws_a', executionId: a.execution, workflowId: a.workflow, workflowName: 'A flow', nodeId: 'n', nodeLabel: 'Approve', payload: {}, status: 'pending', createdAt: new Date().toISOString() });
});
const leaked = (body: unknown) => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  // Quoted, so the id org_a does not match inside a name such as usr_b_org_admin.
  return [...Object.values(a), '"org_a"', SECRET].filter((x) => text.includes(x));
};

test("no list route returns another org's records", async () => {
  for (const url of ['/api/v1/agents', '/api/v1/workflows', '/api/v1/executions', '/api/v1/knowledge', '/api/v1/integrations',
    '/api/v1/evaluations', '/api/v1/deployments', '/api/v1/audit-events', '/api/v1/approvals', '/api/v1/audit-events/export?format=json',
    '/api/v1/fine-tuning', '/api/v1/data-foundry', '/api/v1/red-teaming', '/api/v1/settings', '/api/v1/analytics/trends?days=7',
    '/api/v1/roadmap', '/api/v1/system/self-test']) {
    const r = await B('GET', url);
    assert.equal(r.status, 200, url);
    assert.deepEqual(leaked(r.body), [], `${url} as org B`);
  }
  const csv = await fetch(`${base}/api/v1/audit-events/export?format=csv`, { headers: { cookie: cookies.get(users.b_org_admin.id)! } });
  assert.deepEqual(leaked(await csv.text()), [], 'CSV export as org B');
  // Org A's own list shows the record, so the check above is not vacuous.
  assert.ok((await A('GET', '/api/v1/agents')).body.agents.some((x: { id: string }) => x.id === a.agent));
});

test("org B reading, changing, deleting, executing or duplicating org A's resources by id gets 404", async () => {
  const attempts: [string, string, unknown?][] = [
    ['GET', `/api/v1/agents/${a.agent}`], ['PUT', `/api/v1/agents/${a.agent}`, { name: 'taken' }],
    ['POST', `/api/v1/agents/${a.agent}/test`, {}], ['POST', `/api/v1/agents/${a.agent}/duplicate`],
    ['GET', `/api/v1/workflows/${a.workflow}`], ['PUT', `/api/v1/workflows/${a.workflow}`, { name: 'taken' }],
    ['POST', `/api/v1/workflows/${a.workflow}/execute`, {}], ['POST', `/api/v1/workflows/${a.workflow}/duplicate`],
    ['GET', `/api/v1/executions/${a.execution}`], ['POST', `/api/v1/executions/${a.execution}/approve`, { decision: 'approve' }],
    ['POST', `/api/v1/executions/${a.execution}/cancel`],
    ['POST', `/api/v1/knowledge/${a.document}/reindex`], ['DELETE', `/api/v1/knowledge/${a.document}`],
    ['POST', `/api/v1/integrations/${a.integration}/test`], ['POST', `/api/v1/integrations/${a.integration}/sync`],
    ['DELETE', `/api/v1/integrations/${a.integration}`],
    ['POST', '/api/v1/evaluations/runs', { datasetId: a.dataset }],
    ['POST', '/api/v1/deployments', { workflowId: a.workflow }],
    ['PATCH', `/api/v1/deployments/${a.deployment}/status`, { status: 'suspended' }], ['DELETE', `/api/v1/deployments/${a.deployment}`],
    ['POST', `/api/v1/deployments/${a.deployment}/test-invoke`, {}],
    ['POST', `/api/v1/fine-tuning/${a.job}/deploy`], ['DELETE', `/api/v1/fine-tuning/${a.job}`],
    ['POST', '/api/v1/data-foundry/annotate', { datasetId: a.synthetic, sampleId: 'x', preference: 'A' }],
    ['DELETE', `/api/v1/data-foundry/${a.synthetic}`],
    ['POST', '/api/v1/ai/think-and-generate', { prompt: 'hi' }],
  ];
  for (const [method, url, body] of attempts) {
    const r = await B(method, url, body);
    assert.equal(r.status, 404, `${method} ${url} as org B`);
    assert.deepEqual(leaked(r.body), [], `${method} ${url} answer`);
  }
  const after = JSON.stringify([
    (await A('GET', `/api/v1/agents/${a.agent}`)).body, (await A('GET', `/api/v1/workflows/${a.workflow}`)).body,
    (await A('GET', '/api/v1/knowledge')).body, (await A('GET', '/api/v1/integrations')).body, (await A('GET', '/api/v1/deployments')).body,
    (await A('GET', '/api/v1/fine-tuning')).body, (await A('GET', '/api/v1/data-foundry')).body,
  ]);
  for (const id of [a.document, a.integration, a.deployment, a.job, a.synthetic]) assert.ok(after.includes(id), `${id} still exists`);
  assert.ok(!after.includes('taken'), 'nothing of org A was renamed');
  assert.ok(after.includes(`"status":"${aDeployment.status}"`), 'the deployment status is unchanged');
});

test("a knowledge search as org B returns none of org A's chunks", async () => {
  const query = { query: 'Banco Azul' };
  const r = await B('POST', '/api/v1/knowledge/search', query);
  assert.equal(r.status, 200);
  assert.deepEqual(leaked(r.body), []);
  // Org A's own search finds the chunk, so the check above is not vacuous.
  assert.ok(leaked((await A('POST', '/api/v1/knowledge/search', query)).body).includes(SECRET));
});

test("running org A's agent or knowledge collection as org B gets 404", async () => {
  assert.equal((await B('POST', `/api/v1/agents/${a.agent}/test`, {})).status, 404);
  // A workflow of org B that names org A's agent and document by id runs without either.
  const wf = await made(B('POST', '/api/v1/workflows', {
    name: 'B probe',
    nodes: [
      { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
      { id: 'k', type: 'knowledge', label: 'Read', position: { x: 0, y: 0 }, config: { collectionId: a.document } },
      { id: 'g', type: 'agent', label: 'Agent', position: { x: 0, y: 0 }, config: { agentId: a.agent } },
      { id: 'e', type: 'end', label: 'End', position: { x: 0, y: 0 }, config: {} },
    ],
    edges: [{ id: 'e1', source: 's', target: 'k' }, { id: 'e2', source: 'k', target: 'g' }, { id: 'e3', source: 'g', target: 'e' }],
  }), 'workflow');
  const run = await B('POST', `/api/v1/workflows/${wf.id}/execute`, {});
  // The run echoes the two ids org B itself wrote into its graph; it must read nothing behind them.
  assert.deepEqual(leaked(run.body).filter((x) => x !== a.agent && x !== a.document), [], 'the run read nothing of org A');
  const agentNode = run.body.execution.nodeExecutions.find((n: { nodeId: string }) => n.nodeId === 'g');
  assert.equal(agentNode?.status, 'failed', "org A's agent did not run");
});

test("org B cannot list or delete org A's integration", async () => {
  assert.ok(!(await B('GET', '/api/v1/integrations')).body.integrations.some((i: { id: string }) => i.id === a.integration));
  assert.equal((await B('DELETE', `/api/v1/integrations/${a.integration}`)).status, 404);
  assert.ok((await A('GET', '/api/v1/integrations')).body.integrations.some((i: { id: string }) => i.id === a.integration));
});

test('records org B creates belong to org B, whatever org the body names', async () => {
  const forged = { orgId: 'org_a', workspaceId: 'ws_a', name: 'forged' };
  const records = [
    await made(B('POST', '/api/v1/agents', forged), 'agent'),
    await made(B('POST', '/api/v1/workflows', forged), 'workflow'),
    await made(B('POST', '/api/v1/knowledge', { ...forged, title: 'forged', content: 'x' }), 'document'),
    await made(B('POST', '/api/v1/integrations', forged), 'integration'),
    await made(B('POST', '/api/v1/evaluations/datasets', forged), 'dataset'),
  ];
  for (const r of records) assert.deepEqual([r.orgId, r.workspaceId], ['org_b', 'ws_b'], JSON.stringify(r).slice(0, 80));
});

test("org B's settings and guardrails changes leave org A's alone", async () => {
  const snapshot = async () => JSON.stringify([(await A('GET', '/api/v1/settings')).body, (await A('GET', '/api/v1/red-teaming')).body.guardrails]);
  const before = await snapshot();
  assert.equal((await B('PATCH', '/api/v1/settings', { dataRetentionDays: 1 })).status, 200);
  assert.equal((await B('PATCH', '/api/v1/red-teaming/guardrails', { piiMasking: false, toxicContentThreshold: 0.1 })).status, 200);
  assert.equal((await B('GET', '/api/v1/settings')).body.settings.dataRetentionDays, 1);
  assert.equal(await snapshot(), before);
});

test("org-wide actions of org B touch and report only org B's records", async () => {
  const touched = () => db.getState().knowledge.find((k) => k.id === a.document)!.updatedAt;
  const before = touched();
  const reindex = await B('POST', '/api/v1/knowledge/reindex-all');
  assert.equal(reindex.body.reindexedCount, db.getState().knowledge.filter((k) => k.orgId === 'org_b').length);
  assert.equal(touched(), before, "org A's document was not touched");
  const calls: [string, string, unknown?][] = [
    ['POST', '/api/v1/governance/compliance-scan'], ['POST', '/api/v1/audit-events/simulate', { eventType: 'user' }],
    ['POST', `/api/v1/workflows/${a.workflow}/validate`, { nodes: [], edges: [] }], ['POST', '/api/v1/red-teaming/test-probe', { prompt: 'hello' }],
  ];
  for (const [method, url, body] of calls) {
    const r = await B(method, url, body);
    assert.ok(r.status < 500, `${url}: ${r.status}`);
    assert.deepEqual(leaked(r.body), [], url);
  }
  const roadmap = (await B('GET', '/api/v1/roadmap')).body;
  assert.equal(roadmap.summary.activeCounts.agents, (await B('GET', '/api/v1/agents')).body.agents.length);
});

test('a deployment key works only for its own deployment, and a deployment response carries no knowledge document text', async () => {
  const bWorkflow = await made(B('POST', '/api/v1/workflows', { name: 'B flow' }), 'workflow');
  const bDeployment = await made(B('POST', '/api/v1/deployments', { workflowId: bWorkflow.id }), 'deployment');
  const run = (id: string, key: string, body = '{}') => fetch(`${base}/api/v1/deployments/${id}/execute`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body,
  });
  assert.equal((await run(a.deployment, bDeployment.apiKey)).status, 401, "org B's key on org A's deployment");

  // The seed deployment's workflow reads a knowledge document; its answer must not carry that document's text.
  // The seed key is unknown since L1 T7, so the test gives the seed deployment a key of its own.
  const dep = db.getState().deployments.find((d) => d.id === 'dep_prod_fin_reconciliation')!;
  const seedKey = `nx_live_${'ab'.repeat(32)}`;
  db.mutate(() => { dep.apiKeyHash = hashApiKey(seedKey); });
  // Since L1 T11 the invoice workflow refuses input without a non-negative amount.
  const res = await run(dep.id, seedKey, '{"amount": 100}');
  assert.equal(res.status, 200);
  const text = await res.text();
  const exec = db.getState().executions.find((e) => e.id === JSON.parse(text).executionId)!;
  assert.ok(exec.nodeExecutions.some((n) => n.nodeType === 'knowledge' && n.status === 'success'), 'the run read a document');
  const docs = db.getState().knowledge.filter((k) => k.orgId === dep.orgId).map((k) => k.content.slice(0, 60));
  assert.deepEqual(docs.filter((d) => text.includes(d)), []);
  assert.ok(!text.includes('knowledgeContext'));
});

// L1 T5: every changing route, for each of the six roles of org B, answers 2xx where the permission table allows
// that role and 403 where it does not. An allowed call gets a real target, made just before by org B's admin.
const { PERMISSIONS } = await import('./permissions');
const created = async (url: string, body: unknown, key: string) => (await made(B('POST', url, body), key)).id as string;
const runningExecution = (requiredRole?: User['role']) => {
  const id = `exec_rbac_${Math.random().toString(36).slice(2)}`;
  db.mutate((s) => {
    s.executions.unshift({ id, orgId: 'org_b', workspaceId: 'ws_b', workflowId: 'wf', workflowName: 'wf', workflowVersion: 1, trigger: 'manual', status: 'running', input: {}, nodeExecutions: [], startedAt: new Date().toISOString() } as any);
    s.approvals.push({ id: `apr_${id}`, orgId: 'org_b', workspaceId: 'ws_b', executionId: id, workflowId: 'wf', workflowName: 'wf', nodeId: 'n', nodeLabel: 'Approve', payload: {}, ...(requiredRole ? { requiredRole } : {}), status: 'pending', createdAt: new Date().toISOString() });
  });
  return id;
};
// [url, body] for one allowed call on a fresh target of org B.
const target: Record<string, (role: User['role']) => Promise<[string, unknown?]>> = {
  'POST /api/v1/auth/logout': async () => ['/api/v1/auth/logout'],
  'POST /api/v1/auth/switch-context': async () => ['/api/v1/auth/switch-context', { workspaceId: 'ws_b' }],
  'POST /api/v1/knowledge/search': async () => ['/api/v1/knowledge/search', { query: 'x' }],
  'POST /api/v1/agents': async () => ['/api/v1/agents', { name: 'rbac' }],
  'PUT /api/v1/agents/:id': async () => [`/api/v1/agents/${await created('/api/v1/agents', { name: 'r' }, 'agent')}`, { name: 'r2' }],
  'POST /api/v1/agents/:id/test': async () => [`/api/v1/agents/${await created('/api/v1/agents', { name: 'r' }, 'agent')}/test`, {}],
  'POST /api/v1/agents/:id/duplicate': async () => [`/api/v1/agents/${await created('/api/v1/agents', { name: 'r' }, 'agent')}/duplicate`],
  'POST /api/v1/workflows': async () => ['/api/v1/workflows', { name: 'rbac' }],
  'PUT /api/v1/workflows/:id': async () => [`/api/v1/workflows/${await created('/api/v1/workflows', { name: 'r' }, 'workflow')}`, { name: 'r2' }],
  'POST /api/v1/workflows/:id/validate': async () => [`/api/v1/workflows/${await created('/api/v1/workflows', { name: 'r' }, 'workflow')}/validate`, { nodes: [], edges: [] }],
  'POST /api/v1/workflows/:id/duplicate': async () => [`/api/v1/workflows/${await created('/api/v1/workflows', { name: 'r' }, 'workflow')}/duplicate`],
  'POST /api/v1/workflows/:id/execute': async () => [`/api/v1/workflows/${await created('/api/v1/workflows', { name: 'r' }, 'workflow')}/execute`, {}],
  'POST /api/v1/knowledge': async () => ['/api/v1/knowledge', { title: 'r', content: 'r' }],
  'DELETE /api/v1/knowledge/:id': async () => [`/api/v1/knowledge/${await created('/api/v1/knowledge', { title: 'r', content: 'r' }, 'document')}`],
  'POST /api/v1/knowledge/:id/reindex': async () => [`/api/v1/knowledge/${await created('/api/v1/knowledge', { title: 'r', content: 'r' }, 'document')}/reindex`],
  'POST /api/v1/knowledge/reindex-all': async () => ['/api/v1/knowledge/reindex-all'],
  'POST /api/v1/integrations': async () => ['/api/v1/integrations', { name: 'r' }],
  'POST /api/v1/integrations/:id/test': async () => [`/api/v1/integrations/${await created('/api/v1/integrations', { name: 'r' }, 'integration')}/test`],
  'POST /api/v1/integrations/:id/sync': async () => [`/api/v1/integrations/${await created('/api/v1/integrations', { name: 'r' }, 'integration')}/sync`],
  'DELETE /api/v1/integrations/:id': async () => [`/api/v1/integrations/${await created('/api/v1/integrations', { name: 'r' }, 'integration')}`],
  'POST /api/v1/evaluations/datasets': async () => ['/api/v1/evaluations/datasets', { name: 'r' }],
  'POST /api/v1/evaluations/runs': async () => ['/api/v1/evaluations/runs', { datasetId: await created('/api/v1/evaluations/datasets', { name: 'r' }, 'dataset') }],
  'POST /api/v1/deployments': async () => ['/api/v1/deployments', { workflowId: await created('/api/v1/workflows', { name: 'r' }, 'workflow') }],
  'PATCH /api/v1/deployments/:id/status': async () => [`/api/v1/deployments/${await created('/api/v1/deployments', {}, 'deployment')}/status`, { status: 'active' }],
  'DELETE /api/v1/deployments/:id': async () => [`/api/v1/deployments/${await created('/api/v1/deployments', {}, 'deployment')}`],
  'POST /api/v1/deployments/:id/test-invoke': async () => [`/api/v1/deployments/${await created('/api/v1/deployments', {}, 'deployment')}/test-invoke`, {}],
  // An approval that names the role under test, which is the node's rule since L1 T16.
  'POST /api/v1/executions/:id/approve': async (role) => [`/api/v1/executions/${runningExecution(role)}/approve`, { decision: 'approve' }],
  'POST /api/v1/executions/:id/cancel': async () => [`/api/v1/executions/${runningExecution()}/cancel`],
  'POST /api/v1/audit-events/simulate': async () => ['/api/v1/audit-events/simulate', { eventType: 'user' }],
  'PATCH /api/v1/settings': async () => ['/api/v1/settings', {}],
  'POST /api/v1/fine-tuning': async () => ['/api/v1/fine-tuning', { name: 'r' }],
  'POST /api/v1/fine-tuning/:id/deploy': async () => [`/api/v1/fine-tuning/${await created('/api/v1/fine-tuning', { name: 'r' }, 'job')}/deploy`],
  'DELETE /api/v1/fine-tuning/:id': async () => [`/api/v1/fine-tuning/${await created('/api/v1/fine-tuning', { name: 'r' }, 'job')}`],
  'POST /api/v1/data-foundry/generate': async () => ['/api/v1/data-foundry/generate', { name: 'r' }],
  'POST /api/v1/data-foundry/annotate': async () => {
    const ds = await made(B('POST', '/api/v1/data-foundry/generate', { name: 'r' }), 'dataset');
    return ['/api/v1/data-foundry/annotate', { datasetId: ds.id, sampleId: ds.samples[0].id, preference: 'A' }];
  },
  'DELETE /api/v1/data-foundry/:id': async () => [`/api/v1/data-foundry/${await created('/api/v1/data-foundry/generate', { name: 'r' }, 'dataset')}`],
  'POST /api/v1/red-teaming/execute': async () => ['/api/v1/red-teaming/execute', { name: 'r' }],
  'POST /api/v1/red-teaming/test-probe': async () => ['/api/v1/red-teaming/test-probe', { prompt: 'hello' }],
  'PATCH /api/v1/red-teaming/guardrails': async () => ['/api/v1/red-teaming/guardrails', {}],
  'POST /api/v1/governance/compliance-scan': async () => ['/api/v1/governance/compliance-scan'],
  // Runs a seed-org agent by a fixed id, so outside the seed org it answers 404 even when allowed.
  'POST /api/v1/ai/think-and-generate': async () => ['/api/v1/ai/think-and-generate', { prompt: 'hi' }],
};
const allowedButNot2xx: Record<string, number> = { 'POST /api/v1/ai/think-and-generate': 404 };

test('a table of role by route returns 2xx or 403 as the permission table says', async () => {
  const open = ['POST /api/v1/auth/login', 'POST /api/v1/deployments/:id/execute'];
  const changing = registered().filter((r) => !r.startsWith('GET ') && !open.includes(r));
  assert.deepEqual(changing.filter((r) => !(r in PERMISSIONS)), [], 'changing routes missing from the permission table');
  assert.deepEqual(changing.filter((r) => !(r in target)), [], 'changing routes this test cannot exercise');
  for (const route of changing) {
    const [method] = route.split(' ');
    for (const role of roles) {
      const user = users[`b_${role}`];
      const may = PERMISSIONS[route].includes(role);
      // Signing out ends the session, so that call gets a session of its own.
      if (route === 'POST /api/v1/auth/logout') cookies.delete(user.id);
      const before = JSON.stringify(db.getState());
      const [url, body] = may ? await target[route](role) : [route.split(' ')[1].replace(/:\w+/g, 'x'), {}];
      const r = await as(user)(method, url, body);
      if (route === 'POST /api/v1/auth/logout') cookies.delete(user.id);
      if (!may) {
        assert.equal(r.status, 403, `${role} on ${route}`);
        assert.equal(JSON.stringify(db.getState()), before, `${role} on ${route} changed the store`);
      } else if (route in allowedButNot2xx) {
        assert.equal(r.status, allowedButNot2xx[route], `${role} on ${route}`);
      } else {
        assert.ok(r.status >= 200 && r.status < 300, `${role} on ${route} got ${r.status}: ${JSON.stringify(r.body).slice(0, 120)}`);
      }
    }
  }
});

test('reading stays open to every role of the org, viewer included', async () => {
  for (const url of ['/api/v1/agents', '/api/v1/workflows', '/api/v1/executions', '/api/v1/settings', '/api/v1/audit-events']) {
    assert.equal((await as(users.b_viewer)('GET', url)).status, 200, url);
  }
});

// L1 T6: an approval is decided only by the role its node names (or the org admin), once, and records who decided.
async function waitingForApproval(requiredRole: string) {
  const wf = await made(B('POST', '/api/v1/workflows', {
    name: `approval ${requiredRole}`,
    nodes: [
      { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
      { id: 'a', type: 'approval', label: 'Sign-off', position: { x: 0, y: 0 }, config: { requiredRole } },
      { id: 'e', type: 'end', label: 'End', position: { x: 0, y: 0 }, config: {} },
    ],
    edges: [{ id: 'e1', source: 's', target: 'a' }, { id: 'e2', source: 'a', target: 'e' }],
  }), 'workflow');
  const exec = await made(as(users.b_operator)('POST', `/api/v1/workflows/${wf.id}/execute`, {}), 'execution');
  assert.equal(exec.status, 'waiting_approval');
  return exec.id as string;
}
const approvalOf = (executionId: string) => db.getState().approvals.find((a) => a.executionId === executionId)!;

test('a decision by a role the approval node does not name gets 403', async () => {
  const id = await waitingForApproval('org_admin');
  assert.equal(approvalOf(id).requiredRole, 'org_admin', 'the approval keeps the role its node named');
  const r = await as(users.b_workspace_admin)('POST', `/api/v1/executions/${id}/approve`, { decision: 'approve' });
  assert.equal(r.status, 403);
  assert.equal(approvalOf(id).status, 'pending', 'nothing was decided');
});

test('a decision on a non-pending approval gets 409', async () => {
  const id = await waitingForApproval('workspace_admin');
  const decide = (decision: string) => as(users.b_workspace_admin)('POST', `/api/v1/executions/${id}/approve`, { decision });
  assert.equal((await decide('reject')).status, 200);
  const first = JSON.stringify(approvalOf(id));
  assert.equal((await decide('approve')).status, 409, 'a second decision');
  assert.equal(JSON.stringify(approvalOf(id)), first, 'the first decision stands');
  // An execution that never waited for approval has nothing to decide either.
  const done = (await made(B('POST', `/api/v1/workflows/${(await made(B('POST', '/api/v1/workflows', { name: 'plain' }), 'workflow')).id}/execute`, {}), 'execution')).id;
  assert.equal((await as(users.b_org_admin)('POST', `/api/v1/executions/${done}/approve`, { decision: 'approve' })).status, 409);
});

test('an approval records the signed-in user who decided it', async () => {
  const id = await waitingForApproval('workspace_admin');
  const r = await as(users.b_workspace_admin)('POST', `/api/v1/executions/${id}/approve`, { decision: 'approve', notes: 'ok' });
  assert.equal(r.status, 200);
  const approval = approvalOf(id);
  assert.deepEqual([approval.status, approval.decidedBy], ['approved', 'usr_b_workspace_admin']);
  assert.ok(approval.decidedAt);
  // The org admin may decide an approval that names another role.
  const other = await waitingForApproval('workspace_admin');
  assert.equal((await as(users.b_org_admin)('POST', `/api/v1/executions/${other}/approve`, { decision: 'approve' })).status, 200);
  assert.equal(approvalOf(other).decidedBy, 'usr_b_org_admin');
});

// L1 T7: a deployment key is 32 random bytes, shown once, stored as a hash, compared in constant time.
const execute = (id: string, key?: string) => fetch(`${base}/api/v1/deployments/${id}/execute`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(key === undefined ? {} : { authorization: `Bearer ${key}` }) },
  body: '{}',
});
const publish = async () => {
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'keyed' }), 'workflow');
  return made(B('POST', '/api/v1/deployments', { workflowId: wf.id }), 'deployment');
};

test('a new key has 32 bytes from node:crypto randomBytes', async () => {
  const spy = mock.method(crypto, 'randomBytes');
  let dep;
  try {
    dep = await publish();
  } finally {
    spy.mock.restore();
  }
  assert.ok(spy.mock.calls.some((c) => c.arguments[0] === 32), 'randomBytes(32) was called');
  assert.match(dep.apiKey, /^nx_live_[0-9a-f]{64}$/);
  assert.notEqual((await publish()).apiKey, dep.apiKey);
});

test('the deployment list holds no key material', async () => {
  const dep = await publish();
  const list = JSON.stringify((await B('GET', '/api/v1/deployments')).body);
  assert.ok(list.includes(dep.id));
  for (const secret of [dep.apiKey, hashApiKey(dep.apiKey), 'apiKey']) assert.ok(!list.includes(secret), secret.slice(0, 12));
  const one = JSON.stringify((await B('PATCH', `/api/v1/deployments/${dep.id}/status`, { status: 'active' })).body);
  assert.ok(!one.includes(hashApiKey(dep.apiKey)) && !one.includes(dep.apiKey), 'the status answer');
});

test('a stored deployment holds a key hash, not the key', async () => {
  const dep = await publish();
  const stored = db.getState().deployments.find((d) => d.id === dep.id)!;
  assert.equal(stored.apiKeyHash, hashApiKey(dep.apiKey));
  assert.ok(!JSON.stringify(db.getState()).includes(dep.apiKey), 'the store');
  for (const file of fs.readdirSync(path.join(process.cwd(), 'data'))) {
    assert.ok(!fs.readFileSync(path.join(process.cwd(), 'data', file)).includes(dep.apiKey), `the store file ${file}`);
  }
});

test('key verification compares hashes with timingSafeEqual', async () => {
  const dep = await publish();
  const spy = mock.method(crypto, 'timingSafeEqual');
  try {
    assert.equal((await execute(dep.id, dep.apiKey)).status, 200);
  } finally {
    spy.mock.restore();
  }
  assert.ok(spy.mock.calls.some((c) => (c.arguments[0] as Buffer).length === 32), 'two SHA-256 digests were compared');
  for (const wrong of [undefined, '', 'nx_live_00', dep.apiKey.slice(0, -1) + (dep.apiKey.endsWith('0') ? '1' : '0')]) {
    assert.equal((await execute(dep.id, wrong)).status, 401, `key ${String(wrong).slice(0, 12)}`);
  }
});

test('executing a suspended deployment gets 403', async () => {
  const dep = await publish();
  assert.equal((await B('PATCH', `/api/v1/deployments/${dep.id}/status`, { status: 'suspended' })).status, 200);
  assert.equal((await execute(dep.id, dep.apiKey)).status, 403);
  assert.equal((await execute(dep.id, 'nx_live_wrong')).status, 401, 'a wrong key still learns nothing about the status');
});

test('test-invoke without a session gets 401', async () => {
  const dep = await publish();
  const r = await fetch(`${base}/api/v1/deployments/${dep.id}/test-invoke`, { method: 'POST', headers: { authorization: `Bearer ${dep.apiKey}` } });
  assert.equal(r.status, 401);
});

// L1 T11: bodies are checked against one schema table, errors carry no internals, and the limits hold.
const { SCHEMAS } = await import('./schemas');
const { mergeAgentOutput } = await import('./engine');
const internals = /\bat [\w.<>]+ \(|node_modules|\.tsx?:\d+|[A-Za-z]:\\|\/Users\/|TypeError|SyntaxError|ReferenceError|stack/;
const clean = (r: { status: number; body: any }, what: string) => {
  assert.deepEqual(Object.keys(r.body ?? {}), ['error'], `${what}: only an error message`);
  assert.doesNotMatch(r.body.error, internals, `${what}: no internals`);
};
const stillAnswering = async () => assert.equal((await B('GET', '/api/v1/me')).status, 200, 'the server keeps answering');
const WRONG: Record<string, unknown> = {
  string: 12345, numeric: 'twelve', number: '12', nonnegative: -1, boolean: 'yes', object: 'x', array: 'x',
  'string[]': [1], nodes: [{ id: 'n' }], edges: [{ source: 1 }], cases: [{ input: {} }], schema: { amount: 'money' },
};
// A right value of each type, for the required fields around the one under test.
const RIGHT: Record<string, unknown> = { string: 'x', numeric: 1, number: 1, nonnegative: 1, boolean: true, object: {}, array: [], 'string[]': [], nodes: [], edges: [], cases: [], schema: {}, any: 'x' };
const rightFor = (type: string) => (type.includes('|') ? type.split('|')[0] : RIGHT[type]);

test('an invalid body gets 400 without internals', async () => {
  const src = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf-8').replace(/\r/g, '');
  const reading = [...src.matchAll(/^app\.(get|post|put|patch|delete)\('([^']+)'[\s\S]*?^\}\)\)?;$/gm)]
    .filter((m) => m[0].includes('req.body')).map((m) => `${m[1].toUpperCase()} ${m[2]}`);
  assert.ok(reading.length > 20);
  assert.deepEqual(reading.filter((r) => !(r in SCHEMAS)), [], 'routes that read their body without a schema');
  for (const [route, schema] of Object.entries(SCHEMAS)) {
    const [method, path] = route.split(' ');
    const url = path.replace(/:\w+/g, 'x');
    const notObject = await B(method, url, [1, 2]);
    assert.equal(notObject.status, 400, `${route}: a body that is not an object`);
    clean(notObject, route);
    for (const [field, spec] of Object.entries(schema)) {
      const type = spec.replace(/\?$/, '');
      if (type === 'any') continue;
      const others = Object.fromEntries(Object.entries(schema).filter(([k, t]) => k !== field && !t.endsWith('?')).map(([k, t]) => [k, rightFor(t)]));
      const r = await B(method, url, { ...others, [field]: type.includes('|') ? 'bogus' : WRONG[type] });
      assert.equal(r.status, 400, `${route}: ${field} as the wrong type`);
      clean(r, `${route} ${field}`);
      assert.match(r.body.error, new RegExp(field), `${route}: the answer names ${field}`);
    }
  }
  const broken = await fetch(base + '/api/v1/agents', { method: 'POST', headers: { 'content-type': 'application/json', cookie: cookies.get(users.b_org_admin.id)! }, body: '{"name": ' });
  const answer = { status: broken.status, body: await broken.json().catch(() => null) };
  assert.equal(answer.status, 400, 'JSON that does not parse');
  clean(answer, 'JSON that does not parse');
  await stillAnswering();
});

test('a request body over the limit gets 413', async () => {
  const before = db.getState().knowledge.length;
  const r = await B('POST', '/api/v1/knowledge', { title: 'big', content: 'x'.repeat(1024 * 1024 + 1) });
  assert.equal(r.status, 413);
  clean(r, 'an oversized body');
  assert.equal(db.getState().knowledge.length, before, 'nothing was stored');
  await stillAnswering();
});

test('an invalid deployment status gets 400 and changes nothing', async () => {
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'status' }), 'workflow');
  const dep = await made(B('POST', '/api/v1/deployments', { workflowId: wf.id }), 'deployment');
  const before = JSON.stringify(db.getState().deployments.find((d) => d.id === dep.id));
  for (const body of [{ status: 'deleted' }, {}, { status: 7 }]) {
    const r = await B('PATCH', `/api/v1/deployments/${dep.id}/status`, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    clean(r, JSON.stringify(body));
  }
  assert.equal(JSON.stringify(db.getState().deployments.find((d) => d.id === dep.id)), before);
});

test('a malformed dataset or graph fails its request with 4xx and the server keeps answering', async () => {
  // Refused when written.
  assert.equal((await B('POST', '/api/v1/evaluations/datasets', { name: 'bad', cases: [{ input: {} }] })).status, 400);
  const node = { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 } };
  assert.equal((await B('POST', '/api/v1/workflows', { name: 'bad', nodes: [node], edges: [] })).status, 400);
  // Refused when read back, for records stored before these checks existed.
  const datasetId = 'ds_legacy_bad';
  db.mutate((s) => { s.evaluations.datasets.push({ id: datasetId, orgId: 'org_b', workspaceId: 'ws_b', name: 'legacy', description: '', cases: [{ id: 'c', input: {} }], createdAt: new Date().toISOString() } as any); });
  const run = await B('POST', '/api/v1/evaluations/runs', { datasetId });
  assert.ok(run.status >= 400 && run.status < 500, `evaluation run on a malformed dataset: ${run.status}`);
  clean(run, 'evaluation run');
  await stillAnswering();
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'legacy graph' }), 'workflow');
  db.mutate((s) => {
    const stored = s.workflows.find((w) => w.id === wf.id)!;
    for (const v of stored.versions) for (const n of v.nodes) delete (n as any).config;
  });
  const exec = await B('POST', `/api/v1/workflows/${wf.id}/execute`, {});
  assert.ok(exec.status >= 400 && exec.status < 500, `run of a malformed stored graph: ${exec.status}`);
  clean(exec, 'run of a malformed stored graph');
  await stillAnswering();
});

test('an invoice without a numeric, non-negative amount is refused before it runs', async () => {
  // A workflow that declares its input refuses anything else before a run exists.
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'invoice', inputSchema: { amount: 'nonnegative' } }), 'workflow');
  const runs = () => db.getState().executions.filter((e) => e.workflowId === wf.id).length;
  for (const input of [{ amount: '$90,000' }, {}, { amount: -90000 }]) {
    const r = await B('POST', `/api/v1/workflows/${wf.id}/execute`, { input });
    assert.equal(r.status, 400, JSON.stringify(input));
    clean(r, JSON.stringify(input));
  }
  assert.equal(runs(), 0, 'no run was created');
  assert.equal((await B('POST', `/api/v1/workflows/${wf.id}/execute`, { input: { amount: 100 } })).status, 200);
  // The seed invoice workflow declares it too, and its deployment refuses the same way.
  const seed = db.getState().workflows.find((w) => w.id === 'wf_invoice_reconciliation')!;
  assert.deepEqual(seed.inputSchema, { amount: 'nonnegative' });
  const dep = db.getState().deployments.find((d) => d.id === 'dep_prod_fin_reconciliation')!;
  const key = `nx_live_${'ef'.repeat(32)}`;
  db.mutate(() => { dep.apiKeyHash = hashApiKey(key); dep.status = 'active'; });
  for (const body of ['{"amount":"$90,000"}', '{}', '{"amount":-90000}']) {
    const r = await fetch(`${base}/api/v1/deployments/${dep.id}/execute`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body });
    assert.equal(r.status, 400, body);
  }
  // A condition that compares a missing or non-numeric value fails the run instead of taking a branch.
  const open = await made(B('POST', '/api/v1/workflows', {
    name: 'no schema',
    nodes: [
      { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
      { id: 'c', type: 'condition', label: 'Amount > 25000?', position: { x: 0, y: 0 }, config: { field: 'input.amount', operator: '>', value: 25000 } },
      { id: 'e', type: 'end', label: 'End', position: { x: 0, y: 0 }, config: {} },
    ],
    edges: [{ id: 'e1', source: 's', target: 'c' }, { id: 'e2', source: 'c', target: 'e', label: 'False' }],
  }), 'workflow');
  const run = (await B('POST', `/api/v1/workflows/${open.id}/execute`, { input: { amount: '$90,000' } })).body.execution;
  assert.equal(run.status, 'failed');
});

test('agent output cannot overwrite the workflow input', () => {
  const input = { amount: 90000 };
  const vars = mergeAgentOutput({ ...input, input }, input, { input: { amount: 1 }, amount: 1, verdict: 'clear' });
  assert.deepEqual([vars.input.amount, vars.amount, vars.verdict], [90000, 90000, 'clear']);
  assert.deepEqual(mergeAgentOutput({ input }, input, 'plain text').agentDecision, 'plain text');
  assert.match(fs.readFileSync(new URL('./engine.ts', import.meta.url), 'utf-8'), /currentVariables = mergeAgentOutput\(/, 'the engine merges through it');
});

test('one call over the rate limit gets 429', async () => {
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'limited' }), 'workflow');
  const dep = await made(B('POST', '/api/v1/deployments', { workflowId: wf.id, rateLimitPerMinute: 2 }), 'deployment');
  const call = () => fetch(`${base}/api/v1/deployments/${dep.id}/execute`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${dep.apiKey}` }, body: '{}' });
  assert.deepEqual([(await call()).status, (await call()).status], [200, 200]);
  const runsBefore = db.getState().executions.length;
  const over = await call();
  assert.equal(over.status, 429);
  assert.ok(Number(over.headers.get('retry-after')) > 0, 'Retry-After says when to come back');
  assert.equal(db.getState().executions.length, runsBefore, 'the refused call ran nothing');
});

test('repeated failed sign-ins for one account get 429', async () => {
  const target = { ...users.b_viewer, id: 'usr_b_target', email: 'target@org-b.test' };
  db.mutate((s) => { s.users.push({ ...target, passwordHash: hashPassword('right-password') }); });
  for (let i = 0; i < 5; i++) assert.equal((await login(target.email, `guess-${i}`)).status, 401, `guess ${i}`);
  const locked = await login(target.email, 'right-password');
  assert.equal(locked.status, 429, 'even the right password waits');
  assert.ok(Number(locked.headers.get('retry-after')) > 0);
  assert.equal((await login(users.b_evaluator.email, password(users.b_evaluator))).status, 200, 'other accounts are not affected');
});

// L1 T13: the audit log is the org's own, written only by server code, naming the real actor, and exported safely.
// A small RFC 4180 reader: quoted cells may hold commas, doubled quotes and line breaks.
const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
};
const exportCsv = async (user: User) => {
  if (!cookies.has(user.id)) cookies.set(user.id, await signIn(user));
  return (await fetch(`${base}/api/v1/audit-events/export?format=csv`, { headers: { cookie: cookies.get(user.id)! } })).text();
};
const newest = () => db.getState().auditLogs[0];

test("a cross-tenant audit export returns none of the other org's events", async () => {
  const aIds = db.getState().auditLogs.filter((l) => l.orgId === 'org_a').map((l) => l.id);
  assert.ok(aIds.length > 0, 'org A has events to leak');
  const json = JSON.stringify((await B('GET', '/api/v1/audit-events/export?format=json')).body);
  const csv = await exportCsv(users.b_org_admin);
  for (const id of aIds) assert.ok(!json.includes(id) && !csv.includes(id), id);
  assert.ok((await exportCsv(users.a_org_admin)).includes(aIds[0]), "org A's own export holds them");
});

test('a CSV cell starting with =, +, - or @ is neutralized', async () => {
  const event = db.logAudit({ orgId: 'org_b', workspaceId: 'ws_b', userId: '@SUM(A1)', userEmail: '+cmd|calc', action: '-2+3', resourceType: 'security', resourceId: '=HYPERLINK("http://x")', details: '=1+1', ipAddress: '\t=1' });
  const row = parseCsv(await exportCsv(users.b_org_admin)).find((r) => r[0] === event.id)!;
  assert.ok(row, 'the event is exported');
  for (const cell of row.slice(2)) assert.doesNotMatch(cell, /^[=+\-@\t\r]/, `cell ${cell}`);
  assert.equal(row[8], "'=1+1", 'the value is kept, behind a quote mark');
});

test('every CSV export row parses to nine cells, whatever the input', async () => {
  const details = 'a "quoted", multi\nline\r\nvalue, with "commas", and ""doubled"" quotes';
  const event = db.logAudit({ orgId: 'org_b', workspaceId: 'ws_b', userId: 'x","y', userEmail: 'e@x.test",forged', action: 'A,B', resourceType: 'security', resourceId: 'r\nnew row', details, ipAddress: '1.2.3.4' });
  const rows = parseCsv(await exportCsv(users.b_org_admin));
  for (const r of rows) assert.equal(r.length, 9, JSON.stringify(r).slice(0, 120));
  const row = rows.find((r) => r[0] === event.id)!;
  assert.deepEqual([row[2], row[5], row[6], row[8]], ['A,B', 'x","y', 'e@x.test",forged', details]);
});

test('no route lets a caller write the actor, action or org of an audit record', async () => {
  // Audit routes only read, apart from the demo-only simulator, which picks among fixed events.
  assert.deepEqual(registered().filter((r) => r.includes('/audit-events')).sort(), ['GET /api/v1/audit-events', 'GET /api/v1/audit-events/export', 'POST /api/v1/audit-events/simulate']);
  const sim = await B('POST', '/api/v1/audit-events/simulate', { eventType: 'user', action: 'FORGED', details: 'forged text', userId: 'usr_a_org_admin', orgId: 'org_a' });
  assert.equal(sim.status, 201);
  assert.ok(!JSON.stringify(newest()).includes('FORGED') && !JSON.stringify(newest()).includes('forged text') && newest().orgId === 'org_b');
  // Every audit write in the server takes its actor, action, type and org from server state, never from the request.
  const src = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf-8').replace(/\r/g, '');
  for (const call of src.matchAll(/db\.logAudit\(\{([\s\S]*?)\n\s*\}\);/g)) {
    for (const line of call[1].split('\n').filter((l) => /^\s*(orgId|workspaceId|userId|userEmail|action|resourceType):/.test(l))) {
      assert.doesNotMatch(line, /req\.(body|query|headers|params)/, line.trim());
    }
  }
});

test('every invented audit record is flagged simulated and absent from exports', async () => {
  const before = new Set(db.getState().auditLogs.map((l) => l.id));
  for (const eventType of ['agent', 'user', 'system']) assert.equal((await B('POST', '/api/v1/audit-events/simulate', { eventType })).status, 201);
  assert.equal((await B('POST', '/api/v1/governance/compliance-scan')).status, 200);
  const invented = db.getState().auditLogs.filter((l) => !before.has(l.id));
  assert.ok(invented.length >= 3);
  assert.ok(invented.every((l) => l.simulated === true), 'every one is flagged');
  const json = JSON.stringify((await B('GET', '/api/v1/audit-events/export?format=json')).body);
  const csv = await exportCsv(users.b_org_admin);
  for (const l of invented) assert.ok(!json.includes(l.id) && !csv.includes(l.id), l.id);
});

test("an audit record names the session user and that user's email", async () => {
  await made(as(users.b_builder)('POST', '/api/v1/agents', { name: 'named' }), 'agent');
  assert.deepEqual([newest().userId, newest().userEmail], ['usr_b_builder', 'builder@org-b.test']);
  // No audit write that names the session user carries a made-up address.
  const src = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf-8').replace(/\r/g, '');
  assert.doesNotMatch(src, /userId: res\.locals\.userId,\n\s*userEmail: '/);
});

test('cancelling a finished execution gets 409 and writes no audit record', async () => {
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'finishes' }), 'workflow');
  const done = await made(B('POST', `/api/v1/workflows/${wf.id}/execute`, {}), 'execution');
  assert.ok(['completed', 'failed'].includes(done.status));
  const count = db.getState().auditLogs.length;
  assert.equal((await B('POST', `/api/v1/executions/${done.id}/cancel`)).status, 409);
  assert.equal(db.getState().auditLogs.length, count, 'no audit record');
  assert.equal(db.getState().executions.find((e) => e.id === done.id)!.status, done.status, 'the outcome stands');
  // A run still in progress can be cancelled, and that is recorded.
  const id = runningExecution();
  assert.equal((await B('POST', `/api/v1/executions/${id}/cancel`)).status, 200);
  assert.deepEqual([newest().action, newest().resourceId, newest().userId], ['EXECUTION_CANCELLED', id, 'usr_b_org_admin']);
  assert.equal((await B('POST', `/api/v1/executions/${id}/cancel`)).status, 409, 'a second cancel');
});

test('editing a workflow graph writes an audit record naming the editor', async () => {
  const wf = await made(B('POST', '/api/v1/workflows', { name: 'edited' }), 'workflow');
  const nodes = [
    { id: 's', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
    { id: 'e', type: 'end', label: 'End', position: { x: 0, y: 0 }, config: {} },
  ];
  assert.equal((await as(users.b_builder)('PUT', `/api/v1/workflows/${wf.id}`, { nodes, edges: [{ id: 'x', source: 's', target: 'e' }] })).status, 200);
  assert.deepEqual([newest().action, newest().resourceId, newest().userId, newest().userEmail], ['WORKFLOW_UPDATED', wf.id, 'usr_b_builder', 'builder@org-b.test']);
  assert.match(newest().details, /graph/, 'it says the graph changed');
});

// L1 T16: the role an approval node names decides it, whatever the approve route's outer bound; the org admin may always.
test('an approval that names the operator role is decided by an operator, and refused to a builder', async () => {
  const id = await waitingForApproval('operator');
  assert.equal((await as(users.b_builder)('POST', `/api/v1/executions/${id}/approve`, { decision: 'approve' })).status, 403);
  assert.equal(approvalOf(id).status, 'pending');
  assert.equal((await as(users.b_operator)('POST', `/api/v1/executions/${id}/approve`, { decision: 'approve' })).status, 200);
  assert.deepEqual([approvalOf(id).status, approvalOf(id).decidedBy], ['approved', 'usr_b_operator']);
  // The seed SOC workflow names the operator for its containment approval.
  const soc = db.getState().workflows.flatMap((w) => w.versions).flatMap((v) => v.nodes).find((n) => n.label === 'SecOps Containment Approval');
  assert.equal(soc?.config.requiredRole, 'operator');
});

// L1 T14: findings of the independent check, each a test that failed before its fix.
test('test-invoke on a suspended or rolled_back deployment gets 403 and writes no execution', async () => {
  const dep = await publish();
  for (const status of ['suspended', 'rolled_back']) {
    assert.equal((await B('PATCH', `/api/v1/deployments/${dep.id}/status`, { status })).status, 200);
    const runs = db.getState().executions.length;
    assert.equal((await B('POST', `/api/v1/deployments/${dep.id}/test-invoke`, {})).status, 403, status);
    assert.equal(db.getState().executions.length, runs, `${status}: no execution`);
  }
  assert.equal(db.getState().deployments.find((d) => d.id === dep.id)!.invocationsTotal, 0, 'no invocation counted');
  assert.equal((await B('PATCH', `/api/v1/deployments/${dep.id}/status`, { status: 'active' })).status, 200);
  assert.equal((await B('POST', `/api/v1/deployments/${dep.id}/test-invoke`, {})).status, 200, 'an active deployment still answers');
});

test("a deployment from a fine-tuning job in org B answers nothing about another org's workflow", async () => {
  const job = await made(B('POST', '/api/v1/fine-tuning', { name: 'B tune' }), 'job');
  const dep = (await B('POST', `/api/v1/fine-tuning/${job.id}/deploy`)).body.deployment;
  const foreign = db.getState().workflows.find((w) => w.id === dep.workflowId);
  assert.ok(foreign && foreign.orgId !== 'org_b' && foreign.inputSchema, 'the deployment names a workflow of another org that has an input schema');
  const execute = (body: unknown) => fetch(`${base}/api/v1/deployments/${dep.id}/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${dep.apiKey}` },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const runs = db.getState().executions.length;
  for (const body of [{}, { amount: 5 }]) {
    for (const r of [await B('POST', `/api/v1/deployments/${dep.id}/test-invoke`, body), await execute(body)]) {
      assert.equal(r.status, 404, JSON.stringify(body));
      assert.doesNotMatch(JSON.stringify(r.body), /amount|input|graph/i, 'nothing about the foreign workflow');
    }
  }
  assert.equal(db.getState().executions.length, runs, 'no execution was left behind');
});

test("POST /deployments and /evaluations/runs with another org's id get 404 when the caller's org has records", async () => {
  await made(B('POST', '/api/v1/workflows', { name: 'B own' }), 'workflow');
  await made(B('POST', '/api/v1/evaluations/datasets', { name: 'B cases' }), 'dataset');
  const before = [db.getState().deployments.length, db.getState().evaluations.runs.length];
  assert.equal((await B('POST', '/api/v1/deployments', { workflowId: a.workflow })).status, 404);
  assert.equal((await B('POST', '/api/v1/evaluations/runs', { datasetId: a.dataset })).status, 404);
  assert.deepEqual([db.getState().deployments.length, db.getState().evaluations.runs.length], before, 'nothing was published or run');
  // Without an id, publishing still takes the caller's own first workflow.
  assert.equal((await B('POST', '/api/v1/deployments', {})).status, 201);
});

test('a wrong key on a simulated deployment outside demo mode gets 401, not 501', async () => {
  const dep = await publish();
  db.mutate((s) => {
    s.deployments.find((d) => d.id === dep.id)!.simulated = true;
    settingsOf(s, 'org_b').demoMode = false;
  });
  try {
    for (const wrong of [undefined, 'nx_live_wrong']) assert.equal((await execute(dep.id, wrong)).status, 401, `key ${wrong}`);
    assert.equal((await execute(dep.id, dep.apiKey)).status, 501, 'the right key learns it runs only in demo mode');
  } finally {
    db.mutate((s) => { settingsOf(s, 'org_b').demoMode = true; });
  }
});

test('a rejection without notes is not recorded as authorized', async () => {
  const id = await waitingForApproval('operator');
  assert.equal((await as(users.b_operator)('POST', `/api/v1/executions/${id}/approve`, { decision: 'reject' })).status, 200);
  assert.equal(approvalOf(id).status, 'rejected');
  assert.doesNotMatch(String(approvalOf(id).decisionNotes ?? ''), /authori[sz]ed/i, 'the approval');
  assert.doesNotMatch(String(db.getState().executions.find((e) => e.id === id)!.error), /CFO/, 'the run names no reviewer who did not decide');
});

test("a connector's audit record claims no egress check, since none runs yet", async () => {
  const integration = await made(B('POST', '/api/v1/integrations', { name: 'metadata', baseUrl: 'http://169.254.169.254/' }), 'integration');
  assert.deepEqual([newest().action, newest().resourceId], ['INTEGRATION_CREATED', integration.id]);
  assert.doesNotMatch(newest().details, /egress|validat|zero-trust/i);
});
