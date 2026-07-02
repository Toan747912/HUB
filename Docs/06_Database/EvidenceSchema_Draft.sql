-- =========================================================
-- Evidence Domain Draft Schema (SQL Server Compatible)
-- Status: Draft Design Artifact (No migrations/scaffolding)
-- Traceability: DECISION-026, DECISION-048, DECISION-053
-- =========================================================

-- Notes:
-- 1) Evidence Domain owns evidence capture/verification metadata.
-- 2) Assessment Domain remains sole owner of mastery/regression decisions.
-- 3) This script is draft documentation, not execution-ready migration.

-- =========================================================
-- Table: dbo.evidence_source
-- =========================================================
IF OBJECT_ID('dbo.evidence_source', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidence_source (
        evidence_source_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_evidence_source PRIMARY KEY,
        owner_domain NVARCHAR(64) NOT NULL,              -- Discovery | Teaching | Assessment | LearningSession
        owner_entity_type NVARCHAR(64) NOT NULL,         -- discovery_session, mentor_session, assessment_attempt, sub_session...
        owner_entity_id UNIQUEIDENTIFIER NOT NULL,
        evidence_type NVARCHAR(64) NOT NULL,             -- Quiz, Exercise, Lab, Project, Reflection, PeerReview, TeachingDemonstration, MentorInteraction
        source_reliability_tier NVARCHAR(32) NOT NULL,   -- high | medium | low
        default_source_weight DECIMAL(5,4) NOT NULL,     -- > 0 and <= 1
        capture_context NVARCHAR(MAX) NULL,              -- JSON payload as NVARCHAR(MAX)
        captured_at DATETIMEOFFSET NOT NULL,
        
        created_at DATETIMEOFFSET NOT NULL,
        created_by_actor_type NVARCHAR(32) NOT NULL,
        created_by_actor_id NVARCHAR(128) NOT NULL,
        updated_at DATETIMEOFFSET NULL,
        updated_by_actor_type NVARCHAR(32) NULL,
        updated_by_actor_id NVARCHAR(128) NULL,
        deleted_at DATETIMEOFFSET NULL,
        deleted_by_actor_id NVARCHAR(128) NULL,

        CONSTRAINT CK_evidence_source_owner_domain
            CHECK (owner_domain IN ('Discovery','Teaching','Assessment','LearningSession')),

        CONSTRAINT CK_evidence_source_weight
            CHECK (default_source_weight > 0 AND default_source_weight <= 1),

        CONSTRAINT CK_evidence_source_reliability
            CHECK (source_reliability_tier IN ('high','medium','low')),

        CONSTRAINT CK_evidence_source_type
            CHECK (evidence_type IN ('Quiz','Exercise','Lab','Project','Reflection','PeerReview','TeachingDemonstration','MentorInteraction'))
    );
END;
GO

-- =========================================================
-- Table: dbo.evidence
-- =========================================================
IF OBJECT_ID('dbo.evidence', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidence (
        evidence_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_evidence PRIMARY KEY,
        learner_id UNIQUEIDENTIFIER NOT NULL,
        knowledge_node_id UNIQUEIDENTIFIER NOT NULL,
        evidence_source_id UNIQUEIDENTIFIER NOT NULL,
        
        evidence_type NVARCHAR(64) NOT NULL,
        direction NVARCHAR(16) NOT NULL,                 -- positive | negative | mixed
        state NVARCHAR(32) NOT NULL,                     -- ACTIVE | PAUSED | COMPLETED | ARCHIVED | BLOCKED
        
        raw_reference NVARCHAR(MAX) NOT NULL,            -- JSON/text pointer to raw artifact
        normalized_payload NVARCHAR(MAX) NULL,           -- JSON normalized evidence payload
        
        source_weight DECIMAL(5,4) NULL,
        ai_confidence DECIMAL(5,4) NULL,
        evidence_weight DECIMAL(9,6) NULL,

        reasoning NVARCHAR(MAX) NULL,
        superseded_by_evidence_id UNIQUEIDENTIFIER NULL,

        created_at DATETIMEOFFSET NOT NULL,
        created_by_actor_type NVARCHAR(32) NOT NULL,
        created_by_actor_id NVARCHAR(128) NOT NULL,
        updated_at DATETIMEOFFSET NULL,
        updated_by_actor_type NVARCHAR(32) NULL,
        updated_by_actor_id NVARCHAR(128) NULL,
        deleted_at DATETIMEOFFSET NULL,
        deleted_by_actor_id NVARCHAR(128) NULL,

        CONSTRAINT FK_evidence_source
            FOREIGN KEY (evidence_source_id) REFERENCES dbo.evidence_source(evidence_source_id),

        CONSTRAINT FK_evidence_superseded_by
            FOREIGN KEY (superseded_by_evidence_id) REFERENCES dbo.evidence(evidence_id),

        CONSTRAINT CK_evidence_type
            CHECK (evidence_type IN ('Quiz','Exercise','Lab','Project','Reflection','PeerReview','TeachingDemonstration','MentorInteraction')),

        CONSTRAINT CK_evidence_direction
            CHECK (direction IN ('positive','negative','mixed')),

        CONSTRAINT CK_evidence_state
            CHECK (state IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED','BLOCKED')),

        CONSTRAINT CK_evidence_confidence_range
            CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),

        CONSTRAINT CK_evidence_source_weight_range
            CHECK (source_weight IS NULL OR (source_weight > 0 AND source_weight <= 1)),

        CONSTRAINT CK_evidence_weight_nonnegative
            CHECK (evidence_weight IS NULL OR evidence_weight >= 0),

        -- COMPLETED requires explainability and computed weights
        CONSTRAINT CK_evidence_completed_requirements
            CHECK (
                state <> 'COMPLETED'
                OR (
                    ai_confidence IS NOT NULL
                    AND source_weight IS NOT NULL
                    AND evidence_weight IS NOT NULL
                    AND reasoning IS NOT NULL
                    AND LEN(LTRIM(RTRIM(reasoning))) > 0
                )
            ),

        -- Archived (legacy superseded mapping) must link successor when superseded linkage is present
        CONSTRAINT CK_evidence_superseded_requires_link
            CHECK (
                state <> 'ARCHIVED'
                OR superseded_by_evidence_id IS NOT NULL
            )
    );
END;
GO

-- =========================================================
-- Table: dbo.evidence_verification
-- =========================================================
IF OBJECT_ID('dbo.evidence_verification', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidence_verification (
        evidence_verification_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_evidence_verification PRIMARY KEY,
        evidence_id UNIQUEIDENTIFIER NOT NULL,
        
        verification_mode NVARCHAR(32) NOT NULL,         -- ai | human | hybrid
        status NVARCHAR(32) NOT NULL,                    -- ACTIVE | PAUSED | COMPLETED | ARCHIVED | BLOCKED
        
        is_verifiable BIT NULL,
        confidence DECIMAL(5,4) NULL,
        reasoning NVARCHAR(MAX) NULL,

        source_weight DECIMAL(5,4) NULL,
        ai_confidence DECIMAL(5,4) NULL,
        evidence_weight DECIMAL(9,6) NULL,

        failure_code NVARCHAR(64) NULL,
        failure_details NVARCHAR(MAX) NULL,              -- JSON/details

        requested_at DATETIMEOFFSET NOT NULL,
        completed_at DATETIMEOFFSET NULL,

        created_at DATETIMEOFFSET NOT NULL,
        created_by_actor_type NVARCHAR(32) NOT NULL,
        created_by_actor_id NVARCHAR(128) NOT NULL,
        updated_at DATETIMEOFFSET NULL,
        updated_by_actor_type NVARCHAR(32) NULL,
        updated_by_actor_id NVARCHAR(128) NULL,
        deleted_at DATETIMEOFFSET NULL,
        deleted_by_actor_id NVARCHAR(128) NULL,

        CONSTRAINT FK_evidence_verification_evidence
            FOREIGN KEY (evidence_id) REFERENCES dbo.evidence(evidence_id),

        CONSTRAINT CK_evidence_verification_mode
            CHECK (verification_mode IN ('ai','human','hybrid')),

        CONSTRAINT CK_evidence_verification_status
            CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','ARCHIVED','BLOCKED')),

        CONSTRAINT CK_evidence_verification_confidence
            CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

        CONSTRAINT CK_evidence_verification_ai_confidence
            CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1))
    );
END;
GO

-- =========================================================
-- Table: dbo.evidence_trace_link
-- =========================================================
IF OBJECT_ID('dbo.evidence_trace_link', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.evidence_trace_link (
        evidence_trace_link_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_evidence_trace_link PRIMARY KEY,
        evidence_id UNIQUEIDENTIFIER NOT NULL,
        evidence_verification_id UNIQUEIDENTIFIER NULL,  -- optional link at verification stage
        
        trace_type NVARCHAR(64) NOT NULL,                -- mentor_turn, submission, lab_run, test_case, rubric_item...
        trace_ref NVARCHAR(256) NOT NULL,                -- stable reference token
        trace_metadata NVARCHAR(MAX) NULL,               -- JSON metadata
        
        created_at DATETIMEOFFSET NOT NULL,
        created_by_actor_type NVARCHAR(32) NOT NULL,
        created_by_actor_id NVARCHAR(128) NOT NULL,
        deleted_at DATETIMEOFFSET NULL,
        deleted_by_actor_id NVARCHAR(128) NULL,

        CONSTRAINT FK_evidence_trace_link_evidence
            FOREIGN KEY (evidence_id) REFERENCES dbo.evidence(evidence_id),

        CONSTRAINT FK_evidence_trace_link_verification
            FOREIGN KEY (evidence_verification_id) REFERENCES dbo.evidence_verification(evidence_verification_id),

        CONSTRAINT UQ_evidence_trace_unique
            UNIQUE (evidence_id, trace_type, trace_ref)
    );
END;
GO

-- =========================================================
-- Indexes
-- =========================================================

-- evidence_source indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_source_owner' AND object_id = OBJECT_ID('dbo.evidence_source'))
BEGIN
    CREATE INDEX IX_evidence_source_owner
    ON dbo.evidence_source (owner_domain, owner_entity_type, owner_entity_id)
    INCLUDE (evidence_type, default_source_weight, captured_at, deleted_at);
END;
GO

-- evidence indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_learner_node_state' AND object_id = OBJECT_ID('dbo.evidence'))
BEGIN
    CREATE INDEX IX_evidence_learner_node_state
    ON dbo.evidence (learner_id, knowledge_node_id, state, direction)
    INCLUDE (evidence_weight, ai_confidence, source_weight, created_at, deleted_at);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_source_id' AND object_id = OBJECT_ID('dbo.evidence'))
BEGIN
    CREATE INDEX IX_evidence_source_id
    ON dbo.evidence (evidence_source_id)
    INCLUDE (state, created_at, deleted_at);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_superseded_by' AND object_id = OBJECT_ID('dbo.evidence'))
BEGIN
    CREATE INDEX IX_evidence_superseded_by
    ON dbo.evidence (superseded_by_evidence_id)
    INCLUDE (state, updated_at, deleted_at);
END;
GO

-- verification indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_verification_evidence_status' AND object_id = OBJECT_ID('dbo.evidence_verification'))
BEGIN
    CREATE INDEX IX_evidence_verification_evidence_status
    ON dbo.evidence_verification (evidence_id, status, requested_at)
    INCLUDE (completed_at, confidence, evidence_weight, deleted_at);
END;
GO

-- trace indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_trace_evidence' AND object_id = OBJECT_ID('dbo.evidence_trace_link'))
BEGIN
    CREATE INDEX IX_evidence_trace_evidence
    ON dbo.evidence_trace_link (evidence_id, trace_type)
    INCLUDE (trace_ref, created_at, deleted_at);
END;
GO

-- =========================================================
-- Soft Delete Strategy
-- =========================================================
-- Convention:
--  - active row: deleted_at IS NULL
--  - soft deleted row: deleted_at IS NOT NULL
-- Query guidance:
--  - default read models should filter deleted_at IS NULL
--  - audit/reporting models may include deleted rows intentionally

-- =========================================================
-- Suggested Computed Consistency Check (Documentation Only)
-- =========================================================
-- SQL Server CHECK constraints cannot reference other rows but can validate row math.
-- Consider enabling additional persisted computed column in implementation phase:
--   evidence_weight_calc AS (source_weight * ai_confidence) PERSISTED
-- and compare against evidence_weight if dual-field storage retained.

-- =========================================================
-- Ownership Reminder (Documentation)
-- =========================================================
-- These tables do not grant authority to mutate mastery/regression/recommendation/roadmap.
-- Assessment domain remains sole owner for mastery/regression decisions (DECISION-026).
