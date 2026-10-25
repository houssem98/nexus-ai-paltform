Nexus AI Platform: World-Class Product Roadmap
The objective is not to make Nexus look like Scale AI's GenAI Platform. It is to build a product that customers can trust with real work, that developers can use to build agents reliably, and that enterprises will pay to operate.

My recommendation is to turn Nexus into an enterprise AI agent platform with a visual workflow builder, a durable execution engine, measurable agent quality, secure knowledge access, and production-grade governance—while choosing one customer segment to win first.

The most important rule: build a smaller number of capabilities that demonstrably work before expanding the feature catalog. A working agent that completes a customer task, provides evidence, survives failures, and reports its true performance is more valuable than twenty polished screens backed by simulated data.
The product we should aim to build
Nexus Studio

Design agents and workflows visually, connect real tools, validate inputs and outputs, and version every change.

Nexus Runtime

Run real model and tool calls with durable jobs, checkpoints, retries, cancellation, permissions, and recoverable execution.

Nexus Evals & Observability

See exactly what each agent did, why it failed, how much it cost, and whether a new version is better.

Nexus Knowledge

Connect customer documents and data sources with permission-aware retrieval, citations, and traceable answers.

Nexus Enterprise

Identity, tenant isolation, audit trails, secrets, policy controls, usage limits, deployment management, and administrative oversight.

These are the target product modules, not a claim that the current repository already implements them.
1. Execution roadmap: 90 days to a credible product
This is an ambitious roadmap for a small team using AI coding tools. It is a delivery plan, not a guarantee that every phase will fit into 90 days.
Days 1–7
Foundation

Phase 0 — Establish the truth
Must do first
- Inventory every route, component, storage model, workflow node, integration, and execution path.
- Mark each capability REAL, PARTIAL, SIMULATED, BROKEN, or UNVERIFIED.
- Establish clean-install, build, type-check, and test baselines.
- Remove misleading success indicators from demo endpoints or label demo mode explicitly.
- Threat-model authentication, tenant isolation, secrets, and outbound tool calls.
Exit gate: a source-backed audit, reproducible baseline, prioritized issue list, and approved minimal implementation plan.



Days 8–21
Trust

Phase 1 — Secure the platform
- Implement real authentication and request-scoped identity.
- Enforce tenant and workspace permissions in every relevant read and write.
- Move shared platform state to transactional persistent storage.
- Add input validation, secrets management, rate limits, and secure error handling.
- Test cross-tenant reads, writes, execution, and identifier manipulation.
Exit gate: automated authorization tests prove that one tenant cannot access another tenant's protected resources. No known critical security issue is accepted for release.



Days 22–35
Runtime

Phase 2 — Make agents genuinely execute
- Define a versioned agent invocation and event protocol.
- Implement real model calls and real tool adapters.
- Persist tasks, events, state, and checkpoints separately.
- Add worker execution, timeouts, retries, cancellation, and idempotency.
- Capture inputs, outputs, model/provider, duration, token usage when available, and errors.
Exit gate: a real agent completes a task, produces inspectable events, survives an application restart, and reports failures honestly. External side effects are not duplicated during recovery tests.



Days 36–49
Workflow

Phase 3 — Turn the graph into a real product
- Build typed workflow nodes, edges, input/output schemas, and validation.
- Support agent, tool, condition, parallel branch, approval, and bounded-loop nodes.
- Create immutable workflow versions and draft-versus-published states.
- Show node-level status, inputs, outputs, latency, and errors.
- Add workflow replay, safe cancellation, and resumable execution.
Exit gate: a user can visually build, validate, publish, execute, debug, and rerun a multi-step workflow without editing source code.



Days 50–63
Quality

Phase 4 — Make quality measurable
- Build versioned evaluation datasets and repeatable test runs.
- Compare candidate and baseline agent versions on identical cases.
- Combine deterministic assertions, model-based graders, and human review.
- Track task success, correctness, evidence quality, latency, and cost.
- Add regression gates and a trace viewer that links failures to execution steps.
Exit gate: the evaluation system runs the actual candidate, scores its actual output, detects seeded failures, and blocks publication when required gates fail.



Days 64–75
Knowledge

Phase 5 — Deliver useful enterprise data workflows
- Implement document ingestion, parsing, chunking, indexing, and re-indexing.
- Add semantic retrieval and keyword search, with source and permission filtering.
- Preserve document identity, versions, and citation locations.
- Test retrieval recall, source correctness, access controls, and stale-document behavior.
- Add a small number of genuinely working integrations before expanding the catalog.
Exit gate: users can retrieve relevant evidence from real documents, verify citations, and cannot retrieve content they are not authorized to see.



