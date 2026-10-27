# Target Architecture

L0 T7, written 2026-10-26 against commit f59f165. This is where Nexus should stand at the end of L2, reached by the smallest changes to today's code. It decides four things: how a request knows who is calling, where tenancy is enforced, how state is stored, and how workflows run. Each decision names the files it changes; `server/target-architecture.test.ts` fails if one does not.

Constraints taken as given: no new dependency or infrastructure without a failing test that needs it and the human's approval (`docs/LOOP_CONVENTIONS.md`), so `node:` built-ins are the toolbox; improve code in place, no rewrites; response shapes that `src` reads stay compatible unless the same task updates every consumer. `docs/architecture.md` describes what the product claims; this document decides what gets built, and L0 T6 corrects the old document's unbacked claims.

## Shape

One Node process, as today. Three parts change inside it.

```
browser ──cookie──▶ authenticate ──ctx──▶ handler ──▶ tenancy ──▶ store
                                              │
                                              └─ execute: write job, return id
worker (same process) ── claims job ──▶ engine ──▶ provider adapter
        └── appends events, checkpoints per node ──▶ store
browser ── polls execution + events ──▶ handler
```

### D1 · Request-scoped identity

**Now.** Built in L1 T3. Until then identity lived in process-wide variables that every request's headers overwrote, and the browser sent whatever identity it liked. Now a middleware resolves the caller from the session cookie on every request into `res.locals` (`server.ts#res.locals.userId = user.id;`), identity headers are ignored and the browser sends none (`src/lib/api.ts#return { 'Content-Type': 'application/json' };`), and every API route except sign-in and key-authenticated deployment calls answers 401 without a session (`server.ts#if (!found || !user) return res.status(401).json({ error: 'Sign in required.' });`). Findings S1 to S3 in `docs/audit/SECURITY_FINDINGS.md`.

**Decision.** A middleware in `server.ts`, using sessions and password checks from `server/auth.ts`, resolves the caller once per request and attaches the user, `userId`, `orgId` and `workspaceId` to `res.locals`; handlers read only that. No module-level identity remains. Requests without a valid session get 401, except sign-in itself and deployment calls, which carry their own key (L1 T7). The session stores the active workspace; switching is allowed only to workspaces of the user's own org, and switching user becomes sign-out and sign-in. The sign-in method is the human's choice in L1 T2; the recommendation there (server-side sessions in an HttpOnly cookie, scrypt from `node:crypto`) fits this design without a dependency, and OIDC would plug into the same middleware. The user picker could not survive as impersonation. L1 T3 kept it and made choosing a user sign out and open sign-in with that user's email (`src/App.tsx#await api.post('/api/v1/auth/logout');`), so no feature was removed and nothing impersonates.

**Proved by.** L1 T3: an unauthenticated request gets 401; two interleaved requests as different users each see their own context; switching into a foreign org gets 403.

Changes: `server/auth.ts`, `server.ts#app.post('/api/v1/auth/switch-context'`, `server/storage.ts#export interface User {`, `src/lib/api.ts#return { 'Content-Type': 'application/json' };`, `src/App.tsx#await api.post('/api/v1/auth/logout');`

### D2 · Tenancy enforced in one place

**Now.** Built in L1 T4, without the module: each handler and the engine filter by the caller's org by hand, settings and guardrails are one record per org, integrations carry an org, and `server/tenancy.test.ts` proves every route against a second org. Before L1 T4, 35 of the 62 routes L0 audited got it wrong (`docs/audit/CAPABILITY_MATRIX.md`). Some lists skip the filter (`server.ts#res.json({ integrations: state.integrations.filter((i) => i.orgId === res.locals.orgId && (demo || !i.simulated)) });`), integrations have no org field (`server/storage.ts#export interface ToolIntegration {`), settings and guardrails are one object for every org, and the engine looks records up by id alone (`server/engine.ts#const agent = state.agents.find((a) => a.id === params.agentId && a.orgId === params.orgId);`, `server/engine.ts#docs[0];`).

