# Discovery Prompt Architecture (Draft)

> Phase 1 Build — Discovery Engine. Contract đầu vào/ra cho 3 lời gọi AI bên trong Discovery — **KHÔNG phải prompt engineering** (chưa quyết định wording/system prompt cụ thể), đúng tinh thần [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md). Đây là **chi tiết hóa** 3 dòng đã có trong bảng Input/Output Contract chung (Goal Clarification, Competency Probing) + 1 dòng mới (Mismatch Detector, theo D7/DECISION-048) — không mâu thuẫn, chỉ mở rộng chi tiết hơn mức "tối thiểu" đã liệt kê ở đó.

## 1. Quan hệ với Output Envelope chung

Mỗi prompt dưới đây trả về **Output Envelope chung** ([PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 1: `capability/result/requires_confirmation/reasoning/traced_to`) — không phải envelope tầng API/Session (`goal_snapshot/competency_profile/mismatch_signals/confidence/reasoning/traced_to/next_step`) ở [DiscoveryAPIContract.md](../07_API/DiscoveryAPIContract.md) mục 1. Lớp Application (Backend) gọi 1-3 prompt dưới đây trong 1 lượt `POST /api/discovery/answer`, rồi gộp kết quả thành envelope tầng API (xem [DiscoveryAPIContract.md](../07_API/DiscoveryAPIContract.md) mục 5).

## 2. Goal Clarifier Prompt

Capability: **Goal Clarification** (#1). Input/Output tối thiểu đã khóa ở [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 2-3 — chi tiết hóa dưới đây.

### Input Contract

| Trường | Bắt buộc | Nguồn |
|---|---|---|
| `learner_raw_input` | Có | `DiscoveryAnswer.raw_input` mới nhất (nếu đây là câu hỏi tiếp theo trong cùng session) |
| `question_history[]` | Có | `DiscoveryQuestion[]` + `DiscoveryAnswer[]` đã có trong `DiscoverySession` hiện tại — tránh hỏi lặp (đúng quy tắc dùng chung ở [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 4) |
| `existing_goal` | Có điều kiện | `Goal` cũ — chỉ nạp khi `DiscoverySession.trigger = 'continuous'` và đang làm rõ thêm Goal đã tồn tại |

### Output Contract

| Trường | Kiểu | Cấm tuyệt đối |
|---|---|---|
| `result.next_question` | string, nullable | — |
| `result.clarified_goal` | object, nullable | Chỉ có giá trị khi AI cho rằng Goal đã đủ rõ — **không tự tạo `Goal` entity**, chỉ trả về nội dung đề xuất cho Application Layer ghi (Discovery không sở hữu `Goal`, xem [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) mục 2) |
| `requires_confirmation` | boolean | Luôn `true` khi `clarified_goal` không null — đổi Goal cần Learner xác nhận (Human Control Boundary, [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 3) |
| `reasoning` | string | — |
| `traced_to` | array | Có thể rỗng — Goal Clarification không thay đổi Mastery/Recommendation/Knowledge Expansion, không thuộc 3 nhóm bắt buộc `traced_to[]` không-rỗng ở DECISION-027 gốc. **Không tự sinh Roadmap trong cùng lượt gọi** (đã khóa ở [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 3) |

## 3. Competency Probe Prompt

Capability: **Competency Probing** (#2).

### Input Contract

| Trường | Bắt buộc | Nguồn |
|---|---|---|
| `claimed_skill_area_id` | Có | ID của `ClaimedSkillArea` được probe (locked by DECISION-055) |
| `learner_self_reported_level` | Có | Phần Learner tự khai trong `raw_input` |
| `learner_raw_input` | Có | `DiscoveryAnswer.raw_input` — câu trả lời/hành vi quan sát được |
| `existing_mastery` | Có điều kiện | `KnowledgeNodeMastery` hiện tại, nếu đã có dữ liệu trước đó (theo [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 2 — chỉ đọc, Discovery không ghi Mastery) |

### Output Contract

| Trường | Kiểu | Cấm tuyệt đối |
|---|---|---|
| `result.assessed_level` | string | Cùng thang đo với `self_reported_level` (locked by DECISION-051) |
| `result.mismatch_detected` | boolean + lý do | Không tự sửa `KnowledgeNodeMastery` — chỉ đề xuất tín hiệu (đã khóa ở [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 3) |
| `traced_to` | array | Rỗng hợp lệ ở bước này — `CompetencySignal` tự nó không nằm trong 3 nhóm bắt buộc `traced_to[]` gốc (Mastery/Recommendation/Knowledge Expansion); chỉ **Mismatch Detector** (mục 4) mới bắt buộc `traced_to[]` không rỗng (D7, DECISION-048, mở rộng phạm vi) |

## 4. Mismatch Detector Prompt

Capability: **Self-Assessment Mismatch Detection** (D7, [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md)). Tách thành 1 prompt riêng biệt để đảm bảo tính tự giải thích (locked by DECISION-051).

### Input Contract

| Trường | Bắt buộc | Nguồn |
|---|---|---|
| `competency_signal` | Có | `CompetencySignal` vừa tạo (`self_reported_level` + `observed_level`) |
| `self_assessment_input_source` | Có | Trích xuất từ `claimed_skill_area` thông qua `claimed_skill_area_source_answer` (locked by DECISION-055) |
| `assessment_history` | Có điều kiện | `AssessmentResult`/`Evidence` lịch sử cho cùng `knowledge_node_id` (nếu đã được map, FK có thể nullable, locked by DECISION-055) |

### Output Contract

| Trường | Kiểu | Cấm tuyệt đối |
|---|---|---|
| `result.mismatch_found` | boolean | — |
| `result.verification_method` | string, nullable | Cơ chế xác minh — `"Calibrated Micro-Probe"` (locked by DECISION-051) |
| `reasoning` | string | Bắt buộc, ngôn ngữ Learner hiểu được |
| `traced_to` | array | **Bắt buộc không rỗng nếu `mismatch_found = true`** (D7, DECISION-048) — phải trỏ tới `discovery_answer`/`competency_signal`/`assessment_result` cụ thể đã dùng |
| `requires_confirmation` | boolean | **Chốt là `false`** — việc ghi nhận mismatch là quan sát nội bộ, không thay đổi trực tiếp lộ trình học (locked by DECISION-051) |

## 5. Quy tắc dùng chung (kế thừa, không đổi)

Áp dụng nguyên trạng [PromptArchitecture_Draft.md](PromptArchitecture_Draft.md) mục 4 cho cả 3 prompt trên — không lặp lại nội dung, chỉ nhắc 2 điểm liên quan trực tiếp Discovery:

1. Quy tắc 1 (không tự gọi Capability khác) → Goal Clarifier không tự gọi Roadmap Proposal dù `clarified_goal` đã sẵn sàng.
2. Quy tắc 3 (không tự chọn KnowledgeNode ngoài Context đã nạp) → Competency Probe Prompt không tự suy ra `knowledge_node_id` ngoài Knowledge Graph hiện có — với onboarding lần đầu, dùng `claimed_skill_area_id` dạng text label để probe trước thay vì ID node trực tiếp (locked by DECISION-055).

## 6. Risks

1. **Thang đo levels đã được thống nhất** — Thang đo 5 điểm `Unknown/Remember/Explain/Apply/Teach` được chốt tại DECISION-051.
2. **AI Control boundaries đã khóa** — Ranh giới xác nhận tự động đã khóa với `requires_confirmation = false` cho ghi nhận mismatch (DECISION-051) và Pause/Resume.
3. **Bổ sung 3 dòng Discovery vào bảng Context System** — Ghi nhận để cập nhật chéo vào [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) ở các sprint dọn dẹp sau. (Backlog).
