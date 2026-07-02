-- =====================================================================
-- SQL BATCH 0 — INFRASTRUCTURE
-- AI Mentor OS — PostgreSQL / Supabase
--
-- Scope: shared infrastructure only. NO business tables, NO RLS policies,
-- NO domain-specific logic. This batch must run before Batch 1-5
-- (DDL Round 1-5 business tables) and before Batch 6 (RLS policies).
--
-- Source of authority:
--   - SQL_GENERATION_MASTER_PLAN.md  (Batch 0 definition, mục 2/6/7/8)
--   - MIGRATION_DEPENDENCY_GRAPH.md  (Batch 0 has zero table dependencies)
--   - POSTGRESQL_FEATURE_MATRIX.md   (trigger inventory)
--   - DECISION-044-Versioning-Strategy.md
--   - DECISION-045-Temporal-Strategy.md
--   - DECISION-050-SQL-PreGeneration-Finalization.md (item 1: updated_at
--     maintenance strategy — locked, single trigger mechanism)
--
-- This file is idempotent: every statement uses IF NOT EXISTS / OR REPLACE
-- so it can be re-run safely against an environment where it already ran.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. REQUIRED EXTENSIONS
-- ---------------------------------------------------------------------
-- gen_random_uuid() is built into PostgreSQL core since v13 and requires
-- no extension on any Supabase project (Supabase runs PG14+). pgcrypto is
-- enabled here purely as a defensive/compatibility measure (it is also
-- already enabled by default on every Supabase project) — no column or
-- function in the DDL Round 1-5 design depends on any other pgcrypto
-- capability (no hashing, no encryption columns were designed).
-- No other extension (uuid-ossp, pg_trgm, etc.) is required — no design
-- document calls for full-text search, trigram matching, or uuid-ossp
-- generation functions.
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------
-- 2. SHARED SCHEMAS
-- ---------------------------------------------------------------------
-- `history` — holds the 4 trigger-maintained history tables required by
-- DECISION-045 (history.learner, history.knowledge_node,
-- history.discovery_session, history.mentor_session). Those 4 tables are
-- created in their respective business-table batches (Batch 1/2/4), NOT
-- here — this statement only creates the empty schema and locks down its
-- visibility before any table exists in it.
--
-- The `history` schema must never be reachable by `anon`/`authenticated`
-- (it is not meant to be exposed via PostgREST/Supabase API, even if the
-- API exposed-schema list is misconfigured later) — defense in depth.
-- ---------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS history;

REVOKE ALL ON SCHEMA history FROM PUBLIC;
GRANT USAGE ON SCHEMA history TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA history
  GRANT SELECT, INSERT ON TABLES TO service_role;

COMMENT ON SCHEMA history IS
  'Trigger-maintained history tables (DECISION-045). Exactly 4 tables belong here: learner, knowledge_node, discovery_session, mentor_session — created alongside their public.* counterpart in Batch 1/2/4. Never exposed to anon/authenticated.';


-- ---------------------------------------------------------------------
-- 3. fn_set_updated_at()  —  updated_at maintenance (DECISION-050 item 1)
-- ---------------------------------------------------------------------
-- BEFORE UPDATE, FOR EACH ROW. Unconditionally sets NEW.updated_at = now()
-- on every UPDATE — no OLD/NEW comparison, no "skip if nothing changed"
-- logic (DECISION-050 item 1: kept simple, single mechanism).
--
-- Attach (in each table's own batch, NOT here) to exactly the 9 Current
-- State Snapshot tables: learner, roadmap, roadmap_node, learning_session,
-- sub_session, knowledge_node, knowledge_node_mastery, discovery_session,
-- mentor_session. Never attach BEFORE INSERT (the DEFAULT now() on the
-- column already covers row creation). Never attach to any append-only
-- table (those have no updated_at column at all).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_set_updated_at() IS
  'BEFORE UPDATE trigger. Unconditionally sets NEW.updated_at = now(). Locked by DECISION-050 item 1. Attach only to the 9 Current State Snapshot tables. Application Layer must never set updated_at manually.';


-- ---------------------------------------------------------------------
-- 4. fn_increment_version_number()  —  versioning helper (DECISION-044)
-- ---------------------------------------------------------------------
-- BEFORE UPDATE, FOR EACH ROW. NEW.version_number := OLD.version_number + 1.
--
-- Attach (in each table's own batch, NOT here) to: knowledge_node_mastery
-- (mandatory — highest identified concurrent-write risk) and learner
-- (applied for consistency per SQL_GENERATION_MASTER_PLAN.md mục 8 — the
-- column was already designed on learner since DDL Round 1; leaving it
-- unmaintained would make it meaningless).
--
-- Requires the target table to have a `version_number bigint NOT NULL
-- DEFAULT 1` column. Do not attach to any table without that column.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_increment_version_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version_number := OLD.version_number + 1;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_increment_version_number() IS
  'BEFORE UPDATE trigger. Increments version_number by 1 on every UPDATE (DECISION-044). Attach only to tables with a version_number bigint column: knowledge_node_mastery (mandatory), learner (applied for consistency).';


-- ---------------------------------------------------------------------
-- 5. fn_write_history()  —  audit/history helper (DECISION-045)
-- ---------------------------------------------------------------------
-- AFTER UPDATE, FOR EACH ROW. Writes the pre-update row (OLD) into
-- history.<same table name>, stamped with the moment it became
-- historical (valid_from).
--
-- Generic by design: uses the firing table's own name (TG_TABLE_NAME) to
-- target history.<table_name> dynamically, and casts the OLD record to
-- the source table's row type (every table implicitly has a composite
-- type of the same name) so that `.*` expands to the exact column list
-- in the exact column order of the source table.
--
-- HARD CONTRACT this function depends on (must hold for every table this
-- is attached to): history.<table_name> must declare the exact same
-- columns, in the exact same order, as public.<table_name>, followed by
-- exactly one trailing column `valid_from timestamptz NOT NULL`. This
-- contract must be honored when history.learner / history.knowledge_node
-- / history.discovery_session / history.mentor_session are created in
-- their respective batches.
--
-- Attach (in each table's own batch, NOT here) to exactly the 4 tables
-- identified by DECISION-045: learner, knowledge_node, discovery_session,
-- mentor_session.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_write_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'INSERT INTO history.%I SELECT ($1::%I.%I).*, now()',
    TG_TABLE_NAME, TG_TABLE_SCHEMA, TG_TABLE_NAME
  )
  USING OLD;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_write_history() IS
  'AFTER UPDATE trigger. Writes OLD row into history.<table_name> with a valid_from = now() stamp (DECISION-045). Generic via TG_TABLE_NAME — attach only to: learner, knowledge_node, discovery_session, mentor_session. Requires history.<table_name> to mirror public.<table_name> column-for-column, in order, plus a trailing valid_from timestamptz column.';


-- =====================================================================
-- END OF BATCH 0
--
-- Result after this batch:
--   - extension `pgcrypto` enabled
--   - schema `history` created, locked to service_role only
--   - 3 reusable trigger functions available: fn_set_updated_at,
--     fn_increment_version_number, fn_write_history
--   - zero tables created (business or otherwise)
--   - zero RLS policies created
--   - zero dependency on any table, policy, or application code
--
-- Next: Batch 1 (DDL Round 1 — Identity/Goal/Roadmap/Learning Session).
-- =====================================================================
