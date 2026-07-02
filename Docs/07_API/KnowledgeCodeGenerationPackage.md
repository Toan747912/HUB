# Knowledge Code Generation Package

- **Phase:** Phase 1 — Knowledge Engine (Code Generation Package)
- **Status:** Approved Architecture Draft
- **Authority:** This document defines the structural interfaces, data contracts, state machines, and testing catalogs required to build the Knowledge Engine, compliant with decisions DECISION-015 to DECISION-033 and DECISION-042 to DECISION-055.

---

## 1. Folder Structure

The Knowledge Engine backend module is organized under `Apps/backend/src/modules/knowledge/` as follows:

```
knowledge/
├── dtos/
│   ├── request.dto.ts
│   ├── response.dto.ts
│   └── event.dto.ts
├── entities/
│   ├── knowledge-node.entity.ts
│   ├── knowledge-relation.entity.ts
│   ├── evidence.entity.ts
│   ├── mastery-record.entity.ts
│   └── expansion-record.entity.ts
├── interfaces/
│   ├── services.interface.ts
│   └── repositories.interface.ts
├── services/
│   ├── knowledge-graph.service.ts
│   ├── evidence.service.ts
│   ├── mastery.service.ts
│   ├── expansion.service.ts
│   └── regression.service.ts
├── repositories/
│   ├── knowledge-node.repository.ts
│   ├── knowledge-relation.repository.ts
│   ├── evidence.repository.ts
│   ├── mastery.repository.ts
│   └── expansion.repository.ts
├── state-machine/
│   ├── node-state-machine.ts
│   ├── mastery-state-machine.ts
│   └── state-machine.types.ts
├── validators/
│   ├── command.validator.ts
│   └── business.validator.ts
├── events/
│   └── knowledge.events.ts
└── __tests__/
    ├── unit/
    │   ├── mastery.service.test.ts
    │   └── regression.service.test.ts
    ├── integration/
    │   └── graph-traversal.test.ts
    └── state-machine/
        └── node-lifecycle.test.ts
```

---

## 2. DTO Catalog

### 2.1 Request DTOs
* **`CreateKnowledgeNodeRequest`**
  ```typescript
  interface CreateKnowledgeNodeRequest {
    title: string;
    description: string;
    status: 'draft' | 'local' | 'structural';
  }
  ```
* **`CreateKnowledgeRelationRequest`**
  ```typescript
  interface CreateKnowledgeRelationRequest {
    from_knowledge_node_id: string; // UUID string
    to_knowledge_node_id: string; // UUID string
    relation_type: 'prerequisite_of' | 'expands_to' | 'related_to';
  }
  ```
* **`AddEvidenceRequest`**
  ```typescript
  interface AddEvidenceRequest {
    source_type: 'Test' | 'Lab' | 'Probe' | 'Chat';
    direction: 'positive' | 'negative';
    ai_confidence: number; // decimal between 0.00 and 1.00
    raw_content: string; // JSON metadata payload
    knowledge_node_ids: string[]; // UUID strings
  }
  ```
* **`CreateExpansionRequest`**
  ```typescript
  interface CreateExpansionRequest {
    session_id: string; // UUID
    parent_node_id: string; // UUID
    new_node_title: string;
    new_node_description: string;
    reasoning: string;
    traced_to: string[];
  }
  ```
* **`PromoteExpansionRequest`**
  ```typescript
  interface PromoteExpansionRequest {
    knowledge_node_id: string; // UUID
    reasoning: string;
    traced_to: string[];
  }
  ```

### 2.2 Response DTOs
* **`KnowledgeNodeResponse`**
  ```typescript
  interface KnowledgeNodeResponse {
    knowledge_node_id: string;
    title: string;
    description: string;
    status: 'draft' | 'local' | 'structural' | 'archived';
    created_at: Date;
    updated_at: Date;
  }
  ```
* **`KnowledgeRelationResponse`**
  ```typescript
  interface KnowledgeRelationResponse {
    from_knowledge_node_id: string;
    to_knowledge_node_id: string;
    relation_type: 'prerequisite_of' | 'expands_to' | 'related_to';
  }
  ```
* **`MasteryRecordResponse`**
  ```typescript
  interface MasteryRecordResponse {
    mastery_record_id: string;
    learner_id: string;
    knowledge_node_id: string;
    mastery_level: 'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach';
    teach_composite_score: number;
    updated_at: Date;
  }
  ```

---

## 3. Entity Catalog

Entities map directly to the SQL schema generated in the database layer:

