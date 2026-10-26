# Nexus AI Platform — System Architecture & Implementation Plan

> **Status, 2026-10-26 (L0 T6).** This document describes the intended design, not the current code. What each route and screen does today is in `docs/audit/CAPABILITY_MATRIX.md`, open security defects are in `docs/audit/SECURITY_FINDINGS.md`, and the decided design is `docs/architecture/TARGET_ARCHITECTURE.md`. Statements the code does not back yet are marked **not implemented** or **partial**.

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

**Not implemented** in the diagram above: server-sent events, checkpoints, loops, tool allowlists, and tenant RBAC enforcement.

## 3. High Thinking Mode Integration
- Model: `gemini-4-argon`
- Reasoning Level: `ThinkingLevel.HIGH`
- Config: No token truncation (`maxOutputTokens` omitted)
- Rationale: High-consequence financial forensic audits, threat correlation, and multi-step policy calculations require deep step-by-step reasoning traces.

## 4. Tenant Isolation & RBAC
- Tenant Boundary (**partial**): records carry `orgId` and `workspaceId`, but identity comes from request headers and many routes ignore the org (findings S1, S2 and S6 to S10).
- Roles (**not implemented**: defined, never checked; L1 T5):
  - `org_admin`: Full tenant administrative controls, model allowlist, and policy overrides.
  - `workspace_admin`: Workspace management, publishing approvals, deployment creation.
  - `builder`: Agent and workflow authoring, test execution, prompt engineering.
  - `operator`: Triggering executions, monitoring traces, viewing dashboards.
  - `evaluator`: Running evaluation suites, regression benchmarking.
  - `viewer`: Read-only visibility into execution traces and reports.

## 5. Security & Threat Model
- Secret Protection (**partial**): the model key stays on the server, but deployment API keys are returned to any caller (finding S11), and no external connector credentials exist yet.
- SSRF Prevention (**built, not yet wired**): no tool makes an outbound call yet. Since L1 T12, `server/egress.ts#export async function assertSafeEgress(` refuses non-http(s) schemes and any host that resolves to a loopback, private, link-local (cloud metadata) or reserved address, proven by `server/egress.test.ts`. L5 T8 wires it into the first connector before that connector calls out.
- Human In The Loop (**partial**): execution pauses at an Approval Node, but any caller can decide it, and approving does not run the remaining nodes (L1 T6, L3 T4).
