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
const { db, settingsOf } = await import('./storage');
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
  const run = (id: string, key: string) => fetch(`${base}/api/v1/deployments/${id}/execute`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: '{}',
  });
  assert.equal((await run(a.deployment, bDeployment.apiKey)).status, 401, "org B's key on org A's deployment");

  // The seed deployment's workflow reads a knowledge document; its answer must not carry that document's text.
  const dep = db.getState().deployments.find((d) => d.id === 'dep_prod_fin_reconciliation')!;
  const res = await run(dep.id, dep.apiKey);
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
const runningExecution = () => {
  const id = `exec_rbac_${Math.random().toString(36).slice(2)}`;
  db.mutate((s) => {
    s.executions.unshift({ id, orgId: 'org_b', workspaceId: 'ws_b', workflowId: 'wf', workflowName: 'wf', workflowVersion: 1, trigger: 'manual', status: 'running', input: {}, nodeExecutions: [], startedAt: new Date().toISOString() } as any);
    s.approvals.push({ id: `apr_${id}`, orgId: 'org_b', workspaceId: 'ws_b', executionId: id, workflowId: 'wf', workflowName: 'wf', nodeId: 'n', nodeLabel: 'Approve', payload: {}, status: 'pending', createdAt: new Date().toISOString() });
  });
  return id;
};
// [url, body] for one allowed call on a fresh target of org B.
const target: Record<string, () => Promise<[string, unknown?]>> = {
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
  'POST /api/v1/executions/:id/approve': async () => [`/api/v1/executions/${runningExecution()}/approve`, { decision: 'approve' }],
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
      const [url, body] = may ? await target[route]() : [route.split(' ')[1].replace(/:\w+/g, 'x'), {}];
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
