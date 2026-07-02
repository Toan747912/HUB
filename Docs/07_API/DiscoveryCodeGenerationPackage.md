# Discovery Code Generation Package

- **Phase:** Phase 1 — Discovery Engine (Code Generation Package)
- **Status:** Approved Architecture Draft
- **Authority:** This document defines the structural interfaces, data contracts, state machines, and testing catalogs required to build the Discovery Engine, compliant with decisions DECISION-051 to DECISION-055.

---

## 1. Project Structure

The Discovery Engine backend module is organized under `Apps/backend/src/modules/discovery/` as follows:

```
discovery/
├── dtos/
│   ├── request.dto.ts
│   ├── response.dto.ts
│   └── event.dto.ts
├── entities/
│   ├── discovery-session.entity.ts
│   ├── claimed-skill-area.entity.ts
│   ├── discovery-question.entity.ts
│   ├── discovery-answer.entity.ts
│   ├── competency-signal.entity.ts
│   └── self-assessment-mismatch.entity.ts
├── interfaces/
│   ├── services.interface.ts
│   └── repositories.interface.ts
├── services/
│   ├── discovery-session.service.ts
│   ├── discovery-question.service.ts
│   ├── discovery-assessment.service.ts
│   └── self-assessment-mismatch.service.ts
├── repositories/
│   ├── discovery-session.repository.ts
│   ├── claimed-skill-area.repository.ts
│   ├── discovery-question.repository.ts
│   ├── discovery-answer.repository.ts
│   ├── competency-signal.repository.ts
│   └── self-assessment-mismatch.repository.ts
├── state-machine/
│   ├── session-state-machine.ts
│   └── state-machine.types.ts
├── validators/
│   ├── command.validator.ts
│   └── business.validator.ts
├── events/
│   └── discovery.events.ts
└── __tests__/
    ├── unit/
    │   ├── discovery-session.service.test.ts
    │   └── self-assessment-mismatch.service.test.ts
    ├── integration/
    │   └── repository-transactions.test.ts
    └── state-machine/
        └── state-machine.test.ts
```

---

## 2. DTO Catalog

### 2.1 Request DTOs
* **`StartDiscoverySessionRequest`**
  ```typescript
  interface StartDiscoverySessionRequest {
    trigger: 'onboarding' | 'continuous';
    goal_id?: string; // UUID string, mandatory if trigger === 'continuous'
  }
  ```
* **`SubmitAnswerRequest`**
  ```typescript
  interface SubmitAnswerRequest {
    discovery_question_id: string; // UUID string
    raw_input: string; // trimmed string, max length 2000
  }
  ```
* **`ContestMismatchRequest`**
  ```typescript
  interface ContestMismatchRequest {
    competency_signal_id: string; // UUID string
    raw_feedback: string; // trimmed string, max length 1000
  }
  ```

### 2.2 Response DTOs
* **`SessionEnvelopeResponse` (Layer 2 - Session Envelope)**
  ```typescript
  interface SessionEnvelopeResponse {
    discovery_session_id: string;
    learner_id: string;
    goal_id: string | null;
    state: 'INIT' | 'DISCOVERY' | 'DISCOVERY_COMPLETE' | 'BLOCKED' | 'EXPIRED' | 'ABANDONED';
    started_at: Date;
    completed_at: Date | null;
    goal_snapshot: {
      goal_id: string;
      title: string;
    } | null;
    competency_profile: Array<{
      claimed_skill_area_id: string;
      label: string;
      self_reported_level: 'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach';
      observed_level: 'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach';
    }>;
    mismatch_signals: Array<{
      self_assessment_mismatch_id: string;
      claimed_skill_area_id: string;
      reasoning: string;
    }>;
    confidence: number; // decimal between 0.0 and 1.0
    reasoning: string;
    traced_to: string[]; // e.g. ["discovery_answer:<uuid>", "competency_signal:<uuid>"]
    next_step: 'continue' | 'complete' | 'blocked' | 'expired' | 'abandoned';
    next_question: {
      discovery_question_id: string;
      prompt_text: string;
    } | null;
  }
  ```
