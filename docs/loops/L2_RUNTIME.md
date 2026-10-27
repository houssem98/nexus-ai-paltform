# L2 Runtime

Phase 2 of `roadmap/worldclassroadmap.md`, "Make agents genuinely execute". Needs L1. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: a real agent completes a task, produces inspectable events, survives an application restart, and reports failures honestly.` and `roadmap/worldclassroadmap.md#External side effects are not duplicated during recovery tests.`

Deciding rule, fixed before T2 starts: T0 to T10 are ticked, `npm run gate` exits 0, and the human's signoff line (T11) with the live smoke run's output is in the Journal.

## Current state (read 2026-10-25, re-verified in T0 on 2026-10-27)

- The model is called only when a key is set (`server/engine.ts#const ai = process.env.GEMINI_API_KEY`). Since L0 T6 a provider error fails the node outside demo mode (`server/engine.ts#if (!settingsOf(state, params.orgId).demoMode) throw err;`), and so does a missing key (`server/engine.ts#No model provider answered, and simulated agent answers run only in demo mode.`); in demo mode both still end in an invented answer marked simulated (`server/engine.ts#applying robust fallback harness`, `server/engine.ts#Deterministic enterprise simulation harness`). A real answer still reports constant usage (`server/engine.ts#tokensUsed: 1450,`, `server/engine.ts#costUsd: 0.0042,`) and a fixed reasoning trace (`server/engine.ts#Gemini 4 Argon High-Thinking reasoned over structured policies and verified compliance constraints.`), and a reply with no JSON in it, an empty one included, gains a `status: 'SUCCESS'` the provider never sent (`server/engine.ts#output: parsed || { response: rawText, status: 'SUCCESS' },`).
- The model ids (`server/engine.ts#model: 'gemini-4-argon',`, `server/engine.ts#'gemini-3.8-flash'`) are UNVERIFIED: nobody has checked them against the provider. The agent version's own model is never asked for: a workflow run always takes the thinking path (`server/engine.ts#useHighThinking: true,`), and the other path names its model in code (`server/engine.ts#model: 'gemini-3.8-flash',`).
- Workflows run inside the HTTP request (`server.ts#const executed = await runWorkflowExecution(executionId);`), so there is no job record, no worker, and nothing survives a restart.
- Cancel only flips a status (`server.ts#exec.status = 'cancelled';`), which the engine never reads; since L1 T13 cancelling a finished run answers 409 (`server.ts#if (found && ['completed', 'failed', 'cancelled'].includes(found.status)) {`).
- Tool nodes invent their results (`server/engine.ts#ERP-TX-`); since L0 T6 they and transform nodes run only in demo mode, marked simulated (`server/engine.ts#function simulatedStep<T extends object>(`), so outside it a run that reaches one fails.
- A run that reaches the step cap (`server/engine.ts#const maxSteps = 25;`) or a node with no outgoing edge (`server/engine.ts#if (outgoingEdges.length === 0) {`) is then marked completed (`server/engine.ts#if (execution.status === 'running') {`); the visited set (`server/engine.ts#const visited = new Set<string>();`) is written and never read, so a cycle calls its agent again on every lap until the cap (S17, S31 in `docs/audit/SECURITY_FINDINGS.md`).

## Tasks