**Decision.** `server/tenancy.ts` (new) is the only code that touches tenant collections. It takes the request context from D1 and offers list, get, insert, update and remove per collection: reads filter by `orgId`, a get for another org's id answers 404 exactly like a missing id, inserts stamp `orgId` and `workspaceId` from the context and never from the body, and duplicates take the caller's org. The org is the hard boundary; which workspaces a role may see inside its org is a rule in the L1 T5 permission table, applied in the same module. Integrations gain `orgId`; settings and guardrails become one record per org. The engine receives the execution's org and resolves agents and knowledge through the same module, so a workflow cannot reach another org's agent. Enforcement is mechanical as well as tested: a test fails when `server.ts` or `server/engine.ts` reads a tenant collection from the store directly.

L1 T4 did not create the tenancy module this decision names, nor the mechanical check: the filters went into the handlers, the smaller change, and the route-by-route tests are the guard. A handler added later without a filter is caught only if its route gets a cross-tenant test, which the coverage table forces.

**Proved by.** L1 T1's coverage table with no pending rows, and L1 T4's cross-tenant read, write, execute, duplicate and export tests.

Changes: `server/tenancy.ts` (new), `server.ts#const agents = state.agents.filter((a) => a.orgId === res.locals.orgId);`, `server/engine.ts#const agent = state.agents.find((a) => a.id === params.agentId && a.orgId === params.orgId);`, `server/storage.ts#export interface ToolIntegration {`

### D3 · Store

**Now.** Built in L1 T10 as decided below: `node:sqlite` in data/nexus.db (`server/storage.ts#this.file = path.join(dir, 'nexus.db');`), WAL journaling, one table per collection of (id, org_id, the record as JSON), settings and guardrails keyed by org, and a list_order table that keeps each list's order. Memory stays the read model; each write is one transaction carrying only the rows that changed (`server/storage.ts#this.sql.exec('BEGIN IMMEDIATE');`). A failed write fails the call and memory returns to the disk's state (`server/storage.ts#this.state = this.loadState();`); an unreadable store stops boot and is left untouched (`server/storage.ts#Never replace a damaged store with seed data`). A JSON store from before L1 T10 is imported once into an empty database and then left in place, ignored. Git ignores the data directory. Every handler goes through one entry point, `server/storage.ts#public mutate<T>(fn: (state: PlatformState) => T): T {`, which keeps a change of store contained.

**Decision, in two steps.** First, regardless of what L1 T9 chooses, L1 T8 makes the current file safe: write a temporary file, flush it, rename it over the old one; a failed write fails the request; an unreadable store stops boot with a clear error and leaves the file untouched; seed data is written only when no store exists. Then L1 T9, a human decision, picks the long-term store:

- **Atomic JSON file.** No migration, smallest change. Every write still rewrites all state, and nothing gives transactions across an `await`, so L2's per-node events would rewrite the whole file once per event.
- **`node:sqlite`.** Built into Node v25.8.1 here; on 2026-10-26 `DatabaseSync` opened an in-memory database, created a table and counted a row with no warning, and its types ship in the installed `@types/node` 22.20.5. One table per collection with an `org_id` column and a JSON body, writes inside transactions, WAL journaling. It costs a one-time migration of `server/storage.ts`, and it fits D4, whose event log is append-heavy.

Recommendation: `node:sqlite`, because D4 needs cheap appends and real transactions. Either way the store file leaves git: it is added to `.gitignore`, a fresh checkout seeds itself, and the seed holds no key that looks real.

**Proved by.** L1 T8: a simulated crash mid-write leaves the previous state readable; a corrupt store fails boot without modifying the file; a write error returns 5xx. L1 T10: two interleaved mutating requests lose no update; state survives a restart.

Changes: `server/storage.ts#public mutate<T>(fn: (state: PlatformState) => T): T {`, and the JSON store file, which git ignores since L1 T10

### D4 · Runtime

