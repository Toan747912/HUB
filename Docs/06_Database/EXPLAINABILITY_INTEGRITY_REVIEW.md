# Explainability Integrity Review — Round 3.5

> Phạm vi: chỉ review. Không thiết kế entity mới, không thiết kế Recommendation, không tạo SQL. Dựa trên 19 bảng đã khóa ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) và các phát hiện đã có ở [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) (mục C, D) và [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) (mục 3, 4).
>
> Mục tiêu: với mỗi loại quyết định do AI tạo ra, trả lời đủ 6 câu hỏi bắt buộc. Round 1-3 trả lời theo *mechanism* (bảng nào enforce gì); Round 3.5 trả lời theo *loại quyết định AI* (Teaching/Assessment/Recommendation/Knowledge Expansion/Roadmap Construction) — tổ chức lại góc nhìn, không tạo phát hiện trùng lặp một cách vô nghĩa, nhưng có 2 phát hiện mới quan trọng (xem 1. Teaching và 4. Knowledge Expansion — Local).

---

## 1. Teaching — AI chọn nội dung học tiếp theo

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | Trong 1 `sub_session` đang active, chọn `KnowledgeNode` / nội dung cụ thể để dạy tiếp theo, dựa theo Learning Mode đang active. |
| 2 | AI dựa trên dữ liệu nào? | `sub_session.roadmap_node_id` → `roadmap_node_knowledge_node` (KnowledgeNode nào RoadmapNode này yêu cầu) → `knowledge_node_mastery` (Learner đã đạt mức nào) → có thể tham chiếu `knowledge_edge` (thứ tự prerequisite). |
| 3 | AI tạo ra dữ liệu nào? | **Không trực tiếp.** Bản thân hành động "chọn dạy gì" không được ghi vào bảng nào. Dữ liệu duy nhất được tạo ra là `evidence`, và chỉ khi Learner phản hồi — đó là sản phẩm của capability Evidence Management, không phải của quyết định Teaching tự thân. |
| 4 | Có thể truy ngược đầy đủ không? | **KHÔNG.** Không có bảng nào trả lời được câu "AI đã chọn dạy KnowledgeNode X vào lúc nào trong SubSession Z, vì lý do gì (vd: vì đó là prerequisite còn thiếu, hay vì Learner yêu cầu, hay vì retry sau khi sai)". Suy luận gián tiếp duy nhất: nhìn `evidence.created_at` + `evidence_link.knowledge_node_id` sau khi Learner đã phản hồi — biết quyết định *kết quả là gì* nhưng không biết *AI đã cân nhắc gì trước khi chọn*. |
| 5 | Có phụ thuộc Application Layer Discipline không? | Không theo nghĩa thông thường (cơ chế tồn tại nhưng phụ thuộc app tuân thủ). Ở đây **không có cơ chế persistence nào để app tuân thủ cả** — đây là gap ở tầng schema, không phải ở tầng enforcement. |
| 6 | Risk level + mitigation | **Critical** (xem GAP-01). Teaching là loại quyết định AI có tần suất cao nhất trong toàn hệ thống (mọi tương tác dạy-học), và hiện tại có 0% traceability ở tầng lưu trữ. Mitigation: không tự thiết kế entity mới ở Round này theo đúng giới hạn được giao — chỉ flag để Founder/ChatGPT Lead Architect quyết định có cần 1 "Teaching Decision Log" (hoặc mở rộng `sub_session` thêm cột) ở vòng thiết kế tiếp theo. |

---

