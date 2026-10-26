# Nexus World-Class Roadmap

Written 2026-10-25 against the code at commit 18f35ec. The input is `roadmap/worldclassroadmap.md`; this document turns it into an evidence-backed plan and a graph of executable loops (`docs/LOOP_GRAPH.md`).

**How to read the evidence.** Every statement about the current code cites a file and an exact piece of its text, like `server.ts#percentComplete: 100,`. `scripts/graph-lint.mjs` checks every such citation on each `npm run gate`, so when the code changes and the text disappears, the gate fails until this document is corrected. The statuses in section 2 come from reading the code, not from running it. No item below is marked REAL because no test yet exercises a route; the status of each route and screen is in `docs/audit/CAPABILITY_MATRIX.md` (L0 T3).

## 1. Goal

Build a product customers can trust with real work, not a catalog of screens. The input roadmap puts it as `roadmap/worldclassroadmap.md#The most important rule: build a smaller number of capabilities that demonstrably work before expanding the feature catalog.`

The single workflow everything is measured against is the first customer offer from the input: `roadmap/worldclassroadmap.md#Sell a concrete outcome, such as a workflow that processes incoming support tickets`. From L2 onward one API-level test of that workflow, the golden path, grows with each loop and must stay green.

## 2. Where Nexus stands

Read on 2026-10-25. Status words: BROKEN means the code does something unsafe or wrong; SIMULATED means it returns invented results as if real; PARTIAL means part of the behavior exists; UNVERIFIED means nobody has checked it.

**Identity and tenancy: BROKEN.** The current user, org and workspace are process-wide variables that every request's headers overwrite, so one client's context switch changes everyone's and any client can claim any user: `server.ts#let currentUserId = 'usr_admin';`, `server.ts#if (reqUser) currentUserId = reqUser;`, `src/lib/api.ts#'x-user-id': this.userId,`. Several routes ignore the org entirely: `server.ts#res.json({ integrations: state.integrations });`, `server.ts#res.json({ approvals: state.approvals });`, `server.ts#res.json({ auditLogs: visible.slice(0, 50) });`, `server.ts#for (const doc of state.knowledge) {`. Integrations have no tenant field: `server/storage.ts#export interface ToolIntegration {`.

**Deployment keys: BROKEN.** The deployment list returns every deployment, key included, to any caller: `server.ts#res.json({ deployments: state.deployments.filter((d) => state.settings.demoMode || !d.simulated) });`. Keys come from `Math.random` or the clock: `server.ts#const randomHex = Math.random().toString(36).substring(2, 10);`, `server.ts#nx_live_ft_`. A test route runs any deployment without a key: `server.ts#/api/v1/deployments/:id/test-invoke`.

**Roles: SIMULATED.** Six roles are defined (`server/storage.ts#role: 'org_admin'`) and nothing enforces them, while the product claims `server.ts#6 enterprise role tiers with granular permission grants`. An approval records whoever the global variable names: `server.ts#approval.decidedBy = currentUserId;`.

**Persistence: PARTIAL.** Until L1 T8 every change rewrote the file in place, a failed write was only logged, and an unreadable file at boot was replaced by seed data. Since L1 T8 a change goes to a flushed temporary file renamed over the store (`server/storage.ts#fs.renameSync(tmp, DATA_FILE);`), a failed write fails the call and memory returns to what the disk holds (`server/storage.ts#this.state = this.loadState();`), and an unreadable store stops boot and is left untouched (`server/storage.ts#Never replace a damaged store with seed data`); `server/storage.test.ts` proves each. Still open: every change rewrites the whole file, two concurrent changes can lose one (S27, L1 T10), and an async route whose write fails gets no response and raises an unhandled rejection (S29, L1 T11). Git tracks the store, `data/nexus-store.json`, so running the app changes the working tree. The product claims `server.ts#ACID-safe persistent state in /data/nexus-store.json`.

**Model execution: PARTIAL, with a SIMULATED fallback in demo mode only.** A real call happens only when a key is set (`server/engine.ts#const ai = process.env.GEMINI_API_KEY`). Without a key, or on a provider error, the engine fails outside demo mode; in demo mode it returns an invented answer marked `simulated: true` (`server/engine.ts#applying robust fallback harness`, `server/engine.ts#Deterministic enterprise simulation harness`), since L0 T6. Real calls still report constant usage numbers (`server/engine.ts#tokensUsed: 1450,`), which L2 T3 replaces with the provider's metadata. Whether the model ids `server/engine.ts#model: 'gemini-4-argon',` and `server/engine.ts#'gemini-3.8-flash'` exist at the provider is UNVERIFIED.

