-- =============================================================================
-- 05_Knowledge_Validation_Queries.sql
-- AI Mentor OS — Knowledge Engine (SQL Server Compatible)
--
-- Scope: Graph diagnostic and validation queries.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. GRAPH CYCLE DETECTION QUERY
-- Purpose: Recursively traverse the DAG and identify if any cyclic path exists.
--          Returns rows only if a cycle ($A \to B \to \dots \to A$) is detected.
-- Traceability: DECISION-025 (DAG validation), DECISION-029
-- -----------------------------------------------------------------------------
WITH path_cte AS (
    -- Anchor member: select all base relations
    SELECT 
        from_knowledge_node_id, 
        to_knowledge_node_id, 
        CAST(CONCAT('/', CAST(from_knowledge_node_id AS VARCHAR(50)), '/', CAST(to_knowledge_node_id AS VARCHAR(50)), '/') AS VARCHAR(8000)) AS path,
        0 AS is_cycle
    FROM dbo.knowledge_relation
    
    UNION ALL
    
    -- Recursive member: traverse prerequisites
    SELECT 
        p.from_knowledge_node_id,
        r.to_knowledge_node_id,
        CAST(CONCAT(p.path, CAST(r.to_knowledge_node_id AS VARCHAR(50)), '/') AS VARCHAR(8000)) AS path,
        CASE 
            WHEN p.path LIKE CONCAT('%/', CAST(r.to_knowledge_node_id AS VARCHAR(50)), '/%') THEN 1
            ELSE 0
        END AS is_cycle
    FROM path_cte p
    JOIN dbo.knowledge_relation r ON p.to_knowledge_node_id = r.from_knowledge_node_id
    WHERE p.is_cycle = 0
)
SELECT 
    from_knowledge_node_id,
    to_knowledge_node_id,
    path AS cyclic_path
FROM path_cte 
WHERE is_cycle = 1;

-- -----------------------------------------------------------------------------
-- 2. ORPHAN NODE DETECTION
-- Purpose: Find knowledge nodes that have no prerequisites and are not prerequisites
--          for any other node (completely disconnected components).
-- -----------------------------------------------------------------------------
SELECT 
    kn.knowledge_node_id,
    kn.title,
    kn.[status]
FROM dbo.knowledge_node kn
LEFT JOIN dbo.knowledge_relation kr_parent ON kn.knowledge_node_id = kr_parent.from_knowledge_node_id
LEFT JOIN dbo.knowledge_relation kr_child ON kn.knowledge_node_id = kr_child.to_knowledge_node_id
WHERE kr_parent.from_knowledge_node_id IS NULL 
  AND kr_child.to_knowledge_node_id IS NULL;

-- -----------------------------------------------------------------------------
-- 3. MASTERY CONSISTENCY CHECK
-- Purpose: Verify if all recorded mastery levels fall within valid parameters
--          and count distribution profiles.
-- -----------------------------------------------------------------------------
SELECT 
    mastery_level,
    COUNT(1) AS learner_count,
    AVG(teach_composite_score) AS average_teach_score
FROM dbo.mastery_record
GROUP BY mastery_level;

-- -----------------------------------------------------------------------------
-- 4. EVIDENCE CONSISTENCY AUDIT
-- Purpose: Detect any evidence record that is not mapped to any knowledge node,
--          or maps to a non-existent node.
-- -----------------------------------------------------------------------------
SELECT 
    e.evidence_id,
    e.source_type,
    e.direction,
    kne.knowledge_node_id
FROM dbo.evidence e
LEFT JOIN dbo.knowledge_node_evidence kne ON e.evidence_id = kne.evidence_id
WHERE kne.knowledge_node_id IS NULL;

-- -----------------------------------------------------------------------------
-- 5. EXPANSION EXPLAINABILITY COVERAGE QUERY
-- Purpose: Calculate the percentage of dynamic expansion nodes (local/structural
--          added by systems) that possess an ExpansionRecord audit trail.
-- Traceability: DECISION-023 (Expansion Audit), DECISION-027 (Explainability First)
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(kn.knowledge_node_id) AS total_expanded_nodes,
    COUNT(er.expansion_record_id) AS logged_expansion_records,
    (CAST(COUNT(er.expansion_record_id) AS DECIMAL(5,2)) / NULLIF(COUNT(kn.knowledge_node_id), 0)) * 100 AS explainability_coverage_pct
FROM dbo.knowledge_node kn
LEFT JOIN dbo.expansion_record er ON kn.knowledge_node_id = er.knowledge_node_id
WHERE kn.created_by_actor_type = 'ai_service';

-- -----------------------------------------------------------------------------
-- 6. REGRESSION DIAGNOSTICS QUERY
-- Purpose: Sum up negative evidence weights using decision-locked weights:
--          Test = 1.0, Lab = 0.8, Probe = 0.5, Chat = 0.3.
--          Returns learner-node pairs that exceed the 1.5 demotion trigger.
-- Traceability: DECISION-053 (Regression weights and threshold)
-- -----------------------------------------------------------------------------
SELECT 
    e.learner_id,
    kne.knowledge_node_id,
    kn.title AS node_title,
    SUM(
        CASE e.source_type
            WHEN 'Test' THEN 1.0
            WHEN 'Lab' THEN 0.8
            WHEN 'Probe' THEN 0.5
            WHEN 'Chat' THEN 0.3
            ELSE 0.1
        END * e.ai_confidence
    ) AS total_negative_weight,
    CASE 
        WHEN SUM(
            CASE e.source_type
                WHEN 'Test' THEN 1.0
                WHEN 'Lab' THEN 0.8
                WHEN 'Probe' THEN 0.5
                WHEN 'Chat' THEN 0.3
                ELSE 0.1
            END * e.ai_confidence
        ) >= 1.5 THEN 'TRIGGER_REGRESSION_DEMOTION'
        ELSE 'STABLE'
    END AS evaluation_verdict
FROM dbo.evidence e
JOIN dbo.knowledge_node_evidence kne ON e.evidence_id = kne.evidence_id
JOIN dbo.knowledge_node kn ON kne.knowledge_node_id = kn.knowledge_node_id
WHERE e.direction = 'negative'
GROUP BY e.learner_id, kne.knowledge_node_id, kn.title;
