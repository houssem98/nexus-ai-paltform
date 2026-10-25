# Nexus Scale GenAI Platform: World-Class Interactive Verification & Studio Elevation Plan

A platform-wide interactive verification suite and functional audit across all eleven studios, ensuring every action button triggers verified live state mutations, realistic execution feedback, and zero dead clicks.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and interactive decisions were confirmed during the Phase 1 clarification interview:
> - **Platform-Wide Verification Experience**: An interactive live self-test runner widget docked into the platform header and Command Center that programmatically exercises and validates all module action buttons and API endpoints live.
> - **Execution Depth & Feedback**: Action buttons transition through realistic async states (settling within 100–250ms), produce live state mutations saved to disk, and trigger non-intrusive notifications with contextual error recovery.
> - **Scope & Depth**: Uniform high-polish upgrade across all eleven studios (Model Customization, Data Foundry, SEAL Red-Teaming, Workflow Builder, Agent Studio, Knowledge Center, Integrations Catalog, Evaluation Lab, Observability, Deployment Gateway, and Governance).

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades every interactive element in the Nexus GenAI platform into a production-grade action. It adds an interactive **Live Self-Test Runner** modal/widget that sweeps across all 11 studio domains (verifying 40+ distinct button interactions, API routes, and state transitions in real time with visual pass/fail/running telemetry), while systematically hardening and expanding every button across the platform with realistic async execution, responsive feedback, and persistent state mutations.
- **Target Audience / Persona**: Enterprise AI platform engineers, MLOps specialists, safety evaluators, and system architects who need a reliable, fully reactive console without mock stubs or dead clicks.
- **Key Value**: Guarantees 100% button interactivity and end-to-end functionality, transforming theoretical UI buttons into tangible actions with real-time feedback, mutation validation, and verifiable system health.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Platform Self-Test Suite**:
   - The user opens the **System Verifier** via a top bar button ("Verify Platform") or keyboard shortcut (`Cmd+Shift+V`).
   - A high-density test matrix runs a live sequential or parallel sweep across all 11 studios:
     - *Model Customization*: Hyperparameter validation, training job trigger, checkpoint download, and gateway deployment.
     - *Data Foundry*: Dataset generation, pairwise rubric scoring, RLHF reward export.
     - *SEAL Safety*: Prompt red-teaming probe, guardrail toggle mutation, OWASP audit report generation.
     - *Workflow Builder*: Canvas node execution, run-all pipeline execution, layout auto-format, step rollback.
     - *Agent Studio*: Agent prompt testing, tool toggling, parameter tuning, memory wipe, agent duplication.
     - *Knowledge Center*: Document ingestion simulation, chunk inspection, hybrid semantic query test.
     - *Integrations*: Connection test ping, credential update, sync cadence toggle.
     - *Evaluation Lab*: Benchmark run initiation, rubric comparison, regression alert ack.
     - *Observability*: Filter preset toggle, trace replay, trace waterfall drill-down, export logs.
     - *Deployment Gateway*: Live endpoint test invoke, traffic splitting slider, canary rollback.
     - *Governance*: Access approval signoff, policy compliance check, export immutable audit bundle.
   - Each test displays live duration, HTTP/state status, and detailed payload verification with a "Re-run Single" button.

2. **Per-Studio Button Polish & Feedback**:
   - Every primary action button (e.g., "Run All Nodes", "Trigger LoRA Job", "Execute Red Team Suite", "Invoke Endpoint", "Export JSONL") transitions through disabled loading states with spinner feedback, updates local and server state, and displays non-intrusive notification feedback.
   - Destructive actions (e.g., delete agent, wipe memory, revoke key) present confirmation dialogs with clear explanations.

### Visual Identity & Theme

