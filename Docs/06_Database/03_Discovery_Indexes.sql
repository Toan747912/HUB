-- =============================================================================
-- 03_Discovery_Indexes.sql
-- AI Mentor OS — Discovery Engine (SQL Server Compatible)
--
-- Scope: Discovery Indexes.
-- Idempotency: Uses IF NOT EXISTS against sys.indexes.
-- =============================================================================

-- Indexes on discovery_session foreign keys
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_discovery_session_learner_id' AND object_id = OBJECT_ID('dbo.discovery_session'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_discovery_session_learner_id ON dbo.discovery_session(learner_id);
    PRINT 'Created index ix_discovery_session_learner_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_discovery_session_goal_id' AND object_id = OBJECT_ID('dbo.discovery_session'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_discovery_session_goal_id ON dbo.discovery_session(goal_id);
    PRINT 'Created index ix_discovery_session_goal_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_discovery_session_superseded_id' AND object_id = OBJECT_ID('dbo.discovery_session'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_discovery_session_superseded_id ON dbo.discovery_session(superseded_by_discovery_session_id);
    PRINT 'Created index ix_discovery_session_superseded_id';
END;

-- Index on claimed_skill_area parent link
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_claimed_skill_area_session_id' AND object_id = OBJECT_ID('dbo.claimed_skill_area'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_claimed_skill_area_session_id ON dbo.claimed_skill_area(discovery_session_id);
    PRINT 'Created index ix_claimed_skill_area_session_id';
END;

-- Index on discovery_question parent link
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_discovery_question_session_id' AND object_id = OBJECT_ID('dbo.discovery_question'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_discovery_question_session_id ON dbo.discovery_question(discovery_session_id);
    PRINT 'Created index ix_discovery_question_session_id';
END;

-- Indexes on competency_signal foreign keys (DECISION-055)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_competency_signal_session_id' AND object_id = OBJECT_ID('dbo.competency_signal'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_competency_signal_session_id ON dbo.competency_signal(discovery_session_id);
    PRINT 'Created index ix_competency_signal_session_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_competency_signal_claimed_skill_area_id' AND object_id = OBJECT_ID('dbo.competency_signal'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_competency_signal_claimed_skill_area_id ON dbo.competency_signal(claimed_skill_area_id);
    PRINT 'Created index ix_competency_signal_claimed_skill_area_id';
END;

-- Indexes on self_assessment_mismatch foreign keys
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_self_assessment_mismatch_session_id' AND object_id = OBJECT_ID('dbo.self_assessment_mismatch'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_self_assessment_mismatch_session_id ON dbo.self_assessment_mismatch(discovery_session_id);
    PRINT 'Created index ix_self_assessment_mismatch_session_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_self_assessment_mismatch_signal_id' AND object_id = OBJECT_ID('dbo.self_assessment_mismatch'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_self_assessment_mismatch_signal_id ON dbo.self_assessment_mismatch(competency_signal_id);
    PRINT 'Created index ix_self_assessment_mismatch_signal_id';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_self_assessment_mismatch_node_id' AND object_id = OBJECT_ID('dbo.self_assessment_mismatch'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_self_assessment_mismatch_node_id ON dbo.self_assessment_mismatch(knowledge_node_id);
    PRINT 'Created index ix_self_assessment_mismatch_node_id';
END;

-- Partial unique index on claimed_skill_area_knowledge_node to ensure only one active mapping exists (soft-delete compliance)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ux_claimed_skill_area_kn_active' AND object_id = OBJECT_ID('dbo.claimed_skill_area_knowledge_node'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_claimed_skill_area_kn_active 
        ON dbo.claimed_skill_area_knowledge_node(claimed_skill_area_id, knowledge_node_id) 
        WHERE removed_at IS NULL;
    PRINT 'Created partial unique index ux_claimed_skill_area_kn_active';
END;
