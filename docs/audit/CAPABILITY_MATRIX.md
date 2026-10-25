# Capability Matrix

L0 T3, written 2026-10-25 against commit e8bea89. Every route handler in `server.ts` was read; every file in `src/components` was searched for API calls and fixed figures. `server/capability-matrix.test.ts` fails when a route registered in `server.ts` or a file in `src/components` has no row, when a row names a route that no longer exists, or when a REAL row does not name an existing test. `scripts/graph-lint.mjs` checks every citation on each `npm run gate`.

## Status words

From section 2 of `docs/roadmap/NEXUS_WORLD_CLASS_ROADMAP.md`, made precise for single rows:

- **REAL**: works, and a named test proves it. No row is REAL yet: the only tests cover `validateGraph` and storage seeding, not a route.
- **PARTIAL**: part of the claimed behavior exists.
- **SIMULATED**: returns invented results as if they were real.
- **BROKEN**: unsafe or wrong. It reads or changes another org's data, exposes secrets, forges records, or accepts what it must refuse. A route that is both BROKEN and SIMULATED is listed as BROKEN, and its evidence says both.
- **UNVERIFIED**: looks correct when read; nothing has checked it.

**Known by**: `read` means the whole handler was read on 2026-10-25; `searched` means the file was searched for API calls and fixed figures but not read in full; `test: <name>` names the test that proves the row.

**True of every row, so not repeated below.** Identity comes from process-wide variables that any request header overwrites (`server.ts#let currentUserId = 'usr_admin';`, `server.ts#if (reqUser) currentUserId = reqUser;`), so even an UNVERIFIED route trusts whoever the last request claimed to be. No route checks a role. Every write goes through the non-atomic store (`server/storage.ts#fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');`). L0 T4 and L1 own these.

## API routes

In registration order, 62 rows.

