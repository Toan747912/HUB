# Runtime Learning Flow — AI Mentor OS

> Tổng hợp xuyên domain, không phải Decision Log. Mô tả luồng vận hành thực tế từ góc nhìn Learner và từ góc nhìn hệ thống, dựa trên toàn bộ quyết định đã khóa qua Round 1-6 ([11_Decisions/](../11_Decisions/README.md)). Tham chiếu thẩm quyền cao nhất cho từng domain riêng vẫn là [CoreDomainMap.md](CoreDomainMap.md)/[AssessmentDomain.md](AssessmentDomain.md)/[LearningSessionDomain.md](LearningSessionDomain.md) — tài liệu này chỉ **kết nối** chúng theo trình tự thời gian, không định nghĩa lại entity/ownership nào.
>
> Không thiết kế Database/API/UI — chỉ Runtime Domain Flow.

## 1. User Journey (góc nhìn Learner)

1. **Learner chọn/khai báo 1 mục tiêu học tập** (Goal Clarification, Discovery Domain) → hệ thống tạo `Goal` mới (immutable, DECISION-032) + `Roadmap` 1:1.
2. **Learner bắt đầu học** → `LearningSession` mới khởi tạo, gắn Learner×Goal này.
3. **Learner học từng phần** — mỗi lần hệ thống/Learner chọn 1 `RoadmapNode`/`KnowledgeNode` cụ thể để xử lý, 1 `SubSession` mới mở ra trong `LearningSession`.
4. **Learner tương tác với Mentor AI** — mỗi lượt hỏi/đáp/làm bài là 1 `MentorSession`, nằm trong `SubSession` đang active (DECISION-031).
5. **Learner nộp bằng chứng hiểu biết** (trả lời, bài tập, giải thích lại) → `Evidence` được tạo, phân loại qua `EvidenceLink`.
6. **Hệ thống đánh giá** (không hiển thị như 1 bước riêng với Learner, nhưng có thể được hỏi "vì sao AI nói tôi chưa hiểu") → `AssessmentResult` được tạo, `KnowledgeNodeMastery` cập nhật.
7. **Learner nhận gợi ý** (nếu có tín hiệu Regression/Mismatch/gap) — `RecommendationProposal` hiển thị, Learner tự quyết định nghe theo hay không (bao gồm gợi ý "nên tạm ngưng", DECISION-033).
8. **Learner hoàn thành Roadmap** → `LearningSession` chuyển `Completed`. **Hoặc** Learner đổi mục tiêu giữa đường → `Goal` mới + `LearningSession` mới được tạo, session cũ chuyển `Archived` (DECISION-032).

## 2. Runtime Flow (góc nhìn hệ thống — theo thứ tự thực thi)

```
[1] Discovery Domain
     Goal Clarification + Competency Probing
        │
        ▼  GoalDefined
[2] Goal & Roadmap Domain
     tạo Goal (immutable) + Roadmap (1:1) + RoadmapNode (đề xuất, cần ApprovalRecord)
        │
        ▼  LearningSessionStarted (Learning Session lắng nghe GoalDefined)
[3] Learning Session Domain
     tạo LearningSession (Active) cho Learner×Goal
        │
        ▼  SubSessionStarted (chọn 1 RoadmapNode/KnowledgeNode để xử lý)
[4] Learning Session Domain (con: SubSession)
        │
        ▼  (Learner tương tác)
[5] Mentor Interaction Domain
     tạo MentorSession (trong phạm vi SubSession hiện tại, theo Learning Mode A/B/C/D)
        │
        ├──▶ Teaching/Socratic Guidance Capability → có thể đọc Knowledge Graph (KnowledgeNode đang dạy)
        │
        ▼  (Learner phản hồi/làm bài)
[6] Evidence Domain
     Evidence Management Capability → tạo Evidence + EvidenceLink (direction, weight)
        │
        ▼  EvidenceRecorded
[7] Assessment Domain
     đọc Evidence/EvidenceLink + KnowledgeNode + KnowledgeNodeMastery hiện tại
     → ghi KnowledgeNodeMastery mới
     → sinh AssessmentResult (8 trường, DECISION-030)
        │
        ├──▶ AssessmentResultCreated ──▶ Learning Profile (Projection), Recommendation
        ├──▶ MasteryLevelAchieved / TeachScoreUpdated ──▶ Learning Profile
        └──▶ KnowledgeRegressionDetected (nếu Evidence Weight refute vượt ngưỡng) ──▶ Mentor Interaction, Recommendation
        │
        ▼  (nếu cần mở rộng nội dung)
[8] Knowledge Graph Domain
     Knowledge Node Expansion (Local — tự làm, log nội bộ; hoặc Deep/Structural — bắt buộc hiển thị lý do)
     → thêm KnowledgeEdge mới (cycle check: Runtime Reachability, DECISION-029)
        │
        ▼  KnowledgeNodeExpanded
[9] Recommendation Domain
     đọc KnowledgeRegressionDetected / SelfAssessmentMismatchDetected / dependency gap
     → sinh RecommendationProposal (kèm traced_to[] bắt buộc) — có thể là đề xuất "pause" (DECISION-033)
        │
        ▼  RecommendationProposed
[10] Learner xác nhận hoặc bỏ qua đề xuất
        │
        ├──▶ Nếu xác nhận đề xuất pause → LearningSessionPaused (Learning Session lắng nghe, KHÔNG tự thực thi)
        └──▶ Nếu xác nhận đề xuất Roadmap → Goal & Roadmap Domain (qua ApprovalRecord)
        │
        ▼  SubSessionEnded (khi xong phạm vi hiện tại) → lặp lại từ [4] với phạm vi mới
        │
        ▼  (khi toàn bộ Roadmap hoàn thành)
[11] LearningSessionCompleted
        │
        ▼  (nếu Learner đổi Goal giữa đường, tại bất kỳ bước nào)
[12] Goal & Roadmap Domain: tạo Goal mới (Goal cũ không bị sửa, DECISION-032)
     Learning Session Domain: tạo LearningSession mới; LearningSession cũ → LearningSessionArchived
     → quay lại từ [3] với LearningSession mới
```