### 3.1 `KnowledgeNode`
* **Table Mapping:** `dbo.knowledge_node`
* **Fields:**
  - `knowledge_node_id`: `string` (UUID) -> PK
  - `title`: `string`
  - `description`: `string`
  - `status`: `'draft' | 'local' | 'structural' | 'archived'`
  - `created_at` / `updated_at`: `Date`
  - `created_by_actor_type` / `updated_by_actor_type`: `'learner' | 'backend_core' | 'ai_service'`
  - `created_by_actor_id` / `updated_by_actor_id`: `string | null` (UUID)

### 3.2 `KnowledgeRelation`
* **Table Mapping:** `dbo.knowledge_relation`
* **Fields:**
  - `from_knowledge_node_id`: `string` (UUID) -> PK, FK
  - `to_knowledge_node_id`: `string` (UUID) -> PK, FK
  - `relation_type`: `'prerequisite_of' | 'expands_to' | 'related_to'`
  - `created_at`: `Date`
  - `created_by_actor_type`: `'learner' | 'backend_core' | 'ai_service'`
  - `created_by_actor_id`: `string | null`

### 3.3 `Evidence`
* **Table Mapping:** `dbo.evidence`
* **Fields:**
  - `evidence_id`: `string` (UUID) -> PK
  - `learner_id`: `string` (UUID) -> FK
  - `source_type`: `'Test' | 'Lab' | 'Probe' | 'Chat'`
  - `direction`: `'positive' | 'negative'`
  - `ai_confidence`: `number` (Decimal)
  - `raw_content`: `string` (JSON block)
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

### 3.4 `MasteryRecord`
* **Table Mapping:** `dbo.mastery_record`
* **Fields:**
  - `mastery_record_id`: `string` (UUID) -> PK
  - `learner_id`: `string` (UUID) -> FK
  - `knowledge_node_id`: `string` (UUID) -> FK
  - `mastery_level`: `'Unknown' | 'Remember' | 'Explain' | 'Apply' | 'Teach'`
  - `teach_composite_score`: `number` (Decimal)
  - `updated_at`: `Date`
  - `version_number`: `number` (BigInt)

### 3.5 `ExpansionRecord`
* **Table Mapping:** `dbo.expansion_record`
* **Fields:**
  - `expansion_record_id`: `string` (UUID) -> PK
  - `knowledge_node_id`: `string` (UUID) -> FK
  - `reasoning`: `string`
  - `traced_to`: `string` (JSON String array of UUIDs)
  - `created_at`: `Date`
  - `created_by_actor_type`: `string`
  - `created_by_actor_id`: `string | null`

---

## 4. Service Contracts

```typescript
export interface IKnowledgeGraphService {
  createNode(cmd: CreateKnowledgeNodeRequest, actorType: string, actorId: string | null): Promise<KnowledgeNodeResponse>;
  createRelation(cmd: CreateKnowledgeRelationRequest): Promise<KnowledgeRelationResponse>;
  hasPath(fromNodeId: string, toNodeId: string): Promise<boolean>; // reaching check
}

export interface IEvidenceService {
  addEvidence(learnerId: string, cmd: AddEvidenceRequest, tx?: any): Promise<string>; // returns evidence_id
}

export interface IMasteryService {
  getMastery(learnerId: string, nodeId: string): Promise<MasteryRecordResponse>;
  evaluateMasteryPromotions(learnerId: string, nodeId: string, tx: any): Promise<void>;
  calculateTeachComposite(learnerId: string, nodeId: string, tx: any): Promise<number>;
}

export interface IExpansionService {
  createLocalExpansion(cmd: CreateExpansionRequest, tx?: any): Promise<KnowledgeNodeResponse>;
  promoteLocalExpansion(cmd: PromoteExpansionRequest, tx?: any): Promise<KnowledgeNodeResponse>;
}

export interface IRegressionService {
  evaluateRegressionTrigger(learnerId: string, nodeId: string, tx: any): Promise<void>;
}
```

---

## 5. Repository Contracts

