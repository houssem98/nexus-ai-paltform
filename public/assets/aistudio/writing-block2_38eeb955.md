# PROJECT: UNIVERSAL ENTERPRISE AI AGENT PLATFORM
## Full Product Roadmap, Technical Architecture, UI/UX Specification, and Implementation Plan

## 1. YOUR ROLE

Act as a principal software architect, senior full-stack engineer, AI infrastructure engineer, enterprise product designer, security engineer, and QA lead.

Build a serious, extensible, full-stack enterprise AI Agent Platform inspired by the capabilities and architectural patterns of Scale AI's GenAI Platform, Sim, LangGraph, and modern enterprise automation platforms.

Do not copy proprietary branding, source code, or protected designs. Create an original product, brand, interface, and implementation.

Your task is not to create a static marketing website or a collection of disconnected dashboard mockups. Build a working application with persistent data, authentication, a visual workflow builder, configurable agents, execution records, evaluation, integrations architecture, governance, and deployment management.

The initial deliverable is a functional proof of concept with a credible path to production.

## 2. PRODUCT VISION

Create a unified platform where organizations can:

1. Build AI agents visually, conversationally, and through code.
2. Design workflows with graph-based orchestration.
3. Connect agents to business data, APIs, tools, and knowledge bases.
4. Coordinate multiple specialized agents.
5. Configure models, prompts, context, memory, tools, and execution policies.
6. Test agents against datasets and expected results.
7. Evaluate correctness, groundedness, reliability, latency, and cost.
8. Deploy approved versions to APIs, chat interfaces, scheduled jobs, and events.
9. Monitor executions, failures, resource consumption, and quality.
10. Govern access, permissions, data handling, approvals, and audit trails.
11. Reuse approved agents, tools, workflow templates, and evaluation datasets across departments.
12. Support multiple organizations and isolated workspaces.

The product should eventually serve small businesses, enterprise teams, software developers, data teams, financial institutions, and regulated organizations.

## 3. PRODUCT PRINCIPLES

Follow these principles throughout implementation:

- Functional behavior over decorative mockups.
- Modular architecture over one giant component.
- Explicit workflow logic over uncontrolled agent loops.
- Verified integrations over fake connected-account indicators.
- Persistent database records over hardcoded sample data.
- Versioned and reproducible executions.
- Least-privilege access for every tool and integration.
- Human approval for consequential external actions.
- Model-provider independence.
- Evidence-based evaluation instead of relying on model self-assessment alone.
- Clear separation between prototype capabilities and production-ready capabilities.
- Responsive, accessible, polished user experience.
- No invented performance metrics, security certifications, customer logos, or successful test results.
- Never expose API keys or secrets in frontend code.
- Never execute arbitrary user-provided code in the main application process.

## 4. BRAND AND VISUAL DESIGN

Create an original enterprise technology brand. Use the temporary product name "Nexus AI Platform" until the project owner chooses a final name.

Visual direction:
- Premium enterprise software.
- Dark graphite or deep navy workspace with restrained electric-blue and violet accents.
- High information density without clutter.
- Clear typography and consistent spacing.
- Subtle transitions and useful interaction feedback.
- Clean tables, node graphs, charts, status indicators, and side panels.
- Excellent desktop experience, with responsive tablet and mobile layouts.
- Light/dark theme support if practical.
- Avoid generic AI landing-page aesthetics and excessive gradients.

Create a persistent application shell:
- Collapsible left sidebar.
- Organization and workspace switcher.
- Global search and command menu.
- Main content region.
- Contextual right-side inspector where useful.
- Notifications and user profile.
- Breadcrumb navigation.
- Consistent empty, loading, error, permission-denied, and success states.

## 5. APPLICATION NAVIGATION

Build these main sections.

### A. Home / Command Center
Show:
- Total agents and workflows.
- Active deployments.
- Recent executions.
- Success and failure rates calculated from actual stored execution records.
- Recent evaluation results.
- Estimated model cost, when real usage data is available.
- Pending approvals.
- Recent audit events.
- Quick actions: create agent, create workflow, connect integration, run evaluation.

For a fresh installation, display honest empty states and clearly labeled demonstration data if demo mode is enabled.

