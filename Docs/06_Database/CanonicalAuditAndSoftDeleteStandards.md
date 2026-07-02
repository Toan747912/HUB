# Canonical Audit and Soft Delete Standards

## 1. Purpose

Define canonical standards for:
- auditability
- actor traceability
- lifecycle archival/soft-delete behavior
- explainability persistence alignment

Scope is governance only (no SQL/implementation changes).

---

## 2. Audit Standard Principles

1. Audit is mandatory for all mutable business tables.
2. Audit metadata must identify actor type and operation time.
3. Decision-impacting mutations require traceability to decision/explainability context where applicable.
4. Append-only tables preserve immutable creation provenance.
5. Audit strategy must preserve ownership and boundary rules.

---

## 3. Canonical Audit Field Baseline

## 3.1 Mutable snapshot tables
Required:
- `created_at`
- `created_by_actor_type`
- `updated_at`
- `updated_by_actor_type`

Recommended:
- `updated_by_actor_id` or equivalent identity reference where policy permits
- operation rationale metadata for high-risk mutations

## 3.2 Append-only tables
Required:
- `created_at`
- `created_by_actor_type`

Optional:
- correlation IDs
- decision/trace linkage columns where relevant

---

## 4. Actor Classification Standard

Canonical actor classification should be controlled and finite (example policy):
- `learner`
- `backend_core`
- `ai_runtime`
- `admin_operator`
- `system_job`

Rules:
1. Actor values must be constrained by check/enum policy in canonical standards.
2. Unknown actor values are non-compliant.
3. Cross-service actor attribution should remain stable across all tables.

---

## 5. Soft Delete / Lifecycle Policy

## 5.1 Default policy
Use lifecycle status transitions instead of hard delete:
- active -> archived
- open -> closed
- proposed -> accepted/rejected/expired

## 5.2 Allowed lifecycle timestamp columns
- `archived_at`
- `closed_at`
- `expires_at`

## 5.3 Hard delete exception policy
Hard delete requires explicit governance approval and is limited to:
- non-business temporary artifacts, or
- legal/compliance forced deletion workflows

---

## 6. Domain-Specific Soft Delete Guidance

## 6.1 Goal/Roadmap
- Prefer status archiving for roadmap and nodes.
- Preserve structural integrity and history references.

## 6.2 Knowledge/Evidence/Assessment
- Evidence and assessment outputs are append-dominant; avoid destructive deletion.
- Mastery state should evolve by versioned update, not remove/reinsert patterns.

## 6.3 Discovery/Recommendation
- Discovery and recommendation artifacts are lifecycle-driven (close/expire) rather than hard delete.

## 6.4 Learning Session / Mentor Interaction
- Session entities should use close/archive semantics.
- Historical transitions must remain recoverable.

## 6.5 Decision Persistence / Explainability
- Decision and trace records are append-oriented and should be immutable in normal operation.
- Deletion is disallowed except under explicit exceptional governance.

---

## 7. Explainability Persistence Standards

1. Explainability records (`trace_link`) must preserve:
   - source identity/type
   - target identity/type
   - creation provenance
2. Explainability records are append-only by policy.
3. Explainability links must not be used to imply ownership transfer across domains.
4. Trace coverage should remain consistent with canonical event and decision artifacts.

---

## 8. Decision Traceability Alignment

For decision-governed flows:
1. Decision envelope (`decision_header`) must remain canonical.
2. Detail tables must preserve immutable linkage to decision header.
3. Audit metadata should support reconstruction of:
   - who/what made the decision
   - when
   - under which rationale/policy context

---

## 9. Compliance Matrix

| Table Class | Audit Required | Soft Delete Required | Hard Delete Allowed | Explainability Alignment Required |
|---|---|---|---|---|
| Mutable core entity | Yes | Yes (status/archive) | No (default) | Contextual |
| Append-only core event/signal | Yes (creation only) | N/A | No (default) | Contextual |
| Bridge/link | Yes (creation + optional update audit) | Prefer controlled unlink lifecycle | No (default) | Optional |
| Decision persistence | Yes | N/A (append) | No (default) | Yes |
| Explainability trace | Yes | N/A (append) | No (default) | Yes |

---

## 10. Anti-Patterns

1. Mutable table without `updated_at`.
2. Soft-delete lifecycle without corresponding timestamp/status semantics.
3. Deleting decision/trace rows as routine cleanup.
4. Actor metadata omitted on decision-impacting updates.
5. Cross-domain updates without audit actor attribution.

---

## 11. Governance Checklist

Before approval:
1. Are required audit columns defined by lifecycle class?
2. Is soft delete strategy explicit?
3. Are hard delete exceptions formally documented?
4. Are decision/explainability records immutable by policy?
5. Does policy preserve ownership and boundary constraints?

---

## 12. Alignment References

- `CanonicalSchema_v1.md`
- `CanonicalColumnStandards.md`
- `CanonicalVersioningStandards.md`
- `CanonicalConstraintCatalog.md`
- `Event_Ownership_Matrix.md`
- `Cross_Domain_FK_Strategy.md`