```typescript
export interface IKnowledgeNodeRepository {
  getById(id: string, tx?: any): Promise<KnowledgeNode | null>;
  getByTitle(title: string, tx?: any): Promise<KnowledgeNode | null>;
  save(node: KnowledgeNode, tx?: any): Promise<void>;
}

export interface IKnowledgeRelationRepository {
  getRelations(nodeId: string, direction: 'incoming' | 'outgoing' | 'both', tx?: any): Promise<KnowledgeRelation[]>;
  save(relation: KnowledgeRelation, tx?: any): Promise<void>;
  checkPathExists(fromId: string, toId: string, tx?: any): Promise<boolean>; // Uses Recursive CTE
}

export interface IEvidenceRepository {
  getById(id: string, tx?: any): Promise<Evidence | null>;
  getUnprocessedNegativeEvidence(learnerId: string, nodeId: string, tx?: any): Promise<Evidence[]>;
  save(evidence: Evidence, tx?: any): Promise<void>;
  saveJunctionLink(nodeId: string, evidenceId: string, stance: 'support' | 'refute', tx?: any): Promise<void>;
}

export interface IMasteryRepository {
  getLearnerMastery(learnerId: string, nodeId: string, tx?: any): Promise<MasteryRecord | null>;
  save(mastery: MasteryRecord, tx?: any): Promise<void>;
}

export interface IExpansionRepository {
  getRecordByNodeId(nodeId: string, tx?: any): Promise<ExpansionRecord | null>;
  save(record: ExpansionRecord, tx?: any): Promise<void>;
}
```

---

## 6. State Machine Contracts

### 6.1 Node Lifecycle States
* **States:** `DRAFT`, `LOCAL`, `STRUCTURAL`, `ARCHIVED`.
* **Transitions:**
  - `DRAFT` -> `STRUCTURAL` (Action: verify curriculum)
  - `LOCAL` -> `STRUCTURAL` (Action: promote curation)
  - `LOCAL` / `STRUCTURAL` -> `ARCHIVED` (Action: soft-delete)

### 6.2 Mastery Lifecycle States
* **States:** `UNKNOWN`, `REMEMBER`, `EXPLAIN`, `APPLY`, `TEACH`.
* **Transitions:**
  - `UNKNOWN` -> `REMEMBER` -> `EXPLAIN` -> `APPLY` -> `TEACH` (Action: assessment signal positive thresholds).
  - Demotion to predecessor state (Action: regression trigger cumulative weight $\ge 1.5$).

---

## 7. Validation Catalog

### 7.1 Field Validation
* **Unique Node Title:** Handled via unique index constraints.
* **Semantic Enum Mapping:** Rejects status inputs mapping outside defined state enums.
* **Confidence Range Checks:** Assures confidence floats match $0.00 \le x \le 1.00$.

### 7.2 Business Validation
* **Acyclicity (DAG check):** Rejects edge insertions failing reachability CTE check tests.
* **Teach Score Criteria:** Attaining `Teach` mastery level requires a composite score of $\ge 0.75$.

---

## 8. Event Catalog

### 8.1 Domain Events
1. **`KnowledgeNodeCreated`**
   - *Payload:* `{ knowledge_node_id: string, title: string, status: string }`
2. **`KnowledgeRelationCreated`**
   - *Payload:* `{ from_knowledge_node_id: string, to_knowledge_node_id: string, relation_type: string }`
3. **`EvidenceAdded`**
   - *Payload:* `{ evidence_id: string, learner_id: string, source_type: string, direction: string }`
4. **`KnowledgeRegressionApplied`**
   - *Payload:* `{ learner_id: string, knowledge_node_id: string, old_level: string, new_level: string }`

---

## 9. Test Catalog

### 9.1 Unit Tests
* **Test Case U1: Teach Composite Calculation**
  - *Verify:* Verifies that inputs `Explain=1.0, Simplify=1.0, Guide=0.5, Review=0.5, Transfer=0.5` evaluate to a composite score of `0.625` (failing mastery).
* **Test Case U2: Regression Weight Limits**
  - *Verify:* Verifies that two negative signals of type `Probe` (weight `0.5` each) do not trigger regression (total `1.0 < 1.5`).

### 9.2 Integration Tests
* **Test Case I1: DAG Recursive Acyclicity**
  - *Verify:* Set up edges $A \to B$ and $B \to C$. Attempt to insert edge $C \to A$. Verify that `createRelation()` throws a `GRAPH_CYCLE_DETECTED` error.

---

## 10. Code Generation Readiness Review

### 10.1 Technical Verification
This package maps all requirements, contracts, validation bounds, and events:
- **Project folders:** Standardized.
- **DTOs & Entities:** Typed and schema-aligned.
- **State Machine Transitions:** Codified.
- **Test Scenarios:** Specified.

### 10.2 Final Gateway Decision

**Classification:** ✅ **`READY_FOR_IMPLEMENTATION`**