### B. Agent Studio
Allow users to:
- Create an agent from scratch or a template.
- Name and describe the agent.
- Assign its department and use case.
- Select a model provider and model.
- Configure system instructions.
- Configure tools and allowed actions.
- Add knowledge sources.
- Configure context and memory policies.
- Set maximum execution steps, timeouts, and token budgets.
- Define structured input and output schemas.
- Run interactive tests.
- View execution traces.
- Save drafts and create immutable versions.
- Compare versions.
- Publish or roll back versions subject to permissions.

Provide three authoring modes:
1. Visual configuration.
2. Natural-language-assisted generation of a draft configuration.
3. Advanced configuration for developers.

AI-generated configurations must be reviewed, validated, and tested before deployment.

### C. Visual Workflow Builder
Create an interactive graph editor with a canvas, draggable nodes, connecting edges, zoom, pan, minimap, undo/redo, and a configuration inspector.

Required node types:
- Start.
- End.
- AI agent.
- Model call.
- Tool/API call.
- Knowledge retrieval.
- Conditional branch.
- Router.
- Loop.
- Parallel execution.
- Join.
- Transform data.
- Validate output.
- Human approval.
- Wait/delay.
- Schedule or event trigger.
- Retry/error handler.
- Evaluation.
- Subworkflow.

Each node must have:
- Unique identifier.
- Type.
- Versioned configuration.
- Typed input and output schema.
- Connection rules.
- Validation status.
- Execution status.
- Timing and error details when executed.

Workflow editor capabilities:
- Connect and disconnect nodes.
- Prevent invalid connections.
- Detect missing required configuration.
- Detect unreachable nodes and invalid graph cycles.
- Display graph validation errors.
- Save drafts.
- Create workflow versions.
- Run test inputs.
- Inspect each node's inputs and outputs.
- Show successful, failed, skipped, and waiting states.
- Support cancellation and safe retries.
- Resume executions from checkpoints where supported by the runtime.

Do not treat a visually connected graph as proof of execution. The workflow must be validated and executed by the backend.

### D. Workflow Library
Include:
- My workflows.
- Shared workflows.
- Templates.
- Published workflows.
- Archived workflows.
- Search and filters.
- Version history.
- Import/export of a documented workflow JSON format.

Create example templates:
- Document analysis.
- Customer-support triage.
- Lead qualification.
- Research and reporting.
- Invoice data extraction.
- Internal knowledge assistant.
- Compliance document review.
- Data quality investigation.
- Financial research assistant.
- Multi-step approval process.

Templates must have editable configurations and working test inputs.

### E. Tools and Integrations
Create an integration catalog organized by category:
- Business communication.
- CRM.
- ERP.
- Documents and knowledge.
- Databases.
- Analytics and business intelligence.
- Project management.
- Developer tools.
- Finance and accounting.
- Identity and security.
- Custom APIs.
- Model providers.
- MCP-compatible tool servers.

For each integration show:
- Description.
- Available capabilities.
- Required permissions.
- Connection status.
- Setup instructions.
- Last successful test, if actually performed.
- Error state.
- Disconnect and credential-rotation controls.

Implement a real custom HTTP API integration for the prototype, with server-side credentials, URL and method validation, restricted network destinations, timeouts, response-size limits, and explicit authorization.

Create a provider-adapter architecture for future integrations. Do not show third-party integrations as connected unless a real connection has been established and verified.

MCP support should be modular. Validate tool schemas and apply authorization to each tool call. Treat tool descriptions and tool responses as untrusted data.

### F. Knowledge and Context Center
Create a centralized knowledge interface for:
- Uploaded documents.
- Document collections.
- Knowledge bases.
- Data-source connections.
- Indexing status.
- Retrieval tests.
- Source metadata.
- Document permissions.
- Deletion and re-indexing.
- Search results with source excerpts.

Support a practical initial document-ingestion path using files that can be safely parsed. Use chunking, metadata extraction, embeddings, and retrieval.

Design retrieval as a replaceable service supporting:
- Keyword search.
- Semantic search.
- Hybrid retrieval.
- Metadata filters.
- Reranking.
- Source-level permissions.
- Citation and provenance tracking.

Every retrieved passage should retain its document identifier and location information, such as page, section, or chunk identifier where available.

Implement a context assembly service that combines:
- System policies.
- Organization and workspace configuration.
- Workflow state.
- User request.
- Relevant retrieved evidence.
- Approved memory.
- Available tool descriptions.
- Output schema.
- Token and context budgets.

Prioritize relevant evidence, apply access control before retrieval results reach the model, and make source attribution inspectable.

