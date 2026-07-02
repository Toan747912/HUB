# Learning Session API Contract Specification

This document defines the REST API contract for the Learning Session Domain. Endpoints conform to the **Explainability First** constraints, requiring explainability structures in response envelopes when AI-driven transitions occur.

---

## 1. Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/sessions` | Starts a new LearningSession mapped to an active Goal. |
| `POST` | `/api/v1/sessions/{id}/pause` | Pauses an active session (user-initiated or AI-proposed confirmation). |
| `POST` | `/api/v1/sessions/{id}/resume` | Resumes a paused session, verifying concurrency bounds. |
| `POST` | `/api/v1/sessions/{id}/complete` | Transitions the session to Completed when all roadmap objectives are met. |
| `POST` | `/api/v1/sessions/{id}/abandon` | Manually abandons the session. |
| `GET`  | `/api/v1/sessions/{id}` | Retrieves session details and active sub-sessions. |
| `GET`  | `/api/v1/sessions/{id}/progress` | Retrieves the session progress snapshotted percentage. |

---

## 2. API Contract Details

### 2.1 Start Session (`POST /api/v1/sessions`)
Starts a learning session context.

#### Request Payload
```json
{
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39"
}
```

#### Success Response (201 Created)
```json
{
  "learning_session_id": "s03f56a3-2287-41ab-85cf-252199b50e77",
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "state": "Active",
  "started_at": "2026-06-30T20:36:00Z",
  "last_active_at": "2026-06-30T20:36:00Z"
}
```

---

### 2.2 Pause Session (`POST /api/v1/sessions/{id}/pause`)
Pauses the active learning session.

#### Request Payload (AI-Proposed Pause Confirmation)
```json
{
  "recommendation_proposal_id": "e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0"
}
```

#### Success Response (200 OK)
```json
{
  "learning_session_id": "s03f56a3-2287-41ab-85cf-252199b50e77",
  "state": "Paused",
  "paused_at": "2026-06-30T20:37:00Z",
  "explainability": {
    "confidence": 0.91,
    "reasoning": "Session paused upon learner confirmation of AI proposal. Telemetry showed 3 consecutive failures on HTTP Protocol micro-probes.",
    "traced_to": [
      "recommendation_proposal:e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0"
    ]
  }
}
```

---

### 2.3 Get Progress (`GET /api/v1/sessions/{id}/progress`)
Retrieves the current progress percentage and snapshot payload.

#### Success Response (200 OK)
```json
{
  "learning_session_id": "s03f56a3-2287-41ab-85cf-252199b50e77",
  "total_nodes_count": 8,
  "completed_nodes_count": 2,
  "progress_percentage": 25.00,
  "last_snapshot_at": "2026-06-30T20:36:50Z"
}
```
