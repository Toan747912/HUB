-- =============================================================================
-- Teaching Engine Schema Draft — PostgreSQL / Supabase Compatible
-- =============================================================================
-- Implementation of Decision Persistence (DECISION-049) and SQL pre-generation
-- alignment (DECISION-050) for the Teaching Engine.
--
-- Target: READY_FOR_SQL_GENERATION
-- Naming Rules: snake_case, explicit PKs/FKs, check constraints, indexes.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. decision_header (Supporting Persistence Entity — Cross-Cutting)
-- -----------------------------------------------------------------------------
-- Registers the occurrence of any of the 10 AI decisions (D1-D9b).
-- Implements DECISION-049: No detail_type/detail_id pointer; detail tables
-- reference this header via decision_header_id.
-- -----------------------------------------------------------------------------
CREATE TABLE public.decision_header (
  decision_header_id     uuid        NOT NULL,
  learner_id             uuid        NOT NULL,
  decision_type          text        NOT NULL,
  capability_or_domain   text        NOT NULL,
  occurred_at            timestamptz NOT NULL DEFAULT now(),
  summary_reason         text        NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type  text        NOT NULL,
  created_by_actor_id    uuid        NULL,

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
  'Decision Registry (DECISION-049). Supporting Persistence Entity with no domain owner. Required for all 10 decision types (D1-D9b) to enable timeline queries across all AI engines.';

CREATE INDEX ix_decision_header_learner_id ON public.decision_header (learner_id);
CREATE INDEX ix_decision_header_decision_type ON public.decision_header (decision_type);


-- -----------------------------------------------------------------------------
-- 2. teaching_decision_detail (D1 Detail — Teaching Capability)
-- -----------------------------------------------------------------------------
-- Logs the selection of a specific KnowledgeNode in a MentorSession,
-- providing explainability for Teaching Content Selection (GAP-01).
-- -----------------------------------------------------------------------------
CREATE TABLE public.teaching_decision_detail (
  teaching_decision_detail_id     uuid        NOT NULL,
  decision_header_id              uuid        NOT NULL,
  mentor_session_id               uuid        NOT NULL,
  knowledge_node_id               uuid        NOT NULL,
  selection_reasoning             text        NOT NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type           text        NOT NULL,
  created_by_actor_id             uuid        NULL,

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
  'D1 Detail. Persists teaching node selection decisions in a session. Connects to trace_link as source_type = ''teaching_decision_detail''.';

CREATE INDEX ix_teaching_decision_detail_mentor_session_id ON public.teaching_decision_detail (mentor_session_id);
CREATE INDEX ix_teaching_decision_detail_knowledge_node_id ON public.teaching_decision_detail (knowledge_node_id);


-- -----------------------------------------------------------------------------
-- 3. stuck_detection_decision_detail (D9a Detail — Mentor Interaction Domain)
-- -----------------------------------------------------------------------------
-- Records occurrences where a learner has been flagged as stuck in a SubSession.
-- The signal_payload stores telemetry state in JSONB format.
-- -----------------------------------------------------------------------------
CREATE TABLE public.stuck_detection_decision_detail (
  stuck_detection_decision_detail_id     uuid        NOT NULL,
  decision_header_id                     uuid        NOT NULL,
  sub_session_id                         uuid        NOT NULL,
  signal_payload                         jsonb       NOT NULL DEFAULT '{}',
  detection_reasoning                    text        NOT NULL,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type                  text        NOT NULL,
  created_by_actor_id                    uuid        NULL,

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
  'D9a Detail. Persists stuck detection signals. Telemetry metrics are stored in signal_payload. Connects to trace_link as source_type = ''stuck_detection_decision_detail''.';

CREATE INDEX ix_stuck_detection_decision_detail_sub_session_id ON public.stuck_detection_decision_detail (sub_session_id);


-- -----------------------------------------------------------------------------
-- 4. intervention_decision_detail (D9b Detail — Teaching Capability)
-- -----------------------------------------------------------------------------
-- Logs the AI pedagogical intervention tier applied in response to a stuck signal.
-- DECISION-050 item 2 excludes 'direct_fix' from unilateral actions; direct fixes
-- must be proposed via recommendation_proposal to maintain human governance.
-- -----------------------------------------------------------------------------
CREATE TABLE public.intervention_decision_detail (
  intervention_decision_detail_id     uuid        NOT NULL,
  decision_header_id                  uuid        NOT NULL,
  stuck_detection_decision_detail_id  uuid        NOT NULL,
  intervention_tier                   text        NOT NULL,
  intervention_reasoning              text        NOT NULL,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  created_by_actor_type               text        NOT NULL,
  created_by_actor_id                 uuid        NULL,

  CONSTRAINT pk_intervention_decision_detail PRIMARY KEY (intervention_decision_detail_id),

  CONSTRAINT fk_intervention_decision_detail_decision_header_id
    FOREIGN KEY (decision_header_id) REFERENCES public.decision_header (decision_header_id)
    ON DELETE RESTRICT,

  CONSTRAINT fk_intervention_decision_detail_stuck_detection_decision_detail_id
    FOREIGN KEY (stuck_detection_decision_detail_id) REFERENCES public.stuck_detection_decision_detail (stuck_detection_decision_detail_id)
    ON DELETE RESTRICT,

  CONSTRAINT uq_intervention_decision_detail_decision_header_id
    UNIQUE (decision_header_id),

  CONSTRAINT ck_intervention_decision_detail_intervention_tier
    CHECK (intervention_tier IN ('hint', 'guided_walkthrough')),

  CONSTRAINT ck_intervention_decision_detail_intervention_reasoning_not_empty
    CHECK (length(trim(intervention_reasoning)) > 0),

  CONSTRAINT ck_intervention_decision_detail_created_by_actor_type
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

COMMENT ON TABLE public.intervention_decision_detail IS
  'D9b Detail. intervention_tier is restricted to (hint, guided_walkthrough) by DECISION-050 item 2 to prevent unauthorized direct fixes. Multiple escalating interventions can reference a single stuck detection signal.';

CREATE INDEX ix_intervention_decision_detail_stuck_detection_decision_detail_id ON public.intervention_decision_detail (stuck_detection_decision_detail_id);
