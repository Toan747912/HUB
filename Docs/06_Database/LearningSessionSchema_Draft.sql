-- =============================================================================
-- Learning Session Domain Schema Draft — SQL Server Compatible Design Artifact
-- =============================================================================
-- Phase 1 Build — Learning Session Domain.
--
-- Status: Draft design for the Learning Session tables.
-- Traceability: DECISION-028 (Session Ownership), DECISION-031 (Hierarchy),
--               DECISION-032 (Goal Immutability), DECISION-033 (Adaptive Pause),
--               DECISION-048 (Explainability).
-- Naming: snake_case columns, pk/fk/ck prefixes, singular table names.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. learning_session (Aggregate Root — Current State Registry)
-- -----------------------------------------------------------------------------
-- Tracks active learning states. Bound 1:1 with an active Goal.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.learning_session (
  learning_session_id     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  learner_id              UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learner(id)
  goal_id                 UNIQUEIDENTIFIER NOT NULL,                          -- FK -> goal(goal_id) - 1:1, Unique
  state                   NVARCHAR(50)     NOT NULL DEFAULT 'Active',         -- 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Abandoned' | 'Archived'
  started_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  last_active_at          DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  ended_at                DATETIMEOFFSET   NULL,
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,
  updated_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  updated_by_actor_id     UNIQUEIDENTIFIER NULL,
  deleted_at              DATETIMEOFFSET   NULL,                              -- Soft Delete timestamp
  is_deleted              BIT              NOT NULL DEFAULT 0,                -- Soft Delete boolean flag

  CONSTRAINT pk_learning_session PRIMARY KEY (learning_session_id),

  -- 1:1 Goal mapping constraint
  CONSTRAINT uq_learning_session_goal_id UNIQUE (goal_id),

  CONSTRAINT fk_learning_session_learner
    FOREIGN KEY (learner_id) REFERENCES dbo.learner (id)
    ON DELETE NO ACTION,

  CONSTRAINT fk_learning_session_goal
    FOREIGN KEY (goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_learning_session_state
    CHECK (state IN ('Draft', 'Active', 'Paused', 'Completed', 'Abandoned', 'Archived')),

  CONSTRAINT ck_learning_session_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_learning_session_updated_by
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_learning_session_learner ON dbo.learning_session(learner_id) WHERE is_deleted = 0;


-- -----------------------------------------------------------------------------
-- 2. sub_session (Internal Entities — Milestone/Concept Segment)
-- -----------------------------------------------------------------------------
-- Tracks progress on individual roadmap nodes or concepts in the session.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.sub_session (
  sub_session_id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  learning_session_id     UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learning_session(learning_session_id)
  roadmap_node_id         UNIQUEIDENTIFIER NULL,                              -- FK -> roadmap_node (Goal & Roadmap Domain)
  knowledge_node_id       UNIQUEIDENTIFIER NULL,                              -- FK -> knowledge_node (Knowledge Graph Domain)
  state                   NVARCHAR(50)     NOT NULL DEFAULT 'Planned',        -- 'Planned' | 'Active' | 'Completed' | 'Cancelled'
  started_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  ended_at                DATETIMEOFFSET   NULL,
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,
  updated_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  updated_by_actor_id     UNIQUEIDENTIFIER NULL,
  deleted_at              DATETIMEOFFSET   NULL,
  is_deleted              BIT              NOT NULL DEFAULT 0,

  CONSTRAINT pk_sub_session PRIMARY KEY (sub_session_id),

  CONSTRAINT fk_sub_session_parent
    FOREIGN KEY (learning_session_id) REFERENCES dbo.learning_session (learning_session_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_sub_session_state
    CHECK (state IN ('Planned', 'Active', 'Completed', 'Cancelled')),

  -- Invariant: Must target exactly one scope (RoadmapNode OR KnowledgeNode)
  CONSTRAINT ck_sub_session_scope_exactly_one
    CHECK (
      (roadmap_node_id IS NOT NULL AND knowledge_node_id IS NULL) OR
      (roadmap_node_id IS NULL AND knowledge_node_id IS NOT NULL)
    ),

  CONSTRAINT ck_sub_session_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_sub_session_updated_by
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_sub_session_parent ON dbo.sub_session(learning_session_id) WHERE is_deleted = 0;


-- -----------------------------------------------------------------------------
-- 3. mentor_session (External References — Conversational Turn Log)
-- -----------------------------------------------------------------------------
-- Tracks individual interactive turns. Owned by Mentor Interaction Domain.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.mentor_session (
  mentor_session_id       UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  sub_session_id          UNIQUEIDENTIFIER NOT NULL,                          -- FK -> sub_session(sub_session_id)
  state                   NVARCHAR(50)     NOT NULL DEFAULT 'Created',        -- 'Created' | 'Active' | 'WaitingForLearner' | 'Completed' | 'Expired'
  started_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  ended_at                DATETIMEOFFSET   NULL,
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_mentor_session PRIMARY KEY (mentor_session_id),

  CONSTRAINT fk_mentor_session_sub_session
    FOREIGN KEY (sub_session_id) REFERENCES dbo.sub_session (sub_session_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_mentor_session_state
    CHECK (state IN ('Created', 'Active', 'WaitingForLearner', 'Completed', 'Expired'))
);

CREATE NONCLUSTERED INDEX ix_mentor_session_sub_session ON dbo.mentor_session(sub_session_id);


-- -----------------------------------------------------------------------------
-- 4. learning_session_transition (Auditable Concurrency Log)
-- -----------------------------------------------------------------------------
-- Tracks state changes on learning sessions for concurrency and version audits.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.learning_session_transition (
  transition_id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  learning_session_id    UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learning_session(learning_session_id)
  from_state             NVARCHAR(50)     NOT NULL,
  to_state               NVARCHAR(50)     NOT NULL,
  transition_trigger     NVARCHAR(100)    NOT NULL,
  reasoning              NVARCHAR(MAX)    NOT NULL,
  decision_header_id     UNIQUEIDENTIFIER NULL,                              -- FK -> decision_header (OQ49 Traceability)
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id    UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_learning_session_transition PRIMARY KEY (transition_id),

  CONSTRAINT fk_transition_session
    FOREIGN KEY (learning_session_id) REFERENCES dbo.learning_session (learning_session_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_transition_from_state
    CHECK (from_state IN ('Draft', 'Active', 'Paused', 'Completed', 'Abandoned', 'Archived')),

  CONSTRAINT ck_transition_to_state
    CHECK (to_state IN ('Draft', 'Active', 'Paused', 'Completed', 'Abandoned', 'Archived')),

  CONSTRAINT ck_transition_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_learning_session_transition_session ON dbo.learning_session_transition(learning_session_id);


-- -----------------------------------------------------------------------------
-- 5. session_progress_snapshot (Progress Snapshot Registry)
-- -----------------------------------------------------------------------------
-- Chronological audit snapshots tracking progress percentages of the session.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.session_progress_snapshot (
  snapshot_id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  learning_session_id    UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learning_session(learning_session_id)
  completed_nodes_count  INT              NOT NULL,
  total_nodes_count      INT              NOT NULL,
  progress_percentage    DECIMAL(5, 2)    NOT NULL,
  snapshot_payload       NVARCHAR(MAX)    NOT NULL,                          -- Node status mapping details (JSON string)
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),

  CONSTRAINT pk_session_progress_snapshot PRIMARY KEY (snapshot_id),

  CONSTRAINT fk_snapshot_session
    FOREIGN KEY (learning_session_id) REFERENCES dbo.learning_session (learning_session_id)
    ON DELETE NO ACTION
);

CREATE NONCLUSTERED INDEX ix_session_progress_snapshot_session ON dbo.session_progress_snapshot(learning_session_id);
