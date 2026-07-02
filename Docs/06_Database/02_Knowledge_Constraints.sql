-- =============================================================================
-- 02_Knowledge_Constraints.sql
-- AI Mentor OS — Knowledge Engine (SQL Server Compatible)
--
-- Scope: Knowledge PKs, FKs, UQs, and CKs.
-- Idempotency: Uses IF NOT EXISTS against sys.key_constraints / sys.foreign_keys.
-- =============================================================================

-- =============================================================================
-- 1. PRIMARY KEYS
-- =============================================================================

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_knowledge_node' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.knowledge_node ADD CONSTRAINT PK_knowledge_node PRIMARY KEY CLUSTERED (knowledge_node_id);
    PRINT 'Added primary key PK_knowledge_node';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_knowledge_relation' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.knowledge_relation ADD CONSTRAINT PK_knowledge_relation PRIMARY KEY CLUSTERED (from_knowledge_node_id, to_knowledge_node_id);
    PRINT 'Added primary key PK_knowledge_relation';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_evidence' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.evidence ADD CONSTRAINT PK_evidence PRIMARY KEY CLUSTERED (evidence_id);
    PRINT 'Added primary key PK_evidence';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_mastery_record' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.mastery_record ADD CONSTRAINT PK_mastery_record PRIMARY KEY CLUSTERED (mastery_record_id);
    PRINT 'Added primary key PK_mastery_record';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_expansion_record' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.expansion_record ADD CONSTRAINT PK_expansion_record PRIMARY KEY CLUSTERED (expansion_record_id);
    PRINT 'Added primary key PK_expansion_record';
END;

IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_knowledge_node_evidence' AND type = 'PK')
BEGIN
    ALTER TABLE dbo.knowledge_node_evidence ADD CONSTRAINT PK_knowledge_node_evidence PRIMARY KEY CLUSTERED (knowledge_node_id, evidence_id);
    PRINT 'Added primary key PK_knowledge_node_evidence';
END;

-- =============================================================================
-- 2. FOREIGN KEYS
-- =============================================================================

