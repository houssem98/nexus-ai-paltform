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
const { db } = await import('./storage');
const { executeAgentDirectly } = await import('./engine');

const server = app.listen(0);
await once(server, 'listening');
after(() => server.close());
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const demo = (on: boolean) => db.mutate((s) => { s.settings.demoMode = on; });
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
  const csv = await (await fetch(`${base}/api/v1/audit-events/export?format=csv`)).text();
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
  const params = { agentId: 'agent_invoice_auditor', userInput: { amount: 100 } };
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

test('/api/v1/me reports demo mode, so the header can say so', async () => {
  demo(true);
  assert.equal((await call('GET', '/api/v1/me')).body.demoMode, true);
  demo(false);
  assert.equal((await call('GET', '/api/v1/me')).body.demoMode, false);
});

test('every screen that shows simulated content renders the simulated label', () => {
  const screens = ['Header', 'ActivityFeed', 'GovernanceSecurity', 'ModelCustomizationStudio', 'DataFoundryStudio', 'RedTeamingSecurityStudio', 'EvaluationLab', 'RoadmapViewer', 'SystemVerifierModal', 'ExecutionTrendsChart', 'IntegrationsCatalog'];
  assert.deepEqual(screens.filter((s) => !read(`../src/components/${s}.tsx`).includes('<SimulatedBadge')), []);
});

test('no screen or document repeats a retired claim', () => {
  const retired: [string, string[]][] = [
    ['../src/components/ExecutionTrendsChart.tsx', ['generateFallbackData', '?? 99.4', '|| 1280', "'2,450 tok'", 'Deterministic multi-agent runtime telemetry']],
    ['../src/components/CommandCenter.tsx', ['99.98% Gateway Uptime', 'All systems nominal', 'mTLS Verified', 'Vector Cache Hit Ratio', "'100.0'", '0.048']],
    ['../src/components/IntegrationsCatalog.tsx', ['SSRF Guard Nominal', 'Egress requests block local loopbacks', 'SSRF blocklists']],
    ['../src/components/GovernanceSecurity.tsx', ['immutable event ledger', 'Policies Enforced', 'Compliance Scan Passed']],
    ['../src/components/SystemVerifierModal.tsx', ['compliance-scan', 'elapsed || 24']],
    ['../src/components/RoadmapViewer.tsx', ['100% Verified']],
    ['../src/components/ModelCustomizationStudio.tsx', ["'98.5%'"]],
    ['../src/components/EvaluationLab.tsx', [": '100%'"]],
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
