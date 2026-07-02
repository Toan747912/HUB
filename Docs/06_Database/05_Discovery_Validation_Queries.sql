-- =============================================================================
-- 05_Discovery_Validation_Queries.sql
-- AI Mentor OS — Discovery Engine (SQL Server Compatible)
--
-- Scope: Validation and analysis queries demonstrating engine rule enforcement.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. COVERAGE QUERY
-- Purpose: Verify if all claimed skill areas in a discovery session have 
--          received at least one evaluated competency signal.
-- -----------------------------------------------------------------------------
SELECT 
    ds.discovery_session_id,
    ds.state AS session_state,
    csa.claimed_skill_area_id,
    csa.label AS skill_label,
    CASE 
        WHEN cs.competency_signal_id IS NULL THEN 'UNASSESSED'
        ELSE 'ASSESSED'
    END AS assessment_status,
    cs.self_reported_level,
    cs.observed_level
FROM dbo.discovery_session ds
JOIN dbo.claimed_skill_area csa ON ds.discovery_session_id = csa.discovery_session_id
LEFT JOIN dbo.competency_signal cs ON csa.claimed_skill_area_id = cs.claimed_skill_area_id
WHERE ds.discovery_session_id = 'D1111111-1111-1111-1111-111111111111';

-- -----------------------------------------------------------------------------
-- 2. MISMATCH TRACE QUERY (Explainability Linkage Trail)
-- Purpose: Trace a self-assessment mismatch back to its competency signal,
--          the mapped knowledge graph node, and the specific answer that triggered it.
-- Traceability: DECISION-048 (Explainability First), DECISION-051 (Mismatch Detection)
-- -----------------------------------------------------------------------------
SELECT 
    m.self_assessment_mismatch_id,
    m.reasoning AS mismatch_reasoning,
    cs.self_reported_level,
    cs.observed_level,
    csa.label AS claimed_skill,
    kn.title AS knowledge_graph_node,
    da.raw_input AS user_raw_answer,
    dq.prompt_text AS asked_question
FROM dbo.self_assessment_mismatch m
JOIN dbo.competency_signal cs ON m.competency_signal_id = cs.competency_signal_id
JOIN dbo.claimed_skill_area csa ON cs.claimed_skill_area_id = csa.claimed_skill_area_id
LEFT JOIN dbo.knowledge_node kn ON m.knowledge_node_id = kn.knowledge_node_id
-- Trace back through the M:N source answer links
JOIN dbo.competency_signal_source_answer cssa ON cs.competency_signal_id = cssa.competency_signal_id
JOIN dbo.discovery_answer da ON cssa.discovery_answer_id = da.discovery_answer_id
JOIN dbo.discovery_question dq ON da.discovery_question_id = dq.discovery_question_id
WHERE m.discovery_session_id = 'D1111111-1111-1111-1111-111111111111';

-- -----------------------------------------------------------------------------
-- 3. CONCURRENCY LOOKUP & AUTO-ARCHIVE VALIDATION
-- Purpose: Query active vs archived sessions for a learner-goal pair to audit
--          concurrency state compliance.
-- Traceability: DECISION-054
-- -----------------------------------------------------------------------------
SELECT 
    discovery_session_id,
    learner_id,
    goal_id,
    [state] AS session_state,
    started_at,
    archived_at,
    superseded_by_discovery_session_id,
    CASE 
        WHEN archived_at IS NOT NULL THEN 'ARCHIVED/SUPERSEDED'
        WHEN [state] IN ('INIT', 'DISCOVERY', 'BLOCKED') THEN 'ACTIVE'
        ELSE 'TERMINAL'
    END AS status_classification
FROM dbo.discovery_session
WHERE learner_id = 'A2E651D8-809C-4CDA-8109-BD5D8307ED66' 
  AND goal_id = 'F9B82A62-D436-4E03-B28B-956E446E108F'
ORDER BY started_at DESC;

-- -----------------------------------------------------------------------------
-- 4. TEACH CAPABILITY COMPOSITE SCORE QUERY
-- Purpose: Calculate the composite score for a skill mapping under the Teach
--          sub-capability progressive weight model.
-- Traceability: DECISION-052
--
-- Note: Sub-capability levels are mapped to numerical weights:
--       Unknown = 0.0, Remember = 0.25, Explain = 0.50, Apply = 0.75, Teach = 1.0
--       Weights: Explain (10%), Simplify (15%), Guide (25%), Review (25%), Transfer (25%)
-- -----------------------------------------------------------------------------
WITH sub_capability_mappings AS (
    SELECT 
        cs.competency_signal_id,
        csa.label AS skill_label,
        -- Illustrative: Mock sub-capability scores derived from dynamic probing
        0.75 AS val_explain,  -- 'Apply'
        0.50 AS val_simplify, -- 'Explain'
        1.00 AS val_guide,    -- 'Teach'
        0.75 AS val_review,   -- 'Apply'
        0.50 AS val_transfer  -- 'Explain'
    FROM dbo.competency_signal cs
    JOIN dbo.claimed_skill_area csa ON cs.claimed_skill_area_id = csa.claimed_skill_area_id
    WHERE cs.discovery_session_id = 'D1111111-1111-1111-1111-111111111111'
)
SELECT 
    competency_signal_id,
    skill_label,
    (0.10 * val_explain) + 
    (0.15 * val_simplify) + 
    (0.25 * val_guide) + 
    (0.25 * val_review) + 
    (0.25 * val_transfer) AS composite_teach_score,
    CASE 
        WHEN ((0.10 * val_explain) + (0.15 * val_simplify) + (0.25 * val_guide) + (0.25 * val_review) + (0.25 * val_transfer)) >= 0.75 
        THEN 'PASSED_MASTERY'
        ELSE 'FAILED_MASTERY'
    END AS mastery_status
FROM sub_capability_mappings;

-- -----------------------------------------------------------------------------
-- 5. EVIDENCE CUMULATIVE WEIGHT REGRESSION CHECK
-- Purpose: Query to aggregate negative evidence weights mapping to a specific
--          knowledge node to evaluate whether it exceeds the 1.5 trigger.
-- Traceability: DECISION-053
-- -----------------------------------------------------------------------------
WITH mock_evidence_inputs AS (
    -- Illustrative mock values representing evidence rows linked to Knowledge Node 2
    SELECT 
        'Probe' AS source_type,
        1.0 AS ai_confidence,
        'negative' AS direction
    UNION ALL
    SELECT 
        'Test' AS source_type,
        0.9 AS ai_confidence,
        'negative' AS direction
)
SELECT 
    SUM(
        CASE source_type
            WHEN 'Test' THEN 1.0
            WHEN 'Lab' THEN 0.8
            WHEN 'Probe' THEN 0.5
            WHEN 'Chat' THEN 0.3
            ELSE 0.1
        END * ai_confidence
    ) AS total_negative_weight,
    CASE 
        WHEN SUM(
            CASE source_type
                WHEN 'Test' THEN 1.0
                WHEN 'Lab' THEN 0.8
                WHEN 'Probe' THEN 0.5
                WHEN 'Chat' THEN 0.3
                ELSE 0.1
            END * ai_confidence
        ) >= 1.5 THEN 'TRIGGER_REGRESSION'
        ELSE 'STABLE'
    END AS regression_status
FROM mock_evidence_inputs
WHERE direction = 'negative';
