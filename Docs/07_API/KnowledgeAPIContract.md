# Knowledge API Contract

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine
- **Traceability:** DECISION-023 (Controlled Expansion), DECISION-025 (DAG relation types), DECISION-027 (Explainability tracked_to)

---

## 1. Output Envelope (Knowledge Session Envelope)

All responses returning Knowledge data utilize a unified envelope structure:

```json
{
  "node_snapshot": {
    "knowledge_node_id": "UUID",
    "title": "String",
    "status": "String (draft | local | structural | archived)",
    "description": "String"
  },
  "relations": [
    {
      "to_knowledge_node_id": "UUID",
      "relation_type": "String (prerequisite_of | expands_to | related_to)"
    }
  ],
  "mastery": {
    "mastery_level": "String (Unknown | Remember | Explain | Apply | Teach)",
    "teach_composite_score": 0.82
  },
  "traced_to": ["String (references)"],
  "correlation_id": "UUID"
}
```

---

## 2. Endpoints

### 2.1 `GET /api/knowledge/node/:id`
* **Mục đích:** Đọc thông tin chi tiết của một Node và danh sách các quan hệ trực tiếp.
* **Request:** Path param `id` (UUID of the target knowledge node).
* **Response:** Output Envelope (mục 1).

### 2.2 `GET /api/knowledge/node/:id/mastery`
* **Mục đích:** Lấy thông tin Mastery hiện tại của người học đối với Node được chọn.
* **Request:** Path param `id` (UUID). Extracted `learner_id` from Supabase Auth header.
* **Response:**
  ```json
  {
    "knowledge_node_id": "UUID",
    "learner_id": "UUID",
    "mastery_level": "String",
    "teach_composite_score": 0.0,
    "updated_at": "DateTimeOffset"
  }
  ```

### 2.3 `POST /api/knowledge/node/expand`
* **Mục đích:** Yêu cầu mở rộng cấu trúc đồ thị (Dynamic Structural Expansion). Tạo ra một node mới và ghi nhận `ExpansionRecord` bắt buộc.
* **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
* **Request:**
  ```json
  {
    "session_id": "UUID (Discovery or Learning Session)",
    "parent_node_id": "UUID",
    "relation_type": "prerequisite_of | expands_to",
    "new_node_title": "String (Max 255)",
    "new_node_description": "String",
    "reasoning": "String (Explainability explanation text)"
  }
  ```
* **Response:** Output Envelope của Node mới được tạo, kèm `traced_to` chứa UUID của session/answer kích hoạt.
* **Errors:** `400 BAD_REQUEST`, `409 DUPLICATE_NODE`.

### 2.4 `POST /api/knowledge/edge/add`
* **Mục đích:** Tạo một liên kết có hướng giữa hai Node. Tự động kiểm tra chu kỳ (Cycle Detection).
* **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
* **Request:**
  ```json
  {
    "from_knowledge_node_id": "UUID",
    "to_knowledge_node_id": "UUID",
    "relation_type": "prerequisite_of | expands_to | related_to"
  }
  ```
* **Response:**
  ```json
  {
    "status": "success",
    "edge": {
      "from_knowledge_node_id": "UUID",
      "to_knowledge_node_id": "UUID",
      "relation_type": "String"
    }
  }
  ```
* **Errors:** `409 GRAPH_CYCLE_DETECTED` (Nếu phát hiện chu kỳ, giao dịch bị rollback hoàn toàn).

---

## 3. Error Contract (Layer 4 Error)

Các lỗi nghiệp vụ của Knowledge Engine tuân thủ cấu trúc chuẩn:

```json
{
  "error_code": "GRAPH_CYCLE_DETECTED | NODE_NOT_FOUND | EXPLAINABILITY_TRACE_MISSING | VALIDATION_FAILED",
  "message": "Thông điệp dịch thuật hiển thị cho người học",
  "capability": "knowledge_expansion",
  "retriable": false,
  "trace_id": "UUID"
}
```
