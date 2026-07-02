-- =============================================================================
-- 01_Discovery_Tables.sql
-- AI Mentor OS — Discovery Engine (SQL Server Compatible)
--
-- Scope: Discovery Tables Only.
-- Traceability: DECISION-051 to DECISION-055
-- Idempotency: Uses IF OBJECT_ID / IF NOT EXISTS guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. discovery_session (Aggregate Root — Mutable State Snapshot)
-- Traceability: DECISION-054 (concurrency and superseding columns)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.discovery_session', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.discovery_session (
        discovery_session_id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        learner_id                            UNIQUEIDENTIFIER NOT NULL,                 -- FK -> learner(id)
        goal_id                               UNIQUEIDENTIFIER NULL,                     -- FK -> goal(goal_id)
        [trigger]                             NVARCHAR(50) NOT NULL,                     -- 'onboarding' | 'continuous'
        [state]                               NVARCHAR(50) NOT NULL DEFAULT 'INIT',      -- 'INIT' | 'DISCOVERY' | 'DISCOVERY_COMPLETE' | 'BLOCKED' | 'EXPIRED' | 'ABANDONED'
        started_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        completed_at                          DATETIMEOFFSET NULL,
        archived_at                           DATETIMEOFFSET NULL,                       -- timestamp for superseded sessions
        superseded_by_discovery_session_id    UNIQUEIDENTIFIER NULL,                     -- FK -> discovery_session(discovery_session_id)
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL,                     -- 'learner' | 'backend_core' | 'ai_service'
        created_by_actor_id                   UNIQUEIDENTIFIER NULL,
        updated_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        updated_by_actor_type                 NVARCHAR(50) NOT NULL,
        updated_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.discovery_session';
END;

-- -----------------------------------------------------------------------------
-- 2. claimed_skill_area (Supporting Entity — Append-Only)
-- Traceability: DECISION-055 (skill area representation)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.claimed_skill_area', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.claimed_skill_area (
        claimed_skill_area_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        discovery_session_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> discovery_session(discovery_session_id)
        label                                 NVARCHAR(255) NOT NULL,                    -- Raw string label of the skill
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL DEFAULT 'ai_service',
        created_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.claimed_skill_area';
END;

-- -----------------------------------------------------------------------------
-- 3. claimed_skill_area_source_answer (Junction Entity — Append-Only M:N)
-- Traceability: DECISION-055 (tracing source answers for claimed areas)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.claimed_skill_area_source_answer', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.claimed_skill_area_source_answer (
        claimed_skill_area_id                 UNIQUEIDENTIFIER NOT NULL,                 -- FK -> claimed_skill_area(claimed_skill_area_id)
        discovery_answer_id                   UNIQUEIDENTIFIER NOT NULL                  -- FK -> discovery_answer(discovery_answer_id)
    );
    PRINT 'Created table dbo.claimed_skill_area_source_answer';
END;

-- -----------------------------------------------------------------------------
-- 4. discovery_question (Supporting Entity — Append-Only)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.discovery_question', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.discovery_question (
        discovery_question_id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        discovery_session_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> discovery_session(discovery_session_id)
        capability_source                     NVARCHAR(50) NOT NULL,                     -- 'goal_clarification' | 'competency_probing'
        prompt_text                           NVARCHAR(MAX) NOT NULL,
        asked_at                              DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL DEFAULT 'ai_service',
        created_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.discovery_question';
END;

-- -----------------------------------------------------------------------------
-- 5. discovery_answer (Supporting Entity — Append-Only, 1:0..1 with question)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.discovery_answer', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.discovery_answer (
        discovery_answer_id                   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        discovery_question_id                 UNIQUEIDENTIFIER NOT NULL,                 -- FK -> discovery_question(discovery_question_id)
        raw_input                             NVARCHAR(MAX) NOT NULL,                    -- Unstructured text response
        answered_at                           DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL DEFAULT 'learner',
        created_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.discovery_answer';
END;

-- -----------------------------------------------------------------------------
-- 6. competency_signal (Supporting Entity — Append-Only)
-- Traceability: DECISION-051 (confidence rating), DECISION-055 (maps to claimed_skill_area)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.competency_signal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.competency_signal (
        competency_signal_id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        discovery_session_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> discovery_session(discovery_session_id)
        claimed_skill_area_id                 UNIQUEIDENTIFIER NOT NULL,                 -- FK -> claimed_skill_area(claimed_skill_area_id)
        self_reported_level                   NVARCHAR(50) NOT NULL,                     -- level scale: Unknown/Remember/Explain/Apply/Teach
        observed_level                        NVARCHAR(50) NOT NULL,                     -- same scale
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL DEFAULT 'ai_service',
        created_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.competency_signal';
END;

-- -----------------------------------------------------------------------------
-- 7. competency_signal_source_answer (Junction Entity — Append-Only M:N)
-- Traceability: DECISION-048 (Explainability First, traced_to[] physical junction)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.competency_signal_source_answer', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.competency_signal_source_answer (
        competency_signal_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> competency_signal(competency_signal_id)
        discovery_answer_id                   UNIQUEIDENTIFIER NOT NULL                  -- FK -> discovery_answer(discovery_answer_id)
    );
    PRINT 'Created table dbo.competency_signal_source_answer';
END;

-- -----------------------------------------------------------------------------
-- 8. self_assessment_mismatch (Supporting Entity — Append-Only)
-- Traceability: DECISION-051 (mismatch threshold), DECISION-055 (nullable knowledge_node_id)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.self_assessment_mismatch', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.self_assessment_mismatch (
        self_assessment_mismatch_id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(), -- PK
        discovery_session_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> discovery_session(discovery_session_id)
        competency_signal_id                  UNIQUEIDENTIFIER NOT NULL,                 -- FK -> competency_signal(competency_signal_id)
        knowledge_node_id                     UNIQUEIDENTIFIER NULL,                     -- FK -> knowledge_node(knowledge_node_id), nullable before graph is mapped
        verification_method                   NVARCHAR(50) NOT NULL,                     -- locked as 'Calibrated Micro-Probe'
        reasoning                             NVARCHAR(MAX) NOT NULL,                    -- text explanation
        detected_at                           DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_at                            DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        created_by_actor_type                 NVARCHAR(50) NOT NULL DEFAULT 'ai_service',
        created_by_actor_id                   UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.self_assessment_mismatch';
END;

-- -----------------------------------------------------------------------------
-- 9. claimed_skill_area_knowledge_node (Cross-Domain Junction M:N)
-- Traceability: DECISION-055 (asymmetric/eventual mapping to Knowledge Graph)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.claimed_skill_area_knowledge_node', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.claimed_skill_area_knowledge_node (
        claimed_skill_area_id                 UNIQUEIDENTIFIER NOT NULL,                 -- FK -> claimed_skill_area(claimed_skill_area_id)
        knowledge_node_id                     UNIQUEIDENTIFIER NOT NULL,                 -- FK -> knowledge_node(knowledge_node_id)
        mapped_at                             DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        removed_at                            DATETIMEOFFSET NULL,                       -- soft-delete mapping history
        mapped_by_actor_type                  NVARCHAR(50) NOT NULL DEFAULT 'ai_service',
        mapped_by_actor_id                    UNIQUEIDENTIFIER NULL
    );
    PRINT 'Created table dbo.claimed_skill_area_knowledge_node';
END;
