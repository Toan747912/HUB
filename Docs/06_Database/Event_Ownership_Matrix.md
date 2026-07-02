# Event Ownership Matrix

## 1. Event Governance Rules

1. Each event has exactly one producer domain/module.
2. Payload owner is the producer (contract authority).
3. Persistence owner is the domain that owns the persisted state transition represented by the event.
4. Consumers must be listed explicitly.
5. Retry and idempotency must be defined per event category.

---

## 2. Event Matrix

| Event Name | Producer | Consumers | Payload Owner | Persistence Owner | Retry Policy | Idempotency Strategy |
|---|---|---|---|---|---|---|
| `GoalDefined` | Goal & Roadmap | Learning Session, Recommendation | Goal & Roadmap | Goal & Roadmap | Exponential backoff, max attempts + dead-letter | Deduplicate by `goal_id` + `version` |
| `GoalProgressUpdated` | Goal & Roadmap | Recommendation, Learning Profile | Goal & Roadmap | Goal & Roadmap | Bounded retry with DLQ fallback | Deduplicate by `goal_id` + progress checkpoint id |
| `RoadmapCreated` | Goal & Roadmap | Learning Session, Knowledge | Goal & Roadmap | Goal & Roadmap | Exponential backoff | Deduplicate by `roadmap_id` + `version` |
| `RoadmapNodeLinkedToKnowledge` | Goal & Roadmap | Knowledge, Recommendation | Goal & Roadmap | Goal & Roadmap | Exponential backoff | Deduplicate by mapping composite key |
| `KnowledgeNodeExpanded` | Knowledge Graph | Assessment, Recommendation | Knowledge Graph | Knowledge Graph | Exponential backoff + replay support | Deduplicate by `expansion_record_id` |
| `EvidenceRecorded` | Evidence | Assessment (primary), Discovery (secondary signal), Mentor loop projections | Evidence | Evidence | High-priority retry + DLQ | Deduplicate by `evidence_id` |
| `EvidenceLinked` | Evidence | Assessment, Explainability | Evidence | Evidence | Standard retry | Deduplicate by `evidence_link_id` |
| `AssessmentComputed` | Assessment | Discovery, Recommendation, Learning Profile | Assessment | Assessment | High-priority retry + DLQ | Deduplicate by `assessment_result_id` |
| `MasteryUpdated` | Assessment | Recommendation, Teaching, Learning Profile | Assessment | Assessment | High-priority retry | Deduplicate by `learner_id` + `knowledge_node_id` + version |
| `DiscoveryMismatchDetected` | Discovery | Recommendation, Teaching | Discovery | Discovery | Standard retry | Deduplicate by `mismatch_id` |
| `DiscoverySessionUpdated` | Discovery | Recommendation, Learning Profile | Discovery | Discovery | Standard retry | Deduplicate by `discovery_session_id` + transition seq |
| `RecommendationProposed` | Recommendation | Learning Session, Teaching, Mentor Interaction | Recommendation | Recommendation | High-priority retry + DLQ | Deduplicate by `recommendation_proposal_id` |
| `RecommendationResponded` | Recommendation | Learning Session, Teaching | Recommendation | Recommendation | Standard retry | Deduplicate by response id |
| `LearningSessionStarted` | Learning Session | Teaching, Mentor Interaction | Learning Session | Learning Session | Standard retry | Deduplicate by `learning_session_id` + state version |
| `LearningSessionTransitioned` | Learning Session | Teaching, Recommendation projections | Learning Session | Learning Session | Standard retry | Deduplicate by transition id/sequence |
| `SubSessionStarted` | Learning Session | Mentor Interaction | Learning Session | Learning Session | Standard retry | Deduplicate by `sub_session_id` |
| `MentorSessionUpdated` | Mentor Interaction | Evidence, Teaching | Mentor Interaction | Mentor Interaction | Standard retry | Deduplicate by `mentor_session_id` + revision |
| `TeachingDecisionRegistered` | Decision Persistence (internal derived stream from teaching decision path) | Teaching internal workflows, Explainability internal workflows | Decision Persistence | Decision Persistence | Standard retry with guaranteed ordering in partition | Deduplicate by `decision_header_id` (derived) |
| `DecisionRegistered` | Decision Persistence | Assessment, Discovery, Recommendation, Teaching, Explainability projections | Decision Persistence | Decision Persistence | Standard retry + DLQ | Deduplicate by `decision_header_id` |
| `TraceLinkCreated` | Explainability | Assessment, Discovery, Recommendation, Teaching governance views | Explainability | Explainability | Standard retry | Deduplicate by trace identity hash (`source`,`target`,`type`) |
| `AIRuntimeInvoked` | AI Runtime capability boundary | Teaching observability pipeline | AI Runtime | (No canonical domain table owner; runtime telemetry owner) | Short retry, circuit-breaker aware | Invocation idempotency key |
| `AIRuntimeCompleted` | AI Runtime capability boundary | Teaching, Explainability projections | AI Runtime | (No canonical domain table owner; runtime telemetry owner) | Retry on delivery failure only | Completion correlation id |

