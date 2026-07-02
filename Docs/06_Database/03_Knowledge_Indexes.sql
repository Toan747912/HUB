-- =============================================================================
-- 03_Knowledge_Indexes.sql
-- AI Mentor OS — Knowledge Engine (SQL Server Compatible)
--
-- Scope: Knowledge Indexes.
-- Idempotency: Uses IF NOT EXISTS against sys.indexes.
-- =============================================================================

-- Index for filtering nodes by state status (e.g. fetching only published 'structural' nodes)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_knowledge_node_status' AND object_id = OBJECT_ID('dbo.knowledge_node'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_knowledge_node_status ON dbo.knowledge_node([status]);
    PRINT 'Created index ix_knowledge_node_status';
END;

-- Traversal indexes (composite indices supporting recursion loops in CTEs)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_knowledge_relation_traversal_to' AND object_id = OBJECT_ID('dbo.knowledge_relation'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_knowledge_relation_traversal_to ON dbo.knowledge_relation(to_knowledge_node_id) INCLUDE (from_knowledge_node_id, relation_type);
    PRINT 'Created index ix_knowledge_relation_traversal_to';
END;

-- Indexes for evidence lookup by learner and timestamp (for time-independent assessment aggregation)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_evidence_lookup' AND object_id = OBJECT_ID('dbo.evidence'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_evidence_lookup ON dbo.evidence(learner_id, created_at) INCLUDE (source_type, direction, ai_confidence);
    PRINT 'Created index ix_evidence_lookup';
END;

-- Indexes for mastery record query lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_mastery_record_learner' AND object_id = OBJECT_ID('dbo.mastery_record'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_mastery_record_learner ON dbo.mastery_record(learner_id) INCLUDE (knowledge_node_id, mastery_level, teach_composite_score);
    PRINT 'Created index ix_mastery_record_learner';
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_mastery_record_node' AND object_id = OBJECT_ID('dbo.mastery_record'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_mastery_record_node ON dbo.mastery_record(knowledge_node_id);
    PRINT 'Created index ix_mastery_record_node';
END;

-- Index for mapping record audit traces
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_expansion_record_node' AND object_id = OBJECT_ID('dbo.expansion_record'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_expansion_record_node ON dbo.expansion_record(knowledge_node_id);
    PRINT 'Created index ix_expansion_record_node';
END;

-- Index for checking evidence association via junction table
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_knowledge_node_evidence_ids' AND object_id = OBJECT_ID('dbo.knowledge_node_evidence'))
BEGIN
    CREATE NONCLUSTERED INDEX ix_knowledge_node_evidence_ids ON dbo.knowledge_node_evidence(evidence_id) INCLUDE (stance);
    PRINT 'Created index ix_knowledge_node_evidence_ids';
END;
