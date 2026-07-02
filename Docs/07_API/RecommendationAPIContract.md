# Recommendation API Contract

- **Status:** Approved Design Document
- **Domain Scope:** Recommendation Domain & Engine
- **Traceability:** DECISION-019 (Proposal-only), DECISION-027 (Explainability trace links)

---

## 1. Output Envelope (Recommendation Proposal Envelope)

All endpoints returning proposal data utilize the standardized envelope:

```json
{
  "recommendation_proposal_id": "UUID",
  "learner_id": "UUID",
  "goal_id": "UUID",
  "proposal_type": "insert_node | skip_node | pause_session | change_mode",
  "payload_details": {
    "knowledge_node_id": "UUID (Nullable)",
    "proposed_mode": "String (Nullable)",
    "roadmap_node_id": "UUID (Nullable)"
  },
  "status": "proposed | accepted | rejected | expired | superseded",
  "confidence": 0.88,
  "reasoning": "Giải thích lý do đề xuất hiển thị cho người học",
  "traced_to": ["assessment_result:<uuid>"],
  "created_at": "DateTimeOffset"
}
```

---

## 2. Endpoints

### 2.1 `GET /api/recommendations`
* **Mục đích:** Trả về danh sách các đề xuất đang kích hoạt (status = `proposed`) được xếp hạng theo thứ tự ưu tiên.
* **Request:** Extracted `learner_id` from Auth. Query parameter `goal_id` (UUID, Required).
* **Sorting/Pagination:** Luôn trả về danh sách được sắp xếp theo `R_Score` DESC. Cực đại 3 kết quả (UI dashboard cap).
* **Response:**
  ```json
  {
    "proposals": [ Output Envelope (mục 1) ]
  }
  ```

### 2.2 `POST /api/recommendation/:id/accept`
* **Mục đích:** Người học chấp nhận một đề xuất. Hành động này chuyển đổi trạng thái của đề xuất sang `accepted` và kích hoạt logic điều chỉnh tương ứng của Roadmap/Learning Session Domain.
* **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
* **Request:** Path param `id` (recommendation_proposal_id).
* **Response:**
  ```json
  {
    "status": "success",
    "recommendation_proposal_id": "UUID",
    "applied_action": "insert_node | change_mode | pause"
  }
  ```
* **Errors:** `404 PROPOSAL_NOT_FOUND`, `409 INVALID_STATE`.

### 2.3 `POST /api/recommendation/:id/reject`
* **Mục đích:** Người học từ chối đề xuất. Chuyển trạng thái đề xuất sang `rejected`.
* **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
* **Request:** Path param `id`, `{ "reason": "String (Optional)" }`
* **Response:**
  ```json
  {
    "status": "success"
  }
  ```

---

## 3. Error Contract (Layer 4 Error)

```json
{
  "error_code": "PROPOSAL_NOT_FOUND | EXPLAINABILITY_TRACE_MISSING | VALIDATION_FAILED",
  "message": "Không thể xử lý đề xuất — vui lòng thử lại",
  "capability": "recommendation_generation",
  "retriable": false,
  "trace_id": "UUID"
}
```
