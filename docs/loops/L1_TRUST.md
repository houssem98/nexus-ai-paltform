# L1 Trust

Phase 1 of `roadmap/worldclassroadmap.md`, "Secure the platform". Needs L0. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: automated authorization tests prove that one tenant cannot access another tenant's protected resources.` and `roadmap/worldclassroadmap.md#No known critical security issue is accepted for release.`

Deciding rule, fixed before T1 starts: T0 to T14 are ticked, the T1 coverage table has no pending rows, `npm run gate` exits 0, and the human's signoff line (T15) is in the Journal.

## Current state (read 2026-10-25, re-verified in T0 on 2026-10-26)

- Identity lived in process-wide variables that any request overwrote, and the client sent whatever identity it liked, until T3 (see its Journal entry): now `server.ts#res.locals.userId = user.id;` runs on every request from the session, and the client sends no identity: `src/lib/api.ts#return { 'Content-Type': 'application/json' };`.
- Until T4 these routes read or changed other tenants' data, because they never compared the org; since T4 each filters by the caller's org (see its Journal entry): `server.ts#res.json({ integrations: state.integrations.filter((i) => i.orgId === res.locals.orgId) });`, `server.ts#res.json({ evaluations: { datasets: state.evaluations.datasets.filter((d) => d.orgId === res.locals.orgId), runs } });`, `server.ts#(demo || !d.simulated)).map(publicDeployment) });`, `server.ts#res.json({ auditLogs: visible.slice(0, 50) });`, `server.ts#res.json({ approvals: state.approvals.filter((a) => a.orgId === res.locals.orgId) });`, `server.ts#for (const doc of state.knowledge.filter((k) => k.orgId === res.locals.orgId)) {`, `server.ts#const idx = state.knowledge.findIndex((k) => k.id === req.params.id && k.orgId === res.locals.orgId);`, `server.ts#const exec = state.executions.find((e) => e.id === req.params.id && e.orgId === res.locals.orgId);`, `server.ts#const existing = state.agents.find((a) => a.id === req.params.id && a.orgId === res.locals.orgId);`. Integrations have no tenant field at all: `server/storage.ts#export interface ToolIntegration {`.
- Until T7 deployment keys were returned by the deployment list, built from Math.random or the clock, stored in plain text and compared with string equality. Since T7 they are 32 random bytes (`server/auth.ts#export const newApiKey = () =>`), returned once, stored as a hash (`server/storage.ts#apiKeyHash: string;`) and compared in constant time (`server/auth.ts#return presented.length === stored.length && crypto.timingSafeEqual(presented, stored);`). `server.ts#/api/v1/deployments/:id/test-invoke` needs a session since T3, for the caller's org since T4.
- Roles are defined (`server/storage.ts#role: 'org_admin'`); since T5 one table (`server/permissions.ts#export const PERMISSIONS: Record<string, Role[]> = {`) is checked on every changing request. Since T3 an approval records the signed-in user (`server.ts#approval.decidedBy = res.locals.userId;`); since T6 only the role its node names, or the org admin, may decide it, once.
- Persistence rewrote one JSON file in place, only logged a failed write, and replaced an unreadable file at boot with seed data, until T8 made the write atomic; since T10 it is SQLite, one transaction per write (`server/storage.ts#this.sql.exec('BEGIN IMMEDIATE');`), with ids that do not collide (`server/storage.ts#export const newId = (prefix: string) =>`), and memory still returns to the disk's state after a failed write (`server/storage.ts#this.state = this.loadState();`).
- Stored and never enforced: `server.ts#rateLimitPerMinute: Number(rateLimitPerMinute) || 120,`. Body size limit: `server.ts#app.use(express.json({ limit: '10mb' }));`.
- No outbound HTTP call exists in `server.ts` or the server directory (searched for fetch, new URL, http.request and https.request on 2026-10-25 and again on 2026-10-26). Connector URLs are user-supplied: `server.ts#baseUrl: baseUrl || 'https://api.internal.enterprise/v1',`.
- Audit export covers only the caller's org since T4, and quotes cells without neutralizing formulas: `server.ts#nexus_audit_events.csv`.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint, refresh every citation here that L0 changed, and add a task for each finding in `docs/audit/SECURITY_FINDINGS.md` (new) that no task below covers. Adding tasks is allowed; removing one is an escalation. Evidence: graph-lint exits 0.
- [x] T1 Two-tenant fixture. needs: T0. Two orgs with one user per role in each, a helper that calls any route as a given user, and a coverage table listing every route as covered or `pending:T<n>`; a test fails when a route registered in `server.ts` is missing from the table. Evidence: `npm test` exits 0.
- [x] T2 (human) Authentication method. needs: T0. Choose how users sign in. Recommendation: server-side sessions in an HttpOnly cookie, passwords hashed with scrypt from `node:crypto`, no new dependency; OIDC later if a pilot customer needs it. Evidence: the decision line in the Journal.
- [x] T3 Request-scoped identity. needs: T1, T2. Replace the globals (`server.ts#let currentUserId = 'usr_admin';`) with identity resolved per request from the session, stop trusting identity headers (`src/lib/api.ts#'x-user-id': this.userId,`), and limit context switching (`server.ts#app.post('/api/v1/auth/switch-context'`) to the user's own memberships. Evidence: tests: an unauthenticated request gets 401; two interleaved requests as different users each see their own context; switching into a foreign org gets 403. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S36: an unknown user gets 401, and the me route lists only the caller's org.
- [x] T4 Tenant enforcement. needs: T3. Every read and write filters by the caller's org and workspace, including every route in the current-state list; integrations gain an org field. Evidence: the T1 coverage table has no pending rows and every cross-tenant read, write, execute, duplicate and export test passes. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S6: no list route returns another org's records; S7: org B reading, changing, deleting, executing or duplicating org A's resources by id gets 404; S8: a knowledge search as org B returns none of org A's chunks; S9: running org A's agent or knowledge collection as org B gets 404; S10: org B cannot list or delete org A's integration; S38: a deployment response carries no knowledge document text.
- [x] T5 RBAC. needs: T3. One permission table for the six roles (`server/storage.ts#role: 'org_admin'`), checked on every mutating route. Evidence: a table-driven test of role by route asserting 2xx or 403. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S4: a table of role by route returns 2xx or 403 as the permission table says.
- [x] T6 Approval enforcement. needs: T5. A decision requires the node's role (`server/engine.ts#waitingForRole: node.config.requiredRole || 'workspace_admin',`), records the session user, and a decision on a non-pending approval gets 409. Resuming the workflow after approval is L3 T4. Evidence: tests for a missing role (403), a second decision (409), and the recorded decider.
- [x] T7 Deployment keys. needs: T4. Keys come from `node:crypto` random bytes, are stored as hashes, shown once at creation, never returned by the list, and compared in constant time; test-invoke requires an authorized session. Evidence: tests: the list holds no key material; a wrong key gets 401; test-invoke without a session gets 401. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S11: the deployment list holds no key material; S13: a new key has 32 bytes from node:crypto randomBytes; S14: a stored deployment holds a key hash, not the key; S15: key verification compares hashes with timingSafeEqual; S16: executing a suspended deployment gets 403; S28: the dev server does not serve the data store or the server source (passes since L0 T8).
- [x] T8 Store integrity. needs: T0. Write to a temporary file and rename it; a failed write fails the request; an unreadable store at boot stops the server with a clear error and leaves the file untouched. Evidence: tests: a simulated crash mid-write leaves the previous state readable; a corrupt store makes boot fail without modifying the file; a write error returns 5xx.
- [x] T9 (human) Storage decision. needs: T8. Phase 1 asks for transactional storage (`roadmap/worldclassroadmap.md#Move shared platform state to transactional persistent storage.`). Options: keep the atomic JSON file, or move to `node:sqlite`, which the installed Node v25.8.1 provides (checked on 2026-10-25 by loading it with require). Also decide whether `data/nexus-store.json` stays tracked by git. Evidence: the decision lines in the Journal.
- [x] T10 Transactional store. needs: T9. Implement the T9 choice. Evidence: tests: two interleaved mutating requests lose no update; state survives a restart; the suite never touches `data/nexus-store.json`.
- [ ] T11 Validation, errors, limits. needs: T4. Validate request bodies against schemas; error responses carry no stack traces or internals; enforce the deployment rate limit; justify or lower the body size limit. Evidence: tests: an invalid body gets 400 without internals; one call over the limit gets 429. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S17: one call over the rate limit gets 429; S29: a malformed dataset or graph fails its request with 4xx and the server keeps answering; S30: an invoice without a numeric, non-negative amount is refused before it runs; S33: agent output cannot overwrite the workflow input; S35: an invalid deployment status gets 400 and changes nothing; S37: a request body over the limit gets 413; S39: repeated failed sign-ins for one account get 429.
- [x] T12 Egress guard. needs: T0. A pure function `assertSafeEgress(url, resolve)` with an injectable resolver, to be wired into connectors in L5 T8, since no outbound call exists yet. Evidence: table tests blocking every egress case in the attack list of `docs/LOOP_CONVENTIONS.md`. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S19: assertSafeEgress blocks every egress case in the attack list.
- [ ] T13 Audit integrity. needs: T4. Audit reads and exports are tenant-scoped; CSV export neutralizes cells that start with `=`, `+`, `-` or `@`; only server code paths append audit records. Evidence: tests for a cross-tenant export, a formula cell, and the absence of any route that writes caller-supplied audit text. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S20: every invented audit record is flagged simulated and absent from exports; S21: an audit record names the session user and that user's email; S22: a cross-tenant audit export returns none of the other org's events; S23: a CSV cell starting with =, +, - or @ is neutralized; S31: cancelling a finished execution gets 409 and writes no audit record; S32: editing a workflow graph writes an audit record naming the editor; S34: every CSV export row parses to nine cells, whatever the input.
- [ ] T14 Independent check. needs: T3, T4, T5, T6, T7, T10, T11, T12, T13. A different model, in at least 3 independent runs, attacks identity, tenancy, keys, persistence and egress per the attack list; each finding becomes a failing test first. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T15 (human) Signoff. needs: T14. The human confirms no known critical issue is open or silently waived. Evidence: the signoff line in the Journal.

