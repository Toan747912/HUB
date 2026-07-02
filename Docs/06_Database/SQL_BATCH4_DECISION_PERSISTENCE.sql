-- =====================================================================
-- SQL BATCH 4 — DECISION PERSISTENCE
-- AI Mentor OS — PostgreSQL / Supabase
--
-- Scope: decision_header + 5 Detail tables (teaching_decision_detail,
-- local_expansion_decision_detail, roadmap_mapping_decision_detail,
-- stuck_detection_decision_detail, intervention_decision_detail) +
-- 4 decision_header_id patches on existing tables. Implements
-- DECISION-049 (Decision Persistence Mechanism) and DECISION-050
-- (SQL Pre-Generation Finalization) exactly as locked.
--
-- Requires Batch 0-3 to have already run (learner, knowledge_node,
-- mentor_session, sub_session, roadmap_node_knowledge_node,
-- assessment_result, recommendation_proposal, expansion_record,
-- self_assessment_mismatch, trace_link must already exist).
--
-- No RLS policy is created in this batch (Batch 6 scope). No
-- aggregate redesign — every Detail table only adds a reference
-- (decision_header_id) on top of structures already locked in
-- Round 1-4; no existing column is altered or removed.
--
-- Source of authority: DDL_ROUND5_DESIGN.md, DECISION-044,
-- DECISION-045, DECISION-049-Decision-Persistence-Mechanism.md,
-- DECISION-050-SQL-PreGeneration-Finalization.md.
-- =====================================================================


-- =====================================================================
-- 1. decision_header
-- =====================================================================
-- Append-only / immutable. Supporting Persistence Entity — cross-
-- cutting, owned by no Domain (same standing as trace_link). decision_
-- header_id generated at the Application Layer (ULID-style), no
-- DEFAULT. Per DECISION-049: NOT a Domain Entity, NOT an Aggregate
-- Root. Carries NO detail_type/detail_id, NO source_*/target_* column
-- — Detail tables point back to Header (mục 4 below), Header never
-- points to Detail, and Header is fully separate from trace_link.
-- =====================================================================

