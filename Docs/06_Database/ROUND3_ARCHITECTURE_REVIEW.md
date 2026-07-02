# Round 3 Architecture Review — Can Round 1+2+3 Support AI Teaching/Assessment/Recommendation/Explainability?

> Validation toàn diện theo yêu cầu Round 3: xác nhận Round 1 ([DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)) + Round 2 ([DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md)) + Round 3 ([DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)) — **19 bảng tổng cộng** — có hỗ trợ được 4 năng lực AI cốt lõi mà không có hidden architectural gap. **Không thiết kế thêm bảng mới ở tài liệu này** — đây là review/validation, đối chiếu lại 19 bảng đã có.

## 0. Danh sách 19 bảng đã thiết kế tới giờ (tham chiếu nhanh)

| Round | Module | Bảng |
|---|---|---|
| 1 | Identity | `learner` |
| 1 | Goal | `goal` |
| 1 | Roadmap | `roadmap`, `roadmap_node`, `approval_record` |
| 1 | Learning Session | `learning_session`, `sub_session`, `learning_session_transition` |
| 2 | Knowledge | `knowledge_node`, `knowledge_edge`, `knowledge_node_mastery` |
| 2 | Evidence | `evidence`, `evidence_link` |
| 2 | Assessment | `assessment_result` |
| 2 | Traceability | `trace_link` |
| 3 | Roadmap↔Knowledge | `roadmap_node_knowledge_node` |
| 3 | Knowledge | `expansion_record` |

---

## 1. Focus Area 1 — `roadmap_node ↔ knowledge_node` Relationship

**Đã đóng ở Round 3** (`roadmap_node_knowledge_node`, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1). Đây là gap **quan trọng nhất** trong toàn bộ Step 4B tính tới Round 2 — không có bảng này, **AI Teaching không có cách nào (ở tầng dữ liệu) biết RoadmapNode đang dạy yêu cầu những KnowledgeNode nào** (xem mục 2.1 dưới). Việc đóng gap này ở Round 3 là điều kiện **tiên quyết**, không phải tùy chọn, để bất kỳ capability nào trong 4 capability được yêu cầu validate có thể hoạt động đúng end-to-end.

## 2. Focus Area 2 — `expansion_record` Design

