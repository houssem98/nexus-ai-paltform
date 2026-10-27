import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { ExecutionRecord } from './storage';

// L0 T6: every number the product shows is computed, or marked simulated and served only in demo mode.
// The server reads its store from cwd and its model key from the environment when it loads, so isolate both first.
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-honesty-')));
const { app } = await import('../server');
const { db, settingsOf } = await import('./storage');
const { executeAgentDirectly } = await import('./engine');
const { createSession, SESSION_COOKIE, hashApiKey } = await import('./auth');
// Signed in as the seed org admin; sign-in itself is tested in tenancy.test.ts.
const cookie = `${SESSION_COOKIE}=${createSession(db.getState().users[0])}`;

const server = app.listen(0);
await once(server, 'listening');
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
// The seed org's demo mode; demo mode is per org since L1 T4.
const demo = (on: boolean) => db.mutate((s) => { settingsOf(s, 'org_nexus_enterprises').demoMode = on; });
const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf-8');

// A simulated route refuses outside demo mode and writes nothing; in demo mode it says simulated,
// and every audit record it writes is flagged simulated.
async function assertDemoOnly(routes: [string, string, unknown?][]) {
  const auditCount = () => db.getState().auditLogs.length;
  demo(false);
  for (const [method, url, body] of routes) {
    const before = auditCount();
    const res = await call(method, url, body);
    assert.equal(res.status, 501, `${method} ${url} outside demo mode`);
    assert.equal(res.body?.simulated, undefined, `${method} ${url}: a refusal carries no simulated flag`);
    assert.equal(auditCount(), before, `${method} ${url}: a refusal writes no audit record`);
  }
  demo(true);
  for (const [method, url, body] of routes) {
    const before = auditCount();
    const res = await call(method, url, body);
    assert.ok(res.status < 300, `${method} ${url} in demo mode got ${res.status}`);
    assert.equal(res.body?.simulated, true, `${method} ${url} in demo mode must say simulated`);
    const written = db.getState().auditLogs.slice(0, auditCount() - before);
    assert.ok(written.every((l) => l.simulated === true), `${method} ${url} wrote an unflagged audit record`);
  }
}

test('the fine-tuning, data foundry and red-teaming studios answer only in demo mode, marked simulated', () =>
  assertDemoOnly([
    ['GET', '/api/v1/fine-tuning'],
    ['POST', '/api/v1/fine-tuning', {}],
    ['POST', '/api/v1/fine-tuning/ft_secops_llama/deploy'],
    ['DELETE', '/api/v1/fine-tuning/ft_legal_mistral'],
    ['GET', '/api/v1/data-foundry'],
    ['POST', '/api/v1/data-foundry/generate', {}],
    ['POST', '/api/v1/data-foundry/annotate', { datasetId: 'syn_fin_fraud', sampleId: 'samp_01', preference: 'B', rationale: 'probe' }],
    ['DELETE', '/api/v1/data-foundry/syn_cyber_ioc'],
    ['GET', '/api/v1/red-teaming'],
    ['POST', '/api/v1/red-teaming/execute', {}],
    ['POST', '/api/v1/red-teaming/test-probe', { prompt: 'hello' }],
    ['PATCH', '/api/v1/red-teaming/guardrails', { piiMasking: true }],
  ]));

test('the compliance scan and the audit simulator answer only in demo mode, marked simulated', () =>
  assertDemoOnly([
    ['POST', '/api/v1/governance/compliance-scan', {}],
    ['POST', '/api/v1/audit-events/simulate', { eventType: 'user' }],
  ]));

test('simulated audit records appear only in demo mode and never leave in an export', async () => {
  demo(true);
  const simulated = (await call('POST', '/api/v1/audit-events/simulate', { eventType: 'user' })).body.auditLog;
  const agent = (await call('POST', '/api/v1/agents', { name: 'audit probe' })).body.agent;
  const real = db.getState().auditLogs.find((l) => l.resourceId === agent.id)!;
  assert.equal(real.simulated, undefined);

  const listed = async () => (await call('GET', '/api/v1/audit-events')).body.auditLogs.map((l: any) => l.id);
  assert.ok((await listed()).includes(simulated.id));
  const json = (await call('GET', '/api/v1/audit-events/export?format=json')).body.logs.map((l: any) => l.id);
  const csv = await (await fetch(`${base}/api/v1/audit-events/export?format=csv`, { headers: { cookie } })).text();
  assert.ok(json.includes(real.id) && !json.includes(simulated.id), 'JSON export');
  assert.ok(csv.includes(real.id) && !csv.includes(simulated.id), 'CSV export');

  demo(false);
  assert.ok(!(await listed()).includes(simulated.id));
});

test('the self-test answers only in demo mode, marked simulated', () => assertDemoOnly([['GET', '/api/v1/system/self-test']]));