Days 76–90
Customers

Phase 6 — Production pilot and monetization
- Deploy a versioned, monitored production environment.
- Add usage metering, quotas, audit records, backup and restore, and operational alerts.
- Create onboarding, example workflows, API documentation, and a working demo.
- Recruit design partners and observe them completing real tasks.
- Fix onboarding friction and reliability issues before expanding features.
Exit gate: at least one real customer completes a defined workflow end-to-end, can inspect the result, and is willing to continue using the product. Paid conversion is a goal to validate, not a promised outcome.



2. Build a harness that enforces the roadmap
Your harness and graph-of-loops should become the execution control system for this program—not merely a prompt that tells an AI coding agent what to do.
#chatgpt-mermaid-_r_2sv_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-_r_2sv_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_2sv_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-_r_2sv_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-_r_2sv_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-_r_2sv_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-_r_2sv_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-_r_2sv_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-_r_2sv_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-_r_2sv_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_2sv_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_2sv_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-_r_2sv_ p{margin:0;}#chatgpt-mermaid-_r_2sv_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-_r_2sv_ .label text,#chatgpt-mermaid-_r_2sv_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .node rect,#chatgpt-mermaid-_r_2sv_ .node circle,#chatgpt-mermaid-_r_2sv_ .node ellipse,#chatgpt-mermaid-_r_2sv_ .node polygon,#chatgpt-mermaid-_r_2sv_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .rough-node .label text,#chatgpt-mermaid-_r_2sv_ .node .label text,#chatgpt-mermaid-_r_2sv_ .image-shape .label,#chatgpt-mermaid-_r_2sv_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-_r_2sv_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .rough-node .label,#chatgpt-mermaid-_r_2sv_ .node .label,#chatgpt-mermaid-_r_2sv_ .image-shape .label,#chatgpt-mermaid-_r_2sv_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-_r_2sv_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-_r_2sv_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_2sv_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-_r_2sv_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-_r_2sv_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-_r_2sv_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-_r_2sv_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_2sv_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-_r_2sv_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-_r_2sv_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-_r_2sv_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-_r_2sv_ .icon-shape,#chatgpt-mermaid-_r_2sv_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-_r_2sv_ .icon-shape p,#chatgpt-mermaid-_r_2sv_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-_r_2sv_ .icon-shape .label rect,#chatgpt-mermaid-_r_2sv_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-_r_2sv_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-_r_2sv_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-_r_2sv_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node rect,#chatgpt-mermaid-_r_2sv_ [data-look="neo"].cluster rect,#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-_r_2sv_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-_r_2sv_-gradient);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-_r_2sv_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-_r_2sv_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_2sv_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-_r_2sv_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-_r_2sv_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-_r_2sv_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-_r_2sv_ .node tspan[font-weight="normal"],#chatgpt-mermaid-_r_2sv_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-_r_2sv_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .node rect,#chatgpt-mermaid-_r_2sv_ .node circle,#chatgpt-mermaid-_r_2sv_ .node ellipse,#chatgpt-mermaid-_r_2sv_ .node polygon,#chatgpt-mermaid-_r_2sv_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-_r_2sv_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-_r_2sv_ .node.mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-_r_2sv_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-_r_2sv_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-_r_2sv_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Pin repository commitDiscover code andrequirementsBuild evidence-backed gapmatrixSelect one bounded taskDefine acceptance testsImplement smallest safechangeRun focused testsFocused tests pass?Diagnose and repairRun regression, security, andbuild gatesAll mandatory gates pass?Independent code andbehavior reviewEvidence proves requirements?Record commit, artifacts,resultsMilestone complete?Release with known limitationsNoYesNoYesNoYesNoYes





Mandatory harness capabilities:
- Bounded loops: maximum retries, iteration budgets, and explicit stopping conditions.
- Machine-enforced gates: failed tests, missing artifacts, or unresolved critical security findings block release.
- Evidence lineage: every finding and completion claim points to a commit, file, test, or execution record.
- Independent verification: the reviewer must test the behavior rather than trust the implementation summary.
- Recovery: interrupted runs can resume from persisted state without duplicating completed side effects.
- Honest status: distinguish passed, failed, blocked, skipped, and not tested.
- Reproducibility: retain the commit, configuration, test results, and relevant tool/model versions.
Do not start by adding sophisticated multi-agent orchestration to the harness. First make one execution path deterministic, auditable, recoverable, and enforceable. Add parallel agents only where measured results justify the extra complexity.
3. What should make customers choose Nexus?
A platform competing with Scale needs a compelling initial customer outcome, not just feature parity.