Do not claim that a document has been indexed until ingestion and indexing have succeeded.

### G. Evaluation Lab
Build an evaluation workspace that supports:
- Evaluation datasets.
- Test cases.
- Expected answers or expected structured outputs.
- Ground-truth labels.
- Reference documents.
- Evaluation runs.
- Model and prompt comparisons.
- Workflow-version comparisons.
- Regression reports.
- Failure analysis.
- Exportable reports.

Metrics should include:
- Task completion rate.
- Schema validity.
- Factual correctness where ground truth is available.
- Evidence relevance.
- Citation correctness.
- Unsupported-claim rate.
- Tool-selection accuracy.
- Policy violation rate.
- Latency.
- Token usage.
- Cost when actual provider usage and pricing are available.
- Failure and retry rates.

Use deterministic tests wherever possible. Use independent evaluators or model-based judges only as supplementary measures, and validate them against labeled examples.

Every metric must have a documented calculation and a clear denominator. Never display invented quality scores.

Require an evaluation run before promoting a version to production when the organization's policy requires it.

### H. Observability and Execution Traces
Provide an execution explorer with:
- Execution ID.
- Organization and workflow version.
- Trigger type.
- Start and completion timestamps.
- Current status.
- Node-by-node trace.
- Tool invocations.
- Model calls.
- Retry and timeout events.
- Token usage and cost when available.
- Validation results.
- Approval events.
- Error details.
- Final structured output.

Allow filtering by agent, workflow, date, status, department, and environment.

Redact secrets and sensitive content from logs. Provide configurable retention and access controls.

Do not record hidden internal reasoning as an observability requirement. Record operational events, tool arguments after appropriate redaction, evidence references, structured decisions, and outputs necessary for debugging.

### I. Deployment Center
Support deployment lifecycle states:
- Draft.
- Validated.
- Tested.
- Approved.
- Published.
- Suspended.
- Rolled back.
- Archived.

Deployment targets:
- API endpoint.
- Embedded chat interface.
- Scheduled execution.
- Webhook/event trigger.
- Internal application integration.

Provide:
- Version selection.
- Environment selection.
- Input/output schema.
- Authentication requirements.
- Rate limits.
- Execution limits.
- Approval requirements.
- Deployment history.
- Health and failure indicators.
- Rollback controls.

For the prototype, implement at least one real authenticated execution API. If production infrastructure is not configured, clearly mark production deployment as not configured.

### J. Governance and Security
Implement:
- Organizations and workspaces.
- Role-based access control.
- Organization administrator.
- Workspace administrator.
- Builder.
- Operator.
- Evaluator.
- Viewer.
- Approval reviewer.
- Audit log.
- Integration credential management.
- Model allowlists.
- Tool permissions.
- Execution quotas.
- Data-retention settings.
- Deployment approvals.
- Version promotion permissions.

Use tenant-scoped database queries and authorization checks on the server for every protected operation.

Users must not gain access to another organization's data by modifying a URL, request body, object identifier, or workflow identifier.

Include an audit trail for:
- Authentication and access changes.
- Workflow creation and publication.
- Model and tool configuration changes.
- Integration connections.
- Credential rotation.
- Deployment and rollback.
- Approval decisions.
- Policy changes.
- Data deletion.
- Administrative actions.

Design for future SSO, SCIM, ABAC, and enterprise audit integrations without pretending these are already implemented.

## 6. BUSINESS DEPARTMENT SOLUTIONS

The platform must be general-purpose. Do not hardcode the entire system around a single department.

Provide configurable department workspaces with reusable agents, tools, datasets, workflows, and policies.

Create these initial template collections:

### Finance and Banking
- Financial document extraction.
- Financial report summarization.
- Budget variance explanation.
- Cash-flow analysis assistance.
- Invoice processing.
- Internal financial knowledge retrieval.
- Policy and compliance document comparison.
- Risk-review workflow with human approval.

All calculations must use validated code or deterministic tools where appropriate. Financial outputs must identify assumptions, source periods, currencies, units, and evidence. Do not imply that the platform provides regulated financial advice or autonomous approval of high-impact financial decisions.

### Cybersecurity and IT
- Alert summarization.
- Incident triage.
- Vulnerability report summarization.
- Security-policy lookup.
- Ticket classification.
- Change-request analysis.
- Defensive investigation assistance.