- [x] T0 Re-verify. needs: none. Run graph-lint and refresh the citations that L0 and L1 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Provider key. needs: none. Put a `GEMINI_API_KEY` in a local `.env` file, which git ignores; never paste it into chat, code or logs. Evidence: a Journal line saying the key is provided, without its value.
- [ ] T2 Provider truth. needs: T0, T1, T13. One live call per configured model id; record the model name and usage metadata the provider returns, or the exact error. If an id does not exist, escalate the replacement. Save one response per model as a fixture, with no key in it, for offline tests. Evidence: the call output quoted in the Journal; an adapter contract test against the fixtures passes offline.
- [ ] T3 Honest failure. needs: T2. Take usage and cost from the provider's metadata, and the reasoning trace from the provider or not at all; never add a `status: 'SUCCESS'` the provider did not send (both handed over by L0 T8); simulated answers only in demo mode with `simulated: true`, as since L0 T6. Evidence: tests: an injected provider error ends the execution failed with that error; with demo mode off no response carries `simulated`; an empty provider reply fails the node; usage, cost and trace match the recorded provider response.
- [ ] T4 Invocation protocol. needs: T3. A versioned request and response shape for agent calls, validated against the agent's schemas (`server/storage.ts#inputSchema: Record<string, any>;`); the call asks for the model the agent's version names, which today is ignored (handed over by L0 T8). Evidence: tests: invalid input is rejected before the call; invalid output fails the node; the provider is asked for the model the agent's version names.
- [ ] T5 Durable execution. needs: T4. Execute returns an execution id; an in-process worker runs a persisted job; ordered events and a checkpoint per node are persisted; clients poll the execution. Update every consumer in src in the same task (I6). Evidence: tests: events are ordered and persisted; the execution shows progress before it completes.
- [ ] T6 Timeouts, retries, cancellation, idempotency. needs: T5. A timeout per node; bounded retries with backoff; cancel stops the next node from starting; side-effecting nodes carry an idempotency key so a retry or a recovery does not repeat the effect. Evidence: tests: cancel mid-run stops later nodes; a retried tool node performs its effect once.
- [ ] T7 Restart recovery. needs: T6. Kill the server process mid-run, start it again, and the run resumes from its last checkpoint without repeating side effects. Evidence: a test that spawns the server with `node:child_process`, kills it, restarts it, and asserts the final state and a single side effect.
- [ ] T8 Early stops. needs: T5. A run ends failed with the reason, never completed, when it reaches the step cap, a node with no outgoing edge, or a node it already ran; reading the visited set catches the last, so a cycle calls its agent once. Until L3 T2 adds bounded loops no graph needs a node twice: the engine follows one path (`server/engine.ts#currentNode = version.nodes.find((n) => n.id === outgoingEdges[0].target);`), and both seed workflows are acyclic (`server/storage.ts#source: 'n_tool_erp_commit', target: 'n_end'`, `server/storage.ts#source: 'ns5', target: 'ns6'`). Handed over by L1 (S17, S31 in `docs/audit/SECURITY_FINDINGS.md`). Evidence: tests: a cycle ends the run failed at its first repeated node and calls its agent once; a run that reaches a node with no outgoing edge ends failed, not completed; a run that reaches the step cap ends failed with the reason.
- [ ] T9 Golden path v1. needs: T7. An API-level test of the first customer workflow (`roadmap/worldclassroadmap.md#Sell a concrete outcome`): ticket input, an agent draft from recorded provider fixtures, approval pause, approve, end. It joins `npm test` and must stay green in every later loop. Evidence: `npm test` exits 0 including it.
- [ ] T10 Independent check. needs: T3, T6, T7, T8, T9, T12. A different model, in at least 3 independent runs, applies the runtime and approval attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T11 (human) Signoff. needs: T10. Includes approving the spend for one live smoke run of the golden path against the real provider. Evidence: the signoff line and the smoke run's output in the Journal.
- [ ] T12 Run audit. needs: T5. Added in L1 T15 (S32): a workflow run started through its route writes an audit record (`server.ts#action: 'WORKFLOW_EXECUTED',`), while deployment runs and test-invokes write none. Every run, whichever route starts it, writes one audit record naming its trigger: the session user, or the deployment for a call made with its key. Evidence: test: a run started through each route writes one audit record naming its trigger.
- [x] T13 Key loading. needs: none. Found after T0, while preparing T1: `server.ts` imports the engine (`server.ts#import { validateGraph, runWorkflowExecution, executeAgentDirectly } from './server/engine';`), which reads the key as its module loads (`server/engine.ts#const ai = process.env.GEMINI_API_KEY`), before `server.ts` loads `.env` (`server.ts#dotenv.config();`). A key kept only in `.env`, where T1 puts it, therefore never reaches the engine. Load `.env` before any server module. Evidence: test: a key kept only in .env reaches the engine.

