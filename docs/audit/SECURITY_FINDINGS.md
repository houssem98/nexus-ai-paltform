# Security Findings

L0 T4, written 2026-10-26 against commit ac0984b, from the code read for `docs/audit/CAPABILITY_MATRIX.md` and the citations below, each re-read this tick. It starts from the BROKEN items in section 2 of `docs/roadmap/NEXUS_WORLD_CLASS_ROADMAP.md`. Until L0 T8 nothing here was exercised against a running server; L0 T8 reproduced several findings in a temporary directory, and each finding says so. Confidence says how sure the reading is. `server/security-findings.test.ts` fails when a finding lacks a severity, a confidence, an evidence citation, or the name of the L1 test that will prove the fix, or when that test names a task missing from `docs/loops/L1_TRUST.md`.

## Threat model

**Assets.** Each org's records (agents, workflows, executions, knowledge, evaluations, approvals); deployment API keys; the audit log; the store file; the model provider key.

**Actors.** Anyone who can reach the port: the server binds every interface (`server.ts#app.listen(PORT, '0.0.0.0', () => {`) and has no sign-in, so an anonymous network client is the baseline attacker. A signed-in user of another org, and a low-privilege user of the same org, matter once L1 T3 adds identity. A holder of a deployment key. A crash or a full disk, for persistence.

**Trust boundaries.** Browser to server, where the server trusts identity headers the browser chooses. Deployment caller to server, guarded only by the key. Server to the model provider, the only outbound call. Server to the filesystem, where all state is one JSON file.

**Severity.** Critical: an anonymous client reads or changes another org's data, takes its keys, or forges records. High: the same with one extra condition, or loss of stored data. Medium: needs an unusual condition, or the risk is latent. Low: hardening.

**Checked and not a finding.** The model key stays server-side: `vite.config.ts` defines no client constant from the environment, and `.gitignore` excludes `.env*` except `.env.example`, which holds only placeholders. This check missed the dev server, which served the data store and the server source until L0 T8 (S28).

**Out of scope for L1, stated so it is not silently waived.** The audit log has no tamper evidence, while the self-test claims it does (`server.ts#cryptographically chained events`). L0 T6 labeled the self-test simulated and demo-only, and L0 T8 removed the screens' "immutable", "SHA-256" and "WORM" claims; a hash chain is not planned.

**Added in L0 T8.** S28 to S38, and the wider S17, come from three independent checker runs (Sonnet; the maker is Opus). Each was reproduced in a temporary directory or read against the code before being added.

## Findings

### S1 · authentication · critical · confidence high
No authentication. Every request's identity comes from headers the client chooses, so any client can act as any user, including `org_admin`.
Evidence: `server.ts#const reqUser = req.headers['x-user-id'] as string;`, `src/lib/api.ts#'x-user-id': this.userId,`
Test: L1 T3: an unauthenticated request gets 401

### S2 · authentication · critical · confidence high
Identity is stored in process-wide variables, so one client's request changes the identity used for every other client's requests until someone sends another header.
Evidence: `server.ts#let currentUserId = 'usr_admin';`, `server.ts#if (reqUser) currentUserId = reqUser;`
Test: L1 T3: two interleaved requests as different users each see their own context

### S3 · authentication · high · confidence high
Context switching accepts any org, workspace and user, with no membership check.
Evidence: `server.ts#if (orgId) currentOrgId = orgId;`, `server.ts#if (userId) currentUserId = userId;`
Test: L1 T3: switching into a foreign org gets 403

### S4 · authentication · high · confidence high
Roles are defined and never checked, so every caller can do everything, including changing settings and guardrails for every org.
Evidence: `server/storage.ts#role: 'org_admin'`, `server.ts#state.settings.demoMode = demoMode;`, `server.ts#if (piiMasking !== undefined) state.guardrails.piiMasking = piiMasking;`
Test: L1 T5: a table of role by route returns 2xx or 403 as the permission table says

### S5 · authentication · high · confidence high
Anyone can decide an approval, a second decision overwrites the first, a finished execution can be approved, and the decider recorded is whoever the global variable names.
Evidence: `server.ts#approval.decidedBy = currentUserId;`, `server.ts#const exec = state.executions.find((e) => e.id === req.params.id);`, `server.ts#cfoSignOff: 'GRANTED',`
Test: L1 T6: a decision on a non-pending approval gets 409

### S6 · tenant isolation · critical · confidence high
List routes return every org's records: integrations, evaluations, deployments, audit events, approvals, fine-tuning jobs, synthetic datasets and red-team runs.
Evidence: `server.ts#res.json({ integrations: state.integrations });`, `server.ts#res.json({ evaluations: { ...state.evaluations, runs } });`, `server.ts#res.json({ approvals: state.approvals });`, `server.ts#jobs: state.fineTuningJobs,`, `server.ts#res.json({ datasets: state.syntheticDatasets, simulated: true });`, `server.ts#runs: state.redTeamingRuns,`
Test: L1 T4: no list route returns another org's records