## 2. Assessment — AI đánh giá learner

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | Đánh giá `evidence` (và `evidence_link` liên quan), sinh `assessment_result`, cập nhật `knowledge_node_mastery`. |
| 2 | AI dựa trên dữ liệu nào? | `evidence` + `evidence_link` (stance/weight/target dimension), `knowledge_node_mastery` hiện tại (trạng thái trước khi đánh giá). |
| 3 | AI tạo ra dữ liệu nào? | `assessment_result` (đủ 8 trường theo DECISION-030, gồm `reasoning`), cập nhật `knowledge_node_mastery` (`last_assessment_result_id`, `version_number`), `trace_link` (assessment_result → evidence). |
| 4 | Có thể truy ngược đầy đủ không? | **CÓ về cấu trúc cốt lõi**: `assessment_result.knowledge_node_id` FK NOT NULL, `reasoning` CHECK không rỗng, `knowledge_node_mastery.last_assessment_result_id` FK NOT NULL — không thể tồn tại 1 Mastery record nào không trỏ về 1 AssessmentResult có lý do. **NHƯNG** lớp truy vết sâu hơn — AssessmentResult dựa trên Evidence cụ thể nào — chỉ tồn tại nếu `trace_link` tương ứng được tạo; không có FK/CHECK nào bắt buộc điều này ở tầng DB (đã ghi nhận từ Round 2). |
| 5 | Có phụ thuộc Application Layer Discipline không? | **CÓ** — đúng 1 điểm: việc tạo `trace_link` đi kèm `assessment_result`. |
| 6 | Risk level + mitigation | **High** (xem GAP-04). Mitigation đã đề xuất từ Round 2/3: tập trung việc tạo `assessment_result` + `trace_link` vào 1 service layer duy nhất, trong 1 transaction, không cho phép tạo `assessment_result` từ nhiều entry point khác nhau. |

---

## 3. Recommendation — AI đề xuất bước tiếp theo

> Không thiết kế bảng. Chỉ đánh giá: các dependency hiện có đã đủ chưa.

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | (Khi được build) tổng hợp các tín hiệu — knowledge regression, self-assessment mismatch, dependency gap, pause signal — thành 1 đề xuất bước tiếp theo cho Learner. |
| 2 | AI dựa trên dữ liệu nào? | `knowledge_node_mastery` + `assessment_result` + `evidence_link` (cho regression signal); `roadmap_node_knowledge_node` + `knowledge_node_mastery` (cho dependency gap signal — **đã sẵn sàng từ Round 3**); `learning_session` / `learning_session_transition` (cho pause signal — **đã sẵn sàng từ Round 1**); self-assessment mismatch signal — **CHƯA có nguồn dữ liệu** (phụ thuộc Discovery Module / `discovery_session`, chưa thiết kế). |
| 3 | AI tạo ra dữ liệu nào? | (Dự kiến) `recommendation_proposal` + `trace_link` liên quan — **chưa tồn tại bảng nào, đúng theo giới hạn của Round này.** |
| 4 | Có thể truy ngược đầy đủ không? | Không thể đánh giá đầy đủ vì entity chưa tồn tại. Điểm tích cực đã ghi nhận từ Round 3: `trace_link.source_type` đã có sẵn giá trị `'recommendation_proposal'` trong enum — traceability đã được "đặt trước chỗ" (provisioned ahead) cho lúc Recommendation được xây. |
| 5 | Có phụ thuộc Application Layer Discipline không? | Chưa áp dụng được — chưa có capability nào chạy. |
| 6 | Risk level + mitigation | Đối với câu hỏi cụ thể của Round 3.5 ("dependency hiện tại có đủ chưa"): **Medium** (xem GAP-06). 3/4 input signal đã sẵn sàng ở tầng dữ liệu; input còn thiếu (self-assessment mismatch) đã được biết trước, không gây rework cho Round 1-3, chỉ là điều kiện mở khóa cho Round 4+ liên quan Discovery Module. |

---

## 4. Knowledge Expansion — AI mở rộng Knowledge Graph

> Có 2 nhánh khác nhau theo `expansion_class` (DECISION-tương ứng KnowledgeGraphModel): **Local Expansion** (mở rộng nhỏ, không qua approval) và **Deep/Structural Expansion** (mở rộng lớn, có `expansion_record`). Phải tách riêng vì traceability khác nhau hoàn toàn.

