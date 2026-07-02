# Discovery Completion Criteria

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — đề xuất thiết kế.** Trả lời trực tiếp [DiscoveryStateMachine.md](DiscoveryStateMachine.md) mục 4 ("Completion Criteria — 🔶 OPEN") — tài liệu này **thay thế** nội dung mục 4 đó bằng thiết kế đầy đủ (cập nhật chéo, xem mục 8 cuối tài liệu). Cũng giới thiệu **state `BLOCKED` mới**, mở rộng state machine 3-trạng-thái ban đầu lên 4 trạng thái — xem mục 7.
>
> Cơ sở: [DiscoveryDomain.md](DiscoveryDomain.md), [SelfAssessmentMismatchMechanism.md](SelfAssessmentMismatchMechanism.md) (đặc biệt mục 3 — chuỗi probe 2-3 câu/`CompetencySignal`), nguyên tắc 6 ("Không để user bị kẹt quá lâu", [Project_Index.md](../Project_Index.md) mục 2).

## 1. Mandatory Information

`DiscoverySession` chỉ được chuyển `DISCOVERY → DISCOVERY_COMPLETE` khi **cả 3** điều kiện sau đều đúng:

| # | Điều kiện | Áp dụng cho |
|---|---|---|
| M1 | `goal_snapshot` không null — đã có `clarified_goal` (Goal Clarification đã hoàn tất) | Mọi `trigger` |
| M2 | Mỗi `claimed_skill_area` được trích từ Goal (xem mục 4) có **ít nhất 1** `CompetencySignal` | Chỉ `trigger = 'onboarding'` — Continuous Discovery (mục 1 M2'") có quy tắc riêng |
| M2' | Ít nhất 1 `CompetencySignal` mới được tạo cho `knowledge_node_id` đang xét (Continuous Discovery thường nhắm 1 node cụ thể, không phải toàn bộ Goal) | Chỉ `trigger = 'continuous'` |

**M1 không thể bỏ qua trong bất kỳ trường hợp nào** — không có Goal rõ ràng thì không có gì để Roadmap Engine đọc tiếp (đầu ra tối thiểu của Discovery, theo [DECISION-007](../11_Decisions/DECISION-007-Discovery-Engine.md)).

## 2. Optional Information

Không bắt buộc để hoàn tất, nhưng nếu có thì được đưa vào Output Envelope:

- `mismatch_signals[]` — có thể rỗng hợp lệ (không phải mọi `DiscoverySession` đều phát hiện mismatch).
- Probe bổ sung ngoài `claimed_skill_area` bắt buộc — nếu Learner tự nguyện cung cấp thêm thông tin (ví dụ kể thêm kinh nghiệm không được hỏi), AI có thể tạo thêm `CompetencySignal` nhưng không bắt buộc để hoàn tất.

## 3. Minimum Confidence

Tái sử dụng hình dạng `confidence` ở [SelfAssessmentMismatchMechanism.md](SelfAssessmentMismatchMechanism.md) mục 4 — **không có số ngưỡng cụ thể ở Phase 1** (cùng lý do: phụ thuộc câu 13 chưa đóng). Thay vào đó, đề xuất quy tắc **không-chặn-cứng**:

> `confidence` thấp **không tự nó là điều kiện chặn** `DISCOVERY_COMPLETE` — nó chỉ ảnh hưởng `next_step` gián tiếp qua **Retry Limits** (mục 5). Nếu Retry Limit bị chạm trước khi `confidence` đạt mức "đủ tốt" (số cụ thể chưa chốt), `DiscoverySession` **vẫn được phép hoàn tất** với `confidence` thấp được hiển thị tường minh, thay vì giữ Learner kẹt lại vô thời hạn để chờ confidence cao hơn (nguyên tắc 6).

Đây là khác biệt thiết kế quan trọng so với cách đọc "Minimum Confidence" theo nghĩa đen (ngưỡng chặn) — lý do nêu ở mục 6.

## 4. Required Competency Coverage

**`claimed_skill_area`** — khái niệm mới, cầu nối giữa Goal Clarification (chưa có Knowledge Graph) và Competency Probing (cần biết nên probe cái gì):

- Sinh ra bởi Goal Clarification khi `clarified_goal` được xác lập — AI trích xuất 1 danh sách tên kỹ năng/chủ đề tự do (text, không phải `knowledge_node_id`) từ phát biểu Goal. Ví dụ Goal "Tôi muốn build 1 REST API có auth bằng Node.js" → `claimed_skill_area = ["Node.js cơ bản", "REST API design", "Authentication"]`.
- **Không phải entity riêng trong [DiscoveryDomain.md](DiscoveryDomain.md)** — đề xuất là 1 trường tạm trong `result.clarified_goal` (Goal Clarifier Prompt output, [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 2), không phải bảng DB riêng — vì đây là dữ liệu trung gian dùng trong 1 `DiscoverySession`, không cần bền vững lâu dài như `CompetencySignal`. **🔶 Risk** — nếu Continuous Discovery cần tham chiếu lại `claimed_skill_area` của Goal cũ, có thể cần bền vững hóa sau (Backlog, xem mục 9).

**Coverage = 100% `claimed_skill_area` có ≥ 1 `CompetencySignal`** — không yêu cầu coverage sâu (không cần probe mọi `KnowledgeNode` con, chỉ cần đã chạm tới mỗi vùng kỹ năng cấp cao một lần). Lý do: Discovery là bước onboarding nhanh, không phải Assessment toàn diện (đó là việc của Assessment Engine xuyên suốt quá trình học, không phải 1 lần ở Discovery).

## 5. Retry Limits

Áp dụng **2 cấp giới hạn riêng biệt**, không trộn lẫn:

| Cấp | Giới hạn đề xuất | Áp dụng |
|---|---|---|
| **Trong 1 `CompetencySignal`** | Tối đa **3 probe liên tiếp** (đã nêu ở [SelfAssessmentMismatchMechanism.md](SelfAssessmentMismatchMechanism.md) mục 3) | Chuỗi hiệu chỉnh mức (`Apply` → `Explain` → `Remember`) cho cùng 1 `claimed_skill_area`/`knowledge_node_id` |
| **Toàn `DiscoverySession`** | Tối đa **N `claimed_skill_area` × 3 probe** câu hỏi tổng — **🔶 giá trị trần tổng (ví dụ 15-20 câu) chưa chốt số cụ thể**, chỉ chốt công thức = (số skill area) × (giới hạn cấp trong-signal) | Toàn bộ phiên, đảm bảo nguyên tắc 6 |

**Khi chạm Retry Limit cho 1 `claimed_skill_area` cụ thể** (không phải toàn phiên): dừng probe vùng đó, chốt `observed_level` ở mức cuối cùng đo được (dù chưa "chắc chắn"), đánh dấu `CompetencySignal` đó với độ tin cậy thấp hơn (ảnh hưởng `confidence`, không chặn coverage — đã có ≥ 1 signal, thỏa M2).

**Khi chạm Retry Limit toàn phiên mà coverage (M2) vẫn chưa đủ** — xem mục 7 (`BLOCKED`), đây là trường hợp duy nhất Retry Limit có thể dẫn tới không-hoàn-tất.

## 6. Vì sao "Minimum Confidence" không phải ngưỡng chặn cứng

Nếu Minimum Confidence là ngưỡng chặn cứng, hệ thống có rủi ro **giữ Learner trong vòng lặp probe vô hạn** với 1 Learner trả lời mơ hồ liên tục (confidence không bao giờ tăng đủ) — vi phạm trực tiếp nguyên tắc 6. Thiết kế này tách 2 khái niệm:

- **Coverage (mục 4)** — điều kiện cứng, *phải* đạt để hoàn tất (đây là "đã hỏi đủ chỗ cần hỏi").
- **Confidence (mục 3)** — chỉ là 1 chỉ số chất lượng đi kèm, *không* chặn hoàn tất, chỉ chặn ở cấp 1 `claimed_skill_area` thông qua Retry Limit (mục 5), không chặn ở cấp toàn phiên.

## 7. `BLOCKED` Conditions (state mới)

**Mở rộng [DiscoveryStateMachine.md](DiscoveryStateMachine.md) (3 state ban đầu) thành 4 state** — `BLOCKED` được thêm vì brief Phase 2 này yêu cầu tường minh "Failure States"/"BLOCKED conditions" mà thiết kế 3-state trước đó (Phase 1, lượt trước) chưa có khái niệm thất bại, chỉ có "chưa xong" (`DISCOVERY`) hoặc "xong" (`DISCOVERY_COMPLETE`).

```
INIT --start_question--> DISCOVERY
DISCOVERY --ask_next_question--> DISCOVERY        (self-loop)
DISCOVERY --completion_criteria_met--> DISCOVERY_COMPLETE     (mục 1: M1 + M2/M2')
DISCOVERY --session_retry_limit_exceeded_without_coverage--> BLOCKED
BLOCKED --learner_resumes_with_usable_input--> DISCOVERY
```

| Điều kiện vào `BLOCKED` | Mô tả |
|---|---|
| **Retry Limit toàn phiên chạm trần VÀ coverage (M2) chưa đủ** | Khác mục 5 (chạm trần ở 1 skill area thì vẫn cho qua) — đây là khi *toàn phiên* hết ngân sách câu hỏi mà vẫn còn skill area chưa có signal nào |
| **`raw_input` không dùng được liên tiếp** (rỗng, không phân tích được nội dung) **vượt 1 ngưỡng riêng** | 🔶 ngưỡng số lần chưa chốt — đề xuất tách biệt khỏi Retry Limit ở mục 5 (đây là lỗi *chất lượng input*, không phải *chưa đủ thông tin*) |

**`BLOCKED` không phải lỗi hệ thống** — đây là 1 state hợp lệ trong vòng đời, không phải Exception/Error (phân biệt rõ với Error Contract — xem `CanonicalOutputContract.md` mục 4). `BLOCKED` nghĩa là "không có đủ tín hiệu hữu ích, không phải lỗi xử lý."

**Thoát `BLOCKED`:** chỉ qua `BLOCKED → DISCOVERY` khi Learner cung cấp input mới có thể dùng được (không tự động retry vô hạn) — **không có transition `BLOCKED → DISCOVERY_COMPLETE` trực tiếp**, phải quay lại `DISCOVERY` trước.

**🔶 Open — fallback khi Learner không bao giờ quay lại `BLOCKED`:** chưa thiết kế (ví dụ: có cần 1 cơ chế Roadmap mặc định/generic để không chặn hoàn toàn trải nghiệm? Ngoài phạm vi Phase 1, đề xuất Backlog).

## 8. `DISCOVERY_COMPLETE` Conditions (tổng hợp)

```
DISCOVERY_COMPLETE khi:
  M1 (goal_snapshot tồn tại)
  AND (M2 nếu onboarding HOẶC M2' nếu continuous)
  -- không yêu cầu ngưỡng confidence tối thiểu (mục 3, 6)
```

**Cập nhật chéo bắt buộc tới [DiscoveryStateMachine.md](DiscoveryStateMachine.md) mục 4:** nội dung "🔶 OPEN" ở đó nên được thay bằng tham chiếu tới tài liệu này — đề xuất, chưa tự sửa file đó trong lượt này (xem báo cáo Generated Documents kèm theo cho việc cập nhật chéo nhẹ đã thực hiện).

## 9. Risks

1. **`claimed_skill_area` là khái niệm mới, chưa có chỗ bền vững (mục 4)** — chỉ tồn tại trong phạm vi 1 `DiscoverySession`/1 lời gọi Goal Clarifier, có thể cần entity riêng nếu Continuous Discovery cần tham chiếu lại.
2. **Trần tổng Retry Limit (mục 5) chỉ có công thức, không có số N cụ thể** cho giới hạn-trong-signal (đã đề xuất 3 ở tài liệu khác) — cần Founder xác nhận số trần toàn phiên.
3. **Ngưỡng "raw_input không dùng được liên tiếp" cho `BLOCKED` (mục 7) hoàn toàn chưa có số** — đề xuất tách biệt khỏi Retry Limit nhưng chưa định lượng.
4. **`BLOCKED` không có lối thoát nếu Learner không quay lại** — chưa thiết kế fallback, ngoài phạm vi Phase 1.
5. **2 lớp Retry (trong-signal vs toàn-phiên) cần kiểm tra tính nhất quán với [SelfAssessmentMismatchMechanism.md](SelfAssessmentMismatchMechanism.md) mục 3** — đã đối chiếu ở đây, nhưng chưa kiểm tra implementation-level (ngoài phạm vi Design Phase).