My recommendation is to launch around AI workflow automation for technical and operations teams, with a narrow set of reliable workflows. This is a proposed positioning to validate through customer interviews, not a conclusion from market research.









Differentiator 1: Build and debug in one place

A developer can create an agent workflow, run it, inspect every step, reproduce a failure, and publish a new version without stitching together separate tools.











Differentiator 2: Prove quality before deployment

Every workflow version has real evaluation results, cost and latency measurements, and configurable release gates.











Differentiator 3: Trustworthy execution history

Customers can see what ran, what data was accessed, which tools were called, where failures occurred, and what the agent actually returned.



Your first customer offer
Sell a concrete outcome, such as a workflow that processes incoming support tickets, extracts relevant information from authorized company documents, drafts a response, and requests human approval before sending it.

The initial package should include:
- A ready-to-run example workflow.
- One or two real integrations.
- Execution history and error inspection.
- An evaluation dataset with visible pass/fail results.
- Clear usage and cost reporting.
- A guided onboarding experience.
This lets a prospective customer judge the product by the work it completes, rather than by the number of features listed on the website.
4. Measure whether the product is becoming world-class
Use these as proposed launch gates. Establish baselines first; do not claim a metric has been achieved until test evidence supports it.
Metric	Initial release requirement
Authentication and tenant isolation	All mandatory authorization tests pass
Simulated success paths	Zero unlabeled simulations in production mode
Execution durability	Restart and recovery tests pass
Evaluation correctness	Seeded wrong answers are detected by the configured checks
Workflow correctness	Invalid graphs are rejected before execution
Citation correctness	Citations resolve to the correct source and location
Regression	No unexplained critical regressions
Observability	Failed runs have enough trace data to diagnose the failure
Customer onboarding	A new user completes the main workflow without developer intervention
Product value	Pilot users confirm a real task is useful enough to repeat

For commercial traction, track activation, time to first successful workflow, weekly active teams, repeat usage, retention, support burden, and paid conversion. Set numerical targets only after establishing a credible baseline from real users.
5. Paste this master instruction into Kimi Build
Use this as the controlling prompt for the roadmap. It explicitly prevents the implementation agent from pretending that a UI, mock result, or placeholder constitutes a working feature.
Nexus AI Platform — Production-Grade Transformation Program
Mission
Transform the existing Nexus AI Platform repository into a secure, reliable, commercially useful enterprise AI agent platform. Improve the current implementation instead of replacing it wholesale. Use Scale AI's publicly documented GenAI platform and Agentex architecture as references, not as a reason to copy proprietary claims or reproduce screens without their underlying capabilities.
Non-negotiable engineering rules
1. Inspect the actual repository, branch, dependencies, routes, components, database, tests, workflows, deployment configuration, and runtime before changing code.
2. Establish the baseline build, type-check, tests, and current behavior. Report commands, results, failures, and unavailable tooling.
3. Classify every major capability as REAL, PARTIAL, SIMULATED, BROKEN, or UNVERIFIED, with file-level evidence.
4. Never claim a feature is implemented because a screen, interface, schema, stub, hardcoded result, or mock endpoint exists.
5. Never fabricate evaluation results, model metrics, successful tool responses, deployment outcomes, or test passes.
6. Preserve working features and avoid unnecessary rewrites. Make small, reviewable changes with explicit acceptance tests.
7. Never disable security controls or weaken tests to make a gate pass.
8. Keep secrets out of source code, logs, generated reports, and client-side bundles.
9. All identity and authorization decisions must be enforced server-side. Do not trust caller-supplied organization, workspace, or user headers as proof of identity.
10. Every task must finish with a truthful report of changed files, tests actually run, evidence, known limitations, and remaining risks.
Phase 0 — Audit and plan
Inspect the full repository and map:
- Frontend routes, product screens, state management, and API calls.
- Backend routes, middleware, authentication, authorization, and error handling.
- Persistence, migrations, transactions, tenant boundaries, and retention.
- Agent invocation, model providers, tool adapters, and workflow execution.
- Tasks, messages, events, state, checkpoints, traces, and recovery.
- Evaluation, knowledge retrieval, integrations, deployment, and governance.
- Tests, CI, Docker, environment configuration, and deployment scripts.
Create docs/roadmap/NEXUS_WORLD_CLASS_ROADMAP.md, docs/audit/CAPABILITY_MATRIX.md, docs/audit/SECURITY_FINDINGS.md, and docs/architecture/TARGET_ARCHITECTURE.md.

