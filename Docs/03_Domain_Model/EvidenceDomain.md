# Evidence Domain Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain & Evidence Engine
- **Classification:** **Core Domain**
- **Traceability:** DECISION-026, DECISION-030, DECISION-048, DECISION-052, DECISION-053

---

## 1. Domain Purpose

The Evidence Domain is the authoritative source for:

1. **Knowledge Mastery inputs** (not mastery writes)
2. **Assessment Validation inputs**
3. **Knowledge Regression signals** (not regression decisions)
4. **Recommendation Signal provenance**
5. **Explainability Chains**

The Evidence Domain captures, normalizes, verifies, and versions evidence records.  
It does **not** own mastery state or regression decisions.

---

## 2. Boundary and Ownership

### 2.1 Core Boundary Statement

Evidence Domain owns:
- Evidence capture lifecycle
- Evidence source metadata
- Evidence verification status
- Evidence explainability links (`traced_to`)
- Evidence weighting metadata (`source_weight`, `ai_confidence`, `evidence_weight`)

Evidence Domain does **not** own:
- `KnowledgeNodeMastery` mutations
- Assessment verdict decisions
- Regression demotion decisions
- Recommendation creation decisions
- Roadmap mutations

### 2.2 Ownership Constraint (Locked)

Per DECISION-026:
- **Assessment Domain is sole write owner** of mastery and regression decisions.
- Evidence publishes verified evidence + signals only.

---

## 3. Aggregates

## 3.1 `Evidence` (Aggregate Root)

Represents one immutable evidence record linked to learner learning activity.

### Attributes (logical)
- `evidence_id` (UUID)
- `learner_id` (UUID)
- `knowledge_node_id` (UUID)
- `evidence_source_id` (UUID)
- `evidence_type` (Quiz | Exercise | Lab | Project | Reflection | PeerReview | TeachingDemonstration | MentorInteraction)
- `direction` (positive | negative | mixed)
- `state` (ACTIVE | PAUSED | COMPLETED | ARCHIVED | BLOCKED)
- `raw_reference` (source pointer to artifact/transcript/submission)
- `normalized_payload` (structured extract)
- `source_weight` (decimal)
- `ai_confidence` (decimal 0..1)
- `evidence_weight` (computed = source_weight * ai_confidence)
- `reasoning` (explainability reasoning)
- `traced_to[]` (source trace references)
- `superseded_by_evidence_id` (nullable UUID)
- Audit fields: `created_at`, `created_by_actor_type`, `created_by_actor_id`, `updated_at`, `updated_by_actor_type`, `updated_by_actor_id`, `deleted_at`, `deleted_by_actor_id`

### Invariants
1. `evidence_weight = source_weight * ai_confidence`
2. `ai_confidence` must be in [0,1]
3. `COMPLETED` evidence must include non-empty `reasoning` + at least one `traced_to`
4. `ARCHIVED` evidence is terminal and cannot return to active states (`ACTIVE`/`PAUSED`/`COMPLETED`/`BLOCKED`)
5. If `superseded_by_evidence_id` is set, current state must be `ARCHIVED` (legacy superseded mapping)
6. Evidence record is append-only for semantic fields after `COMPLETED` (only lifecycle/audit updates allowed)

---

## 3.2 `EvidenceSource` (Aggregate Root)

Represents the source context that produced the evidence.

### Attributes (logical)
- `evidence_source_id` (UUID)
- `owner_domain` (Discovery | Teaching | Assessment | LearningSession)
- `owner_entity_type` (e.g., discovery_session, mentor_session, assessment_attempt, sub_session)
- `owner_entity_id` (UUID)
- `evidence_type` (same taxonomy as Evidence)
- `source_reliability_tier` (high | medium | low)
- `default_source_weight` (decimal)
- `capture_context` (JSON metadata)
- `captured_at` (datetimeoffset)
- Audit fields

### Invariants
1. `owner_domain` must be one of: Discovery, Teaching, Assessment, LearningSession
2. `owner_entity_type + owner_entity_id` must resolve to an existing record at capture time
3. `default_source_weight` must be > 0 and <= 1
4. `Evidence.evidence_source_id` must reference a valid active EvidenceSource

---

## 4. Cross-Domain Write Ownership Matrix

| Domain | Can Create EvidenceSource | Can Create Evidence (Draft/Collected) | Can Verify Evidence | Can Decide Mastery/Regression | Can Create Recommendation |
|---|---:|---:|---:|---:|---:|
| Discovery | Yes (for discovery sessions) | Yes (capture only) | No | No | No |
| Teaching | Yes (for mentor interactions/teaching demos) | Yes (capture only) | No | No | No |
| Assessment | Yes (for assessments/quizzes/labs/projects) | Yes (capture only) | Yes (verification workflow) | **Yes (sole owner)** | No |
| LearningSession | Yes (for sub-session context) | Yes (capture only) | No | No | No |
| Evidence Domain | Owns persistence/lifecycle enforcement | Owns normalization | Owns verification state transition mechanics | **No** | **No** |

**Clarification:**  
Evidence verification may be executed by AI and approved in workflow orchestrated with Assessment authority, but mastery/regression decisions remain exclusively in Assessment domain.

---

## 5. Domain Events

## 5.1 Evidence lifecycle events
- `Evidence.Recorded`
- `Evidence.Verified`
- `Evidence.Superseded`

## 5.2 Verification events
- `EvidenceVerificationRequested`
- `EvidenceVerificationCompleted`
- `EvidenceVerificationFailed`
- `EvidenceChallengedByLearner`
- `EvidenceChallengeResolved`

## 5.3 Signal events (read by other domains)
- `EvidenceNegativeWeightAccumulated`  
  Payload includes learner/node/cumulative_negative_weight candidate signal.
- `EvidenceReadyForAssessmentValidation`
- `EvidenceTraceChainCompleted`

**Important:** These are **signals/events only**. They do not mutate mastery, roadmap, or recommendation records directly.

---

## 6. Consistency Rules with Locked Decisions

1. **DECISION-026 compliance:** Assessment remains sole write-owner of mastery/regression outcomes.
2. **DECISION-030 alignment:** Evidence supports AssessmentResult explainability fields by providing stable references and reasoning sources.
3. **DECISION-048 compliance:** Every AI decision involving evidence must preserve `confidence`, `reasoning`, `traced_to[]`.
4. **DECISION-052 compatibility:** Teach-related evidence types support teach sub-capability decomposition.
5. **DECISION-053 compliance:** Evidence weighting uses dynamic formula and contributes to cumulative negative-weight signals only.

---

## 7. Out-of-Bound Actions (Explicitly Forbidden)

Evidence Domain must not:
- Upgrade mastery level
- Demote mastery level
- Emit recommendation proposals as owner
- Modify roadmap structures
- Rewrite historical verified evidence content (except superseding linkage lifecycle)
