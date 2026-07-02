# Discovery Session Lifecycle

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — đề xuất thiết kế, chưa Decision khóa.** Tài liệu này **thay thế mục 1-2** của [DiscoveryStateMachine.md](DiscoveryStateMachine.md) (state list + transition diagram) làm nguồn thẩm quyền — mục 3, 5, 6 của file đó (Continuous Discovery, ROADMAP boundary) vẫn giữ nguyên hiệu lực, không lặp lại ở đây. [DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md) vẫn là nguồn thẩm quyền cho điều kiện `DISCOVERY_COMPLETE`/`BLOCKED`, không đổi.
>
> Đánh giá theo yêu cầu: `EXPIRED`, `ABANDONED`, `ARCHIVED`.

## 0. Kết luận đánh giá trước khi vào chi tiết

| Candidate | Kết luận |
|---|---|
| `EXPIRED` | **Thêm làm `state` ngang hàng** với `INIT`/`DISCOVERY`/`DISCOVERY_COMPLETE`/`BLOCKED` — terminal, housekeeping, không phải AI Decision (xem mục 3). |
| `ABANDONED` | **Thêm làm `state` ngang hàng** — terminal, do Learner chủ động, khác `EXPIRED` (hệ thống phát hiện) ở actor và ý định (xem mục 4). |
| `ARCHIVED` | **Không thêm làm `state`** — đề xuất mô hình hóa thành **1 trục riêng** (`archived_at` nullable timestamp + `superseded_by_discovery_session_id`), trực giao với `state`, không phải 1 giá trị `state` thứ 7. Lý do: "archived" có thể xảy ra với *bất kỳ* `state` terminal nào (1 session `DISCOVERY_COMPLETE` cũ vẫn có thể bị archive khi có session mới hơn cho cùng Goal) — gộp vào `state` sẽ nhân đôi số tổ hợp (`DISCOVERY_COMPLETE_ARCHIVED`, `EXPIRED_ARCHIVED`...) một cách không cần thiết. Xem mục 5. |

**Kết quả: `state` có 6 giá trị** (`INIT`, `DISCOVERY`, `DISCOVERY_COMPLETE`, `BLOCKED`, `EXPIRED`, `ABANDONED`), cộng 1 thuộc tính `archived_at` độc lập.

## 1. State Table (đầy đủ, thay thế DiscoveryStateMachine.md mục 1)

| State | Ý nghĩa | Entry Criteria | Exit Criteria | Allowed Transitions | Audit Requirements |
|---|---|---|---|---|---|
| `INIT` | Session vừa tạo, chưa có câu hỏi nào | `DiscoverySession` được tạo (`POST /api/discovery/start`) | Câu hỏi đầu tiên được sinh, hoặc bất hoạt/abandon trước khi có câu hỏi nào | → `DISCOVERY`, → `EXPIRED`, → `ABANDONED` | `created_at`, `created_by_actor_type` (luôn `learner` — Learner khởi tạo qua hành động start) |
| `DISCOVERY` | Đang hỏi-đáp | Từ `INIT` (câu hỏi đầu tiên) hoặc tự lặp lại (câu hỏi tiếp theo) | Completion Criteria đạt, Retry Limit chạm trần, bất hoạt, hoặc abandon | → `DISCOVERY` (self-loop), → `DISCOVERY_COMPLETE`, → `BLOCKED`, → `EXPIRED`, → `ABANDONED` | Mỗi transition self-loop ghi `updated_at`; không cần `traced_to` (đây không phải AI Decision theo C1-C4, chỉ là tiến trình hỏi-đáp) |
| `DISCOVERY_COMPLETE` | Đủ thông tin, sẵn sàng cho Roadmap Engine đọc | Mandatory Information đạt ([DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md) mục 1, 8) | **Terminal** — không có exit (trừ khi `archived_at` được set sau này, xem mục 5, đây không phải state transition) | *(không có transition đi ra)* | `completed_at`, `updated_by_actor_type = 'ai_service'` (Discovery Engine tự kết luận completion) |
| `BLOCKED` | Hết ngân sách câu hỏi mà chưa đủ coverage, hoặc input không dùng được liên tiếp | [DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md) mục 7 | Learner cung cấp input mới dùng được (→ `DISCOVERY`), hoặc bất hoạt kéo dài (→ `EXPIRED`), hoặc Learner chủ động bỏ (→ `ABANDONED`) | → `DISCOVERY`, → `EXPIRED`, → `ABANDONED` | `updated_by_actor_type = 'ai_service'` khi vào `BLOCKED`; `updated_by_actor_type = 'learner'` khi thoát qua `DISCOVERY` |
| `EXPIRED` *(mới)* | Bất hoạt vượt ngưỡng thời gian — housekeeping, không phải nhận định về năng lực | Từ `INIT`/`DISCOVERY`/`BLOCKED`, không có `DiscoveryAnswer` mới trong cửa sổ bất hoạt (🔶 độ dài cửa sổ chưa chốt, xem Risks) | **Terminal** | *(không có transition đi ra)* | `updated_by_actor_type = 'backend_core'` (job hệ thống, không phải Learner/AI quyết định — xem mục 3) |
| `ABANDONED` *(mới)* | Learner chủ động dừng, không phải hệ thống phát hiện | Từ `INIT`/`DISCOVERY`/`BLOCKED`, Learner gọi hành động dừng tường minh (🔶 endpoint chưa có, xem Risks) | **Terminal** | *(không có transition đi ra)* | `updated_by_actor_type = 'learner'` |