**Workflow engine: PARTIAL.** `server/engine.ts#export function validateGraph(` has no cycle check, although the product claims one (`server.ts#Cycle detection, terminal verification, and unreachable node warnings`). Execution follows only the first outgoing edge (`server/engine.ts#currentNode = version.nodes.find((n) => n.id === outgoingEdges[0].target);`) and picks condition branches by label substring (`server/engine.ts#e.label?.toLowerCase().includes(branchLabel.toLowerCase())`). A run cut off by the step cap (`server/engine.ts#const maxSteps = 25;`) is marked completed (`server/engine.ts#if (execution.status === 'running') {`). Runs execute inside the HTTP request, so nothing survives a restart: `server.ts#const executed = await runWorkflowExecution(executionId);`.

**Approvals and cancellation: PARTIAL.** Execution does pause at an approval node (`server/engine.ts#waitingForRole: node.config.requiredRole || 'workspace_admin',`). Approving then writes an invented outcome without running the remaining nodes (`server.ts#cfoSignOff: 'GRANTED',`, `server.ts#finalLedgerPost: 'COMMITTED',`), and cancel only changes a status field (`server.ts#exec.status = 'cancelled';`).

**Tools and integrations: SIMULATED, in demo mode only.** Tool nodes invent transaction ids (`server/engine.ts#ERP-TX-`), and connection tests and syncs make no network call (`server.ts#statusMessage: 'Connection verified via authenticated TLS gateway',`, `server.ts#recordsSynced: Math.floor(120 + Math.random() * 250),`); since L0 T6 all three run only in demo mode and say `simulated: true`. The server contains no outbound HTTP call at all (a search for fetch, new URL and http.request in `server.ts` and the server directory found none on 2026-10-25); `docs/architecture.md#SSRF Prevention` and the connectors screen now say the guard is not built.

**Knowledge: PARTIAL and SIMULATED.** Ingestion splits on blank lines (`server.ts#.split('\n\n')`). Search is a substring match with a constant score (`server.ts#relevanceScore: 0.94,`). Re-indexing only touches a timestamp (`server.ts#VECTOR_INDEX_OPTIMIZED`). The engine's knowledge node falls back to the first document in the store, whoever owns it (`server/engine.ts#|| state.knowledge[0];`).

**Evaluations: SIMULATED.** A run copies each case's expected output into its actual output and reports 100% (`server.ts#actualOutput: c.expectedOutput,`, `server.ts#accuracyRate: 100,`). The candidate never runs. Since L0 T6 runs answer only in demo mode, marked simulated.

**Analytics: computed outside demo mode, labeled inside it** (L0 T6). Outside demo mode every trend number comes from stored executions, latency from recorded durations (`server.ts#const p95 = (xs: number[])`). In demo mode the chart still adds generated numbers to real counts (`server.ts#const seededRandom = (seedStr: string) => {`) and says so. When the request fails the chart shows dashes instead of inventing its own data (`src/components/ExecutionTrendsChart.tsx#Computed from stored executions`).

**Fine-tuning, data foundry, red-teaming: SIMULATED.** Training jobs are created already completed with fixed metrics (`server.ts#evalAccuracy: 98.9,`), synthetic datasets get a random quality score (`server.ts#qualityScore: parseFloat((97.5 + Math.random() * 2).toFixed(1)),`), and red-team runs report a fixed result (`server.ts#safetyScore: 98.6,`). A probe that passes the keyword filter is told `server.ts#Model response generated safely without policy violations.` although no model is called. By the human's L0 T5 decision, since L0 T6 all three answer only in demo mode, say `simulated: true`, and carry a label on screen.

**Governance and verification claims: SIMULATED and labeled.** The compliance scan reports SOC2, ISO 27001 and HIPAA passes that nothing checks (`server.ts#score: 99.4,`), and an endpoint writes invented actions by named people into the audit log (`server.ts#app.post('/api/v1/audit-events/simulate', demoOnly,`). L0 T6 first removed both; the human's revised L0 T5 decision kept them as demo features. They answer only in demo mode and say simulated, and every audit record a simulated route writes is flagged, hidden outside demo mode and never exported (`server/honesty.test.ts#simulated audit records appear only in demo mode and never leave in an export`). The self-test returns fixed latencies (`server.ts#latencyMs: 14,`), and each of its 12 suites either passes unconditionally or passes when a list is non-empty; and the roadmap endpoint reports `server.ts#percentComplete: 100,` with all criteria met, including `server.ts#evidence: 'Scoped queries by orgId and workspaceId'`. Both now answer only in demo mode, marked simulated. The screens that show these are `src/components/SystemVerifierModal.tsx#/api/v1/system/self-test` and `src/components/RoadmapViewer.tsx#/api/v1/roadmap`.