## Journal

- 2026-10-26 · L1/T0 · started T0
- 2026-10-26 · L1/T0 · passed · gate green · commit see `git log --grep "loop(L1/T0)"` · All 38 findings in `docs/audit/SECURITY_FINDINGS.md` already named an existing L1 task, so no task was added; but 28 of those test names appeared nowhere in their task, so a finding could be closed by a task that never ran its test. `server/security-findings.test.ts` now fails unless the task line names the test word for word (it failed first: `S4: T5 does not name the test "a table of role by route returns 2xx or 403 as the permission table says"`), and T3, T4, T5, T7, T11, T12 and T13 now list their finding tests. Current-state citations re-checked: all resolve, the statements still hold, and a fresh search found no outbound HTTP call. Evidence:

  ```
  $ node scripts/graph-lint.mjs
  graph-lint: 15 docs · 528 citations (114 file, 0 line range, 405 literal, 9 planned)
  graph-lint: clean
  graph-lint exit 0
  $ npm run gate
  ℹ tests 27
  ℹ pass 27
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged. The human wants a product institutions will adopt, and an institution's security review asks for exactly these tests, so each finding is now tied to the test that closes it. Next: T1 two-tenant fixture (T2 authentication method is the human's, and T3 needs it).
- 2026-10-26 · L1/T1 · started T1 (written after the test file was created, not before; Recovery asks for it first, and nothing else was touched)
- 2026-10-26 · L1/T1 · passed · gate green · commit see `git log --grep "loop(L1/T1)"` · `server/tenancy.test.ts` adds org_a and org_b with one user per role each, a helper `as(user)` that calls any route as that user (the one place L1 T3 swaps headers for a session), and a coverage table of all 62 routes registered in `server.ts`: 2 `pending:T3` (me, switch-context) and 60 `pending:T4`, none covered yet. Three tests: each org has the six roles and the helper is seen as `usr_b_viewer` in `org_b`; the table matches the registered routes in both directions (it failed first with an empty table: `routes missing from the coverage table`); and a pending row must name an open L1 task, so T3 and T4 cannot be ticked while their rows are pending. Evidence:

  ```
  $ npm run gate   (runs npm test)
  graph-lint: clean
  ℹ tests 30
  ℹ pass 30
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; the fixture is what lets "one tenant cannot reach another" be proven route by route, which is the proof an institution asks for. Next: T2 (human) authentication method blocks T3; the next agent task is T8 store integrity.
- 2026-10-26 · L1/T8 · started T8
- 2026-10-26 · L1/T8 · passed · gate green · commit see `git log --grep "loop(L1/T8)"` · `server/storage.ts` now writes a flushed temporary file and renames it over the store; a failed write throws to the caller and memory reloads from disk, so a refused change does not reappear on the next write; an unreadable store, or one with no organizations, stops boot with an error naming the file and is left untouched, where it used to be overwritten with seed data. The three new tests in `server/storage.test.ts` failed first (`Missing expected exception.`, `boot must fail`, `got 200`). Limits, written into S26 and the roadmap: an async route whose write fails still gets no response (S29, T11), and concurrent changes are T10. graph-lint flagged 9 citations of the old code in five docs, which now describe the new code. Evidence:

  ```
  $ node --import tsx --test server/storage.test.ts
  ✔ storage seeds an empty directory
  ✔ a simulated crash mid-write leaves the previous state readable
  ✔ a corrupt store makes boot fail without modifying the file
  ✔ a write error returns 5xx
  ℹ pass 4
  ℹ fail 0
  $ npm run gate
  graph-lint: clean
  ℹ tests 33
  ℹ pass 33
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; an institution will not trust a store that can lose everything on one bad write, and that path is closed. Next: T12 egress guard (T2, the human's sign-in decision, still blocks T3 to T7; T9 storage decision is the human's and is now unblocked).
- 2026-10-26 · L1/T12 · started T12
- 2026-10-26 · L1/T12 · passed · gate green · commit see `git log --grep "loop(L1/T12)"` · `server/egress.ts` adds `assertSafeEgress(url, resolve)`: only http and https, and every address the host resolves to must be public (node:net BlockList over loopback, private, link-local, carrier-grade NAT, benchmarking, multicast, reserved and NAT64 ranges); it returns the checked addresses so the caller connects to them and not to a second lookup. `server/egress.test.ts` failed first (module missing), then one allowed-host case failed because a `::ffff:0:0/96` rule made BlockList block every IPv4 address; that rule was removed, since BlockList already checks IPv4-mapped addresses against the IPv4 rules. 22 blocked cases from the attack list plus mapped, unique-local, link-local, rebinding and empty-answer cases, localhost through the real resolver, and two allowed hosts. A guard on one URL cannot see redirects, so L5 T8 now requires every redirect hop to pass the guard and tests a redirect to a private address; S19 and `docs/architecture.md` say the guard is built and not yet wired. Evidence:

  ```
  $ node --import tsx --test server/egress.test.ts
  ℹ pass 24
  ℹ fail 0
  $ npm run gate
  graph-lint: clean
  ℹ tests 57
  ℹ pass 57
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; institutions run connectors inside their own networks, and this keeps a connector URL from reaching internal systems or cloud credentials once L5 wires it. Next: no agent task is open. T3 to T7, T11 and T13 wait on T2 (human, sign-in method) through T3 or T4; T10 waits on T9 (human, storage decision). Escalate both.
- 2026-10-26 · L1/T2 · passed · gate green · commit see `git log --grep "loop(L1/T2)"` · Human decision, chosen from the options offered: "Sessions + scrypt (Recommended)", that is, server-side sessions in an HttpOnly cookie and passwords hashed with scrypt from `node:crypto`, no new dependency; OIDC or SAML single sign-on later, when a pilot institution asks for it. · Direction: goal unchanged. Next: T3 request-scoped identity.
- 2026-10-26 · L1/T9 · passed · gate green · commit see `git log --grep "loop(L1/T9)"` · Human decision, chosen from the options offered: "SQLite + untrack (Recommended)", that is, T10 moves the store to `node:sqlite` with real transactions, and `data/nexus-store.json` stops being tracked by git because it holds deployment keys. · Direction: goal unchanged. Next: T3 request-scoped identity; T10 is open once T9 is ticked.
- 2026-10-26 · L1/T3 · started T3
- 2026-10-26 · L1/T3 · passed · gate green · commit see `git log --grep "loop(L1/T3)"` · Identity is now per request. `server/auth.ts` holds scrypt hashing, in-memory sessions (8 hours, HttpOnly SameSite=Strict cookie, Secure in production) and the first-boot admin password from `NEXUS_ADMIN_PASSWORD`; a middleware in `server.ts` puts the session user into `res.locals`, and every API route except sign-in and key-authenticated deployment execution answers 401 without a session. The three process-wide identity variables and the header middleware are gone; their 126 uses read `res.locals` (tsc checked each sits in a handler). New routes: sign-in and sign-out. The me route lists only the caller's org and never a password hash; switch-context changes only the session's workspace, within the user's org, and refuses user or org switches with 403. The client sends no identity headers, shows a sign-in screen on 401, and the user picker now signs out and opens sign-in with the chosen email. The new tests failed first (`server/auth` missing); the T1 helper now signs in through the real route, the me and switch-context rows are covered, and the honesty and storage tests sign in as the seed admin with no assertion changed. Docs: 39 stale citations fixed; the matrix gains its first four REAL rows (sign-in, sign-out, me, switch-context), a sign-in screen row, and the header screen moves from BROKEN to UNVERIFIED; S1, S2, S3 and S36 are marked fixed, S5 and S21 partly. New finding S39: sign-in has no attempt limit, now a T11 test. For the human: the target architecture said the user picker was an escalation if kept in demo mode or removed; it was neither, it became sign-out and sign-in. Until a user-management route exists, only the bootstrapped admin can sign in. The sign-in screen is not covered by a test (matrix row UNVERIFIED). Evidence:

  ```
  $ node --import tsx --test server/tenancy.test.ts
  ✔ every org has one user per role, and the helper calls a route as that user
  ✔ the coverage table lists every registered route, and nothing else
  ✔ a pending row names an L1 task that is not ticked yet
  ✔ an unauthenticated request gets 401
  ✔ two interleaved requests as different users each see their own context
  ✔ switching into a foreign org gets 403
  ✔ an unknown user gets 401, and the me route lists only the caller's org
  ✔ signing in needs the right password, and signing out ends the session
  ✔ NEXUS_ADMIN_PASSWORD gives the first org admin a password once, stored only as a hash
  ℹ pass 9
  ℹ fail 0
  $ npm run gate
  graph-lint: clean
  ℹ tests 63
  ℹ pass 63
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; real sign-in with per-request identity is the first thing an institution's security review checks, and it is now proven by tests. Next: T4 tenant enforcement (the largest L1 task: 60 routes pending in the T1 table).
- 2026-10-26 · L1/T4 · started T4
- 2026-10-26 · L1/T4 · passed · gate green · commit see `git log --grep "loop(L1/T4)"` · Every route and the engine now keep to the caller's org. 15 id lookups gained `&& x.orgId === res.locals.orgId`; every list filters by org; lookups that fell back to the first record in the store (evaluation runs, deployments, the engine's knowledge node) fall back within the org; integrations gained `orgId` and `workspaceId`; settings and guardrails became one record per org (`settingsOf`, `guardrailsOf`, a new org starts from the seed values with demo mode off), so demo mode is now per org; the engine takes the run's org for agents, documents and demo mode; summaries (roadmap, self-test, compliance scan) read an `orgView`; the audit simulator's list, reindex-all and think-and-generate stay in the org; a run's returned output drops `knowledgeContext` (S38). Older store files migrate at boot: a copy of `data/nexus-store.json` loaded with its settings, guardrails and 4 integrations given to the seed org, and the tracked file was not touched. Tests: 9 new cross-tenant tests in `server/tenancy.test.ts`, org A's records made through the API and attacked by org B on every route; the T1 table has no pending rows. Process note: these tests were written after the code, not before; to show they bite, 5 fixes were reverted one at a time on a copy and each revert failed at least one test (integration list, knowledge search, deployment lookup, engine knowledge lookup, output stripping); the search test first passed vacuously with a query that matched nothing and was fixed to check that org A's own search finds the text. Docs: 65 citations renamed to the new code; 33 matrix rows and 9 screen rows reworded, rows broken only by cross-org access lost BROKEN; S6 to S10 and S38 marked fixed with test citations. Not done from the target architecture's D2: no separate tenancy module and no mechanical check that handlers avoid the store; the coverage table forces a cross-tenant test for every new route instead, and D2 now says so. Evidence:

  ```
  $ node --import tsx --test server/tenancy.test.ts   (the 9 T4 tests; 18 in the file)
  ✔ no list route returns another org's records
  ✔ org B reading, changing, deleting, executing or duplicating org A's resources by id gets 404
  ✔ a knowledge search as org B returns none of org A's chunks
  ✔ running org A's agent or knowledge collection as org B gets 404
  ✔ org B cannot list or delete org A's integration
  ✔ records org B creates belong to org B, whatever org the body names
  ✔ org B's settings and guardrails changes leave org A's alone
  ✔ org-wide actions of org B touch and report only org B's records
  ✔ a deployment key works only for its own deployment, and a deployment response carries no knowledge document text
  ℹ pass 18
  ℹ fail 0
  $ npm run gate
  graph-lint: clean
  ℹ tests 72
  ℹ pass 72
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; the exit gate of this phase, one tenant cannot reach another's protected resources, is now an automated test per route, which is what an institution's due diligence asks for. Next: T5 RBAC (one permission table for the six roles).
- 2026-10-26 · L1/T5 · started T5
- 2026-10-26 · L1/T5 · passed · gate green · commit see `git log --grep "loop(L1/T5)"` · `server/permissions.ts` holds the one permission table: every role of an org may read; changing routes need, from narrowest, org_admin (settings, guardrails, audit simulator, compliance scan), workspace_admin (deployments, connectors, approvals as the outer bound for L1 T6, re-index of everything, fine-tune deploy), builder (agents, workflows, knowledge, connector tests, studios), operator (run and cancel workflows, test-invoke), evaluator (datasets, evaluation runs, annotation, red-team runs and probes); sign-out, context switch and knowledge search are open to every role; a changing route missing from the table is refused. The session middleware checks it on every request (`server.ts#if (!allowed(user.role, req.method, req.baseUrl + req.path)) {`). The new test failed first (`operator on POST /api/v1/agents`), then passed: for each of the 41 changing routes and each of the six roles of org B, an allowed call on a fresh real target answers 2xx and a refused call answers 403 and leaves the store byte-for-byte unchanged; one exception is written into the test, think-and-generate, which runs a seed-org agent by a fixed id and so answers 404 outside the seed org even when allowed. The table's choices are mine, made from the role descriptions in `docs/architecture.md`; the human may change any row, and roles are still fixed, not customizable. `data/nexus-store.json` shows as modified in git because the human started the app with the new launcher; the loop did not write it and did not stage it. Evidence:

  ```
  $ npm run gate
  graph-lint: clean
  ℹ tests 74
  ℹ pass 74
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; least privilege by role is the next thing an institution's access review checks after tenant isolation. Next: T6 approval enforcement.
- 2026-10-26 · maintenance, not a tick · The disk fell to 76 MB. The cause was the gate itself: `server/dev-server.test.ts` closed Vite while its dependency pre-bundler ran, leaving a 10 MB `node_modules/.vite/deps_temp_*` folder per run (22 found). The test now turns pre-bundling off (`server/dev-server.test.ts#optimizeDeps: { noDiscovery: true },`), with every assertion unchanged; a gate run afterwards left 0 such folders. The 22 folders and the loop's own temporary test directories were deleted (regenerable caches the loop made); free space went from 300 MB to 486 MB. Gate green, 74 tests. Next: T6 approval enforcement.
- 2026-10-26 · L1/T6 · started T6
- 2026-10-26 · L1/T6 · passed · gate green · commit see `git log --grep "loop(L1/T6)"` · An approval now stores the role its node names (`server/engine.ts#requiredRole: node.config.requiredRole || 'workspace_admin',`; older records default to workspace_admin). The approve route checks, in order: the execution is the caller's org's (404), it has a pending approval (409), and the caller holds the named role or is the org admin (403); the decision records the session user. Letting the org admin decide any approval is my choice, not stated in the task; the human may remove it. Three tests in `server/tenancy.test.ts` drive a real workflow to its approval node: a workspace_admin facing an org_admin approval gets 403 and nothing is decided; a second decision gets 409 and the first stands, as does a decision on an execution that never waited; the decider is recorded. Two failed first (`the approval keeps the role its node named`, `a second decision`); the decider test already passed, since T3. Not changed: approving still writes an invented outcome (`cfoSignOff`, `finalLedgerPost`) instead of running the remaining nodes, which is L3 T4 and is now stated in S5. Evidence:

  ```
  $ npm run gate
  graph-lint: clean
  ℹ tests 77
  ℹ pass 77
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; maker-checker approval by the right role, decided once, is a control every credit or payment process at an institution requires. Next: T7 deployment keys.
- 2026-10-27 · L1/T7 · started T7
- 2026-10-27 · L1/T7 · passed · gate green · commit see `git log --grep "loop(L1/T7)"` · A deployment key is now `nx_live_` plus 32 bytes from `crypto.randomBytes`, for published and fine-tuned deployments alike; the publishing answer is the only one that carries it; the store keeps its SHA-256 (`apiKeyHash`); the execute route hashes the presented key and compares with `crypto.timingSafeEqual`, then refuses a deployment that is not active with 403; every other answer strips the hash. `server/auth.ts` switched to one `crypto` namespace import so the tests can watch `randomBytes(32)` and `timingSafeEqual` being called. Keys stored in plain text before T7 lived in a git-tracked file, so the boot migration treats them as leaked: each gets the hash of a key nobody holds, and the deployment must be published again; the seed deployment likewise has no usable key. Escalation note for the human: this deliberately invalidates every existing deployment key, including any real integration that used one. The Deployments screen keeps a new key in memory until reload and otherwise runs its live test through the signed-in test-invoke route. Tests: six in `server/tenancy.test.ts` (five failed first; test-invoke without a session already got 401 since T3) and one in `server/storage.test.ts` for the migration, written after its code and shown to bite by removing the migration on a copy (1 failure). Two older tests that called the seed deployment with its plain key now give it a test key's hash first, assertions unchanged. Docs: S11 to S16 marked fixed with test citations; the matrix's key rows and the deployments screen reworded. Evidence:

  ```
  $ npm run gate
  graph-lint: clean
  ℹ tests 84
  ℹ pass 84
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; with T7 all eight critical findings are closed (S28 since L0 T8), and API credentials now meet the bar a bank's security review sets; the open highs are rate limits and crash-on-bad-input (T11) and audit integrity (T13). Next: T10 transactional store (node:sqlite), per the T9 decision.
- 2026-10-27 · L1/T10 · started T10
- 2026-10-27 · L1/T10 · passed · gate green · commit see `git log --grep "loop(L1/T10)"` · The store is SQLite (`node:sqlite`, data/nexus.db, WAL), as the human chose in T9 and D3 describes: one table per collection of (id, org_id, the record as JSON), settings and guardrails keyed by org, and a list_order table for each list's order. Memory stays the read model, so no handler changed; each write is one `BEGIN IMMEDIATE` transaction holding only the rows that changed, compared with what the database holds. A JSON store from before T10 is imported once into an empty database, with the old migrations and a refusal to import two records with one id, then left in place and ignored. S27 was reproduced: with the clock pinned to one millisecond, concurrent creates returned duplicate ids (`every new record has its own id` failed), because every record id was built from `Date.now()`; all 16 record ids now come from `newId()`, which adds random bytes. Three new tests (interleaved creates and workflow runs survive a restart; the whole state survives a restart; no test file can load the store before moving into a temporary directory) failed first. The guard caught a real case: `server/engine.test.ts` imported the engine, and so the store, from the repository; run alone from the repo root during this tick it created data/nexus.db from the human's JSON store; that database was deleted at once (the JSON was not touched), and the test now moves into a temporary directory first. The T8 tests were rewritten for SQLite at equal strength (the crash test now fails the second row of a two-row write and checks the database holds neither change; removing the transaction makes it fail), the corrupt-store test also covers a damaged database, the T7 key test goes through the JSON import, and a new test checks the import happens once. The dev-server test probes a file it writes into data/ and removes, since Vite refuses only files that exist and a fresh checkout has no store. Per T9, data/nexus-store.json is no longer tracked (`git rm --cached`, the human's copy stays on disk) and data/ is ignored; I8 now says tests never open the repository's store. The Desktop launcher's first-run check now asks the store itself. For the human: the app running from before this tick still writes the JSON file; the first start of the new code imports it, so stop the old app before starting the new one. Free disk space read 0 bytes right after the gate and 431 MB a minute later; the loop's own test directories hold 12 MB. Evidence:

  ```
  $ npm run gate
  graph-lint: clean
  ℹ tests 88
  ℹ pass 88
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged; a transactional store that survives restarts and never merges two records is what lets an institution trust the audit trail and the data behind every decision. Next: T11 validation, errors and limits (rate limits, request size, sign-in attempts, crash-on-bad-input).
