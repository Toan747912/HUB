-- =============================================================================
-- Goal Domain Schema Draft — SQL Server Compatible Design Artifact
-- =============================================================================
-- Phase 1 Build — Goal Domain.
--
-- Status: Draft design for the Goal tables.
-- Traceability: DECISION-032 (Immutable Goal), DECISION-048 (Explainability),
--               DECISION-049 (Decision Persistence).
-- Naming: snake_case columns, pk/fk/ck prefixes, singular table names.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. goal (Aggregate Root — Current State Registry)
-- -----------------------------------------------------------------------------
-- Registers the learner's active target. Immutability is maintained:
-- when a goal changes, it transitions to 'Superseded' and a new record is inserted.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.goal (
  goal_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  learner_id              UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learner(id)
  current_version_number  INT              NOT NULL DEFAULT 1,                -- Incremented on superseded version creation
  state                   NVARCHAR(50)     NOT NULL DEFAULT 'Draft',          -- 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Superseded' | 'Archived'
  superseded_by_goal_id   UNIQUEIDENTIFIER NULL,                              -- Self-referencing link (v_N -> v_N+1)
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,
  updated_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  updated_by_actor_id     UNIQUEIDENTIFIER NULL,
  deleted_at              DATETIMEOFFSET   NULL,                              -- Soft Delete timestamp
  is_deleted              BIT              NOT NULL DEFAULT 0,                -- Soft Delete boolean flag

  CONSTRAINT pk_goal PRIMARY KEY (goal_id),

  -- Learner is outside this aggregate (Identity Domain)
  CONSTRAINT fk_goal_learner_id
    FOREIGN KEY (learner_id) REFERENCES dbo.learner (id)
    ON DELETE NO ACTION,

  -- Self-referencing FK for replacement version chain
  CONSTRAINT fk_goal_superseded_by_goal_id
    FOREIGN KEY (superseded_by_goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  -- Invariants & Domain Boundaries Checks
  CONSTRAINT ck_goal_state
    CHECK (state IN ('Draft', 'Active', 'Paused', 'Completed', 'Superseded', 'Archived')),

  CONSTRAINT ck_goal_no_self_supersede
    CHECK (superseded_by_goal_id IS NULL OR superseded_by_goal_id <> goal_id),

  CONSTRAINT ck_goal_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_goal_updated_by
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

-- Comments / Metadata
-- EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Goal aggregate root. Immutable statement design enforced by creating new records and setting predecessor superseded links.', @level0type=N'SCHEMA', @level0name=N'dbo', @level1type=N'TABLE', @level1name=N'goal';

CREATE NONCLUSTERED INDEX ix_goal_learner ON dbo.goal(learner_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX ix_goal_superseded ON dbo.goal(superseded_by_goal_id) WHERE superseded_by_goal_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. goal_version (Audit Log & Historic Statement Log)
-- -----------------------------------------------------------------------------
-- Stores the immutable statement text and explainability reference for each goal
-- version. Every creation/supersede event adds a row here.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.goal_version (
  goal_version_id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  goal_id                UNIQUEIDENTIFIER NOT NULL,                          -- FK -> goal(goal_id)
  version_number         INT              NOT NULL,                          -- Mapped version (1, 2, 3...)
  statement              NVARCHAR(MAX)    NOT NULL,                          -- The immutable text statement
  state                  NVARCHAR(50)     NOT NULL,                          -- State at version capture
  change_reasoning       NVARCHAR(MAX)    NOT NULL,                          -- Explanation for the version shift
  decision_header_id     UNIQUEIDENTIFIER NULL,                              -- FK -> decision_header (OQ49 Traceability)
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id    UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_goal_version PRIMARY KEY (goal_version_id),

  CONSTRAINT fk_goal_version_goal_id
    FOREIGN KEY (goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_goal_version_state
    CHECK (state IN ('Draft', 'Active', 'Paused', 'Completed', 'Superseded', 'Archived')),

  CONSTRAINT ck_goal_version_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  -- Ensures unique version index per goal
  CONSTRAINT uq_goal_version_number
    UNIQUE (goal_id, version_number)
);

CREATE NONCLUSTERED INDEX ix_goal_version_lookup ON dbo.goal_version(goal_id, version_number);


-- -----------------------------------------------------------------------------
-- 3. goal_relationship (Structural Relationship Junction — DAG)
-- -----------------------------------------------------------------------------
-- Maps parent-child decompositions and prerequisite dependencies.
-- Reachability checks prevent structural cycles.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.goal_relationship (
  goal_relationship_id   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  source_goal_id         UNIQUEIDENTIFIER NOT NULL,                          -- FK -> goal(goal_id) - Parent or Prerequisite
  target_goal_id         UNIQUEIDENTIFIER NOT NULL,                          -- FK -> goal(goal_id) - Child or Dependent
  relation_type          NVARCHAR(50)     NOT NULL,                          -- 'parent_child' | 'prerequisite'
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id    UNIQUEIDENTIFIER NULL,
  removed_at             DATETIMEOFFSET   NULL,                              -- Null = Active, Not Null = Logically Deleted

  CONSTRAINT pk_goal_relationship PRIMARY KEY (goal_relationship_id),

  CONSTRAINT fk_goal_relationship_source
    FOREIGN KEY (source_goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT fk_goal_relationship_target
    FOREIGN KEY (target_goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_goal_relationship_type
    CHECK (relation_type IN ('parent_child', 'prerequisite')),

  CONSTRAINT ck_goal_relationship_no_self_reference
    CHECK (source_goal_id <> target_goal_id),

  CONSTRAINT ck_goal_relationship_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_goal_relationship_lookup ON dbo.goal_relationship(source_goal_id, target_goal_id) WHERE removed_at IS NULL;
CREATE NONCLUSTERED INDEX ix_goal_relationship_reverse ON dbo.goal_relationship(target_goal_id) WHERE removed_at IS NULL;


-- -----------------------------------------------------------------------------
-- 4. goal_completion_snapshot (Immutable Assessment Evidence)
-- -----------------------------------------------------------------------------
-- Captured at the moment of goal completion, locking the mastery and progress metrics.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.goal_completion_snapshot (
  goal_completion_snapshot_id  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),    -- PK
  goal_id                      UNIQUEIDENTIFIER NOT NULL,                    -- FK -> goal(goal_id)
  completed_at                 DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  snapshot_payload             NVARCHAR(MAX)    NOT NULL,                    -- JSON payload storing progress details
  confidence                   DECIMAL(5, 2)    NOT NULL DEFAULT 1.00,       -- Score between 0.00 and 1.00
  reasoning                    NVARCHAR(MAX)    NOT NULL,                    -- Explainability explanation text
  created_at                   DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type        NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id          UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_goal_completion_snapshot PRIMARY KEY (goal_completion_snapshot_id),

  CONSTRAINT fk_goal_completion_snapshot_goal_id
    FOREIGN KEY (goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_goal_completion_snapshot_confidence
    CHECK (confidence BETWEEN 0.00 AND 1.00),

  CONSTRAINT ck_goal_completion_snapshot_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_goal_completion_snapshot ON dbo.goal_completion_snapshot(goal_id);