-- knowledge_relation -> knowledge_node (from)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_knowledge_relation_from_node')
BEGIN
    ALTER TABLE dbo.knowledge_relation ADD CONSTRAINT FK_knowledge_relation_from_node 
        FOREIGN KEY (from_knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_knowledge_relation_from_node';
END;

-- knowledge_relation -> knowledge_node (to)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_knowledge_relation_to_node')
BEGIN
    ALTER TABLE dbo.knowledge_relation ADD CONSTRAINT FK_knowledge_relation_to_node 
        FOREIGN KEY (to_knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_knowledge_relation_to_node';
END;

-- evidence -> learner (defensive validation)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'learner')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_evidence_learner_id')
    BEGIN
        ALTER TABLE dbo.evidence ADD CONSTRAINT FK_evidence_learner_id 
            FOREIGN KEY (learner_id) REFERENCES dbo.learner(id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_evidence_learner_id';
    END;
END;

-- mastery_record -> learner (defensive validation)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'learner')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_mastery_record_learner_id')
    BEGIN
        ALTER TABLE dbo.mastery_record ADD CONSTRAINT FK_mastery_record_learner_id 
            FOREIGN KEY (learner_id) REFERENCES dbo.learner(id) ON DELETE NO ACTION;
        PRINT 'Added foreign key FK_mastery_record_learner_id';
    END;
END;

-- mastery_record -> knowledge_node
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_mastery_record_node_id')
BEGIN
    ALTER TABLE dbo.mastery_record ADD CONSTRAINT FK_mastery_record_node_id 
        FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_mastery_record_node_id';
END;

-- expansion_record -> knowledge_node
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_expansion_record_node_id')
BEGIN
    ALTER TABLE dbo.expansion_record ADD CONSTRAINT FK_expansion_record_node_id 
        FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_expansion_record_node_id';
END;

-- knowledge_node_evidence -> knowledge_node
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_knowledge_node_evidence_node_id')
BEGIN
    ALTER TABLE dbo.knowledge_node_evidence ADD CONSTRAINT FK_knowledge_node_evidence_node_id 
        FOREIGN KEY (knowledge_node_id) REFERENCES dbo.knowledge_node(knowledge_node_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_knowledge_node_evidence_node_id';
END;

-- knowledge_node_evidence -> evidence
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_knowledge_node_evidence_evidence_id')
BEGIN
    ALTER TABLE dbo.knowledge_node_evidence ADD CONSTRAINT FK_knowledge_node_evidence_evidence_id 
        FOREIGN KEY (evidence_id) REFERENCES dbo.evidence(evidence_id) ON DELETE NO ACTION;
    PRINT 'Added foreign key FK_knowledge_node_evidence_evidence_id';
END;

-- =============================================================================
-- 3. UNIQUE CONSTRAINTS
-- =============================================================================

-- Enforce unique title semantic mapping across nodes
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_knowledge_node_title' AND type = 'UQ')
BEGIN
    ALTER TABLE dbo.knowledge_node ADD CONSTRAINT UQ_knowledge_node_title UNIQUE (title);
    PRINT 'Added unique constraint UQ_knowledge_node_title';
END;

-- Enforce exactly one mastery record per learner and knowledge node
IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_mastery_learner_node' AND type = 'UQ')
BEGIN
    ALTER TABLE dbo.mastery_record ADD CONSTRAINT UQ_mastery_learner_node UNIQUE (learner_id, knowledge_node_id);
    PRINT 'Added unique constraint UQ_mastery_learner_node';
END;

-- =============================================================================
-- 4. CHECK CONSTRAINTS
-- =============================================================================

-- knowledge_node.status validation
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_knowledge_node_status')
BEGIN
    ALTER TABLE dbo.knowledge_node ADD CONSTRAINT CK_knowledge_node_status 
        CHECK ([status] IN ('draft', 'local', 'structural', 'archived'));
    PRINT 'Added check constraint CK_knowledge_node_status';
END;

-- Prevent loops: Node cannot prerequisite or expand itself (no self-reference)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_knowledge_relation_no_self_reference')
BEGIN
    ALTER TABLE dbo.knowledge_relation ADD CONSTRAINT CK_knowledge_relation_no_self_reference 
        CHECK (from_knowledge_node_id <> to_knowledge_node_id);
    PRINT 'Added check constraint CK_knowledge_relation_no_self_reference';
END;

-- knowledge_relation.relation_type validation (DECISION-025)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_knowledge_relation_type')
BEGIN
    ALTER TABLE dbo.knowledge_relation ADD CONSTRAINT CK_knowledge_relation_type 
        CHECK (relation_type IN ('prerequisite_of', 'expands_to', 'related_to'));
    PRINT 'Added check constraint CK_knowledge_relation_type';
END;

-- evidence.source_type validation (DECISION-053)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_evidence_source_type')
BEGIN
    ALTER TABLE dbo.evidence ADD CONSTRAINT CK_evidence_source_type 
        CHECK (source_type IN ('Test', 'Lab', 'Probe', 'Chat'));
    PRINT 'Added check constraint CK_evidence_source_type';
END;

-- evidence.direction validation (DECISION-021/053)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_evidence_direction')
BEGIN
    ALTER TABLE dbo.evidence ADD CONSTRAINT CK_evidence_direction 
        CHECK (direction IN ('positive', 'negative'));
    PRINT 'Added check constraint CK_evidence_direction';
END;

-- evidence.ai_confidence range check (0.00 to 1.00)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_evidence_confidence_range')
BEGIN
    ALTER TABLE dbo.evidence ADD CONSTRAINT CK_evidence_confidence_range 
        CHECK (ai_confidence BETWEEN 0.00 AND 1.00);
    PRINT 'Added check constraint CK_evidence_confidence_range';
END;

-- mastery_record.mastery_level validation (DECISION-017)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_mastery_level_values')
BEGIN
    ALTER TABLE dbo.mastery_record ADD CONSTRAINT CK_mastery_level_values 
        CHECK (mastery_level IN ('Unknown', 'Remember', 'Explain', 'Apply', 'Teach'));
    PRINT 'Added check constraint CK_mastery_level_values';
END;

-- mastery_record.teach_composite_score range check (0.00 to 1.00)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_mastery_teach_score_range')
BEGIN
    ALTER TABLE dbo.mastery_record ADD CONSTRAINT CK_mastery_teach_score_range 
        CHECK (teach_composite_score BETWEEN 0.00 AND 1.00);
    PRINT 'Added check constraint CK_mastery_teach_score_range';
END;

-- knowledge_node_evidence.stance validation (DECISION-022)
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_node_evidence_stance')
BEGIN
    ALTER TABLE dbo.knowledge_node_evidence ADD CONSTRAINT CK_node_evidence_stance 
        CHECK (stance IN ('support', 'refute'));
    PRINT 'Added check constraint CK_node_evidence_stance';
END;