## Journal

- 2026-10-27 · L2/T0 · started T0
- 2026-10-27 · L2/T0 · passed · gate green · commit see `git log --grep "loop(L2/T0)"` · Every current-state claim was re-read against the code. Two were stale since L0 T6: outside demo mode a provider error or a missing key now fails the node, and tool and transform nodes run only in demo mode, marked simulated. The section now says so, adds L1 T13's 409 on cancelling a finished run, and names three things the old text missed: the invented `SUCCESS`, the ignored model choice, and that a dead end is also stored completed. Of the items L0 and L1 handed to L2, usage and cost (T3), cancel (T6), a killed run (T7) and run audit (T12) were in their tasks; five were not. T8 tested only the step cap, while S31's dead end and S17's repeated agent calls were also given to it; and L0 T8's canned trace, invented `SUCCESS` (T3) and ignored model choice (T4) were in no task. `server/security-findings.test.ts` now checks every `Test: L<n> T<n>:` line of a finding against that loop's task, not only L1's. S17, S31 and S32 gained their L2 test lines, and the test failed first: `S17: L2 T8 does not name the test "a cycle ends the run failed at its first repeated node and calls its agent once"`. T8 now ends a run failed at the cap, at a dead end, or at a repeated node, by reading the visited set. T3 and T4 name the handed-over items, each with a test, and `docs/architecture/TARGET_ARCHITECTURE.md` follows T8. Evidence:

  ```
  $ node --import tsx --test server/security-findings.test.ts   (before T8 named the tests)
  ✖ every test a finding names, in any loop, is named word for word by that loop's task
    AssertionError [ERR_ASSERTION]: S17: L2 T8 does not name the test "a cycle ends the run failed at its first repeated node and calls its agent once"
  $ node scripts/graph-lint.mjs
  graph-lint: 15 docs · 641 citations (110 file, 0 line range, 525 literal, 6 planned)
  graph-lint: clean
  graph-lint exit 0
  $ npm run gate
  ℹ tests 117
  ℹ pass 117
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged. L2 must make agents really execute, and every early stop and invented field that L0 and L1 left open now has a named test in the task that closes it. Next: T1 (human), the provider key. T2 to T12 all wait on it, and L3 and L5 wait on L2, so the loop stops here and escalates.
- 2026-10-27 · L2/T13 · started T13
- 2026-10-27 · L2/T13 · passed · gate green · commit see `git log --grep "loop(L2/T13)"` · `server.ts` imported the engine before it called `dotenv.config()`, and the engine builds its provider client as its module loads, so a key kept only in `.env` never reached it. Outside demo mode every agent call would still have failed with "No model provider answered"; in demo mode it would have fallen back to simulated answers. `server.ts` now loads `.env` with its first import, `import 'dotenv/config'`. `server/env.test.ts` writes a `.env` holding a fake key into a temporary directory, removes the variable from the environment, imports the server, and asks the engine whether it has a client. It failed first: `false !== true`. The engine exports `providerConfigured` for that test, and the test calls no provider. Evidence:

  ```
  $ node --import tsx --test server/env.test.ts   (before the fix)
  ✖ a key kept only in .env reaches the engine
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    false !== true
  $ node --import tsx --test server/env.test.ts
  ✔ a key kept only in .env reaches the engine
  $ npm run gate
  graph-lint: 15 docs · 641 citations (110 file, 0 line range, 525 literal, 6 planned)
  graph-lint: clean
  ℹ tests 118
  ℹ pass 118
  ℹ fail 0
  gate-guard: clean · HEAD..working tree
  gate exit 0
  ```

  Direction: goal unchanged. Before this fix, the key the human is asked for would have gone unused by the running app; now T1 does what it says. Next: T1 (human), the provider key; T2 waits on it.