| Method | Path | Status | Evidence | Known by |
|---|---|---|---|---|
| GET | `/api/v1/me` | BROKEN | Returns whichever user the header names, plus every user of every org: `server.ts#availableUsers: state.users,` | read |
| POST | `/api/v1/auth/switch-context` | BROKEN | Changes the identity of every client of the process: `server.ts#if (userId) currentUserId = userId;` | read |
| GET | `/api/v1/agents` | UNVERIFIED | Filters by org: `server.ts#const agents = state.agents.filter((a) => a.orgId === currentOrgId);` | read |
| GET | `/api/v1/agents/:id` | UNVERIFIED | Filters by org: `server.ts#const agent = state.agents.find((a) => a.id === req.params.id && a.orgId === currentOrgId);` No caller in src. | read |
| POST | `/api/v1/agents` | PARTIAL | Stores the agent; the model is not checked against the allowlist: `server.ts#model: model || 'gemini-4-argon',` | read |
| PUT | `/api/v1/agents/:id` | PARTIAL | Edits the active version in place instead of creating a version: `server.ts#if (systemPrompt !== undefined) activeVer.systemPrompt = systemPrompt;` | read |
| POST | `/api/v1/agents/:id/test` | BROKEN | Runs any org's agent, because the engine looks it up by id alone (`server/engine.ts#const agent = state.agents.find((a) => a.id === params.agentId);`). Without a key or on a provider error the answer is invented (`server/engine.ts#applying robust fallback harness`). | read |
| GET | `/api/v1/workflows` | UNVERIFIED | Filters by org: `server.ts#const workflows = state.workflows.filter((w) => w.orgId === currentOrgId);` | read |
| GET | `/api/v1/workflows/:id` | UNVERIFIED | Filters by org: `server.ts#const workflow = state.workflows.find((w) => w.id === req.params.id && w.orgId === currentOrgId);` No caller in src. | read |
| POST | `/api/v1/workflows` | PARTIAL | Saves the graph without validating it: `server.ts#edges: edges || [{ id: 'e_1', source: 'start_1', target: 'end_1' }],` | read |
| PUT | `/api/v1/workflows/:id` | PARTIAL | Overwrites the active version's graph in place, published or not: `server.ts#activeVer.nodes = nodes;` | read |
| POST | `/api/v1/workflows/:id/validate` | PARTIAL | Ignores the id and has no cycle check: `server.ts#const result = validateGraph(nodes, edges);` | read; test validateGraph rejects a graph with no Start node covers one rule of validateGraph |
| POST | `/api/v1/workflows/:id/execute` | PARTIAL | Runs inside the request and follows only the first outgoing edge: `server.ts#const executed = await runWorkflowExecution(executionId);`, `server/engine.ts#currentNode = version.nodes.find((n) => n.id === outgoingEdges[0].target);` | read |
| GET | `/api/v1/analytics/trends` | SIMULATED | Adds generated numbers to real counts: `server.ts#const seededRandom = (seedStr: string) => {`, `server.ts#const totalExecs = baseExecs + realCount;` | read |
| GET | `/api/v1/executions` | UNVERIFIED | Filters by org: `server.ts#const executions = state.executions.filter((e) => e.orgId === currentOrgId);` | read |
| GET | `/api/v1/executions/:id` | UNVERIFIED | Filters by org: `server.ts#const execution = state.executions.find((e) => e.id === req.params.id && e.orgId === currentOrgId);` | read |
| POST | `/api/v1/executions/:id/approve` | BROKEN | No org check and no status check, so any org's execution, finished or not, can be approved; approving writes an invented outcome instead of running the remaining nodes: `server.ts#const exec = state.executions.find((e) => e.id === req.params.id);`, `server.ts#cfoSignOff: 'GRANTED',`, `server.ts#approval.decidedBy = currentUserId;` | read |
| POST | `/api/v1/executions/:id/cancel` | BROKEN | No org check; only a status field changes: `server.ts#exec.status = 'cancelled';` | read |
| GET | `/api/v1/knowledge` | UNVERIFIED | Filters by org: `server.ts#const documents = state.knowledge.filter((k) => k.orgId === currentOrgId);` | read |
| POST | `/api/v1/knowledge` | PARTIAL | Splits on blank lines; the audit entry claims a vector corpus that does not exist: `server.ts#.split('\n\n')`, `server.ts#into vector corpus` | read |
| POST | `/api/v1/knowledge/search` | BROKEN | Searches every org's documents by substring, with a constant score: `server.ts#for (const doc of state.knowledge) {`, `server.ts#relevanceScore: 0.94,` | read |
| DELETE | `/api/v1/knowledge/:id` | BROKEN | Deletes any org's document: `server.ts#const idx = state.knowledge.findIndex((k) => k.id === req.params.id);` | read |
| POST | `/api/v1/knowledge/:id/reindex` | BROKEN | Any org's document; only a timestamp changes while the audit log says it was re-indexed: `server.ts#const d = state.knowledge.find((k) => k.id === req.params.id);`, `server.ts#across vector partitions` | read |
| GET | `/api/v1/integrations` | BROKEN | Integrations have no tenant, so every org sees every connector: `server.ts#res.json({ integrations: state.integrations });`, `server/storage.ts#export interface ToolIntegration {` | read |
| POST | `/api/v1/integrations/:id/test` | SIMULATED | No network call: random latency, a fixed success message, and the shared connector is marked connected: `server.ts#latencyMs: Math.floor(80 + Math.random() * 60),`, `server.ts#statusMessage: 'Connection verified via authenticated TLS gateway',` | read |
| POST | `/api/v1/integrations` | BROKEN | Adds a connector every org sees, marked connected without a test, and logs a validation that never ran: `server.ts#state.integrations.push(item);`, `server.ts#with zero-trust egress validation` | read |
| DELETE | `/api/v1/integrations/:id` | BROKEN | Any caller removes a connector shared by every org: `server.ts#const idx = state.integrations.findIndex((i) => i.id === req.params.id);` | read |
| GET | `/api/v1/evaluations` | BROKEN | Every org's datasets and runs: `server.ts#res.json({ evaluations: state.evaluations });` | read |
| POST | `/api/v1/evaluations/datasets` | PARTIAL | Stores the dataset, and invents two cases when none are sent: `server.ts#cases: cases && cases.length > 0 ? cases : [` | read |
| POST | `/api/v1/evaluations/runs` | BROKEN | Reads any org's dataset by id, falling back to the first dataset in the store; then copies each expected output into the actual output and reports 100%: `server.ts#const dataset = state.evaluations.datasets.find((d) => d.id === datasetId)`, `server.ts#actualOutput: c.expectedOutput,`, `server.ts#accuracyRate: 100,` | read |
| GET | `/api/v1/deployments` | BROKEN | Every org's deployments, API keys included, to any caller: `server.ts#res.json({ deployments: state.deployments });` | read |
| POST | `/api/v1/deployments/:id/execute` | BROKEN | Compares the key with plain string equality, never checks whether the deployment is suspended, and applies no rate limit: `server.ts#const token = authHeader?.replace('Bearer ', '');`, `server.ts#deployment.invocationsTotal += 1;` | read |
| POST | `/api/v1/deployments` | BROKEN | Key built from Math.random; the workflow is looked up in any org, falling back to the first in the store; the deploy-approval setting is ignored: `server.ts#const randomHex = Math.random().toString(36).substring(2, 10);`, `server.ts#const workflow = state.workflows.find((w) => w.id === workflowId)` | read |
| PATCH | `/api/v1/deployments/:id/status` | BROKEN | Any org's deployment, set to any string: `server.ts#dep.status = status;` | read |
| DELETE | `/api/v1/deployments/:id` | BROKEN | Any org's deployment: `server.ts#const idx = s.deployments.findIndex((d) => d.id === req.params.id);` | read |
| GET | `/api/v1/audit-events` | BROKEN | Every org's events: `server.ts#res.json({ auditLogs: state.auditLogs.slice(0, 50) });` | read |
| POST | `/api/v1/audit-events/simulate` | BROKEN | Writes invented actions by named people into the audit log: `server.ts#app.post('/api/v1/audit-events/simulate'`, `server.ts#Alexandra Vance (Lead Architect) signed off on high-value invoice` | read |
| GET | `/api/v1/approvals` | BROKEN | Every org's approvals: `server.ts#res.json({ approvals: state.approvals });` | read |
| GET | `/api/v1/audit-events/export` | BROKEN | Exports every org's events, unsigned: `server.ts#const logs = state.auditLogs;` | read |
| GET | `/api/v1/settings` | UNVERIFIED | One settings object shared by every org: `server.ts#res.json({ settings: state.settings });` | read |
| PATCH | `/api/v1/settings` | BROKEN | Any caller changes settings for every org, and nothing reads them afterwards: `server.ts#state.settings.demoMode = demoMode;` | read |
| GET | `/api/v1/fine-tuning` | BROKEN | Every org's jobs: `server.ts#jobs: state.fineTuningJobs,` | read |
| POST | `/api/v1/fine-tuning` | SIMULATED | Created already completed, with fixed metrics: `server.ts#evalAccuracy: 98.9,`, `server.ts#MODEL_FINETUNING_COMPLETED` | read |
| POST | `/api/v1/fine-tuning/:id/deploy` | BROKEN | Turns any org's job into a production deployment of the invoice workflow with a clock-derived key: `server.ts#nx_live_ft_`, `server.ts#workflowId: 'wf_invoice_reconciliation',` | read |
| DELETE | `/api/v1/fine-tuning/:id` | BROKEN | Any org's job, with no audit entry: `server.ts#const idx = state.fineTuningJobs.findIndex((j) => j.id === req.params.id);` | read |
| GET | `/api/v1/data-foundry` | BROKEN | Every org's datasets: `server.ts#res.json({ datasets: state.syntheticDatasets });` | read |
| POST | `/api/v1/data-foundry/generate` | SIMULATED | Two fixed samples and a random quality score: `server.ts#qualityScore: parseFloat((97.5 + Math.random() * 2).toFixed(1)),` | read |
| POST | `/api/v1/data-foundry/annotate` | BROKEN | Edits any org's dataset outside the store mutation: `server.ts#const ds = state.syntheticDatasets.find((d) => d.id === datasetId);`, `server.ts#db.mutate((s) => s);` | read |
| DELETE | `/api/v1/data-foundry/:id` | BROKEN | Any org's dataset: `server.ts#const idx = state.syntheticDatasets.findIndex((d) => d.id === req.params.id);` | read |
| GET | `/api/v1/red-teaming` | BROKEN | Every org's runs: `server.ts#runs: state.redTeamingRuns,` | read |
| POST | `/api/v1/red-teaming/execute` | SIMULATED | Fixed counts and score: `server.ts#const blocked = 98;`, `server.ts#safetyScore: 98.6,` | read |
| POST | `/api/v1/red-teaming/test-probe` | SIMULATED | A substring filter that reports a model response although no model is called: `server.ts#Model response generated safely without policy violations.` | read |
| PATCH | `/api/v1/red-teaming/guardrails` | BROKEN | One guardrail object for every org, changed by any caller; only the test-probe route reads it: `server.ts#if (piiMasking !== undefined) state.guardrails.piiMasking = piiMasking;` | read |
| GET | `/api/v1/roadmap` | SIMULATED | Fixed completion with criteria marked met: `server.ts#percentComplete: 100,`, `server.ts#evidence: 'Scoped queries by orgId and workspaceId'` | read |
| POST | `/api/v1/ai/think-and-generate` | PARTIAL | The agent-test engine path pinned to one agent, with the same invented fallback: `server.ts#agentId: 'agent_invoice_auditor',` No caller in src. | read |
| GET | `/api/v1/system/self-test` | SIMULATED | Fixed latencies; suites pass unconditionally or when a list is non-empty: `server.ts#latencyMs: 14,`, `server.ts#zero cyclical deadlocks` | read |
| POST | `/api/v1/deployments/:id/test-invoke` | BROKEN | Runs any org's deployment without a key: `server.ts#/api/v1/deployments/:id/test-invoke` No caller in src. | read |
| POST | `/api/v1/knowledge/reindex-all` | BROKEN | Touches every org's documents and logs a full rebuild that did not happen: `server.ts#state.knowledge.forEach((doc) => {`, `server.ts#VECTOR_INDEX_FULL_REBUILD` | read |
| POST | `/api/v1/governance/compliance-scan` | SIMULATED | Fixed SOC2, ISO 27001 and HIPAA passes that nothing checks: `server.ts#score: 99.4,`, `server.ts#Zero critical vulnerabilities found.` | read |
| POST | `/api/v1/agents/:id/duplicate` | BROKEN | Copies any org's agent, and the copy keeps that org: `server.ts#const existing = state.agents.find((a) => a.id === req.params.id);`, `server.ts#const clone = JSON.parse(JSON.stringify(existing));` | read |
| POST | `/api/v1/workflows/:id/duplicate` | BROKEN | Copies any org's workflow, and the copy keeps that org: `server.ts#const existing = state.workflows.find((w) => w.id === req.params.id);` | read |
| POST | `/api/v1/integrations/:id/sync` | SIMULATED | No network call: a random record count, and the shared connector is marked connected: `server.ts#recordsSynced: Math.floor(120 + Math.random() * 250),` | read |

