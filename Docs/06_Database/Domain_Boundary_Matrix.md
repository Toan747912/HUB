# Domain Boundary Matrix

## Boundary Semantics
- **Allowed Reads**: read/query access permitted through approved contracts.
- **Allowed Writes**: direct write ownership only.
- **Forbidden Writes**: direct persistence mutation not allowed.
- **Event-Based Interactions**: preferred integration path for cross-domain state effects.
- **Shared Projections**: read-model/projection surfaces permitted for decoupled consumption.

---

## 1. Domain-to-Domain Boundary Matrix

| Domain Pair | Allowed Reads | Allowed Writes | Forbidden Writes | Event-Based Interactions | Shared Projections |
|---|---|---|---|---|---|
| Goal → Roadmap | Yes (Goal context to roadmap planning) | Goal & Roadmap writes roadmap tables | Goal cannot write Knowledge/Evidence/Assessment tables | `Roadmap*` lifecycle events | Goal progress projections |
| Roadmap → Knowledge | Yes (node mapping reads) | Roadmap writes mapping bridge only | Knowledge cannot write roadmap structural tables | Knowledge expansion driven by roadmap context events | Roadmap-Knowledge mapping projection |
| Knowledge → Evidence | Yes (knowledge context reads for evidence linkage) | Knowledge writes knowledge tables only; Evidence writes evidence tables only | Knowledge cannot write evidence; Evidence cannot write knowledge core | `EvidenceRecorded` with knowledge references | Knowledge-evidence contextual projection |
| Evidence → Assessment | Yes (assessment reads evidence) | Evidence writes evidence only; Assessment writes results/mastery only | Evidence forbidden from writing `assessment_result` and `knowledge_node_mastery` | `EvidenceRecorded` consumed by Assessment | Evidence-assessment evaluation projection |
| Assessment → Discovery | Yes | Assessment writes assessment/mastery only; Discovery writes discovery tables only | Discovery cannot rewrite assessment/mastery | Assessment outcome events feed discovery logic | Assessment-discovery insight projection |
| Assessment → Recommendation | Yes | Assessment writes assessment/mastery only; Recommendation writes proposal tables only | Recommendation cannot mutate assessment/mastery | Assessment/Discovery signals consumed by Recommendation | Recommendation input projection |
| Discovery → Recommendation | Yes | Discovery writes discovery tables only; Recommendation writes proposal tables only | Recommendation cannot write discovery session state | Discovery mismatch signals consumed by Recommendation | Discovery-recommendation signal projection |
| Recommendation → Learning Session | Yes (session reads active proposals) | Recommendation writes proposal tables only; Learning Session writes session tables only | Recommendation cannot write session state | `RecommendationProposed` consumed by Learning Session | Active recommendations projection |
| Learning Session → Teaching | Yes | Learning Session writes session state only; Teaching writes no canonical aggregate | Teaching cannot write session core tables | Session state events/context consumed by Teaching | Session orchestration projection |
| Teaching → AI Runtime | Yes (invocation contract reads) | Teaching orchestration only; AI Runtime no canonical domain table writes | AI runtime cannot directly mutate domain tables | Invocation/result events or internal callbacks | Runtime response projection |
| Mentor Interaction ↔ Evidence | Mentor reads evidence context; Evidence reads mentor context where needed | Mentor Interaction writes mentor session; Evidence writes evidence | Neither writes the other's owned tables directly | Mentor response → Evidence capture event path | Mentor-evidence loop projection |
| Supporting (Explainability/Decision Persistence) ↔ Core Domains | Core domains may read internal outputs where allowed | Supporting modules write their own internal tables only | Core domains cannot write supporting tables directly (except via service contract) | Internal service/event contracts | Decision/trace projection surfaces |

---

## 2. Explicit Rule Verification

## Rule A — Assessment is sole owner of mastery decisions
**Verified:**  
`knowledge_node_mastery` write ownership = Assessment only.

## Rule B — Evidence does not mutate mastery
**Verified:**  
Evidence writes `evidence` and `evidence_link` only; mastery changes occur via Assessment after event consumption.

## Rule C — Recommendation is proposal-only
**Verified:**  
Recommendation write scope is limited to `recommendation_proposal` and `recommendation_proposal_response`.

## Rule D — Teaching is orchestration-only
**Verified:**  
Teaching has no canonical aggregate write ownership in frozen schema; it orchestrates reads/invocations/decision services.

## Rule E — Learning Session is coordinator-only
**Verified:**  
Learning Session owns session state coordination (`learning_session`, transitions, sub-session flow) and does not own mastery/recommendation writes.

---

## 3. Forbidden Write Summary (High Importance)

1. Evidence → `knowledge_node_mastery` (forbidden)
2. Recommendation → `knowledge_node_mastery` (forbidden)
3. Recommendation → `learning_session` direct mutation (forbidden)
4. Teaching → core domain aggregate direct mutation (forbidden)
5. Discovery → `assessment_result` direct mutation (forbidden)
6. Core modules → `decision_header`/`trace_link` direct table writes bypassing supporting services (forbidden)

---

## 4. Shared Projection Strategy

Allowed cross-domain projections:
- Goal/Roadmap progression projection for Teaching and Session orchestration.
- Evidence→Assessment evaluation projection.
- Assessment/Discovery→Recommendation signal projection.
- Recommendation→Learning Session active action projection.
- Session/Recommendation/Assessment context bundle for Teaching orchestration.
- Explainability/Decision summaries as read-only governance projections.

Projection constraints:
- Projections are read-only.
- Projections do not create write ownership transfer.
- Projection refresh may be synchronous (query) or asynchronous (event-driven) based on consistency SLA.

---

## 5. Boundary Compliance Notes

1. Boundary integrity depends on strict write-owner enforcement in repositories/services.
2. Event contracts are required for cross-domain state influence.
3. Supporting modules remain internal-only write domains.
4. Any boundary exception requires formal architecture decision and matrix update.