test('the roadmap answers only in demo mode, marked simulated', () => assertDemoOnly([['GET', '/api/v1/roadmap']]));

test('evaluation runs answer only in demo mode, marked simulated', () =>
  assertDemoOnly([['POST', '/api/v1/evaluations/runs', {}]]));

test('integration tests and syncs answer only in demo mode, marked simulated', () =>
  assertDemoOnly([
    ['POST', '/api/v1/integrations/custom_api_sap_erp/test'],
    ['POST', '/api/v1/integrations/custom_api_sap_erp/sync'],
  ]));

test('analytics outside demo mode are computed from stored executions only', async () => {
  const run = (id: string, status: ExecutionRecord['status'], durationMs: number, totalTokens: number, totalCostUsd: number): ExecutionRecord => ({
    id,
    orgId: 'org_nexus_enterprises',
    workspaceId: 'ws_enterprise_ops',
    workflowId: 'wf_trend_probe',
    workflowName: 'trend probe',
    workflowVersion: 1,
    trigger: 'manual',
    status,
    input: {},
    nodeExecutions: [],
    startedAt: new Date().toISOString(),
    durationMs,
    totalTokens,
    totalCostUsd,
    agentId: 'agent_trend_probe',
  });
  db.mutate((s) => {
    s.executions.push(run('exec_p1', 'completed', 100, 10, 0.1), run('exec_p2', 'completed', 300, 20, 0.2), run('exec_p3', 'failed', 500, 0, 0));
    // A simulated run must not count outside demo mode.
    s.executions.push({ ...run('exec_p4', 'completed', 900, 1000, 9), simulated: true });
  });
  const trends = async () => (await call('GET', '/api/v1/analytics/trends?days=7&agentId=agent_trend_probe')).body;

  demo(false);
  const body = await trends();
  assert.equal(body.simulated, undefined);
  const { executions, completed, failed, tokens, costUsd, avgLatencyMs, p95LatencyMs } = body.points.at(-1);
  assert.deepEqual(
    { executions, completed, failed, tokens, costUsd, avgLatencyMs, p95LatencyMs },
    { executions: 3, completed: 2, failed: 1, tokens: 30, costUsd: 0.3, avgLatencyMs: 300, p95LatencyMs: 500 },
  );
  assert.ok(body.points.slice(0, -1).every((p: any) => p.executions === 0 && p.avgLatencyMs === null && p.p95LatencyMs === null));
  const { totalExecutions, successRate, avgLatencyMs: periodLatency } = body.summary;
  assert.deepEqual({ totalExecutions, successRate, periodLatency }, { totalExecutions: 3, successRate: 66.7, periodLatency: 300 });

  demo(true);
  assert.equal((await trends()).simulated, true);
});

test('agent answers without a provider are simulated in demo mode and refused outside it', async () => {
  const params = { orgId: 'org_nexus_enterprises', agentId: 'agent_invoice_auditor', userInput: { amount: 100 } };
  demo(true);
  assert.equal((await executeAgentDirectly(params)).simulated, true);
  demo(false);
  await assert.rejects(executeAgentDirectly(params), /demo mode/);
});

test('a tool node fails outside demo mode instead of inventing a result', async () => {
  const created = await call('POST', '/api/v1/workflows', {
    name: 'tool probe',
    nodes: [
      { id: 's', type: 'start', label: 'Start', x: 0, y: 0, config: {} },
      { id: 't', type: 'tool', label: 'ERP post', x: 0, y: 0, config: { toolId: 'custom_api_sap_erp' } },
      { id: 'e', type: 'end', label: 'End', x: 0, y: 0, config: {} },
    ],
    edges: [
      { id: 'e1', source: 's', target: 't' },
      { id: 'e2', source: 't', target: 'e' },
    ],
  });
  const execute = async () => (await call('POST', `/api/v1/workflows/${created.body.workflow.id}/execute`, { input: {} })).body.execution;

  demo(false);
  const refused = await execute();
  assert.equal(refused.status, 'failed');
  assert.match(refused.error, /demo mode/);
  assert.equal(refused.simulated, undefined);

  demo(true);
  const simulated = await execute();
  assert.equal(simulated.status, 'completed');
  assert.equal(simulated.simulated, true);
});

