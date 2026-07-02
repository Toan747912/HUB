# Roadmap Approval Workflow Specification

This document defines the structural workflows for proposing, approving, rejecting, and rolling back roadmap changes, ensuring compliance with **Roadmap Governance** (DECISION-006) and the **Proposal-Only Constraint** (DECISION-019).

---

## 1. The Core Proposal-Approval Loop

Every change to a roadmap's structure (adding, removing, or re-ordering nodes) must traverse a strict loop to preserve human authority:

```
[1. Trigger Event] ➔ [2. Generate Proposal] ➔ [3. Display to Learner]
Onboarding complete /   AI generates                 UI presents details
Continuous discovery.   RecommendationProposal.      and change warnings.
       ▲                                                     │
       │                                                     ▼
[6. Active State] ◄─ [5. Apply Mutations]    ◄─ [4. Learner Approval]
LearningSession         Writes changes; commits       Learner clicks Accept;
resumes.                ApprovalRecord.               writes ApprovalRecord.
```

### 1.1 Step-by-Step Flow
1. **Trigger:** An AI engine determines a pathway modification is necessary (e.g. Socratic detection determines a prerequisite node is missing).
2. **Proposal Generation:** The Roadmap Engine creates a new draft version of the roadmap and issues a `RecommendationProposal` (`proposal_type = 'roadmap_change'`).
3. **Display:** The learner reviews the proposal in the UI, highlighting what nodes will be inserted, deleted, or shifted.
4. **learner Action:**
   - **If Approved:** The system inserts an `ApprovalRecord` and transitions the new draft roadmap to `Approved` ➔ `Active` (triggering goal/session superseding if Goal statement changed).
   - **If Rejected:** The system marks the proposal as `Rejected`, discards the draft cloned roadmap, and returns the learner to their active, unmodified roadmap.

---

## 2. Integration with `ApprovalRecord` (DECISION-006)

An `ApprovalRecord` is a transactional block that must be successfully committed to authorize any roadmap mutation.

```
┌──────────────────────────────────────────────────────────┐
│ ApprovalRecord                                           │
│   ├── approval_record_id (UUID, PK)                      │
│   ├── learner_id (UUID, FK -> Learner)                   │
│   ├── roadmap_id (UUID, FK -> Roadmap)                   │
│   ├── proposal_checksum (Text)                           │
│   ├── change_summary (Text)                              │
│   └── confirmed_at (Timestamptz)                         │
└──────────────────────────────────────────────────────────┘
```

The database enforces a check constraint: no `roadmap_node` modifications can occur without an associated active `ApprovalRecord` linked in the transaction.

---

## 3. Rollback Behavior

Because roadmaps are versioned immutably, rolling back to a previous pathway version does not require mutating tables.

### 3.1 Reversion Steps
If a learner wants to undo their last approved change:
1. **Target Identification:** The system traverses the version chain back one level using `predecessor_roadmap_id`.
2. **Draft Instantiation:** The system clones the target historical roadmap structure into a new `Draft` record.
3. **Approval Sequence:** The learner confirms they want to revert (which logs a new `ApprovalRecord` for the rollback action).
4. **Swap:** The new clone transitions to `Active`, the previous roadmap is marked as `Superseded`, and the version chain progresses forward:

$$\text{Roadmap } v_2 (\text{Old}) \longrightarrow \text{Roadmap } v_3 (\text{Modified}) \longrightarrow \text{Roadmap } v_4 (\text{Rollback to } v_2)$$
