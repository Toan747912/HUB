# Domain Architecture Review Report — Round 3

> Rà soát toàn diện [CoreDomainMap.md](CoreDomainMap.md) + [DomainModel_Draft.md](DomainModel_Draft.md) sau DECISION-019..024, theo yêu cầu của Founder. Tìm: Circular Dependencies, Aggregate Boundary Conflicts, Naming Conflicts, Ownership Conflicts.

## 1. Những gì đã rõ

- 8 Core Domains có ranh giới sở hữu rõ ràng (mục 2 CoreDomainMap), không có entity nào bị 2 domain cùng tuyên bố quyền ghi.
- `Concept`/`KnowledgeNode` đã thống nhất hoàn toàn (DECISION-024) ở các tài liệu kiến trúc cốt lõi (CoreDomainMap, DomainModel_Draft, AI/KnowledgeEngine/*, AIArchitecture_Draft, PromptArchitecture_Draft).
- Cơ chế Evidence-Based (không Time-Based), Knowledge Regression dựa Evidence Weight, Teach weighted score, Controlled Expansion 2-tier — đều đã có vị trí domain rõ ràng, không chồng lấp trách nhiệm.
- `ExpansionRecord` (Knowledge Graph) và `ApprovalRecord` (Goal & Roadmap) là 2 cơ chế minh bạch song song, nhất quán về pattern (ghi nhận + hiển thị lý do), dù mức độ chặn hành động khác nhau (ApprovalRecord chặn, ExpansionRecord không chặn).
- Recommendation domain chỉ đọc, không ghi vào domain nguồn nào — không có rủi ro ownership ở đây.

## 2. Những gì còn mơ hồ

1. **Việc phân loại Knowledge Node Expansion (Local vs Deep/Structural) cần biết RoadmapNode đang active của Learner** (DECISION-023) — nhưng Domain Boundaries (mục 2 CoreDomainMap) lại nói "Knowledge Graph không biết Roadmap nào đang dùng nó". Đây không hẳn là vi phạm ownership (Knowledge Graph vẫn là write-owner duy nhất của KnowledgeNode), nhưng **cần một quy tắc rõ**: ai/lớp nào truyền thông tin "RoadmapNode đang active" vào lời gọi Knowledge Node Expansion — orchestration ở Application Layer (chưa thiết kế), hay Knowledge Engine tự query sang Roadmap (vi phạm boundary nếu vậy)? Khuyến nghị: orchestration layer truyền vào như input, Knowledge Engine không tự query — nhưng cần ghi rõ quy tắc này khi vào Application Architecture.
2. **4 hệ thống "weight/score" riêng biệt, không công thức nào có giá trị:** `MasteryScore` (tổng hợp toàn KnowledgeNodeMastery, Gap 5 gốc), `teach_score` (composite 5 sub-capability, DECISION-020), `capability_weight` (trọng số giữa 5 sub-capability), `evidence_weight` (trọng số 1 EvidenceLink, DECISION-021). Chưa có quy ước đặt tên/kiểu dữ liệu thống nhất cho nhóm 4 field này — rủi ro mỗi field được thiết kế DB riêng lẻ, không nhất quán.
3. **Field `type` (Positive/Negative) cấp Evidence** — DECISION-022 chuyển direction xuống `EvidenceLink`, nhưng chưa rõ field cấp Evidence có còn tồn tại ở dạng tổng quát hay bị xóa hoàn toàn (Open Question câu 14).
4. **Tên trùng "Explain"** (Level 2 vs Teach sub-capability) — tồn tại từ Round 2, vẫn chưa có quy ước tên field phân biệt.
5. **Tài liệu tầng cao (PRD_v1.md, MVP_Plan.md) còn sót thuật ngữ "Concept"/"ConceptMastery"** — không sai về bản chất (cùng entity), nhưng không nhất quán chữ với tài liệu kiến trúc đã đồng bộ. Việc dọn này có độ ưu tiên thấp hơn (không ảnh hưởng Database Design), đã ghi vào Backlog.

## 3. Domain còn thiếu

1. **AssessmentEngine không được map vào Core Domain nào trong bảng "Core Domains" (CoreDomainMap mục 1)** — Discovery/Knowledge/Evidence/Recommendation/Roadmap/Teaching đều có dòng riêng, nhưng Assessment Engine (đã tồn tại từ Round 1, capability "Understanding Verification") bị thiếu khi bảng được viết ở Round 2. Cần thêm: Assessment Engine thuộc về domain nào — khuyến nghị gán vào **Mastery & Evidence** (vì output của nó luôn là Evidence/EvidenceLink mới, không có dữ liệu sở hữu riêng).
2. **Chưa có domain/đầu mối thống nhất cho "Transparency"** — nhiều cơ chế minh bạch (expansion_reason, regression reasoning, recommendation reasoning, roadmap critique reasoning) hiện nằm rải rác là field riêng trên từng entity, không có một domain/aggregate trung tâm nào đảm bảo tính nhất quán hiển thị cho Learner. Có thể không cần 1 domain riêng (có thể chỉ là 1 convention ở Prompt/Output Envelope, đã có `reasoning` field chung) — nêu ra để Founder/ChatGPT xác nhận đây là chủ đích (convention đủ, không cần domain riêng) hay cần thiết kế thêm.
3. *(đã biết từ Round 1, chưa giải quyết)* Curriculum Authoring/Admin domain — vẫn chưa tồn tại, brief chưa yêu cầu.

## 4. Rủi ro lớn nhất trước khi bước sang Database Design

Xếp theo mức ảnh hưởng tới schema nếu không giải quyết trước:

1. **Knowledge Graph giả định mỗi KnowledgeNode chỉ có 1 cha (cây), nhưng tri thức thực tế thường là DAG (nhiều cha hợp lý).** Đây là rủi ro lớn nhất — quyết định cây-vs-DAG đổi hoàn toàn cách lưu Expansion Edge (1 cột `parent_id` vs bảng quan hệ riêng) và cơ chế chống cycle (đơn giản vs cần kiểm tra toàn cục). Nên quyết định **trước khi viết schema**, vì đổi sau khi đã có dữ liệu thật sẽ rất tốn kém.
2. **4 field weight/score (mục 2.2) chưa có kiểu dữ liệu** — nếu vào Database Design trước khi giải quyết, rủi ro phải `ALTER TABLE` nhiều lần.
3. **Bidirectional Domain Event coupling giữa Goal & Roadmap ↔ Knowledge Graph** (`RoadmapNodeApproved` → Knowledge Graph nghe; `KnowledgeNodeExpanded` → Goal & Roadmap nghe) — về nguyên tắc không sai (event-driven 2 domain liên quan vẫn có thể nghe lẫn nhau), nhưng chưa có quy tắc chống lặp/idempotency nếu 1 hành động ở domain này kích hoạt domain kia rồi quay lại domain đầu (ví dụ: Roadmap duyệt node → Knowledge Graph mở rộng → Roadmap lại cần xem xét lại vì node mới xuất hiện → có dừng đúng lúc không?). Cần quy tắc rõ ở Application Architecture, không phải lỗi nhưng là rủi ro vận hành nếu bỏ qua.
4. *(thấp hơn)* Field `type` cấp Evidence (mục 2.3) — ảnh hưởng 1 cột duy nhất, dễ sửa hơn 3 rủi ro trên.

## 5. Câu hỏi Founder cần xác nhận

Tổng hợp — đầy đủ chi tiết tại [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md):

- Câu 12 — `capability_weight` cho 5 sub-capability của Teach.
- Câu 13 — Công thức/kiểu dữ liệu `evidence_weight`.
- Câu 14 — Field `type` cấp Evidence còn cần không.
- Câu 15 — Tiêu chí Controlled Expansion cụ thể.
- **Mới từ Review này (chưa có số thứ tự riêng trong OpenQuestions, đề xuất thêm câu 16-17):**
  - **Câu 16 (mới):** Knowledge Graph nên là cây (1 cha) hay DAG (nhiều cha)? Đây là rủi ro lớn nhất (mục 4.1) — cần quyết định trước Database Design.
  - **Câu 17 (mới):** Assessment Engine thuộc Core Domain nào — xác nhận gán vào Mastery & Evidence (khuyến nghị của Claude) hay domain khác?

## 6. Kết luận

Domain Model **chưa đủ ổn định để mở khóa Database Design** — còn 1 rủi ro lớn (cây vs DAG) cần quyết định trước, không chỉ là chi tiết có thể để lại implement mới chốt. Khuyến nghị: Founder/ChatGPT trả lời tối thiểu Câu 16 (cây vs DAG) trước khi xem xét mở khóa [DECISION-018](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md); các câu còn lại (12-15, 17) có thể trả lời song song hoặc để default hợp lý khi bắt đầu Database Design mà không cần chặn hoàn toàn.