### S7 · tenant isolation · critical · confidence high
Routes that take an id never compare its org, so any caller can delete, cancel, approve, re-index, annotate, change the status of, or deploy another org's records. Duplicates keep the source org, so a caller can also create records inside another org.
Evidence: `server.ts#const idx = state.knowledge.findIndex((k) => k.id === req.params.id);`, `server.ts#const idx = s.deployments.findIndex((d) => d.id === req.params.id);`, `server.ts#dep.status = status;`, `server.ts#const existing = state.agents.find((a) => a.id === req.params.id);`, `server.ts#const clone = JSON.parse(JSON.stringify(existing));`
Test: L1 T4: org B reading, changing, deleting, executing or duplicating org A's resources by id gets 404

### S8 · tenant isolation · critical · confidence high
Knowledge search reads every org's documents, so normal use of the search box returns another org's content.
Evidence: `server.ts#for (const doc of state.knowledge) {`
Test: L1 T4: a knowledge search as org B returns none of org A's chunks

### S9 · tenant isolation · high · confidence high
The engine looks up agents by id alone, so the agent test route runs any org's agent with its system prompt; a knowledge node with an unknown collection falls back to the first document in the store, whoever owns it.
Evidence: `server/engine.ts#const agent = state.agents.find((a) => a.id === params.agentId);`, `server/engine.ts#state.knowledge[0];`
Test: L1 T4: running org A's agent or knowledge collection as org B gets 404

### S10 · tenant isolation · medium · confidence high
Integrations have no org field, so connectors are shared by every org: any caller can add one that all orgs see, or delete one that other orgs use.
Evidence: `server/storage.ts#export interface ToolIntegration {`, `server.ts#state.integrations.push(item);`, `server.ts#const idx = state.integrations.findIndex((i) => i.id === req.params.id);`
Test: L1 T4: org B cannot list or delete org A's integration

### S11 · secrets · critical · confidence high
The deployment list returns every org's deployments with their API keys to any caller, and the screen copies them to the clipboard.
Evidence: `server.ts#res.json({ deployments: state.deployments.filter((d) => state.settings.demoMode || !d.simulated) });`, `src/components/DeploymentCenter.tsx#navigator.clipboard.writeText(selectedDep.apiKey);`
Test: L1 T7: the deployment list holds no key material

### S12 · secrets · critical · confidence high
The test-invoke route runs any deployment with no key and no identity.
Evidence: `server.ts#/api/v1/deployments/:id/test-invoke`
Test: L1 T7: test-invoke without a session gets 401

### S13 · secrets · high · confidence high
Keys are predictable: built from Math.random, or from the clock for fine-tuned deployments.
Evidence: `server.ts#const randomHex = Math.random().toString(36).substring(2, 10);`, `server.ts#nx_live_ft_`
Test: L1 T7: a new key has 32 bytes from node:crypto randomBytes

### S14 · secrets · high · confidence high
Keys are stored in plaintext in the store file, which git tracks, so every key created while the app runs lands in the working tree and can be committed.
Evidence: `server.ts#apiKey: key,`, `server/storage.ts#const DATA_FILE = path.join(DATA_DIR, 'nexus-store.json');`, `server/storage.ts#apiKey: 'nx_live_98a72b904e5f4b1192da904721',`
Test: L1 T7: a stored deployment holds a key hash, not the key

### S15 · secrets · medium · confidence medium
Keys are compared with plain string inequality, which can leak timing. Exploiting it over a network is hard, hence medium confidence.
Evidence: `server.ts#token !== deployment.apiKey`
Test: L1 T7: key verification compares hashes with timingSafeEqual

### S16 · secrets · high · confidence high
A suspended deployment still executes with a valid key: the execute route never reads the deployment status.
Evidence: `server.ts#const token = authHeader?.replace('Bearer ', '');`, `server.ts#deployment.invocationsTotal += 1;`
Test: L1 T7: executing a suspended deployment gets 403

### S17 · secrets · high · confidence high
Model spend is unbounded and needs no key. Think-and-generate, the agent test and workflow runs call the provider for any caller, the per-deployment rate limit is stored and never enforced, bodies may be 10 MB, and a cycle repeats agent calls up to the step cap of 25. Widened in L0 T8; it used to say only a key holder could do this.
Evidence: `server.ts#app.post('/api/v1/ai/think-and-generate'`, `server.ts#rateLimitPerMinute: Number(rateLimitPerMinute) || 120,`, `server.ts#app.use(express.json({ limit: '10mb' }));`
Test: L1 T11: one call over the rate limit gets 429

