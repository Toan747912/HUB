# Evidence API Contract

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence API (design contract only)
- **Traceability:** DECISION-026, DECISION-048, DECISION-053

---

## 1. Design Principles

1. API contracts are explainability-first (`confidence`, `reasoning`, `traced_to[]`).
2. Evidence endpoints do not expose mastery/regression mutation commands.
3. Superseding preserves immutable history.
4. Errors are explicit and structured.

---

## 2. Endpoints

1. `POST /api/v1/evidence`
2. `POST /api/v1/evidence/{evidence_id}/verify`
3. `POST /api/v1/evidence/{evidence_id}/supersede`
4. `GET /api/v1/evidence/{evidence_id}`
5. `GET /api/v1/evidence`

---

## 3. Endpoint Contracts

## 3.1 Create Evidence

### Request
`POST /api/v1/evidence`

```json
{
  "learner_id": "uuid",
  "knowledge_node_id": "uuid",
  "evidence_source": {
    "owner_domain": "Teaching",
    "owner_entity_type": "mentor_session",
    "owner_entity_id": "uuid",
    "evidence_type": "MentorInteraction"
  },
  "raw_reference": {
    "artifact_type": "mentor_turn",
    "artifact_id": "uuid"
  },
  "normalized_payload": {},
  "direction": "negative",
  "traced_to": ["mentor_turn:uuid"]
}
```

### Response (201)
```json
{
  "evidence_id": "uuid",
  "state": "ACTIVE",
  "created_at": "2026-06-30T10:00:00Z"
}
```

---

## 3.2 Verify Evidence

### Request
`POST /api/v1/evidence/{evidence_id}/verify`

```json
{
  "verification_mode": "ai",
  "requested_by_actor_type": "system",
  "requested_by_actor_id": "ai-service",
  "context": {
    "rubric_ref": "rubric:lab-v2"
  }
}
```

### Response (200)
```json
{
  "evidence_id": "uuid",
  "state": "COMPLETED",
  "source_weight": 0.8,
  "ai_confidence": 0.74,
  "evidence_weight": 0.592,
  "explainability": {
    "confidence": 0.74,
    "reasoning": "Execution logs confirm retry logic partially correct.",
    "traced_to": [
      "lab_run:uuid",
      "test_case:retry-branch"
    ]
  },
  "verified_at": "2026-06-30T10:03:00Z"
}
```

### Failure Response (422)
```json
{
  "error_code": "EVIDENCE_VERIFICATION_FAILED",
  "message": "Missing traceability references",
  "details": {
    "missing_fields": ["traced_to"]
  }
}
```

---

## 3.3 Supersede Evidence

### Request
`POST /api/v1/evidence/{evidence_id}/supersede`

```json
{
  "new_evidence_id": "uuid",
  "reason": "Learner challenge accepted with corrected project submission",
  "requested_by_actor_type": "system",
  "requested_by_actor_id": "assessment-service"
}
```

### Response (200)
```json
{
  "evidence_id": "old-uuid",
  "state": "ARCHIVED",
  "superseded_by_evidence_id": "new-uuid",
  "updated_at": "2026-06-30T10:10:00Z"
}
```

### Failure Response (409)
```json
{
  "error_code": "INVALID_STATE_TRANSITION",
  "message": "Only COMPLETED evidence can transition to ARCHIVED with superseded linkage metadata"
}
```

---

## 3.4 Get Evidence

### Request
`GET /api/v1/evidence/{evidence_id}`

### Response (200)
```json
{
  "evidence_id": "uuid",
  "learner_id": "uuid",
  "knowledge_node_id": "uuid",
  "state": "COMPLETED",
  "evidence_type": "Lab",
  "direction": "negative",
  "source_weight": 0.8,
  "ai_confidence": 0.74,
  "evidence_weight": 0.592,
  "explainability": {
    "confidence": 0.74,
    "reasoning": "Failure reproduced in timeout retry branch.",
    "traced_to": [
      "lab_run:uuid",
      "log_ref:uuid"
    ]
  },
  "superseded_by_evidence_id": null,
  "audit": {
    "created_at": "2026-06-30T10:00:00Z",
    "updated_at": "2026-06-30T10:03:00Z"
  }
}
```

### Not Found (404)
```json
{
  "error_code": "EVIDENCE_NOT_FOUND",
  "message": "Evidence does not exist or is not accessible"
}
```

---

## 3.5 List Evidence

### Request
`GET /api/v1/evidence?learner_id=...&knowledge_node_id=...&state=COMPLETED&direction=negative&page=1&page_size=20`

### Response (200)
```json
{
  "items": [
    {
      "evidence_id": "uuid",
      "state": "COMPLETED",
      "evidence_type": "MentorInteraction",
      "direction": "negative",
      "evidence_weight": 0.12,
      "explainability": {
        "confidence": 0.4,
        "reasoning": "Learner repeatedly mismatched definition and example.",
        "traced_to": ["mentor_turn:uuid"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 1
  }
}
```

---

## 4. Error Contract

Standard error envelope:

```json
{
  "error_code": "STRING_CODE",
  "message": "Human readable message",
  "details": {},
  "correlation_id": "uuid",
  "timestamp": "ISO-8601"
}
```

Common error codes:
- `EVIDENCE_NOT_FOUND`
- `INVALID_STATE_TRANSITION`
- `EVIDENCE_VERIFICATION_FAILED`
- `EXPLAINABILITY_REQUIRED_FIELDS_MISSING`
- `OWNERSHIP_BOUNDARY_VIOLATION`
- `VALIDATION_ERROR`

---

## 5. Explainability Fields (Mandatory Rules)

For `COMPLETED` responses, API must always include:
- `explainability.confidence`
- `explainability.reasoning`
- `explainability.traced_to[]`

If missing, verification endpoint must fail with:
- `EXPLAINABILITY_REQUIRED_FIELDS_MISSING`

---

## 6. Ownership Boundary Enforcement

API layer must reject payloads that attempt Evidence-forbidden operations:
- mastery writes
- regression decision writes
- recommendation creation writes
- roadmap mutation writes

Error:
- `OWNERSHIP_BOUNDARY_VIOLATION`
