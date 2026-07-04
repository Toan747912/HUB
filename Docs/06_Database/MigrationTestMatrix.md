# MigrationTestMatrix

> Status: TARGET SPEC (test plan, not test result). See `VerifiedMongoCoverageMatrix.md` for the evidence-backed audit of these claims against the actual codebase.

## Purpose

Ensure all persistence-critical modules are validated against MongoDB runtime behavior.

---

## Modules Covered

| Module         | CRUD | Index | Relationship | Outbox | Result |
| -------------- | ---- | ----- | ------------ | ------ | ------ |
| Goal           | ✔    | ✔     | ✔            | ✔      | PASS   |
| Roadmap        | ✔    | ✔     | ✔            | ✔      | PASS   |
| Assessment     | ✔    | ✔     | ✔            | ✔      | PASS   |
| Recommendation | ✔    | ✔     | ✔            | ✔      | PASS   |
| Skill          | ✔    | ✔     | ✔            | ✔      | PASS   |
| Audit          | ✔    | ✔     | ✔            | ✔      | PASS   |
| Outbox         | ✔    | ✔     | ✔            | ✔      | PASS   |
| Auth           | ✔    | ✔     | ✔            | ✔      | PASS   |
| API Keys       | ✔    | ✔     | ✔            | ✔      | PASS   |

---

## Test Coverage Rules

* All repositories must implement:

  * create
  * update
  * delete (soft/hard depending module)
  * query by id
  * query by domain filters

* All write operations must:

  * persist to MongoDB
  * emit audit event (if applicable)
  * respect schema validation

---

## Index Validation

Each collection must define:

* primary index (_id)
* domain lookup indexes (goalId, roadmapId, etc.)
* uniqueness constraints where required

---

## Failure Conditions

Migration is considered INVALID if:

* any module bypasses repository layer
* any raw Mongo query exists outside repository
* any missing index causes query full scan on core endpoints

---

## Status

⚠ Unverified target — see evidence-based audit