test('deployment runs say when they are simulated, and test-invoke reports real success', async () => {
  // The seed key is unknown since L1 T7, so the test gives the seed deployment a key of its own.
  const key = `nx_live_${'cd'.repeat(32)}`;
  db.mutate((s) => { s.deployments.find((d) => d.id === 'dep_prod_fin_reconciliation')!.apiKeyHash = hashApiKey(key); });
  const execute = async () =>
    (await fetch(`${base}/api/v1/deployments/dep_prod_fin_reconciliation/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ amount: 100 }),
    })).json();
  demo(true);
  assert.equal((await execute()).simulated, true);

  demo(false);
  // The seed deployment is invented history and runs only in demo mode since L1 T17, so a real one is published.
  const published = (await call('POST', '/api/v1/deployments', { workflowId: 'wf_invoice_reconciliation' })).body.deployment;
  const invoked = (await call('POST', `/api/v1/deployments/${published.id}/test-invoke`, { amount: 100 })).body;
  assert.deepEqual({ status: invoked.status, success: invoked.success, durationMs: invoked.durationMs }, { status: 'failed', success: false, durationMs: undefined });
});

test('records made by demo-only routes are flagged and hidden outside demo mode', async () => {
  demo(true);
  const deployment = (await call('POST', '/api/v1/fine-tuning/ft_finance_gemini/deploy')).body.deployment;
  const run = (await call('POST', '/api/v1/evaluations/runs', {})).body.run;
  assert.deepEqual([deployment.simulated, run.simulated], [true, true]);

  demo(false);
  assert.ok(!(await call('GET', '/api/v1/deployments')).body.deployments.some((d: any) => d.id === deployment.id));
  assert.ok(!(await call('GET', '/api/v1/evaluations')).body.evaluations.runs.some((r: any) => r.id === run.id));
  const executed = await fetch(base + deployment.endpointUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${deployment.apiKey}` },
    body: '{}',
  });
  assert.equal(executed.status, 501);
  assert.equal((await call('POST', `/api/v1/deployments/${deployment.id}/test-invoke`, {})).status, 501);
});

test('connector tests do not mark a connector connected, and new connectors start disconnected', async () => {
  demo(true);
  db.mutate((s) => {
    const crm = s.integrations.find((i) => i.id === 'crm_salesforce')!;
    crm.status = 'disconnected';
    delete crm.lastTestedAt;
  });
  await call('POST', '/api/v1/integrations/crm_salesforce/test');
  await call('POST', '/api/v1/integrations/crm_salesforce/sync');
  const crm = db.getState().integrations.find((i) => i.id === 'crm_salesforce')!;
  assert.deepEqual({ status: crm.status, lastTestedAt: crm.lastTestedAt }, { status: 'disconnected', lastTestedAt: undefined });

  const created = (await call('POST', '/api/v1/integrations', { name: 'probe', baseUrl: 'https://example.invalid' })).body.integration;
  assert.deepEqual({ status: created.status, lastTestedAt: created.lastTestedAt }, { status: 'disconnected', lastTestedAt: undefined });
});

test('demo mode accepts only a boolean', async () => {
  demo(true);
  assert.equal((await call('PATCH', '/api/v1/settings', { demoMode: 'false' })).status, 400);
  assert.equal(settingsOf(db.getState(), 'org_nexus_enterprises').demoMode, true);
});

test('/api/v1/me reports demo mode, so the header can say so', async () => {
  demo(true);
  assert.equal((await call('GET', '/api/v1/me')).body.demoMode, true);
  demo(false);
  assert.equal((await call('GET', '/api/v1/me')).body.demoMode, false);
});

test('every screen that shows simulated content renders the simulated label', () => {
  const screens = ['Header', 'ActivityFeed', 'GovernanceSecurity', 'AgentStudio', 'ObservabilityExplorer', 'WorkflowLibrary', 'ModelCustomizationStudio', 'DataFoundryStudio', 'RedTeamingSecurityStudio', 'EvaluationLab', 'RoadmapViewer', 'SystemVerifierModal', 'ExecutionTrendsChart', 'IntegrationsCatalog'];
  assert.deepEqual(screens.filter((s) => !read(`../src/components/${s}.tsx`).includes('<SimulatedBadge')), []);
});