* **`ErrorResponse` (Layer 4 - Error Contract)**
  ```typescript
  interface ErrorResponse {
    error_code: 'VALIDATION_FAILED' | 'SESSION_NOT_FOUND' | 'SESSION_STATE_CONFLICT' | 'EXPLAINABILITY_TRACE_MISSING' | 'IDEMPOTENT_REPLAY_FAILED' | 'AI_SERVICE_TIMEOUT';
    message: string; // local Vietnamese language translation
    capability: string; // e.g. "discovery_probing"
    retriable: boolean;
    trace_id: string; // UUID correlation ID
  }
  ```

---

## 3. Entity Catalog

Entities map directly to the SQL schema generated in the database layer:

### 3.1 `DiscoverySession`
* **Table Mapping:** `dbo.discovery_session`
* **Fields:**
  - `discovery_session_id`: `string` (UUID) -> PK
  - `learner_id`: `string` (UUID) -> FK
  - `goal_id`: `string | null` (UUID) -> FK
  - `trigger`: `'onboarding' | 'continuous'`
  - `state`: `'INIT' | 'DISCOVERY' | 'DISCOVERY_COMPLETE' | 'BLOCKED' | 'EXPIRED' | 'ABANDONED'`
  - `started_at`: `Date`
  - `completed_at`: `Date | null`
  - `archived_at`: `Date | null`
  - `superseded_by_discovery_session_id`: `string | null` (UUID) -> Self-FK
  - `created_at` / `updated_at`: `Date`
  - `created_by_actor_type` / `updated_by_actor_type`: `'learner' | 'backend_core' | 'ai_service'`
  - `created_by_actor_id` / `updated_by_actor_id`: `string | null` (UUID)

### 3.2 `ClaimedSkillArea`
* **Table Mapping:** `dbo.claimed_skill_area`
* **Fields:**
  - `claimed_skill_area_id`: `string` (UUID) -> PK
  - `discovery_session_id`: `string` (UUID) -> FK
  - `label`: `string` (Skill area text label)
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

### 3.3 `DiscoveryQuestion`
* **Table Mapping:** `dbo.discovery_question`
* **Fields:**
  - `discovery_question_id`: `string` (UUID) -> PK
  - `discovery_session_id`: `string` (UUID) -> FK
  - `capability_source`: `'goal_clarification' | 'competency_probing'`
  - `prompt_text`: `string`
  - `asked_at`: `Date`
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

### 3.4 `DiscoveryAnswer`
* **Table Mapping:** `dbo.discovery_answer`
* **Fields:**
  - `discovery_answer_id`: `string` (UUID) -> PK
  - `discovery_question_id`: `string` (UUID) -> FK, Unique
  - `raw_input`: `string`
  - `answered_at`: `Date`
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

### 3.5 `CompetencySignal`
* **Table Mapping:** `dbo.competency_signal`
* **Fields:**
  - `competency_signal_id`: `string` (UUID) -> PK
  - `discovery_session_id`: `string` (UUID) -> FK
  - `claimed_skill_area_id`: `string` (UUID) -> FK (DECISION-055)
  - `self_reported_level`: `'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach'`
  - `observed_level`: `'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach'`
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

### 3.6 `SelfAssessmentMismatch`
* **Table Mapping:** `dbo.self_assessment_mismatch`
* **Fields:**
  - `self_assessment_mismatch_id`: `string` (UUID) -> PK
  - `discovery_session_id`: `string` (UUID) -> FK
  - `competency_signal_id`: `string` (UUID) -> FK
  - `knowledge_node_id`: `string | null` (UUID) -> FK, Nullable (DECISION-055)
  - `verification_method`: `string` (Locked as `'Calibrated Micro-Probe'`)
  - `reasoning`: `string`
  - `detected_at`: `Date`
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