CREATE TABLE public.decision_header (
  decision_header_id     uuid        NOT NULL,
  learner_id                uuid        NOT NULL,
  decision_type                text        NOT NULL,
  capability_or_domain            text        NOT NULL,
  occurred_at                       timestamptz NOT NULL DEFAULT now(),
  summary_reason                      text        NOT NULL,
  created_at                            timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                   text        NOT NULL,
  created_by_actor_id                       uuid        NULL,

  CONSTRAINT pk_decision_header PRIMARY KEY (decision_header_id),

  CONSTRAINT fk_decision_header_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_decision_header_decision_type
    CHECK (decision_type IN ('D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9a', 'D9b')),

  CONSTRAINT ck_decision_header_capability_or_domain
    CHECK (capability_or_domain IN (
      'teaching_capability', 'assessment_domain', 'recommendation_domain',
      'knowledge_graph_domain', 'goal_roadmap_domain', 'discovery_domain',
      'mentor_interaction_domain'
    )),

  CONSTRAINT ck_decision_header_summary_reason_not_empty
    CHECK (length(trim(summary_reason)) > 0),

  CONSTRAINT ck_decision_header_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.decision_header IS
  'Decision Persistence Mechanism (DECISION-049, locked). Supporting Persistence Entity, cross-cutting, no Domain owner. No detail_type/detail_id (Detail tables point back via decision_header_id, never the reverse). No source_*/target_* column (that is trace_link''s exclusive territory — Header and TraceLink remain fully separate, DECISION-049 mục 4). Required for ALL 10 decision types (D1-D9b), including D8, which has no Detail table.';

CREATE INDEX ix_decision_header_learner_id ON public.decision_header (learner_id);
CREATE INDEX ix_decision_header_decision_type ON public.decision_header (decision_type);

-- decision_header is append-only — no updated_at, no fn_set_updated_at,
-- no version_number, no history table (not one of the 4 tables locked
-- by DECISION-045).


-- =====================================================================
-- 2. teaching_decision_detail  (D1 — Teaching Capability)
-- =====================================================================
-- Append-only / immutable. Closes GAP-01 (D1 Teaching Content
-- Selection had 0% persistence).
-- =====================================================================

CREATE TABLE public.teaching_decision_detail (
  teaching_decision_detail_id     uuid        NOT NULL,
  decision_header_id                uuid        NOT NULL,
  mentor_session_id                    uuid        NOT NULL,
  knowledge_node_id                       uuid        NOT NULL,
  selection_reasoning                        text        NOT NULL,
  created_at                                   timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                          text        NOT NULL,
  created_by_actor_id                              uuid        NULL,

  CONSTRAINT pk_teaching_decision_detail PRIMARY KEY (teaching_decision_detail_id),

  CONSTRAINT fk_teaching_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_teaching_decision_detail_mentor_session_id
    FOREIGN KEY (mentor_session_id) REFERENCES public.mentor_session (mentor_session_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_teaching_decision_detail_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_teaching_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  CONSTRAINT ck_teaching_decision_detail_selection_reasoning_not_empty
    CHECK (length(trim(selection_reasoning)) > 0),

  CONSTRAINT ck_teaching_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.teaching_decision_detail IS
  'D1 Detail (Teaching Capability). Closes GAP-01. Exactly 0 or 1 row per decision_header (uq_teaching_decision_detail_decision_header_id). TraceLink-eligible as source_type = ''teaching_decision_detail'' (DECISION-050 item 5 naming).';

CREATE INDEX ix_teaching_decision_detail_mentor_session_id ON public.teaching_decision_detail (mentor_session_id);
CREATE INDEX ix_teaching_decision_detail_knowledge_node_id ON public.teaching_decision_detail (knowledge_node_id);
-- uq_teaching_decision_detail_decision_header_id already indexes decision_header_id.


-- =====================================================================
-- 3. local_expansion_decision_detail  (D5 — Knowledge Graph Domain)
-- =====================================================================
-- Append-only / immutable. Closes GAP-02 (D5 Local Expansion had no
-- internal reason log). Distinct from expansion_record (D4, Deep/
-- Structural, Learner-facing) — this reasoning is internal-only.
-- =====================================================================

CREATE TABLE public.local_expansion_decision_detail (
  local_expansion_decision_detail_id     uuid        NOT NULL,
  decision_header_id                       uuid        NOT NULL,
  knowledge_node_id                           uuid        NOT NULL,
  expansion_reasoning                            text        NOT NULL,
  created_at                                       timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                              text        NOT NULL,
  created_by_actor_id                                  uuid        NULL,

  CONSTRAINT pk_local_expansion_decision_detail PRIMARY KEY (local_expansion_decision_detail_id),

  CONSTRAINT fk_local_expansion_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_local_expansion_decision_detail_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_local_expansion_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  CONSTRAINT ck_local_expansion_decision_detail_expansion_reasoning_not_empty
    CHECK (length(trim(expansion_reasoning)) > 0),

  CONSTRAINT ck_local_expansion_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.local_expansion_decision_detail IS
  'D5 Detail (Knowledge Graph Domain). Closes GAP-02. Internal-only reasoning — NOT required to be Learner-facing (unlike expansion_record/D4). No FK to a specific knowledge_edge created by this expansion (inherited limitation, same as expansion_record — cardinality not locked by Domain Architecture).';

CREATE INDEX ix_local_expansion_decision_detail_knowledge_node_id ON public.local_expansion_decision_detail (knowledge_node_id);


-- =====================================================================
-- 4. roadmap_mapping_decision_detail  (D6 — Goal & Roadmap Domain)
-- =====================================================================
-- Append-only / immutable. Closes GAP-05/H-01 (Dependency Edge had no
-- reason column) WITHOUT modifying roadmap_node_knowledge_node
-- (Round 3 table left untouched, per DECISION-049/this batch's
-- "do not redesign existing aggregates" instruction).
-- =====================================================================

CREATE TABLE public.roadmap_mapping_decision_detail (
  roadmap_mapping_decision_detail_id     uuid        NOT NULL,
  decision_header_id                       uuid        NOT NULL,
  roadmap_node_knowledge_node_id              uuid        NOT NULL,
  mapping_reasoning                              text        NOT NULL,
  created_at                                       timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                              text        NOT NULL,
  created_by_actor_id                                  uuid        NULL,

  CONSTRAINT pk_roadmap_mapping_decision_detail PRIMARY KEY (roadmap_mapping_decision_detail_id),

  CONSTRAINT fk_roadmap_mapping_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_roadmap_mapping_decision_detail_roadmap_node_knowledge_node_id
    FOREIGN KEY (roadmap_node_knowledge_node_id) REFERENCES public.roadmap_node_knowledge_node (roadmap_node_knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_roadmap_mapping_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  CONSTRAINT ck_roadmap_mapping_decision_detail_mapping_reasoning_not_empty
    CHECK (length(trim(mapping_reasoning)) > 0),

  CONSTRAINT ck_roadmap_mapping_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.roadmap_mapping_decision_detail IS
  'D6 Detail (Goal & Roadmap Domain). Closes GAP-05/H-01 via a dedicated Detail table, not by modifying roadmap_node_knowledge_node (Round 3 table left exactly as locked). No TraceLink needed — the FK to roadmap_node_knowledge_node is already a single, unambiguous provenance source.';

CREATE INDEX ix_roadmap_mapping_decision_detail_roadmap_node_knowledge_node_id ON public.roadmap_mapping_decision_detail (roadmap_node_knowledge_node_id);


-- =====================================================================
-- 5. stuck_detection_decision_detail  (D9a — nearest Mentor Interaction Domain)
-- =====================================================================
-- Append-only / immutable. Persistence path for the Stuck Detection
-- *signal* — the detection ALGORITHM itself (PRD Open Question #6/#11)
-- remains unresolved and is NOT decided by this batch; signal_payload
-- is intentionally unstructured jsonb until that algorithm is locked.
-- =====================================================================

CREATE TABLE public.stuck_detection_decision_detail (
  stuck_detection_decision_detail_id     uuid        NOT NULL,
  decision_header_id                       uuid        NOT NULL,
  sub_session_id                              uuid        NOT NULL,
  signal_payload                                 jsonb       NOT NULL DEFAULT '{}',
  detection_reasoning                               text        NOT NULL,
  created_at                                          timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                                 text        NOT NULL,
  created_by_actor_id                                     uuid        NULL,

  CONSTRAINT pk_stuck_detection_decision_detail PRIMARY KEY (stuck_detection_decision_detail_id),

  CONSTRAINT fk_stuck_detection_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_stuck_detection_decision_detail_sub_session_id
    FOREIGN KEY (sub_session_id) REFERENCES public.sub_session (sub_session_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_stuck_detection_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  CONSTRAINT ck_stuck_detection_decision_detail_detection_reasoning_not_empty
    CHECK (length(trim(detection_reasoning)) > 0),

  CONSTRAINT ck_stuck_detection_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.stuck_detection_decision_detail IS
  'D9a Detail. Persistence path for the Stuck Detection signal exists, but the detection algorithm/threshold itself is still Open Question #6/#11 — signal_payload is deliberately unstructured jsonb, no CHECK on its shape, until that algorithm is locked by a future Decision.';

CREATE INDEX ix_stuck_detection_decision_detail_sub_session_id ON public.stuck_detection_decision_detail (sub_session_id);


-- =====================================================================
-- 6. intervention_decision_detail  (D9b — Teaching Capability)
-- =====================================================================
-- Append-only / immutable. Always a direct causal response to exactly
-- one stuck_detection_decision_detail row. intervention_tier is locked
-- to 2 values by DECISION-050 item 2 — 'direct_fix' was explicitly
-- removed (AI autonomy boundary: any intervention stronger than
-- guided_walkthrough must go through recommendation_proposal +
-- recommendation_proposal_response, never act unilaterally here).
-- =====================================================================

CREATE TABLE public.intervention_decision_detail (
  intervention_decision_detail_id     uuid        NOT NULL,
  decision_header_id                    uuid        NOT NULL,
  stuck_detection_decision_detail_id       uuid        NOT NULL,
  intervention_tier                           text        NOT NULL,
  intervention_reasoning                         text        NOT NULL,
  created_at                                       timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                              text        NOT NULL,
  created_by_actor_id                                  uuid        NULL,

  CONSTRAINT pk_intervention_decision_detail PRIMARY KEY (intervention_decision_detail_id),

  CONSTRAINT fk_intervention_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_intervention_decision_detail_stuck_detection_decision_detail_id
    FOREIGN KEY (stuck_detection_decision_detail_id) REFERENCES public.stuck_detection_decision_detail (stuck_detection_decision_detail_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_intervention_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  -- Locked by DECISION-050 item 2 — 'direct_fix' removed. Do not add it
  -- back without a new Decision Log entry reopening the AI autonomy
  -- boundary question.
  CONSTRAINT ck_intervention_decision_detail_intervention_tier
    CHECK (intervention_tier IN ('hint', 'guided_walkthrough')),

  CONSTRAINT ck_intervention_decision_detail_intervention_reasoning_not_empty
    CHECK (length(trim(intervention_reasoning)) > 0),

  CONSTRAINT ck_intervention_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.intervention_decision_detail IS
  'D9b Detail (Teaching Capability). intervention_tier locked to (hint, guided_walkthrough) by DECISION-050 item 2 — direct_fix removed on AI autonomy / Human Control Boundary grounds. Anything stronger must go through recommendation_proposal + recommendation_proposal_response, never act unilaterally via this table. No UNIQUE on stuck_detection_decision_detail_id — a single Stuck signal may receive multiple escalating interventions over time.';

CREATE INDEX ix_intervention_decision_detail_stuck_detection_decision_detail_id ON public.intervention_decision_detail (stuck_detection_decision_detail_id);


-- =====================================================================
-- PATCH EXISTING TABLES — add nullable decision_header_id FK
-- =====================================================================
-- No backfill, no data migration, no content-column redesign. Column
-- is nullable on all 4 tables: pre-DECISION-049 rows (if any existed)
-- have no Header, and Application Layer is expected — not DB-enforced
-- — to always populate it for any row created from now on
-- (DECISION-049 mục 5). Partial unique index (not a full UNIQUE)
-- because the column is nullable: a fully UNIQUE constraint would
-- otherwise reject more than 1 NULL... actually PostgreSQL UNIQUE
-- treats multiple NULLs as distinct (not a conflict), but the partial
-- form is used anyway for clarity and consistency with
-- roadmap_node_knowledge_node/discovery_session precedent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Patch 1: assessment_result (D2)
-- ---------------------------------------------------------------------

ALTER TABLE public.assessment_result
  ADD COLUMN decision_header_id uuid NULL;

ALTER TABLE public.assessment_result
  ADD CONSTRAINT fk_assessment_result_decision_header_id
  FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_assessment_result_decision_header_id
  ON public.assessment_result (decision_header_id)
  WHERE decision_header_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Patch 2: recommendation_proposal (D3)
-- ---------------------------------------------------------------------

ALTER TABLE public.recommendation_proposal
  ADD COLUMN decision_header_id uuid NULL;

ALTER TABLE public.recommendation_proposal
  ADD CONSTRAINT fk_recommendation_proposal_decision_header_id
  FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_recommendation_proposal_decision_header_id
  ON public.recommendation_proposal (decision_header_id)
  WHERE decision_header_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Patch 3: expansion_record (D4)
-- ---------------------------------------------------------------------

ALTER TABLE public.expansion_record
  ADD COLUMN decision_header_id uuid NULL;

ALTER TABLE public.expansion_record
  ADD CONSTRAINT fk_expansion_record_decision_header_id
  FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_expansion_record_decision_header_id
  ON public.expansion_record (decision_header_id)
  WHERE decision_header_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Patch 4: self_assessment_mismatch (D7)
-- ---------------------------------------------------------------------

ALTER TABLE public.self_assessment_mismatch
  ADD COLUMN decision_header_id uuid NULL;

ALTER TABLE public.self_assessment_mismatch
  ADD CONSTRAINT fk_self_assessment_mismatch_decision_header_id
  FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
  ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_self_assessment_mismatch_decision_header_id
  ON public.self_assessment_mismatch (decision_header_id)
  WHERE decision_header_id IS NOT NULL;


-- =====================================================================
-- TRACE_LINK ENUM EXTENSION (beyond the literal PATCH list — see
-- SQL_BATCH4_REVIEW.md mục 0 for why this was added)
-- =====================================================================
-- DECISION-050 item 5 locked the exact value names for the 3 new
-- TraceLink-eligible Detail tables, renamed to match the existing
-- "value = literal table name" convention and to eliminate the
-- ambiguity the original Round 5 proposal had with expansion_record.
-- target_type is intentionally NOT extended here (H-10 — adding
-- 'self_assessment_mismatch' as a target_type value — remains a
-- separate, still-open item; DECISION-050 did not resolve it).
-- =====================================================================

ALTER TABLE public.trace_link
  DROP CONSTRAINT ck_trace_link_source_type;

ALTER TABLE public.trace_link
  ADD CONSTRAINT ck_trace_link_source_type
  CHECK (source_type IN (
    'assessment_result', 'recommendation_proposal', 'local_expansion',
    'teaching_decision_detail', 'local_expansion_decision_detail', 'stuck_detection_decision_detail'
  ));


-- =====================================================================
-- END OF BATCH 4
--
-- Result after this batch:
--   - 6 new business tables: decision_header,
--     teaching_decision_detail, local_expansion_decision_detail,
--     roadmap_mapping_decision_detail, stuck_detection_decision_detail,
--     intervention_decision_detail
--   - 4 patches: decision_header_id added to assessment_result,
--     recommendation_proposal, expansion_record, self_assessment_mismatch
--   - 1 enum extension: trace_link.source_type +3 values (beyond the
--     literal patch list, required to fully implement DECISION-050
--     item 5 — see SQL_BATCH4_REVIEW.md mục 0)
--   - 0 history tables added (none of the 6 new tables are in the
--     DECISION-045 list of 4 — all 6 are append-only)
--   - 0 RLS policies
--   - 0 existing Round 1-4 column redesigned/removed
--
-- Next: Batch 5 — RLS (ENABLE ROW LEVEL SECURITY + CREATE POLICY for
-- all 32 tables, per the 5 RLS groups in POSTGRESQL_FEATURE_MATRIX.md).
-- =====================================================================