Require explicit authorization for any action affecting external systems or production infrastructure.

### Marketing
- Campaign brief generation.
- Content review.
- Market research.
- Campaign performance summarization.
- Brand-policy validation.
- Lead-enrichment workflow using authorized sources.

### Sales and CRM
- Lead qualification.
- CRM record summarization.
- Follow-up drafting.
- Account research.
- Pipeline analysis.
- Customer meeting preparation.

External messages and CRM mutations must use permissioned tools and approval policies where configured.

### HR
- Internal policy assistant.
- Job-description drafting.
- Onboarding checklist.
- Training-material creation.
- HR document search.

Apply sensitive-data controls. Do not build automated hiring, firing, or other consequential employment decisions based solely on AI output.

### Customer Support
- Ticket classification.
- Knowledge retrieval.
- Response drafting.
- Escalation routing.
- Case summarization.
- Quality review.

### Operations and Enterprise Intelligence
- Process-document analysis.
- SOP compliance checks.
- Supplier-document comparison.
- Business report generation.
- Competitor research using permitted sources.
- Cross-system reporting.

These are templates built on shared platform capabilities, not separate applications with duplicated runtimes.

## 7. TECHNICAL ARCHITECTURE

Choose a stack supported by the actual Kimi Build environment. Document any deviations.

Preferred architecture:

### Frontend
- React and TypeScript.
- A consistent component system.
- Accessible design tokens.
- A graph editor such as React Flow, if supported.
- Typed API client.
- Query and mutation state management.
- Form validation.
- Error boundaries.
- Unit and component tests.

### Backend
Prefer a modular API backend in TypeScript or Python, depending on the supported environment.

Organize it into distinct modules:
- Authentication.
- Organizations and workspaces.
- Agents.
- Workflow definitions.
- Workflow compiler and validator.
- Execution runtime.
- Model providers.
- Tool registry.
- Integration adapters.
- Context assembly.
- Knowledge ingestion and retrieval.
- Evaluation.
- Deployments.
- Governance.
- Audit.
- Observability.

### Database
Use PostgreSQL or the persistent relational database available in Kimi Build.

Use migrations and explicit constraints. Use JSON/JSONB for flexible, versioned configurations where appropriate, not as a substitute for all relational modeling.

Suggested tables:
- users
- organizations
- organization_memberships
- workspaces
- workspace_memberships
- roles
- permissions
- agents
- agent_versions
- workflows
- workflow_versions
- workflow_nodes or versioned graph definitions
- workflow_edges or versioned graph definitions
- executions
- execution_events
- node_executions
- model_providers
- tool_definitions
- integration_connections
- encrypted_credentials or secret references
- knowledge_sources
- documents
- document_chunks
- evaluation_datasets
- evaluation_cases
- evaluation_runs
- evaluation_results
- deployments
- approvals
- audit_events
- usage_records

Add appropriate tenant identifiers, foreign keys, indexes, uniqueness constraints, and deletion behavior.

For PostgreSQL, use row-level security where supported as defense in depth. Server-side authorization must still be enforced.

### Storage and retrieval
- Use persistent object storage for uploaded documents if available.
- Store file metadata in the database.
- Store embeddings in pgvector or a replaceable vector-store adapter.
- Keep document permissions attached to retrieval operations.
- Provide a local or mock embedding adapter only for clearly labeled development mode.

### Execution
Build a deterministic workflow interpreter for the initial supported node types.

A workflow execution should:
1. Authenticate and authorize the caller.
2. Load an immutable workflow version.
3. Validate inputs against the schema.
4. Create an execution record.
5. Initialize typed execution state.
6. Execute ready nodes according to graph dependencies.
7. Enforce node permissions, deadlines, retries, and resource limits.
8. Persist state transitions and execution events.
9. Pause for approval when required.
10. Validate the final output.
11. Store the result and terminal status.

For the prototype, a database-backed worker or queue may be sufficient. Avoid claiming durable distributed execution unless it has actually been implemented and tested.

Keep an interface for adopting a durable workflow engine such as Temporal or a graph orchestration framework such as LangGraph later. These systems are complementary options, not mandatory dependencies for the first prototype.

### Model-provider abstraction
Create a common provider interface for:
- Model discovery where supported.
- Text generation.
- Structured output.
- Tool calling where supported.
- Streaming where supported.
- Usage metadata.
- Timeout handling.
- Error normalization.

