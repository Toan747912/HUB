# Evidence Lifecycle Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain
- **Traceability:** DECISION-026, DECISION-048, DECISION-053

---

## 1. Lifecycle States

Evidence lifecycle is defined with exactly five canonical states:

1. `ACTIVE`
2. `PAUSED`
3. `COMPLETED`
4. `ARCHIVED`
5. `BLOCKED`

---

## 2. State Definitions

## 2.1 ACTIVE
Normal execution state for evidence capture and verification progression.

Used for:
- newly captured evidence entering operational flow
- in-progress verification handling
- evidence currently valid for operational reads before completion/archive

## 2.2 PAUSED
Execution is temporarily halted by user or system.

Typical reasons:
- manual review hold
- temporary dependency outage
- governance pause pending additional context

## 2.3 COMPLETED
Evidence lifecycle has successfully finished validation and is finalized for intended downstream use.

Must include:
- final `ai_confidence`
- `source_weight`
- `evidence_weight`
- non-empty `reasoning`
- non-empty `traced_to[]`

## 2.4 ARCHIVED
Terminal non-active historical state.

Includes legacy outcomes mapped into archive semantics:
- superseded/replaced evidence records
- cancelled/abandoned/expired records
- retention-policy archive transitions

## 2.5 BLOCKED
Evidence cannot proceed due to validation, dependency, or governance constraint.

Typical reasons:
- trace integrity failure
- schema validation failure
- ownership/governance boundary violation

---

## 3. Valid Transitions

| From | To | Allowed | Notes |
|---|---|---:|---|
| ACTIVE | PAUSED | Yes | Temporary operational halt |
| PAUSED | ACTIVE | Yes | Resume after pause conditions clear |
| ACTIVE | COMPLETED | Yes | Verification/validation succeeds |
| ACTIVE | BLOCKED | Yes | Validation/dependency/governance constraint encountered |
| BLOCKED | ACTIVE | Yes | Constraint resolved and flow resumes |
| ACTIVE | ARCHIVED | Yes | Retention/archive or cancellation path |
| PAUSED | ARCHIVED | Yes | Archived while paused |
| COMPLETED | ARCHIVED | Yes | Terminal historical retention |
| BLOCKED | ARCHIVED | Yes | Terminal archival after unresolved blockage decision |

---

## 4. Invalid Transitions

| From | To | Allowed | Reason |
|---|---|---:|---|
| COMPLETED | ACTIVE | No | Completed is final for active processing |
| COMPLETED | PAUSED | No | Completed cannot be paused |
| COMPLETED | BLOCKED | No | Completed cannot become blocked |
| ARCHIVED | any non-ARCHIVED state | No | Archived is terminal |
| BLOCKED | COMPLETED | No | Must be reactivated before completion |

---

## 5. Verification Rules

Evidence can move `ACTIVE -> COMPLETED` only if all checks pass:

1. **Schema integrity:** normalized payload is valid per type contract.
2. **Trace integrity:** `traced_to[]` resolves to existing source artifacts.
3. **Reasoning completeness:** reasoning must explain acceptance/rejection logic.
4. **Confidence boundedness:** `ai_confidence` in [0,1].
5. **Weight consistency:** `evidence_weight = source_weight * ai_confidence`.
6. **Ownership compliance:** no mastery/regression mutation attempted by Evidence flow.
7. **Explainability compliance (DECISION-048):**
   - confidence present
   - reasoning present
   - traced_to present

If any check fails:
- Evidence moves to `BLOCKED` (or remains `ACTIVE` with explicit policy override)
- `Evidence.Recorded` / `Evidence.Verified` consumers must not treat blocked evidence as completed

---

## 6. Replacement and Archive Rules

A completed evidence can be replaced by newer higher-quality evidence, but replacement is modeled as archival under canonical state constraints.

Replacement invariants:
- old record remains immutable
- explicit linkage old -> new is mandatory (`superseded_by_evidence_id` retained as linkage metadata)
- replaced legacy semantics map to `ARCHIVED`
- downstream consumers must prefer newest non-archived completed evidence in active reads

---

## 7. Lifecycle Events

- `Evidence.Recorded`
- `Evidence.Verified`
- `Evidence.Superseded`

---

## 8. Ownership Guardrails

Lifecycle transitions can update only Evidence-owned state and metadata.  
Transitions must not:
- write mastery states
- trigger regression decisions as owner
- write recommendation proposals as owner
- mutate roadmap entities

These remain outside Evidence Domain per DECISION-026 boundaries.
