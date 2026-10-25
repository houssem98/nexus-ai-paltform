# L2 Runtime

Phase 2 of `roadmap/worldclassroadmap.md`, "Make agents genuinely execute". Needs L1. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: a real agent completes a task, produces inspectable events, survives an application restart, and reports failures honestly.` and `roadmap/worldclassroadmap.md#External side effects are not duplicated during recovery tests.`

Deciding rule, fixed before T2 starts: T0 to T10 are ticked, `npm run gate` exits 0, and the human's signoff line (T11) with the live smoke run's output is in the Journal.

## Current state (read 2026-10-25; T0 re-verifies)

- The model is called only when a key is set (`server/engine.ts#const ai = process.env.GEMINI_API_KEY`). On any error the engine returns a fabricated success (`server/engine.ts#applying robust fallback harness`, `server/engine.ts#Deterministic enterprise simulation harness`). Usage numbers are constants (`server/engine.ts#tokensUsed: 1450,`, `server/engine.ts#costUsd: 0.0042,`) and the reasoning trace is a fixed sentence (`server/engine.ts#Gemini 4 Argon High-Thinking reasoned over structured policies and verified compliance constraints.`).
- The model ids (`server/engine.ts#model: 'gemini-4-argon',`, `server/engine.ts#'gemini-3.8-flash'`) are UNVERIFIED: nobody has checked them against the provider.
- Workflows run inside the HTTP request (`server.ts#const executed = await runWorkflowExecution(executionId);`), so there is no job record, no worker, and nothing survives a restart.
- Cancel only flips a status: `server.ts#exec.status = 'cancelled';`.
- Tool nodes invent their results: `server/engine.ts#ERP-TX-`.
- A run that reaches the step cap (`server/engine.ts#const maxSteps = 25;`) is then marked completed (`server/engine.ts#if (execution.status === 'running') {`); the visited set (`server/engine.ts#const visited = new Set<string>();`) is written and never read.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh the citations that L0 and L1 changed. Evidence: graph-lint exits 0.
- [ ] T1 (human) Provider key. needs: none. Put a `GEMINI_API_KEY` in a local `.env` file, which git ignores; never paste it into chat, code or logs. Evidence: a Journal line saying the key is provided, without its value.
- [ ] T2 Provider truth. needs: T0, T1. One live call per configured model id; record the model name and usage metadata the provider returns, or the exact error. If an id does not exist, escalate the replacement. Save one response per model as a fixture, with no key in it, for offline tests. Evidence: the call output quoted in the Journal; an adapter contract test against the fixtures passes offline.
- [ ] T3 Honest failure. needs: T2. Remove the silent fallback; take usage and cost from the provider's metadata; simulated answers only in demo mode with `simulated: true`. Evidence: tests: an injected provider error ends the execution failed with that error; with demo mode off no response carries `simulated`.
- [ ] T4 Invocation protocol. needs: T3. A versioned request and response shape for agent calls, validated against the agent's schemas (`server/storage.ts#inputSchema: Record<string, any>;`). Evidence: tests: invalid input is rejected before the call; invalid output fails the node.
- [ ] T5 Durable execution. needs: T4. Execute returns an execution id; an in-process worker runs a persisted job; ordered events and a checkpoint per node are persisted; clients poll the execution. Update every consumer in src in the same task (I6). Evidence: tests: events are ordered and persisted; the execution shows progress before it completes.
- [ ] T6 Timeouts, retries, cancellation, idempotency. needs: T5. A timeout per node; bounded retries with backoff; cancel stops the next node from starting; side-effecting nodes carry an idempotency key so a retry or a recovery does not repeat the effect. Evidence: tests: cancel mid-run stops later nodes; a retried tool node performs its effect once.
- [ ] T7 Restart recovery. needs: T6. Kill the server process mid-run, start it again, and the run resumes from its last checkpoint without repeating side effects. Evidence: a test that spawns the server with `node:child_process`, kills it, restarts it, and asserts the final state and a single side effect.
- [ ] T8 Step cap honesty. needs: T5. A run that hits the cap ends failed with the reason; the visited set is used or removed. Evidence: a test with a cyclic graph.
- [ ] T9 Golden path v1. needs: T7. An API-level test of the first customer workflow (`roadmap/worldclassroadmap.md#Sell a concrete outcome`): ticket input, an agent draft from recorded provider fixtures, approval pause, approve, end. It joins `npm test` and must stay green in every later loop. Evidence: `npm test` exits 0 including it.
- [ ] T10 Independent check. needs: T3, T6, T7, T8, T9. A different model, in at least 3 independent runs, applies the runtime and approval attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T11 (human) Signoff. needs: T10. Includes approving the spend for one live smoke run of the golden path against the real provider. Evidence: the signoff line and the smoke run's output in the Journal.

## Journal
