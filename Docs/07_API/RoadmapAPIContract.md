# Roadmap API Contract Specification

This document defines the REST API contract for the Roadmap Domain services. All endpoints conform to the **Explainability First** constraints, requiring explainability structures in response envelopes when AI-driven logic is involved.

---

## 1. Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/roadmaps/proposals` | Generates a new roadmap proposal or dynamic branch expansion proposal. |
| `POST` | `/api/v1/roadmaps/{id}/approve` | Learner approves the proposed roadmap, committing mutations and creating an `ApprovalRecord`. |
| `POST` | `/api/v1/roadmaps/{id}/reject` | Learner rejects the proposal, discarding the draft cloned roadmap. |
| `POST` | `/api/v1/roadmaps/{id}/supersede` | Cascades Goal changes, cloning the roadmap onto a new Goal version context. |
| `GET`  | `/api/v1/roadmaps/{id}` | Retrieves the roadmap nodes and structural tree. |
| `GET`  | `/api/v1/roadmaps/{id}/progress` | Retrieves the real-time progress calculations of the roadmap. |

---

## 2. API Contract Details

### 2.1 Create Roadmap Proposal (`POST /api/v1/roadmaps/proposals`)
Creates a new draft proposal for a roadmap or branch expansion.

#### Request Payload
```json
{
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "trigger_type": "onboarding",
  "claimed_skills": [
    "Frontend Development with React",
    "Backend API Development with Node.js"
  ]
}
```

#### Success Response (201 Created)
```json
{
  "proposal_id": "p03f56a3-2287-41ab-85cf-252199b50e41",
  "goal_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "state": "Proposed",
  "proposed_nodes": [
    {
      "title": "Backend Fundamentals",
      "node_type": "Milestone",
      "sequence_number": 1,
      "children": [
        {
          "title": "HTTP Protocols",
          "node_type": "Learning",
          "sequence_number": 1,
          "mapped_knowledge_nodes": ["http_protocol"]
        }
      ]
    }
  ],
  "explainability": {
    "confidence": 0.94,
    "reasoning": "Baseline backend roadmap generated based on learner's project objective. Isolated HTTP Protocols as the core prerequisite module.",
    "traced_to": [
      "goal:c03f56a3-2287-41ab-85cf-252199b50e39"
    ]
  }
}
```

---

### 2.2 Approve Roadmap (`POST /api/v1/roadmaps/{id}/approve`)
Learner approves the proposed roadmap or branch expansion, creating a permanent `ApprovalRecord`.

#### Request Payload
```json
{
  "proposal_id": "p03f56a3-2287-41ab-85cf-252199b50e41"
}
```

#### Success Response (200 OK)
```json
{
  "roadmap_id": "r03f56a3-2287-41ab-85cf-252199b50e50",
  "state": "Approved",
  "approval_record_id": "app03f56-2287-41ab-85cf-252199b50e60",
  "confirmed_at": "2026-06-30T20:32:00Z"
}
```

---

### 2.3 Reject Roadmap (`POST /api/v1/roadmaps/{id}/reject`)
Learner rejects the proposed roadmap, discarding draft structures.

#### Request Payload
```json
{
  "proposal_id": "p03f56a3-2287-41ab-85cf-252199b50e41",
  "rejection_reason": "Prerequisite HTTP module is too simple; user wants to skip to databases."
}
```

#### Success Response (200 OK)
```json
{
  "proposal_id": "p03f56a3-2287-41ab-85cf-252199b50e41",
  "state": "Rejected",
  "discarded_draft_roadmap_id": "r03f56a3-2287-41ab-85cf-252199b50e50"
}
```

---

### 2.4 Get Roadmap Progress (`GET /api/v1/roadmaps/{id}/progress`)
Retrieves real-time progression metrics.

#### Success Response (200 OK)
```json
{
  "roadmap_id": "r03f56a3-2287-41ab-85cf-252199b50e50",
  "total_nodes_count": 12,
  "completed_nodes_count": 4,
  "progress_percentage": 33.33,
  "node_statuses": [
    {
      "roadmap_node_id": "n01f56a3-2287-41ab-85cf-252199b50e01",
      "title": "HTTP Protocols",
      "status": "Completed"
    },
    {
      "roadmap_node_id": "n01f56a3-2287-41ab-85cf-252199b50e02",
      "title": "Database Basics",
      "status": "In_Progress"
    }
  ]
}
```