**Đã đóng ở Round 3** ([DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.2), với 1 giới hạn đã ghi nhận rõ: không có FK tới `knowledge_edge` cụ thể (cardinality `ExpansionRecord ↔ KnowledgeEdge` chưa chốt ở Domain Architecture). Đủ để thỏa **yêu cầu tối thiểu** của DECISION-023 (mọi Deep/Structural Expansion phải có lý do hiển thị, truy vết được **tới đúng `knowledge_node` nào bị Expand**), nhưng **không đủ** để trả lời câu hỏi chi tiết hơn "đúng cạnh nào trong số nhiều cạnh được tạo ra từ lần Expand cụ thể này" — xem mục 4 (Explainability Integrity Guarantees) cho phân tích đầy đủ.

## 3. Focus Area 3 — Explainability Integrity Guarantees

> Tổng hợp **toàn bộ** điểm "tích hợp tính giải trình" xuyên 19 bảng — không chỉ lặp lại phát hiện Round 2 (`trace_link`), mà đối chiếu **mọi** cơ chế explainability đã thiết kế tới giờ, xem cơ chế nào có DB-level guarantee và cơ chế nào chỉ là quy ước Application Layer.

| Cơ chế Explainability | Bảng liên quan | DB-level guarantee? | Chi tiết |
|---|---|---|---|
| `assessment_result.reasoning` không rỗng | `assessment_result` | ✅ **Có** — `CHECK` constraint, DB tự chặn | Round 2 |
| `assessment_result` → KnowledgeNode | `assessment_result.knowledge_node_id` | ✅ **Có** — FK `NOT NULL` | Round 2 |
| `assessment_result` → Evidence ("Evidence References") | `trace_link` | ❌ **Không** — không FK, không CHECK nào bắt buộc tồn tại ≥1 `trace_link` tương ứng | Round 2, đã flag |
| `knowledge_node_mastery` → `assessment_result` mới nhất | `knowledge_node_mastery.last_assessment_result_id` | ✅ **Có** — FK `NOT NULL` | Round 2 |
| `expansion_record.expansion_reason` không rỗng | `expansion_record` | ✅ **Có** — `CHECK` constraint | Round 3 |
| `expansion_record` → KnowledgeNode bị Expand | `expansion_record.knowledge_node_id` | ✅ **Có** — FK `NOT NULL` | Round 3 |
| `expansion_record` → `knowledge_edge` cụ thể được tạo ra | *(không có cột nào)* | ❌ **Không** — không có cơ chế nào, kể cả ở Application Layer (chưa thiết kế) | Round 3, mới phát hiện |
| `learning_session_transition` → tác nhân kích hoạt Pause | `transition_actor_type` | ✅ **Có** — `CHECK` enum, `NOT NULL` | Round 1 |
| `approval_record` → Learner đã phê duyệt | `approval_record.approved_by_learner_id` | ✅ **Có** — FK `NOT NULL` | Round 1 |
| `roadmap_node_knowledge_node` → lý do Dependency Edge được thêm | *(không có cột lý do)* | ❌ **Không có cột `reason`** — chỉ biết "dependency này tồn tại", không biết "AI đề xuất dependency này vì sao" | Round 3, mới phát hiện |

### Phát hiện chính: **2 loại "Explainability Integrity Gap" khác bản chất, không nên gộp chung**

1. **Loại A — "Reference completeness" (giống `trace_link`):** DB lưu đủ cột để giải thích, nhưng **liên kết bắt buộc giữa 2 bảng không được DB enforce** (`assessment_result` ↔ `trace_link`/`evidence`; `expansion_record` ↔ `knowledge_edge`). Đây là rủi ro **vận hành** (Application Layer phải tự đảm bảo), không phải rủi ro **thiết kế thiếu cột**.
2. **Loại B — "Missing reason column" (mới phát hiện ở `roadmap_node_knowledge_node`):** bảng này **hoàn toàn không có cột lý do** — khác với `expansion_record`/`assessment_result` (luôn có `reasoning`/`expansion_reason` bắt buộc). Nếu Learner hỏi "vì sao RoadmapNode này lại phụ thuộc KnowledgeNode kia", **không có nơi nào trong DB trả lời được** — đây không phải lỗi Application Layer, mà là **thiếu sót thiết kế cột** ở Round 3.

**Đánh giá mức độ nghiêm trọng của phát hiện mới (Loại B):** Theo Human Control Boundary đã chốt ([AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 3), "Roadmap Proposal" (bao gồm cả việc gắn Dependency Edge mới khi mở RoadmapNode) thuộc nhóm **"AI đề xuất, cần Learner xác nhận"** — và mọi capability tạo ra Dependency Edge **nên** đi qua `approval_record` (đã có cơ chế lý do ở đó: `approval_record.change_description`, Round 1). Vì vậy: **không phải lúc nào cũng thiếu lý do hoàn toàn** — nếu Application Layer luôn tạo `roadmap_node_knowledge_node` **cùng lúc** với 1 `approval_record` mô tả thay đổi, lý do vẫn truy được (qua `approval_record.roadmap_node_id` trỏ tới đúng RoadmapNode, dù không trỏ trực tiếp tới dependency cụ thể). Đây **làm giảm** mức độ nghiêm trọng từ "Loại B hoàn toàn không trả lời được" xuống "Loại A" (phụ thuộc Application Layer luôn tạo `approval_record` đi kèm) — nhưng **không loại bỏ hoàn toàn** vì `approval_record.roadmap_node_id` không đủ chi tiết để biết **chính xác cặp dependency nào** trong số nhiều dependency có thể được thêm cùng lúc.

**Kết luận Focus Area 3:** Explainability Integrity hiện tại là **"đủ cấu trúc, không đủ enforcement"** — đúng nhận định đã có từ Round 2, nay được xác nhận lại và **mở rộng phạm vi** sang `expansion_record` và `roadmap_node_knowledge_node`. Không có gap nào trong số này là **kiến trúc sai** — tất cả đều là đánh đổi đã biết (PostgreSQL không hỗ trợ FK đa hình; bảng nối M:N thuần không có cột nội dung tự nhiên) — nhưng **tổng số điểm phụ thuộc Application Layer đã tăng từ 1 (Round 2: `trace_link`) lên 3 (Round 3: + `expansion_record`↔`knowledge_edge`, + `roadmap_node_knowledge_node`↔lý do)**.

## 4. Focus Area 4 — Recommendation Dependencies

**Câu hỏi:** Recommendation Engine cần gì, và Round 1+2+3 đã cung cấp được bao nhiêu?

| Input cần cho Recommendation ([AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 2, Capability #13) | Có sẵn sau Round 1+2+3? | Bảng cung cấp |
|---|---|---|
| `KnowledgeRegressionDetected` (tín hiệu suy giảm hiểu biết) | 🟡 **Một phần** — dữ liệu nguồn (`knowledge_node_mastery`, `assessment_result`, `evidence_link.evidence_weight`) đã có đủ để **tính ra** tín hiệu này, nhưng **không có bảng/cột nào lưu chính sự kiện `KnowledgeRegressionDetected`** — đây là 1 Domain Event, chưa được thiết kế thành persistence nào (có thể không cần — Domain Event có thể chỉ tồn tại runtime, không cần lưu — nhưng nếu Recommendation cần truy vết "tín hiệu nào dẫn tới đề xuất này", cần có nơi lưu) | `knowledge_node_mastery`, `assessment_result`, `evidence_link` |
| `SelfAssessmentMismatch` (Discovery Domain) | ❌ **Chưa có** — `discovery_session`/`self_assessment_mismatch` hoàn toàn ngoài phạm vi Round 1-3, thuộc Discovery Module (chưa tới lượt) | — |
| Dependency gaps (Knowledge Graph) | ✅ **Có đầy đủ** — `roadmap_node_knowledge_node` (Round 3) + `knowledge_edge` (Round 2) đủ để tính "Learner đang thiếu KnowledgeNode nào so với yêu cầu của RoadmapNode đang học" | `roadmap_node_knowledge_node`, `knowledge_edge`, `knowledge_node_mastery` |
| Pause signal (`LearningSession`) | ✅ **Có đầy đủ** — `learning_session.state`, `learning_session_transition` (Round 1) | `learning_session`, `learning_session_transition` |
| Nơi lưu `RecommendationProposal` chính nó | ❌ **Chưa có** — entity này hoàn toàn chưa được thiết kế ở bất kỳ Round nào tới giờ | — |
| `trace_link` hỗ trợ `RecommendationProposal.traced_to[]` | ✅ **Đã sẵn chỗ** — `trace_link.source_type` đã bao gồm `'recommendation_proposal'` trong enum từ Round 2 ([PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6 Scope, kế thừa nguyên trạng) — **không cần sửa `trace_link` khi `recommendation_proposal` được thiết kế ở Round sau** | `trace_link` |

**Kết luận Focus Area 4:** Recommendation Engine **CHƯA thể hoạt động end-to-end** sau Round 1+2+3 — đây **không phải lỗi/gap ngoài ý muốn**, vì Recommendation Module (cùng Discovery, Mentor Interaction) đã được xác định từ Round 2 là "Round 3+" (ngoài phạm vi, [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 5 Risk #3, [README.md](README.md)). **Điểm quan trọng cần xác nhận:** nền tảng dữ liệu mà Recommendation sẽ cần đọc (Dependency gaps, Pause signal, Mastery/Evidence) **đã sẵn sàng và không cần sửa lại** khi `recommendation_proposal`/`discovery_session` được thiết kế — đây là **tin tốt**, không phải gap. Gap thật duy nhất là **2 bảng chưa tồn tại** (`recommendation_proposal`, `discovery_session`/`self_assessment_mismatch`), đã biết trước, có kế hoạch (Round 4).

## 5. Focus Area 5 — Cross-Module Consistency Review

Đã thực hiện chi tiết ở [DDL_ROUND3_REVIEW.md](DDL_ROUND3_REVIEW.md) mục 1.1 (pattern soft-state) — tổng hợp thêm các điểm xuyên-module khác:

| Kiểm tra xuyên module | Kết quả |
|---|---|
| Mọi bảng append-only (10/19: `goal`, `approval_record`, `learning_session_transition`, `knowledge_edge`, `evidence`, `evidence_link`, `assessment_result`, `trace_link`, `expansion_record`) đều thiếu nhất quán `updated_at`/`updated_by_*`/`version_number`/History Table | ✅ Nhất quán 100% |
| Mọi bảng Current State Snapshot (9/19: `learner`, `roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `knowledge_node_mastery`, `roadmap_node_knowledge_node` *(bán-snapshot, xem Round 3 mục 1.1)*) đều có `created_at`+`updated_at` đầy đủ | ✅ Nhất quán (`roadmap_node_knowledge_node` là trường hợp trung gian đã giải trình rõ — không có nội dung để update ngoài `removed_at`, không thiếu sót) |
| `ON DELETE` rule nhất quán theo Aggregate Boundary (Cascade chỉ trong Aggregate, Restrict giữa Aggregate) xuyên 19 bảng | ✅ Đã rà soát lại — không có FK nào dùng `CASCADE` giữa 2 Aggregate khác nhau ở bất kỳ Round nào |
| Forward dependency còn mở (đã hứa nhưng chưa đóng) | `sub_session.knowledge_node_id` (chưa FK, Round 1) — **vẫn mở**, vì giờ `knowledge_node` đã tồn tại (từ Round 2), về kỹ thuật **có thể đóng ngay bây giờ** nhưng **không nằm trong phạm vi Round 3 được giao** (chỉ giao `roadmap_node↔knowledge_node` và `expansion_record`) — ghi nhận rõ, không tự thêm |
| `sub_session ↔ mentor_session` (Round 1) | Vẫn mở — `mentor_session` (Mentor Interaction Module) chưa tới lượt |

**Không phát hiện vi phạm consistency nào xuyên 19 bảng.** 1 forward-dependency kỹ thuật có thể đóng sớm (`sub_session.knowledge_node_id`) nhưng cố ý không tự làm ngoài phạm vi được giao.

---

## 6. Validation tổng hợp — Round 1+2+3 có hỗ trợ 4 năng lực AI không?

### 6.1 AI Teaching

**Đường dữ liệu đầy đủ:** `learning_session` (Round 1, đang theo đuổi Goal nào) → `sub_session` (Round 1, đang xử lý `roadmap_node` nào) → `roadmap_node_knowledge_node` (**Round 3 — gap đã đóng**, RoadmapNode này yêu cầu hiểu những `knowledge_node` nào) → `knowledge_node_mastery` (Round 2, Learner này đã hiểu tới đâu với từng `knowledge_node` đó) → AI quyết định dạy gì tiếp.

**Trước Round 3:** đường dữ liệu này **đứt tại bước thứ 3** — không có bảng nối, AI không có cách nào (ở tầng dữ liệu) biết RoadmapNode yêu cầu KnowledgeNode nào, chỉ có thể dựa vào ngữ cảnh runtime/prompt không được persist, không truy vết được sau này.

**Sau Round 3: ✅ Đầy đủ, không còn hidden gap.**

### 6.2 AI Assessment

**Đường dữ liệu đầy đủ:** `evidence`/`evidence_link` (Round 2) → `assessment_result` (Round 2, đủ 8 trường) → `knowledge_node_mastery` (Round 2, cập nhật, FK ngược bắt buộc) → `trace_link` (Round 2, nối `assessment_result` → `evidence`).

**Đã PASS từ Round 2** ([ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) mục C) — Round 3 không thêm gì mới cho capability này, không phát hiện gap mới.

**Sau Round 3: ✅ Đầy đủ** (với caveat Application Layer đã biết từ Round 2 — không phải gap mới).

### 6.3 AI Recommendation

**Sau Round 3: 🟡 Nền tảng sẵn sàng, capability tự thân CHƯA thể hoạt động** — xem Focus Area 4 (mục 4 trên). Đây **không phải hidden gap** — đã được biết trước và có kế hoạch (Round 4: `recommendation_proposal`, `discovery_session`).

### 6.4 AI Explainability

**Sau Round 3: ✅ Đủ cấu trúc cho mọi capability đã thiết kế (Teaching/Assessment) — 🔶 enforcement vẫn phụ thuộc Application Layer ở 3 điểm đã liệt kê (mục 3).** Đây là rủi ro đã biết, nhất quán, không phải gap ẩn mới phát sinh ngoài dự kiến — nhưng **số điểm rủi ro đã tăng từ 1 lên 3** qua Round 3, cần ghi nhận rõ cho Founder/ChatGPT, không nên coi là "đã xử lý xong" chỉ vì đã biết.

---

## 7. Kết luận

**Không có hidden architectural gap nào ẩn giấu, ngoài dự kiến.** Mọi gap còn lại (Recommendation/Discovery chưa xây; `expansion_record↔knowledge_edge` cardinality; `roadmap_node_knowledge_node` thiếu cột lý do trực tiếp; `sub_session.knowledge_node_id`/`mentor_session` forward dependency) đều đã được **xác định rõ, có lý do, có kế hoạch** — không có gap nào "mới phát hiện gây bất ngờ" tới mức cần dừng lại thiết kế lại Round 1/2.

**Riêng AI Teaching: Round 3 đóng đúng gap nghiêm trọng nhất** — nếu không có `roadmap_node_knowledge_node`, không capability AI nào trong 4 capability được yêu cầu có thể hoạt động đúng nghĩa "biết phải dạy/đánh giá/đề xuất gì cho đúng RoadmapNode", vì Roadmap Graph và Knowledge Graph sẽ hoàn toàn tách rời nhau ở tầng dữ liệu.

## OUTPUT STATUS

**READY_FOR_SQL_GENERATION**

Lý do:
- 2 bảng Round 3 đã thiết kế đầy đủ, đúng Domain Architecture, nhất quán với Round 1+2 ([DDL_ROUND3_REVIEW.md](DDL_ROUND3_REVIEW.md)).
- 4 năng lực AI được validate: Teaching (✅ đầy đủ sau Round 3), Assessment (✅ đầy đủ từ Round 2), Recommendation (🟡 nền tảng sẵn sàng, capability tự thân hoãn có kế hoạch — không chặn 19 bảng hiện có), Explainability (✅ đủ cấu trúc, enforcement là rủi ro vận hành đã biết, không phải lỗi thiết kế).
- Không phát hiện vi phạm Learning Philosophy, không Domain/Aggregate mới ngoài kế hoạch, không coupling nguy hiểm mới.

**Khuyến nghị xác nhận trước khi Round 4 (Discovery/Mentor Interaction/Recommendation):**
1. Cardinality `ExpansionRecord ↔ KnowledgeEdge` (Risk #1, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md)).
2. `roadmap_node_knowledge_node` có cần cột lý do riêng hay tiếp tục dựa vào `approval_record.roadmap_node_id` (mức chi tiết thấp hơn) là đủ.
3. Đóng 2 forward-dependency còn mở (`sub_session.knowledge_node_id` FK thật; `sub_session ↔ mentor_session`) — khuyến nghị làm ngay đầu Round 4, trước khi thêm bảng mới, để giảm nợ kỹ thuật tích lũy.
4. Cân nhắc 1 quyết định kiến trúc tổng thể cho "Explainability Integrity Enforcement" (3 điểm phụ thuộc Application Layer đã liệt kê ở mục 3) — ví dụ 1 lớp Service/Repository duy nhất chịu trách nhiệm, thay vì để rải nhiều nơi — đây là khuyến nghị Application/Backend Design, không phải Database Design, nhưng bắt nguồn trực tiếp từ phát hiện ở Round 3 này.

## Liên kết ngược

[DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [DDL_ROUND3_REVIEW.md](DDL_ROUND3_REVIEW.md), [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md).
