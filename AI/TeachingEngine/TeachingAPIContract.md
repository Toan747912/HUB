# Teaching Engine API Contract Specification

This document defines the REST API contract for the Teaching Engine services. All endpoints conform to the **Explainability First** constraints, requiring `confidence`, `reasoning`, and `traced_to[]` in all AI-driven response envelopes.

---

## 1. Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/teaching/initiate` | Initiates a teaching segment for a concept, logging the initial D1 Content Selection decision. |
| `POST` | `/api/v1/teaching/interaction/turn` | Submits a learner response, evaluates telemetry/NLP, logs Socratic actions, and returns the next prompt. |
| `POST` | `/api/v1/teaching/stuck/report` | Explicitly triggers stuck detection, evaluates telemetry, and generates intervention tiers (D9a/D9b). |
| `POST` | `/api/v1/teaching/outcomes/complete` | Concludes the sub-session, submits evidence, and triggers assessment. |

---

## 2. API Contract Specifications

### 2.1 Initiate Teaching Segment (`POST /api/v1/teaching/initiate`)

Initiates a teaching session for a target node, consuming an approved recommendation proposal if available.

#### Request Payload
```json
{
  "learner_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "mentor_session_id": "fa28b49e-1a52-452f-9811-37d4512e09ad",
  "knowledge_node_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
  "learning_mode": "C",
  "recommendation_proposal_id": "e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0"
}
```

#### Success Response (201 Created)
```json
{
  "decision_header_id": "01H3Y6AB8CD4EF67GH8IJ9KLMN",
  "teaching_decision_detail_id": "01H3Y6AB8CD4EF67GH8IJ9KLMP",
  "pedagogical_state": "guiding",
  "prompt_text": "We are going to learn JWT Access Tokens. Before we implement code, explain in your own words why we shouldn't store session state directly on our server in a distributed system?",
  "explainability": {
    "confidence": 0.95,
    "reasoning": "Selected Socratic Guide mode for Node 'JWT Access Tokens' based on RecommendationProposal 'e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0' because learner has completed basic 'HTTP Headers' node but has no mastery records for JWT.",
    "traced_to": [
      "recommendation_proposal:e0a174c8-3c81-4a6c-bc1d-23091e0dfcf0",
      "knowledge_node_mastery:c03f56a3-2287-41ab-85cf-252199b50e39"
    ]
  }
}
```

---

### 2.2 Socratic Interaction Turn (`POST /api/v1/teaching/interaction/turn`)

Evaluates a single conversational turn in the Socratic sequence. Monitors telemetry for stuck signals.

#### Request Payload
```json
{
  "decision_header_id": "01H3Y6AB8CD4EF67GH8IJ9KLMN",
  "learner_response_text": "Because if we scale to multiple servers, the other server won't know about the session and user will get logged out.",
  "telemetry": {
    "consecutive_failures": 0,
    "idle_seconds": 120,
    "loop_count": 0,
    "direct_help_requested": false
  }
}
```

#### Success Response (200 OK)
```json
{
  "next_prompt": "Exactly! That is the shared-state problem. Now, how does a JSON Web Token resolve this problem by carrying user identity claims directly in the request?",
  "pedagogical_state": "guiding",
  "stuck_detected": false,
  "explainability": {
    "confidence": 0.90,
    "reasoning": "Learner successfully explained session shared-state issues (Bloom level: Explain/Simplify). Continuing Socratic Guide Mode to assess logical deduction of self-contained state.",
    "traced_to": [
      "decision_header:01H3Y6AB8CD4EF67GH8IJ9KLMN"
    ]
  }
}
```

---

### 2.3 Stuck Detection & Intervention Request (`POST /api/v1/teaching/stuck/report`)

Processes telemetry and conversational indicators to detect stuck states and select the appropriate intervention tier.

#### Request Payload
```json
{
  "sub_session_id": "01H3Y6AB8CD4EF67GH8IJ9KLA1",
  "telemetry": {
    "consecutive_failures": 3,
    "idle_seconds": 320,
    "loop_count": 2,
    "direct_help_requested": true
  }
}
```

#### Success Response (200 OK - Stuck Detected and Intervened)
```json
{
  "stuck_detected": true,
  "intervention_tier": "guided_walkthrough",
  "next_prompt": "You've run into this signature error a few times. Let's break this down together. First, we need to inspect if the secret key string in your verification script is identical to the signing secret. Let's start with this step. Print the key value in both files and check if they match. Show me the print code.",
  "stuck_decision_header_id": "01H3Y6AB8CD4EF67GH8IJ9KLS1",
  "stuck_detection_decision_detail_id": "01H3Y6AB8CD4EF67GH8IJ9KLS2",
  "intervention_decision_detail_id": "01H3Y6AB8CD4EF67GH8IJ9KLS3",
  "explainability": {
    "confidence": 0.88,
    "reasoning": "Stuck signal triggered due to 3 consecutive failures + direct help requested. Selected Guided Walkthrough (Tier 2) to break down task because Hint (Tier 1) was already delivered in the previous turn and failed.",
    "traced_to": [
      "sub_session:01H3Y6AB8CD4EF67GH8IJ9KLA1"
    ]
  }
}
```

---

### 2.4 Complete Teaching Segment (`POST /api/v1/teaching/outcomes/complete`)

Closes the active sub-session, packages interaction metadata, writes evidence, and requests the Assessment Domain to update mastery.

#### Request Payload
```json
{
  "sub_session_id": "01H3Y6AB8CD4EF67GH8IJ9KLA1"
}
```

#### Success Response (200 OK)
```json
{
  "sub_session_id": "01H3Y6AB8CD4EF67GH8IJ9KLA1",
  "status": "completed",
  "evidence_id": "5a4ef821-2a1d-4467-8bdd-12c8b031bcf2",
  "assessment_result_id": "e4f8d22c-a28a-4db5-9e67-d81b49fce97a",
  "mastery": {
    "knowledge_node_id": "c03f56a3-2287-41ab-85cf-252199b50e39",
    "composite_mastery_score": 0.75,
    "is_mastered": true,
    "sub_capabilities": {
      "explain": 1.0,
      "simplify": 1.0,
      "guide": 1.0,
      "review": 1.0,
      "transfer": 0.0
    }
  },
  "explainability": {
    "confidence": 0.95,
    "reasoning": "Teaching segment completed. Evidence submitted has Socratic Probe type with weight 0.5 and positive stance. Combined with past inputs, learner meets mastery threshold of 75% on composite Socratic sub-capabilities (Explain, Simplify, Guide, Review).",
    "traced_to": [
      "evidence:5a4ef821-2a1d-4467-8bdd-12c8b031bcf2",
      "assessment_result:e4f8d22c-a28a-4db5-9e67-d81b49fce97a"
    ]
  }
}
```
