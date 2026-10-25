Goal: every claim Nexus makes about engine and security behavior is backed by a passing executable check, or is deleted. No test, no claim.

One iteration. Read docs/NEXUS_LEDGER.md first: Tasks, Conventions, Journal.

1. Health: `git status`, `npm run gate` verdict, iterations and spend used against Budget.
2. Stop check (Target, Budget, Stall, per Conventions). If any holds, write the Journal entry, say which, and do not schedule another tick.
3. Take the first unticked task whose `needs` are all ticked. Write its failing check first, then the minimum code. One task per tick.
4. Run the task's evidence command, then `npm run gate`. Tick `- [x]` only on exit 0, output quoted in the Journal.
5. Append a Journal entry: date, task, gate verdict, a Direction line (is the goal still the goal?), next task.
6. Escalate per Conventions instead of deciding. Next tick in 120s.
