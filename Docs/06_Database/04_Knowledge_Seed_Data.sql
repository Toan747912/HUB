-- =============================================================================
-- 04_Knowledge_Seed_Data.sql
-- AI Mentor OS — Knowledge Engine (SQL Server Compatible)
--
-- Scope: Seed Data for testing and validating the Knowledge schema.
-- Idempotency: Uses IF NOT EXISTS checks prior to all INSERT operations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STUBS FOR EXTERNAL DEPENDENCIES
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.learner', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.learner (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

IF NOT EXISTS (SELECT * FROM dbo.learner WHERE id = 'A2E651D8-809C-4CDA-8109-BD5D8307ED66')
BEGIN
    INSERT INTO dbo.learner (id, email) VALUES ('A2E651D8-809C-4CDA-8109-BD5D8307ED66', 'learner.test@aimentor.os');
    PRINT 'Seeded learner A2E651D8-809C-4CDA-8109-BD5D8307ED66';
END;

-- -----------------------------------------------------------------------------
-- 2. ONBOARDING & PREREQUISITE SAMPLE GRAPH
-- -----------------------------------------------------------------------------
-- Seed Knowledge Nodes
IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'K1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title, description, [status], created_by_actor_type)
    VALUES ('K1111111-1111-1111-1111-111111111111', 'Git Version Control', 'Basic commands and version tracing in Git', 'structural', 'backend_core');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'K2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title, description, [status], created_by_actor_type)
    VALUES ('K2222222-2222-2222-2222-222222222222', 'Branching and Merging', 'Creating, managing, and merging branches in Git', 'structural', 'backend_core');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'K3333333-3333-3333-3333-333333333333')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title, description, [status], created_by_actor_type)
    VALUES ('K3333333-3333-3333-3333-333333333333', 'Resolving Merge Conflicts', 'Understanding conflict markers and merging strategies', 'structural', 'backend_core');
    PRINT 'Seeded canonical knowledge_nodes';
END;

-- Seed Prerequisite Relations
IF NOT EXISTS (SELECT * FROM dbo.knowledge_relation WHERE from_knowledge_node_id = 'K1111111-1111-1111-1111-111111111111' AND to_knowledge_node_id = 'K2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.knowledge_relation (from_knowledge_node_id, to_knowledge_node_id, relation_type)
    VALUES ('K1111111-1111-1111-1111-111111111111', 'K2222222-2222-2222-2222-222222222222', 'prerequisite_of');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_relation WHERE from_knowledge_node_id = 'K2222222-2222-2222-2222-222222222222' AND to_knowledge_node_id = 'K3333333-3333-3333-3333-333333333333')
BEGIN
    INSERT INTO dbo.knowledge_relation (from_knowledge_node_id, to_knowledge_node_id, relation_type)
    VALUES ('K2222222-2222-2222-2222-222222222222', 'K3333333-3333-3333-3333-333333333333', 'prerequisite_of');
    PRINT 'Seeded knowledge prerequisite edges';
END;

-- -----------------------------------------------------------------------------
-- 3. MASTERY SAMPLE
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM dbo.mastery_record WHERE mastery_record_id = 'R1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.mastery_record (mastery_record_id, learner_id, knowledge_node_id, mastery_level)
    VALUES ('R1111111-1111-1111-1111-111111111111', 'A2E651D8-809C-4CDA-8109-BD5D8307ED66', 'K1111111-1111-1111-1111-111111111111', 'Apply');
    PRINT 'Seeded mastery record for Git Version Control (Level: Apply)';
END;

-- -----------------------------------------------------------------------------
-- 4. REGRESSION EVIDENCE SAMPLE (Negative evidence weight total: 1.50)
-- Traceability: DECISION-053 (Test = 1.0, Probe = 0.5, total negative = 1.5)
-- -----------------------------------------------------------------------------
-- Evidence 1: Test failure
IF NOT EXISTS (SELECT * FROM dbo.evidence WHERE evidence_id = 'E1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.evidence (evidence_id, learner_id, source_type, direction, ai_confidence, raw_content)
    VALUES ('E1111111-1111-1111-1111-111111111111', 'A2E651D8-809C-4CDA-8109-BD5D8307ED66', 'Test', 'negative', 1.00, '{"test_case_id":"T101","verdict":"failed"}');
END;

-- Evidence 2: Probe failure
IF NOT EXISTS (SELECT * FROM dbo.evidence WHERE evidence_id = 'E2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.evidence (evidence_id, learner_id, source_type, direction, ai_confidence, raw_content)
    VALUES ('E2222222-2222-2222-2222-222222222222', 'A2E651D8-809C-4CDA-8109-BD5D8307ED66', 'Probe', 'negative', 1.00, '{"probe_id":"P202","user_response":"incorrect"}');
    PRINT 'Seeded negative evidence records';
END;

-- Link Evidence to Git Version Control node
IF NOT EXISTS (SELECT * FROM dbo.knowledge_node_evidence WHERE knowledge_node_id = 'K1111111-1111-1111-1111-111111111111' AND evidence_id = 'E1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.knowledge_node_evidence (knowledge_node_id, evidence_id, stance)
    VALUES ('K1111111-1111-1111-1111-111111111111', 'E1111111-1111-1111-1111-111111111111', 'refute');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node_evidence WHERE knowledge_node_id = 'K1111111-1111-1111-1111-111111111111' AND evidence_id = 'E2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.knowledge_node_evidence (knowledge_node_id, evidence_id, stance)
    VALUES ('K1111111-1111-1111-1111-111111111111', 'E2222222-2222-2222-2222-222222222222', 'refute');
    PRINT 'Linked negative evidence to knowledge_node';
END;

-- -----------------------------------------------------------------------------
-- 5. DYNAMIC LOCAL EXPANSION SAMPLE
-- -----------------------------------------------------------------------------
-- Local Node Creation
IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'K4444444-4444-4444-4444-444444444444')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title, description, [status], created_by_actor_type)
    VALUES ('K4444444-4444-4444-4444-444444444444', 'Git Rebase vs Merge', 'Advanced study on rebasing commits compared to merging', 'local', 'ai_service');
END;

-- Edge expansions
IF NOT EXISTS (SELECT * FROM dbo.knowledge_relation WHERE from_knowledge_node_id = 'K2222222-2222-2222-2222-222222222222' AND to_knowledge_node_id = 'K4444444-4444-4444-4444-444444444444')
BEGIN
    INSERT INTO dbo.knowledge_relation (from_knowledge_node_id, to_knowledge_node_id, relation_type)
    VALUES ('K2222222-2222-2222-2222-222222222222', 'K4444444-4444-4444-4444-444444444444', 'expands_to');
END;

-- Expansion record
IF NOT EXISTS (SELECT * FROM dbo.expansion_record WHERE expansion_record_id = 'X1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.expansion_record (expansion_record_id, knowledge_node_id, reasoning, traced_to)
    VALUES ('X1111111-1111-1111-1111-111111111111', 'K4444444-4444-4444-4444-444444444444', 'Learner requested comparison of rebase vs merge. Mapped under Branching and Merging root node.', '["discovery_answer:A1111111-1111-1111-1111-111111111111"]');
    PRINT 'Seeded local expansion node, relation, and audit expansion record';
END;
