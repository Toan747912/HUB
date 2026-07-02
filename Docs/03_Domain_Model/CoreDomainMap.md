# Core Domain Map — AI Mentor OS

> Theo [DECISION-018-Domain-Modeling-Phase](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md). Tổng hợp Round 1-5. Không thiết kế Database/API/UI — chỉ Core Domain Modeling. Đây là lớp tổng hợp có thẩm quyền cao nhất khi khác biệt với `DomainModel_Draft.md`.
>
> **Cập nhật Round 4 (DECISION-025/026/027):** Knowledge Graph chính thức là **DAG** (multi-parent, multi relation-type) — không còn cây. Domain "Mastery & Evidence" (Round 2/3) **tách thành 2 domain riêng**: **Evidence** (chỉ Evidence/EvidenceLink) và **Assessment** (mới — sở hữu `AssessmentResult` và **write-owner của `KnowledgeNodeMastery`**, đổi từ Round 3). **Explainability First**: mọi thay đổi Mastery/Recommendation/Expansion phải truy vết được tới Evidence/Assessment — không có ngoại lệ "black-box".
>
> **Cập nhật Round 5 (DECISION-028/029/030):** Thêm **Learning Session** — Core Domain mới, vai trò **Orchestrator** (đọc/điều phối Goal, Roadmap, Knowledge, Evidence, Assessment, Recommendation cho cùng 1 Learner×Goal; không sở hữu/ghi vào bất kỳ entity nào của 5 domain đó). Cycle detection cho Knowledge Graph chốt là **Runtime Reachability Check** (đóng Open Question #19). `AssessmentResult` chốt phải chứa đủ 8 trường (Remember/Explain/Apply/Teach/Confidence/Evidence References/Reasoning/KnowledgeNode) — không Pass/Fail, không điểm số đơn thuần.
>
> **Cập nhật Round 6 / Pre-Database Review (DECISION-031/032/033):** `SubSession` và `MentorSession` chính thức là 2 entity khác nhau — hierarchy `LearningSession → SubSession → MentorSession` (đóng Open Question #22). **Goal là immutable** — đổi Goal luôn tạo `Goal`+`LearningSession` mới, archive session cũ, không bao giờ mutate Goal hiện có (đóng Open Question #23). **Auto Pause không dùng ngưỡng cố định** — chỉ qua Recommendation Engine đề xuất + Learner xác nhận (đóng Open Question #24). Cả 3 Open Question còn lại của Round 5 đã đóng — xem [PRE_DATABASE_REVIEW.md](PRE_DATABASE_REVIEW.md).

## 1. Core Domains

| # | Domain | Trách nhiệm | Tương ứng AI Engine |
|---|---|---|---|
| 1 | **Identity** | Learner, định danh, phiên | — |
| 2 | **Goal & Roadmap** | Goal, Roadmap, RoadmapNode, ApprovalRecord — lộ trình cá nhân hóa theo Goal | Roadmap Engine |
| 3 | **Knowledge Graph** | KnowledgeNode, `KnowledgeEdge` (DAG, multi-parent, multi relation-type, *đổi tên Round 4 từ "Expansion Edge"*), ExpansionRecord — cấu trúc tri thức dùng chung | Knowledge Engine |
| 4 | **Evidence** *(tách từ "Mastery & Evidence", Round 4)* | Evidence, EvidenceLink — thu thập + phân loại bằng chứng thô (support/refute + weight) | Evidence Engine |
| 5 | **Assessment** *(mới, Round 4 — [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md))* | Nhận Evidence → đánh giá → **cập nhật KnowledgeNodeMastery** → sinh `AssessmentResult`. Write-owner duy nhất của Mastery. | Assessment Engine |
| 6 | **Discovery** | DiscoverySession, SelfAssessmentMismatch | Discovery Engine |
| 7 | **Mentor Interaction** | MentorSession, Learning Mode context | Teaching Engine |
| 8 | **Recommendation** | Tổng hợp tín hiệu (Regression, Mismatch, dependency gaps) thành gợi ý — không tự thực thi | Recommendation Engine |
| 9 | **Learning Profile** *(Projection, không phải Domain ghi)* | View tổng hợp từ Domain 5 + 6 + 2 | Knowledge Engine (đọc) |
| 10 | **Learning Session** *(mới, Round 5 — [DECISION-028](../11_Decisions/DECISION-028-Learning-Session-Domain.md))* | **Orchestrator** — đại diện 1 mục tiêu học tập đang diễn ra (Learner×Goal), chứa Sub Session, điều phối/đọc Domain 2,3,4,5,8 | — (không có Engine tương ứng, là tầng điều phối) |

Domain 9 không có Aggregate Root ghi. Domain 10 chỉ ghi vào chính nó (`LearningSession`/`SubSession`), không ghi vào domain nào khác. Chi tiết Assessment Domain: [AssessmentDomain.md](AssessmentDomain.md). Chi tiết Learning Session Domain: [LearningSessionDomain.md](LearningSessionDomain.md).

## 2. Domain Boundaries

- **Goal & Roadmap** sở hữu cấu trúc lộ trình — **không sở hữu** định nghĩa KnowledgeNode.
- **Knowledge Graph** sở hữu KnowledgeNode + KnowledgeEdge (DAG) và Controlled Expansion — **không sở hữu** Mastery, **không biết** Roadmap nào dùng nó (Dependency Edge một chiều: Roadmap → Knowledge).
- **Evidence** chỉ thu thập + phân loại bằng chứng thô — **không cập nhật Mastery** (đổi từ Round 2/3 — đây là việc của Assessment).
- **Assessment** *(mới)* là **cửa duy nhất** ghi vào `KnowledgeNodeMastery` — nhận Evidence làm input, không tự thu thập Evidence, không sở hữu định nghĩa KnowledgeNode.
- **Discovery** sở hữu phát hiện sai lệch tự đánh giá — không tự sửa Mastery/Roadmap.
- **Mentor Interaction** sinh ra Evidence nhưng không tự phân loại/đánh giá.
- **Recommendation** chỉ đọc, không ghi vào domain nào, không tự thực thi (DECISION-019).
- **Learning Session** *(mới, Round 5)* chỉ đọc Goal & Roadmap, Knowledge Graph, Evidence, Assessment, Recommendation — **không ghi vào domain nào trong số đó** (không tạo write-owner conflict mới); chỉ ghi vào chính nó (`LearningSession`/`SubSession`).

Bất biến giữ nguyên: **sửa Roadmap không bao giờ sửa Knowledge Graph, và ngược lại.**

**Bất biến mới (Round 4, DECISION-027):** mọi entity ghi nhận thay đổi Mastery/Recommendation/Expansion phải có tham chiếu ngược truy vết được — không có write nào trong 3 nhóm này thiếu `source_*_id`.

## 3. Aggregate Roots

| Aggregate Root | Domain | Con/thuộc tính trong cùng Aggregate | Lý do tách riêng |
|---|---|---|---|
| `Learner` | Identity | — | Định danh độc lập |
| `Goal` | Goal & Roadmap | — | Archived độc lập với Roadmap |
| `Roadmap` | Goal & Roadmap | `RoadmapNode` (cây — Roadmap vẫn là cây, KHÔNG đổi theo DECISION-025, chỉ Knowledge Graph là DAG), `ApprovalRecord` | Mọi đổi cấu trúc phải transaction cùng ApprovalRecord |
| `KnowledgeNode` | Knowledge Graph | `KnowledgeEdge` đi ra (tới các node con/liên quan trực tiếp, không load cả graph); `ExpansionRecord` nếu Deep/Structural | Mỗi node tự quản lý cạnh của chính nó — quan trọng hơn ở DAG vì 1 node có thể có nhiều cạnh vào/ra từ nhiều node khác |
| `KnowledgeNodeMastery` | **Assessment** *(đổi owner, Round 4)* | 4 cấp độ + Teach (weighted score) | 1 Aggregate / Learner×KnowledgeNode — giờ thuộc Assessment vì Assessment là nơi duy nhất ghi vào nó |
| `AssessmentResult` *(mới, Round 4)* | Assessment | `source_evidence_id`, `verdict`/`mastery_delta`, `reasoning` | Ghi nhận từng lượt đánh giá — là "biên lai" Explainability bắt buộc giữa Evidence và thay đổi Mastery |
| `Evidence` | Evidence | `EvidenceLink[]` | 1 Evidence → nhiều KnowledgeNode (DECISION-022) |
| `DiscoverySession` | Discovery | `SelfAssessmentMismatch` (0..n) | Mismatch sinh trong bối cảnh 1 phiên |
| `MentorSession` | Mentor Interaction | — | Vòng đời theo 1 lượt tương tác |
| `RecommendationProposal` | Recommendation | `traced_to[]` *(mới, Round 4 — Explainability)* | Audit "vì sao gợi ý cái này", giờ bắt buộc tham chiếu nguồn |
| `LearningSession` *(mới, Round 5)* | Learning Session | `SubSession[]` (0..n, con trong cùng Aggregate); mỗi `SubSession` tham chiếu `MentorSession[]` (Mentor Interaction Domain, *Round 6, DECISION-031* — không phải con trong Aggregate, chỉ tham chiếu) | 1 Aggregate / Learner×Goal đang active — `SubSession` không tách Aggregate riêng vì vòng đời phụ thuộc hoàn toàn vào `LearningSession` cha; `MentorSession` vẫn thuộc Aggregate riêng của Mentor Interaction Domain |

**Giữ nguyên từ Round 2/3:** Evidence và KnowledgeNodeMastery là 2 Aggregate riêng — giờ thuộc 2 domain khác nhau hẳn (Evidence vs Assessment), cập nhật qua chuỗi Domain Event `EvidenceRecorded` → Assessment xử lý → `AssessmentResult` được tạo → `KnowledgeNodeMastery` cập nhật trong transaction của Assessment. Đây vẫn là đề xuất DDD của Claude, **chưa phải quyết định chi tiết của ChatGPT/Founder ở mức Application Architecture**.

## 4. Domain Events

| Event | Sinh ra từ | Domain khác cần lắng nghe |
|---|---|---|
| `GoalDefined` / `GoalArchived` | Goal & Roadmap | Assessment |
| `RoadmapNodeProposed` | Goal & Roadmap | — |
| `RoadmapNodeApproved` / `RoadmapNodeRejected` | Goal & Roadmap | Knowledge Graph |
| `KnowledgeNodeExpanded` (Local, kèm lý do nội bộ truy vết được nhưng không bắt buộc hiển thị — *Round 4, DECISION-027*) | Knowledge Graph | Goal & Roadmap |
| `KnowledgeNodeExpanded` (Deep/Structural, kèm `expansion_reason` hiển thị) | Knowledge Graph | Goal & Roadmap, Mentor Interaction |
| `EvidenceRecorded` (kèm `EvidenceLink[]`) | Evidence | **Assessment** *(đổi từ Round 3 — Assessment là consumer chính, không phải Knowledge Graph)* |
| `AssessmentResultCreated` *(mới, Round 4)* | Assessment | Learning Profile (Projection), Recommendation |
| `KnowledgeRegressionDetected` (quyết định bởi Assessment, dựa trên Evidence Weight do Evidence Domain cung cấp — *đổi nguồn phát sinh, Round 4*) | **Assessment** *(đổi từ Evidence, Round 3)* | Mentor Interaction, Recommendation |
| `MasteryLevelAchieved` / `TeachScoreUpdated` | Assessment | Learning Profile |
| `SelfAssessmentMismatchDetected` | Discovery | Assessment, Recommendation |
| `MentorSessionModeChanged` | Mentor Interaction | — |
| `RecommendationProposed` (kèm `traced_to[]` bắt buộc — *Round 4*) | Recommendation | Mentor Interaction, Goal & Roadmap |
| `LearningSessionStarted` / `LearningSessionPaused` / `LearningSessionResumed` / `LearningSessionCompleted` *(mới, Round 5)* | Learning Session | Recommendation (Completed), Goal & Roadmap (Started) |
| `LearningSessionArchived` *(mới Round 5, đổi tên từ "Abandoned" — Round 6, DECISION-032)* | Learning Session | Goal & Roadmap, Recommendation |
| `SubSessionStarted` / `SubSessionEnded` *(mới, Round 5)* | Learning Session | Mentor Interaction |
| `RecommendationProposed` loại "pause" *(mới, Round 6, DECISION-033)* | Recommendation | Learning Session (chỉ chuyển Paused sau khi Learner xác nhận) |

## 5. Ownership Table

| Entity | Write Owner | Ai chỉ được đọc |
|---|---|---|
| `Learner` | Identity | Tất cả |
| `Goal` | Goal & Roadmap | Assessment, Discovery |
| `Roadmap` / `RoadmapNode` / `ApprovalRecord` | Goal & Roadmap | Knowledge Graph, Mentor Interaction |
| `KnowledgeNode` / `KnowledgeEdge` / `ExpansionRecord` | Knowledge Graph | Goal & Roadmap, Assessment, Mentor Interaction |
| `KnowledgeNodeMastery` | **Assessment** *(đổi từ "Mastery & Evidence", Round 4)* | Mentor Interaction, Learning Profile, Recommendation |
| `AssessmentResult` *(mới)* | Assessment | Mentor Interaction (hiển thị lý do), Learning Profile |
| `Evidence` / `EvidenceLink` | Evidence (qua Evidence Engine) | Assessment (đọc để đánh giá), Mentor Interaction (chỉ tạo) |
| `DiscoverySession` / `SelfAssessmentMismatch` | Discovery | Assessment, Recommendation |
| `MentorSession` | Mentor Interaction | — |
| `RecommendationProposal` | Recommendation | Mentor Interaction, Goal & Roadmap |
| `LearningProfile` | *(không ai — Projection)* | Mọi domain, Learner |
| `LearningSession` / `SubSession` *(mới, Round 5)* | Learning Session | Mentor Interaction, Recommendation, Learner |

**Không có Ownership Conflict mới** — việc chuyển write-owner của `KnowledgeNodeMastery` từ "Mastery & Evidence" sang "Assessment" là tái cấu trúc rõ ràng theo DECISION-026, không tạo 2 domain cùng tranh quyền ghi. **Round 5:** Learning Session chỉ đọc 5 domain khác và chỉ ghi vào chính nó — không tạo Ownership Conflict mới.

## 6. Open Domain Questions

**Đã đóng trong Round 4:**
- ~~Knowledge Graph: cây hay DAG?~~ → đóng bởi DECISION-025 (DAG).
- ~~Assessment Engine thuộc Core Domain nào?~~ → đóng bởi DECISION-026 (domain độc lập).

**Đã đóng trong Round 5:**
- ~~Cơ chế cycle detection cụ thể?~~ → đóng bởi DECISION-029 (Runtime Reachability Check, không closure table ở v1).

**Đã đóng trong Round 6 / Pre-Database Review:**
- ~~`SubSession` ↔ `MentorSession`?~~ → đóng bởi DECISION-031 (2 entity khác nhau, hierarchy 3 tầng).
- ~~Goal đổi giữa đường?~~ → đóng bởi DECISION-032 (Goal immutable, tạo mới + archive session cũ).
- ~~Ngưỡng tự động Pause?~~ → đóng bởi DECISION-033 (không ngưỡng cố định, qua Recommendation + Learner xác nhận).

**Còn mở (kế thừa):**
1. RoadmapNode↔KnowledgeNode — có Roadmap Node nào không cần KnowledgeNode nào không?
2. Evidence/Assessment/Mastery là các Aggregate riêng cập nhật qua Domain Event (không transaction chung) — vẫn là đề xuất DDD của Claude, chưa xác nhận chi tiết ở Application Architecture.
3. Tên trùng "Explain" (Level 2 vs Teach sub-capability).
4. Tiêu chí Controlled Expansion cụ thể (Local vs Deep/Structural).
5. Công thức/kiểu dữ liệu Evidence Weight, ai gán.
6. Field `type` cấp Evidence còn cần không.
7. `capability_weight` giữa 5 sub-capability của Teach.

**Mới phát sinh Round 4 (còn mở, đã thu hẹp ở Round 5):**
8. **Danh sách `relation_type` đầy đủ cho KnowledgeEdge** — DECISION-025 chỉ nói "nhiều loại", chưa liệt kê đủ.
9. **`AssessmentResult` có cần granularity per-EvidenceLink hay per-Evidence** — DECISION-030 (Round 5) đã chốt *nội dung* mỗi `AssessmentResult` (8 trường bắt buộc), nhưng *cardinality* (1 per Evidence hay 1 per EvidenceLink) vẫn mở.
10. **Explainability cho Local Expansion** — "truy vết được nhưng không hiển thị" có cần một entity ghi log riêng (giống ExpansionRecord nhưng ẩn), hay chỉ cần Domain Event đã đủ truy vết (không cần entity bền vững thêm)?

**Còn mở (kế thừa, sau khi câu 11-13 cũ của Round 5 đã đóng ở Round 6):**
11. *(kế thừa Gap 4)* Định nghĩa/ngưỡng Stuck Detection cụ thể — không bị ảnh hưởng bởi DECISION-033 (Auto Pause), vẫn là câu hỏi riêng, chưa trả lời.
12. *(mới, Round 6)* `LearningSession` có cần Aggregate Root độc lập cho việc truy vấn lại lịch sử `Completed`/`Archived` hiệu quả, hay record cũ giữ nguyên trong cùng bảng là đủ — ảnh hưởng Database Design, không ảnh hưởng Domain Architecture.

## 7. Liên kết ngược

Toàn bộ Open Domain Question (mục 6) đồng bộ vào [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) (câu 18, 20, 21 kế thừa Round 4 — câu 22-24 của Round 5 đã đóng ở Round 6) và [Docs/10_Backlog/Backlog.md](../10_Backlog/Backlog.md). Phân tích tác động DAG lên Database/Query/Recommendation: [ROUND4_DOMAIN_REVIEW.md](ROUND4_DOMAIN_REVIEW.md). Phân tích Round 5 (Learning Session lifecycle, orchestration, blocker trước Database Design): [ROUND5_ARCHITECTURE_REVIEW.md](ROUND5_ARCHITECTURE_REVIEW.md). Runtime flow chi tiết (Round 6): [RuntimeLearningFlow.md](RuntimeLearningFlow.md). Pre-Database Review tổng hợp cuối cùng: [PRE_DATABASE_REVIEW.md](PRE_DATABASE_REVIEW.md).