**Policies: SIMULATED, except demo mode.** Model allowlist, retention, deploy approval and rate limits are stored and never enforced, for example `server.ts#rateLimitPerMinute: Number(rateLimitPerMinute) || 120,`. Demo mode is enforced since L0 T6: with it off, every simulated route refuses with 501 (`server.ts#const demoOnly = (req: Request, res: Response, next: NextFunction) => {`). It is still one setting for every org, changed by any caller (`server.ts#state.settings.demoMode = demoMode;`).

**Tests and CI: missing.** Of 46 tracked files, none is a test and none is a CI workflow (checked with git ls-files on 2026-10-25). Since L0 T2, `package.json#"test": "node scripts/test.mjs"` runs `server/engine.test.ts` and `server/storage.test.ts` (2 tests) inside `npm run gate`, and fails when zero tests ran. CI is still missing.

**Build: passed** (L0 T1, 2026-10-25). The root devDependency `esbuild ^0.25.0` conflicted with vite 8's peer range and forced `--legacy-peer-deps`, which skipped recharts' `react-is` peer and broke the build; it was dropped, and a plain `npm install --no-package-lock` now resolves. `package.json#"lint": "tsc --noEmit"` under `package.json#"typescript": "^7.0.2"` and `vite build` both exit 0. `bun.lock` was regenerated with `npx bun@1 install --lockfile-only` (bun 1.4.4; the diff touches only esbuild). The build has no warnings since `vite.config.ts#path.resolve(import.meta.dirname, '.')` replaced `__dirname` and `vite.config.ts#{ name: 'vendor', test: /node_modules/ }` split the 853 kB bundle; the largest chunk is now `charts` at 376 kB.

**Found by the independent check (L0 T8).** Three checker runs on a different model added eleven findings (`docs/audit/SECURITY_FINDINGS.md`, S28 to S38).
- **Fixed in L0 T8:** `npm start` served the data store, keys included, through Vite's dev middleware (S28); invented figures and false claims on 15 screens; records left behind by demo-only routes.
- **Open, owned by L1:**
  - One malformed request can stop the process (S29).
  - A missing or non-numeric amount skips the CFO approval (S30).
  - A run cut off early is stored as completed (S31).
  - Editing a deployed workflow is unaudited (S32).

## 3. Strategy

These are decisions, each with its reason. The loop ledgers turn them into tasks.

1. **Truth before features.** L0 removes or labels every invented result before anything new is built. While the product shows 100% completion and compliance passes no code checks, no later metric can be trusted.
2. **Remove what could cause harm, label the rest.** The recommendation was to remove the compliance scan and the audit simulator, because one reports compliance nobody verified and the other forges audit history, and to label the three studios that imitate other platforms (fine-tuning, data foundry, red-teaming) as demo and freeze them until the core workflow works. The human decided in L0 T5 to keep all five as labeled demo features, kept for later development; the harm is contained by serving them only in demo mode and flagging every audit record they write, which never leaves in an export.
3. **Demo mode becomes real.** The flag already exists and does nothing. Simulated paths run only in demo mode and say `simulated: true`; production refuses them. This is the input's metric `roadmap/worldclassroadmap.md#Zero unlabeled simulations in production mode`.
4. **Security before runtime.** Identity, tenancy, keys and storage integrity (L1) come before real execution (L2), because a real runtime on shared mutable identity would act for the wrong tenant.
5. **No new infrastructure before a measured need.** Transactional storage can use `node:sqlite`, which the installed Node v25.8.1 provides (loaded successfully on 2026-10-25); the runtime starts as an in-process worker; retrieval starts with keyword ranking and adds vectors only if a held-out recall test shows the need (L5 T4).
6. **One golden path.** The support-ticket workflow is built as an API-level test in L2 T9 and extended in L3 and L6. Every loop keeps it green.
7. **Evaluation that can fail.** Deterministic checks first; a model grader only with a different judge model and a stated number of trials; seeded wrong answers must fail (L4).
8. **The harness enforces the roadmap.** As the input asks (`roadmap/worldclassroadmap.md#Your harness and graph-of-loops should become the execution control system for this program`): bounded loops with budgets and stall rules, gates with exit codes, a guard against weakened tests (`scripts/gate-guard.mjs`), citation checks (`scripts/graph-lint.mjs`), and human signoff at every phase boundary.

