-- =============================================================================
-- Roadmap Domain Schema Draft — SQL Server Compatible Design Artifact
-- =============================================================================
-- Phase 1 Build — Roadmap Domain.
--
-- Status: Draft design for the Roadmap tables.
-- Traceability: DECISION-005 (Dynamic Roadmap), DECISION-006 (Approval Governance),
--               DECISION-015 (Graph Separation), DECISION-048 (Explainability).
-- Naming: snake_case columns, pk/fk/ck prefixes, singular table names.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. roadmap (Aggregate Root — Current State Registry)
-- -----------------------------------------------------------------------------
-- Registers the pathway linked to a specific Goal version.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap (
  roadmap_id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  goal_id                 UNIQUEIDENTIFIER NOT NULL,                          -- FK -> goal(goal_id) - 1:1, Unique
  predecessor_roadmap_id  UNIQUEIDENTIFIER NULL,                              -- Self-referencing link (v_N -> v_N+1)
  current_version_number  INT              NOT NULL DEFAULT 1,
  state                   NVARCHAR(50)     NOT NULL DEFAULT 'Proposed',       -- 'Draft' | 'Proposed' | 'Approved' | 'Active' | 'Completed' | 'Superseded' | 'Archived'
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,
  updated_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  updated_by_actor_id     UNIQUEIDENTIFIER NULL,
  deleted_at              DATETIMEOFFSET   NULL,                              -- Soft Delete timestamp
  is_deleted              BIT              NOT NULL DEFAULT 0,                -- Soft Delete boolean flag

  CONSTRAINT pk_roadmap PRIMARY KEY (roadmap_id),

  -- 1:1 Goal mapping constraint
  CONSTRAINT uq_roadmap_goal_id UNIQUE (goal_id),

  CONSTRAINT fk_roadmap_goal_id
    FOREIGN KEY (goal_id) REFERENCES dbo.goal (goal_id)
    ON DELETE NO ACTION,

  CONSTRAINT fk_roadmap_predecessor_id
    FOREIGN KEY (predecessor_roadmap_id) REFERENCES dbo.roadmap (roadmap_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_roadmap_state
    CHECK (state IN ('Draft', 'Proposed', 'Approved', 'Active', 'Completed', 'Superseded', 'Archived')),

  CONSTRAINT ck_roadmap_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT ck_roadmap_updated_by
    CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_roadmap_goal ON dbo.roadmap(goal_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX ix_roadmap_predecessor ON dbo.roadmap(predecessor_roadmap_id) WHERE predecessor_roadmap_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 2. roadmap_version (Historic Path Auditing)
-- -----------------------------------------------------------------------------
-- Captures snapshots of roadmap status transitions and version increments.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_version (
  roadmap_version_id     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  roadmap_id             UNIQUEIDENTIFIER NOT NULL,                          -- FK -> roadmap(roadmap_id)
  version_number         INT              NOT NULL,                          -- Version (1, 2, 3...)
  state                  NVARCHAR(50)     NOT NULL,
  change_reasoning       NVARCHAR(MAX)    NOT NULL,
  decision_header_id     UNIQUEIDENTIFIER NULL,                              -- FK -> decision_header (OQ49)
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id    UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_roadmap_version PRIMARY KEY (roadmap_version_id),

  CONSTRAINT fk_roadmap_version_roadmap_id
    FOREIGN KEY (roadmap_id) REFERENCES dbo.roadmap (roadmap_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_roadmap_version_state
    CHECK (state IN ('Draft', 'Proposed', 'Approved', 'Active', 'Completed', 'Superseded', 'Archived')),

  CONSTRAINT ck_roadmap_version_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service')),

  CONSTRAINT uq_roadmap_version_number
    UNIQUE (roadmap_id, version_number)
);

CREATE NONCLUSTERED INDEX ix_roadmap_version_lookup ON dbo.roadmap_version(roadmap_id, version_number);


-- -----------------------------------------------------------------------------
-- 3. roadmap_node (Internal Tree Entities)
-- -----------------------------------------------------------------------------
-- Individual steps in the learning path. Arranged as a tree structure.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_node (
  roadmap_node_id         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  roadmap_id              UNIQUEIDENTIFIER NOT NULL,                          -- FK -> roadmap(roadmap_id)
  parent_roadmap_node_id  UNIQUEIDENTIFIER NULL,                              -- Self-referencing link (tree parent)
  title                   NVARCHAR(255)    NOT NULL,
  status                  NVARCHAR(50)     NOT NULL DEFAULT 'Locked',          -- 'Locked' | 'Unlocked' | 'In_Progress' | 'Completed'
  sequence_number         INT              NOT NULL DEFAULT 1,
  collapsed               BIT              NOT NULL DEFAULT 1,                -- UI presentation parameter
  node_type               NVARCHAR(50)     NOT NULL DEFAULT 'Learning',       -- 'Milestone' | 'Learning' | 'Assessment' | 'Optional'
  created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  created_by_actor_id     UNIQUEIDENTIFIER NULL,
  updated_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  updated_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
  updated_by_actor_id     UNIQUEIDENTIFIER NULL,
  deleted_at              DATETIMEOFFSET   NULL,
  is_deleted              BIT              NOT NULL DEFAULT 0,

  CONSTRAINT pk_roadmap_node PRIMARY KEY (roadmap_node_id),

  CONSTRAINT fk_roadmap_node_roadmap_id
    FOREIGN KEY (roadmap_id) REFERENCES dbo.roadmap (roadmap_id)
    ON DELETE NO ACTION,

  CONSTRAINT fk_roadmap_node_parent_id
    FOREIGN KEY (parent_roadmap_node_id) REFERENCES dbo.roadmap_node (roadmap_node_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_roadmap_node_status
    CHECK (status IN ('Locked', 'Unlocked', 'In_Progress', 'Completed')),

  CONSTRAINT ck_roadmap_node_type
    CHECK (node_type IN ('Milestone', 'Learning', 'Assessment', 'Optional')),

  CONSTRAINT ck_roadmap_node_no_self_parent
    CHECK (parent_roadmap_node_id IS NULL OR parent_roadmap_node_id <> roadmap_node_id)
);

CREATE NONCLUSTERED INDEX ix_roadmap_node_parent ON dbo.roadmap_node(parent_roadmap_node_id) WHERE is_deleted = 0;
CREATE NONCLUSTERED INDEX ix_roadmap_node_lookup ON dbo.roadmap_node(roadmap_id) WHERE is_deleted = 0;


-- -----------------------------------------------------------------------------
-- 4. roadmap_node_dependency (Sequential Prerequisite Relationships)
-- -----------------------------------------------------------------------------
-- Defines sequential unlocks (Node B requires Node A).
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_node_dependency (
  roadmap_node_dependency_id  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),      -- PK
  roadmap_node_id             UNIQUEIDENTIFIER NOT NULL,                      -- FK -> roadmap_node (Dependent)
  prerequisite_roadmap_node_id UNIQUEIDENTIFIER NOT NULL,                      -- FK -> roadmap_node (Prerequisite)
  created_at                  DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  removed_at                  DATETIMEOFFSET   NULL,                          -- Soft delete timestamp

  CONSTRAINT pk_roadmap_node_dependency PRIMARY KEY (roadmap_node_dependency_id),

  CONSTRAINT fk_roadmap_dep_node
    FOREIGN KEY (roadmap_node_id) REFERENCES dbo.roadmap_node (roadmap_node_id)
    ON DELETE NO ACTION,

  CONSTRAINT fk_roadmap_dep_prereq
    FOREIGN KEY (prerequisite_roadmap_node_id) REFERENCES dbo.roadmap_node (roadmap_node_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_roadmap_dep_no_self_ref
    CHECK (roadmap_node_id <> prerequisite_roadmap_node_id)
);

CREATE NONCLUSTERED INDEX ix_roadmap_dep_lookup ON dbo.roadmap_node_dependency(roadmap_node_id, prerequisite_roadmap_node_id) WHERE removed_at IS NULL;


-- -----------------------------------------------------------------------------
-- 5. roadmap_node_knowledge_node (M:N Graph Separation Junction)
-- -----------------------------------------------------------------------------
-- Links leaf Roadmap Learning nodes to shared Knowledge Graph concepts.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_node_knowledge_node (
  roadmap_node_kn_id  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),              -- PK
  roadmap_node_id     UNIQUEIDENTIFIER NOT NULL,                              -- FK -> roadmap_node (Goal & Roadmap Domain)
  knowledge_node_id   UNIQUEIDENTIFIER NOT NULL,                              -- FK -> knowledge_node (Knowledge Graph Domain)
  created_at          DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  removed_at          DATETIMEOFFSET   NULL,                                  -- Soft delete timestamp

  CONSTRAINT pk_roadmap_node_knowledge_node PRIMARY KEY (roadmap_node_kn_id),

  CONSTRAINT fk_roadmap_kn_node
    FOREIGN KEY (roadmap_node_id) REFERENCES dbo.roadmap_node (roadmap_node_id)
    ON DELETE NO ACTION,

  -- Links to Knowledge Graph Domain
  CONSTRAINT fk_roadmap_kn_concept
    FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node (knowledge_node_id)
    ON DELETE NO ACTION
);

CREATE NONCLUSTERED INDEX ix_roadmap_kn_lookup ON dbo.roadmap_node_knowledge_node(roadmap_node_id, knowledge_node_id) WHERE removed_at IS NULL;
CREATE NONCLUSTERED INDEX ix_roadmap_kn_reverse ON dbo.roadmap_node_knowledge_node(knowledge_node_id) WHERE removed_at IS NULL;


-- -----------------------------------------------------------------------------
-- 6. roadmap_progress_snapshot (Progress Reporting Metrics)
-- -----------------------------------------------------------------------------
-- Stores chronological progress reports for UI visualization.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_progress_snapshot (
  roadmap_progress_snapshot_id  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),    -- PK
  roadmap_id                    UNIQUEIDENTIFIER NOT NULL,                    -- FK -> roadmap(roadmap_id)
  progress_percentage           DECIMAL(5, 2)    NOT NULL,
  completed_nodes_count         INT              NOT NULL,
  total_nodes_count             INT              NOT NULL,
  snapshot_payload              NVARCHAR(MAX)    NOT NULL,                    -- Detailed progress breakdown (JSON string)
  created_at                    DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),

  CONSTRAINT pk_roadmap_progress_snapshot PRIMARY KEY (roadmap_progress_snapshot_id),

  CONSTRAINT fk_roadmap_progress_roadmap_id
    FOREIGN KEY (roadmap_id) REFERENCES dbo.roadmap (roadmap_id)
    ON DELETE NO ACTION
);

CREATE NONCLUSTERED INDEX ix_roadmap_progress_snapshot ON dbo.roadmap_progress_snapshot(roadmap_id);


-- -----------------------------------------------------------------------------
-- 7. roadmap_approval (Audit Registry for Structural Modifications)
-- -----------------------------------------------------------------------------
-- Registers the explicit learner approval and decision link authorizing a modification.
-- -----------------------------------------------------------------------------
CREATE TABLE dbo.roadmap_approval (
  roadmap_approval_id    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
  roadmap_id             UNIQUEIDENTIFIER NOT NULL,                          -- FK -> roadmap(roadmap_id)
  approval_record_id     UNIQUEIDENTIFIER NOT NULL,                          -- FK -> approval_record (Goal & Roadmap Domain)
  decision_header_id     UNIQUEIDENTIFIER NULL,                              -- FK -> decision_header (OQ49 explainability header)
  confidence             DECIMAL(5, 2)    NOT NULL DEFAULT 1.00,             -- AI confidence in proposal
  reasoning              NVARCHAR(MAX)    NOT NULL,                          -- AI justification text
  created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
  created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'learner',
  created_by_actor_id    UNIQUEIDENTIFIER NULL,

  CONSTRAINT pk_roadmap_approval PRIMARY KEY (roadmap_approval_id),

  CONSTRAINT fk_roadmap_approval_roadmap_id
    FOREIGN KEY (roadmap_id) REFERENCES dbo.roadmap (roadmap_id)
    ON DELETE NO ACTION,

  -- Links to global ApprovalRecord aggregate
  CONSTRAINT fk_roadmap_approval_record
    FOREIGN KEY (approval_record_id) REFERENCES dbo.approval_record (approval_record_id)
    ON DELETE NO ACTION,

  CONSTRAINT ck_roadmap_approval_created_by
    CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'))
);

CREATE NONCLUSTERED INDEX ix_roadmap_approval_lookup ON dbo.roadmap_approval(roadmap_id);
