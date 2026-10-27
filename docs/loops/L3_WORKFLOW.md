# L3 Workflow

Phase 3 of `roadmap/worldclassroadmap.md`, "Turn the graph into a real product". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: a user can visually build, validate, publish, execute, debug, and rerun a multi-step workflow without editing source code.`

Deciding rule, fixed before T1 starts: T0 to T8 are ticked, `npm run gate` exits 0, and the human's signoff line (T9), naming what was done in the UI, is in the Journal.

## Current state (read 2026-10-25; T0 re-verifies)

- `validateGraph` (`server/engine.ts#export function validateGraph(`) checks Start and End nodes, dangling edges and agent and condition config. It has no cycle check, while the roadmap endpoint claims one: `server.ts#Cycle detection, terminal verification, and unreachable node warnings`. The validate route checks the request body instead of the stored workflow: `server.ts#const result = validateGraph(nodes, edges);`.
- Execution follows only the first outgoing edge (`server/engine.ts#currentNode = version.nodes.find((n) => n.id === outgoingEdges[0].target);`). A condition picks its edge by label substring and otherwise falls back to the first edge: `server/engine.ts#e.label?.toLowerCase().includes(branchLabel.toLowerCase())`.
- Saving overwrites the active version in place: `server.ts#activeVer.nodes = nodes;`.
- Approving writes a fabricated outcome and skips the rest of the graph: `server.ts#cfoSignOff: 'GRANTED',`, `server.ts#finalLedgerPost: 'COMMITTED',`.
- Per-node records already exist: `server/storage.ts#export interface NodeExecutionRecord {`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh the citations earlier loops changed. Evidence: graph-lint exits 0.
- [ ] T1 Validation. needs: T0. Typed node and edge schemas; the validate route checks the stored version; invalid graphs are rejected before execution: a cycle without a bounded loop, a self-loop, an unreachable End, a condition without both branches, an unknown node type. The cycle claim becomes true or is removed. Evidence: one test per invalid case.
- [ ] T2 Branch semantics. needs: T1. Condition edges carry an explicit branch value instead of a label match; parallel branches run every outgoing edge and join; a bounded-loop node has a maximum iteration count. Evidence: tests: a missing branch is a validation error; both parallel branches run; the loop stops at its bound.
- [ ] T3 Immutable versions. needs: T1. Saving creates a draft; versions move through draft, validated, published and retired; executions and deployments pin a published version. Evidence: tests: editing a published version creates a new draft; an execution keeps its pinned version.
- [ ] T4 Approval resume. needs: T2. Approving resumes from the approval node's checkpoint and runs the remaining nodes; rejecting runs none; the fabricated outcome fields are removed. Evidence: tests for both decisions.
- [ ] T5 Node-level trace. needs: T4. Every node's input, output, latency and error is visible through the API and on the builder and observability screens. Evidence: an API test; the screens are checked by the human in T9, because browser automation would be a new dependency.
- [ ] T6 Replay and safe cancel. needs: T3. Rerun an execution with the same input on the same pinned version; cancel takes effect at the next node boundary. Evidence: tests.
- [ ] T7 Golden path v2. needs: T4, T5, T6. Through the API only: build, validate, publish, execute, inspect, rerun. Evidence: `npm test` exits 0 including it.
- [ ] T8 Independent check. needs: T7, T11. A different model, in at least 3 independent runs, applies the graph and approval attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. Includes building and running a workflow in the UI without editing source code. Evidence: the signoff line, naming what was done.
- [ ] T10 Users. needs: T0. Added in L1 T15. Only the bootstrapped admin can sign in today (`server/auth.ts#if (admin) admin.passwordHash = hashPassword(password);`), so no second person exists to check the first. An org admin adds a user to the org with a role, and removes one; the answer to an add carries a one-time setup code, shown once and stored as a hash, which the new user exchanges for a password of their own, hashed with scrypt as L1 T2 decided. Evidence: tests: an org admin adds a user who then signs in; any other role is refused; a removed user's session stops working.
- [ ] T11 Four-eyes approval. needs: T4, T10. Added in L1 T15, found in L1 T14 by two checker runs: the approve route checks only the role (`server.ts#if (res.locals.user.role !== requiredRole && res.locals.user.role !== 'org_admin') {`), so the user who started a run may decide its approval. A run records who started it, and that user may not decide its approval, the org admin included. Evidence: tests: the user who started a run gets 403 on its approval; another user holding the role decides it; a run started through a deployment key has no starter and is decided as before.

## Journal
