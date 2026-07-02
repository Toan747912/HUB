# SQL Design Review Report - Discovery Engine

**Document Version:** 1.0 (Design Closure)  
**Target Engine:** Discovery Engine (Phase 1)  
**Database Dialect:** SQL Server Compatible  
**Status:** ✅ **READY_FOR_BACKEND_IMPLEMENTATION**

---

## 1. Executive Summary

This report reviews the database design and generation of SQL artifacts for the **Discovery Engine (Phase 1)** of **AI Mentor OS**. We have successfully translated the logical entities from `DiscoveryDomain.md` and approved decisions (`DECISION-051` through `DECISION-055`) into idempotent, production-ready T-SQL DDL.

All generated deliverables have been verified for syntax compatibility, relational integrity, auditability, soft-delete safety, and compliance with the core naming guidelines. We declare that the database design is fully finalized and ready for backend implementation.

---

## 2. Review of Deliverables & Artifacts

### 2.1 Table Schema DDL (`01_Discovery_Tables.sql`)
* **Tables Created:** `discovery_session`, `claimed_skill_area`, `claimed_skill_area_source_answer`, `discovery_question`, `discovery_answer`, `competency_signal`, `competency_signal_source_answer`, `self_assessment_mismatch`, `claimed_skill_area_knowledge_node`.
* **SQL Server Types Applied:** Used `UNIQUEIDENTIFIER` instead of `uuid` and `DATETIMEOFFSET` instead of `timestamptz` for datetime attributes.
* **Idempotency:** Implemented T-SQL guards utilizing `IF OBJECT_ID('dbo.<name>', 'U') IS NULL` blocks.

### 2.2 Constraints (`02_Discovery_Constraints.sql`)
* **Primary Keys:** Clustered constraints added to all tables with the `<table_name>_id` pattern (except the external-mapping `learner_id` to comply with standard Supabase conventions).
* **Foreign Keys:** Mapped all parent-child and junction associations. Utilized `IF EXISTS (SELECT * FROM sys.tables WHERE name = '...')` guards to protect keys referring to cross-domain entities (`learner`, `goal`, `knowledge_node`).
* **Unique Constraints:** Configured `UQ_discovery_answer_question_id` to strictly lock a 1:0..1 relationship between questions and answers, guaranteeing immutable history.
* **Check Constraints:** Added enums on triggers, session states, and capability sources. Restrained competency level scales (`Unknown`, `Remember`, `Explain`, `Apply`, `Teach`) and locked the verification method check for mismatches.

### 2.3 Indexes (`03_Discovery_Indexes.sql`)
* **Foreign Keys:** Placed nonclustered indexes on all foreign key columns.
* **Partial Indexing:** Developed a partial unique index `ux_claimed_skill_area_kn_active` on the cross-domain mapping table `claimed_skill_area_knowledge_node` where `removed_at IS NULL` to enforce single active mappings.

### 2.4 Seed Data (`04_Discovery_Seed_Data.sql`)
* **Stub Resilience:** Built stubs for `learner`, `goal`, and `knowledge_node` inside the seed environment to allow isolated execution.
* **Walkthrough Fidelity:** Seeded a complete onboarding walkthrough containing 2 questions/answers, 2 competency signals, and a self-assessment mismatch triggered by level chênh lệch (observed level `Explain` vs. self-reported `Teach`).

### 2.5 Validation Queries (`05_Discovery_Validation_Queries.sql`)
* **Logic Coverage:** Written executable queries verifying:
  - Coverage checklist metrics.
  - Explainability and mismatch trace mappings.
  - Active concurrency status.
  - Weighted composite Teach capability calculations (locked progressive weights: 10/15/25/25/25).
  - Regression trigger weights summing test, lab, probe, and chat negative signals against the $\ge 1.5$ threshold.

---

## 3. Core Requirements Verification Matrix

| Requirement | Implementation Status | Traceability & Comments |
| :--- | :---: | :--- |
| **SQL Server Compatible** | ✅ **Passed** | Schema utilizes T-SQL syntax, `DATETIMEOFFSET`, `UNIQUEIDENTIFIER`, and built-in functions (`NEWID()`, `SYSDATETIMEOFFSET()`). |
| **Idempotency** | ✅ **Passed** | Guards on tables (`IF OBJECT_ID`), constraints (`IF NOT EXISTS` on metadata tables), and indexes prevent collisions during multiple runs. |
| **Naming Conventions** | ✅ **Passed** | Fully compliant with singular table names, snake_case columns, `<table_name>_id` PK patterns, and prefix prefixes (`PK_*`, `FK_*`, `UQ_*`, `CK_*`, `ix_*`). |
| **Decision Traceability** | ✅ **Passed** | Embedded inline comments trace constraints and tables back to `DECISION-051` through `DECISION-055`. |
| **No ORM / Code** | ✅ **Passed** | Delivered only pure SQL scripts and markdown analysis. |
| **Audit Fields** | ✅ **Passed** | Active snapshot tables include all six audit columns. Append-only tables include `created_*` audit triplets. |
| **Soft Delete** | ✅ **Passed** | Cross-domain mapping tables utilize the nullable `removed_at` column to soft-delete graph mappings while retaining lookup history. |
| **Explainability Linkage** | ✅ **Passed** | Handled physically via M:N junction tables (`claimed_skill_area_source_answer` and `competency_signal_source_answer`) and validated by verification query joins. |

---

## 4. Final Classification

Based on a thorough review of the generated SQL scripts and compliance metrics:

**Classification:** ✅ **`READY_FOR_BACKEND_IMPLEMENTATION`**

The DDL and validation artifacts are complete, fully self-consistent, and safely deployable to the database layer. No further revisions are required for Phase 1.
