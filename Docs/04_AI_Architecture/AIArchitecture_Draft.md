# AI Architecture Draft — AI Mentor OS

> Trạng thái: Draft, ở mức nguyên tắc/capability — chưa chọn provider/model/framework cụ thể. Chờ định hướng chính thức từ ChatGPT (Lead Architect); tài liệu này là điểm khởi đầu để đối chiếu, không phải quyết định cuối.

## 1. Nguyên tắc kiến trúc

- **Một thực thể Mentor AI duy nhất**, chuyển đổi hành vi theo Learning Mode (A/B/C/D) và theo Capability đang gọi — không phải nhiều bot/agent tách biệt. Lý do: User Memory và Knowledge Graph cần tính liên tục xuyên suốt; nếu tách nhiều AI riêng theo từng màn hình, ngữ cảnh cá nhân hóa sẽ bị gãy.
- **AI không có quyền viết trực tiếp vào Roadmap structure** — mọi capability liên quan roadmap chỉ tạo **đề xuất**, không tự commit thay đổi (thực thi nguyên tắc Roadmap Governance ở tầng AI, khớp với `ApprovalRecord` trong Domain Model).
- **Context nạp theo nhu cầu (just-in-time)**, không nạp toàn bộ Knowledge Graph/User Memory cho mọi lời gọi — tránh chi phí token tăng vô tội vạ, đồng thời giảm rủi ro AI trả lời dựa trên thông tin không liên quan tới câu hỏi hiện tại.
- **Explainability First** *(mới, Round 4 — [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md))*: mọi capability tạo ra thay đổi Mastery, Recommendation, hoặc Knowledge Expansion phải trả về tham chiếu truy vết được (`traced_to[]` — ID Evidence/AssessmentResult/DiscoverySession cụ thể), không chỉ text `reasoning` tự do. Không có capability nào được phép thay đổi 3 nhóm trên mà không có nguồn truy vết — "không có quyết định hộp đen".
- **Learning Session là tầng điều phối, không phải capability** *(mới, Round 5 — [DECISION-028](../11_Decisions/DECISION-028-Learning-Session-Domain.md))*: mọi capability dưới đây chạy *trong phạm vi* 1 `LearningSession`/`SubSession` đang active — Learning Session theo dõi tiến trình, không tự thực thi hay thay thế bất kỳ capability nào. Capability vẫn ghi dữ liệu trực tiếp vào domain của chúng (Evidence, Assessment, Knowledge...) như trước; Learning Session chỉ lắng nghe Domain Event để cập nhật trạng thái vòng đời.

## 2. Capability (năng lực AI, không gọi là "Agent")