### S18 · secrets · low · confidence medium
Error responses pass internal error messages to the client.
Evidence: `server.ts#res.status(500).json({ error: err?.message`
Test: L1 T11: an invalid body gets 400 without internals

### S19 · outbound calls · medium · confidence high
No outbound call exists yet, so there is no SSRF today, but connector base URLs are taken from the caller and stored, and until L0 T6 the architecture document and the connectors screen claimed a protection that does not exist; both now say it is not built. The risk arrives with real connectors in L5.
Evidence: `server.ts#baseUrl: baseUrl || 'https://api.internal.enterprise/v1',`, `docs/architecture.md#SSRF Prevention`
Test: L1 T12: assertSafeEgress blocks every egress case in the attack list

### S20 · audit integrity · medium · confidence high
A route writes invented actions by named people into the audit log, for example a sign-off on a specific invoice. Until L0 T6 these records were indistinguishable from real ones, which made it critical. L0 T6 first removed the route; the human's revised L0 T5 decision brought it back as a demo feature. It now runs only in demo mode, and every record it (or any simulated route) writes is flagged simulated, hidden outside demo mode and never exported. What remains: in demo mode, flagged invented events sit in the same log as real ones.
Evidence: `server/storage.ts#simulatedScope.getStore()`, `server/honesty.test.ts#simulated audit records appear only in demo mode and never leave in an export`
Test: L1 T13: every invented audit record is flagged simulated and absent from exports

### S21 · audit integrity · high · confidence high
Audit records name the spoofable global user and a fixed placeholder email, not the actor's.
Evidence: `server.ts#userEmail: 'user@nexus.internal',`, `server.ts#userId: currentUserId,`
Test: L1 T13: an audit record names the session user and that user's email

### S22 · audit integrity · high · confidence high
Audit reads and exports return every org's events.
Evidence: `server.ts#res.json({ auditLogs: visible.slice(0, 50) });`, `server.ts#const logs = state.auditLogs.filter((l) => !l.simulated);`
Test: L1 T13: a cross-tenant audit export returns none of the other org's events

### S23 · audit integrity · medium · confidence high
The CSV export quotes cells but does not neutralize formulas, so a value starting with `=` runs as a formula when opened in a spreadsheet.
Evidence: `server.ts#nexus_audit_events.csv`, `server.ts#.replace(/"/g, '""')`
Test: L1 T13: a CSV cell starting with =, +, - or @ is neutralized

### S24 · persistence · high · confidence high
Every change rewrites the whole store file in place, so a crash or a full disk during a write leaves a truncated file. A full disk is not hypothetical on this machine: the L0 T0 install failed with ENOSPC at 0 bytes free on 2026-10-25.
Evidence: `server/storage.ts#fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');`
Test: L1 T8: a simulated crash mid-write leaves the previous state readable

### S25 · persistence · high · confidence high
A store that cannot be parsed at boot is replaced by seed data and written over, so one truncated write turns into the loss of all data.
Evidence: `server/storage.ts#console.warn('Could not read existing store file, falling back to seed:', e);`, `server/storage.ts#this.saveState(seed);`
Test: L1 T8: a corrupt store makes boot fail without modifying the file

### S26 · persistence · high · confidence high
A failed write is only logged, so the request reports success for a change that was not saved and is lost on restart.
Evidence: `server/storage.ts#console.error('Failed to write store file:', e);`
Test: L1 T8: a write error returns 5xx

### S27 · persistence · medium · confidence medium
Handlers mutate shared state across awaits and outside the store's mutation function, so concurrent requests can lose updates. Not reproduced yet, hence medium confidence.
Evidence: `server.ts#db.mutate((s) => s);`, `server.ts#const executed = await runWorkflowExecution(executionId);`
Test: L1 T10: two interleaved mutating requests lose no update

### S28 · secrets · critical · confidence high
`npm start` runs Vite's dev middleware whenever NODE_ENV is not production, and Vite served every file under the project root that its deny list did not name, including `/data/nexus-store.json` with every deployment key, and the server source. Reproduced: `/data/nexus-store.json 200 contains apiKey: true`. Fixed in L0 T8 by denying the data directory and the server source; that `npm start` runs a dev server at all is for L6 T1.
Evidence: `vite.config.ts#${root}/data/**`, `server/dev-server.test.ts#the dev server does not serve the data store or the server source`
Test: L1 T7: the dev server does not serve the data store or the server source

