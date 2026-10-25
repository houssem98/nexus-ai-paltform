# Nexus Ledger

Control document for `NEXUS_LOOP.md`. Global rules in `~/.claude/LOOP_SPEC.md` and `~/.claude/LOOP_STANDARD.md` win on conflict.

## Target

Every claim Nexus makes about engine and security behavior is backed by a passing executable check, or is deleted. That covers `docs/architecture.md` sections 2 to 5 and every `passed` / `verified` badge the UI shows.

Deciding rule, fixed before N1 starts and not edited after: the Target is met when N0 to N7 are ticked, `npm run gate` exits 0, the N8 checker found no counterexample, and the human signoff line exists in the Journal.

## Gate

`npm run gate` runs `tsc --noEmit`, `vite build`, then `scripts/gate-guard.mjs`. It starts with no tests; N1 adds them, and the gate may only grow from there. There are no UI tests, so a server change that alters a response shape is only caught by I5.

## Tasks

Evidence is an exit code, never an opinion. Paths and line numbers were read, not run.

- [ ] N0 baseline. needs nothing. Install dependencies (`bun.lock` is the lockfile), run `npm run gate`, record the verdict and `git rev-parse --short HEAD` in the Journal. A red baseline is a valid result. Evidence: the Journal entry.
- [ ] N1 test harness. needs N0. Use `node:test` through `tsx`, already a devDependency, so no new dependency. Add an `npm test` script that fails when zero tests ran, plus one real test: `validateGraph` (server/engine.ts:30) rejects a graph with no Start node. Tests must not write `data/nexus-store.json`; if `server/storage.ts` cannot take a store path, adding that is part of this task. Extend `gate` to run `npm test`. Evidence: `npm test` and `npm run gate` exit 0, `git status` shows the store untouched.
- [ ] N2 graph integrity. needs N1. A run that hits the step cap is reported `completed` today: `maxSteps = 25` at server/engine.ts:277 ends the loop and server/engine.ts:467 then marks any still-`running` execution `completed`; `visited` (server/engine.ts:275) is written and never read. A truncated run must end `failed` with a reason, and `validateGraph` must flag a cycle with no bounded exit, a self-loop, and nodes unreachable from Start. Evidence: tests for cyclic, self-loop, two Start nodes, dangling edge, unreachable End.
- [ ] N3 identity and tenancy. needs N1. `currentUserId`, `currentOrgId`, `currentWorkspaceId` are module globals (server.ts:20 to 34) overwritten by any request's `x-*` headers, so one client's context switch changes every other client's and any client can claim any user. Replace them with per-request context; accept an identity only for a user that exists and an org and workspace that user belongs to; every `:id` route filters by org. Real authentication stays out of scope (I6). Evidence: tests: two interleaved requests as different users never see each other's context; a user in org B gets 404 for org A's agent, workflow and execution by id; an unknown user header is rejected.
- [ ] N4 RBAC. needs N3. Roles are listed in docs/architecture.md section 4 and enforced nowhere. One permission table in one module, enforced on every mutating route. Evidence: a table-driven test of role by route class asserting the expected 200 or 403; a viewer cannot mutate.
- [ ] N5 approval gate. needs N2, N4. Approval stores `requiredRole` (server/engine.ts:373) and `POST /api/v1/executions/:id/approve` (server.ts:465) never checks it. It also accepts a decision on an execution that is not pending, and on approve it sets `completed` and writes a fabricated `cfoSignOff: 'GRANTED'` and `finalLedgerPost: 'COMMITTED'` (server.ts:479 to 488) without running the nodes after the approval node. Enforce the role, refuse non-pending with 409, resume downstream nodes on approve, run none on reject. Evidence: viewer approving gets 403; approving twice gets 409; approve records downstream `nodeExecutions`; reject records none.
- [ ] N6 egress guard. needs N1. docs/architecture.md section 5 claims SSRF prevention; the repo has no such code, only the string "SSRF loopback protection" in a roadmap badge (server.ts:1711). Write `assertSafeEgress(url)` as a pure function with an injectable resolver and call it wherever a configured URL can reach the network. If no route makes a real network call, delete the claim instead (I3). As of 2026-10-25 none does: no `fetch(`, `new URL(` or `http.request` in server.ts or server/, so this resolves to deletion unless a task adds real egress. Evidence: table tests blocking loopback, `localhost`, `[::1]`, `169.254.169.254`, RFC1918 ranges, decimal, hex and octal IP forms, `http://a@127.0.0.1`, non-http(s) schemes, a hostname resolving to a private address.
- [ ] N7 honest verifier. needs N2, N4, N5, N6. `GET /api/v1/system/self-test` (server.ts:1909 to 2010) returns hardcoded `status: 'passed'` and invented `latencyMs` for most suites, and its text asserts "zero cyclical deadlocks", "cryptographically chained", "mTLS" and "token bucket throttling" that nothing checks. The roadmap carries literal `status: 'verified'` badges (for example server.ts:1655, 1711, 1746, 1881). Compute each from a real check or remove it; delete every sentence no test backs. Evidence: a mutation test where `validateGraph` is forced to return `valid: true` makes self-test report failure; no literal `status: 'verified'` remains without a test id beside it.
- [ ] N8 independent check and signoff. needs N7. Run the checker (see Conventions): at least 3 independent runs, each an agent on a different model than the maker, each trying to produce a failing test from the attack list and beyond. Then `npm run gate` exits 0. The human writes the signoff line in the Journal; the loop never writes it. Evidence: the three checker reports quoted in the Journal, gate exit 0, signoff line present.

