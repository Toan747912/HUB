# 14_Operations

**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date added:** 2026-07-03

This folder documents the operational readiness of `Apps/ai-backend` (deployment, monitoring, incident response, SLOs, Closed Beta certification). It governs a different, faster-moving track than the rest of `Docs/00_Vision` … `11_Decisions`.

## Why this folder exists outside the normal Decision-Log flow

[Project_Index.md](../Project_Index.md) §7 states the project is in the **Database Design Phase** and that *"mọi code trong `Apps/`, mọi nội dung trong `Infrastructure/`"* (all code in `Apps/`, all content in `Infrastructure/`) has **not yet started**. That statement does not reflect current reality: `Apps/ai-backend` is a working NestJS service with a production Docker Compose stack, real Prometheus alert rules and a Grafana dashboard, CI/CD pipelines, and roughly 35 completed engineering certification/runbook documents (Security, Reliability, Observability, Database Foundation, and others), most recently updated 2026-07-02/03.

This is a known, flagged contradiction between two tracks working in the same repository:

- **The `Docs/00_Vision`…`11_Decisions` track** — Vietnamese-language, Founder/ChatGPT-Lead-Architect/Claude-Co-Architect governed, Decision-Log gated, currently mid-way through Database Design for a long-horizon product vision.
- **The `Apps/`-code engineering track** — has proceeded independently and is materially ahead of what `Project_Index.md` describes, building an operable service on its own schedule.

Per explicit operator direction given while authoring WP-06 (2026-07-03), this folder's contents proceed under the engineering track's authority and do **not** attempt to reconcile or update `Project_Index.md`'s §7 status. If you are an AI agent or engineer encountering this divergence for the first time: do not assume either track is "wrong" and silently pick a side — this note exists so you don't have to re-discover the conflict, and so it stays visible until the Founder/Lead Architect formally reconciles the two tracks (see [Docs/10_Backlog/Backlog.md](../10_Backlog/Backlog.md) if a reconciliation item is later logged there).

## Contents

| Document | Purpose |
|---|---|
| [OperationsHandbook.md](OperationsHandbook.md) | Central operations reference — architecture, topology, checklists, escalation, change management |
| [RunbookIndex.md](RunbookIndex.md) | Single entry point to every operational runbook (deployment, rollback, backup/restore, dependency failures, resource exhaustion, cert/secret lifecycle) — most runbooks already existed under `Apps/ai-backend/` and repo root; this indexes rather than duplicates them |
| [IncidentResponseGuide.md](IncidentResponseGuide.md) | Severity levels, classification, communication flow, investigation, RCA |
| [MonitoringCertification.md](MonitoringCertification.md) | What is/isn't actually monitored today, verified against the codebase |
| [SLO_SLI_Definition.md](SLO_SLI_Definition.md) | Measurable service-level objectives and how they're (or aren't yet) measured |
| [OperationsReadinessReview.md](OperationsReadinessReview.md) | Consolidated readiness assessment against the WP-06 quality gates |
| [ClosedBetaChecklist.md](ClosedBetaChecklist.md) | Final go/no-go checklist for Closed Beta |
| [GoLiveApproval.md](GoLiveApproval.md) | Final certification and classification |
