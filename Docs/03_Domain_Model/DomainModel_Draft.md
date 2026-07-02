# Domain Model Draft — AI Mentor OS

> Trạng thái: Draft. Mức trừu tượng cố ý giữ cao — chưa chọn kiểu dữ liệu cụ thể cho Mastery Score (xem [RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 5). Chờ định hướng từ ChatGPT (Lead Architect) để tinh chỉnh.
>
> **Cập nhật Round 3 (DECISION-024):** Entity `Concept` của Round 1 đã được **sáp nhập hoàn toàn vào `KnowledgeNode`** — không còn là entity riêng. Nội dung dưới đây đã được sửa để dùng `KnowledgeNode`/`KnowledgeNodeMastery` thống nhất, đóng lại nợ tài liệu B.1 từ Round 2. Cardinality `RoadmapNode↔KnowledgeNode` cũng đã sửa thành nhiều-nhiều theo [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md). [CoreDomainMap.md](CoreDomainMap.md) vẫn là lớp tổng hợp có thẩm quyền cao hơn khi 2 tài liệu khác biệt ở các điểm khác (Aggregate, Domain Events, Evidence/EvidenceLink) — file này chỉ phản ánh entity-level detail, không lặp lại toàn bộ.

## 1. Bounded Contexts (đề xuất, chưa khóa)

| Context | Trách nhiệm |
|---|---|
| Identity | Learner, phiên đăng nhập |
| Discovery | Goal clarification, đánh giá trình độ, SelfAssessmentMismatch |
| Curriculum | Roadmap, Module, Lesson — cấu trúc học |
| Knowledge | KnowledgeNode, Knowledge Graph, Mastery *(đổi tên Round 3, DECISION-024)* |
| Mentor Session | Tương tác AI ↔ Learner theo Learning Mode |
| Memory | User Memory — lịch sử goal/roadmap/điểm mạnh yếu |

## 2. Entity chính

### Learner
- Định danh người học.
- Liên kết tới: Goal hiện tại, Goal History, Knowledge Graph, Learning Profile.

### Goal
- Mục tiêu thực tế bằng ngôn ngữ tự nhiên (ví dụ "Xây web dịch lồng tiếng video").
- Trạng thái: active / archived (khi đổi goal — xem [RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 7, luồng archive chưa rõ chi tiết).
- 1 Learner có 1 Goal active, nhiều Goal archived (lịch sử).

### DiscoverySession
- Bản ghi một lượt Adaptive Discovery (onboarding hoặc continuous).
- Output: thông tin làm rõ về Goal + đánh giá trình độ.
- Có thể sinh ra 0..n `SelfAssessmentMismatch`.

### SelfAssessmentMismatch
- Ghi nhận một lần phát hiện: tự đánh giá ≠ năng lực thực tế.
- Thuộc tính tối thiểu: KnowledgeNode liên quan, tự đánh giá của Learner, đánh giá thực tế suy ra, evidence dẫn tới kết luận này.
- Không tự động sửa Roadmap — chỉ là bằng chứng đầu vào cho Curriculum Context xem xét đề xuất.

### Roadmap
- Cây phân cấp mở rộng động: Goal → Branch (Backend/Frontend/...) → Sub-branch → ... → Leaf node.
- Mỗi node có trạng thái: chưa mở (collapsed) / đã mở (expanded) / đã hoàn thành.
- Mọi thay đổi cấu trúc (thêm/bớt/đổi thứ tự node) phải có `ApprovalRecord` gắn Learner.

### RoadmapNode
- Một node trong Roadmap (Module/Sub-module).
- *(sửa Round 3, DECISION-015/024)* Liên kết **nhiều-nhiều** tới `KnowledgeNode` qua Dependency Edge — không còn 1:1 leaf-only như Round 1. Một Roadmap Node (ví dụ "Upload Video") có thể phụ thuộc nhiều KnowledgeNode (HTTP, Multipart Form, Streams, Validation, Storage).
- Liên kết 0..n tới RoadmapNode con.

### KnowledgeNode *(Round 1 gọi là `Concept` — đã hợp nhất theo DECISION-024, xem [AI/KnowledgeEngine/KnowledgeNode.md](../../AI/KnowledgeEngine/KnowledgeNode.md) để có spec đầy đủ)*
- Đơn vị tri thức chuẩn của toàn hệ thống (ví dụ: JWT, Session, OAuth).
- Không thuộc về 1 Roadmap cụ thể — 1 KnowledgeNode có thể xuất hiện trong nhiều Roadmap của nhiều Learner khác nhau (tái sử dụng).
- Thuộc 1 Domain (xem mục 4 — Đa lĩnh vực) để áp Assessment Mapping phù hợp.
- *(mới, Round 2/3)* Có thể mở rộng động thành KnowledgeNode con qua Expansion Edge (Hybrid Dynamic Graph) — xem [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md) cho Controlled Expansion (Local vs Deep/Structural).

### KnowledgeNodeMastery *(Round 1 gọi là `ConceptMastery`)*
- Quan hệ Learner ↔ KnowledgeNode.
- Remember / Explain(Level 2) / Apply: mỗi trường trạng thái đạt/chưa đạt riêng.
- *(sửa Round 3, DECISION-020)* Teach: **không còn đạt/chưa đạt** — là weighted composite score từ 5 sub-capability (Explain/Simplify/Guide/Review/Transfer Knowledge), xem [AI/KnowledgeEngine/MasteryModel.md](../../AI/KnowledgeEngine/MasteryModel.md).
- Evidence: tham chiếu tới `EvidenceLink` (không phải Evidence trực tiếp — mỗi link mang chiều support/refute + weight riêng, DECISION-022).
- Confidence: độ tin cậy của đánh giá hiện tại (kiểu dữ liệu cụ thể: 🔶 chờ Architecture).
- MasteryScore: tổng hợp các trường trên — công thức cụ thể: 🔶 chờ Architecture ([RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 5).
- *(sửa Round 2/3)* Không có decay theo thời gian — chỉ giảm khi Evidence Weight theo chiều refute vượt ngưỡng (Knowledge Regression, DECISION-016/021).

### MentorSession
- Một lượt tương tác Mentor AI ↔ Learner gắn với 1 Learning Mode cụ thể (A/B/C/D).
- Có thể đổi Mode giữa phiên — mỗi lần đổi ghi nhận thời điểm + mode mới (không tách session, vì đây vẫn là 1 luồng tương tác liên tục theo Lesson/KnowledgeNode đang học).
- Sinh ra Evidence (qua Evidence Engine) cập nhật vào KnowledgeNodeMastery liên quan.

### ApprovalRecord
- Ghi nhận: Learner đã phê duyệt một thay đổi cấu trúc Roadmap cụ thể.
- Bắt buộc tồn tại trước khi RoadmapNode được thêm/sửa/xóa/đổi thứ tự — đây là cơ chế thực thi Roadmap Governance ở tầng dữ liệu, không chỉ ở tầng quy trình.

### LearningProfile
- Là **view tổng hợp**, không phải nguồn dữ liệu độc lập — tính từ KnowledgeNodeMastery + DiscoverySession + Goal History.
- Hiển thị: điểm mạnh, điểm yếu, lỗi thường gặp, mức độ hiểu theo từng KnowledgeNode/Domain.
- Learner xem được toàn bộ (UC7 trong PRD).

## 3. Quan hệ tổng quan *(sửa Round 3 — xem [CoreDomainMap.md](CoreDomainMap.md) mục 3-5 cho bản đầy đủ gồm EvidenceLink/ExpansionRecord/RecommendationProposal)*

```
Learner 1───* Goal (1 active, n archived)
Learner 1───1 LearningProfile (computed view)
Learner 1───* DiscoverySession
Goal     1───1 Roadmap
Roadmap  1───* RoadmapNode (cây phân cấp, tự tham chiếu)
RoadmapNode  *───* KnowledgeNode (Dependency Edge — nhiều-nhiều, sửa Round 3)
KnowledgeNode *───* KnowledgeNode (Expansion Edge cha-con, Hybrid Dynamic Graph)
Learner  *───* KnowledgeNode  (qua KnowledgeNodeMastery)
Learner  1───* MentorSession
MentorSession *───1 RoadmapNode/KnowledgeNode (bối cảnh đang học)
RoadmapNode thay đổi cấu trúc → cần 1 ApprovalRecord
KnowledgeNode mở rộng loại Deep/Structural → cần 1 ExpansionRecord (nhẹ hơn ApprovalRecord)
SelfAssessmentMismatch *───1 KnowledgeNode, *───1 DiscoverySession
Evidence 1───* EvidenceLink *───1 KnowledgeNode (many-to-many qua EvidenceLink)
```

## 4. Đa lĩnh vực (Domain)

`KnowledgeNode.Domain` ∈ {Programming, AI, Design, Language, Marketing, Business, CareerSkill, ...} — danh sách mở.

🔶 OPEN — phạm vi Domain nào có trong MVP chưa xác nhận ([OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 3). Mỗi Domain cần một **Assessment Mapping** riêng cho 4 cấp độ Remember/Explain/Apply/Teach trước khi KnowledgeNode thuộc Domain đó được đưa vào hệ thống thật ([RequirementGaps.md](../01_PRD/RequirementGaps.md) Gap 2) — đây nên là một entity cấu hình riêng (`DomainAssessmentMapping`), không hard-code trong logic.

## 5. Ghi chú cho ChatGPT (Lead Architect)

Model này cố ý nông (shallow) ở các điểm sau, chờ kiến trúc tổng thể quyết định sâu hơn:
- Kiểu dữ liệu Confidence/MasteryScore.
- Cơ chế lưu trữ Roadmap dạng cây (adjacency list / closure table / khác).
- Có cần Aggregate riêng cho "Learning Parameters" (độ khó/tốc độ AI tự điều chỉnh, theo Gap 1) tách khỏi RoadmapNode hay không.