Each finding must include evidence and confidence. Do not make broad claims from files you did not inspect. Present the baseline and proposed minimal implementation sequence before starting broad changes.
Phase 1 — Security and data integrity
- Implement or verify real authentication.
- Use request-scoped identity and enforce organization/workspace authorization on every relevant operation.
- Replace unsafe shared mutable identity context.
- Use transactional persistence for shared multi-tenant state.
- Validate input schemas, permissions, resource ownership, and secret access.
- Add rate limits, secure outbound request controls, audit records, and safe errors.
- Add negative tests for cross-tenant reads, writes, executions, and identifier manipulation.
Acceptance: all mandatory authorization tests pass, and no known critical security issue is ignored or silently waived.
Phase 2 — Real agent runtime
- Define a versioned invocation protocol and typed input/output schemas.
- Implement genuine provider calls and real tool adapters.
- Persist task lifecycle, ordered events, execution state, and checkpoints.
- Add worker execution, timeouts, bounded retries, cancellation, idempotency, and recovery.
- Record actual output, errors, provider/model metadata, duration, and available usage/cost data.
- Clearly separate development simulations from production execution.
Acceptance: a real task executes, emits inspectable persisted events, survives restart, reports failure honestly, and does not duplicate protected side effects during recovery tests.
Phase 3 — Workflow graph and harness
- Support typed nodes and edges, validation, conditions, bounded loops, parallel branches, approval steps, and error handling.
- Version graphs immutably and distinguish draft, validated, published, and retired versions.
- Provide node-level inputs, outputs, traces, timing, and failure explanations.
- Implement bounded, recoverable harness loops with explicit budgets and stopping conditions.
- Enforce tests and acceptance gates mechanically; a failed gate must prevent completion.
- Preserve unresolved findings and record evidence lineage to commits, files, and tests.
Acceptance: users can build, validate, publish, execute, debug, cancel, and replay a multi-step workflow. Invalid graphs are rejected. Interrupted runs recover safely. The harness never reports success while mandatory gates remain failed or untested.
Phase 4 — Evaluation and observability
- Execute the real candidate agent against versioned datasets.
- Score actual outputs using deterministic checks, calibrated model graders, and human review where needed.
- Compare baseline and candidate versions.
- Measure task success, correctness, evidence quality, latency, usage, and cost.
- Add regression gates, traces, structured errors, and reproducible run artifacts.
Acceptance: seeded failures are detected, actual outputs are scored, results are repeatable within documented limits, and release gates can block a regression.
Phase 5 — Knowledge and integrations
- Implement document ingestion, parsing, chunking, indexing, retrieval, re-indexing, and deletion.
- Enforce permissions during retrieval, not merely in the UI.
- Preserve source identity, version, and citation locations.
- Add real connectors with secure credential handling, outbound request controls, health checks, timeouts, and honest error reporting.
- Validate retrieval quality using held-out queries and evidence labels.
Acceptance: retrieval returns relevant, authorized, source-grounded evidence. Citations resolve correctly. Failed or disconnected integrations are never presented as successful.
Phase 6 — Production and customer readiness
- Add deployment/version lifecycle, configuration validation, quotas, metering, backups, restore testing, alerts, and retention enforcement.
- Document supported deployment configurations, security boundaries, recovery procedures, and limitations.
- Build one polished example workflow and a guided onboarding path.
- Recruit pilot users, observe their real tasks, and prioritize improvements based on repeated usage and feedback.
Acceptance: a customer can independently onboard, execute the example workflow, inspect its result, understand usage, and repeat the workflow reliably.
Delivery protocol
Work in small phases. Before each phase, state its scope and acceptance tests. After implementation, run the relevant tests and the broader regression gates available in the repository. Do not claim unrun tests passed. Update the capability matrix and roadmap with evidence. Do not start the next major phase if a mandatory security or correctness gate remains failed.
First response required
Start with Phase 0 only. Inspect the repository, report the current state, provide the capability matrix and prioritized risks, establish test/build baselines, and propose the smallest safe first diff. Do not perform a broad rewrite before presenting the audit and implementation plan.




Final recommendation
Treat the first milestone as a trustworthy, genuinely executable workflow product, not a complete imitation of Scale's entire portfolio. Secure the foundation, make the harness enforce reality, deliver one excellent workflow, and use actual customer behavior to decide what to build next.

That sequence gives Nexus a credible path from a broad prototype to a product people can trust—and eventually pay for.