---

## 4. Service Contracts

```typescript
export interface IDiscoverySessionService {
  startSession(learnerId: string, cmd: StartDiscoverySessionRequest, idempotencyKey: string): Promise<SessionEnvelopeResponse>;
  abandonSession(sessionId: string, learnerId: string, idempotencyKey: string): Promise<SessionEnvelopeResponse>;
  getSession(sessionId: string, learnerId: string): Promise<SessionEnvelopeResponse>;
  checkSessionTimeouts(): Promise<void>; // scheduled background worker task
}

export interface IDiscoveryQuestionService {
  generateFirstQuestion(session: DiscoverySession, tx: any): Promise<DiscoveryQuestion>;
  generateNextQuestion(session: DiscoverySession, tx: any): Promise<DiscoveryQuestion | null>;
  generateVerificationProbe(session: DiscoverySession, contestedSignalId: string, tx: any): Promise<DiscoveryQuestion>;
}

export interface IDiscoveryAssessmentService {
  submitAnswer(sessionId: string, learnerId: string, cmd: SubmitAnswerRequest, idempotencyKey: string): Promise<SessionEnvelopeResponse>;
  evaluateAnswer(session: DiscoverySession, answer: DiscoveryAnswer, tx: any): Promise<CompetencySignal[]>;
}

export interface ISelfAssessmentMismatchService {
  evaluateMismatch(session: DiscoverySession, signal: CompetencySignal, tx: any): Promise<SelfAssessmentMismatch | null>;
  contestMismatch(sessionId: string, learnerId: string, cmd: ContestMismatchRequest, idempotencyKey: string): Promise<SessionEnvelopeResponse>;
}
```

---

## 5. Repository Contracts

```typescript
export interface IDiscoverySessionRepository {
  getById(id: string, tx?: any): Promise<DiscoverySession | null>;
  getActiveSession(learnerId: string, goalId: string, tx?: any): Promise<DiscoverySession | null>;
  save(session: DiscoverySession, tx?: any): Promise<void>;
}

export interface IClaimedSkillAreaRepository {
  getBySessionId(sessionId: string, tx?: any): Promise<ClaimedSkillArea[]>;
  save(area: ClaimedSkillArea, tx?: any): Promise<void>;
  saveSourceAnswerLink(claimedSkillAreaId: string, discoveryAnswerId: string, tx?: any): Promise<void>;
  saveKnowledgeNodeLink(claimedSkillAreaId: string, knowledgeNodeId: string, tx?: any): Promise<void>;
  removeKnowledgeNodeLink(claimedSkillAreaId: string, knowledgeNodeId: string, tx?: any): Promise<void>;
}

export interface IDiscoveryQuestionRepository {
  getById(id: string, tx?: any): Promise<DiscoveryQuestion | null>;
  getBySessionId(sessionId: string, tx?: any): Promise<DiscoveryQuestion[]>;
  save(question: DiscoveryQuestion, tx?: any): Promise<void>;
}

export interface IDiscoveryAnswerRepository {
  getById(id: string, tx?: any): Promise<DiscoveryAnswer | null>;
  getByQuestionId(questionId: string, tx?: any): Promise<DiscoveryAnswer | null>;
  save(answer: DiscoveryAnswer, tx?: any): Promise<void>;
}

export interface ICompetencySignalRepository {
  getBySessionId(sessionId: string, tx?: any): Promise<CompetencySignal[]>;
  save(signal: CompetencySignal, tx?: any): Promise<void>;
  saveSourceAnswerLink(competencySignalId: string, discoveryAnswerId: string, tx?: any): Promise<void>;
}

export interface ISelfAssessmentMismatchRepository {
  getBySessionId(sessionId: string, tx?: any): Promise<SelfAssessmentMismatch[]>;
  save(mismatch: SelfAssessmentMismatch, tx?: any): Promise<void>;
}
```

---

## 6. State Machine Contract

