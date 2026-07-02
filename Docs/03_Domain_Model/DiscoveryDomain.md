# Discovery Domain

> Phase 1 Build — Discovery Engine. Theo [DECISION-007-Discovery-Engine](../11_Decisions/DECISION-007-Discovery-Engine.md) (Capability), [CoreDomainMap.md](CoreDomainMap.md) mục Core Domain #6 (Discovery — thẩm quyền cao nhất cho Aggregate Root/quan hệ liên-domain), [DECISION-048-All-AI-Decisions-Must-Be-Explainable](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (D7 — Discovery tự explainable).
>
> **Trạng thái: Draft — đề xuất thiết kế (Co-Architect), chưa phải Decision khóa.** Không sửa/không mâu thuẫn [CoreDomainMap.md](CoreDomainMap.md) — chỉ **chi tiết hóa** 2 entity đã khóa ở đó (`DiscoverySession`, `SelfAssessmentMismatch`) thành đầy đủ Aggregate, theo đúng mẫu đã dùng cho [LearningSessionDomain.md](LearningSessionDomain.md)/[AssessmentDomain.md](AssessmentDomain.md). Mọi entity mới ở tài liệu này (`DiscoveryQuestion`, `DiscoveryAnswer`, `CompetencySignal`) là **Supporting Persistence Entity** trong Aggregate `DiscoverySession` — cùng phân loại đã dùng cho `learning_session_transition` ([DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)), không phải Core Domain Entity mới, không cần mở khóa CoreDomainMap.

## 1. Responsibilities

