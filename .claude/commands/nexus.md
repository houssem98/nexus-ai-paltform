---
description: run one iteration of NEXUS_LOOP.md
---
<!-- generated from NEXUS_LOOP.md · regenerate: node ~/.claude/scripts/loop-prompt.mjs nexus --install -->
Goal: Nexus becomes a product customers can trust with real work. Every capability it shows is backed by a passing executable check, or is labeled simulated, or is removed. No test, no claim.

One iteration. Read docs/LOOP_GRAPH.md (driver rules), then docs/LOOP_CONVENTIONS.md, then the active loop's ledger.

1. Health: `git status`, the `npm run gate` verdict, and the active loop's ticks and spend against its budget.
2. Pick the active loop and task by the graph's driver rules. Stop check per Conventions: Target, Budget, Stall. If one holds, write the Journal entry, say which, and do not schedule another tick.
3. Write `started T<n>` in the Journal. Write the task's failing check first, then the smallest change that passes it. One task per tick.
4. Run the task's Evidence command, then `npm run gate`. Tick the task only on exit 0, with the output quoted in the Journal. Commit locally per Conventions; never push.
5. Finish the Journal entry: status, gate, commit, what happened, a Direction line, the next task.
6. Escalate per Conventions instead of deciding anything on that list. Next tick in 120 seconds.
