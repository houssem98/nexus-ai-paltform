# Loop Conventions

Read every tick together with the active ledger. The global rules in `~/.claude/LOOP_SPEC.md` and `~/.claude/LOOP_STANDARD.md` win on conflict.

## Invariants

- I1 No fake completion. Tick a task only when its Evidence command exited 0 this tick and the output is quoted in the Journal. Code that looks right is not evidence.
- I2 The maker does not grade itself. Independent-check tasks run on a different model than the maker, at least 3 times, and a finding counts only as a reproducible failing test.
- I3 No test, no claim. Any status, score, or success message the product shows is computed by code a test covers, or it is labeled `simulated: true` and served only in demo mode, or it is removed.
- I4 A gate may grow and never shrinks in the change that claims it green. `node scripts/gate-guard.mjs` runs before every commit. Removing or weakening an assertion is an escalation that names the assertion and why it no longer grades anything real.
- I5 Cite what you claim. Every statement about current code in a doc or ledger cites `path#literal` copied from a file read this tick, or a whole `path`. Never write a citation you did not just read. graph-lint must pass.
- I6 Response shapes that `src/` reads stay compatible unless the same task updates every consumer; `src/lib/api.ts` and the components use them untyped.
- I7 No new dependency or infrastructure without a failing test that needs it and the human's approval. `node:` built-in modules are not new dependencies.
- I8 Tests never write `data/nexus-store.json`; git tracks it.
- I9 Secrets never enter the repo, logs, reports, or the client bundle.
- I10 Status words are passed, failed, blocked, skipped, not tested, and nothing else (`roadmap/worldclassroadmap.md#Honest status: distinguish passed, failed, blocked, skipped, and not tested.`).
- I11 Smallest safe change: improve the code in place, no rewrites (`roadmap/worldclassroadmap.md#Preserve working features and avoid unnecessary rewrites.`).

## Gate

`npm run gate` runs graph-lint, the type-check, the build, and gate-guard; tests join it in L0 T2. Until the gate is first fully green (L0 T1), a task may be ticked when the gate fails only with failures recorded in the L0 T0 baseline and no more of them. L0 cannot close until the gate is fully green, and after that every tick needs it green.

## Commits

After a task is ticked, stage only the files that task changed, commit locally with the message `loop(L<n>/T<n>): <what changed>`, and put the short hash in the Journal entry. Never push. Each claim then traces to a commit (`roadmap/worldclassroadmap.md#Evidence lineage`).

## Recovery

Each tick starts from disk: the ledger and git. Write `started T<n>` in the Journal before changing code. If a tick finds a `started` line with no result and the working tree has changes, finish or revert only the files that task touched, then continue. Any other uncommitted change the loop did not write is an escalation.

## Stop, checked every tick

- Target: the active loop's signoff task is ticked and the gate passed this tick. The program's target is L6 ticked.
- Budget: the active loop's budget in `docs/LOOP_GRAPH.md`.
- Stall: 3 consecutive ticks with no verdict change and no new failure mode; the same gate failing twice without new evidence; a test weakened to get a pass; a dependency the repo cannot provide. Stall is neither failure nor done. Stop, write the Journal entry, escalate, and do not schedule another tick.

## Escalate: halt and ask, do not decide

- push, deploy, publish, or any call to an external service other than the configured model provider inside an approved task
- any file entering the repo that the loop did not write and has not read
- a new dependency, service, or infrastructure component
- credentials: `.env*`, `GEMINI_API_KEY`, any token or key
- spend above the active loop's cap
- deleting a product feature or a screen
- anything legally consequential, including compliance wording (SOC2, HIPAA, ISO, FedRAMP)
- removing or weakening an assertion
- anything unverifiable this tick

## Cadence

120 seconds between ticks, because the next tick is the agent's own work. Not for polling.

## Drift

The prompt restates the goal every tick and each Journal entry ends with a Direction line. It is drift when ticks keep choosing easy tasks while a blocking one waits, when a claim is deleted only to turn the gate green, or when work starts on a feature no ledger task names.

## Judged steps

Prefer checks with exit codes. Where a model must judge (independent checks, model graders in L4), state the judge model, which differs from the maker, and n ≥ 3 trials. One judge call is not a stop condition. Cases the checker invents beyond the attack list are the holdout.

## Reporting

A failed gate is a real result. If a claim cannot be made true at reasonable cost, delete or label it and say so. If every remaining task is blocked, say the work is finished for now and recommend stopping.

## Writing journal entries

`- YYYY-MM-DD · L<n>/T<n> · <passed|failed|blocked|skipped|not tested> · gate <green | red: what> · commit <hash | none> · <what happened, one line> · Direction: <is the goal still the goal?> · Next: <task>`

## Attack list for independent checks

- identity: spoofed `x-user-id` header; two interleaved requests as different users; context switch into a foreign org
- tenancy: org B reads, updates, deletes, executes, duplicates and exports org A's resources by id, on every route
- keys: list deployments as another tenant; reuse a revoked key; key comparison timing
- graph: cycle with no exit, self-loop, two Start nodes, dangling edge, unreachable End, step cap reached, condition with no matching edge
- approval: approver without `requiredRole`; approve twice; approve a completed execution; reject, then check nothing downstream ran
- persistence: kill during a write; corrupt store at boot; two concurrent mutations
- runtime: provider error, timeout, malformed provider output; cancel mid-run; restart mid-run; retry of a side-effecting node
- egress: loopback, `localhost`, `[::1]`, `169.254.169.254`, RFC1918, decimal/hex/octal IPs, `http://a@127.0.0.1`, redirect to a private address, `file://`, `gopher://`
- thresholds: the invoice rule at 25000, 25000.01, `"25000"`, negative, missing; a condition comparing an undefined field
- evaluation: a candidate that returns the expected output for one case only; a wrong answer containing the right keywords
- retrieval: a query for another tenant's document; a deleted document; an updated document cited at its old version
- honesty: any number on a screen that no test computes
