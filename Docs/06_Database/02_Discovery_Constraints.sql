-- =============================================================================
-- 02_Discovery_Constraints.sql
-- AI Mentor OS — Discovery Engine (SQL Server Compatible)
--
-- Scope: Discovery PKs, FKs, UQs, and CKs.
-- Idempotency: Uses IF NOT EXISTS against metadata tables (sys.key_constraints,
--              sys.foreign_keys, sys.check_constraints) and sys.tables.
-- =============================================================================

-- =============================================================================
-- 1. PRIMARY KEYS
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_discovery_session' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT PK_discovery_session PRIMARY KEY CLUSTERED (discovery_session_id);
    PRINT 'Added primary key PK_discovery_session';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_claimed_skill_area' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.claimed_skill_area ADD CONSTRAINT PK_claimed_skill_area PRIMARY KEY CLUSTERED (claimed_skill_area_id);
    PRINT 'Added primary key PK_claimed_skill_area';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_claimed_skill_area_source_answer' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.claimed_skill_area_source_answer ADD CONSTRAINT PK_claimed_skill_area_source_answer PRIMARY KEY CLUSTERED (claimed_skill_area_id, discovery_answer_id);
    PRINT 'Added primary key PK_claimed_skill_area_source_answer';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_discovery_question' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.discovery_question ADD CONSTRAINT PK_discovery_question PRIMARY KEY CLUSTERED (discovery_question_id);
    PRINT 'Added primary key PK_discovery_question';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_discovery_answer' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.discovery_answer ADD CONSTRAINT PK_discovery_answer PRIMARY KEY CLUSTERED (discovery_answer_id);
    PRINT 'Added primary key PK_discovery_answer';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_competency_signal' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.competency_signal ADD CONSTRAINT PK_competency_signal PRIMARY KEY CLUSTERED (competency_signal_id);
    PRINT 'Added primary key PK_competency_signal';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_competency_signal_source_answer' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.competency_signal_source_answer ADD CONSTRAINT PK_competency_signal_source_answer PRIMARY KEY CLUSTERED (competency_signal_id, discovery_answer_id);
    PRINT 'Added primary key PK_competency_signal_source_answer';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_self_assessment_mismatch' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.self_assessment_mismatch ADD CONSTRAINT PK_self_assessment_mismatch PRIMARY KEY CLUSTERED (self_assessment_mismatch_id);
    PRINT 'Added primary key PK_self_assessment_mismatch';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_claimed_skill_area_knowledge_node' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.claimed_skill_area_knowledge_node ADD CONSTRAINT PK_claimed_skill_area_knowledge_node PRIMARY KEY CLUSTERED (claimed_skill_area_id, knowledge_node_id);
    PRINT 'Added primary key PK_claimed_skill_area_knowledge_node';
END;

-- =============================================================================
-- 2. FOREIGN KEYS (Self-contained and cross-domain defensive keys)
-- =============================================================================

