# L1 Trust

Phase 1 of `roadmap/worldclassroadmap.md`, "Secure the platform". Needs L0. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: automated authorization tests prove that one tenant cannot access another tenant's protected resources.` and `roadmap/worldclassroadmap.md#No known critical security issue is accepted for release.`

Deciding rule, fixed before T1 starts: T0 to T14 are ticked, the T1 coverage table has no pending rows, `npm run gate` exits 0, and the human's signoff line (T15) is in the Journal.

## Current state (read 2026-10-25, re-verified in T0 on 2026-10-26)

- Identity lives in process-wide variables that any request overwrites: `server.ts#let currentUserId = 'usr_admin';`, `server.ts#if (reqUser) currentUserId = reqUser;`. The client sends whatever identity it likes: `src/lib/api.ts#'x-user-id': this.userId,`.
- Routes that read or change other tenants' data, because they never compare the org: `server.ts#res.json({ integrations: state.integrations });`, `server.ts#res.json({ evaluations: { ...state.evaluations, runs } });`, `server.ts#res.json({ deployments: state.deployments.filter((d) => state.settings.demoMode || !d.simulated) });`, `server.ts#res.json({ auditLogs: visible.slice(0, 50) });`, `server.ts#res.json({ approvals: state.approvals });`, `server.ts#for (const doc of state.knowledge) {`, `server.ts#const idx = state.knowledge.findIndex((k) => k.id === req.params.id);`, `server.ts#const exec = state.executions.find((e) => e.id === req.params.id);`, `server.ts#const existing = state.agents.find((a) => a.id === req.params.id);`. Integrations have no tenant field at all: `server/storage.ts#export interface ToolIntegration {`.
- Deployment keys are returned by the unfiltered list above, generated with `server.ts#const randomHex = Math.random().toString(36).substring(2, 10);` or `server.ts#nx_live_ft_`, and compared with `server.ts#token !== deployment.apiKey`. `server.ts#/api/v1/deployments/:id/test-invoke` runs a deployment with no key at all.
- Roles are defined (`server/storage.ts#role: 'org_admin'`) and nothing checks them. An approval records whoever the global variable names: `server.ts#approval.decidedBy = currentUserId;`.
- Persistence rewrote the whole file in place, only logged a failed write, and replaced an unreadable file at boot with seed data, until T8 (see its Journal entry): now `server/storage.ts#fs.renameSync(tmp, DATA_FILE);`, `server/storage.ts#this.state = this.loadState();`, `server/storage.ts#Never replace a damaged store with seed data`.
- Stored and never enforced: `server.ts#rateLimitPerMinute: Number(rateLimitPerMinute) || 120,`. Body size limit: `server.ts#app.use(express.json({ limit: '10mb' }));`.
- No outbound HTTP call exists in `server.ts` or the server directory (searched for fetch, new URL, http.request and https.request on 2026-10-25 and again on 2026-10-26). Connector URLs are user-supplied: `server.ts#baseUrl: baseUrl || 'https://api.internal.enterprise/v1',`.
- Audit export covers every tenant and quotes cells without neutralizing formulas: `server.ts#nexus_audit_events.csv`.

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint, refresh every citation here that L0 changed, and add a task for each finding in `docs/audit/SECURITY_FINDINGS.md` (new) that no task below covers. Adding tasks is allowed; removing one is an escalation. Evidence: graph-lint exits 0.
- [x] T1 Two-tenant fixture. needs: T0. Two orgs with one user per role in each, a helper that calls any route as a given user, and a coverage table listing every route as covered or `pending:T<n>`; a test fails when a route registered in `server.ts` is missing from the table. Evidence: `npm test` exits 0.
- [ ] T2 (human) Authentication method. needs: T0. Choose how users sign in. Recommendation: server-side sessions in an HttpOnly cookie, passwords hashed with scrypt from `node:crypto`, no new dependency; OIDC later if a pilot customer needs it. Evidence: the decision line in the Journal.
- [ ] T3 Request-scoped identity. needs: T1, T2. Replace the globals (`server.ts#let currentUserId = 'usr_admin';`) with identity resolved per request from the session, stop trusting identity headers (`src/lib/api.ts#'x-user-id': this.userId,`), and limit context switching (`server.ts#app.post('/api/v1/auth/switch-context'`) to the user's own memberships. Evidence: tests: an unauthenticated request gets 401; two interleaved requests as different users each see their own context; switching into a foreign org gets 403. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S36: an unknown user gets 401, and the me route lists only the caller's org.
- [ ] T4 Tenant enforcement. needs: T3. Every read and write filters by the caller's org and workspace, including every route in the current-state list; integrations gain an org field. Evidence: the T1 coverage table has no pending rows and every cross-tenant read, write, execute, duplicate and export test passes. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S6: no list route returns another org's records; S7: org B reading, changing, deleting, executing or duplicating org A's resources by id gets 404; S8: a knowledge search as org B returns none of org A's chunks; S9: running org A's agent or knowledge collection as org B gets 404; S10: org B cannot list or delete org A's integration; S38: a deployment response carries no knowledge document text.
- [ ] T5 RBAC. needs: T3. One permission table for the six roles (`server/storage.ts#role: 'org_admin'`), checked on every mutating route. Evidence: a table-driven test of role by route asserting 2xx or 403. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S4: a table of role by route returns 2xx or 403 as the permission table says.
- [ ] T6 Approval enforcement. needs: T5. A decision requires the node's role (`server/engine.ts#waitingForRole: node.config.requiredRole || 'workspace_admin',`), records the session user, and a decision on a non-pending approval gets 409. Resuming the workflow after approval is L3 T4. Evidence: tests for a missing role (403), a second decision (409), and the recorded decider.
- [ ] T7 Deployment keys. needs: T4. Keys come from `node:crypto` random bytes, are stored as hashes, shown once at creation, never returned by the list, and compared in constant time; test-invoke requires an authorized session. Evidence: tests: the list holds no key material; a wrong key gets 401; test-invoke without a session gets 401. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S11: the deployment list holds no key material; S13: a new key has 32 bytes from node:crypto randomBytes; S14: a stored deployment holds a key hash, not the key; S15: key verification compares hashes with timingSafeEqual; S16: executing a suspended deployment gets 403; S28: the dev server does not serve the data store or the server source (passes since L0 T8).
- [x] T8 Store integrity. needs: T0. Write to a temporary file and rename it; a failed write fails the request; an unreadable store at boot stops the server with a clear error and leaves the file untouched. Evidence: tests: a simulated crash mid-write leaves the previous state readable; a corrupt store makes boot fail without modifying the file; a write error returns 5xx.
- [ ] T9 (human) Storage decision. needs: T8. Phase 1 asks for transactional storage (`roadmap/worldclassroadmap.md#Move shared platform state to transactional persistent storage.`). Options: keep the atomic JSON file, or move to `node:sqlite`, which the installed Node v25.8.1 provides (checked on 2026-10-25 by loading it with require). Also decide whether `data/nexus-store.json` stays tracked by git. Evidence: the decision lines in the Journal.
- [ ] T10 Transactional store. needs: T9. Implement the T9 choice. Evidence: tests: two interleaved mutating requests lose no update; state survives a restart; the suite never touches `data/nexus-store.json`.
- [ ] T11 Validation, errors, limits. needs: T4. Validate request bodies against schemas; error responses carry no stack traces or internals; enforce the deployment rate limit; justify or lower the body size limit. Evidence: tests: an invalid body gets 400 without internals; one call over the limit gets 429. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S17: one call over the rate limit gets 429; S29: a malformed dataset or graph fails its request with 4xx and the server keeps answering; S30: an invoice without a numeric, non-negative amount is refused before it runs; S33: agent output cannot overwrite the workflow input; S35: an invalid deployment status gets 400 and changes nothing; S37: a request body over the limit gets 413.
- [ ] T12 Egress guard. needs: T0. A pure function `assertSafeEgress(url, resolve)` with an injectable resolver, to be wired into connectors in L5 T8, since no outbound call exists yet. Evidence: table tests blocking every egress case in the attack list of `docs/LOOP_CONVENTIONS.md`. Finding tests (`docs/audit/SECURITY_FINDINGS.md`): S19: assertSafeEgress blocks every egress case in the attack list.
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
