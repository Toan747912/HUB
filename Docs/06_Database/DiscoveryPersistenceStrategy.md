# Discovery Persistence Strategy — `claimed_skill_area`

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — đề xuất thiết kế, chưa Decision khóa.** Trả lời trực tiếp [DiscoveryCompletionCriteria.md](../03_Domain_Model/DiscoveryCompletionCriteria.md) mục 4 ("`claimed_skill_area` chưa có chỗ bền vững") và [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) Risk #3 ("chưa có cơ chế map ngược" `knowledge_node_id`). Tài liệu này **đề xuất sửa đổi schema** đã có ở [DiscoverySchema_Draft.sql](DiscoverySchema_Draft.sql) — không tự sửa file đó, chỉ đề xuất ở đây (xem mục 7).

## 1. Là Value Object hay Entity?

**Cả hai, ở 2 mức khác nhau:**

- **Cái tên kỹ năng (`label`) là Value Object** — `"REST API design"` không có định danh riêng, định nghĩa hoàn toàn bởi nội dung text, bất biến.
- **"Sự kiện claim 1 kỹ năng trong 1 phiên cụ thể" là Entity** — vì [DiscoveryCompletionCriteria.md](../03_Domain_Model/DiscoveryCompletionCriteria.md) mục 4 yêu cầu **theo dõi coverage** ("100% `claimed_skill_area` có ≥1 `CompetencySignal`") — muốn theo dõi từng mục đã/chưa được probe, cần định danh ổn định để tham chiếu qua lại giữa `claimed_skill_area` và `CompetencySignal`. 1 Value Object thuần (không định danh) không đủ để làm đầu FK.

**Kết luận:** `ClaimedSkillArea` là **Supporting Persistence Entity** (cùng phân loại `DiscoveryQuestion`/`DiscoveryAnswer`/`CompetencySignal`, [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) header) — wrap quanh 1 Value Object (`label`), có định danh riêng (`claimed_skill_area_id`) chỉ để phục vụ tham chiếu/coverage-tracking, không mang thêm nghiệp vụ nào khác.

## 2. Lưu trực tiếp trong `DiscoverySession` (cột JSON) hay bảng riêng?

**Đề xuất: bảng riêng, không phải cột JSON/mảng trên `discovery_session`.**

Lý do:
1. **Cần FK đích cho `CompetencySignal`** (mục 5) — 1 cột JSON không thể là đích của Foreign Key, phá vỡ khả năng JOIN/constraint mà toàn schema còn lại đang dùng nhất quán ([DatabaseNamingConvention.md](DatabaseNamingConvention.md)).
2. **Coverage tracking cần query "đã có CompetencySignal chưa"** theo từng mục — dễ làm bằng `LEFT JOIN`/`EXISTS` trên bảng quan hệ, khó/chậm hơn nếu phải parse JSON mỗi lần.
3. **Không có tiền lệ dùng cột JSON cho dữ liệu có cấu trúc lặp** ở bất kỳ bảng nào trong 19 bảng Round 1-3 hay `DiscoverySchema_Draft.sql` — giữ nhất quán phong cách "mỗi loại sự vật lặp lại = 1 bảng riêng" đã dùng xuyên hệ thống (ví dụ `DiscoveryQuestion`, `competency_signal`).

## 3. Được trích xuất từ `DiscoveryAnswer` như thế nào?