Support one real model provider first, then add others through adapters.

Never expose provider API keys to the browser. Do not claim universal provider compatibility before testing each adapter.

## 8. AGENT HARNESS ENGINEERING

Implement the agent harness as a bounded execution loop.

The harness is responsible for:
- Loading a specific agent version.
- Loading applicable policies.
- Building the model context.
- Checking allowed tools.
- Calling the selected model.
- Validating model-requested tool calls.
- Executing approved tools.
- Recording results.
- Rebuilding context as needed.
- Checking stop conditions.
- Validating the final output.

Define a typed run state containing:
- Run ID.
- Agent and version identifiers.
- User input.
- Current workflow state.
- Approved evidence references.
- Tool results.
- Step count.
- Token and time budgets.
- Approval state.
- Error state.
- Final output.

Enforce:
- Maximum steps.
- Maximum wall-clock time.
- Model-call timeout.
- Tool timeout.
- Maximum tool-result size.
- Maximum context size.
- Token and cost limits when supported.
- Cancellation.
- Explicit stop conditions.
- Retry limits.

Do not allow the model to override system policies, permissions, execution budgets, or approval requirements.

## 9. GRAPH ORCHESTRATION AND MULTI-AGENT WORKFLOWS

Implement workflows as validated, versioned directed graphs.

Each node should have a documented contract, typed input/output, error behavior, and retry policy.

Support:
- Sequential execution.
- Conditional routing.
- Bounded loops.
- Parallel branches.
- Join operations.
- Subworkflows.
- Human approval.
- Error handling.
- Checkpointing where supported.

Multi-agent patterns:
- Supervisor delegating to specialized agents.
- Parallel specialists with a structured merge step.
- Sequential handoffs.
- Specialist review followed by independent validation.
- Human-in-the-loop decisions.

Do not add agents merely to increase complexity. Use multiple agents only when delegation creates measurable value.

Protect against infinite cycles, unbounded recursion, runaway parallelism, and excessive model spending.

## 10. SECURITY AND THREAT MODEL

Implement security as a cross-cutting platform requirement.

### Authentication
Use the platform's supported secure authentication system. Never create a fake login that grants access based only on frontend state.

Use secure session handling and appropriate password/session protections when managing credentials directly.

### Authorization
Authorize every server-side request using organization membership, role, workspace, resource ownership, and action permissions.

### Secret handling
- Keep secrets server-side.
- Encrypt stored integration credentials.
- Use a managed secret store where available.
- Never return secret values in API responses.
- Redact secrets from logs.
- Support rotation and revocation.

### Prompt injection
Treat user input, retrieved documents, emails, web pages, tool descriptions, and tool responses as untrusted.

Separate instructions from data. Apply authorization outside the model. Never rely on a prompt alone to enforce permissions.

### Tool safety
- Use explicit tool allowlists.
- Validate arguments against schemas.
- Enforce per-tool permissions.
- Restrict network destinations.
- Block private, loopback, and cloud-metadata network targets unless explicitly required and safely controlled.
- Prevent server-side request forgery.
- Add request timeouts and response limits.
- Require approval for consequential actions.
- Use idempotency keys for retryable mutations when supported.

### Sandboxing
Do not execute user-supplied Python, shell, or arbitrary code inside the primary application process.

If code execution is introduced, use an isolated sandbox with constrained resources, restricted network access, and no inherited application secrets.

### Data protection
- Minimize sensitive data collection.
- Apply document-level permissions before retrieval.
- Redact sensitive data where appropriate.
- Support retention policies.
- Audit administrative actions.
- Document backup and deletion behavior.

Create a security test suite covering cross-tenant access, permission escalation, unauthorized tool calls, prompt injection, credential leakage, unsafe URL handling, and replayed mutations.

## 11. API DESIGN

Implement a consistent versioned API.

Suggested endpoints:

Authentication and organization:
- GET /api/v1/me
- GET /api/v1/organizations
- POST /api/v1/organizations
- GET /api/v1/workspaces
- POST /api/v1/workspaces

Agents:
- GET /api/v1/agents
- POST /api/v1/agents
- GET /api/v1/agents/:id
- POST /api/v1/agents/:id/versions
- POST /api/v1/agents/:id/test

Workflows:
- GET /api/v1/workflows
- POST /api/v1/workflows
- GET /api/v1/workflows/:id
- POST /api/v1/workflows/:id/validate
- POST /api/v1/workflows/:id/versions
- POST /api/v1/workflows/:id/test

