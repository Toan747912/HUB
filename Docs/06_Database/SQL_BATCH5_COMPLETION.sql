-- =====================================================================
-- SQL BATCH 5 — FULL SCHEMA COMPLETION
-- AI Mentor OS — PostgreSQL / Supabase
--
-- Scope: schema-completion only. NOT a new design round. Every
-- statement below closes a genuine, verified gap found while
-- re-reading SQL_BATCH0_INFRASTRUCTURE.sql through
-- SQL_BATCH4_DECISION_PERSISTENCE.sql verbatim against the 15 VERIFY
-- points in SQL_BATCH5_REVIEW.md. No CREATE TABLE, no new entity, no
-- new domain, no new Decision. No RLS (Batch 6 scope).
--
-- Exactly 3 statements. All 3 close the same class of gap: a FK
-- column whose only existing index has that column in a non-leading
-- position (or no index at all) — a B-Tree index only accelerates a
-- lookup on its leading column(s), so a query filtering by the FK
-- column alone cannot use the existing composite/unique index
-- efficiently. This is exactly the "PostgreSQL không tự tạo index cho
-- FK" principle already stated in POSTGRESQL_FEATURE_MATRIX.md mục 4.
--
-- Requires Batch 0-4 to have already run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Gap 1: assessment_result.knowledge_node_id
-- ---------------------------------------------------------------------
-- Existing index ix_assessment_result_learner_id_knowledge_node_id
-- (learner_id, knowledge_node_id) only accelerates lookups led by
-- learner_id. A query/ON DELETE RESTRICT check filtering by
-- knowledge_node_id alone (e.g. "all assessment results for this
-- node", or the RESTRICT check fired when a knowledge_node delete is
-- attempted) has no usable index without this one.
-- ---------------------------------------------------------------------

CREATE INDEX ix_assessment_result_knowledge_node_id
  ON public.assessment_result (knowledge_node_id);


-- ---------------------------------------------------------------------
-- Gap 2: knowledge_node_mastery.knowledge_node_id
-- ---------------------------------------------------------------------
-- Same pattern as Gap 1. uq_knowledge_node_mastery_learner_id_knowledge_node_id
-- (learner_id, knowledge_node_id) only accelerates lookups led by
-- learner_id. A query filtering by knowledge_node_id alone (e.g. "every
-- Learner's mastery state for this node") has no usable index.
-- ---------------------------------------------------------------------

CREATE INDEX ix_knowledge_node_mastery_knowledge_node_id
  ON public.knowledge_node_mastery (knowledge_node_id);


-- ---------------------------------------------------------------------
-- Gap 3: knowledge_node_mastery.last_assessment_result_id
-- ---------------------------------------------------------------------
-- No index at all on this FK column — missed entirely in
-- SQL_BATCH2_KNOWLEDGE_EVIDENCE_ASSESSMENT.sql (the comment there only
-- addressed the (learner_id, knowledge_node_id) point lookup, not this
-- column). Needed for the ON DELETE RESTRICT check fired by
-- assessment_result deletes, and for any "which mastery rows point at
-- this assessment_result" query.
-- ---------------------------------------------------------------------

CREATE INDEX ix_knowledge_node_mastery_last_assessment_result_id
  ON public.knowledge_node_mastery (last_assessment_result_id);


-- =====================================================================
-- END OF BATCH 5
--
-- Result after this batch:
--   - 0 new tables
--   - 0 new columns
--   - 0 new FK
--   - 0 new trigger
--   - 0 new history table
--   - 3 new index (all close a verified FK-index gap, none speculative)
--   - 0 RLS policy
--
-- Everything else audited in SQL_BATCH5_REVIEW.md (FK integrity,
-- trigger attachment, history attachment, version_number attachment,
-- Decision Header/Detail coverage, TraceLink enum state, CHECK
-- consistency, partial-unique consistency, Hot Path coverage,
-- migration ordering, Supabase compatibility) was found already
-- complete — no further SQL is generated for those points, per the
-- explicit instruction to avoid creating work that does not
-- correspond to a real gap.
--
-- Next: Batch 6 — RLS (ENABLE ROW LEVEL SECURITY + CREATE POLICY for
-- all 32 tables, per the 5 RLS groups in POSTGRESQL_FEATURE_MATRIX.md
-- mục 6).
-- =====================================================================