-- discovery_session -> learner
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'learner')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_discovery_session_learner_id')
    BEGIN
        ALTER TABLE dbo.discovery_session ADD CONSTRAINT FK_discovery_session_learner_id 
            FOREIGN KEY (learner_id) REFERENCES dbo.learner(id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_discovery_session_learner_id';
    END;
END;

-- discovery_session -> goal
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'goal')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_discovery_session_goal_id')
    BEGIN
        ALTER TABLE dbo.discovery_session ADD CONSTRAINT FK_discovery_session_goal_id 
            FOREIGN KEY (goal_id) REFERENCES dbo.goal(goal_id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_discovery_session_goal_id';
    END;
END;

-- discovery_session -> discovery_session (superseding concurrency link, DECISION-054)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_discovery_session_superseded_id')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT FK_discovery_session_superseded_id 
        FOREIGN KEY (superseded_by_discovery_session_id) REFERENCES dbo.discovery_session(discovery_session_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_discovery_session_superseded_id';
END;

-- claimed_skill_area -> discovery_session
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_claimed_skill_area_session_id')
BEGIN
    ALTER TABLE dbo.claimed_skill_area ADD CONSTRAINT FK_claimed_skill_area_session_id 
        FOREIGN KEY (discovery_session_id) REFERENCES dbo.discovery_session(discovery_session_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_claimed_skill_area_session_id';
END;

-- claimed_skill_area_source_answer -> claimed_skill_area
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_claimed_skill_area_source_answer_skill_area_id')
BEGIN
    ALTER TABLE dbo.claimed_skill_area_source_answer ADD CONSTRAINT FK_claimed_skill_area_source_answer_skill_area_id 
        FOREIGN KEY (claimed_skill_area_id) REFERENCES dbo.claimed_skill_area(claimed_skill_area_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_claimed_skill_area_source_answer_skill_area_id';
END;

-- claimed_skill_area_source_answer -> discovery_answer
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_claimed_skill_area_source_answer_discovery_answer_id')
BEGIN
    ALTER TABLE dbo.claimed_skill_area_source_answer ADD CONSTRAINT FK_claimed_skill_area_source_answer_discovery_answer_id 
        FOREIGN KEY (discovery_answer_id) REFERENCES dbo.discovery_answer(discovery_answer_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_claimed_skill_area_source_answer_discovery_answer_id';
END;

-- discovery_question -> discovery_session
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_discovery_question_session_id')
BEGIN
    ALTER TABLE dbo.discovery_question ADD CONSTRAINT FK_discovery_question_session_id 
        FOREIGN KEY (discovery_session_id) REFERENCES dbo.discovery_session(discovery_session_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_discovery_question_session_id';
END;

-- discovery_answer -> discovery_question
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_discovery_answer_question_id')
BEGIN
    ALTER TABLE dbo.discovery_answer ADD CONSTRAINT FK_discovery_answer_question_id 
        FOREIGN KEY (discovery_question_id) REFERENCES dbo.discovery_question(discovery_question_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_discovery_answer_question_id';
END;

-- competency_signal -> discovery_session
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_competency_signal_session_id')
BEGIN
    ALTER TABLE dbo.competency_signal ADD CONSTRAINT FK_competency_signal_session_id 
        FOREIGN KEY (discovery_session_id) REFERENCES dbo.discovery_session(discovery_session_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_competency_signal_session_id';
END;

-- competency_signal -> claimed_skill_area (DECISION-055)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_competency_signal_claimed_skill_area_id')
BEGIN
    ALTER TABLE dbo.competency_signal ADD CONSTRAINT FK_competency_signal_claimed_skill_area_id 
        FOREIGN KEY (claimed_skill_area_id) REFERENCES dbo.claimed_skill_area(claimed_skill_area_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_competency_signal_claimed_skill_area_id';
END;

-- competency_signal_source_answer -> competency_signal
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_competency_signal_source_answer_signal_id')
BEGIN
    ALTER TABLE dbo.competency_signal_source_answer ADD CONSTRAINT FK_competency_signal_source_answer_signal_id 
        FOREIGN KEY (competency_signal_id) REFERENCES dbo.competency_signal(competency_signal_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_competency_signal_source_answer_signal_id';
END;

-- competency_signal_source_answer -> discovery_answer
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_competency_signal_source_answer_discovery_answer_id')
BEGIN
    ALTER TABLE dbo.competency_signal_source_answer ADD CONSTRAINT FK_competency_signal_source_answer_discovery_answer_id 
        FOREIGN KEY (discovery_answer_id) REFERENCES dbo.discovery_answer(discovery_answer_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_competency_signal_source_answer_discovery_answer_id';
END;

-- self_assessment_mismatch -> discovery_session
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_self_assessment_mismatch_session_id')
BEGIN
    ALTER TABLE dbo.self_assessment_mismatch ADD CONSTRAINT FK_self_assessment_mismatch_session_id 
        FOREIGN KEY (discovery_session_id) REFERENCES dbo.discovery_session(discovery_session_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_self_assessment_mismatch_session_id';
END;

-- self_assessment_mismatch -> competency_signal
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_self_assessment_mismatch_signal_id')
BEGIN
    ALTER TABLE dbo.self_assessment_mismatch ADD CONSTRAINT FK_self_assessment_mismatch_signal_id 
        FOREIGN KEY (competency_signal_id) REFERENCES dbo.competency_signal(competency_signal_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_self_assessment_mismatch_signal_id';
END;

-- self_assessment_mismatch -> knowledge_node (nullable, eventual mapping, DECISION-055)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'knowledge_node')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_self_assessment_mismatch_node_id')
    BEGIN
        ALTER TABLE dbo.self_assessment_mismatch ADD CONSTRAINT FK_self_assessment_mismatch_node_id 
            FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_self_assessment_mismatch_node_id';
    END;
END;

-- claimed_skill_area_knowledge_node -> claimed_skill_area
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_claimed_skill_area_knowledge_node_claimed_skill_area_id')
BEGIN
    ALTER TABLE dbo.claimed_skill_area_knowledge_node ADD CONSTRAINT FK_claimed_skill_area_knowledge_node_claimed_skill_area_id 
        FOREIGN KEY (claimed_skill_area_id) REFERENCES dbo.claimed_skill_area(claimed_skill_area_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_claimed_skill_area_knowledge_node_claimed_skill_area_id';
END;

-- claimed_skill_area_knowledge_node -> knowledge_node
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'knowledge_node')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_claimed_skill_area_knowledge_node_knowledge_node_id')
    BEGIN
        ALTER TABLE dbo.claimed_skill_area_knowledge_node ADD CONSTRAINT FK_claimed_skill_area_knowledge_node_knowledge_node_id 
            FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_claimed_skill_area_knowledge_node_knowledge_node_id';
    END;
END;

-- =============================================================================
-- 3. UNIQUE CONSTRAINTS
-- =============================================================================

-- Enforce exactly one answer per discovery question
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_discovery_answer_question_id' AND type = 'UQ')
BEGIN
    ALTER TABLE dbo.discovery_answer ADD CONSTRAINT UQ_discovery_answer_question_id UNIQUE (discovery_question_id);
    PRINT 'Added unique constraint UQ_discovery_answer_question_id';
END;

-- =============================================================================
-- 4. CHECK CONSTRAINTS
-- =============================================================================

-- discovery_session.trigger CHECK
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_session_trigger')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT CK_discovery_session_trigger 
        CHECK ([trigger] IN ('onboarding', 'continuous'));
    PRINT 'Added check constraint CK_discovery_session_trigger';
END;

-- discovery_session.state CHECK (states: DECISION-051 and DECISION-054)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_session_state')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT CK_discovery_session_state 
        CHECK ([state] IN ('INIT', 'DISCOVERY', 'DISCOVERY_COMPLETE', 'BLOCKED', 'EXPIRED', 'ABANDONED'));
    PRINT 'Added check constraint CK_discovery_session_state';
END;

-- discovery_session goal conditional CHECK
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_session_goal_required_for_continuous')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT CK_discovery_session_goal_required_for_continuous 
        CHECK ([trigger] <> 'continuous' OR goal_id IS NOT NULL);
    PRINT 'Added check constraint CK_discovery_session_goal_required_for_continuous';
END;

-- discovery_session actor audit validation
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_session_created_by_actor_type')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT CK_discovery_session_created_by_actor_type 
        CHECK (created_by_actor_type IN ('learner', 'backend_core', 'ai_service'));
    PRINT 'Added check constraint CK_discovery_session_created_by_actor_type';
END;

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_session_updated_by_actor_type')
BEGIN
    ALTER TABLE dbo.discovery_session ADD CONSTRAINT CK_discovery_session_updated_by_actor_type 
        CHECK (updated_by_actor_type IN ('learner', 'backend_core', 'ai_service'));
    PRINT 'Added check constraint CK_discovery_session_updated_by_actor_type';
END;

-- discovery_question capability CHECK
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_discovery_question_capability_source')
BEGIN
    ALTER TABLE dbo.discovery_question ADD CONSTRAINT CK_discovery_question_capability_source 
        CHECK (capability_source IN ('goal_clarification', 'competency_probing'));
    PRINT 'Added check constraint CK_discovery_question_capability_source';
END;

-- competency_signal level verification checks (DECISION-051)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_competency_signal_self_reported_level')
BEGIN
    ALTER TABLE dbo.competency_signal ADD CONSTRAINT CK_competency_signal_self_reported_level 
        CHECK (self_reported_level IN ('Unknown', 'Remember', 'Explain', 'Apply', 'Teach'));
    PRINT 'Added check constraint CK_competency_signal_self_reported_level';
END;

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_competency_signal_observed_level')
BEGIN
    ALTER TABLE dbo.competency_signal ADD CONSTRAINT CK_competency_signal_observed_level 
        CHECK (observed_level IN ('Unknown', 'Remember', 'Explain', 'Apply', 'Teach'));
    PRINT 'Added check constraint CK_competency_signal_observed_level';
END;

-- self_assessment_mismatch verification method constraint (DECISION-051)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_self_assessment_mismatch_verification_method')
BEGIN
    ALTER TABLE dbo.self_assessment_mismatch ADD CONSTRAINT CK_self_assessment_mismatch_verification_method 
        CHECK (verification_method = 'Calibrated Micro-Probe');
    PRINT 'Added check constraint CK_self_assessment_mismatch_verification_method';
END;
