# Nexus AI Platform — System Architecture & Implementation Plan

## 1. Executive Summary
Nexus AI Platform is a modular, high-security enterprise platform for designing, orchestrating, evaluating, and governing autonomous AI agents and graph-based workflows. It incorporates Gemini 4 Argon with High Thinking (`thinkingLevel: ThinkingLevel.HIGH`) to solve high-complexity corporate tasks requiring mathematical verification, compliance cross-referencing, and deterministic tool authorization.

## 2. Core Pillars & Architecture

```
                                ┌──────────────────────────────────────┐
                                │       Enterprise Web UI (React)      │
                                │   Command Center | Studio | Builder  │
                                │   Knowledge | Evaluation | Security  │
                                └──────────────────┬───────────────────┘
                                                   │ Typed REST & SSE
                                                   ▼
                                ┌──────────────────────────────────────┐
                                │        Nexus Server Core (API)       │
                                │   Tenant RBAC & Secret Isolation     │
                                │   Auditing & Approval Gatekeeper     │
                                └──────┬──────────────────┬────────────┘
                                       │                  │
                ┌──────────────────────┴───────┐   ┌──────┴────────────────────┐
                ▼                              ▼   ▼                           ▼
    ┌──────────────────────┐      ┌─────────────────────────┐     ┌───────────────────────┐
    │ Graph Workflow Engine│      │   Agent Reasoning Loop  │     │   Document Knowledge  │
    │  - Topo validator    │      │  - Gemini 4 Argon       │     │  - Chunk parser       │
    │  - Branch & Loops    │◄────►│  - High Thinking Mode   │◄───►│  - Semantic citations │
    │  - Checkpoints       │      │  - Tool allowlists      │     │  - Policy grounding   │
    └──────────────────────┘      └─────────────────────────┘     └───────────────────────┘
                │                              │                               │
                └──────────────────────┬───────┴───────────────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │   Persistent Enterprise Store │
                       │    (/data/nexus-store.json)   │
                       └───────────────────────────────┘
```

## 3. High Thinking Mode Integration
- Model: `gemini-4-argon`
- Reasoning Level: `ThinkingLevel.HIGH`
- Config: No token truncation (`maxOutputTokens` omitted)
- Rationale: High-consequence financial forensic audits, threat correlation, and multi-step policy calculations require deep step-by-step reasoning traces.

## 4. Tenant Isolation & RBAC
- Tenant Boundary: Every agent, workflow, execution, and audit log is isolated by `orgId` and scoped to a specific `workspaceId`.
- Roles:
  - `org_admin`: Full tenant administrative controls, model allowlist, and policy overrides.
  - `workspace_admin`: Workspace management, publishing approvals, deployment creation.
  - `builder`: Agent and workflow authoring, test execution, prompt engineering.
  - `operator`: Triggering executions, monitoring traces, viewing dashboards.
  - `evaluator`: Running evaluation suites, regression benchmarking.
  - `viewer`: Read-only visibility into execution traces and reports.

## 5. Security & Threat Model
- Secret Protection: Credentials for external ERP, CRM, and threat intelligence APIs remain strictly on the backend.
- SSRF Prevention: Egress tool invocations validate target hosts and block local loopbacks or cloud metadata IPs.
- Human In The Loop: Sensitive actions (e.g. invoice commitments over $25k, host quarantine) automatically pause execution at an Approval Node until an authorized reviewer explicitly approves.