### 6.1 State Enum
```typescript
export enum DiscoverySessionState {
  INIT = 'INIT',
  DISCOVERY = 'DISCOVERY',
  DISCOVERY_COMPLETE = 'DISCOVERY_COMPLETE',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
  ABANDONED = 'ABANDONED'
}
```

### 6.2 Event Enum
```typescript
export enum StateMachineEvent {
  SESSION_CREATED = 'SESSION_CREATED',
  QUESTION_GENERATED = 'QUESTION_GENERATED',
  ANSWER_EVALUATED_CONTINUE = 'ANSWER_EVALUATED_CONTINUE',
  ANSWER_EVALUATED_COMPLETE = 'ANSWER_EVALUATED_COMPLETE',
  EVALUATION_FAILED_BLOCK = 'EVALUATION_FAILED_BLOCK',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  USER_ABANDONED = 'USER_ABANDONED',
  MISMATCH_CONTESTED = 'MISMATCH_CONTESTED'
}
```

### 6.3 State Transition Rules Configuration
```typescript
const Transitions: Record<DiscoverySessionState, Partial<Record<StateMachineEvent, DiscoverySessionState>>> = {
  [DiscoverySessionState.INIT]: {
    [StateMachineEvent.QUESTION_GENERATED]: DiscoverySessionState.DISCOVERY,
    [StateMachineEvent.USER_ABANDONED]: DiscoverySessionState.ABANDONED
  },
  [DiscoverySessionState.DISCOVERY]: {
    [StateMachineEvent.ANSWER_EVALUATED_CONTINUE]: DiscoverySessionState.DISCOVERY,
    [StateMachineEvent.ANSWER_EVALUATED_COMPLETE]: DiscoverySessionState.DISCOVERY_COMPLETE,
    [StateMachineEvent.EVALUATION_FAILED_BLOCK]: DiscoverySessionState.BLOCKED,
    [StateMachineEvent.TIMEOUT_EXCEEDED]: DiscoverySessionState.EXPIRED,
    [StateMachineEvent.USER_ABANDONED]: DiscoverySessionState.ABANDONED
  },
  [DiscoverySessionState.BLOCKED]: {
    [StateMachineEvent.MISMATCH_CONTESTED]: DiscoverySessionState.DISCOVERY,
    [StateMachineEvent.TIMEOUT_EXCEEDED]: DiscoverySessionState.EXPIRED,
    [StateMachineEvent.USER_ABANDONED]: DiscoverySessionState.ABANDONED
  },
  [DiscoverySessionState.DISCOVERY_COMPLETE]: {}, // Terminal
  [DiscoverySessionState.EXPIRED]: {},            // Terminal
  [DiscoverySessionState.ABANDONED]: {}           // Terminal
};
```

---

## 7. Validation Catalog

### 7.1 Field Validation Checklist
* **Trigger String Check:** Triggers must match `'onboarding'` or `'continuous'`.
* **UUID Conformity Check:** Learner ID, Goal ID, Session ID, and Question ID must match RFC 4122 v4 UUID format regex.
* **Input Text Boundaries:** User input strings checked for trimmed non-empty state and absolute length checks (Answer: $\le 2000$ chars, Feedback: $\le 1000$ chars).

### 7.2 Business Validation Checklist
* **Concurrency Locking Check (DECISION-054):** Validates that only one active session exists for a learner-goal pair. Archives duplicate sessions before executing the creation transaction.
* **Continuous Goal Constraint:** If trigger is continuous, Goal ID is mandatory.
* **Idempotency Key Mismatch Verification:** Compares the request payload hash against the saved idempotency key log. If the key matches but the parameters differ, returns `IDEMPOTENT_REPLAY_FAILED`.

### 7.3 State Validation Checklist
* **Interactive State Verification:** Reject answer submissions if the session state is terminal (`DISCOVERY_COMPLETE`, `EXPIRED`, `ABANDONED`).
* **Contest State Verification:** Reject feedback contestation unless the session state is `BLOCKED` or in the summary state.