---

## 3. Duplicate Events

No hard duplicates are mandated in current frozen architecture.  
Potential near-duplicate semantics to monitor:
- `AssessmentComputed` vs `MasteryUpdated` (related but distinct state implications).
- `LearningSessionTransitioned` vs `MentorSessionUpdated` (different ownership domains, coordinated loop).

---

## 4. Ambiguous Events (Require Governance Clarification)

1. `KnowledgeNodeExpanded` local-vs-deep structural variants:
   - Semantics should remain one canonical event name with variant metadata.
2. `DecisionRegistered` vs specialized decision-detail events:
   - Keep `DecisionRegistered` as canonical envelope event;
   - specialized events should remain optional projections, not parallel ownership signals.
3. AI runtime events:
   - Ensure separation between runtime telemetry events and domain decision events.

---

## 5. Events Requiring Canonicalization

1. **Knowledge expansion variants**
   - Canonical event: `KnowledgeNodeExpanded`
   - Variant fields in payload (e.g., `expansion_mode`).

2. **Decision layer**
   - Canonical integration event: `DecisionRegistered` (single canonical producer chain).
   - `TeachingDecisionRegistered` is explicitly classified as **internal derived event** and must not be used as cross-domain canonical dependency.
   - Cross-domain consumers must depend on `DecisionRegistered`.

3. **Session transitions**
   - Canonical session transition event should remain `LearningSessionTransitioned`;
   - sub-session or mentor events should not duplicate transition ownership semantics.

---

## 6. Retry and Idempotency Baseline Profiles

### Profile A — Critical decision/signal events
Applies to: `EvidenceRecorded`, `AssessmentComputed`, `MasteryUpdated`, `RecommendationProposed`  
- Retry: exponential backoff + DLQ  
- Idempotency: domain identifier + version/sequence keys

### Profile B — Lifecycle update events
Applies to: session/discovery/recommendation response updates  
- Retry: bounded retry  
- Idempotency: entity id + transition sequence

### Profile C — Trace/decision supporting events
Applies to: `DecisionRegistered`, `TraceLinkCreated`  
- Retry: standard retry + ordering awareness where required  
- Idempotency: header/trace identity key

### Profile D — AI runtime events
Applies to runtime invocation/completion telemetry  
- Retry: short bounded retry + circuit breaker policy  
- Idempotency: invocation correlation key

---

## 7. Consistency Notes

1. Producer ownership aligns with table write ownership principles.
2. Persistence owner reflects true state owner, not merely consumer.
3. Event matrix is designed to avoid ownership inversion across domains.
4. Supporting modules remain internal authority for decision/trace persistence events.
5. Canonical decision producer chain is singular: `DecisionRegistered` is the only cross-domain canonical decision event.
