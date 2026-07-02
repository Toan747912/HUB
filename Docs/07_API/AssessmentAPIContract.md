# Assessment API Contract

- **Status:** Approved Design Document
- **Domain Scope:** Assessment Domain & Engine
- **Traceability:** DECISION-026 (Assessment owners), DECISION-030 (Result envelope shape)

---

## 1. Output Envelope (Assessment Output Envelope)

Every API endpoint returning evaluation data matches the standardized envelope:

```json
{
  "assessment_result_id": "UUID",
  "learner_id": "UUID",
  "knowledge_node_id": "UUID",
  "assessed_level": "Remember | Explain | Apply | Teach",
  "score_details": {
    "composite_teach": 0.85,
    "explain": 0.90,
    "simplify": 0.80,
    "guide": 0.85,
    "review": 0.90,
    "transfer": 0.80
  },
  "confidence": 0.92,
  "reasoning": "Lý do đánh giá hiển thị cho người học",
  "traced_to": ["evidence:<uuid>"],
  "created_at": "DateTimeOffset"
}
```

---

## 2. Endpoints

### 2.1 `POST /api/assessment/evaluate`
* **Mục đích:** Kích hoạt đánh giá đồng bộ cho một cặp Learner và Node dựa trên danh sách Evidence mới.
* **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
* **Request:**
  ```json
  {
    "learner_id": "UUID (Required)",
    "knowledge_node_id": "UUID (Required)",
    "evidence_ids": ["UUID (Required, non-empty)"]
  }
  ```
* **Response:** Output Envelope (mục 1).
* **Write:** Inserts `dbo.assessment_result` and updates `dbo.mastery_record`.
* **Errors:** `400 BAD_REQUEST`, `404 NODE_NOT_FOUND`, `422 UNPROCESSABLE_EVIDENCE`.

### 2.2 `GET /api/assessment/learner/:learner_id/node/:node_id/history`
* **Mục đích:** Lấy lịch sử tất cả các kết quả đánh giá (bao gồm cả các bản ghi đã bị Superseded) của người học trên một Node cụ thể.
* **Request:** Path parameters `learner_id` và `node_id`.
* **Sorting/Pagination:** Mặc định sắp xếp theo `created_at` DESC. Hỗ trợ `limit` và `offset`.
* **Response:**
  ```json
  {
    "history": [ Output Envelope (mục 1) ],
    "total_count": 5
  }
  ```

### 2.3 `GET /api/assessment/result/:id`
* **Mục đích:** Lấy chi tiết của một bản ghi kết quả đánh giá cụ thể qua ID.
* **Request:** Path param `id`.
* **Response:** Output Envelope (mục 1).

---

## 3. Error Contract (Layer 4 Error)

```json
{
  "error_code": "UNPROCESSABLE_EVIDENCE | EXPLAINABILITY_TRACE_MISSING | VALIDATION_FAILED",
  "message": "Không thể xử lý dữ liệu đánh giá — vui lòng kiểm tra lại",
  "capability": "assessment_evaluation",
  "retriable": false,
  "trace_id": "UUID"
}
```
