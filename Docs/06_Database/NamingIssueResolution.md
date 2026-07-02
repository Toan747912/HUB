# Naming Issue Resolution — AI Mentor OS

> Giải quyết toàn bộ Naming Issue đã phát hiện ở [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) mục 4, cộng thêm 2 ambiguity mới phát hiện khi soạn [DatabaseNamingConvention.md](DatabaseNamingConvention.md). Mỗi mục: Vấn đề → Nguồn gốc (Decision Log) → Giải pháp đặt tên → Trạng thái.
>
> **Cập nhật case sau Pre-DDL Platform Alignment** ([DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md)): mọi ví dụ cột dưới đây dùng `snake_case` (PostgreSQL/Supabase), thay cho PascalCase ban đầu — logic giải quyết ambiguity (tiền tố/hậu tố định danh) giữ nguyên 100%, không đổi.

## 1. "Explain" Collision (DECISION-017)

**Vấn đề:** "Explain" được dùng ở 2 lớp khác nhau trong Mastery Framework — (a) Mastery Level 2 (`Remember`/**`Explain`**/`Apply`/`Teach`) và (b) 1 trong 5 sub-capability của Teach (`Explain`/Simplify/Guide/Review/Transfer Knowledge). Nếu dùng tên cột trần `Explain` ở cả 2 nơi, không thể phân biệt khi đọc dữ liệu thô hoặc viết truy vấn.

**Nguồn gốc:** [DECISION-017-Mastery-Framework](../11_Decisions/DECISION-017-Mastery-Framework.md) mục "⚠️ Rủi ro kiến trúc cần lưu ý" — đã tự xác định rủi ro này từ Round 2, để ngỏ cho Database Design giải quyết.

**Giải pháp đặt tên:**

| Khái niệm | Tên cột/trường |
|---|---|
| Mastery Level 2 (trên `assessment_result`, `knowledge_node_mastery`) | `explain_level` (đi cùng `remember_level`, `apply_level` — hậu tố `_level` thống nhất cho 3 cấp độ rời rạc đầu, theo DECISION-020 chỉ Teach là ngoại lệ dùng score) |
| `Teach` (composite, theo DECISION-020) | `teach_score` — hậu tố `_score` thay vì `_level`, phản ánh đúng bản chất "weighted score" không phải đạt/chưa đạt |
| Sub-capability "Explain" của Teach | `teach_explain_score` — luôn mang tiền tố `teach_`, không bao giờ xuất hiện như tên cột trần `explain` ở bất kỳ đâu |
| 4 sub-capability còn lại của Teach | `teach_simplify_score`, `teach_guide_score`, `teach_review_score`, `teach_transfer_knowledge_score` |

**Quy tắc tổng quát rút ra:** mọi trường thuộc về Teach Capability Cluster **bắt buộc** tiền tố `teach_`, không có ngoại lệ — áp dụng dù Step 4B chọn lưu 5 sub-capability dưới dạng 5 cột phẳng trên `assessment_result`/`knowledge_node_mastery`, hay dưới dạng bảng con/JSON riêng (`teach_capability_score` với cột `capability_name`/`capability_score` — nếu chọn hướng này, giá trị `capability_name = 'explain'` vẫn nằm trong ngữ cảnh đã định danh rõ bằng tên bảng `teach_capability_score`, không gây nhầm với `explain_level`).

**Trạng thái: ✅ Đã giải quyết.**

---

## 2. "Weight" Collision (DECISION-020 / DECISION-021 / DECISION-022)

**Vấn đề:** "Weight" xuất hiện ở ít nhất 2 ngữ cảnh khác bản chất — (a) `capability_weight`: trọng số giữa 5 sub-capability của Teach (DECISION-020, tự flag nguy cơ nhầm trong mục Consequences), và (b) `evidence_weight`: trọng số của 1 `EvidenceLink` quyết định Knowledge Regression (DECISION-021, sau đó DECISION-022 xác nhận Weight thuộc về từng `EvidenceLink`, không phải `Evidence` cấp tổng).

**Nguồn gốc:** [DECISION-020-Teach-Composite-Capability](../11_Decisions/DECISION-020-Teach-Composite-Capability.md) mục Consequences — "cần tên field phân biệt (`capability_weight` vs `evidence_weight`)", đã tự đặt yêu cầu nhưng chưa tự khóa tên cụ thể.

**Giải pháp đặt tên:**

| Khái niệm | Tên cột/trường | Vị trí |
|---|---|---|
| Trọng số 1 sub-capability của Teach | `teach_capability_weight` | Nếu lưu dạng bảng con `teach_capability_score` — đi cùng `capability_score` |
| Trọng số 1 `evidence_link` | `evidence_weight` | Trên `evidence_link` (theo DECISION-022, không phải trên `evidence`) |

**Quy tắc tổng quát:** không bao giờ dùng tên cột trần `weight` ở bất kỳ bảng nào — luôn mang tiền tố ngữ cảnh (`teach_`/`evidence_`...), nhất quán với quy tắc đã áp dụng cho "explain" ở mục 1.