## 4. Phases and loops

Each phase of the input is one loop with its own ledger. The input's exit gate is the loop's target; the mechanical check is what the gate actually runs.

- **L0 Truth** (`docs/loops/L0_TRUTH.md`). Input gate: a source-backed audit, a reproducible baseline, a prioritized issue list, an approved plan. Mechanical check: a capability matrix with one row per route (a test fails on a missing route), cited security findings, and a test for every labeled or computed number.
- **L1 Trust** (`docs/loops/L1_TRUST.md`). Input gate: authorization tests prove no cross-tenant access; no known critical issue. Mechanical check: a coverage table of every route against two tenants and six roles; crash, corruption and concurrency tests for the store.
- **L2 Runtime** (`docs/loops/L2_RUNTIME.md`). Input gate: a real agent completes a task, emits events, survives restart, reports failure honestly, repeats no side effect. Mechanical check: a kill-and-restart test, an injected provider failure, the golden path v1.
- **L3 Workflow** (`docs/loops/L3_WORKFLOW.md`). Input gate: build, validate, publish, execute, debug and rerun without editing source. Mechanical check: one test per invalid graph shape, version pinning, the golden path v2, and a human UI walkthrough.
- **L4 Quality** (`docs/loops/L4_QUALITY.md`). Input gate: the real candidate runs, seeded failures are caught, publishing is blocked on failure. Mechanical check: a stub-provider test proving real outputs are stored, seeded-failure tests, a 409 on publishing a failing version.
- **L5 Knowledge** (`docs/loops/L5_KNOWLEDGE.md`). Input gate: relevant, authorized, correctly cited evidence. Mechanical check: holdout recall@k against a recorded baseline, cross-tenant retrieval tests, a citation span check.
- **L6 Pilot** (`docs/loops/L6_PILOT.md`). Input gate: a real customer completes the workflow and wants to continue. Mechanical check: production boot validation, backup and restore, quotas and retention. The last three tasks belong to the human.

L3 and L5 both depend only on L2, so either can proceed while the other waits for a signoff.

## 5. Launch metrics

From `roadmap/worldclassroadmap.md#Use these as proposed launch gates.` and where each is proven:

- Authentication and tenant isolation: L1 T4 coverage table and T14.
- Zero unlabeled simulations in production mode: L0 T6, L2 T3, L6 T1.
- Execution durability: L2 T7.
- Evaluation correctness: L4 T3.
- Workflow correctness: L3 T1.
- Citation correctness: L5 T5.
- Regression: `npm run gate`, guarded by `scripts/gate-guard.mjs`.
- Observability: L3 T5 and L4 T7.
- Customer onboarding and product value: L6 T6, T9 and T10, judged by people, not by the loop.

No number is set for commercial metrics until real users produce a baseline, as the input says.

## 6. Not doing until a measured need

- Multi-agent orchestration in the harness: `roadmap/worldclassroadmap.md#Do not start by adding sophisticated multi-agent orchestration to the harness.`
- New studios or screens.
- Vector databases, queues, container orchestration, or any external service a test has not shown to be necessary.

## 7. Open questions and risks

- Whether a Gemini API key is available: `.env.example` holds only a placeholder. L2 T1 asks for it.
- Whether the model ids exist at the provider: L2 T2.
- Whether `npm run lint` and `npm run build` pass: L0 T0 records it.
- Disk space: drive C: had 3.65 GB free on 2026-10-25 after cleanup; a Docker disk image of 53.8 GB remains.
- The 90-day timeline is the input's own; this plan makes no time estimate. Loop budgets cap effort instead.

## 8. How to run it

Open Claude Code in this repository and type one line:

```
/loop /nexus
```

Each tick reads `docs/LOOP_GRAPH.md`, picks the active loop, and does one task. Progress is in each ledger's Journal; a tick stops on a met target, a used-up budget, a stall, or anything on the escalation list in `docs/LOOP_CONVENTIONS.md`, and says why. After a stop, act on what it asked and type the same line again.