- **Aesthetic Direction**: High-density enterprise dark console adhering to SaaS & Dashboard guidelines. Deep slate background (`#0B0F19`), surface cards (`#111827`), hairline borders (`#1F2937`), and emerald accents for nominal state.
- **Anti-Slop Discipline**: Strict zero-pill rules for static metadata (using unboxed text with `·` separators), no decorative pulsating dots on static text, no comment headers (`// 01`), and no roleplay jargon on buttons.
- **Typography & Tabular Numerals**: Display headings in Plus Jakarta Sans / Inter; all metrics, timestamps, latency numbers, and token counters rendered with `font-mono tabular-nums`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real Server Endpoints vs. Synthetic Client Verifiers**
  - *Chosen Approach*: Implement explicit verification endpoints in `server.ts` alongside client-side test runners that actually mutate and verify test resources, cleaning up or archiving test runs automatically.
  - *Why*: Provides genuine round-trip verification, proving both the React UI handlers and Express backend storage mechanisms work under load.
- **Decision 2: Universal Toast Notification & Feedback System**
  - *Chosen Approach*: A lightweight, high-performance in-app toast stack that renders at the top-right of the viewport with type-specific styling (Success, Warning, Error, Info), automatic timeout dismiss, and manual dismiss.
  - *Why*: Eliminates silent button clicks and gives the user immediate visual confirmation of state changes without disruptive `window.alert` calls.
- **Decision 3: Non-Destructive Live Auditing**
  - *Chosen Approach*: Self-test runs execute against dedicated test IDs and existing store items with idempotency or safe mutation rollback so production/sample demo data is never corrupted.
  - *Why*: Keeps demo and workflow configurations pristine while proving the code works end-to-end.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar                              │
│   Nexus Scale GenAI   ·   Breadcrumbs   ·   [Verify Platform (40/40)]  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     Live Self-Test Runner     │               │     Eleven Studio Consoles    │
│  - 11 Studio Test Suites      │               │  - Complete Working Handlers  │
│  - Real HTTP & State Checks   │◄─────────────►│  - Async Loading Feedback    │
│  - Live Latency & Payload Log │               │  - In-App Toast Notifications │
└──────────────┬────────────────┘               └───────────────┬───────────────┘
               │                                                │
               └────────────────────────┬───────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Express Backend API                           │
│  /api/v1/health/self-test     ·  /api/v1/workflows/:id/execute        │
│  /api/v1/agents/test-prompt   ·  /api/v1/fine-tuning/train            │
│  /api/v1/red-teaming/test     ·  /api/v1/knowledge/query              │
│  /api/v1/deployments/invoke   ·  /api/v1/evaluations/run              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Persistent File Store (/data/nexus-store.json)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

1. **Platform Self-Test Modal (`SystemVerifierModal.tsx`)**:
   - Manages suite execution state: `idle` | `running` | `completed` | `failed`.
   - Dispatches requests sequentially or parallel across all 11 studio suites, rendering live progress bar, passed/failed counters, and expandable diagnostic logs.
2. **Notification & Toast Stack (`NotificationContext.tsx` / `ToastContainer.tsx`)**:
   - Global notification manager providing `showToast(type, title, message)` hook to all components.
3. **Studio Button Enhancements**:
   - *Workflow Builder*: "Run Selected Node" and "Run Pipeline" with step-by-step active highlighting, real timer, and execution log updates; "Auto Layout" graph tidying; "Duplicate Workflow".
   - *Agent Studio*: "Test Agent" with real interactive prompt sandbox; "Deploy Version" pushing to Gateway; "Clone Agent"; "Wipe Session Context".
   - *Knowledge Center*: "Test Semantic Retrieval" with simulated top-k vector score breakdown; "Re-index All Documents" with progress feedback; "Add Knowledge Source".
   - *Integrations*: "Test Connection" with live ping latency; "Sync Now" button with timestamp update; "Rotate API Token".
   - *Evaluation Lab*: "Trigger Benchmark Run" creating real evaluation records; "Compare Models"; "Export Report".
   - *Deployment Gateway*: "Invoke Endpoint" test console with request/response viewer; "Promote Canary to 100%"; "Rollback Deployment".
   - *Governance & Security*: "Signoff Pending Approval"; "Run Compliance Audit Scan"; "Download Audit Bundle".
   - *Model Customization, Data Foundry & SEAL*: Enhanced with live checkpoint generation, data curation export, and adversarial payload testing.

---