**Không có state `ROADMAP`** — giữ nguyên ràng buộc đã khóa ở [DiscoveryStateMachine.md](DiscoveryStateMachine.md) mục 1/6.

## 2. Transition Diagram (đầy đủ)

```
INIT --start_question--> DISCOVERY
DISCOVERY --ask_next_question--> DISCOVERY                          (self-loop)
DISCOVERY --completion_criteria_met--> DISCOVERY_COMPLETE
DISCOVERY --session_retry_limit_exceeded_without_coverage--> BLOCKED
BLOCKED --learner_resumes_with_usable_input--> DISCOVERY

INIT --inactivity_window_exceeded--> EXPIRED
DISCOVERY --inactivity_window_exceeded--> EXPIRED
BLOCKED --inactivity_window_exceeded--> EXPIRED

INIT --learner_abandons--> ABANDONED
DISCOVERY --learner_abandons--> ABANDONED
BLOCKED --learner_abandons--> ABANDONED
```

**`DISCOVERY_COMPLETE`, `EXPIRED`, `ABANDONED` đều terminal** — không có transition nào đi ra khỏi 3 state này. `BLOCKED` là state duy nhất "bán-terminal" (có 1 đường thoát hợp lệ trở lại `DISCOVERY`, ngoài 2 đường terminal).

**Giải quyết 1 Risk đã ghi nhận ở lượt trước:** [DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md) Risk #4 ("`BLOCKED` không có lối thoát nếu Learner không bao giờ quay lại") nay có lối thoát — `BLOCKED --inactivity_window_exceeded--> EXPIRED` đảm bảo không có session nào kẹt vĩnh viễn ở `BLOCKED` (nguyên tắc 6).

## 3. `EXPIRED` không phải AI Decision (đối chiếu DECISION-048)

Theo [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md) mục 1 (4 điều kiện C1-C4 để là 1 AI Decision), transition vào `EXPIRED` **không thoả C1** (không có "judgment among alternatives mang tính lựa chọn nghiệp vụ" — đây là so sánh thời gian thuần túy, tất định). Vì vậy:

- **Không cần `traced_to[]`** — đúng phân loại "Out Of Scope mục 1" của [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) ("hành vi tất định không có nhánh lựa chọn").
- **Không phải lời gọi AI Service** — thực thi bởi `backend_core` (scheduled job/cron-equivalent), không phải Discovery Engine (AI).
- Phân biệt rõ với `BLOCKED` (state liền trước nó về mặt "không hoàn tất") — `BLOCKED` **là** kết quả của 1 AI Decision thật (Discovery Engine kết luận "hết ngân sách mà chưa đủ coverage"), trong khi `EXPIRED` chỉ là hệ quả thời gian thuần túy của việc *không ai tương tác gì thêm*, dù đang ở `BLOCKED` hay `DISCOVERY`.

**Không vi phạm tinh thần "không suy giảm theo thời gian" của [DECISION-016](../11_Decisions/DECISION-016-Evidence-Based-Decay.md)** — DECISION-016 cấm suy luận *"Learner đã quên kiến thức X vì lâu rồi không học"* (một nhận định về năng lực). `EXPIRED` không đưa ra nhận định gì về năng lực Learner — nó chỉ là dọn dẹp vòng đời 1 session chưa hoàn tất, tương tự khái niệm session timeout thông thường, không phải Knowledge Regression. Đây là 2 khái niệm khác nhau dù cùng có yếu tố "thời gian" — cần phân biệt tường minh để tránh đọc nhầm là mâu thuẫn với DECISION-016.

