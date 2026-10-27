# L6 Pilot

Phase 6 of `roadmap/worldclassroadmap.md`, "Production pilot and monetization". Needs L4 and L5. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: at least one real customer completes a defined workflow end-to-end, can inspect the result, and is willing to continue using the product.` `roadmap/worldclassroadmap.md#Paid conversion is a goal to validate, not a promised outcome.`

Deciding rule, fixed before T1 starts: T0 to T9 are ticked and the human's exit line (T10) is in the Journal. The last three tasks are the human's; the loop stops and escalates when it reaches them.

## Current state (read 2026-10-25; T0 re-verifies)

- Production mode serves the built client (`server.ts#app.use(express.static(path.join(__dirname, 'dist')));`); nothing validates configuration at boot.
- Retention is stored and never enforced: `server.ts#settings.dataRetentionDays = Number(dataRetentionDays);`.
- Uptime and health figures are hardcoded: `server.ts#99.98% gateway uptime and cluster diagnostics`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh the citations earlier loops changed. Evidence: graph-lint exits 0.
- [ ] T1 Production configuration. needs: T0. Boot validates the required settings and refuses to start in production with demo mode on. Evidence: tests: a missing setting fails boot with a clear message; production with demo mode on refuses to start.
- [ ] T2 Backup and restore. needs: T0. A documented procedure, and a test that restores a backup into an empty directory and gets the same state. Evidence: the test.
- [ ] T3 Metering and quotas. needs: T0. Usage is counted from real execution records; exceeding a quota gets 429. Evidence: tests.
- [ ] T4 Retention. needs: T0. Records older than the configured number of days are removed on a schedule. Evidence: a test with an injected clock.
- [ ] T5 Health. needs: T0. A health endpoint reports whether the store is writable and the provider reachable, from real checks; hardcoded uptime text is removed. Evidence: tests with the store made read-only and the provider stubbed down.
- [ ] T6 Example workflow and onboarding. needs: T1. The first customer workflow ships as an example with its evaluation dataset, an onboarding guide and API documentation. Evidence: the golden path test passes on the example; graph-lint exits 0.
- [ ] T7 Independent check. needs: T1, T2, T3, T4, T5, T6, T11. A different model, in at least 3 independent runs, applies the full attack list. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T8 (human) Deploy. needs: T7. A versioned, monitored environment, which is outward-facing. Evidence: the deployment record in the Journal.
- [ ] T9 (human) Design partners. needs: T8. Recruit design partners, observe them doing real tasks, and record what blocked them. Evidence: notes in the Journal.
- [ ] T10 (human) Exit. needs: T9. A real customer completes the workflow, inspects the result, and wants to continue. Evidence: the exit line in the Journal.
- [ ] T11 Sign-in limit per client. needs: T1. Added in L1 T15 (S39): failed sign-ins are limited per account (`server/limits.ts#const MAX_FAILURES = 5;`), not per client, so one client may try many accounts. With the client address taken from the proxy T1 configures, failed sign-ins from one address are limited too. Evidence: test: repeated failed sign-ins for many accounts from one address get 429.

## Journal
