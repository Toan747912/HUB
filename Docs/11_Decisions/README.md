# Decisions Index — AI Mentor OS

Nguồn sự thật duy nhất cho mọi quyết định kiến trúc/sản phẩm đã khóa. Mỗi quyết định là 1 file riêng. Quy trình tạo/sửa: xem [Docs/GOVERNANCE.md](../GOVERNANCE.md) mục 2.

| ID | Tên | Status |
|---|---|---|
| [DECISION-001](DECISION-001-Project-Identity-And-Positioning.md) | Project Identity & Positioning | Accepted (Locked) |
| [DECISION-002](DECISION-002-AI-Mentor-Role.md) | AI Mentor Role | Accepted (Locked) |
| [DECISION-003](DECISION-003-Core-Principles.md) | 7 Core Principles | Accepted (Locked) |
| [DECISION-004](DECISION-004-Goal-Oriented-Learning-Philosophy.md) | Goal-Oriented Learning Philosophy | Accepted (Locked) |
| [DECISION-005](DECISION-005-Dynamic-Roadmap-System.md) | Dynamic Roadmap System | Accepted (Locked) |
| [DECISION-006](DECISION-006-Roadmap-Governance.md) | Roadmap Governance | Accepted (Locked) — 🔶 1 chi tiết open |
| [DECISION-007](DECISION-007-Discovery-Engine.md) | Discovery Engine | Accepted (Locked) — 🔶 1 chi tiết open |
| [DECISION-008](DECISION-008-Learning-Modes.md) | Learning Modes | Accepted (Locked) |
| [DECISION-009](DECISION-009-Knowledge-Philosophy.md) | Knowledge Philosophy | Accepted (Locked) |
| [DECISION-010](DECISION-010-Knowledge-Graph.md) | Knowledge Graph | Accepted (Locked) |
| [DECISION-011](DECISION-011-User-Memory.md) | User Memory | Accepted (Locked) |
| [DECISION-012](DECISION-012-Multi-Domain-Scope.md) | Multi-Domain Scope | Accepted (Locked) — 🔶 phạm vi MVP open |
| [DECISION-013](DECISION-013-Roles-And-Governance-Model.md) | Roles & Governance Model | Accepted (Locked) — 🔶 sync protocol open |
| [DECISION-014](DECISION-014-Workspace-Architecture-Layered-Model.md) | Workspace Architecture: Layered Model | Accepted (Locked) |
| [DECISION-015](DECISION-015-Knowledge-Engine.md) | Knowledge Engine Architecture | Accepted (Locked) — 🔶 1 chi tiết open |
| [DECISION-016](DECISION-016-Evidence-Based-Decay.md) | Evidence-Based Decay | Accepted (Locked) — 🔶 1 chi tiết open |
| [DECISION-017](DECISION-017-Mastery-Framework.md) | Mastery Framework (Teach = Capability Cluster) | Accepted (Locked) — ⚠️ rủi ro đặt tên "Explain" |
| [DECISION-018](DECISION-018-Domain-Modeling-Phase.md) | Domain Modeling Phase (pause DB/API/UI) | Accepted (Locked) |
| [DECISION-019](DECISION-019-Recommendation-Engine.md) | Recommendation Engine — independent capability | Accepted (Locked) |
| [DECISION-020](DECISION-020-Teach-Composite-Capability.md) | Teach = Composite Capability, weighted score, no Pass/Fail | Accepted (Locked) |
| [DECISION-021](DECISION-021-Evidence-Weighting.md) | Knowledge Regression based on Evidence Weight | Accepted (Locked) — 🔶 trọng số/ngưỡng cụ thể open |
| [DECISION-022](DECISION-022-Evidence-KnowledgeNode-M2M.md) | Evidence ↔ KnowledgeNode Many-to-Many (support/refute per link) | Accepted (Locked) — 🔶 1 chi tiết open |
| [DECISION-023](DECISION-023-Controlled-Knowledge-Expansion.md) | Knowledge Expansion Governance (Controlled Expansion) | Accepted (Locked) — 🔶 tiêu chí chi tiết open |
| [DECISION-024](DECISION-024-Concept-Is-KnowledgeNode.md) | Concept and KnowledgeNode are the same entity | Accepted (Locked) |
| [DECISION-025](DECISION-025-Knowledge-Graph-DAG.md) | Knowledge Graph is a DAG (multi-parent, multi relation-type, cycle detection) | Accepted (Locked) — 🔶 relation_type list + cycle mechanism open |
| [DECISION-026](DECISION-026-Assessment-Core-Domain.md) | Assessment is an independent Core Domain (owns Mastery write + AssessmentResult) | Accepted (Locked) |
| [DECISION-027](DECISION-027-Explainability-First.md) | Explainability First — every Mastery/Recommendation/Expansion change must trace to Evidence/Assessment | Accepted (Locked) |
| [DECISION-028](DECISION-028-Learning-Session-Domain.md) | Learning Session is an independent Core Domain (Orchestrator over Goal/Roadmap/Knowledge/Evidence/Assessment/Recommendation) | Accepted (Locked) — 🔶 Sub Session ↔ MentorSession relationship open |
| [DECISION-029](DECISION-029-Cycle-Detection-Strategy.md) | Knowledge Graph cycle detection = Runtime Reachability Check (no closure table for v1) | Accepted (Locked) — closes Open Question #19 |
| [DECISION-030](DECISION-030-Assessment-Result-Granularity.md) | AssessmentResult must carry KnowledgeNode/Remember/Explain/Apply/Teach/Confidence/Evidence References/Reasoning — no plain Pass/Fail or score | Accepted (Locked) — 🔶 narrows but does not close Open Question #20 |
| [DECISION-031](DECISION-031-SubSession-vs-MentorSession.md) | SubSession and MentorSession are distinct entities — LearningSession → SubSession → MentorSession hierarchy | Accepted (Locked) — closes Open Question #22 |
| [DECISION-032](DECISION-032-Immutable-Goal.md) | Goal is immutable — Goal change creates a new Goal and archives the old LearningSession | Accepted (Locked) — closes Open Question #23 |
| [DECISION-033](DECISION-033-Adaptive-Pause.md) | Auto Pause has no fixed threshold — Recommendation Engine may propose pause, Learner confirms | Accepted (Locked) — closes Open Question #24 |
| *(DECISION-034 — không được cấp số trong kênh này; gap số giữ nguyên, không tự đánh số bù)* | — | — |
| [DECISION-035](DECISION-035-No-Full-Event-Sourcing.md) | No Full Event Sourcing — append-only Evidence/Assessment History + Current State Snapshot | Accepted (Locked) |
| [DECISION-036](DECISION-036-LearningProfile-Is-Projection.md) | LearningProfile is a Projection — not a Core Domain, not an Aggregate Root | Accepted (Locked) — closes PersistenceArchitecture.md Open Question #1 |
| [DECISION-037](DECISION-037-Right-To-Be-Forgotten-Anonymization.md) | Right to Be Forgotten via Anonymization — no Hard Delete for learning data | Accepted (Locked) — closes PersistenceArchitecture.md Risk #3 / Open Question #5 |
| [DECISION-038](DECISION-038-Traceability-Model.md) | Traceability Model = TraceLink — no Polymorphic FK as primary model for cross-system traceability (Recommendation/Assessment/Evidence) | Accepted (Locked) — closes LogicalDatabaseModel.md Risk #1 / Open Question #1 |
| [DECISION-039](DECISION-039-Knowledge-Graph-Persistence.md) | Knowledge Graph Persistence — relational tables + Recursive CTE, no SQL Server Graph Extensions for v1 | Accepted (Locked) — closes PhysicalDesignPreparation.md mục 7 Nhóm A item |
| [DECISION-040](DECISION-040-Physical-Database-Design-Split.md) | Physical Database Design split into Step 4A (Database Blueprint) and Step 4B (DDL Generation) | Accepted (Locked) |
| *(DECISION-041 — không được cấp số trong kênh này; gap số giữ nguyên, không tự đánh số bù)* | — | — |
| [DECISION-042](DECISION-042-Database-Naming-Convention-Alignment.md) | Database Naming Convention Alignment — `snake_case` for PostgreSQL/Supabase (supersedes PascalCase) | Accepted (Locked) — ⛔ **Superseded by [DECISION-058](DECISION-058-MongoDB-Canonical-Persistence-Store.md)** (Postgres/Supabase track never implemented; MongoDB is canonical) |
| [DECISION-043](DECISION-043-Supabase-Auth-Alignment.md) | Supabase Auth Alignment — `learner.id = auth.users.id` (shared UUID, no separate mapping) | Accepted (Locked) — ⛔ **Superseded by [DECISION-058](DECISION-058-MongoDB-Canonical-Persistence-Store.md)** |
| [DECISION-044](DECISION-044-Versioning-Strategy.md) | Versioning Strategy — `version_number` (trigger-incremented bigint), not `rowversion`-equivalent or `updated_at`-only | Accepted (Locked) — ⛔ **Superseded by [DECISION-058](DECISION-058-MongoDB-Canonical-Persistence-Store.md)** (Mongo implementation uses `aggregateVersion`) |
| [DECISION-045](DECISION-045-Temporal-Strategy.md) | Temporal Strategy — trigger-maintained History Tables, only where no companion log exists | Accepted (Locked) — ⛔ **Superseded by [DECISION-058](DECISION-058-MongoDB-Canonical-Persistence-Store.md)** (no RLS/trigger equivalent in Mongo; app-layer enforcement instead) |
| *(DECISION-046 — Hybrid AI Execution Model, proposed in HybridAIArchitectureReview.md, vẫn là proposal mở — chưa khóa)* | — | — |
| [DECISION-047](DECISION-047-Learning-Session-Transition-Log.md) | Learning Session Transition Log (`learning_session_transition`) — Supporting Persistence Entity, not a Domain Entity/Aggregate/Domain | Accepted (Locked) — closes DDL_ROUND1_REVIEW.md NEEDS_REVISION item |
| [DECISION-048](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | All AI Decisions Must Be Explainable — extends DECISION-027 scope from 3 groups to all 10 AI Decision Types (D1-D9b); Explainability and Persistence are independent dimensions (no Decision Type fully exempt) | Accepted (Locked) — 🔶 D8 Runtime Reconstruction condition + D9a/D9b mechanism still open, see [DECISION-048_LOCK_REPORT.md](../06_Database/DECISION-048_LOCK_REPORT.md) |
| [DECISION-049](DECISION-049-Decision-Persistence-Mechanism.md) | Decision Persistence Mechanism | Accepted (Locked) |
| [DECISION-050](DECISION-050-SQL-PreGeneration-Finalization.md) | SQL Pre-Generation Finalization | Accepted (Locked) |
| [DECISION-051](DECISION-051-Self-Assessment-Mismatch-Mechanism.md) | Self-Assessment Mismatch Mechanism | Accepted (Locked) — closes OQ5 |
| [DECISION-052](DECISION-052-Teach-Capability-Composite-Weighting.md) | Teach Capability Composite Weighting | Accepted (Locked) — closes OQ12 |
| [DECISION-053](DECISION-053-Evidence-Weighting-and-Knowledge-Regression.md) | Evidence Weighting and Knowledge Regression | Accepted (Locked) — closes OQ13 |
| [DECISION-054](DECISION-054-Discovery-Session-Concurrency-Policy.md) | Discovery Session Concurrency Policy | Accepted (Locked) |
| [DECISION-055](DECISION-055-Discovery-Schema-Reconciliation.md) | Discovery Schema Reconciliation | Accepted (Locked) |
| [DECISION-056](DECISION-056-Canonical-Typed-Identifiers.md) | Canonical Typed Identifiers — branded ID value objects (GoalId, RoadmapId, AssessmentId, RecommendationId, LearnerId, SkillId, etc.) replace raw strings in the domain layer | Accepted (Locked) — WP-06C Workstream A+H |
| [DECISION-057](DECISION-057-Canonical-Skill-Catalog.md) | Canonical Skill Catalog — `Skill`/`SkillId` module replaces free-text `skillArea` in Assessment/Recommendation | Accepted (Locked) — WP-06C Workstream B |
| [DECISION-058](DECISION-058-MongoDB-Canonical-Persistence-Store.md) | MongoDB as Canonical Persistence Store — supersedes the Postgres/Supabase track (DECISION-042/043/044/045) | Accepted (Locked) — WP-06C Workstream D |
| [DECISION-059](DECISION-059-Platform-Orchestration-Layer.md) | Platform Orchestration Layer — event-driven staleness propagation Goal→Roadmap→Assessment→Recommendation, no direct aggregate mutation | Accepted (Locked) — WP-06C Workstream F |

"🔶 chi tiết open" nghĩa là quyết định cốt lõi đã khóa, nhưng một chi tiết thực thi cụ thể vẫn chờ Founder xác nhận trong [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) — không chặn việc quyết định gốc được coi là Locked.