## 4. `ABANDONED` — vì sao tách khỏi `EXPIRED`

| | `EXPIRED` | `ABANDONED` |
|---|---|---|
| Actor | `backend_core` (hệ thống phát hiện) | `learner` (chủ động) |
| Tín hiệu | Im lặng/bất hoạt — **không có dữ liệu gì để suy luận ý định** | Tường minh — Learner *nói* "tôi không muốn tiếp tục" |
| Giá trị cho Recommendation Engine (ngoài Phase 1) | Thấp — không biết Learner bỏ vì lý do gì | Cao hơn — bỏ giữa chừng **có chủ đích** đáng là 1 tín hiệu (ví dụ Goal không còn phù hợp, câu hỏi quá khó) — 🔶 đề xuất, ngoài phạm vi thực thi của tài liệu này |

Tách 2 state để **không đánh đồng "im lặng" với "từ chối tường minh"** — quan trọng vì 1 ngày nào đó nếu Recommendation Engine cần đọc lại lịch sử Discovery, 2 tín hiệu này có ý nghĩa khác nhau hoàn toàn (1 cái là "không biết", 1 cái là "biết rõ Learner không muốn").

## 5. `ARCHIVED` — vì sao là 1 trục riêng, không phải `state`

Đề xuất thêm vào `DiscoverySession` (mục 3 [DiscoveryDomain.md](DiscoveryDomain.md)):

| Thuộc tính mới | Ý nghĩa |
|---|---|
| `archived_at` | Nullable timestamp — khi nào session này bị "thay thế" bởi 1 session mới hơn |
| `superseded_by_discovery_session_id` | FK tự tham chiếu → `discovery_session` — session nào đã thay thế nó |

**Kích hoạt:** khi Continuous Discovery (Capability #8) tạo 1 `DiscoverySession` mới cho cùng `learner_id` + `goal_id`, session **cũ nhất chưa archive** cho cùng cặp đó được set `archived_at` — **bất kể `state` của nó là gì** (`DISCOVERY_COMPLETE`, `EXPIRED`, `ABANDONED`, hay thậm chí vẫn `BLOCKED`).

**Lý do không gộp vào `state`:** nếu `ARCHIVED` là 1 giá trị `state`, sẽ mất thông tin "session này hoàn tất hay bị bỏ dở trước khi bị archive" — phải tạo state lai (`DISCOVERY_COMPLETE_ARCHIVED`, `ABANDONED_ARCHIVED`...) hoặc chấp nhận mất dữ liệu lịch sử khi ghi đè `state` cũ thành `ARCHIVED`. Mô hình 2 trục độc lập (giống cách `Goal.supersedes_goal_id` không phải 1 "Goal state" mà là 1 quan hệ riêng, [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md)) giữ nguyên cả 2 thông tin.

**Không xóa dữ liệu khi archive** — nhất quán nguyên tắc append-only/immutable dùng xuyên hệ thống (Evidence, AssessmentResult, Goal) — session cũ vẫn đọc được đầy đủ, chỉ đánh dấu "không còn là nguồn hiện hành" cho Learner×Goal đó.

## 6. Risks

1. **Độ dài "cửa sổ bất hoạt" cho `EXPIRED` chưa có số cụ thể** — đề xuất hình dạng cơ chế, không đề xuất số (tránh tự quyết định 1 tham số vận hành chưa có cơ sở).
2. **Endpoint cho `ABANDONED` và phản biện mismatch** — Đã được giải quyết bằng việc thêm các endpoint `/api/discovery/session/:id/abandon` và `/api/discovery/session/:id/contest` vào [DiscoveryAPIContract.md](../07_API/DiscoveryAPIContract.md).
3. **Phạm vi kích hoạt `archived_at`** — Đã giải quyết bởi chính sách concurrency tại DECISION-054: Giới hạn tối đa 1 phiên Discovery hoạt động cho mỗi cặp Learner×Goal. Khi phiên mới được khởi tạo, bất kỳ phiên nào trước đó chưa đóng sẽ tự động bị archive.
4. **Giá trị tín hiệu của `ABANDONED` cho Recommendation Engine (mục 4) chỉ là gợi ý, chưa thiết kế cơ chế tiêu thụ cụ thể** — ngoài phạm vi Discovery, ghi nhận để Backlog.