## Screens

One row per file in `src/components`. A screen is SIMULATED when what it mainly shows is invented, BROKEN when its normal use exposes another org's data or secrets or forges records, PARTIAL when it drives routes that partly work, and UNVERIFIED when it only lays out data it is given.

| Component | Status | Evidence | Known by |
|---|---|---|---|
| `src/components/ActivityFeed.tsx` | BROKEN | Its simulate button writes invented audit events: `src/components/ActivityFeed.tsx#await api.post('/api/v1/audit-events/simulate', { eventType: type });` | searched |
| `src/components/AgentStudio.tsx` | PARTIAL | Creates, edits, tests and copies agents through the PARTIAL and BROKEN agent routes: `src/components/AgentStudio.tsx#const res = await api.post<any>('/api/v1/agents', {` | searched |
| `src/components/Breadcrumbs.tsx` | UNVERIFIED | No API call found. | searched |
| `src/components/CommandCenter.tsx` | SIMULATED | Hard-coded figures shown as live: `src/components/CommandCenter.tsx#99.98% Gateway Uptime` | searched |
| `src/components/CommandPalette.tsx` | UNVERIFIED | No API call found. | searched |
| `src/components/DataFoundryStudio.tsx` | SIMULATED | Shows the generate route's fixed samples and random score: `src/components/DataFoundryStudio.tsx#const res = await api.generateSyntheticData({` | searched |
| `src/components/DeploymentCenter.tsx` | BROKEN | Shows and copies the key of every deployment the list route returns: `src/components/DeploymentCenter.tsx#navigator.clipboard.writeText(selectedDep.apiKey);` | searched |
| `src/components/EvaluationLab.tsx` | SIMULATED | Shows the evaluation route's copied 100% results: `src/components/EvaluationLab.tsx#const res = await api.post<any>('/api/v1/evaluations/runs', {` | searched |
| `src/components/ExecutionTrendsChart.tsx` | SIMULATED | Blended trends, and its own random data when the request fails: `src/components/ExecutionTrendsChart.tsx#generateFallbackData(timeRange, selectedAgentId);` | searched |
| `src/components/GovernanceSecurity.tsx` | SIMULATED | Shows the fixed compliance scan: `src/components/GovernanceSecurity.tsx#const res = await api.post<any>('/api/v1/governance/compliance-scan', {});` | searched |
| `src/components/Header.tsx` | UNVERIFIED | No API call found. | searched |
| `src/components/IntegrationsCatalog.tsx` | SIMULATED | Shows the invented test and sync results: `src/components/IntegrationsCatalog.tsx#/api/v1/integrations/${id}/sync` | searched |
| `src/components/KnowledgeCenter.tsx` | BROKEN | Its search returns other orgs' documents: `src/components/KnowledgeCenter.tsx#const res = await api.post<any>('/api/v1/knowledge/search', { query: searchQuery });` | searched |
| `src/components/ModelCustomizationStudio.tsx` | SIMULATED | Shows fixed training metrics, with its own fallback figure: `src/components/ModelCustomizationStudio.tsx#const res = await api.createFineTuningJob({`, `src/components/ModelCustomizationStudio.tsx#: '98.5%'` | searched |
| `src/components/ObservabilityExplorer.tsx` | PARTIAL | Lists stored execution records; cancel only changes a status: `src/components/ObservabilityExplorer.tsx#/api/v1/executions/${id}/cancel` | searched |
| `src/components/RedTeamingSecurityStudio.tsx` | SIMULATED | Hard-coded score: `src/components/RedTeamingSecurityStudio.tsx#98.6% Refusal Precision` | searched |
| `src/components/RoadmapViewer.tsx` | SIMULATED | Shows the fixed roadmap, plus a hard-coded score: `src/components/RoadmapViewer.tsx#/api/v1/roadmap`, `src/components/RoadmapViewer.tsx#98.6% Safety Score` | searched |
| `src/components/Sidebar.tsx` | UNVERIFIED | No API call found. | searched |
| `src/components/SystemVerifierModal.tsx` | SIMULATED | Shows the fixed self-test: `src/components/SystemVerifierModal.tsx#/api/v1/system/self-test` | searched |
| `src/components/WorkflowBuilder.tsx` | PARTIAL | Edits, validates and runs workflows through the PARTIAL workflow routes: `src/components/WorkflowBuilder.tsx#/api/v1/workflows/${workflow.id}/execute` | searched |
| `src/components/WorkflowLibrary.tsx` | UNVERIFIED | No API call found. | searched |
