# Backlog — AI Mentor OS

Các vấn đề/feature còn thiếu, chưa đủ rõ để vào MVP Plan ngay, hoặc cố ý để lại cho vòng thiết kế sau. Không sắp theo sprint — chỉ phân loại theo nguồn gốc và mức ưu tiên xử lý tài liệu (không phải ưu tiên build).

## A. Chờ trả lời Open Questions trước khi detail hóa được

| Item | Phụ thuộc |
|---|---|
| Hint ladder hay Direct Fix cho UC6 Debug | [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 6 |
| Assessment Mapping cho từng lĩnh vực ngoài lập trình | [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 3 |
| Quy trình đồng bộ chính thức với ChatGPT (Lead Architect) | [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 2 |

---

## B. Lỗ hổng đã phát hiện, chưa được giải quyết trong vòng tài liệu này

Xem chi tiết: [RequirementGaps.md](../01_PRD/RequirementGaps.md).

- Gap 1 — Ranh giới Roadmap Structure vs Learning Parameters (chặn AI Architecture chi tiết hơn).
- Gap 4 — Định lượng "kẹt quá lâu" (tín hiệu kích hoạt Stuck Detection).
- Gap 6 — Bảng mapping Learning Mode ↔ Knowledge Level đạt được tốt nhất.
- Gap 7 — Luồng đổi Goal giữa đường (Goal cũ/Roadmap cũ xử lý ra sao).
- Gap 8 — Định nghĩa failure mode của sản phẩm (chưa cấp bách, để PRD v2).

---

## B.1 — Nợ tài liệu giữa các Round

🔶 **Mới phát sinh, Round 3 (vẫn mở):** `Docs/01_PRD/PRD_v1.md`, `Docs/09_MVP/MVP_Plan.md` vẫn còn vài chỗ dùng tên "Concept"/"ConceptMastery" cũ (ưu tiên thấp, không ảnh hưởng Database Design).

🔶 **Mới phát sinh, Round 4:** `Docs/03_Domain_Model/DomainModel_Draft.md` (Round 1/3) chưa phản ánh việc tách Assessment Domain (DECISION-026) và DAG (DECISION-025) — `CoreDomainMap.md`/`AssessmentDomain.md` là nguồn thẩm quyền cao hơn cho 2 điểm này.

🔶 **Mới phát sinh, Round 5:** `Docs/03_Domain_Model/DomainModel_Draft.md` cũng chưa phản ánh Learning Session Domain (DECISION-028) — cùng độ ưu tiên thấp như nợ Round 4. `AI/KnowledgeEngine/KnowledgeGraphModel.md` mục Cycle Detection vẫn còn đánh dấu 🔶 OPEN cho câu 19 — cần cập nhật để khớp DECISION-029 (Runtime Reachability Check đã chốt).

---

## C. Câu hỏi mới phát sinh trong quá trình viết tài liệu

1. **Heuristic chọn Learning Mode mặc định** — khi Learner chưa từng chọn mode, AI bắt đầu bằng mode nào? Theo trình độ đánh giá từ Discovery, hay luôn mặc định Mode A?
2. **Vai trò Admin/Curriculum Author** — brief hoàn toàn không đề cập. MVP_Plan giả định không có (AI sinh toàn bộ nội dung động), nhưng nếu Founder có ý định khác (ví dụ pha trộn nội dung do người soạn + AI cá nhân hóa), cần chốt sớm.
3. **Ngưỡng/độ sâu tối thiểu của 1 Roadmap mẫu để demo "mở rộng động"** — vấn đề kỹ thuật nêu trong MVP_Plan mục 4, cần ChatGPT xác nhận khi vào implementation.
4. **Recommendation Engine chưa có Capability tương ứng** — `AI/RecommendationEngine/` được thêm vào kiến trúc workspace mới (DECISION-014) nhưng không có Capability nào mô tả nó.
5. **Persona chưa tồn tại** — `Product/Personas/` hiện trống.
6. **Database/API/UI_UX đang là khung rỗng** — chính thức tạm dừng theo [DECISION-018](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md) (ngoại trừ Discovery Engine đã được review và phê duyệt tại Phase 1).
7. *(còn mở)* **Quan hệ Evidence ↔ KnowledgeNodeMastery (2 Aggregate riêng, cập nhật qua Domain Event)** — vẫn là đề xuất DDD của Claude, chưa được ChatGPT/Founder xác nhận.
8. *(còn mở)* **Field `type` cấp Evidence (Positive/Negative) có còn cần không** sau khi DECISION-022 chuyển direction xuống cấp EvidenceLink — xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 14.
9. *(còn mở)* **Tiêu chí Controlled Expansion cụ thể** (Local vs Deep/Structural) — đề xuất kỹ thuật của Claude trong [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md), chưa duyệt. Xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 15.
10. *(còn mở)* **Danh sách `relation_type` đầy đủ** cho KnowledgeEdge — đề xuất khởi điểm (`expands_to`/`prerequisite_of`/`related_to`) chưa duyệt. Xem [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 18.
11. *(còn mở)* **`AssessmentResult` cardinality** (per-Evidence hay per-EvidenceLink) — cardinality vẫn mở, xem câu 20.
12. *(còn mở)* **Entity ghi log nội bộ cho Local Expansion** (Explainability mà không hiển thị) — xem câu 21.
13. **`trace_link.source_type`/`target_type` enum chưa phủ entity của Discovery** (`discovery_answer`, `competency_signal`, `self_assessment_mismatch`) — cần mở rộng enum đã khóa ở [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 12 trước khi D7 (DECISION-048) thực thi được đầy đủ qua TraceLink.

---

## D. Theo dõi tiến độ Open Questions

| Câu hỏi | Trạng thái |
|---|---|
| 1. Quan hệ với workspace cũ | Chưa trả lời |
| 2. Quy trình sync với ChatGPT | Chưa trả lời |
| 3. Phạm vi đa lĩnh vực MVP | Chưa trả lời |
| 4. "User" trong Roadmap Governance là ai | Chưa trả lời |
| 5. Cơ chế xác minh SelfAssessmentMismatch | ✅ Đã chốt (DECISION-051) |
| 6. AI Boundaries khi dạy/debug | Chưa trả lời |
| 7. Mô hình kinh doanh | Chưa trả lời |
| 8. Knowledge Node Expansion governance | ✅ Đã chốt (DECISION-023) |
| 9. Teach: 5/5 hay ngưỡng N/5 | ✅ Đã chốt (DECISION-020) |
| 10. Ngưỡng Negative Evidence cho Regression | ✅ Đã chốt (DECISION-021) |
| 11. Evidence 1:1 hay nhiều-nhiều với Knowledge Node | ✅ Đã chốt (DECISION-022) |
| 12. *(Round 3)* `capability_weight` cho 5 sub-capability của Teach | ✅ Đã chốt (DECISION-052) |
| 13. *(Round 3)* Công thức/kiểu dữ liệu `evidence_weight` | ✅ Đã chốt (DECISION-053) |
| 14. *(Round 3)* Field `type` cấp Evidence còn cần không | Chưa trả lời |
| 15. *(Round 3)* Tiêu chí Controlled Expansion cụ thể | Chưa trả lời |
| 16. Knowledge Graph: cây hay DAG | ✅ Đã chốt (DECISION-025) |
| 17. Assessment Engine thuộc Core Domain nào | ✅ Đã chốt (DECISION-026) |
| 18. *(Round 4)* Danh sách `relation_type` đầy đủ | Chưa trả lời |
| 19. *(Round 4)* Cơ chế cycle detection cụ thể | ✅ Đã chốt (DECISION-029) |
| 20. *(Round 4)* `AssessmentResult` granularity (cardinality) | Chưa trả lời — thu hẹp ở Round 5 (DECISION-030 chốt nội dung, cardinality vẫn mở) |
| 21. *(Round 4)* Entity ghi log nội bộ cho Local Expansion | Chưa trả lời |
| 22. *(Round 5)* `SubSession` ↔ `MentorSession` | ✅ Đã chốt (DECISION-031) |
| 23. *(Round 5)* Goal đổi giữa đường có tạo `LearningSession` mới | ✅ Đã chốt (DECISION-032) |
| 24. *(Round 5)* Ngưỡng tự động Pause cho `LearningSession` | ✅ Đã chốt (DECISION-033) |