Executions:
- POST /api/v1/workflows/:id/execute
- GET /api/v1/executions
- GET /api/v1/executions/:id
- POST /api/v1/executions/:id/cancel
- POST /api/v1/executions/:id/approve

Knowledge:
- GET /api/v1/knowledge-sources
- POST /api/v1/knowledge-sources
- POST /api/v1/documents
- GET /api/v1/documents/:id
- POST /api/v1/knowledge-sources/:id/reindex

Evaluation:
- GET /api/v1/evaluation/datasets
- POST /api/v1/evaluation/datasets
- POST /api/v1/evaluation/runs
- GET /api/v1/evaluation/runs/:id

Deployments:
- GET /api/v1/deployments
- POST /api/v1/deployments
- POST /api/v1/deployments/:id/rollback

Governance:
- GET /api/v1/audit-events
- GET /api/v1/approvals
- POST /api/v1/approvals/:id/decision

These are target routes, not claims about existing implementation. Adjust route naming to the chosen framework, document the final API, and implement authorization and validation for every protected endpoint.

Use pagination, consistent error responses, input validation, rate limits, and request IDs.

## 12. USER EXPERIENCE AND FUNCTIONAL DETAILS

Every primary interface must be connected to real application state.

Examples:
- Saving an agent persists the configuration.
- Creating a workflow persists a versioned graph.
- Running a workflow creates an execution record.
- Failed nodes show actual errors.
- A published workflow invokes the configured execution path.
- Evaluation results are stored and can be reopened.
- Integration status reflects an actual connection test.
- Permissions affect both visible controls and backend authorization.
- Search filters real records.
- Deleting a resource follows documented retention and dependency rules.
- A rollback selects a known prior version.

Provide:
- Useful empty states.
- Loading indicators.
- Validation messages.
- Retry controls where safe.
- Confirmation for destructive actions.
- Unsaved-change warnings.
- Accessible keyboard navigation.
- Clear success and failure notifications.

Do not leave primary buttons inert. If a capability is not yet implemented, label it as unavailable or planned instead of pretending it works.

## 13. DEMO MODE

Provide an optional demonstration workspace with realistic synthetic data.

Include:
- Three example departments.
- Five example agents.
- Three workflows with different graph patterns.
- One document collection.
- One evaluation dataset.
- Sample execution traces.
- A handful of synthetic audit events.

Mark all synthetic data as demo data. Do not represent synthetic metrics as real customer performance.

The user should be able to inspect a workflow, modify its nodes, run a supported demonstration, and see execution results.

Never use fake provider credentials. Without a configured model provider, use a deterministic mock adapter that clearly identifies its output as simulated.

## 14. TESTING AND QUALITY ASSURANCE

Build automated tests alongside the features.

### Unit tests
- Graph validation.
- Input/output schemas.
- Permission checks.
- Context assembly.
- Budget enforcement.
- Retry policies.
- Provider error normalization.
- Evaluation metric calculations.

### Integration tests
- Authentication.
- Organization isolation.
- Agent CRUD.
- Workflow persistence.
- Workflow execution.
- Approval handling.
- Document ingestion.
- Retrieval permissions.
- Integration credential handling.
- Evaluation run persistence.
- Deployment lifecycle.

### End-to-end tests
- Sign in.
- Create an agent.
- Configure a supported model or mock provider.
- Create a workflow.
- Validate and run it.
- Inspect the execution trace.
- Create an evaluation dataset.
- Run an evaluation.
- Review results.
- Publish a test deployment.
- Verify that an unauthorized user cannot access another tenant's resources.

### Security tests
- Cross-tenant ID manipulation.
- Role escalation.
- Unauthorized API calls.
- Secret exposure.
- Prompt-injection attempts.
- Invalid tool arguments.
- SSRF protections.
- Unsafe file upload.
- Replay and duplicate mutation behavior.
- Rate-limit enforcement.

### Release gates
Do not mark a phase complete until:
1. The feature exists.
2. The frontend is connected to the backend.
3. Data persists where expected.
4. Authorization is tested.
5. Error states are handled.
6. Automated tests pass.
7. Known limitations are documented.

Report actual test results. Do not fabricate test execution, coverage, benchmarks, or security verification.

## 15. IMPLEMENTATION ROADMAP