**Now.** A run executes inside the HTTP request (`server.ts#const executed = await runWorkflowExecution(executionId);`) and is saved once at the end (`server/engine.ts#if (idx !== -1) s.executions[idx] = execution;`), so a restart mid-run leaves it stuck and nothing records its progress. It follows only the first outgoing edge and picks condition branches by label substring (`server/engine.ts#e.label?.toLowerCase().includes(branchLabel.toLowerCase())`); hitting the step cap (`server/engine.ts#const maxSteps = 25;`) ends as completed and the visited set is never read (`server/engine.ts#const visited = new Set<string>();`). Since L0 T6, provider failures and tool nodes produce invented results only in demo mode, marked simulated, and fail outside it (`server/engine.ts#applying robust fallback harness`, `server/engine.ts#ERP-TX-`); real calls still report fixed usage (`server/engine.ts#tokensUsed: 1450,`). Approval writes an invented outcome instead of resuming (`server.ts#cfoSignOff: 'GRANTED',`) and cancel only flips a status (`server.ts#exec.status = 'cancelled';`).

**Decision.**

- **Job record.** The execution record (`server/storage.ts#export interface ExecutionRecord {`) gains a checkpoint (the next node id and the variables) and a lease. Execute returns the execution id at once; the run happens in the worker.
- **Event log.** Each execution has an append-only, numbered list of events: node started, node succeeded, node failed, approval requested, approval decided, cancelled, completed, failed. An event is stored before the step it reports is acknowledged, and the checkpoint moves after each node. Clients poll the execution and its events; push (server-sent events) waits for a measured need.
- **In-process worker.** `server/worker.ts` (new) runs in the server process and claims runnable executions by setting a lease. At boot it reclaims executions whose lease expired and continues from the checkpoint. Approval decisions and cancellation become events the worker reads before starting the next node; approve resumes from the approval node (L3 T4).
- **Side effects run once.** Every side-effecting node gets the idempotency key `executionId:nodeId`; its result is stored with the event, and a retry or a recovery reuses the stored result instead of repeating the effect.
- **Honest limits.** Hitting the step cap, a node with no outgoing edge, or a node the run already ran ends the run failed with the reason; each node has a timeout and bounded retries with backoff; a provider error fails the node with that error.
- **Provider adapter.** `server/provider.ts` (new) is the only code that calls the model provider. It reports usage from the provider's response metadata, and returns simulated output only in demo mode, marked `simulated: true`.
- **Branching** moves from label substrings to the edge's own condition field (`server/storage.ts#condition?: string;`) in L3.

Response shapes change here: execute stops returning the finished execution, so L2 T5 updates every consumer in `src` in the same task, starting with `src/components/WorkflowBuilder.tsx#/api/v1/workflows/${workflow.id}/execute`.

**Proved by.** L2 T3 (an injected provider error fails the execution; no `simulated` with demo mode off), L2 T5 (ordered, persisted events; progress visible before completion), L2 T6 (cancel stops later nodes; a retried tool node acts once), L2 T7 (kill and restart resumes without repeating a side effect), L2 T8 (a cycle, a dead end and the step cap each end the run failed).

Changes: `server/worker.ts` (new), `server/provider.ts` (new), `server/engine.ts#const maxSteps = 25;`, `server.ts#const executed = await runWorkflowExecution(executionId);`, `server/storage.ts#export interface ExecutionRecord {`, `src/components/WorkflowBuilder.tsx#/api/v1/workflows/${workflow.id}/execute`

## Order

D1 before D2, because tenancy needs a trustworthy context. D3's first step any time in L1; its second after the L1 T9 decision. D4 after D3, because events need a store that can append. In ledger terms: D1 is L1 T3, D2 is L1 T4 and T5, D3 is L1 T8 to T10, D4 is L2 T3 to T8.

## Not decided here

The sign-in method (L1 T2), the long-term store (L1 T9), the fate of the demo user picker (escalated in L1 T3), and push delivery of events, which waits for a measured need.