## 3. State Transitions (tổng hợp — chi tiết riêng từng entity ở domain tương ứng)

| Entity | Transitions | Quyết định liên quan |
|---|---|---|
| `LearningSession` | Started → Active ⇄ Paused → {Completed \| Archived} | DECISION-028, 032, 033 |
| `SubSession` | Active → Ended (không có Paused riêng — pause ở cấp này = Ended + SubSession mới khi resume) | DECISION-028, 031 |
| `MentorSession` | Active trong 1 lượt, có thể đổi Learning Mode giữa phiên (không tách session) | Round 1, không đổi |
| `KnowledgeNodeMastery` | Cập nhật liên tục qua mỗi `AssessmentResult` — không có "trạng thái" rời rạc, là composite/weighted score | DECISION-020, 026 |
| `Goal` | Created → (immutable, không transition nội bộ) → Archived-by-replacement (khi Goal mới thay thế) | DECISION-032 |
| `RoadmapNode` | Proposed → Approved/Rejected (qua ApprovalRecord) | DECISION-006 (Round 1) |
| `KnowledgeNode`/`KnowledgeEdge` | Không transition trạng thái — chỉ thêm cạnh mới (Expansion), không sửa/xóa cạnh cũ | DECISION-023, 025, 029 |
| `RecommendationProposal` | Proposed → {Confirmed \| Ignored} bởi Learner — không tự thực thi | DECISION-019, 033 |

## 4. Domain Events (theo trình tự phát sinh điển hình, tổng hợp từ tất cả domain)

```
GoalDefined
  → LearningSessionStarted
    → SubSessionStarted
      → (MentorSession diễn ra — không phát Domain Event riêng ở mức này, Round 1 không yêu cầu)
      → EvidenceRecorded
        → AssessmentResultCreated
          → MasteryLevelAchieved | TeachScoreUpdated | KnowledgeRegressionDetected
            → RecommendationProposed (action_type: roadmap_change | pause | ...)
              → (Learner xác nhận) → RoadmapNodeApproved | LearningSessionPaused
      → KnowledgeNodeExpanded (Local: log nội bộ / Deep-Structural: hiển thị lý do)
    → SubSessionEnded
  → LearningSessionCompleted | LearningSessionArchived (nếu Goal đổi)
```

Mọi Domain Event trong nhóm Mastery/Recommendation/Expansion vẫn phải mang `traced_to[]` (DECISION-027) — không đổi ở Round 6.

## 5. Engine Interactions (Capability nào chạy ở bước nào)

| Bước Runtime Flow | Capability/Engine chính | Đọc | Ghi |
|---|---|---|---|
| [1] Discovery | Goal Clarification, Competency Probing | — | DiscoverySession |
| [2] Goal & Roadmap | Roadmap Proposal | Goal | RoadmapNode (đề xuất), ApprovalRecord (sau xác nhận) |
| [5] Mentor Interaction | Teaching / Socratic Guidance / Roadmap Critique | KnowledgeNode, KnowledgeNodeMastery hiện tại | MentorSession |
| [6] Evidence | Evidence Management | Nội dung tương tác vừa xảy ra | Evidence, EvidenceLink |
| [7] Assessment | Understanding Verification | Evidence/EvidenceLink, KnowledgeNode, KnowledgeNodeMastery hiện tại | KnowledgeNodeMastery, AssessmentResult |
| [8] Knowledge Graph | Knowledge Node Expansion | KnowledgeNode cha, node/cạnh tương tự đã tồn tại | KnowledgeEdge, ExpansionRecord (nếu Deep/Structural) |
| [9] Recommendation | Recommendation | KnowledgeRegressionDetected/SelfAssessmentMismatchDetected/dependency gap | RecommendationProposal |
| [3][4][11][12] | *(không có Engine riêng — tầng điều phối)* | Goal/Roadmap/Knowledge/Evidence/Assessment/Recommendation (chỉ đọc) | LearningSession, SubSession |

Learning Session **không xuất hiện ở cột "Engine chính" cho bất kỳ bước nghiệp vụ nào** — đúng vai trò Orchestrator đã chốt ở DECISION-028: nó theo dõi toàn bộ luồng trên bằng cách lắng nghe Domain Event, không chèn vào giữa bất kỳ bước ghi dữ liệu nghiệp vụ nào.

## 6. Ghi chú biên giới (không lặp lại nội dung domain riêng)

- Ranh giới ghi (Ownership) của từng entity: xem [CoreDomainMap.md](CoreDomainMap.md) mục 5 — không có gì thay đổi so với mô tả ở đó, tài liệu này chỉ trình bày lại theo trục thời gian.
- Boundary cụ thể từng domain (được/không được làm gì): xem tài liệu domain tương ứng (`AssessmentDomain.md`, `LearningSessionDomain.md`, v.v.) — không nhân bản ở đây.