1. **Goal Clarification** (Capability #1, [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 2) — hỏi làm rõ mục tiêu thật của Learner, tạo `DiscoverySession`.
2. **Competency Probing** (Capability #2) — đánh giá trình độ thực tế, không dựa thuần tự khai; sinh `CompetencySignal` và, khi phát hiện sai lệch, `SelfAssessmentMismatch`.
3. **Continuous Discovery** (Capability #8) — tiếp tục đánh giá goal/trình độ trong lúc học, ngoài onboarding — tạo `DiscoverySession` mới (không tái sử dụng session cũ, theo mô tả Capability #8 đã khóa).
4. **Tự explainable cho SelfAssessmentMismatch** (D7, DECISION-048) — Discovery không chỉ là điểm đến `traced_to[]` cho Recommendation, mà bản thân quyết định "đây là mismatch" cũng phải truy vết được tới dữ liệu cụ thể đã dùng (self-assessment input + Evidence/AssessmentResult lịch sử).

## 2. Boundaries

| Discovery ĐƯỢC làm | Discovery KHÔNG được làm |
|---|---|
| Đọc `Goal` hiện tại (Goal & Roadmap Domain), đọc `AssessmentResult`/`Evidence` lịch sử (Assessment/Evidence Domain) để so sánh tự-đánh-giá vs thực tế | Ghi/sửa `Goal`, `AssessmentResult`, `Evidence`, `KnowledgeNodeMastery` — chỉ đọc |
| Ghi vào chính nó (`DiscoverySession`, `DiscoveryQuestion`, `DiscoveryAnswer`, `CompetencySignal`, `SelfAssessmentMismatch`) | Tự tạo `Roadmap`/`RoadmapNode` — output của Discovery chỉ là input cho Roadmap Engine, không tự chuyển tiếp (xem [DiscoveryStateMachine.md](DiscoveryStateMachine.md) — cấm chuyển trạng thái sang `ROADMAP`) |
| Phát Domain Event `SelfAssessmentMismatchDetected` khi phát hiện sai lệch (đã khóa ở [CoreDomainMap.md](CoreDomainMap.md) mục Domain Event, tiêu thụ bởi Assessment + Recommendation) | Tự quyết định AI có "tự điều chỉnh độ khó ngay" hay không khi phát hiện mismatch — ranh giới này vẫn **🔶 OPEN** ([OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 5, đoạn 2) |
| Tổng hợp `competency_profile` từ các `CompetencySignal` trong cùng `DiscoverySession` để trả về Output Envelope | Tự xác nhận/đóng dấu "competency_profile" là Mastery chính thức — đó là việc của Assessment Domain (`KnowledgeNodeMastery`), Discovery chỉ cung cấp tín hiệu đầu vào, không ghi đè |

Discovery là domain ngang hàng với Goal & Roadmap/Knowledge Graph/Evidence/Assessment/Recommendation/Learning Session — không thuộc domain nào trong số đó, đúng theo [CoreDomainMap.md](CoreDomainMap.md) mục 1.

## 3. Aggregate Root

**`DiscoverySession`** — 1 phiên Discovery (onboarding hoặc Continuous Discovery giữa chừng), gắn với 1 `Learner` và (nếu đã có) 1 `Goal` đang được làm rõ.

| Thuộc tính | Ý nghĩa |
|---|---|
| `learner_id` | Tham chiếu Learner (Identity Domain, đọc) |
| `goal_id` | Tham chiếu Goal đang làm rõ — **nullable**: rỗng khi đây là phiên Goal Clarification *đầu tiên* (chưa có Goal nào để gắn), có giá trị khi là Continuous Discovery trên 1 Goal đã tồn tại |
| `trigger` | `onboarding` \| `continuous` — phân biệt Capability #1 (Goal Clarification, lần đầu) vs Capability #8 (Continuous Discovery, giữa quá trình học) |
| `state` | Trạng thái vòng đời — 6 giá trị, xem [DiscoveryLifecycle.md](DiscoveryLifecycle.md) *(cập nhật lượt 3 — trước đây 3, rồi 4 ở lượt 2)* |
| `claimed_skill_areas[]` | 0..n `ClaimedSkillArea` — con trong cùng Aggregate *(mới, lượt 4)* |
| `questions[]` | 0..n `DiscoveryQuestion` — con trong cùng Aggregate |
| `competency_signals[]` | 0..n `CompetencySignal` — con trong cùng Aggregate |
| `mismatches[]` | 0..n `SelfAssessmentMismatch` — con trong cùng Aggregate (đã khóa ở CoreDomainMap, giữ nguyên quan hệ "Mismatch sinh trong bối cảnh 1 phiên") |
| `started_at` / `completed_at` | Mốc thời gian vòng đời |
| `archived_at` / `superseded_by_discovery_session_id` | Trục riêng, không phải `state` — xem [DiscoveryLifecycle.md](DiscoveryLifecycle.md) mục 5 (locked by DECISION-054) |

**`ClaimedSkillArea`** *(Supporting Entity, con trong Aggregate, mới)* — 1 kỹ năng/chủ đề được làm rõ từ phát biểu Goal.

| Thuộc tính | Ý nghĩa |
|---|---|
| `claimed_skill_area_id` | Định danh thực thể (PK) |
| `discovery_session_id` | Aggregate cha (FK) |
| `label` | Tên kỹ năng dạng text tự do (Value Object) |
| `created_at` | Thời điểm tạo |
| `source_answer_ids[]` | Junction tới `DiscoveryAnswer` dùng để trích xuất ra skill area này |

**`DiscoveryQuestion`** *(Supporting Entity, con trong Aggregate)* — 1 câu hỏi AI đã hỏi trong phiên (phục vụ Goal Clarification và Competency Probing).

| Thuộc tính | Ý nghĩa |
|---|---|
| `discovery_session_id` | Aggregate cha |
| `capability_source` | `goal_clarification` \| `competency_probing` — câu hỏi này phục vụ capability nào (2 capability dùng chung 1 session nhưng câu hỏi có mục đích khác nhau) |
| `prompt_text` | Nội dung câu hỏi đã hiển thị cho Learner |
| `asked_at` | Thời điểm hỏi |

**`DiscoveryAnswer`** *(Supporting Entity, con trong Aggregate)* — câu trả lời/raw input của Learner cho 1 `DiscoveryQuestion`. 1–1 với `DiscoveryQuestion` (mỗi câu hỏi tối đa 1 câu trả lời hiện hành — sửa câu trả lời tạo bản ghi mới, không update tại chỗ, giữ nguyên tinh thần append-only đã dùng cho Evidence/AssessmentResult).

| Thuộc tính | Ý nghĩa |
|---|---|
| `discovery_question_id` | Câu hỏi được trả lời |
| `raw_input` | Nội dung trả lời thô của Learner (text tự do) |
| `answered_at` | Thời điểm trả lời |

**`CompetencySignal`** *(Supporting Entity, con trong Aggregate)* — 1 tín hiệu về trình độ thực tế của Learner cho 1 `ClaimedSkillArea` cụ thể, rút ra từ 1 hoặc nhiều `DiscoveryAnswer` (Competency Probing, Capability #2).

| Thuộc tính | Ý nghĩa |
|---|---|
| `discovery_session_id` | Aggregate cha |
| `claimed_skill_area_id` | Tham chiếu tới `ClaimedSkillArea` được probe (**NOT NULL** — locked by DECISION-055) |
| `self_reported_level` | Mức Learner tự nhận — `Unknown/Remember/Explain/Apply/Teach` (locked by DECISION-051) |
| `observed_level` | Mức AI quan sát được qua câu trả lời/hành vi — cùng kiểu dữ liệu với `self_reported_level` để so sánh được |
| `source_answer_ids[]` | `DiscoveryAnswer` nào được dùng để suy ra tín hiệu này — phục vụ `traced_to[]` (D7, DECISION-048) |

**`SelfAssessmentMismatch`** *(đã khóa tên ở [CoreDomainMap.md](CoreDomainMap.md))* — sai lệch giữa `self_reported_level` và `observed_level` của 1 `CompetencySignal`.

| Thuộc tính | Ý nghĩa |
|---|---|
| `discovery_session_id` | Aggregate cha |
| `competency_signal_id` | Tín hiệu sinh ra mismatch này |
| `knowledge_node_id` | FK trỏ sang Knowledge Graph — **nullable**: mapping được cập nhật sau onboarding thông qua table junction `claimed_skill_area_knowledge_node` (locked by DECISION-055) |
| `verification_method` | Cơ chế xác minh — `"Calibrated Micro-Probe"` (locked by DECISION-051) |
| `reasoning` | Lý do AI kết luận đây là mismatch — hiển thị được cho Learner (Explainability First) |
| `detected_at` | Thời điểm phát hiện — append-only, không sửa sau khi ghi (giống Evidence/AssessmentResult) |

## 4. Relationships (đối chiếu [CoreDomainMap.md](CoreDomainMap.md) mục Relationship)

| Quan hệ | Loại | Ghi chú |
|---|---|---|
| `Learner` 1 — * `DiscoverySession` | Tham chiếu, đọc | Discovery không sở hữu Learner |
| `Goal` 0..1 — * `DiscoverySession` | Tham chiếu, đọc | `goal_id` nullable — xem mục 3 |
| `DiscoverySession` 1 — * `ClaimedSkillArea` | Sở hữu (cùng Aggregate) | |
| `DiscoverySession` 1 — * `DiscoveryQuestion` | Sở hữu (cùng Aggregate) | |
| `DiscoveryQuestion` 1 — 0..1 `DiscoveryAnswer` | Sở hữu (cùng Aggregate) | |
| `DiscoverySession` 1 — * `CompetencySignal` | Sở hữu (cùng Aggregate) | |
| `CompetencySignal` 1 — 0..1 `SelfAssessmentMismatch` | Sở hữu (cùng Aggregate) | 1 signal sinh tối đa 1 mismatch hiện hành |
| `ClaimedSkillArea` * — * `KnowledgeNode` | Bảng nối (M:N) | Đi qua `claimed_skill_area_knowledge_node` (ngoài domain Discovery, locked by DECISION-055) |
| `DiscoverySession` → Assessment, Recommendation (qua `SelfAssessmentMismatchDetected`) | Domain Event | Đã khóa ở CoreDomainMap mục Domain Event |

## 5. Domain Events

| Event | Phát bởi | Tiêu thụ bởi |
|---|---|---|
| `DiscoverySessionStarted` | Discovery | Learning Session (cập nhật tiến trình hiển thị "Learner đang ở Discovery") |
| `DiscoverySessionCompleted` | Discovery | Roadmap Engine (đọc kết quả để đề xuất Roadmap — **không tự động trigger**, chỉ là tín hiệu sẵn sàng) |
| `SelfAssessmentMismatchDetected` | Discovery | Assessment, Recommendation *(đã khóa, [CoreDomainMap.md](CoreDomainMap.md) mục Domain Event)* |

## 6. Risks (Open, chưa chặn thiết kế nhưng cần ghi nhận)

1. **`verification_method` và cơ chế mismatch đã đóng** — Quyết định chính thức chốt tại DECISION-051.
2. **`DiscoveryAnswer.raw_input` không có cấu trúc** — text tự do có thể không đủ để Competency Probing suy luận đáng tin cậy; có thể cần structured input (multiple choice, code snippet, v.v.) tùy capability — chưa được Founder/Lead Architect xác nhận hình thức.
3. **Cơ chế mapping sang Knowledge Graph đã đóng** — Sử dụng bảng junction ngoài `claimed_skill_area_knowledge_node` để mapping dần sau khi KG được sinh, giải quyết rủi ro kẹt onboarding (locked by DECISION-055).
4. **`SelfAssessmentMismatch` 1–1 vay mượn giả định từ `CompetencySignal`** — 1 signal chỉ sinh tối đa 1 mismatch tại một thời điểm trong session.
5. **Đa phiên hoạt động đồng thời đã đóng** — Giới hạn 1 active session/Goal, giải quyết bởi concurrency policy (locked by DECISION-054).

## 7. Quyết định tham chiếu

- [DECISION-051-Self-Assessment-Mismatch-Mechanism.md](../11_Decisions/DECISION-051-Self-Assessment-Mismatch-Mechanism.md) (OQ5)
- [DECISION-052-Teach-Capability-Composite-Weighting.md](../11_Decisions/DECISION-052-Teach-Capability-Composite-Weighting.md) (OQ12)
- [DECISION-053-Evidence-Weighting-and-Knowledge-Regression.md](../11_Decisions/DECISION-053-Evidence-Weighting-and-Knowledge-Regression.md) (OQ13)
- [DECISION-054-Discovery-Session-Concurrency-Policy.md](../11_Decisions/DECISION-054-Discovery-Session-Concurrency-Policy.md)
- [DECISION-055-Discovery-Schema-Reconciliation.md](../11_Decisions/DECISION-055-Discovery-Schema-Reconciliation.md)