Build in the following phases. Complete and verify each phase before advancing.

### Phase 0 — Environment and architecture
- Inspect the available Kimi Build runtime.
- Confirm supported backend, database, storage, and deployment features.
- Select the stack.
- Create architecture documentation.
- Define design tokens and navigation.
- Establish development and demo modes.
- Create the initial data model and migrations.
- Add error handling and test infrastructure.

Deliverable: application shell, documented architecture, persistent database connection, initial migration, and runnable preview.

### Phase 1 — Foundation and multi-tenancy
- Implement authentication.
- Create organizations and workspaces.
- Implement membership and roles.
- Add tenant-scoped authorization.
- Add audit events.
- Build dashboard, navigation, and empty states.
- Create demo workspace.
- Add cross-tenant security tests.

Deliverable: users can sign in, access their workspace, and manage isolated resources.

### Phase 2 — Agent Studio
- Implement agent creation and editing.
- Add versioned configuration.
- Add model-provider adapter interface.
- Implement one real provider if credentials and runtime support exist.
- Add a clearly labeled mock provider.
- Add input/output schemas.
- Add tools configuration and limits.
- Implement interactive test runs.
- Persist outputs and trace metadata.

Deliverable: users can create and test a basic agent with real or clearly simulated execution.

### Phase 3 — Workflow builder
- Build the graph editor.
- Implement node and edge persistence.
- Add graph validation.
- Add the workflow interpreter.
- Implement start, end, agent, condition, transform, tool, validation, and bounded-loop nodes.
- Persist execution and node events.
- Add failure handling and cancellation.
- Implement a test execution view.

Deliverable: at least one multi-step workflow can be created visually, validated, executed, and inspected.

### Phase 4 — Execution reliability
- Add timeouts and retry policies.
- Add step and resource limits.
- Add idempotency where appropriate.
- Add checkpoints where supported.
- Add queue/worker execution if the environment permits.
- Add stuck-run detection and safe recovery.
- Add concurrency limits.
- Add execution lifecycle tests.

Deliverable: bounded, observable execution with documented recovery behavior.

### Phase 5 — Knowledge and context
- Add document upload.
- Validate file types and size.
- Implement parsing and chunking.
- Store document metadata.
- Add embedding and retrieval adapters.
- Implement retrieval tests.
- Implement context assembly.
- Enforce document permissions.
- Add citations and evidence references.
- Add deletion and re-indexing behavior.

Deliverable: a knowledge-grounded workflow that returns inspectable source references when relevant evidence is retrieved.

### Phase 6 — Integrations and tool execution
- Create the tool registry.
- Define tool schemas and permission contracts.
- Implement a safe custom API connector.
- Add connection testing.
- Add server-side secret handling.
- Add timeouts, quotas, and network restrictions.
- Add MCP adapter support if feasible.
- Add tool-call traces.
- Test unauthorized and malformed tool calls.

Deliverable: a workflow can call a configured and authorized external tool without exposing credentials.

### Phase 7 — Evaluation Lab
- Create datasets and test cases.
- Add reference answers and expected schemas.
- Implement deterministic evaluation metrics.
- Add evidence and citation checks.
- Add model and version comparisons.
- Add regression reports.
- Persist evaluation runs.
- Add a promotion gate based on configurable thresholds.

Deliverable: users can evaluate a workflow version and inspect why test cases passed or failed.

### Phase 8 — Deployment Center
- Implement deployment records and states.
- Add API-key or supported service authentication.
- Publish an immutable workflow version.
- Create an authenticated execution endpoint.
- Add request validation and rate limits.
- Add suspension and rollback.
- Add deployment health and failure indicators.
- Add deployment audit events.

Deliverable: an approved workflow version can be invoked through a secured API in the supported environment.

### Phase 9 — Governance and enterprise controls
- Complete role and permission administration.
- Add tool and model allowlists.
- Add configurable approval requirements.
- Add retention controls.
- Add credential rotation and revocation.
- Add audit filtering and export.
- Add quotas and usage accounting.
- Add enterprise extension points for SSO and SCIM.
- Perform a security review.

Deliverable: an administrable platform with documented security boundaries and tested authorization.

### Phase 10 — Production readiness
- Configure production secrets.
- Configure TLS and trusted origins.
- Add database backups and restore testing.
- Configure durable file storage.
- Add health checks and structured logs.
- Add monitoring and alerting.
- Add database and worker scaling plans.
- Add deployment rollback.
- Run load, regression, and security tests.
- Create an incident-response and recovery guide.
- Document data retention and deletion.
- Complete the production readiness checklist.

