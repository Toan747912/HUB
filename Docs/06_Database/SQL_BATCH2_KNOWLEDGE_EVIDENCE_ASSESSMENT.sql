-- =====================================================================
-- SQL BATCH 2 — KNOWLEDGE + EVIDENCE + ASSESSMENT
-- AI Mentor OS — PostgreSQL / Supabase
--
-- Scope: knowledge_node, knowledge_edge, roadmap_node_knowledge_node,
-- evidence, evidence_link, knowledge_node_mastery, assessment_result,
-- trace_link, expansion_record, history.knowledge_node — exactly the
-- 10 tables listed for this batch. No entity outside this list.
--
-- Requires SQL_BATCH0_INFRASTRUCTURE.sql and
-- SQL_BATCH1_IDENTITY_GOAL_ROADMAP.sql to have already run (learner,
-- roadmap_node must already exist; fn_set_updated_at,
-- fn_increment_version_number, fn_write_history must already exist).
--
-- NOT closed in this batch (deliberately): sub_session.knowledge_node_id
-- FK — sub_session does not exist yet (Learning Session Module batch
-- has not run). This closure must happen in/after whichever batch
-- creates sub_session, never before. See SQL_BATCH2_REVIEW.md mục 0.
--
-- evidence.mentor_session_id stays a placeholder column (NULL,
-- no FK) — mentor_session does not exist until the Round 4 batch.
--
-- No RLS policy is created in this batch (Batch 6 scope).
--
-- Source of authority: DDL_ROUND2_DESIGN.md, DDL_ROUND3_DESIGN.md mục
-- 1.1-1.2, DatabaseNamingConvention.md, DECISION-015, DECISION-022,
-- DECISION-025, DECISION-026, DECISION-029, DECISION-030, DECISION-038,
-- DECISION-039, DECISION-044, DECISION-045, DECISION-050.
-- =====================================================================


-- =====================================================================
-- 1. knowledge_node
-- =====================================================================
-- Current State Snapshot. Root of the Knowledge Graph — no FK (this
-- table has no dependency on anything created in Batch 0/1).
-- =====================================================================

