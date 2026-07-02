-- =====================================================================
-- SQL BATCH 3 — LEARNING SESSION + DISCOVERY + MENTOR + RECOMMENDATION
-- AI Mentor OS — PostgreSQL / Supabase
--
-- Scope: learning_session, sub_session, learning_session_transition,
-- discovery_session, self_assessment_mismatch, mentor_session,
-- recommendation_proposal, recommendation_proposal_response — exactly
-- the 8 tables listed for this batch, plus their DECISION-045-mandated
-- history tables (history.discovery_session, history.mentor_session —
-- see SQL_BATCH3_REVIEW.md mục 0 for why these 2 were added even
-- though not named in the table list), plus the 2 forward-dependency
-- closures. No Decision Header table, no Round 5 Detail table — those
-- belong to Batch 4.
--
-- Requires Batch 0, Batch 1, Batch 2 to have already run (learner,
-- goal, roadmap_node, knowledge_node, assessment_result, evidence must
-- already exist; fn_set_updated_at, fn_write_history must exist).
--
-- No RLS policy is created in this batch (Batch 6 scope).
--
-- Source of authority: DDL_ROUND1_DESIGN.md mục 1.6-1.8,
-- DDL_ROUND4_DESIGN.md, DECISION-006, DECISION-028, DECISION-031,
-- DECISION-032, DECISION-033, DECISION-038, DECISION-044, DECISION-045,
-- DECISION-047, DECISION-050.
-- =====================================================================


-- =====================================================================
-- 1. learning_session
-- =====================================================================
-- Current State Snapshot. 1:1 with goal (DECISION-028/032).
-- =====================================================================

