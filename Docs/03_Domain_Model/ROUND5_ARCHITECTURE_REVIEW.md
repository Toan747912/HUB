# Round 5 Architecture Review — AI Mentor OS

> Trạng thái: Báo cáo (không phải Decision Log). Tổng hợp tác động của DECISION-028/029/030, đối chiếu với blocker đã nêu ở [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md), và đánh giá những gì còn chặn trước khi có thể bắt đầu Database Design thực sự. Không thiết kế Database, không thiết kế API, không thiết kế UI — chỉ Domain Architecture.

## 1. Tóm tắt 3 quyết định Round 5

| Quyết định | Nội dung | Đóng/thu hẹp Open Question nào |
|---|---|---|
| [DECISION-028](../11_Decisions/DECISION-028-Learning-Session-Domain.md) | Learning Session là Core Domain độc lập — Orchestrator kết nối Goal/Roadmap/Knowledge/Evidence/Assessment/Recommendation; không phải chat session; đại diện 1 mục tiêu học tập; có thể chứa Sub Sessions | Không đóng câu cũ, mở thêm câu 22-24 |
| [DECISION-029](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md) | Cycle detection cho Knowledge Graph = Runtime Reachability Check, không Closure Table ở v1 | **Đóng câu 19** — điểm chặn Database Design duy nhất còn lại từ Round 4 |
| [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md) | `AssessmentResult` phải chứa 8 trường cố định (KnowledgeNode/Remember/Explain/Apply/Teach/Confidence/Evidence References/Reasoning) — không Pass/Fail, không điểm số đơn thuần | **Thu hẹp câu 20** (chỉ cardinality còn mở, nội dung đã chốt) |

Cả 3 quyết định đã được phản ánh vào [CoreDomainMap.md](CoreDomainMap.md), [AssessmentDomain.md](AssessmentDomain.md), [LearningSessionDomain.md](LearningSessionDomain.md) (mới), [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md), [Project_Index.md](../Project_Index.md), [KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md).

## 2. Learning Session Lifecycle — phân tích

Vòng đời `LearningSession`: **Started → Active ⇄ Paused → {Completed | Abandoned}** (xem chi tiết State Model trong [LearningSessionDomain.md](LearningSessionDomain.md)).

Điểm cần lưu ý:

- **Completed/Abandoned là terminal — không quay lại Active.** Lựa chọn này giữ tính immutable cho lịch sử tiến trình (nhất quán với Explainability First, DECISION-027) — nếu Learner muốn tiếp tục, đó là 1 `LearningSession` mới. Hệ quả: cần chấp nhận có thể tồn tại nhiều `LearningSession` cho cùng 1 Learner nếu họ quay lại 1 Goal đã Abandoned trước đó — không coi đây là lỗi dữ liệu.
- **Paused chưa có ngưỡng cụ thể** (câu 24) — đây là trạng thái suy ra (derived), không phải do 1 hành động ghi rõ ràng trong mọi trường hợp (trừ khi Learner tự bấm "tạm ngưng"). Tác động: nếu Application Layer cần biết "session này còn Active không" theo thời gian thực mà không có background job tính lại trạng thái, cần quyết định Paused là **trạng thái lưu trữ** (cần job định kỳ cập nhật) hay **trạng thái tính tại thời điểm đọc** (derived, không lưu) — đây là quyết định Application Architecture, không phải Domain Architecture, nhưng đáng ghi chú vì ảnh hưởng có cần thêm cơ chế (cron/worker) hay không khi vào giai đoạn implementation.
- **Sub Session không có Paused riêng** — Pause ở cấp Sub Session được mô hình bằng Ended + Sub Session mới khi resume. Điều này giữ State Model đơn giản (đúng tinh thần "đơn giản trước" đã áp dụng ở DECISION-029) nhưng có thể làm "lịch sử Sub Session" trông rời rạc hơn cảm nhận thực tế của Learner (1 buổi học bị gián đoạn nhìn như nhiều Sub Session) — chấp nhận được ở mức Domain Architecture, cần lưu ý khi thiết kế UI tổng hợp tiến trình sau này.

## 3. Runtime Orchestration Flow

```
Learner chọn/tiếp tục Goal
        │
        ▼
LearningSessionStarted ──▶ LearningSession (Active)
        │
        ├──▶ SubSessionStarted (phạm vi: RoadmapNode/KnowledgeNode hiện tại)
        │         │
        │         ├──▶ MentorSession (Teaching/Socratic/...) ──▶ Evidence Management ──▶ EvidenceRecorded
        │         │                                                                          │
        │         │                                                                          ▼
        │         │                                                              Assessment Domain (đọc Evidence,
        │         │                                                              ghi KnowledgeNodeMastery,
        │         │                                                              sinh AssessmentResult — 8 trường)
        │         │                                                                          │
        │         │                                          ┌───────────────────────────────┴───────────────┐
        │         │                                          ▼                                                ▼
        │         │                              MasteryLevelAchieved/TeachScoreUpdated        KnowledgeRegressionDetected
        │         │                                          │                                                │
        │         │                                          ▼                                                ▼
        │         │                                   Learning Profile (Projection)              Recommendation Domain
        │         │                                                                                            │
        │         └──◀────────── Learning Session lắng nghe các Domain Event trên để cập nhật last_active_at ──┘
        │                        (KHÔNG ghi vào Evidence/Assessment/Recommendation — chỉ đọc/lắng nghe)
        │
        ▼
SubSessionEnded → (lặp lại với Sub Session kế tiếp, hoặc)
        │
        ▼
LearningSessionCompleted / LearningSessionPaused / LearningSessionAbandoned
```

