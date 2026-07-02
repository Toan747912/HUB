-- =============================================================================
-- 01_Knowledge_Tables.sql
-- AI Mentor OS — Knowledge Engine (SQL Server Compatible)
--
-- Scope: Knowledge Tables.
-- Traceability: DECISION-023, DECISION-025, DECISION-026, DECISION-042 to 045.
-- Idempotency: Uses IF OBJECT_ID / IF NOT EXISTS guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. knowledge_node (Aggregate Root — Concept Representation)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.knowledge_node', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.knowledge_node (
        knowledge_node_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
        title                  NVARCHAR(255)    NOT NULL,                          -- Unique semantic name
        description            NVARCHAR(MAX)    NOT NULL,
        [status]               NVARCHAR(50)     NOT NULL DEFAULT 'draft',          -- 'draft' | 'local' | 'structural' | 'archived'
        created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type  NVARCHAR(50)     NOT NULL,                          -- 'learner' | 'backend_core' | 'ai_service'
        created_by_actor_id    UNIQUEIDENTIFIER NULL,
        updated_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_by_actor_type  NVARCHAR(50)     NOT NULL,
        updated_by_actor_id    UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.knowledge_node';
END;

-- -----------------------------------------------------------------------------
-- 2. knowledge_relation (Junction Entity — Directed prerequisites and specjalizations)
-- Traceability: DECISION-025 (DAG requirement)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.knowledge_relation', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.knowledge_relation (
        from_knowledge_node_id  UNIQUEIDENTIFIER NOT NULL,                         -- FK -> knowledge_node(knowledge_node_id) (Parent/Prerequisite)
        to_knowledge_node_id    UNIQUEIDENTIFIER NOT NULL,                         -- FK -> knowledge_node(knowledge_node_id) (Child/Specialization)
        relation_type           NVARCHAR(50)     NOT NULL,                          -- 'prerequisite_of' | 'expands_to' | 'related_to'
        created_at              DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type   NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
        created_by_actor_id     UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.knowledge_relation';
END;

-- -----------------------------------------------------------------------------
-- 3. evidence (Aggregate Root — Learner evaluation trace log)
-- Traceability: DECISION-035 (Append-Only Evidence)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.evidence', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidence (
        evidence_id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
        learner_id             UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learner(id)
        source_type            NVARCHAR(50)     NOT NULL,                          -- 'Test' | 'Lab' | 'Probe' | 'Chat' (DECISION-053)
        direction              NVARCHAR(50)     NOT NULL,                          -- 'positive' | 'negative' (DECISION-053)
        ai_confidence          DECIMAL(5, 2)    NOT NULL DEFAULT 1.00,             -- Value between 0.00 and 1.00 (DECISION-053)
        raw_content            NVARCHAR(MAX)    NOT NULL,                          -- JSON metadata of prompt evaluation
        created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
        created_by_actor_id    UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.evidence';
END;

-- -----------------------------------------------------------------------------
-- 4. mastery_record (Aggregate Root — Snapshot of learner competence)
-- Traceability: DECISION-026 (Assessment Domain write owner), DECISION-044 (version_number)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.mastery_record', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.mastery_record (
        mastery_record_id      UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
        learner_id             UNIQUEIDENTIFIER NOT NULL,                          -- FK -> learner(id)
        knowledge_node_id      UNIQUEIDENTIFIER NOT NULL,                          -- FK -> knowledge_node(knowledge_node_id)
        mastery_level          NVARCHAR(50)     NOT NULL DEFAULT 'Unknown',        -- 'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach'
        teach_composite_score  DECIMAL(5, 2)    NOT NULL DEFAULT 0.00,             -- Composite decimal (DECISION-052)
        updated_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        version_number         BIGINT           NOT NULL DEFAULT 1                 -- Version counter
    );
    PRINT 'Created table dbo.mastery_record';
END;

-- -----------------------------------------------------------------------------
-- 5. expansion_record (Supporting Entity — Curation Audit Trail)
-- Traceability: DECISION-023 (Controlled expansion reasoning logs)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.expansion_record', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.expansion_record (
        expansion_record_id    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),          -- PK
        knowledge_node_id      UNIQUEIDENTIFIER NOT NULL,                          -- FK -> knowledge_node(knowledge_node_id)
        reasoning              NVARCHAR(MAX)    NOT NULL,                          -- Text explanation
        traced_to              NVARCHAR(MAX)    NOT NULL,                          -- Serialized JSON array of UUID sources
        created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type  NVARCHAR(50)     NOT NULL DEFAULT 'ai_service',
        created_by_actor_id    UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.expansion_record';
END;

-- -----------------------------------------------------------------------------
-- 6. knowledge_node_evidence (Junction Entity — M:N link from evidence to nodes)
-- Traceability: DECISION-022 (Many-to-Many Evidence links)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.knowledge_node_evidence', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.knowledge_node_evidence (
        knowledge_node_id      UNIQUEIDENTIFIER NOT NULL,                          -- FK -> knowledge_node(knowledge_node_id)
        evidence_id            UNIQUEIDENTIFIER NOT NULL,                          -- FK -> evidence(evidence_id)
        stance                 NVARCHAR(50)     NOT NULL,                          -- 'support' | 'refute'
        created_at             DATETIMEOFFSET   NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    PRINT 'Created table dbo.knowledge_node_evidence';
END;