test('no screen or document repeats a retired claim', () => {
  const retired: [string, string[]][] = [
    ['../src/components/ExecutionTrendsChart.tsx', ['generateFallbackData', '?? 99.4', '|| 1280', "'2,450 tok'", 'Deterministic multi-agent runtime telemetry', "|| '0'", "'0.0000'", 'Active Continuous Ingestion']],
    ['../src/components/CommandCenter.tsx', ['99.98% Gateway Uptime', 'All systems nominal', 'mTLS Verified', 'Vector Cache Hit Ratio', "'100.0'", '0.048', 'Apex Frontier', 'INV-2026-9042', '84,200.00', "'1.24s'", '(MTD)', 'Nexus Cluster v2.4', '6 Tracks']],
    ['../src/components/IntegrationsCatalog.tsx', ['SSRF Guard Nominal', 'Egress requests block local loopbacks', 'SSRF blocklists', '>Connected<', 'Verified ']],
    ['../src/components/GovernanceSecurity.tsx', ['immutable event ledger', 'Policies Enforced', 'Compliance Scan Passed', 'Apex Frontier', 'INV-2026-9042', '84,200.00', 'Exceeds auto-posting', 'Immutable', 'Cryptographically', 'Tenant-isolated', 'WORM', 'Policies Updated']],
    ['../src/components/ActivityFeed.tsx', ['SHA-256', 'immutable', 'isLiveActive', 'events logged']],
    ['../src/components/DeploymentCenter.tsx', ['SSRF Guard', 'mTLS', 'token bucket', 'immutable', '|| 140', 'Live API Succeeded', 'previous version']],
    ['../src/components/Header.tsx', ['40/40', '>100%<', 'Live Platform']],
    ['../src/components/CommandPalette.tsx', ['40/40', 'Live Studio']],
    ['../src/components/AgentStudio.tsx', ['|| 1240', "'0.0039'", '>Gemini 4 Argon<']],
    ['../src/components/ObservabilityExplorer.tsx', ['|| 1240', "'0.0037'", "'1.2s'", '|| 12}', 'Terminated pending', 'Argon High']],
    ['../src/components/WorkflowLibrary.tsx', ['>Published<', 'verified model reasoning']],
    ['../src/components/WorkflowBuilder.tsx', ['zero deadlocks', 'CFO Human Reviewer', 'SAP ERP Ledger Commit', 'Procurement Policies §4.2', 'setTimeout(r, 350)']],
    ['../src/components/Sidebar.tsx', ['Reasoning level set to high']],
    ['../src/components/KnowledgeCenter.tsx', ['Vectors Synced', 'Cosine Threshold', 'Semantic Retrieval', 'vector index']],
    ['../src/components/SystemVerifierModal.tsx', ['compliance-scan', 'elapsed || 24']],
    ['../src/components/RoadmapViewer.tsx', ['100% Verified']],
    ['../src/components/ModelCustomizationStudio.tsx', ["'98.5%'"]],
    ['../src/components/EvaluationLab.tsx', [": '100%'", '|| runs[0]', 'Benchmark Passed', '|| 100', 'Gemini 4 Argon']],
    ['../src/components/RedTeamingSecurityStudio.tsx', ['|| 98.4']],
    ['../docs/architecture.md', ['Egress tool invocations validate target hosts']],
  ];
  const repeated = retired.flatMap(([file, phrases]) => phrases.filter((p) => read(file).includes(p)).map((p) => `${file}: ${p}`));
  assert.deepEqual(repeated, []);
});

test('no component but the workflow canvas calls Math.random', () => {
  const files = fs.readdirSync(new URL('../src/components/', import.meta.url));
  assert.deepEqual(files.filter((f) => f !== 'WorkflowBuilder.tsx' && read(`../src/components/${f}`).includes('Math.random')), []);
});

// L1 T17: the seed's history never happened, so it is listed only in demo mode, like every simulated record;
// agents, workflows, documents and datasets are templates and stay.
test('with demo mode off, no list returns a seed record of something that never happened', async () => {
  const get = async (url: string) => (await call('GET', url)).body;
  const listed = async () => [
    ...(await get('/api/v1/executions')).executions, ...(await get('/api/v1/approvals')).approvals,
    ...(await get('/api/v1/evaluations')).evaluations.runs, ...(await get('/api/v1/deployments')).deployments,
    ...(await get('/api/v1/integrations')).integrations, ...(await get('/api/v1/audit-events')).auditLogs,
    ...(await get('/api/v1/audit-events/export?format=json')).logs,
  ].map((r: { id: string }) => r.id);
  const invented = ['exec_fin_88291', 'exec_fin_88292', 'appr_88292', 'eval_run_2026_01', 'dep_prod_fin_reconciliation',
    'custom_api_sap_erp', 'threat_intel_virustotal', 'firewall_manager', 'crm_salesforce', 'aud_101', 'aud_102', 'aud_103'];

  demo(true);
  const inDemo = await listed();
  assert.deepEqual(invented.filter((id) => !id.startsWith('aud_') && !inDemo.includes(id)), [], 'demo mode still shows the sample history');

  demo(false);
  const outside = await listed();
  assert.deepEqual(invented.filter((id) => outside.includes(id)), []);
  assert.equal((await call('POST', '/api/v1/deployments/dep_prod_fin_reconciliation/test-invoke', { amount: 100 })).status, 501, 'nor runs');
  const templates = [
    ...(await get('/api/v1/agents')).agents, ...(await get('/api/v1/workflows')).workflows,
    ...(await get('/api/v1/knowledge')).documents, ...(await get('/api/v1/evaluations')).evaluations.datasets,
  ].map((r: { id: string }) => r.id);
  for (const id of ['agent_invoice_auditor', 'wf_invoice_reconciliation', 'kb_procurement_policies', 'ds_invoice_verification']) {
    assert.ok(templates.includes(id), `the template ${id} stays`);
  }
});