CREATE TABLE public.knowledge_node (
  knowledge_node_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  title                   text        NOT NULL,
  description             text        NULL,
  domain_category         text        NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type   text        NOT NULL,
  created_by_actor_id     uuid        NULL,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_type   text        NOT NULL,
  updated_by_actor_id     uuid        NULL,

  CONSTRAINT pk_knowledge_node PRIMARY KEY (knowledge_node_id),

  -- Open-list proposal (DDL_ROUND2_DESIGN.md mục 1.1) — not locked by any
  -- Decision Log entry. Implemented as designed; see
  -- SQL_BATCH2_REVIEW.md for the open item (MVP domain scope, PRD
  -- OpenQuestions #3, still unresolved).
  CONSTRAINT ck_knowledge_node_domain_category
    CHECK (domain_category IN (
      'programming', 'ai', 'design', 'language', 'marketing', 'business', 'career_skill'
    )),

  CONSTRAINT ck_knowledge_node_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_knowledge_node_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.knowledge_node IS
  'Knowledge Module. Shared, global unit of knowledge — not owned by any single Learner/Roadmap. No dedup rule for semantically duplicate nodes (known gap, DatabaseBlueprint.md mục 1.6).';

CREATE TRIGGER trg_knowledge_node_set_updated_at
  BEFORE UPDATE ON public.knowledge_node
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_knowledge_node_write_history
  AFTER UPDATE ON public.knowledge_node
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_write_history();


-- =====================================================================
-- 2. history.knowledge_node
-- =====================================================================
-- HARD CONTRACT with fn_write_history(): column list mirrors
-- public.knowledge_node exactly, in order, + trailing valid_from. No PK
-- (same now()-frozen-per-transaction reasoning as history.learner —
-- see SQL_BATCH1_REVIEW.md mục 4 / SQL_BATCH2_REVIEW.md mục 8).
-- =====================================================================

CREATE TABLE history.knowledge_node (
  knowledge_node_id       uuid        NOT NULL,
  title                   text        NOT NULL,
  description             text        NULL,
  domain_category         text        NOT NULL,
  created_at              timestamptz NOT NULL,
  created_by_actor_type   text        NOT NULL,
  created_by_actor_id     uuid        NULL,
  updated_at              timestamptz NOT NULL,
  updated_by_actor_type   text        NOT NULL,
  updated_by_actor_id     uuid        NULL,
  valid_from              timestamptz NOT NULL
);

COMMENT ON TABLE history.knowledge_node IS
  'Trigger-maintained history of public.knowledge_node (DECISION-045). Maintained exclusively by trg_knowledge_node_write_history.';

CREATE INDEX ix_history_knowledge_node_knowledge_node_id ON history.knowledge_node (knowledge_node_id);
CREATE INDEX ix_history_knowledge_node_valid_from ON history.knowledge_node (valid_from);


-- =====================================================================
-- 3. knowledge_edge
-- =====================================================================
-- Append-only / immutable (DECISION-025/029 — edges are never edited or
-- removed, only added). Directed edge in a DAG. Multi-parent is
-- supported natively: nothing prevents N different from_knowledge_node_id
-- rows pointing to the same to_knowledge_node_id. Cycle prevention is
-- NOT enforced here beyond the trivial 1-hop self-loop check —
-- multi-hop cycle detection is Application Layer Runtime Reachability
-- Check (DECISION-029), not a DB constraint, not a closure table.
-- =====================================================================

CREATE TABLE public.knowledge_edge (
  knowledge_edge_id          uuid        NOT NULL,
  from_knowledge_node_id      uuid        NOT NULL,
  to_knowledge_node_id        uuid        NOT NULL,
  relation_type                text        NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type        text        NOT NULL,
  created_by_actor_id           uuid        NULL,

  CONSTRAINT pk_knowledge_edge PRIMARY KEY (knowledge_edge_id),

  CONSTRAINT fk_knowledge_edge_from_knowledge_node_id
    FOREIGN KEY (from_knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_knowledge_edge_to_knowledge_node_id
    FOREIGN KEY (to_knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  -- Proposed, not yet Decision-Log-locked (DDL_ROUND2_DESIGN.md mục 1.2)
  -- — implemented as designed; see SQL_BATCH2_REVIEW.md open item.
  CONSTRAINT uq_knowledge_edge_from_to_relation_type
    UNIQUE (from_knowledge_node_id, to_knowledge_node_id, relation_type),

  CONSTRAINT ck_knowledge_edge_no_self_loop
    CHECK (from_knowledge_node_id <> to_knowledge_node_id),

  -- Open-list proposal — not locked. See SQL_BATCH2_REVIEW.md.
  CONSTRAINT ck_knowledge_edge_relation_type
    CHECK (relation_type IN ('expands_to', 'prerequisite_of', 'related_to')),

  CONSTRAINT ck_knowledge_edge_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.knowledge_edge IS
  'Knowledge Module. Directed edge, multi-parent DAG (DECISION-025). No depth/closure-table column — Application Layer Recursive CTE for traversal and Runtime Reachability Check for cycle prevention (DECISION-029/039), not enforced at DB level beyond ck_knowledge_edge_no_self_loop.';

CREATE INDEX ix_knowledge_edge_from_knowledge_node_id ON public.knowledge_edge (from_knowledge_node_id);
CREATE INDEX ix_knowledge_edge_to_knowledge_node_id ON public.knowledge_edge (to_knowledge_node_id);


-- =====================================================================
-- 4. roadmap_node_knowledge_node
-- =====================================================================
-- Dependency Edge bridge table — the only connection between the
-- Roadmap Graph and the Knowledge Graph (DECISION-015). Soft-removable
-- via removed_at (no hard delete, no separate updated_at group — this
-- is the only mutable field).
-- =====================================================================

CREATE TABLE public.roadmap_node_knowledge_node (
  roadmap_node_knowledge_node_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
  roadmap_node_id                   uuid        NOT NULL,
  knowledge_node_id                  uuid        NOT NULL,
  removed_at                          timestamptz NULL,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                text        NOT NULL,
  created_by_actor_id                   uuid        NULL,

  CONSTRAINT pk_roadmap_node_knowledge_node PRIMARY KEY (roadmap_node_knowledge_node_id),

  CONSTRAINT fk_roadmap_node_knowledge_node_roadmap_node_id
    FOREIGN KEY (roadmap_node_id) REFERENCES public.roadmap_node (roadmap_node_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_roadmap_node_knowledge_node_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_roadmap_node_knowledge_node_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.roadmap_node_knowledge_node IS
  'Roadmap ↔ Knowledge Graph bridge (DECISION-015). removed_at NULL = dependency currently active; NOT NULL = removed via an approved structural change — never hard-deleted (soft-delete principle, no generic is_active flag).';

-- Partial unique index — only one *active* dependency per (roadmap_node, knowledge_node) pair.
CREATE UNIQUE INDEX uq_roadmap_node_knowledge_node_active
  ON public.roadmap_node_knowledge_node (roadmap_node_id, knowledge_node_id)
  WHERE removed_at IS NULL;

CREATE INDEX ix_roadmap_node_knowledge_node_roadmap_node_id ON public.roadmap_node_knowledge_node (roadmap_node_id);
CREATE INDEX ix_roadmap_node_knowledge_node_knowledge_node_id ON public.roadmap_node_knowledge_node (knowledge_node_id);


-- =====================================================================
-- 5. evidence
-- =====================================================================
-- Append-only / immutable. evidence_id generated at the Application
-- Layer (ULID-style) — no DEFAULT. mentor_session_id is a placeholder
-- column: mentor_session does not exist until the Round 4 batch, so no
-- FK is added here (intentional forward dependency, per
-- DDL_ROUND2_DESIGN.md mục 1.4).
-- =====================================================================

CREATE TABLE public.evidence (
  evidence_id              uuid        NOT NULL,
  learner_id                uuid        NOT NULL,
  mentor_session_id          uuid        NULL,
  source_type                 text        NOT NULL,
  raw_reference                 jsonb       NOT NULL,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type          text        NOT NULL,
  created_by_actor_id              uuid        NULL,

  CONSTRAINT pk_evidence PRIMARY KEY (evidence_id),

  CONSTRAINT fk_evidence_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  -- No FK on mentor_session_id yet — mentor_session does not exist in
  -- this batch. Added in the Round 4 batch (SQL_BATCH4_*).

  CONSTRAINT ck_evidence_source_type
    CHECK (source_type IN ('mentor_session', 'submission', 'discovery_session')),

  CONSTRAINT ck_evidence_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.evidence IS
  'Evidence Module. Immutable raw learning evidence. mentor_session_id is a forward-dependency placeholder — FK added once mentor_session exists (Round 4 batch). evidence_id generated at the Application Layer (ULID-style).';

CREATE INDEX ix_evidence_learner_id ON public.evidence (learner_id);
CREATE INDEX ix_evidence_mentor_session_id ON public.evidence (mentor_session_id);


-- =====================================================================
-- 6. evidence_link
-- =====================================================================
-- Append-only / immutable, child of evidence (Aggregate). stance
-- replaces the rejected positive_evidence/negative_evidence split
-- (DECISION-022): support = Positive, refute = Negative.
-- =====================================================================

CREATE TABLE public.evidence_link (
  evidence_link_id              uuid           NOT NULL,
  evidence_id                     uuid           NOT NULL,
  knowledge_node_id                 uuid           NOT NULL,
  stance                              text           NOT NULL,
  evidence_weight                       numeric(4,3)   NOT NULL,
  target_mastery_dimension                text           NOT NULL,
  created_at                                timestamptz    NOT NULL DEFAULT now(),
  created_by_actor_type                       text           NOT NULL,
  created_by_actor_id                           uuid           NULL,

  CONSTRAINT pk_evidence_link PRIMARY KEY (evidence_link_id),

  CONSTRAINT fk_evidence_link_evidence_id
    FOREIGN KEY (evidence_id) REFERENCES public.evidence (evidence_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_evidence_link_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  -- Proposed, not yet Decision-Log-locked (DDL_ROUND2_DESIGN.md mục 1.5)
  -- — implemented as designed; see SQL_BATCH2_REVIEW.md open item.
  CONSTRAINT uq_evidence_link_evidence_id_knowledge_node_id_stance
    UNIQUE (evidence_id, knowledge_node_id, stance),

  CONSTRAINT ck_evidence_link_stance
    CHECK (stance IN ('support', 'refute')),

  -- Upper bound not locked (formula for evidence_weight not finalized,
  -- DECISION-021 Gap 5) — only the floor is enforced.
  CONSTRAINT ck_evidence_link_evidence_weight_non_negative
    CHECK (evidence_weight >= 0),

  CONSTRAINT ck_evidence_link_target_mastery_dimension
    CHECK (target_mastery_dimension IN (
      'remember', 'explain_level', 'apply',
      'teach_explain', 'teach_simplify', 'teach_guide', 'teach_review', 'teach_transfer_knowledge'
    )),

  CONSTRAINT ck_evidence_link_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.evidence_link IS
  'Evidence Module, child of evidence. stance (support/refute) is the locked replacement for positive_evidence/negative_evidence (DECISION-022, NamingIssueResolution.md mục 5) — never use a bare "type" column for direction.';

CREATE INDEX ix_evidence_link_evidence_id ON public.evidence_link (evidence_id);
CREATE INDEX ix_evidence_link_knowledge_node_id ON public.evidence_link (knowledge_node_id);


-- =====================================================================
-- 7. assessment_result
-- =====================================================================
-- Append-only / immutable. Primary explainability artifact for
-- Assessment (DECISION-026/030). 8/8 mandatory fields per
-- DECISION-030: knowledge_node_id, remember_level, explain_level,
-- apply_level, teach_score, teach_capability_scores, confidence,
-- reasoning — field 7/8 ("Evidence References") is NOT a column here,
-- it lives in trace_link (table 8 below).
--
-- decision_header_id is NOT added in this batch — that column belongs
-- to the Round 5 closure (DECISION-049), after decision_header exists.
-- =====================================================================

CREATE TABLE public.assessment_result (
  assessment_result_id          uuid           NOT NULL,
  learner_id                      uuid           NOT NULL,
  knowledge_node_id                  uuid           NOT NULL,
  remember_level                       boolean        NOT NULL,
  explain_level                          boolean        NOT NULL,
  apply_level                               boolean        NOT NULL,
  teach_score                                 numeric(4,3)   NOT NULL,
  teach_capability_scores                       jsonb          NOT NULL DEFAULT '{}',
  confidence                                      numeric(3,2)   NOT NULL,
  reasoning                                         text           NOT NULL,
  created_at                                          timestamptz    NOT NULL DEFAULT now(),
  created_by_actor_type                                 text           NOT NULL,
  created_by_actor_id                                     uuid           NULL,

  CONSTRAINT pk_assessment_result PRIMARY KEY (assessment_result_id),

  CONSTRAINT fk_assessment_result_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_assessment_result_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_assessment_result_teach_score_range
    CHECK (teach_score >= 0 AND teach_score <= 1),

  CONSTRAINT ck_assessment_result_confidence_range
    CHECK (confidence >= 0 AND confidence <= 1),

  CONSTRAINT ck_assessment_result_reasoning_not_empty
    CHECK (length(trim(reasoning)) > 0),

  CONSTRAINT ck_assessment_result_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.assessment_result IS
  'Assessment Module — write-owner Assessment Domain (DECISION-026), not Knowledge Graph Domain, despite grouping in this batch file. 8/8 mandatory fields per DECISION-030. Evidence References (field 7/8) is via trace_link, not a column here — see Validation mục 4/6 in SQL_BATCH2_REVIEW.md for the known Application-Layer-only integrity gap.';

CREATE INDEX ix_assessment_result_learner_id_knowledge_node_id ON public.assessment_result (learner_id, knowledge_node_id);


-- =====================================================================
-- 8. knowledge_node_mastery
-- =====================================================================
-- Current State Snapshot — write-owner Assessment Domain (DECISION-026),
-- grouped in this batch file alongside Knowledge Module per the task's
-- table list. Must be created AFTER assessment_result
-- (last_assessment_result_id is NOT NULL).
-- =====================================================================

CREATE TABLE public.knowledge_node_mastery (
  knowledge_node_mastery_id       uuid           NOT NULL DEFAULT gen_random_uuid(),
  learner_id                        uuid           NOT NULL,
  knowledge_node_id                    uuid           NOT NULL,
  remember_level                          boolean        NOT NULL DEFAULT false,
  explain_level                              boolean        NOT NULL DEFAULT false,
  apply_level                                   boolean        NOT NULL DEFAULT false,
  teach_score                                     numeric(4,3)   NOT NULL DEFAULT 0,
  teach_capability_scores                           jsonb          NOT NULL DEFAULT '{}',
  confidence                                          numeric(3,2)   NULL,
  last_assessment_result_id                             uuid           NOT NULL,
  version_number                                          bigint         NOT NULL DEFAULT 1,
  created_at                                                timestamptz    NOT NULL DEFAULT now(),
  created_by_actor_type                                       text           NOT NULL,
  created_by_actor_id                                           uuid           NULL,
  updated_at                                                      timestamptz    NOT NULL DEFAULT now(),
  updated_by_actor_type                                             text           NOT NULL,
  updated_by_actor_id                                                 uuid           NULL,

  CONSTRAINT pk_knowledge_node_mastery PRIMARY KEY (knowledge_node_mastery_id),

  CONSTRAINT fk_knowledge_node_mastery_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_knowledge_node_mastery_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_knowledge_node_mastery_last_assessment_result_id
    FOREIGN KEY (last_assessment_result_id) REFERENCES public.assessment_result (assessment_result_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_knowledge_node_mastery_learner_id_knowledge_node_id
    UNIQUE (learner_id, knowledge_node_id),

  CONSTRAINT ck_knowledge_node_mastery_teach_score_range
    CHECK (teach_score >= 0 AND teach_score <= 1),

  CONSTRAINT ck_knowledge_node_mastery_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

  CONSTRAINT ck_knowledge_node_mastery_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_knowledge_node_mastery_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.knowledge_node_mastery IS
  'Assessment Module — write-owner Assessment Domain. last_assessment_result_id is mandatory, non-nullable explainability backlink (DatabaseBlueprint.md mục 1.11) — this row is never self-sufficient for audit, always join assessment_result. version_number is mandatory here (DECISION-044, highest identified concurrent-write risk).';

CREATE TRIGGER trg_knowledge_node_mastery_set_updated_at
  BEFORE UPDATE ON public.knowledge_node_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_knowledge_node_mastery_increment_version_number
  BEFORE UPDATE ON public.knowledge_node_mastery
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_increment_version_number();

-- uq_knowledge_node_mastery_learner_id_knowledge_node_id already
-- provides the point-lookup index (Hot Path #1) — no separate index
-- needed for (learner_id, knowledge_node_id).


-- =====================================================================
-- 9. trace_link
-- =====================================================================
-- Append-only / immutable, cross-cutting infrastructure (DECISION-038).
-- No physical FK on source_id/target_id — polymorphic by design, not a
-- gap (PostgreSQL cannot express a conditional FK based on a sibling
-- column's value). Referential integrity here is entirely an
-- Application Layer responsibility.
--
-- The CHECK lists below are the original Round 1-2 baseline values
-- only. The Round 4 batch will ALTER this constraint to add
-- 'recommendation_proposal'/'discovery_session' usage already
-- anticipated in this baseline list; the Round 5 batch will ALTER it
-- again per DECISION-050 item 5 (renamed values). Do not pre-add those
-- values here — each enum extension happens in the batch that
-- introduces the corresponding entity.
-- =====================================================================

CREATE TABLE public.trace_link (
  trace_link_id          uuid        NOT NULL,
  source_type              text        NOT NULL,
  source_id                  uuid        NOT NULL,
  target_type                  text        NOT NULL,
  target_id                      uuid        NOT NULL,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type              text        NOT NULL,
  created_by_actor_id                  uuid        NULL,

  CONSTRAINT pk_trace_link PRIMARY KEY (trace_link_id),

  -- Proposed, not yet Decision-Log-locked (DDL_ROUND2_DESIGN.md mục 1.7)
  -- — implemented as designed; see SQL_BATCH2_REVIEW.md open item.
  CONSTRAINT uq_trace_link_source_target
    UNIQUE (source_type, source_id, target_type, target_id),

  CONSTRAINT ck_trace_link_source_type
    CHECK (source_type IN ('assessment_result', 'recommendation_proposal', 'local_expansion')),

  CONSTRAINT ck_trace_link_target_type
    CHECK (target_type IN ('evidence', 'assessment_result', 'discovery_session')),

  CONSTRAINT ck_trace_link_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.trace_link IS
  'Traceability Module — cross-cutting infrastructure (DECISION-038), not owned by any Core Domain. No physical FK on source_id/target_id by design (polymorphic, no Polymorphic-FK-on-business-entity pattern). source_type/target_type enum extended in later batches as new traceable entities are introduced — never modify the meaning of an existing value, only add new ones.';

CREATE INDEX ix_trace_link_source_type_source_id ON public.trace_link (source_type, source_id);
CREATE INDEX ix_trace_link_target_type_target_id ON public.trace_link (target_type, target_id);


-- =====================================================================
-- 10. expansion_record
-- =====================================================================
-- Append-only / immutable. Mandatory explainability artifact for Deep/
-- Structural Knowledge Node Expansion (DECISION-023) — distinct from
-- Local Expansion (D5), which uses local_expansion_decision_detail
-- (Round 5 batch), not this table.
--
-- decision_header_id is NOT added in this batch — Round 5 closure.
-- =====================================================================

CREATE TABLE public.expansion_record (
  expansion_record_id        uuid        NOT NULL,
  knowledge_node_id             uuid        NOT NULL,
  expansion_class                  text        NOT NULL,
  expansion_reason                    text        NOT NULL,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                   text        NOT NULL,
  created_by_actor_id                       uuid        NULL,

  CONSTRAINT pk_expansion_record PRIMARY KEY (expansion_record_id),

  CONSTRAINT fk_expansion_record_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  -- Proposed, not yet Decision-Log-locked (DDL_ROUND3_DESIGN.md mục 1.2)
  -- — implemented as designed; see SQL_BATCH2_REVIEW.md open item.
  CONSTRAINT ck_expansion_record_expansion_class
    CHECK (expansion_class IN ('deep', 'structural')),

  CONSTRAINT ck_expansion_record_reason_not_empty
    CHECK (length(trim(expansion_reason)) > 0),

  CONSTRAINT ck_expansion_record_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.expansion_record IS
  'Knowledge Module. Mandatory, Learner-facing explainability log for Deep/Structural Expansion (DECISION-023) — NOT used for Local Expansion (that is D5, local_expansion_decision_detail, Round 5 batch). No FK to a specific knowledge_edge created by this expansion (known gap, cardinality not locked by Domain Architecture).';

CREATE INDEX ix_expansion_record_knowledge_node_id ON public.expansion_record (knowledge_node_id);


-- =====================================================================
-- END OF BATCH 2
--
-- Result after this batch:
--   - 9 business tables: knowledge_node, knowledge_edge,
--     roadmap_node_knowledge_node, evidence, evidence_link,
--     assessment_result, knowledge_node_mastery, trace_link,
--     expansion_record
--   - 1 history table: history.knowledge_node
--   - 4 trigger attachments (2 on knowledge_node, 2 on
--     knowledge_node_mastery)
--   - 1 partial unique index (roadmap_node_knowledge_node)
--   - zero RLS policies
--   - zero closure ALTERs (sub_session.knowledge_node_id deferred until
--     sub_session exists; evidence.mentor_session_id deferred until
--     mentor_session exists)
--
-- Next: Learning Session Module batch (if not already run), then
-- Round 4 batch (Discovery / Mentor Interaction / Recommendation).
-- =====================================================================