CREATE TABLE public.learning_session (
  learning_session_id     uuid        NOT NULL DEFAULT gen_random_uuid(),
  learner_id               uuid        NOT NULL,
  goal_id                    uuid        NOT NULL,
  state                        text        NOT NULL DEFAULT 'active',
  started_at                    timestamptz NOT NULL DEFAULT now(),
  last_active_at                  timestamptz NOT NULL DEFAULT now(),
  ended_at                          timestamptz NULL,
  created_at                         timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                text        NOT NULL,
  created_by_actor_id                    uuid        NULL,
  updated_at                               timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_type                      text        NOT NULL,
  updated_by_actor_id                          uuid        NULL,

  CONSTRAINT pk_learning_session PRIMARY KEY (learning_session_id),

  CONSTRAINT fk_learning_session_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_learning_session_goal_id
    FOREIGN KEY (goal_id) REFERENCES public.goal (goal_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_learning_session_goal_id UNIQUE (goal_id),

  CONSTRAINT ck_learning_session_state
    CHECK (state IN ('active', 'paused', 'completed', 'archived')),

  CONSTRAINT ck_learning_session_ended_at_consistency
    CHECK (
      (state IN ('completed', 'archived') AND ended_at IS NOT NULL)
      OR (state IN ('active', 'paused') AND ended_at IS NULL)
    ),

  CONSTRAINT ck_learning_session_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_learning_session_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.learning_session IS
  'Learning Session Module. 1:1 with goal (DECISION-028/032 — a new Goal always means a new LearningSession). last_active_at is updated by the Application Layer whenever related activity occurs (Evidence/Assessment/MentorSession) — not maintained by a DB trigger.';

CREATE TRIGGER trg_learning_session_set_updated_at
  BEFORE UPDATE ON public.learning_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX ix_learning_session_learner_id ON public.learning_session (learner_id);

-- Accepted partial index (DECISION-050 item 6) — Hot Path #7.
CREATE INDEX ix_learning_session_learner_id_active
  ON public.learning_session (learner_id)
  WHERE state = 'active';


-- =====================================================================
-- 2. sub_session
-- =====================================================================
-- Current State Snapshot, child of learning_session (Aggregate).
-- knowledge_node_id is created here WITHOUT a FK (forward-dependency
-- placeholder, per DDL_ROUND1_DESIGN.md mục 1.7) — the FK is added
-- below in the FORWARD DEPENDENCY CLOSURES section, even though
-- knowledge_node already exists by this point in the migration order;
-- this mirrors the documented design history rather than silently
-- inlining it.
-- =====================================================================

CREATE TABLE public.sub_session (
  sub_session_id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  learning_session_id         uuid        NOT NULL,
  roadmap_node_id                uuid        NULL,
  knowledge_node_id                 uuid        NULL,
  state                                text        NOT NULL DEFAULT 'active',
  started_at                            timestamptz NOT NULL DEFAULT now(),
  ended_at                                 timestamptz NULL,
  created_at                                 timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                        text        NOT NULL,
  created_by_actor_id                            uuid        NULL,
  updated_at                                       timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_type                              text        NOT NULL,
  updated_by_actor_id                                  uuid        NULL,

  CONSTRAINT pk_sub_session PRIMARY KEY (sub_session_id),

  CONSTRAINT fk_sub_session_learning_session_id
    FOREIGN KEY (learning_session_id) REFERENCES public.learning_session (learning_session_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_sub_session_roadmap_node_id
    FOREIGN KEY (roadmap_node_id) REFERENCES public.roadmap_node (roadmap_node_id)
    ON DELETE RESTRICT,

  -- knowledge_node_id: no FK here — see FORWARD DEPENDENCY CLOSURES below.

  CONSTRAINT ck_sub_session_scope_exactly_one
    CHECK ((roadmap_node_id IS NOT NULL)::int + (knowledge_node_id IS NOT NULL)::int = 1),

  CONSTRAINT ck_sub_session_state
    CHECK (state IN ('active', 'ended')),

  CONSTRAINT ck_sub_session_ended_at_consistency
    CHECK (
      (state = 'ended' AND ended_at IS NOT NULL)
      OR (state = 'active' AND ended_at IS NULL)
    ),

  CONSTRAINT ck_sub_session_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_sub_session_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.sub_session IS
  'Learning Session Module, child of learning_session (Aggregate, CASCADE). Scope is exactly one of roadmap_node_id/knowledge_node_id (ck_sub_session_scope_exactly_one). knowledge_node_id FK closed below in this same batch.';

CREATE TRIGGER trg_sub_session_set_updated_at
  BEFORE UPDATE ON public.sub_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE INDEX ix_sub_session_learning_session_id ON public.sub_session (learning_session_id);
CREATE INDEX ix_sub_session_roadmap_node_id ON public.sub_session (roadmap_node_id);
CREATE INDEX ix_sub_session_knowledge_node_id ON public.sub_session (knowledge_node_id);

-- Accepted partial index (DECISION-050 item 6) — Hot Path #7.
CREATE INDEX ix_sub_session_learning_session_id_active
  ON public.sub_session (learning_session_id)
  WHERE state = 'active';


-- =====================================================================
-- 3. learning_session_transition
-- =====================================================================
-- Append-only / immutable. Supporting Persistence Entity, approved by
-- DECISION-047. transition_actor_type carries the audit-actor meaning
-- — no separate created_by_actor_type column (would duplicate purpose).
-- =====================================================================

CREATE TABLE public.learning_session_transition (
  learning_session_transition_id   uuid        NOT NULL,
  learning_session_id                uuid        NOT NULL,
  from_state                            text        NOT NULL,
  to_state                                text        NOT NULL,
  transition_actor_type                     text        NOT NULL,
  transition_actor_id                         uuid        NULL,
  occurred_at                                   timestamptz NOT NULL DEFAULT now(),
  created_at                                      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pk_learning_session_transition PRIMARY KEY (learning_session_transition_id),

  CONSTRAINT fk_learning_session_transition_learning_session_id
    FOREIGN KEY (learning_session_id) REFERENCES public.learning_session (learning_session_id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_learning_session_transition_from_state
    CHECK (from_state IN ('active', 'paused', 'completed', 'archived')),

  CONSTRAINT ck_learning_session_transition_to_state
    CHECK (to_state IN ('active', 'paused', 'completed', 'archived')),

  CONSTRAINT ck_learning_session_transition_actor_type
    CHECK (transition_actor_type IN ('learner', 'recommendation_engine', 'system'))
);

COMMENT ON TABLE public.learning_session_transition IS
  'Learning Session Module — companion log for learning_session.state changes (DECISION-047, Supporting Persistence Entity, not a new Aggregate). Approved by Founder + Lead Architect.';

CREATE INDEX ix_learning_session_transition_learning_session_id ON public.learning_session_transition (learning_session_id);


-- =====================================================================
-- 4. discovery_session
-- =====================================================================
-- Current State Snapshot. Root of Boundary 8 (Discovery Domain).
-- =====================================================================

CREATE TABLE public.discovery_session (
  discovery_session_id     uuid        NOT NULL DEFAULT gen_random_uuid(),
  learner_id                 uuid        NOT NULL,
  state                         text        NOT NULL DEFAULT 'active',
  started_at                      timestamptz NOT NULL DEFAULT now(),
  ended_at                          timestamptz NULL,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                 text        NOT NULL,
  created_by_actor_id                     uuid        NULL,
  updated_at                                timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_type                       text        NOT NULL,
  updated_by_actor_id                           uuid        NULL,

  CONSTRAINT pk_discovery_session PRIMARY KEY (discovery_session_id),

  CONSTRAINT fk_discovery_session_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_discovery_session_state
    CHECK (state IN ('active', 'ended')),

  CONSTRAINT ck_discovery_session_ended_at_consistency
    CHECK (
      (state = 'ended' AND ended_at IS NOT NULL)
      OR (state = 'active' AND ended_at IS NULL)
    ),

  CONSTRAINT ck_discovery_session_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_discovery_session_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.discovery_session IS
  'Discovery Domain (Boundary 8, Root). Discovery is continuous, not onboarding-only (DECISION-007).';

-- Proposed, not yet Decision-Log-locked (DDL_ROUND4_DESIGN.md mục 1.1,
-- Risk #4: "1 active Discovery Session per Learner" not confirmed as a
-- hard invariant). Implemented as designed; see SQL_BATCH3_REVIEW.md
-- open item.
CREATE UNIQUE INDEX uq_discovery_session_learner_id_active
  ON public.discovery_session (learner_id)
  WHERE state = 'active';

CREATE INDEX ix_discovery_session_learner_id ON public.discovery_session (learner_id);

CREATE TRIGGER trg_discovery_session_set_updated_at
  BEFORE UPDATE ON public.discovery_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_discovery_session_write_history
  AFTER UPDATE ON public.discovery_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_write_history();


-- =====================================================================
-- 5. history.discovery_session
-- =====================================================================
-- Not named in this batch's table list, but mandated by DECISION-045
-- for this exact table — see SQL_BATCH3_REVIEW.md mục 0. HARD CONTRACT
-- with fn_write_history(): column list mirrors public.discovery_session
-- exactly, in order, + trailing valid_from. No PK (same now()-frozen-
-- per-transaction reasoning as history.learner/history.knowledge_node).
-- =====================================================================

CREATE TABLE history.discovery_session (
  discovery_session_id     uuid        NOT NULL,
  learner_id                 uuid        NOT NULL,
  state                         text        NOT NULL,
  started_at                      timestamptz NOT NULL,
  ended_at                          timestamptz NULL,
  created_at                          timestamptz NOT NULL,
  created_by_actor_type                 text        NOT NULL,
  created_by_actor_id                     uuid        NULL,
  updated_at                                timestamptz NOT NULL,
  updated_by_actor_type                       text        NOT NULL,
  updated_by_actor_id                           uuid        NULL,
  valid_from                                      timestamptz NOT NULL
);

COMMENT ON TABLE history.discovery_session IS
  'Trigger-maintained history of public.discovery_session (DECISION-045). Maintained exclusively by trg_discovery_session_write_history.';

CREATE INDEX ix_history_discovery_session_discovery_session_id ON history.discovery_session (discovery_session_id);
CREATE INDEX ix_history_discovery_session_valid_from ON history.discovery_session (valid_from);


-- =====================================================================
-- 6. self_assessment_mismatch
-- =====================================================================
-- Append-only / immutable, child of discovery_session (Aggregate,
-- Boundary 8).
-- =====================================================================

CREATE TABLE public.self_assessment_mismatch (
  self_assessment_mismatch_id     uuid        NOT NULL,
  discovery_session_id              uuid        NOT NULL,
  knowledge_node_id                    uuid        NOT NULL,
  self_reported_level                     text        NOT NULL,
  actual_assessment_result_id                uuid        NULL,
  mismatch_reasoning                            text        NOT NULL,
  created_at                                      timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                             text        NOT NULL,
  created_by_actor_id                                 uuid        NULL,

  CONSTRAINT pk_self_assessment_mismatch PRIMARY KEY (self_assessment_mismatch_id),

  CONSTRAINT fk_self_assessment_mismatch_discovery_session_id
    FOREIGN KEY (discovery_session_id) REFERENCES public.discovery_session (discovery_session_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_self_assessment_mismatch_knowledge_node_id
    FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_self_assessment_mismatch_actual_assessment_result_id
    FOREIGN KEY (actual_assessment_result_id) REFERENCES public.assessment_result (assessment_result_id)
    ON DELETE RESTRICT,

  -- Locked by DECISION-050 item 4 — reuses the Mastery Framework's own
  -- 4-level vocabulary (DECISION-017), coupled to it deliberately.
  CONSTRAINT ck_self_assessment_mismatch_self_reported_level
    CHECK (self_reported_level IN ('remember', 'explain', 'apply', 'teach')),

  CONSTRAINT ck_self_assessment_mismatch_reasoning_not_empty
    CHECK (length(trim(mismatch_reasoning)) > 0),

  CONSTRAINT ck_self_assessment_mismatch_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.self_assessment_mismatch IS
  'Discovery Domain, child of discovery_session (Aggregate, CASCADE). Explainability artifact for D7. self_reported_level locked to the Mastery Framework 4-level vocabulary (DECISION-050 item 4) — must change in lockstep with DECISION-017 if that ever changes.';

CREATE INDEX ix_self_assessment_mismatch_discovery_session_id ON public.self_assessment_mismatch (discovery_session_id);
CREATE INDEX ix_self_assessment_mismatch_knowledge_node_id ON public.self_assessment_mismatch (knowledge_node_id);
CREATE INDEX ix_self_assessment_mismatch_actual_assessment_result_id ON public.self_assessment_mismatch (actual_assessment_result_id);


-- =====================================================================
-- 7. mentor_session
-- =====================================================================
-- Current State Snapshot. Root of Boundary 9 (Mentor Interaction
-- Domain) — standalone, only REFERENCES sub_session, never owned by it
-- (DECISION-031). sub_session_id is RESTRICT, never CASCADE — when the
-- parent sub_session/learning_session is archived, mentor_session must
-- remain untouched, an independent history (LogicalDatabaseModel.md
-- mục 6).
-- =====================================================================

CREATE TABLE public.mentor_session (
  mentor_session_id     uuid        NOT NULL DEFAULT gen_random_uuid(),
  learner_id               uuid        NOT NULL,
  sub_session_id              uuid        NOT NULL,
  learning_mode                  text        NOT NULL,
  state                             text        NOT NULL DEFAULT 'active',
  started_at                          timestamptz NOT NULL DEFAULT now(),
  ended_at                              timestamptz NULL,
  created_at                              timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                     text        NOT NULL,
  created_by_actor_id                         uuid        NULL,
  updated_at                                    timestamptz NOT NULL DEFAULT now(),
  updated_by_actor_type                           text        NOT NULL,
  updated_by_actor_id                               uuid        NULL,

  CONSTRAINT pk_mentor_session PRIMARY KEY (mentor_session_id),

  CONSTRAINT fk_mentor_session_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_mentor_session_sub_session_id
    FOREIGN KEY (sub_session_id) REFERENCES public.sub_session (sub_session_id)
    ON DELETE RESTRICT,

  CONSTRAINT ck_mentor_session_learning_mode
    CHECK (learning_mode IN ('A', 'B', 'C', 'D')),

  CONSTRAINT ck_mentor_session_state
    CHECK (state IN ('active', 'ended')),

  CONSTRAINT ck_mentor_session_ended_at_consistency
    CHECK (
      (state = 'ended' AND ended_at IS NOT NULL)
      OR (state = 'active' AND ended_at IS NULL)
    ),

  CONSTRAINT ck_mentor_session_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_mentor_session_updated_by_actor_type
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.mentor_session IS
  'Mentor Interaction Domain (Boundary 9, Root, standalone). sub_session_id is RESTRICT, never CASCADE (DECISION-031, LogicalDatabaseModel.md mục 6 — "Archive độc lập"). learning_mode can change within an active session, which is why this table needs history.mentor_session, unlike pure append-only tables.';

CREATE INDEX ix_mentor_session_learner_id ON public.mentor_session (learner_id);
CREATE INDEX ix_mentor_session_sub_session_id ON public.mentor_session (sub_session_id);

-- Accepted partial index (DECISION-050 item 6).
CREATE INDEX ix_mentor_session_learner_id_active
  ON public.mentor_session (learner_id)
  WHERE state = 'active';

CREATE TRIGGER trg_mentor_session_set_updated_at
  BEFORE UPDATE ON public.mentor_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_mentor_session_write_history
  AFTER UPDATE ON public.mentor_session
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_write_history();


-- =====================================================================
-- 8. history.mentor_session
-- =====================================================================
-- Not named in this batch's table list, but mandated by DECISION-045
-- for this exact table — see SQL_BATCH3_REVIEW.md mục 0. Same HARD
-- CONTRACT and no-PK reasoning as history.discovery_session above.
-- =====================================================================

CREATE TABLE history.mentor_session (
  mentor_session_id     uuid        NOT NULL,
  learner_id               uuid        NOT NULL,
  sub_session_id              uuid        NOT NULL,
  learning_mode                  text        NOT NULL,
  state                             text        NOT NULL,
  started_at                          timestamptz NOT NULL,
  ended_at                              timestamptz NULL,
  created_at                              timestamptz NOT NULL,
  created_by_actor_type                     text        NOT NULL,
  created_by_actor_id                         uuid        NULL,
  updated_at                                    timestamptz NOT NULL,
  updated_by_actor_type                           text        NOT NULL,
  updated_by_actor_id                               uuid        NULL,
  valid_from                                          timestamptz NOT NULL
);

COMMENT ON TABLE history.mentor_session IS
  'Trigger-maintained history of public.mentor_session (DECISION-045). Maintained exclusively by trg_mentor_session_write_history.';

CREATE INDEX ix_history_mentor_session_mentor_session_id ON history.mentor_session (mentor_session_id);
CREATE INDEX ix_history_mentor_session_valid_from ON history.mentor_session (valid_from);


-- =====================================================================
-- 9. recommendation_proposal
-- =====================================================================
-- Append-only / immutable. Root of Boundary 10 (Recommendation
-- Domain), standalone.
-- =====================================================================

CREATE TABLE public.recommendation_proposal (
  recommendation_proposal_id     uuid        NOT NULL,
  learner_id                       uuid        NOT NULL,
  action_type                         text        NOT NULL,
  payload                                jsonb       NOT NULL DEFAULT '{}',
  created_at                              timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                     text        NOT NULL,
  created_by_actor_id                         uuid        NULL,

  CONSTRAINT pk_recommendation_proposal PRIMARY KEY (recommendation_proposal_id),

  CONSTRAINT fk_recommendation_proposal_learner_id
    FOREIGN KEY (learner_id) REFERENCES public.learner (id)
    ON DELETE RESTRICT,

  -- Locked by DECISION-050 item 3 — final set, no modification.
  CONSTRAINT ck_recommendation_proposal_action_type
    CHECK (action_type IN ('pause_learning_session', 'review_knowledge_node', 'roadmap_adjustment_suggestion')),

  CONSTRAINT ck_recommendation_proposal_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.recommendation_proposal IS
  'Recommendation Domain (Boundary 10, Root, standalone). action_type locked by DECISION-050 item 3 — extending it requires a new Decision Log entry, never an Admin-editable lookup table. traced_to[] (DECISION-027) is via trace_link, source_type already includes recommendation_proposal from the Batch 2 baseline — no enum ALTER needed here.';

CREATE INDEX ix_recommendation_proposal_learner_id ON public.recommendation_proposal (learner_id);


-- =====================================================================
-- 10. recommendation_proposal_response
-- =====================================================================
-- Append-only / immutable, child of recommendation_proposal
-- (Aggregate, Boundary 10). Records Confirmed/Ignored as a separate
-- appended fact, not an in-place status update on the proposal itself.
-- =====================================================================

CREATE TABLE public.recommendation_proposal_response (
  recommendation_proposal_response_id     uuid        NOT NULL,
  recommendation_proposal_id                uuid        NOT NULL,
  response                                     text        NOT NULL,
  created_at                                     timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                            text        NOT NULL,
  created_by_actor_id                                uuid        NULL,

  CONSTRAINT pk_recommendation_proposal_response PRIMARY KEY (recommendation_proposal_response_id),

  CONSTRAINT fk_recommendation_proposal_response_recommendation_proposal_id
    FOREIGN KEY (recommendation_proposal_id) REFERENCES public.recommendation_proposal (recommendation_proposal_id)
    ON DELETE CASCADE,

  CONSTRAINT uq_recommendation_proposal_response_recommendation_proposal_id
    UNIQUE (recommendation_proposal_id),

  CONSTRAINT ck_recommendation_proposal_response_response
    CHECK (response IN ('confirmed', 'ignored')),

  CONSTRAINT ck_recommendation_proposal_response_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.recommendation_proposal_response IS
  'Recommendation Domain, child of recommendation_proposal (Aggregate, CASCADE). uq_recommendation_proposal_response_recommendation_proposal_id enforces the locked "1-time transition" invariant — exactly one response per proposal, no changing one''s mind without a Decision Log amendment.';

-- uq_recommendation_proposal_response_recommendation_proposal_id
-- already provides the lookup index — no separate index needed.


-- =====================================================================
-- FORWARD DEPENDENCY CLOSURES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Closure 1: sub_session.knowledge_node_id -> knowledge_node
-- Specified in DDL_ROUND1_DESIGN.md mục 1.7 (forward dependency,
-- knowledge_node did not exist in the Round 1 design timeline) and
-- confirmed open in ROUND3_ARCHITECTURE_REVIEW.md / DDL_ROUND4_DESIGN.md
-- mục 1.6 (M-02). knowledge_node now exists (Batch 2) and sub_session
-- now exists (this batch) — close it.
-- ---------------------------------------------------------------------

ALTER TABLE public.sub_session
  ADD CONSTRAINT fk_sub_session_knowledge_node_id
  FOREIGN KEY (knowledge_node_id) REFERENCES public.knowledge_node (knowledge_node_id)
  ON DELETE RESTRICT;

-- ---------------------------------------------------------------------
-- Closure 2: evidence.mentor_session_id -> mentor_session
-- Specified in DDL_ROUND2_DESIGN.md mục 1.4 (forward dependency,
-- mentor_session did not exist in the Round 2 design timeline) and
-- confirmed closed (kept NULLABLE, not required) in
-- DDL_ROUND4_DESIGN.md mục 1.6 (H-04/OQ-2 — not every evidence.source_type
-- is 'mentor_session', so the FK cannot be NOT NULL). mentor_session
-- now exists (this batch) — close it.
-- ---------------------------------------------------------------------

ALTER TABLE public.evidence
  ADD CONSTRAINT fk_evidence_mentor_session_id
  FOREIGN KEY (mentor_session_id) REFERENCES public.mentor_session (mentor_session_id)
  ON DELETE RESTRICT;


-- =====================================================================
-- END OF BATCH 3
--
-- Result after this batch:
--   - 8 business tables: learning_session, sub_session,
--     learning_session_transition, discovery_session,
--     self_assessment_mismatch, mentor_session,
--     recommendation_proposal, recommendation_proposal_response
--   - 2 history tables: history.discovery_session, history.mentor_session
--     (added beyond the literal table list — DECISION-045 requirement,
--     see SQL_BATCH3_REVIEW.md mục 0)
--   - 2 forward-dependency closures: sub_session.knowledge_node_id,
--     evidence.mentor_session_id — both are now CLOSED, no forward
--     dependency remains open anywhere in the schema
--   - no trace_link enum ALTER — 'recommendation_proposal' and
--     'discovery_session' were already present in the Batch 2 baseline
--     CHECK list, nothing to extend here
--   - 3 accepted partial indexes attached (learning_session,
--     sub_session, mentor_session — DECISION-050 item 6)
--   - zero RLS policies
--   - zero Decision Header / Round 5 Detail tables
--
-- Next: Batch 4 — Decision Persistence (decision_header + 5 Detail
-- tables + the 4 decision_header_id patches + the Round 5 trace_link
-- enum rename, per DECISION-049/DECISION-050).
-- =====================================================================