**Trạng thái: ✅ Đã giải quyết.**

---

## 3. `RoadmapNode` vs `KnowledgeNode` Self-Reference Ambiguity (LogicalDatabaseModel.md Risk #5)

**Vấn đề:** cả 2 entity đều có khái niệm "tự tham chiếu" nhưng bản chất khác nhau — `RoadmapNode` là **cây** (1 cha), `KnowledgeNode` là **DAG** (nhiều cha, qua bảng `KnowledgeEdge` riêng, không phải cột tự tham chiếu trực tiếp). [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) mục 4 (#3) đã cảnh báo nguy cơ đặt tên cột giống nhau kiểu `ParentId` generic ở 2 bảng khác bản chất.

**Nguồn gốc:** [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 8, Risk #5 — "2 kiểu self-reference khác bản chất... cần đảm bảo Physical Design không nhầm áp dụng cùng 1 pattern lưu trữ".

**Giải pháp đặt tên:**

| Entity | Cột/Cơ chế | Không dùng |
|---|---|---|
| `roadmap_node` (cây, 1 cha) | `parent_roadmap_node_id` (cột tự tham chiếu trực tiếp trên chính bảng `roadmap_node`) | `parent_id` (trần, không định danh bảng) |
| `knowledge_node` (DAG, nhiều cha) | **Không có cột tự tham chiếu trên `knowledge_node`** — quan hệ nằm hoàn toàn ở bảng `knowledge_edge` riêng (`from_knowledge_node_id`/`to_knowledge_node_id`, mục 4 [DatabaseNamingConvention.md](DatabaseNamingConvention.md)) | Không tạo `parent_knowledge_node_id` trên `knowledge_node` dưới mọi hình thức — vi phạm DECISION-039 (đã chọn bảng quan hệ + Recursive CTE cho DAG, không phải cây) |

**Trạng thái: ✅ Đã giải quyết** (tên cột đã khác nhau hoàn toàn về cấu trúc, không chỉ về tên — loại bỏ rủi ro nhầm pattern lưu trữ tận gốc, không chỉ nhầm tên).

---

## 4. `TraceLink.SourceType`/`TargetType` Open Enum Ambiguity (DatabaseBlueprintReview.md #2)

**Vấn đề:** nếu `source_type`/`target_type` là `text` tự do (không enum/check constraint đóng), vi phạm tinh thần "định kiểu rõ" mà [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) đặt ra khi từ chối Polymorphic FK tự do — 1 giá trị `source_type` sai chính tả (ví dụ `"assesment_result"`) sẽ không bị chặn ở tầng database.

**Nguồn gốc:** [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) mục 4, Naming Issue #2.

**Giải pháp đặt tên:**

- `source_type` — danh sách giá trị đóng, khớp đúng Scope đã chốt ở [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6: `assessment_result`, `recommendation_proposal`, `local_expansion` (3 nhóm nguồn đã xác định — không tự thêm nhóm nào ngoài Decision Log).
- `target_type` — danh sách giá trị đóng: `evidence`, `assessment_result`, `discovery_session` (3 nhóm đích đã xác định).
- Thực thi bằng `ck_trace_link_source_type` / `ck_trace_link_target_type` (Check Constraint, mục 7 [DatabaseNamingConvention.md](DatabaseNamingConvention.md)) — **không dùng bảng tra cứu (lookup table) riêng cho 2 enum này** ở phiên bản đầu, vì danh sách ngắn, ổn định, ít thay đổi (nhất quán với triết lý "đơn giản trước" đã áp dụng ở DECISION-029/DECISION-039). Tùy chọn nâng cấp: PostgreSQL `ENUM` native thay cho `CHECK` (xem [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 12).

**Trạng thái: ✅ Đã giải quyết** ở mức đặt tên + cơ chế ràng buộc (Check Constraint) — danh sách giá trị cụ thể là enum cố định trích từ Decision Log, không phải giá trị tự bịa.

---

## 5. `Type` Overload — `TraceLink.SourceType`/`TargetType` vs `EvidenceLink` Direction (Open Question #14 kế thừa)

**Vấn đề:** [DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) chuyển chiều support/refute từ field `type` cấp `Evidence` (cũ) sang thuộc tính riêng của từng `EvidenceLink` — nhưng chưa khóa tên field mới, và [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 14 ("Field `type` cấp Evidence còn cần không") vẫn còn mở. Nếu đặt tên field mới này cũng là `Type`, sẽ trùng ngữ nghĩa với `SourceType`/`TargetType` của `TraceLink` (mục 4) — 2 khái niệm khác hẳn nhau (chiều ủng hộ/phản bác vs loại entity đa hình) nhưng cùng tên `Type` sẽ gây đọc nhầm khi cùng xuất hiện trong 1 schema.

**Nguồn gốc:** [DECISION-022-Evidence-KnowledgeNode-M2M](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) Consequences + [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 14 — phát hiện mới khi soạn Naming Convention, chưa từng được ghi nhận ở `DatabaseBlueprintReview.md`.

**Giải pháp đặt tên:**

- `evidence_link` — cột chiều ủng hộ/phản bác đặt tên **`stance`** (giá trị đóng: `support`/`refute`), **không đặt tên `type`**.
- Quy tắc xuyên hệ thống: **"`type`" chỉ dùng làm discriminator cho loại entity đa hình** (`trace_link.source_type`/`target_type`) — mọi khái niệm "chiều/hướng nghiệp vụ" khác (support/refute, sau này nếu có thêm) phải dùng từ khác (`stance`, `direction`...), không tái sử dụng `type`.
- Điều này cũng **đóng góp 1 phần** cho Open Question #14: field `type` cấp `Evidence` (cũ, toàn cục) chính thức **không cần tồn tại** ở tầng đặt tên — vì chiều support/refute đã có chỗ rõ ràng ở cấp `evidence_link` (`stance`), không cần hồi sinh field `type` cấp `evidence`. **Không tự đóng hoàn toàn Open Question #14** (đây là quyết định đặt tên, không phải quyết định domain) — chỉ xác nhận tên gọi sẽ không tái dùng nếu Founder/ChatGPT quyết định không cần field cấp Evidence.

**Trạng thái: ✅ Đã giải quyết** ở phạm vi đặt tên (loại bỏ nguy cơ trùng tên `type`); Open Question #14 (có cần field cấp Evidence hay không) **vẫn để ngỏ cho Founder/ChatGPT**, không bị ảnh hưởng bởi quyết định đặt tên này.

---

## 6. Tóm tắt trạng thái

| # | Naming Issue | Nguồn | Trạng thái |
|---|---|---|---|
| 1 | "Explain" collision | DECISION-017 | ✅ Đã giải quyết — `ExplainLevel` vs `Teach*Score` |
| 2 | "Weight" collision | DECISION-020/021/022 | ✅ Đã giải quyết — `TeachCapabilityWeight` vs `EvidenceWeight` |
| 3 | `RoadmapNode`/`KnowledgeNode` self-reference | LogicalDatabaseModel.md Risk #5 | ✅ Đã giải quyết — cấu trúc khác nhau, không chỉ tên khác nhau |
| 4 | `TraceLink` enum tự do | DatabaseBlueprintReview.md #2 | ✅ Đã giải quyết — enum đóng + Check Constraint |
| 5 | `Type` overload (`TraceLink` vs `EvidenceLink`) | DECISION-022 + Open Question #14 | ✅ Đã giải quyết ở phạm vi đặt tên (`Stance` thay `Type`) |

**Không còn Naming Issue nào được biết tới mà chưa có giải pháp đặt tên.**

## 7. DDL Readiness Confirmation

**READY_FOR_DDL** *(xác nhận lại sau Pre-DDL Platform Alignment — xem [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md))*

Căn cứ:
- [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) đã kết luận READY_FOR_DDL cho cấu trúc bảng/quan hệ (Step 4A).
- [DatabaseNamingConvention.md](DatabaseNamingConvention.md) khóa đầy đủ 12 hạng mục quy ước đặt tên (Table/Column/PK/FK/Unique/Index/Check/Default/Temporal/Audit/Versioning/Traceability) — **case đã cập nhật sang `snake_case`** theo [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md), Temporal/Versioning đã cập nhật theo [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)/[DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md).
- Toàn bộ 5 Naming Issue đã biết (3 từ Review, 2 phát hiện thêm khi soạn Convention) đều có giải pháp đặt tên cụ thể, không còn điểm mơ hồ nào ảnh hưởng tới việc viết tên cột/bảng ở Step 4B — logic giải quyết giữ nguyên qua đổi case.
- [DECISION-043-Supabase-Auth-Alignment](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) đã chốt `learner.id` là ngoại lệ duy nhất của quy tắc PK (mục 3 [DatabaseNamingConvention.md](DatabaseNamingConvention.md)).
- Không có Naming Issue nào đòi hỏi quay lại sửa Domain/Logical Model hay Database Blueprint — toàn bộ giải pháp ở mức đặt tên/ràng buộc, không đổi entity/quan hệ/cardinality nào đã khóa.

**Có thể bắt đầu Step 4B — DDL Generation**, áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (bản `snake_case`) làm chuẩn bắt buộc cho toàn bộ `CREATE TABLE`/cột/constraint/index sắp viết.

## Liên kết ngược

[DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DatabaseBlueprint.md](DatabaseBlueprint.md), [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md), [DECISION-017](../11_Decisions/DECISION-017-Mastery-Framework.md), [DECISION-020](../11_Decisions/DECISION-020-Teach-Composite-Capability.md), [DECISION-021](../11_Decisions/DECISION-021-Evidence-Weighting.md), [DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md).
