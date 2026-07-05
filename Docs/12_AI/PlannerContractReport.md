# Planner Contract Report (auto-generated)

Generated: 2026-07-04T15:58:51.431Z
Source: `Apps/ai-backend/scripts/planner-contract-audit.ts` — regex-based heuristics, not a type checker. Run via `npm run audit:planner-contract`. Not wired into CI; treat findings as a manual review checklist.

**5 planner(s) audited, 35/35 checks passed. Overall: PASS.**

## discovery-planner — PASS

File: `ai-backend/src/modules/discovery-planner/application/services/discovery-planner.service.ts`

| Rule | Status | Detail |
| --- | --- | --- |
| EXTENDS_BASE_PLANNER_SERVICE | PASS | extends BasePlannerService |
| EXPOSES_PROMPT_VERSION | PASS | declares protected readonly promptVersion |
| EXPOSES_CAPABILITY | PASS | declares protected readonly capability |
| VALIDATES_EXPLAINABILITY | PASS | inherits explainability validation from BasePlannerService.execute() (no local execute() override found) |
| EMITS_METRICS | PASS | implements emitMetrics() and calls this.metrics inside it |
| EMITS_AUDIT_EVENTS | PASS | implements buildAuditEvent() |
| USES_RESILIENT_LLM_GATEWAY | PASS | imports ResilientLlmGateway and threads it into super() |

## evidence-planner — PASS

File: `ai-backend/src/modules/evidence-planner/application/services/evidence-planner.service.ts`

| Rule | Status | Detail |
| --- | --- | --- |
| EXTENDS_BASE_PLANNER_SERVICE | PASS | extends BasePlannerService |
| EXPOSES_PROMPT_VERSION | PASS | declares protected readonly promptVersion |
| EXPOSES_CAPABILITY | PASS | declares protected readonly capability |
| VALIDATES_EXPLAINABILITY | PASS | inherits explainability validation from BasePlannerService.execute() (no local execute() override found) |
| EMITS_METRICS | PASS | implements emitMetrics() and calls this.metrics inside it |
| EMITS_AUDIT_EVENTS | PASS | implements buildAuditEvent() |
| USES_RESILIENT_LLM_GATEWAY | PASS | imports ResilientLlmGateway and threads it into super() |

## knowledge-planner — PASS

File: `ai-backend/src/modules/knowledge-planner/application/services/knowledge-planner.service.ts`

| Rule | Status | Detail |
| --- | --- | --- |
| EXTENDS_BASE_PLANNER_SERVICE | PASS | extends BasePlannerService |
| EXPOSES_PROMPT_VERSION | PASS | declares protected readonly promptVersion |
| EXPOSES_CAPABILITY | PASS | declares protected readonly capability |
| VALIDATES_EXPLAINABILITY | PASS | inherits explainability validation from BasePlannerService.execute() (no local execute() override found) |
| EMITS_METRICS | PASS | implements emitMetrics() and calls this.metrics inside it |
| EMITS_AUDIT_EVENTS | PASS | implements buildAuditEvent() |
| USES_RESILIENT_LLM_GATEWAY | PASS | imports ResilientLlmGateway and threads it into super() |

## mission-planner — PASS

File: `ai-backend/src/modules/mission-planner/application/services/mission-planner.service.ts`

| Rule | Status | Detail |
| --- | --- | --- |
| EXTENDS_BASE_PLANNER_SERVICE | PASS | extends BasePlannerService |
| EXPOSES_PROMPT_VERSION | PASS | declares protected readonly promptVersion |
| EXPOSES_CAPABILITY | PASS | declares protected readonly capability |
| VALIDATES_EXPLAINABILITY | PASS | inherits explainability validation from BasePlannerService.execute() (no local execute() override found) |
| EMITS_METRICS | PASS | implements emitMetrics() and calls this.metrics inside it |
| EMITS_AUDIT_EVENTS | PASS | implements buildAuditEvent() |
| USES_RESILIENT_LLM_GATEWAY | PASS | imports ResilientLlmGateway and threads it into super() |

## teaching-planner — PASS

File: `ai-backend/src/modules/teaching-planner/application/services/teaching-planner.service.ts`

| Rule | Status | Detail |
| --- | --- | --- |
| EXTENDS_BASE_PLANNER_SERVICE | PASS | extends BasePlannerService |
| EXPOSES_PROMPT_VERSION | PASS | declares protected readonly promptVersion |
| EXPOSES_CAPABILITY | PASS | declares protected readonly capability |
| VALIDATES_EXPLAINABILITY | PASS | inherits explainability validation from BasePlannerService.execute() (no local execute() override found) |
| EMITS_METRICS | PASS | implements emitMetrics() and calls this.metrics inside it |
| EMITS_AUDIT_EVENTS | PASS | implements buildAuditEvent() |
| USES_RESILIENT_LLM_GATEWAY | PASS | imports ResilientLlmGateway and threads it into super() |