### 4a. Deep / Structural Expansion

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | Mở rộng 1 `KnowledgeNode` bằng cách tạo node/cạnh con mới ở quy mô cấu trúc (deep/structural). |
| 2 | AI dựa trên dữ liệu nào? | `knowledge_node` hiện tại, `knowledge_edge` hiện có (tránh trùng lặp), ngữ cảnh RoadmapNode đang active. |
| 3 | AI tạo ra dữ liệu nào? | `knowledge_edge` mới + `expansion_record` (bắt buộc cho nhánh này). |
| 4 | Có thể truy ngược đầy đủ không? | **CÓ ở mức "node nào bị mở rộng, vì sao"** — `expansion_record.knowledge_node_id` FK NOT NULL, `expansion_reason` NOT NULL + CHECK không rỗng. **KHÔNG ở mức "cạnh cụ thể nào trong số nhiều cạnh được tạo ra"** — đã ghi nhận từ Round 3 (Risk #1, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)): không có FK từ `expansion_record` tới `knowledge_edge` vì cardinality (1 expansion → N edges?) chưa được Domain Architecture chốt. |
| 5 | Có phụ thuộc Application Layer Discipline không? | **CÓ** — app phải tạo `expansion_record` cùng giao dịch với `knowledge_edge` mới; không có cơ chế DB nào bắt buộc điều này. |
| 6 | Risk level + mitigation | **Medium** (xem GAP-03). Mitigation: chốt cardinality `ExpansionRecord ↔ KnowledgeEdge` ở vòng Domain Architecture tiếp theo trước khi viết SQL thật cho `expansion_record`/`knowledge_edge`. |

### 4b. Local Expansion

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | Mở rộng `KnowledgeNode` ở quy mô nhỏ (local), không qua approval, không tạo `expansion_record` (theo thiết kế hiện tại — `expansion_record` chỉ dành cho Deep/Structural). |
| 2 | AI dựa trên dữ liệu nào? | Tương tự 4a — `knowledge_node` + `knowledge_edge` hiện có. |
| 3 | AI tạo ra dữ liệu nào? | `knowledge_edge` mới. **Không có gì khác.** |
| 4 | Có thể truy ngược đầy đủ không? | **KHÔNG, và không có mức trung gian nào như 4a.** DECISION-027 (Explainability First) yêu cầu rõ Local Expansion "vẫn phải log lý do nội bộ truy vết được" — yêu cầu này đã được ghi nhận từ giai đoạn Domain Modeling (KnowledgeGraphModel.md, Open Question #21: "Domain Event KnowledgeNodeExpanded (Local) + lý do nội bộ — entity ghi log cụ thể: 🔶 OPEN") nhưng **chưa bao giờ được đóng** — không có entity, không có cột, không có cơ chế nào trong 19 bảng hiện tại lưu lý do cho Local Expansion. `knowledge_edge` bản thân không có cột `reason`. |
| 5 | Có phụ thuộc Application Layer Discipline không? | Không theo nghĩa thông thường — giống Teaching (mục 1), đây là **gap ở tầng schema**, không phải gap ở tầng tuân thủ: không có nơi nào để app "tuân thủ" ghi lý do vào, vì không tồn tại cột/bảng nào cho việc đó. |
| 6 | Risk level + mitigation | **Critical** (xem GAP-02). Đây là vi phạm trực tiếp một yêu cầu đã được Domain Architecture xác định bắt buộc (DECISION-027 áp dụng cho mọi thay đổi Knowledge Graph, không chỉ Deep/Structural) nhưng chưa từng được đóng ở tầng Database Design. Mitigation: cần Founder/Lead Architect quyết định ở vòng tiếp theo — hoặc (a) mở rộng `knowledge_edge` thêm cột lý do, hoặc (b) thiết kế 1 log entity riêng cho Local Expansion tương tự `expansion_record` nhưng nhẹ hơn. Không tự quyết định ở Round 3.5 vì vi phạm giới hạn "không thiết kế entity mới". |

---

## 5. Roadmap Construction — AI liên kết RoadmapNode ↔ KnowledgeNode

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | AI làm gì? | Đề xuất/tạo liên kết Dependency Edge giữa 1 `roadmap_node` và 1 `knowledge_node` (ghi vào `roadmap_node_knowledge_node`) khi mở rộng hoặc xây dựng Roadmap. |
| 2 | AI dựa trên dữ liệu nào? | `roadmap_node` đang được xây/mở rộng, `knowledge_node` liên quan, có thể cả `knowledge_edge` (suy luận chuỗi prerequisite để xác định KnowledgeNode nào cần gắn). |
| 3 | AI tạo ra dữ liệu nào? | 1 dòng `roadmap_node_knowledge_node`; theo quy trình Roadmap Governance hiện có (Round 1), **nên** có kèm 1 `approval_record` — nhưng không có gì bắt buộc về mặt schema rằng 2 việc này luôn đi cùng nhau. |
| 4 | Có thể truy ngược đầy đủ không? | **KHÔNG đầy đủ.** `roadmap_node_knowledge_node` không có cột lý do (đã xác định ở Round 3 là "Type B — Missing reason column entirely"). Mức truy vết tối đa hiện có: tìm `approval_record` nào có cùng `roadmap_node_id` — nhưng đây là granularity ở mức RoadmapNode, không phải ở mức "vì sao cặp dependency cụ thể (RoadmapNode X, KnowledgeNode Y) này được thêm" khi 1 approval_record có thể đi kèm nhiều dependency được thêm cùng lúc. |
| 5 | Có phụ thuộc Application Layer Discipline không? | **CÓ, và phụ thuộc 2 lớp**: (a) app phải luôn tạo `approval_record` đi kèm — không có FK bắt buộc điều này; (b) ngay cả khi (a) được tuân thủ hoàn hảo, độ chi tiết vẫn không đủ để phân biệt nhiều dependency trong cùng 1 approval — đây là gap về **cấu trúc**, không chỉ về **tuân thủ**. |
| 6 | Risk level + mitigation | **High** (xem GAP-05). Mitigation: cần Founder quyết định có thêm cột `dependency_reason` (nullable, không phá vỡ bảng hiện có) vào `roadmap_node_knowledge_node` ở vòng SQL Generation thật, hoặc chấp nhận rủi ro ở mức "biết và ghi nhận" (Application-Layer-dependent, partial traceability) cho v1. |

---

## 6. Tổng hợp theo loại quyết định AI

| Loại quyết định | Có persist quyết định không? | Truy ngược đầy đủ? | Mức phụ thuộc Application Layer | Risk |
|---|---|---|---|---|
| Teaching | ❌ Không | ❌ Không | N/A (không có cơ chế để phụ thuộc) | **Critical** |
| Assessment | ✅ Có (`assessment_result`) | 🔶 Cốt lõi có, evidence-link sâu thì không | Có (1 điểm: `trace_link`) | High |
| Recommendation | ⏳ Chưa build | N/A | N/A | Medium (dependency readiness) |
| Knowledge Expansion — Deep/Structural | ✅ Có (`expansion_record`) | 🔶 Có ở mức node, không ở mức edge cụ thể | Có (1 điểm) | Medium |
| Knowledge Expansion — Local | ❌ Không | ❌ Không | N/A (không có cơ chế để phụ thuộc) | **Critical** |
| Roadmap Construction | ✅ Có (`roadmap_node_knowledge_node`) nhưng không có lý do | ❌ Không (Type B) | Có (2 lớp) | High |

Chi tiết từng gap, mức độ nghiêm trọng chính thức và đề xuất xử lý: xem [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md).

## Liên kết ngược

[ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md), [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) (nếu file không tồn tại đúng số, xem mục Explainability First trong Decision Log liên quan).