## Conventions

**Invariants**
- I1 No fake completion. A box is ticked only on exit 0 of its evidence command, output quoted in the Journal.
- I2 The maker does not grade itself. N8 runs on a different model.
- I3 No test, no claim. A status string is computed from a check or removed.
- I4 A gate may grow and may never shrink in the change that claims it green. Run `node scripts/gate-guard.mjs` before ticking. A legitimate removal is an escalation naming the assertion and why it no longer grades anything real.
- I5 Response shapes that `src/` reads stay stable (`src/lib/api.ts` and `src/App.tsx` consume them untyped) unless the same task updates every consumer.
- I6 No new infrastructure (database, queue, auth provider) without a failing test that needs it. The JSON store stays.
- I7 Tests never write `data/nexus-store.json`.
- I8 Do not commit or push. Leave changes in the working tree so the guard diffs against HEAD across the whole run.

**Stop**, checked every tick, all three:
- Target: the deciding rule above is met and `npm run gate` was run this tick.
- Budget: 20 iterations or $10 (read `/cost`), whichever comes first. Edit these numbers here to change them.
- Stall: 3 consecutive ticks with no verdict change and no new failure mode; or the same gate failing twice without new evidence; or a test weakened to get a pass; or a needed dependency unresolvable from the repo. Stall is neither fail nor done. Stop, write the Journal entry, escalate. Do not tick again.

**Escalate**: halt and ask, do not decide:
- push, deploy, publish, or anything outward-facing
- any file entering the repo that the loop did not write and has not read, including a new dependency
- `.env*`, `GEMINI_API_KEY`, or any credential
- spend above the Budget cap
- changing the schema of `data/nexus-store.json`
- removing or weakening any assertion
- anything unverifiable this tick

**Cadence**: 120s. The next iteration is the agent's own work (write test, write code, run gate), so nothing is being waited on. Do not use this for polling.

**Drift**: the prompt restates the goal every tick and each Journal entry carries a Direction line. Treat it as drift when the last 3 ticks only added checks for easy claims while N3 and N5 stay untouched, or when a badge was removed to turn the gate green without a stated reason.

**Judged steps**: only N8 involves a model's judgement. The checker is a different model from the maker, runs at least 3 times independently, and a finding counts only as a reproducible failing test. Cases beyond the attack list below are the holdout; the maker does not see them before the run.

**Reporting**: a failed gate is a real result. If a claim cannot be made true at reasonable cost, delete the claim and say so. If every remaining task is blocked, say the work is finished and recommend stopping.

**Checker attack list**
- graph: cycle with no exit, self-loop, two Start nodes, dangling edge, unreachable End, step cap reached
- approval: viewer approves a node needing `org_admin`; approve twice; approve a completed execution; reject then check no downstream node ran; approve then check downstream nodes ran
- tenancy: org B reads org A by id; spoofed `x-user-id`; two interleaved requests as different users
- egress: loopback, `localhost`, `[::1]`, `169.254.169.254`, RFC1918, decimal/hex/octal IPs, `a@127.0.0.1`, redirect to a private address, `file://`, `gopher://`
- thresholds: the invoice rule in server/engine.ts:203 at 25000, 25000.01, `"25000"`, negative, missing; a condition node comparing an `undefined` field (`Number(undefined)` is `NaN`)
- verifier: break `validateGraph`, then self-test must fail

## Journal

Append-only. One entry per tick: date, task, gate verdict, Direction line, next. If nothing changed, write "no change". The Target's signoff line goes here, written by the human.

- 2026-10-25 spec written, no gate run, N0 not started. Direction: goal set from reading server.ts and server/engine.ts. Next: N0.