Điểm mấu chốt: **Learning Session không nằm trên đường dẫn ghi dữ liệu nghiệp vụ** (Evidence → Assessment → Mastery/Regression → Recommendation) — nó chạy song song, chỉ lắng nghe Domain Event để duy trì trạng thái vòng đời của chính nó. Điều này giữ đúng nguyên tắc đã chốt ở DECISION-028 (không ghi đè write-ownership) và tránh Learning Session trở thành một "god object" cần biết chi tiết nghiệp vụ của mọi domain khác.

## 4. Aggregate Root Candidates (Round 5, tổng hợp lại)

| Aggregate Root | Domain | Trạng thái |
|---|---|---|
| `LearningSession` (chứa `SubSession[]`) | Learning Session *(mới)* | Candidate rõ — 1 per Learner×Goal đang active, đã có Lifecycle/State Model đầy đủ |
| `AssessmentResult` | Assessment | Nội dung đã chốt (DECISION-030); cardinality (1 vs nhiều per Evidence) vẫn mở — không ảnh hưởng việc nó **là** Aggregate Root độc lập, chỉ ảnh hưởng số lượng instance sinh ra mỗi lượt |
| Tất cả Aggregate Root khác (Round 1-4) | — | Không đổi — xem [CoreDomainMap.md](CoreDomainMap.md) mục 3 |

Không có Aggregate Root nào bị tách/gộp lại ở Round 5 — đây là một bổ sung thuần (Learning Session), không phải tái cấu trúc domain đã có.

## 5. Việc gì đã đủ ổn định để Database Design bắt đầu (cập nhật sau Round 5)

✅ Có thể bắt đầu schema cho các phần này ngay — **bao gồm toàn bộ danh sách ở [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md) mục 5**, cộng thêm:

- `knowledge_edges` ở **mức đầy đủ, không cần bảng closure phụ** — câu 19 (cycle detection) đã đóng bởi DECISION-029, không còn lý do trì hoãn phần này.
- `assessment_results` với **cấu trúc cột đã rõ** — 8 trường cố định theo DECISION-030 (chỉ còn mở câu hỏi 1 row sinh ra trên 1 Evidence hay 1 EvidenceLink, không ảnh hưởng việc các cột đó là gì).
- `learning_sessions` / `sub_sessions` ở mức cột cơ bản — `learner_id`, `goal_id`, `state`, mốc thời gian; quan hệ `sub_sessions.learning_session_id` (1-nhiều, con trong cùng Aggregate).

## 6. Blocker còn lại trước Database Design (Round 5)

🔶 **Không còn blocker cứng nào** ở mức nguyên tắc Domain Architecture — câu 19 (blocker duy nhất còn lại từ Round 4) đã đóng.

🔶 Các điểm sau **không chặn DDL cơ bản**, nhưng nên trả lời trước khi viết Application/Query logic chi tiết cho riêng Learning Session (tương tự cách câu 18/20/21 không chặn DDL ở Round 4):

- **Câu 22** (`SubSession` ↔ `MentorSession`) — ảnh hưởng có cần bảng `sub_sessions` tách riêng hay `sub_sessions` chỉ là 1 cột nhãn (`scope_id`) trên `mentor_sessions`. Đây là điểm có ảnh hưởng **lớn nhất tới số lượng bảng** trong nhóm câu hỏi Round 5 — nên ưu tiên trả lời sớm nếu muốn tránh thiết kế lại.
- **Câu 23** (Goal đổi giữa đường) — ảnh hưởng có cần `previous_session_id`/`reason_for_abandon` trên `learning_sessions` hay không; không ảnh hưởng việc bảng tồn tại.
- **Câu 24** (ngưỡng Paused) — thuần là giá trị cấu hình (constant/config), không ảnh hưởng schema.
- Câu 18, 20 (cardinality), 21 kế thừa từ Round 4 — vẫn ở trạng thái "không chặn DDL, ảnh hưởng Application/Query logic" như đã phân tích ở [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md) mục 6.

## 7. Khuyến nghị (không phải quyết định)

Đề xuất của Claude, chờ Founder/ChatGPT xác nhận: với việc câu 19 đã đóng, **không còn lý do kỹ thuật nào ở tầng Domain Architecture để tiếp tục trì hoãn việc mở khóa Database Design** (DECISION-018) cho phạm vi đã ổn định (mục 5). Việc mở khóa chính thức DECISION-018 vẫn cần Founder xác nhận rõ — đây không phải tự động mở khóa. Nếu Founder quyết định mở khóa, đề xuất thứ tự ưu tiên: (a) bảng không phụ thuộc câu 22 (assessment_results, knowledge_edges, knowledge_nodes, evidence/evidence_links) — làm ngay; (b) `learning_sessions`/`sub_sessions` — chờ câu 22 trả lời để tránh phải đổi cấu trúc bảng ngay sau khi tạo.

## 8. Open Questions mới phát sinh Round 5 (tổng hợp)

| Câu | Nội dung | Mức độ chặn |
|---|---|---|
| 22 | `SubSession` ↔ `MentorSession` — khái niệm mới hay nhóm gắn nhãn? | Không chặn DDL cơ bản khác, nhưng ảnh hưởng lớn tới schema riêng của Learning Session |
| 23 | Goal đổi giữa đường — đổi `goal_id` tại chỗ hay tạo `LearningSession` mới? | Không chặn DDL, ảnh hưởng vài cột |
| 24 | Ngưỡng tự động Pause cho `LearningSession` | Không chặn DDL — giá trị cấu hình |

Chi tiết từng câu: [OpenQuestions.md](../01_PRD/OpenQuestions.md) mục "Round 5".