Deliverable: a release candidate with explicit evidence for each readiness requirement.

## 16. SUGGESTED PROJECT STRUCTURE

Use a structure appropriate to the selected framework. A possible modular structure is:

apps/
  web/
  api/
  worker/

packages/
  shared-types/
  schemas/
  ui/
  workflow-definition/
  agent-runtime/
  provider-adapters/
  tool-registry/
  context-engine/
  retrieval/
  evaluation/
  policy-engine/
  observability/
  testing/

database/
  migrations/
  seeds/

docs/
  architecture.md
  data-model.md
  api.md
  threat-model.md
  deployment.md
  testing.md
  limitations.md

tests/
  unit/
  integration/
  e2e/
  security/

Do not create empty folders merely to make the repository look complete. Every implemented module must have a defined responsibility and actual code.

## 17. ACCEPTANCE CRITERIA FOR THE FIRST USABLE PROTOTYPE

The prototype is acceptable only if a user can:

1. Sign in through a real supported authentication flow.
2. Create or enter an isolated workspace.
3. Create and save an agent.
4. Configure a model or explicitly select a mock provider.
5. Create a visual workflow containing at least three connected node types.
6. Validate the workflow and see actionable errors.
7. Execute the workflow.
8. Inspect persisted execution and node-level results.
9. Upload a supported document and complete ingestion.
10. Retrieve relevant evidence with source references.
11. Create an evaluation dataset and run it.
12. Inspect evaluation results.
13. Publish a supported test deployment.
14. Invoke that deployment through an authenticated API.
15. View audit events for important actions.
16. Verify that unauthorized users cannot access another tenant's resources.
17. Restart the supported runtime without losing persisted application records.
18. See honest errors when a provider, connector, or background worker is unavailable.

If any criterion is blocked by the environment, identify the exact limitation and provide the next implementation step. Do not silently substitute a fake feature.

## 18. DOCUMENTATION AND FINAL HANDOFF

Maintain these documents throughout development:
- Product requirements.
- System architecture.
- Database schema.
- API reference.
- Workflow JSON specification.
- Agent configuration specification.
- Provider adapter contract.
- Tool permission contract.
- Threat model.
- Evaluation methodology.
- Deployment guide.
- Backup and recovery guide.
- Known limitations.
- Testing report.
- Production readiness checklist.

At the end of every phase, report:
1. What was implemented.
2. Which files changed.
3. Which database migrations were added.
4. Which tests were executed.
5. The actual pass/fail results.
6. Which features were tested manually.
7. Which integrations are genuinely connected.
8. What remains incomplete.
9. Any security risks or technical debt.
10. The next phase.

## 19. ENGINEERING RULES FOR KIMI

Work incrementally.

First inspect the environment and produce the architecture plan. Then implement Phase 0 and Phase 1. Do not attempt to build all ten phases in one generation pass.

After each phase:
- Run the available tests.
- Fix the failures caused by your changes.
- Verify persistence and the main user flow.
- Inspect the UI at desktop and mobile sizes.
- Check server-side authorization.
- Update the documentation.
- Summarize the exact completion status.

Reuse existing working code instead of replacing it unnecessarily. Preserve successful behavior. Avoid unnecessary dependencies and oversized abstractions.

Do not claim to have tested a feature if you have not actually run the test. Do not claim production readiness because a preview renders successfully.

If a technical decision depends on an unsupported capability, explain the constraint and choose a maintainable alternative.

## 20. FIRST TASK — START NOW

Begin with Phase 0.

A. Inspect the available Kimi Build capabilities and existing project state.

B. State the proposed frontend, backend, database, authentication, storage, and execution architecture.

C. Identify which features can be implemented directly in the environment and which require external services or credentials.

D. Create the project shell, design system, database foundation, migration approach, and initial documentation.

E. Implement Phase 1 only after the foundation is runnable.

F. Verify the application in the live preview. Test real interactions and persistent storage.

G. Report completion using evidence from the actual project.

Do not stop at a written plan. Start building the first working phase, then continue iteratively through the roadmap.

The ultimate objective is a reusable enterprise AI platform in which agents, workflows, data sources, tools, evaluations, policies, and deployments share one consistent execution and governance architecture.