| # | Capability | Mô tả | Ghi/Sửa dữ liệu gì |
|---|---|---|---|
| 1 | Goal Clarification | Hỏi làm rõ mục tiêu trong Discovery | Tạo DiscoverySession |
| 2 | Competency Probing | Đánh giá trình độ thực tế, không dựa thuần tự khai | Tạo SelfAssessmentMismatch (nếu có) |
| 3 | Roadmap Proposal | Đề xuất cấu trúc Roadmap (mới hoặc mở rộng nhánh) | Không tự commit — chờ ApprovalRecord |
| 4 | Teaching | Giảng dạy 1 KnowledgeNode theo Mode đang active *(đổi tên Round 3: Concept→KnowledgeNode, DECISION-024)* | Tạo Evidence cho KnowledgeNodeMastery |
| 5 | Understanding Verification *(ranh giới rõ lại, Round 4 — thuộc Assessment Domain, [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md))* | Kiểm tra hiểu thực sự (Mode B+); nhận Evidence từ Evidence Management, đánh giá, sinh `AssessmentResult` | Cập nhật KnowledgeNodeMastery (Explain/Apply: đạt/chưa đạt; Teach: weighted score); tạo `AssessmentResult` truy vết được — *Round 5, [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md)*: bắt buộc 8 trường (KnowledgeNode/Remember/Explain/Apply/Teach/Confidence/Evidence References/Reasoning), không Pass/Fail hay điểm số đơn thuần |
| 6 | Socratic Guidance | Dẫn dắt bằng câu hỏi, không trả lời trực tiếp (Mode C) | Tạo Evidence |
| 7 | Stuck Detection & Support | Phát hiện Learner bế tắc, chủ động hỗ trợ | 🔶 cơ chế cụ thể OPEN (Gap 4) |
| 8 | Continuous Discovery | Tiếp tục đánh giá goal/trình độ trong lúc học | Tạo DiscoverySession mới |
| 9 | Roadmap Critique | Phản biện lựa chọn của Learner, không ép buộc | Không sửa dữ liệu — chỉ output cảnh báo có lý do |
| 10 | Knowledge Profile Synthesis | Tổng hợp LearningProfile thành ngôn ngữ tự nhiên cho Learner xem | Đọc, không ghi (LearningProfile là view tính toán) |
| 11 | Evidence Management *(thu hẹp phạm vi, Round 4)* | Thu thập, phân loại theo `EvidenceLink` (support/refute), liên kết Evidence với KnowledgeNode | Tạo Evidence + EvidenceLink (kèm evidence_weight) — **không còn tự phát sinh Knowledge Regression** (chuyển sang Capability #5/Assessment Domain, Round 4) |
| 12 | Knowledge Node Expansion | Quyết định mở rộng 1 KnowledgeNode thành node con/cạnh mới trong DAG (*đổi Round 4: multi-parent, multi relation-type, [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md)*) — 2 tier: Local / Deep-Structural | Thêm `KnowledgeEdge` mới (đổi tên từ Expansion Edge); nếu Deep/Structural → bắt buộc `ExpansionRecord`; nếu Local → log lý do nội bộ truy vết được (Explainability First) |
| 13 | Recommendation | Tổng hợp tín hiệu (Knowledge Regression, SelfAssessmentMismatch, dependency gaps) thành gợi ý hành động | Tạo `RecommendationProposal` kèm `traced_to[]` bắt buộc (*Round 4*) — không tự thực thi, giao lại cho Teaching/Roadmap Critique |

🔶 OPEN — Capability cho UC6 (Debug/Bế tắc): liệu AI có capability "Direct Fix" hay chỉ "Hint Escalation" — phụ thuộc câu trả lời [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 6. Bảng trên tạm đặt tên trung tính "Stuck Detection & Support" để không giả định trước.

✅ *(đóng, Round 3)* Capability #12 (Knowledge Node Expansion) giờ có ranh giới rõ — xem mục 3, đã cập nhật.

> Nguồn: [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md), [DECISION-016](../11_Decisions/DECISION-016-Evidence-Based-Decay.md), [DECISION-019..027](../11_Decisions/) (Round 3-4). Chi tiết engine: [AI/KnowledgeEngine/](../../AI/KnowledgeEngine/KnowledgeEngine.md), [AI/EvidenceEngine/](../../AI/EvidenceEngine/EvidenceEngine.md), [AI/RecommendationEngine/](../../AI/RecommendationEngine/README.md), Assessment Engine → [Docs/03_Domain_Model/AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md).

## 3. Ranh giới kiểm soát con người (Human Control Boundaries)

| Mức | Hành động |
|---|---|
| AI tự làm, không cần xác nhận **nhưng phải truy vết được nội bộ** *(Explainability First áp dụng lên mọi dòng trong bảng này, Round 4)* | Điều chỉnh độ khó/tốc độ gợi ý trong 1 Lesson (Gap 1), chọn câu hỏi verify, tổng hợp LearningProfile để hiển thị, tạo/phân loại Evidence (EvidenceLink support/refute), **Knowledge Node Expansion loại Local** (DECISION-023 — log lý do nội bộ bắt buộc, DECISION-027), tạo `RecommendationProposal` (chỉ đề xuất, không thực thi, kèm `traced_to[]` bắt buộc) |
| AI tự làm nhưng phải minh bạch (lý do hiển thị bắt buộc cho Learner) | **Knowledge Node Expansion loại Deep/Structural** — không cần phê duyệt trước, nhưng bắt buộc `expansion_reason` hiển thị (DECISION-023) |
| AI đề xuất, cần Learner xác nhận | Thêm/bớt/đổi thứ tự RoadmapNode, đổi Goal, đánh dấu 1 KnowledgeNode là "mastered" ở mức Teach |
| AI tuyệt đối không được làm | Tự sửa Roadmap structure mà không có ApprovalRecord; tự đổi Goal của Learner; ghi đè SelfAssessmentMismatch/Evidence/AssessmentResult đã ghi nhận (chỉ thêm mới — immutable log); Recommendation Engine tự thực thi gợi ý của chính nó (DECISION-019); **bất kỳ thay đổi Mastery/Recommendation/Expansion nào thiếu `traced_to[]`** (*mới, Round 4, DECISION-027 — "không có quyết định hộp đen"*); Evidence Engine tự quyết định Knowledge Regression (việc này thuộc Assessment Engine, Round 4) |

## 4. Context System (nạp ngữ cảnh theo Capability)

| Capability | Luôn nạp | Nạp theo điều kiện | Không nạp |
|---|---|---|---|
| Teaching | KnowledgeNode đang dạy, KnowledgeNodeMastery hiện tại của Learner cho node đó | Lesson/Evidence liên quan nếu Learner hỏi lại điều cũ | Toàn bộ Knowledge Graph, toàn bộ Roadmap |
| Roadmap Proposal | Goal hiện tại, nhánh Roadmap đang mở | KnowledgeNodeMastery của các KnowledgeNode liên quan tới nhánh sắp mở | LearningProfile đầy đủ |
| Roadmap Critique | Goal, lựa chọn Learner vừa đưa ra | Lịch sử SelfAssessmentMismatch liên quan | — |
| Knowledge Profile Synthesis | Toàn bộ KnowledgeNodeMastery của Learner (đây là capability duy nhất được phép nạp rộng, vì mục đích của nó chính là tổng hợp toàn cảnh) | — | — |
| Evidence Management | Nội dung tương tác vừa xảy ra (câu trả lời/bài nộp), KnowledgeNode liên quan đã biết trước | — | KnowledgeNodeMastery (*đổi Round 4 — không còn cần nạp để so sánh, vì Evidence Management không tự quyết định Regression nữa*), toàn bộ Knowledge Graph |
| Understanding Verification *(Assessment Domain, mục Context bổ sung Round 4)* | Evidence/EvidenceLink vừa được tạo, KnowledgeNodeMastery hiện tại của Learner cho node liên quan | — | Toàn bộ Knowledge Graph, toàn bộ Roadmap |
| Knowledge Node Expansion | KnowledgeNode cha đang xét, lý do cần mở rộng | Node/cạnh tương tự đã tồn tại ở nhánh khác (tránh trùng node trong DAG, *Round 4*); để phân loại Local/Deep cần biết RoadmapNode đang active của Learner | LearningProfile, Roadmap |
| Recommendation | KnowledgeRegressionDetected/SelfAssessmentMismatchDetected gần nhất (kèm `traced_to[]`, *Round 4*) | Lịch sử RecommendationProposal đã đưa ra (tránh lặp gợi ý) | Toàn bộ Knowledge Graph, toàn bộ Roadmap (chỉ phần liên quan tín hiệu) |

## 5. Tín hiệu kích hoạt Stuck Detection (đề xuất, chờ xác nhận)

🔶 OPEN toàn mục — phụ thuộc [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 6 và [RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 4. Đề xuất sơ bộ để ChatGPT/Founder phản biện, không phải quyết định:
- Số lần submit sai liên tiếp trên cùng 1 KnowledgeNode vượt ngưỡng.
- Thời gian không có hành động tích cực trong 1 MentorSession vượt ngưỡng.
- Learner lặp lại câu hỏi ngữ nghĩa tương tự ≥ N lần.

## 6. Việc cần ChatGPT (Lead Architect) quyết định tiếp

- Chọn mô hình runtime AI (single provider/multi-provider, tách riêng AI Runtime khỏi Backend Core hay không).
- Cơ chế triển khai cụ thể cho "một thực thể Mentor AI duy nhất" — session model, state management.
- Quyết định kiến trúc cho Gap 1 (Roadmap Structure vs Learning Parameters) ở mức implementation, không chỉ mức nguyên tắc.
- ✅ ~~Phân loại ranh giới kiểm soát Knowledge Node Expansion~~ → đóng bởi DECISION-023 (Round 3); tiêu chí Local/Deep chi tiết vẫn cần duyệt.
- ✅ ~~Ngưỡng Negative Evidence cho Regression~~ → đóng bởi DECISION-021 (Round 3, dựa Evidence Weight); công thức weight cụ thể vẫn 🔶 OPEN.
- ✅ ~~1 Evidence gắn nhiều Knowledge Node?~~ → đóng bởi DECISION-022 (Round 3, xác nhận Many-to-Many qua EvidenceLink).
- *(mới, Round 3)* `capability_weight` cho 5 sub-capability của Teach (DECISION-020).
- *(mới, Round 3)* `evidence_weight` — kiểu dữ liệu, công thức, ai gán (DECISION-021).
- *(mới, Round 3)* Tiêu chí Controlled Expansion (Local vs Deep/Structural) cần duyệt chi tiết (DECISION-023).
- *(mới, Round 3)* Field `type` cấp Evidence (Positive/Negative tổng quát) còn cần giữ không, hay chỉ còn `direction` per-EvidenceLink?
- ✅ ~~Cây hay DAG?~~ → đóng bởi DECISION-025 (Round 4, DAG).
- ✅ ~~Assessment Engine thuộc Core Domain nào?~~ → đóng bởi DECISION-026 (Round 4, domain độc lập).
- *(mới, Round 4)* Danh sách `relation_type` đầy đủ cho `KnowledgeEdge` (đề xuất khởi điểm: `expands_to`/`prerequisite_of`/`related_to`).
- ✅ ~~Cơ chế cycle detection cụ thể~~ → đóng bởi DECISION-029 (Round 5, Runtime Reachability Check, không closure table ở v1).
- *(kế thừa Round 4, thu hẹp Round 5)* `AssessmentResult` granularity (per-Evidence hay per-EvidenceLink) — DECISION-030 (Round 5) đã chốt nội dung mỗi record (8 trường), cardinality vẫn open.
- *(mới, Round 5)* `SubSession` (Learning Session Domain) — quan hệ cụ thể với `MentorSession` (Mentor Interaction) cần làm rõ trước khi Context System mục 4 có thể mô tả luồng nạp ngữ cảnh xuyên Sub Session.
- *(mới, Round 5)* Ngưỡng tự động Pause cho `LearningSession` — khác Stuck Detection (mục 5), cần công thức/ngưỡng riêng.
