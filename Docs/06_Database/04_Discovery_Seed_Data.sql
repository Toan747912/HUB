-- =============================================================================
-- 04_Discovery_Seed_Data.sql
-- AI Mentor OS — Discovery Engine (SQL Server Compatible)
--
-- Scope: Seed Data for testing and validating the Discovery schema.
-- Idempotency: Uses IF NOT EXISTS checks prior to all INSERT operations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STUBS FOR EXTERNAL DEPENDENCIES (Safe and idempotent for standalone tests)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.learner', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.learner (
        id UNIQUEIDENTIFIER PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

IF OBJECT_ID('dbo.goal', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.goal (
        goal_id UNIQUEIDENTIFIER PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

IF OBJECT_ID('dbo.knowledge_node', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.knowledge_node (
        knowledge_node_id UNIQUEIDENTIFIER PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

-- -----------------------------------------------------------------------------
-- 2. INSERTING MOCK STUB DATA
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM dbo.learner WHERE id = 'A2E651D8-809C-4CDA-8109-BD5D8307ED66')
BEGIN
    INSERT INTO dbo.learner (id, email) VALUES ('A2E651D8-809C-4CDA-8109-BD5D8307ED66', 'learner.test@aimentor.os');
    PRINT 'Seeded learner A2E651D8-809C-4CDA-8109-BD5D8307ED66';
END;

IF NOT EXISTS (SELECT * FROM dbo.goal WHERE goal_id = 'F9B82A62-D436-4E03-B28B-956E446E108F')
BEGIN
    INSERT INTO dbo.goal (goal_id, title) VALUES ('F9B82A62-D436-4E03-B28B-956E446E108F', 'Learn JWT Security Patterns');
    PRINT 'Seeded goal F9B82A62-D436-4E03-B28B-956E446E108F';
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'C1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title) VALUES ('C1111111-1111-1111-1111-111111111111', 'JWT Signature Verification');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'C2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title) VALUES ('C2222222-2222-2222-2222-222222222222', 'Token Storage Best Practices');
END;

IF NOT EXISTS (SELECT * FROM dbo.knowledge_node WHERE knowledge_node_id = 'C3333333-3333-3333-3333-333333333333')
BEGIN
    INSERT INTO dbo.knowledge_node (knowledge_node_id, title) VALUES ('C3333333-3333-3333-3333-333333333333', 'Refresh Token Rotation');
    PRINT 'Seeded knowledge_nodes';
END;

-- -----------------------------------------------------------------------------
-- 3. INSERTING DISCOVERY DATA (Onboarding session ending in DISCOVERY_COMPLETE)
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM dbo.discovery_session WHERE discovery_session_id = 'D1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.discovery_session (
        discovery_session_id, learner_id, goal_id, [trigger], [state], 
        created_by_actor_type, updated_by_actor_type
    ) VALUES (
        'D1111111-1111-1111-1111-111111111111', 
        'A2E651D8-809C-4CDA-8109-BD5D8307ED66', 
        'F9B82A62-D436-4E03-B28B-956E446E108F', 
        'onboarding', 
        'DISCOVERY_COMPLETE', 
        'learner', 
        'ai_service'
    );
    PRINT 'Seeded discovery_session D1111111-1111-1111-1111-111111111111';
END;

-- Seed claimed skill areas (DECISION-055)
IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area WHERE claimed_skill_area_id = 'S1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.claimed_skill_area (claimed_skill_area_id, discovery_session_id, label)
    VALUES ('S1111111-1111-1111-1111-111111111111', 'D1111111-1111-1111-1111-111111111111', 'JWT Signature Verification');
END;

IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area WHERE claimed_skill_area_id = 'S2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.claimed_skill_area (claimed_skill_area_id, discovery_session_id, label)
    VALUES ('S2222222-2222-2222-2222-222222222222', 'D1111111-1111-1111-1111-111111111111', 'Token Storage Best Practices');
    PRINT 'Seeded claimed_skill_areas';
END;

-- Seed discovery questions
IF NOT EXISTS (SELECT * FROM dbo.discovery_question WHERE discovery_question_id = 'Q1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.discovery_question (discovery_question_id, discovery_session_id, capability_source, prompt_text)
    VALUES ('Q1111111-1111-1111-1111-111111111111', 'D1111111-1111-1111-1111-111111111111', 'competency_probing', 'How do you verify a JWT signature?');
END;

IF NOT EXISTS (SELECT * FROM dbo.discovery_question WHERE discovery_question_id = 'Q2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.discovery_question (discovery_question_id, discovery_session_id, capability_source, prompt_text)
    VALUES ('Q2222222-2222-2222-2222-222222222222', 'D1111111-1111-1111-1111-111111111111', 'competency_probing', 'Where should you store a JWT in a web application to prevent XSS?');
    PRINT 'Seeded discovery_questions';
END;

-- Seed discovery answers
IF NOT EXISTS (SELECT * FROM dbo.discovery_answer WHERE discovery_answer_id = 'A1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.discovery_answer (discovery_answer_id, discovery_question_id, raw_input)
    VALUES ('A1111111-1111-1111-1111-111111111111', 'Q1111111-1111-1111-1111-111111111111', 'You check the signature using the public key and standard cryptographic algorithms like RS256.');
END;

IF NOT EXISTS (SELECT * FROM dbo.discovery_answer WHERE discovery_answer_id = 'A2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.discovery_answer (discovery_answer_id, discovery_question_id, raw_input)
    VALUES ('A2222222-2222-2222-2222-222222222222', 'Q2222222-2222-2222-2222-222222222222', 'I usually store it in local storage because it is very easy to access.');
    PRINT 'Seeded discovery_answers';
END;

-- Link claimed skill areas to their generating answers (DECISION-055)
IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area_source_answer WHERE claimed_skill_area_id = 'S1111111-1111-1111-1111-111111111111' AND discovery_answer_id = 'A1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.claimed_skill_area_source_answer (claimed_skill_area_id, discovery_answer_id)
    VALUES ('S1111111-1111-1111-1111-111111111111', 'A1111111-1111-1111-1111-111111111111');
END;

IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area_source_answer WHERE claimed_skill_area_id = 'S2222222-2222-2222-2222-222222222222' AND discovery_answer_id = 'A2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.claimed_skill_area_source_answer (claimed_skill_area_id, discovery_answer_id)
    VALUES ('S2222222-2222-2222-2222-222222222222', 'A2222222-2222-2222-2222-222222222222');
END;

-- Seed competency signals (observed vs self reported level)
IF NOT EXISTS (SELECT * FROM dbo.competency_signal WHERE competency_signal_id = 'G1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.competency_signal (competency_signal_id, discovery_session_id, claimed_skill_area_id, self_reported_level, observed_level)
    VALUES ('G1111111-1111-1111-1111-111111111111', 'D1111111-1111-1111-1111-111111111111', 'S1111111-1111-1111-1111-111111111111', 'Apply', 'Apply');
END;

IF NOT EXISTS (SELECT * FROM dbo.competency_signal WHERE competency_signal_id = 'G2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.competency_signal (competency_signal_id, discovery_session_id, claimed_skill_area_id, self_reported_level, observed_level)
    VALUES ('G2222222-2222-2222-2222-222222222222', 'D1111111-1111-1111-1111-111111111111', 'S2222222-2222-2222-2222-222222222222', 'Teach', 'Explain');
    PRINT 'Seeded competency_signals';
END;

-- Link competency signals to answers (DECISION-048 Explainability)
IF NOT EXISTS (SELECT * FROM dbo.competency_signal_source_answer WHERE competency_signal_id = 'G1111111-1111-1111-1111-111111111111' AND discovery_answer_id = 'A1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.competency_signal_source_answer (competency_signal_id, discovery_answer_id)
    VALUES ('G1111111-1111-1111-1111-111111111111', 'A1111111-1111-1111-1111-111111111111');
END;

IF NOT EXISTS (SELECT * FROM dbo.competency_signal_source_answer WHERE competency_signal_id = 'G2222222-2222-2222-2222-222222222222' AND discovery_answer_id = 'A2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.competency_signal_source_answer (competency_signal_id, discovery_answer_id)
    VALUES ('G2222222-2222-2222-2222-222222222222', 'A2222222-2222-2222-2222-222222222222');
END;

-- Seed self assessment mismatch (2 level gap between Teach and Explain triggers mismatch immediately, DECISION-051)
IF NOT EXISTS (SELECT * FROM dbo.self_assessment_mismatch WHERE self_assessment_mismatch_id = 'M1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.self_assessment_mismatch (
        self_assessment_mismatch_id, discovery_session_id, competency_signal_id, 
        knowledge_node_id, verification_method, reasoning
    ) VALUES (
        'M1111111-1111-1111-1111-111111111111', 
        'D1111111-1111-1111-1111-111111111111', 
        'G2222222-2222-2222-2222-222222222222', 
        'C2222222-2222-2222-2222-222222222222', -- Links to mapped node Token Storage Best Practices
        'Calibrated Micro-Probe', 
        'Learner claims Teach level but observes Explain level because they recommended storing tokens in local storage, which violates XSS prevention guidelines.'
    );
    PRINT 'Seeded self_assessment_mismatch M1111111-1111-1111-1111-111111111111';
END;

-- Seed asymmetric/eventual mappings to Knowledge Graph (DECISION-055)
IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area_knowledge_node WHERE claimed_skill_area_id = 'S1111111-1111-1111-1111-111111111111' AND knowledge_node_id = 'C1111111-1111-1111-1111-111111111111')
BEGIN
    INSERT INTO dbo.claimed_skill_area_knowledge_node (claimed_skill_area_id, knowledge_node_id)
    VALUES ('S1111111-1111-1111-1111-111111111111', 'C1111111-1111-1111-1111-111111111111');
END;

IF NOT EXISTS (SELECT * FROM dbo.claimed_skill_area_knowledge_node WHERE claimed_skill_area_id = 'S2222222-2222-2222-2222-222222222222' AND knowledge_node_id = 'C2222222-2222-2222-2222-222222222222')
BEGIN
    INSERT INTO dbo.claimed_skill_area_knowledge_node (claimed_skill_area_id, knowledge_node_id)
    VALUES ('S2222222-2222-2222-2222-222222222222', 'C2222222-2222-2222-2222-222222222222');
    PRINT 'Seeded claimed_skill_area_knowledge_node mappings';
END;