### S29 · availability · high · confidence high
Express 4 does not catch a rejected promise from an async handler, and nothing handles unhandled rejections, so one request can stop the process for every tenant. A dataset case without keywords, or a stored graph node without a config, makes the evaluation run or a deployment run throw. Reproduced: the request got no response and raised an unhandled rejection.
Evidence: `server.ts#app.post('/api/v1/evaluations/runs', demoOnly, async (req: Request, res: Response) => {`, `server.ts#cases: cases && cases.length > 0 ? cases : [`
Test: L1 T11: a malformed dataset or graph fails its request with 4xx and the server keeps answering

### S30 · workflow integrity · high · confidence high
The CFO approval threshold fails open. A missing, non-numeric or negative amount compares false, so the run takes the auto-post branch; a condition whose edge labels do not contain True or False falls back to the first edge, which sends every seeded SOC alert to approval whatever its score. Reproduced: amounts `"$90,000"`, missing and -90000 completed with no approval. Branch values instead of labels are L3 T2.
Evidence: `server/engine.ts#if (operator === '>') conditionPassed = Number(actualVal) > Number(targetVal);`, `server/engine.ts#e.label?.toLowerCase().includes(branchLabel.toLowerCase())`
Test: L1 T11: an invoice without a numeric, non-negative amount is refused before it runs

### S31 · workflow integrity · medium · confidence high
A run that stops early is stored as completed: at the step cap, or at a node with no outgoing edge. The engine never reads a cancellation, so cancel cannot stop a run, and the approval branch overwrites it. Cancelling a finished run still answers 200 and writes a cancellation to the audit log. Reproduced: a self-loop completed after 25 nodes; cancelling a completed run returned 200 with a new audit record. The step cap is L2 T8 and cancellation L2 T6.
Evidence: `server/engine.ts#if (execution.status === 'running') {`, `server/engine.ts#const maxSteps = 25;`, `server.ts#Execution ${req.params.id} cancelled by operator.`
Test: L1 T13: cancelling a finished execution gets 409 and writes no audit record

### S32 · audit integrity · high · confidence high
Editing a workflow rewrites the active version's graph in place, whether published or deployed, and writes no audit record, so a live deployment silently runs the edited graph, for example one without its approval node. Deployment runs and test-invokes also write no audit record. Frozen versions are L3 T3.
Evidence: `server.ts#activeVer.nodes = nodes;`
Test: L1 T13: editing a workflow graph writes an audit record naming the editor

### S33 · workflow integrity · medium · confidence medium
Agent output is merged over the workflow's trusted variables, including `input`, so a model reply such as `{"input":{"amount":1}}`, reachable by prompt injection through invoice text, changes the amount the threshold reads. Read in code, not reproduced: it needs a provider.
Evidence: `server/engine.ts#currentVariables = { ...currentVariables, ...agentResult.output, agentDecision: agentResult.output };`
Test: L1 T11: agent output cannot overwrite the workflow input

### S34 · audit integrity · medium · confidence high
The CSV export escapes quotes only in the details cell. The action, user, resource and address cells take raw values, some caller-controlled (the user header, a deployment status), so a quote or a newline adds columns or whole forged rows. S23 covers formulas only.
Evidence: `server.ts#"${log.userId}"`, `server.ts#DEPLOYMENT_${(status as string).toUpperCase()}`
Test: L1 T13: every CSV export row parses to nine cells, whatever the input

### S35 · persistence · medium · confidence high
A deployment status update stores any value before its audit line runs. A missing or non-string status makes that line throw after the write, so the request fails with 500 while the bad status stays, and the deployments screen then fails to render it.
Evidence: `server.ts#dep.status = status;`, `server.ts#DEPLOYMENT_${(status as string).toUpperCase()}`
Test: L1 T11: an invalid deployment status gets 400 and changes nothing

### S36 · authentication · medium · confidence high
The me route returns every user of every org, with names, emails and roles, and an unknown user id falls back to the first user, the org admin. S6 lists the other list routes but not users.
Evidence: `server.ts#availableUsers: state.users,`, `server.ts#const user = state.users.find((u) => u.id === currentUserId) || state.users[0];`
Test: L1 T3: an unknown user gets 401, and the me route lists only the caller's org

### S37 · availability · medium · confidence medium
Nothing bounds the store. Any caller can append audit records forever, for example by switching context, bodies of up to 10 MB are stored, and every change rewrites the whole file synchronously. The retention setting is never applied (retention is L6 T4).
Evidence: `server/storage.ts#this.state.auditLogs.unshift(auditEvent);`, `server.ts#app.use(express.json({ limit: '10mb' }));`
Test: L1 T11: a request body over the limit gets 413

### S38 · tenant isolation · medium · confidence high
Deployment runs and test-invokes return the run's variables as output, including the full text of the knowledge document the workflow read, to any caller who can invoke them; test-invoke needs no key.
Evidence: `server/engine.ts#currentVariables.knowledgeContext = doc?.content || '';`
Test: L1 T4: a deployment response carries no knowledge document text
