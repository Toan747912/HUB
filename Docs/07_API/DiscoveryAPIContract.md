# Discovery API Contract

- **Status:** ⚠️ **Reconciled.**
- **Phase:** Phase 1 — Discovery Engine (Design Closure)
- **Authority:** This document defines the Layer 2 (Session Output Envelope) contract for the Discovery API, fully aligned with DECISION-051 through DECISION-055.

---

## 1. Output Envelope (Session Output Envelope)

Every request responding to Discovery API actions uses a unified envelope structure:

```json
{
  "goal_snapshot": { "clarified_goal": "...", "goal_id": "..." },
  "competency_profile": [
    { "claimed_skill_area_id": "...", "label": "...", "self_reported_level": "...", "observed_level": "..." }
  ],
  "mismatch_signals": [
    { "self_assessment_mismatch_id": "...", "claimed_skill_area_id": "...", "reasoning": "..." }
  ],
  "confidence": 0.0,
  "reasoning": "Lý do ngắn gọn hiển thị cho Learner",
  "traced_to": ["discovery_answer:<id>", "competency_signal:<id>"],
  "next_step": "continue | complete | blocked | expired | abandoned",
  "next_question": {
    "discovery_question_id": "...",
    "prompt_text": "..."
  }
}
```

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `goal_snapshot` | Có (nullable) | Đọc từ `Goal` hiện tại (Goal & Roadmap Domain) |
| `competency_profile` | Có (mảng rỗng hợp lệ) | Tổng hợp từ `CompetencySignal[]` và `ClaimedSkillArea` (locked by DECISION-055) |
| `mismatch_signals` | Có (mảng rỗng hợp lệ) | Tổng hợp từ `SelfAssessmentMismatch[]` |
| `confidence` | Có | Độ tin cậy tổng hợp dựa trên tính nhất quán của probe (locked by DECISION-053) |
| `reasoning` | Có | Ngôn ngữ Learner hiểu được, đáp ứng DECISION-048 |
| `traced_to` | **Bắt buộc khi có mismatches** | Danh sách các ID trả lời/tín hiệu nguồn (DECISION-048, DECISION-027) |
| `next_step` | Có | `continue` (đang hỏi), `complete` (xong), `blocked` (kẹt), `expired` (timeout), `abandoned` (learner hủy) |
| `next_question` | Có (nullable) | Câu hỏi kế tiếp được sinh nếu `next_step` = `continue` |

---

## 2. Endpoints

All write endpoints (`start`, `answer`, `abandon`, `contest`) require the standard header **`Idempotency-Key`** to prevent duplicate execution (e.g. from rapid double-clicking).

### 2.1 `POST /api/discovery/start`
- **Mục đích:** Khởi tạo `DiscoverySession` mới, sinh câu hỏi đầu tiên.
- **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
- **Request:** `{ learner_id, trigger: "onboarding" | "continuous", goal_id?: string }`  
  *(Lưu ý: `goal_id` bắt buộc nếu trigger = `continuous`).*
- **Response:** Session Output Envelope (mục 1) + `discovery_session_id`, `state: "DISCOVERY"`
- **Consequences:** Tự động lưu trữ (archive) bất kỳ phiên Discovery đang mở nào dưới cùng Goal (locked by DECISION-054).

### 2.2 `POST /api/discovery/answer`
- **Mục đích:** Ghi nhận câu trả lời cho một câu hỏi, sinh tín hiệu và mismatch tương ứng, quyết định hỏi tiếp hay hoàn tất.
- **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
- **Request:** `{ discovery_session_id, discovery_question_id, raw_input }`
- **Response:** Session Output Envelope (mục 1).
- **Write:** `DiscoveryAnswer`, `CompetencySignal`, `SelfAssessmentMismatch` (nếu chênh lệch $\ge 2$ levels hoặc chênh lệch 1 level đã qua verify probe, locked by DECISION-051).

### 2.3 `POST /api/discovery/session/:id/abandon`
- **Mục đích:** Người học chủ động dừng phiên Discovery.
- **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
- **Request:** Path param `id` (= `discovery_session_id`)
- **Response:** Session Output Envelope với `next_step: "abandoned"`, `state: "ABANDONED"` (Terminal).

### 2.4 `POST /api/discovery/session/:id/contest`
- **Mục đích:** Người học phản biện kết quả đánh giá mismatch tại session summary.
- **Headers:** `Idempotency-Key: <UUID>` (Bắt buộc)
- **Request:** Path param `id`, `{ competency_signal_id, raw_feedback }`
- **Response:** Session Output Envelope với `next_step: "continue"` và một `next_question` (verify probe mới để đánh giá lại).
- **Logic:** Tạo `DiscoveryAnswer` phản biện, chuyển trạng thái session ngược về `DISCOVERY` (nếu đang ở `BLOCKED` hoặc complete summary).

### 2.5 `GET /api/discovery/session/:id`
- **Mục đích:** Đọc trạng thái hiện tại của phiên Discovery.
- **Request:** Path param `id`
- **Response:** Session Output Envelope + metadata (`state`, `started_at`, `completed_at`, `archived_at`).

---

## 3. Human Control Boundary (đối chiếu DECISION-051)

| Mức kiểm soát | Quy tắc Discovery |
|---|---|
| AI tự thực hiện (Audit logs) | Sinh câu hỏi probe thích ứng, ghi nhận `CompetencySignal`, ghi nhận `SelfAssessmentMismatch` (`requires_confirmation = false`). |
| Đề xuất, cần Learner xác nhận | Không áp dụng trực tiếp trong Discovery. Điều chỉnh Roadmap (Mastery, RoadmapNode) dựa trên mismatch tín hiệu được đẩy qua Recommendation Engine dưới dạng các Recommendation Proposals và bắt buộc Learner đồng ý. |
| AI cấm thực hiện | Mutate các bảng `Goal` hoặc `RoadmapNode` trực tiếp; thay đổi lịch sử answers/signals. |

---

## 4. Failure & Idempotency Handling

1. **Transaction Integrity:** 
   - `start` thực hiện ghi `DiscoverySession` và `DiscoveryQuestion` đầu tiên trong cùng một database transaction.
   - `answer` thực hiện ghi `DiscoveryAnswer`, `CompetencySignal` và `SelfAssessmentMismatch` trong cùng một transaction.
2. **Idempotency Execution:** Backend sử dụng `Idempotency-Key` header để lưu hash request/response trong cache (ví dụ Redis hoặc DB table `idempotency_key` trong cửa sổ 5 phút), trả trực tiếp cache response nếu gặp trùng key.

---

## 5. Risks

1. **Auth/RLS Constraints:** Quyết định auth và RLS mapping sẽ đi theo Supabase Auth (`auth.users.id` matching `learner.id` UUID) theo DECISION-043.
2. **Dynamic Branching latency:** Xử lý probe verification thích ứng (OQ5) yêu cầu tính toán logic nhanh để trả về `next_question` trong vòng <500ms.