---

## 8. Event Catalog

### 8.1 Domain Events
1. **`DiscoverySessionStarted`**
   - *Payload:* `{ discovery_session_id: string, learner_id: string, goal_id: string | null, trigger: string, timestamp: string }`
   - *Publish Point:* Inside `startSession()` database transaction after session record write.
2. **`DiscoveryAnswerSubmitted`**
   - *Payload:* `{ discovery_session_id: string, discovery_answer_id: string, discovery_question_id: string, timestamp: string }`
   - *Publish Point:* Inside `submitAnswer()` transaction after writing the answer.
3. **`SelfAssessmentMismatchDetected`**
   - *Payload:* `{ self_assessment_mismatch_id: string, discovery_session_id: string, competency_signal_id: string, knowledge_node_id: string | null }`
   - *Publish Point:* Inside `submitAnswer()` transaction after writing mismatch.
4. **`DiscoverySessionCompleted`**
   - *Payload:* `{ discovery_session_id: string, completed_at: string, competency_profile: any[] }`
   - *Publish Point:* Inside `submitAnswer()` transaction after transitioning session state to `DISCOVERY_COMPLETE`.
5. **`DiscoverySessionAbandoned`**
   - *Payload:* `{ discovery_session_id: string, completed_at: string }`
   - *Publish Point:* Inside `abandonSession()` transaction.

---

## 9. Test Catalog

### 9.1 Unit Test Specifications
* **Test Case U1: Session Concurrency Check**
  - *Setup:* Mock repositories. Stub an active session in state `DISCOVERY` for Goal X. Call `startSession()` for Goal X.
  - *Verification:* Verify that the old session's `save()` was called with `state` unmodified but `archived_at` populated, and that the new session starts in `DISCOVERY`.
* **Test Case U2: Mismatch Evaluation Rules**
  - *Setup:* Mock AI service returns Observed: `Explain`, Self-reported: `Teach` (gap of 2 levels). Submit answer.
  - *Verification:* Verify that `SelfAssessmentMismatchService` writes a mismatch row immediately (`detected_at` is populated, `verification_method` is `'Calibrated Micro-Probe'`).

### 9.2 Integration Test Specifications
* **Test Case I1: DB Transaction Commit/Rollback**
  - *Setup:* Execute `submitAnswer()` on database context. Simulate an exception during the prompt creation step for the next question.
  - *Verification:* Verify that the transaction is rolled back: neither the user's `discovery_answer` nor `competency_signal` records are committed to the tables.
* **Test Case I2: Idempotent Key Collision**
  - *Setup:* Send a POST request to `/api/discovery/start` with payload A and header `Idempotency-Key: Key-1`. Send a duplicate request with payload B and the same key.
  - *Verification:* The first request returns status `200` with session details. The second request returns status `409` with error code `IDEMPOTENT_REPLAY_FAILED`.

### 9.3 State-machine Test Specifications
* **Test Case S1: Forbidden Transitions**
  - *Setup:* Instantiated state machine in state `DISCOVERY_COMPLETE`. Dispatch event `USER_ABANDONED` or `MISMATCH_CONTESTED`.
  - *Verification:* The state machine throws a transition state exception, state remains `DISCOVERY_COMPLETE`.

---

## 10. Code Generation Readiness Review

### 10.1 Technical Verification
This package maps all requirements, contracts, validation bounds, and events:
- **Project folders:** Standardized.
- **DTOs & Entities:** Typed and schema-aligned.
- **State Machine Transitions:** Codified via enums and guards.
- **Test Scenarios:** Specified across unit, integration, and state bounds.

### 10.2 Final Gateway Decision

**Classification:** ✅ **`READY_FOR_IMPLEMENTATION`**

The interface boundaries are fully locked, and the mock-data test scenarios verify edge cases. The package is now ready to begin backend code generation.
