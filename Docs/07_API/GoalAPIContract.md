# Goal API Contract Specification

This document defines the REST API contract for the Goal Domain services. All endpoints conform to the **Explainability First** constraints, requiring explainability structures in response envelopes when AI-driven logic is involved.

---

## 1. Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/goals` | Creates a new Goal in `Draft` or `Active` state. |
| `PATCH` | `/api/v1/goals/{id}` | Updates metadata of a goal (e.g. category). **Statement text is immutable.** |
| `POST` | `/api/v1/goals/{id}/supersede` | Replaces an existing goal with a new version, creating version chain linkages. |
| `POST` | `/api/v1/goals/{id}/archive` | Archives a goal, freezing its state. |
| `GET` | `/api/v1/goals/{id}` | Retrieves a single goal by its UUID. |
| `GET` | `/api/v1/goals` | Lists goals for the authenticated learner. |

---

## 2. API Contract Details

### 2.1 Create Goal (`POST /api/v1/goals`)
Creates a new goal aggregate. Used during onboarding or continuous discovery.

#### Request Payload
```json
{
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "statement": "Build a React-based video streaming application with JWT authorization.",
  "parent_goal_id": null,
  "state": "Active"
}
```

#### Success Response (201 Created)
```json
{
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "statement": "Build a React-based video streaming application with JWT authorization.",
  "state": "Active",
  "version_number": 1,
  "parent_goal_id": null,
  "superseded_by_goal_id": null,
  "created_at": "2026-06-30T20:26:10Z",
  "created_by_actor_type": "learner",
  "created_by_actor_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

---

### 2.2 Update Goal Metadata (`PATCH /api/v1/goals/{id}`)
Updates mutable metadata fields. Note that modifying the `statement` or `learner_id` is strictly forbidden.

#### Request Payload
```json
{
  "category": "Web Development",
  "target_completion_date": "2026-08-30"
}
```

#### Success Response (200 OK)
```json
{
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "statement": "Build a React-based video streaming application with JWT authorization.",
  "state": "Active",
  "category": "Web Development",
  "target_completion_date": "2026-08-30",
  "updated_at": "2026-06-30T20:27:00Z"
}
```

#### Error Response (400 Bad Request - Immutability Violation)
```json
{
  "error_code": "IMMUTABLE_COLUMN_VIOLATION",
  "message": "The goal statement is immutable and cannot be updated. To modify the statement, use the supersede endpoint.",
  "timestamp": "2026-06-30T20:27:05Z"
}
```

---

### 2.3 Supersede Goal (`POST /api/v1/goals/{id}/supersede`)
Replaces version $v_N$ with a new version $v_{N+1}$ to refine or expand scope.

#### Request Payload
```json
{
  "new_statement": "Build a React-based video streaming application with JWT authorization, password hashing, and token rotation.",
  "version_reasoning": "Expanded goal to cover token rotation security practices based on Socratic recommendation.",
  "recommendation_proposal_id": "e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0"
}
```

#### Success Response (200 OK)
```json
{
  "superseded_goal": {
    "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
    "state": "Superseded",
    "superseded_by_goal_id": "d03f56a3-2287-41ab-85cf-252199b50e40"
  },
  "new_goal": {
    "goal_id": "d03f56a3-2287-41ab-85cf-252199b50e40",
    "statement": "Build a React-based video streaming application with JWT authorization, password hashing, and token rotation.",
    "state": "Active",
    "version_number": 2,
    "parent_goal_id": null,
    "superseded_by_goal_id": null
  },
  "explainability": {
    "confidence": 0.92,
    "reasoning": "Goal version 1 replaced by version 2 to append 'token rotation' and 'password hashing' security modules. Traced back to Recommendation Proposal that identified access token storage risks.",
    "traced_to": [
      "recommendation_proposal:e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0"
    ]
  }
}
```

---

### 2.4 Archive Goal (`POST /api/v1/goals/{id}/archive`)
Transitions a goal to the archived terminal state, freezing connected sessions.

#### Request Payload
```json
{
  "archive_reasoning": "Learner abandoned web development track to pursue data engineering."
}
```

#### Success Response (200 OK)
```json
{
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "state": "Archived",
  "archived_at": "2026-06-30T20:28:00Z"
}
```

---

### 2.5 Get Goal (`GET /api/v1/goals/{id}`)
Retrieves details of a specific goal.

#### Success Response (200 OK)
```json
{
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "statement": "Build a React-based video streaming application with JWT authorization.",
  "state": "Active",
  "version_number": 1,
  "parent_goal_id": null,
  "superseded_by_goal_id": null,
  "created_at": "2026-06-30T20:26:10Z"
}
```

---

### 2.6 List Goals (`GET /api/v1/goals`)
Lists all goals for the authenticated learner. Supported filters: `state`.

#### Success Response (200 OK)
```json
{
  "goals": [
    {
      "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
      "statement": "Build a React-based video streaming application with JWT authorization.",
      "state": "Active",
      "version_number": 1
    },
    {
      "goal_id": "a01f56a3-2287-41ab-85cf-252199b50e20",
      "statement": "Learn Python basics.",
      "state": "Completed",
      "version_number": 1
    }
  ]
}
```
