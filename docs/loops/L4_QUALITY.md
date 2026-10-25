# L4 Quality

Phase 4 of `roadmap/worldclassroadmap.md`, "Make quality measurable". Needs L3. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: the evaluation system runs the actual candidate, scores its actual output, detects seeded failures, and blocks publication when required gates fail.`

Deciding rule, fixed before T1 starts: T0 to T8 are ticked, `npm run gate` exits 0, and the human's signoff line (T9) is in the Journal.

## Current state (read 2026-10-25; T0 re-verifies)

- An evaluation run never executes the candidate. It copies the expected output into the actual output and reports 100%: `server.ts#actualOutput: c.expectedOutput,`, `server.ts#accuracyRate: 100,`. L0 T6 labels it simulated in the meantime.
- Cases already hold expected outputs, keywords and optional citations: `server/storage.ts#export interface EvaluationCase {`, `server/storage.ts#requiredCitations?: string[];`.
- Publishing a deployment checks no evaluation (`server.ts#app.post('/api/v1/deployments', (req: Request, res: Response) => {`), and the deploy-approval setting is stored and never read: `server.ts#state.settings.requireHumanApprovalForDeploy = requireHumanApprovalForDeploy;`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh the citations earlier loops changed. Evidence: graph-lint exits 0.
- [ ] T1 Run the candidate. needs: T0. Each case executes the target agent or workflow version through the L2 runtime and stores its real output. Evidence: a test with a stub provider whose output differs from the expected output, asserting the stored actual output is the stub's.
- [ ] T2 Deterministic scoring. needs: T1. Exact and structural comparison with the expected output, keyword checks and required citations; every rate is computed from case results. Evidence: tests for each check and each rate.
- [ ] T3 Seeded failures. needs: T2. A deliberately wrong candidate fails, including one that returns the right keywords with a wrong answer. Evidence: tests.
- [ ] T4 Baseline versus candidate. needs: T2. Versioned datasets; both versions run on identical cases; the report shows per-case differences, n, and the standard error of the accuracy, so a difference smaller than that error is not reported as an improvement. Evidence: tests on a fixed dataset.
- [ ] T5 Model graders. needs: T2. Optional graders run only with a configured judge model that differs from the candidate's model and n ≥ 3 trials, and they are never the only gate. Evidence: a test with a stub judge; a config without n is rejected.
- [ ] T6 Release gate. needs: T3. Publishing requires a passing evaluation of that exact version and honors the deploy-approval setting. Evidence: tests: a failing evaluation blocks publishing with 409; with the setting on, publishing waits for an approval.
- [ ] T7 Trace links. needs: T1. Each failed case links to its execution and to the failing node. Evidence: a test.
- [ ] T8 Independent check. needs: T3, T4, T6, T7. A different model, in at least 3 independent runs, applies the evaluation attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T9 (human) Signoff. needs: T8. Evidence: the signoff line in the Journal.

## Journal
