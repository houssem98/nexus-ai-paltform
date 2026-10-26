# L5 Knowledge

Phase 5 of `roadmap/worldclassroadmap.md`, "Deliver useful enterprise data workflows". Needs L2. Budget in `docs/LOOP_GRAPH.md`; rules in `docs/LOOP_CONVENTIONS.md`.

Target: `roadmap/worldclassroadmap.md#Exit gate: users can retrieve relevant evidence from real documents, verify citations, and cannot retrieve content they are not authorized to see.`

Deciding rule, fixed before T1 starts: T0 to T9 are ticked, holdout recall@k is reported with n and is at or above the T1 baseline, `npm run gate` exits 0, and the human's signoff line (T10) is in the Journal.

## Current state (read 2026-10-25; T0 re-verifies)

- Ingestion splits text on blank lines: `server.ts#.split('\n\n')`. Re-indexing only updates a timestamp, while the audit text says vectors were rebuilt: `server.ts#VECTOR_INDEX_OPTIMIZED`, `server.ts#VECTOR_INDEX_FULL_REBUILD`.
- Search is a substring match over every tenant's documents with a constant score: `server.ts#for (const doc of state.knowledge) {`, `server.ts#relevanceScore: 0.94,`.
- The engine's knowledge node returns every chunk of one document, unranked (L0 T6 removed its constant score), and falls back to the first document in the store: `server/engine.ts#const matches = doc?.chunks.map((c) => ({`, `server/engine.ts#|| state.knowledge[0];`.
- Integration tests and syncs make no network call and report success, in demo mode only and marked simulated: `server.ts#statusMessage: 'Connection verified via authenticated TLS gateway',`. Since L0 T8 they no longer mark the connector connected, and a new connector starts disconnected: `server.ts#status: 'disconnected' as const,`.

## Tasks

- [ ] T0 Re-verify. needs: none. Run graph-lint and refresh the citations earlier loops changed. Evidence: graph-lint exits 0.
- [ ] T1 Retrieval test set first. needs: T0. Queries with labeled evidence (document id and span), split into an improvement set and a holdout the loop never tunes on; record the current search's recall@k on the holdout as the baseline. Evidence: the dataset file, and a test that computes and prints recall@k.
- [ ] T2 Ingestion. needs: T0. Stable chunk ids with character offsets, document versions on update, a re-index that actually rebuilds the index, and audit text that says what happened. Evidence: tests: re-ingesting identical content keeps chunk ids; an update creates a new version.
- [ ] T3 Ranked retrieval with permissions. needs: T1, T2. Keyword ranking with computed scores (BM25 or similar, no new dependency); the tenant and permission filter is part of the query, not of the UI. Evidence: holdout recall@k at or above the T1 baseline, reported with n; cross-tenant retrieval returns nothing.
- [ ] T4 Vectors only on measured need. needs: T3. If holdout recall@k stays below a threshold the human sets, escalate with the numbers before adding an embedding model or a vector store. Evidence: the numbers and the decision in the Journal.
- [ ] T5 Citations. needs: T3. Answers cite document id, version and offsets; a check confirms the cited span exists; the engine's knowledge node uses retrieval instead of the first document. Evidence: tests: a fabricated citation fails the check; a query about another tenant's document gets nothing.
- [ ] T6 Deletion and staleness. needs: T5. Deleted documents are never retrieved; updated documents are cited at their current version. Evidence: tests.
- [ ] T7 (human) First real integration. needs: T0. Pick the one connector the first customer workflow needs, for example the ticket source or outgoing email, and put its credentials in `.env`. Evidence: the decision line in the Journal, without credentials.
- [ ] T8 Real connector. needs: T7. One adapter that makes real calls through the L1 egress guard (`server/egress.ts#export async function assertSafeEgress(`), with timeouts and a health check that really calls; redirects are followed by hand with every hop checked by the guard, and the connection goes to the addresses the guard returned; a failed or disconnected connector is reported as failed. Evidence: tests against a local stub server, including a redirect to a private address that is refused, and one live smoke run approved by the human and quoted in the Journal.
- [ ] T9 Independent check. needs: T3, T5, T6, T8. A different model, in at least 3 independent runs, applies the retrieval and egress attacks. Evidence: findings quoted in the Journal; `npm run gate` exits 0.
- [ ] T10 (human) Signoff. needs: T9. Evidence: the signoff line in the Journal.

## Journal