**Không trực tiếp 1:1 từ 1 `DiscoveryAnswer`** — `claimed_skill_area` là sản phẩm phái sinh của **Goal Clarifier Prompt** (Capability #1, [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 2), không phải Competency Probing. Quy trình:

```
DiscoveryAnswer(s) (trả lời cho câu hỏi Goal Clarification)
        │
        ▼
  Goal Clarifier Prompt → result.clarified_goal
        │
        ▼ (Application Layer trích xuất, khi clarified_goal được chấp nhận)
  ClaimedSkillArea[] (1 hoặc nhiều, mỗi cái 1 row)
```

**Traceability:** mỗi `ClaimedSkillArea` cần `traced_to` về `DiscoveryAnswer` đã dùng để suy ra nó — tái dùng đúng pattern junction table đã đề xuất cho `CompetencySignal.source_answer_ids[]` ở [DiscoverySchema_Draft.sql](DiscoverySchema_Draft.sql) mục 5 (`competency_signal_source_answer`), không phát minh cơ chế mới — xem mục 7 bảng `claimed_skill_area_source_answer`.

## 4. Quan hệ với `CompetencySignal` — thay đổi đề xuất quan trọng

**Phát hiện trong lượt này:** thiết kế lượt 1 (`CompetencySignal.knowledge_node_id`, nullable) có vấn đề — cột FK chính lại là cột **có thể rỗng**, trong khi `ClaimedSkillArea` (luôn tồn tại, vì luôn có ngay sau Goal Clarification) lại không được dùng làm điểm neo. Điều này khiến truy vấn coverage ([DiscoveryCompletionCriteria.md](../03_Domain_Model/DiscoveryCompletionCriteria.md) mục 4) khó viết đúng khi `knowledge_node_id` rỗng.

**Đề xuất sửa:** `CompetencySignal` trỏ tới `claimed_skill_area_id` (**NOT NULL** — luôn tồn tại) làm FK chính, thay vì `knowledge_node_id` (nullable) làm FK chính như thiết kế cũ. `knowledge_node_id` không còn là cột trực tiếp trên `competency_signal` nữa — quan hệ với `KnowledgeNode` (nếu có) đi gián tiếp qua `ClaimedSkillArea` (mục 5). Đây là **sửa đổi đề xuất cho bảng đã thiết kế ở lượt trước**, chưa áp dụng vào file `.sql` (xem mục 7).

## 5. Mapping sang Knowledge Node — sau này như thế nào?

**Không dùng 1 cột `knowledge_node_id` nullable trực tiếp trên `claimed_skill_area`** (đây là cách lượt 1 từng làm cho `competency_signal`, và đã thấy vấn đề ở mục 4). Thay vào đó, **tái dùng đúng pattern đã có tiền lệ khóa**: `roadmap_node_knowledge_node` ([DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)) — bảng nối M:N, có `removed_at` để giữ lịch sử khi remap, partial unique index `WHERE removed_at IS NULL`.

Đề xuất bảng mới `claimed_skill_area_knowledge_node`:

| Cột | Ý nghĩa |
|---|---|
| `claimed_skill_area_id` | FK → `claimed_skill_area` |
| `knowledge_node_id` | FK → `knowledge_node` |
| `mapped_at` | Khi mapping này được tạo |
| `removed_at` | Nullable — khi mapping bị thay (giữ lịch sử, không xóa cứng, nhất quán mọi nơi khác) |
| `mapped_by_actor_type` | `ai_service` (Knowledge/Roadmap Engine tự map) hoặc `backend_core` (job backfill) |

**Ai ghi vào bảng này?** Không phải Discovery (Discovery không sở hữu `KnowledgeNode`, [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) mục 2 — giữ nguyên ranh giới). Bảng này **không thuộc Aggregate `DiscoverySession`** — giống `roadmap_node_knowledge_node` không thuộc riêng Roadmap hay Knowledge — là 1 bảng nối cross-domain ở tầng hạ tầng, ghi bởi bất kỳ capability nào tạo `KnowledgeNode` tương ứng (thường là Knowledge Node Expansion hoặc bước khởi tạo Knowledge Graph ban đầu của Roadmap Engine — cả 2 đều ngoài phạm vi Discovery/Phase 1).

## 6. Nếu Knowledge Graph chưa tồn tại?

**Hoàn toàn hợp lệ — đây là trạng thái mặc định cho onboarding lần đầu.** `ClaimedSkillArea` tồn tại độc lập, không phụ thuộc `KnowledgeNode` nào:

- `claimed_skill_area_knowledge_node` đơn giản có **0 dòng** cho `claimed_skill_area_id` đó.
- `CompetencySignal` vẫn ghi được bình thường (FK chính là `claimed_skill_area_id`, không phải `knowledge_node_id` — mục 4) — Competency Probing **không bao giờ bị chặn** bởi việc Knowledge Graph chưa tồn tại.
- Khi Roadmap Engine sau này tạo Knowledge Graph ban đầu từ `clarified_goal`, nó **có thể** (không bắt buộc, không có deadline) backfill `claimed_skill_area_knowledge_node` cho các `ClaimedSkillArea` khớp ngữ nghĩa với `KnowledgeNode` mới tạo — đây là 1 quá trình **best-effort, eventual**, không phải đồng bộ bắt buộc.

**Điều này giải quyết dứt điểm Risk #3 cũ ở [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md)** ("chưa có cơ chế map ngược khi node được tạo sau") — cơ chế map ngược chính là backfill `claimed_skill_area_knowledge_node`, dùng đúng pattern đã có tiền lệ (`roadmap_node_knowledge_node`), không phải phát minh mới.

## 7. Đề xuất sửa đổi `DiscoverySchema_Draft.sql` (chưa áp dụng, chỉ đề xuất)

| Bảng | Thay đổi |
|---|---|
| `claimed_skill_area` *(mới)* | `claimed_skill_area_id` (PK), `discovery_session_id` (FK), `label` (text), `created_at`/`created_by_actor_type` — append-only |
| `claimed_skill_area_source_answer` *(mới, junction)* | `claimed_skill_area_id`, `discovery_answer_id` — cùng pattern `competency_signal_source_answer` đã có |
| `claimed_skill_area_knowledge_node` *(mới, junction)* | Xem mục 5 |
| `competency_signal` *(sửa)* | **Đổi** `knowledge_node_id` (nullable, FK trực tiếp) **thành** `claimed_skill_area_id` (NOT NULL, FK chính) — bỏ FK trực tiếp tới `knowledge_node`, quan hệ đi gián tiếp qua `claimed_skill_area_knowledge_node` |
| `self_assessment_mismatch` *(sửa)* | `knowledge_node_id` denormalized hiện tại nên đổi nguồn sao chép — từ `competency_signal.knowledge_node_id` (không còn tồn tại) sang JOIN qua `claimed_skill_area_knowledge_node` (có thể NULL nếu chưa map — cần xác nhận `self_assessment_mismatch.knowledge_node_id` có nên nullable, khác thiết kế NOT NULL ở lượt 1) |

**Không tự sửa file `.sql` trong lượt này** — đây là đề xuất, để giữ nguyên tắc mỗi lượt review không tự động ghi đè artifact trước mà không có điểm dừng tổng hợp (xem [DiscoveryReadinessReview.md](../REVIEWS/DiscoveryReadinessReview.md) cho đánh giá tổng thể trước khi áp dụng).

## 8. Risks

1. **Thay đổi FK chính của `competency_signal` (mục 4, 7) là sửa đổi đáng kể cho 1 bảng đã "thiết kế xong" ở lượt 1** — chưa được Founder duyệt, có thể coi là rework không nhỏ nếu đã có kỳ vọng schema lượt 1 là final.
2. **`self_assessment_mismatch.knowledge_node_id` nullable hay không** chưa quyết — nếu nullable, D7 (Explainability) cho mismatch có thể thiếu `knowledge_node_id` cụ thể trong giai đoạn chưa mapping, ảnh hưởng tới khả năng Recommendation Engine action theo node cụ thể.
3. **Backfill `claimed_skill_area_knowledge_node` là "best-effort, eventual"** — không có cam kết về độ trễ, không có cơ chế phát hiện "label nào chưa bao giờ được map" để cảnh báo — đề xuất ngoài phạm vi Phase 1.
4. **`claimed_skill_area.label` không chuẩn hóa** — 2 `DiscoverySession` khác nhau có thể tạo 2 label gần giống nhau cho cùng 1 khái niệm thật (ví dụ "REST API" vs "RESTful API design") — không có cơ chế de-dup/canonicalization, có thể gây khó khăn cho bước backfill mapping (mục 6).
