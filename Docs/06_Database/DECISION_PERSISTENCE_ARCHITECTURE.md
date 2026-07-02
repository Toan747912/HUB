# Decision Persistence Architecture — Header / Detail / TraceLink / Domain Entities

> Database Design Phase — **Decision Persistence Mechanism Round** (kế tiếp [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), trả lời câu hỏi C-04 đã treo: "Decision Header mechanism chưa chọn"). Dựa trên [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) (Round 4.3, khuyến nghị Approach C — Header/Detail) và [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) (Round 4.4, xác nhận Header/TraceLink "Partially Overlapping").
>
> **Kiến trúc thuần — KHÔNG SQL, không `CREATE TABLE`, không sửa [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md).** Đây là tài liệu **đề xuất** của Claude (Co-Architect) — chưa chốt, theo đúng giới hạn đã giữ xuyên suốt 2 tài liệu nguồn ("Không chốt quyết định này — chờ Founder/ChatGPT Lead Architect").

## 0. Tiền đề đã khóa, không tự thiết kế lại

| Tiền đề | Nguồn |
|---|---|
| 10 Decision Type (D1-D9b) đều phải explainable; chỉ D8 dùng Runtime Reconstruction thay Persisted Record | [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (locked) |
| Approach **C — Header/Detail** được khuyến nghị (chưa chốt) cho 6 Decision Type còn thiếu cơ chế (D1, D3, D6, D7, D9a, D9b); **không migrate** `assessment_result`(D2)/`expansion_record`(D4) đã build | [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 5 |
| Header/TraceLink là **B — Partially Overlapping**, không gộp 2 chiều; **Header không mang cột `source_*`/`target_*`** | [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 2, 5 |
| `TraceLink` (DECISION-038) không dùng Polymorphic FK trên entity nghiệp vụ; là hạ tầng cross-cutting, không thuộc Domain nào | [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) |
| `self_assessment_mismatch`(D7) đã đóng persistence ở DDL Round 4; `recommendation_proposal`(D3) cũng vậy | [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) |

Tài liệu này **hiện thực hóa kiến trúc** cho khuyến nghị Approach C, ở mức mô tả — không tự chọn thay Founder, không tự khóa thành Decision Log.

---

## 1. Decision Header

**Định nghĩa:** 1 lớp đăng ký tối giản, cross-cutting, ghi nhận **sự kiện** "1 AI Decision đã xảy ra" — loại gì (`decision_type`, 1 trong 10 giá trị đã khóa ở [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md)/DECISION-048), capability/domain nào, lúc nào, cho Learner nào. Trả lời câu hỏi dạng **timeline/inventory**: "AI đã quyết định gì, xuyên mọi Capability, cho Learner X, theo thời gian" — bằng 1 truy vấn duy nhất, không cần UNION nhiều bảng Detail không đồng cấu trúc.

**Header không phải:**
- Không phải nguồn sự thật của **nội dung** quyết định (nội dung đầy đủ luôn ở Detail, nếu Decision Type đó có Detail).
- Không phải cơ chế truy vết **nguồn dữ liệu đã dùng** — đó là việc của TraceLink (mục 4).
- Không phải Decision Type discriminator thứ 2 cạnh tranh với `trace_link.source_type`/`target_type` — `decision_type` của Header phân loại theo **ý nghĩa nghiệp vụ của hành động** (1 trong 10 D-number), khác hẳn `source_type`/`target_type` của TraceLink (phân loại theo **loại bảng vật lý** đang được tham chiếu).

### Required Fields (mức mô tả — không phải DDL)

| Field | Vai trò | Ghi chú |
|---|---|---|
| `decision_header_id` | Định danh | Cùng quy ước `<table>_id`, sinh ULID-style (append-only, giống `trace_link_id`) |
| `decision_type` | Discriminator — 1 trong 10 giá trị D1/D2/D3/D4/D5/D6/D7/D8/D9a/D9b | Enum đóng, neo trực tiếp vào taxonomy đã khóa ở DECISION-048, không tự thêm/bớt giá trị ở tài liệu này |
| `learner_id` | Phạm vi sở hữu | FK → `learner` — mọi AI Decision trong taxonomy hiện tại đều gắn 1 Learner cụ thể (không có decision toàn-hệ-thống nào trong 10 loại đã khóa) |
| `capability_or_domain` | Ai ra quyết định | Text mô tả (Teaching Capability / Discovery Domain / Mentor Interaction Domain / Recommendation Domain / Knowledge Graph Domain / Goal & Roadmap Domain) — **không phải FK** tới 1 bảng "Domain" (Domain không phải entity vật lý trong hệ thống này) |
| `occurred_at` | Thời điểm xảy ra | timestamp — đây là trường bắt buộc cho mọi truy vấn timeline |
| `summary_reason` | Lý do ngắn, đọc được | 🔶 **Cân nhắc kỹ:** chỉ nên là tóm tắt ngắn (vd 1 câu), **không thay thế** `reasoning` đầy đủ ở Detail — nếu Decision Type không có Detail (D8), đây có thể là lý do duy nhất hiển thị được, nên vẫn cần `NOT NULL`/CHECK không rỗng giống các trường `reasoning` đã có ở Detail (Round 2-4) |
| `detail_type` + `detail_id` | Con trỏ tới Detail tương ứng (nếu có) | 🔶 **Xem mục 1.1 — cần phân biệt rõ với `source_*`/`target_*` bị cấm** |
| `created_at`, `created_by_actor_type`, `created_by_actor_id` | Audit | Chỉ nhóm created — append-only |

**Không có `updated_at`/`updated_by_*`** — Header ghi nhận 1 sự kiện đã xảy ra, không sửa lại (cùng nhóm append-only với `evidence`/`assessment_result`/`trace_link`).

### 1.1 `detail_type`/`detail_id` — vì sao KHÔNG vi phạm ranh giới đã khóa

[HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 5 khóa cứng: **"Header không mang cột kiểu `source_*`/`target_*` nào."** Đây là quy tắc về **vai trò** (provenance — "quyết định này dựa trên nguồn dữ liệu nào"), không phải quy tắc cấm tuyệt đối "mọi cặp discriminator+id". `detail_type`/`detail_id` ở đây phục vụ 1 vai trò khác hẳn: **"đây chính là bản ghi đầy đủ của cùng 1 quyết định"** (self-elaboration, cardinality 0..1 — 1 Header có **tối đa 1** Detail), không phải "đây là 1 trong N nguồn dữ liệu đã dùng để ra quyết định" (provenance, cardinality 0..N, đúng vai trò TraceLink).

🔶 **Đây là đề xuất, chưa chốt — cần Founder/ChatGPT xác nhận trước khi build:** nếu xác nhận đúng, `detail_type`/`detail_id` nên **tái dùng quy ước đặt tên khác** với `source_*`/`target_*` (đã dùng riêng cho TraceLink, [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 12) để không gây nhầm vai trò khi đọc schema — tên gợi ý `detail_type`/`detail_id`, không phải `source_type`/`target_type`. Nếu Founder/ChatGPT đánh giá rủi ro "vẫn là Polymorphic FK dù đổi tên" lớn hơn lợi ích điều hướng, phương án thay thế là: **Header không có cột này, Detail tự mang `decision_header_id` ngược lại** (xem mục 1.2) — đánh đổi giữa 2 hướng trỏ được phân tích ở mục 3.

### 1.2 Phương án thay thế: Detail trỏ ngược tới Header (không cần `detail_type`/`detail_id` trên Header)

Thay vì Header trỏ xuôi tới Detail, mỗi Detail entity (khi được thiết kế ở Round sau) mang 1 cột `decision_header_id` (FK đơn, không đa hình — vì Detail luôn biết chính xác nó thuộc loại nào, không cần discriminator) trỏ về đúng 1 `decision_header`. **Ưu điểm:** Header tuyệt đối tối giản, không có cột con trỏ nào (loại bỏ hoàn toàn rủi ro "trông giống Polymorphic FK"). **Nhược điểm:** truy vấn "Header → Detail" cần biết trước `decision_type` để JOIN đúng bảng Detail tương ứng (không tự nhiên như có sẵn `detail_type` ngay trên Header) — nhưng đây vốn đã là chi phí chấp nhận được của Approach C (mục 3, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md): "Header JOIN Detail" được mô tả là 1 join thêm, rẻ hơn UNION N bảng). **Khuyến nghị của tài liệu này:** phương án 1.2 (Detail trỏ ngược) **an toàn hơn về ranh giới đã khóa**, nên ưu tiên trừ khi Founder/ChatGPT xác nhận rõ ràng `detail_type`/`detail_id` (mục 1.1) là chấp nhận được.

### Ownership

Cross-cutting — **không thuộc bất kỳ Core Domain nghiệp vụ nào**, cùng vị thế với `trace_link` (DECISION-038 Consequences: "không thuộc bất kỳ Core Domain nghiệp vụ nào... hạ tầng cross-cutting"). Không Domain nào "cho mượn" cấu trúc của mình vào Header; mỗi Domain chỉ "đăng ký" sự tồn tại của quyết định mình vừa ra.

### Lifecycle

Append-only, immutable — sinh đúng 1 lần tại thời điểm decision xảy ra. Cardinality **0 hoặc 1** Header / 1 quyết định cụ thể đã xảy ra (không phải 0..N — khác hẳn TraceLink).

### Persistence Responsibilities

Actor nào tạo ra quyết định (Teaching Capability, Discovery Engine, Roadmap Engine...) chịu trách nhiệm ghi `decision_header` **trong cùng transaction** với Detail (nếu có) — đây là 1 **Application Layer Discipline dependency mới** (không phải lỗi thiết kế, là rủi ro vận hành đã biết, xem mục 4 Synchronization Risk). Không Domain nào khác được phép viết Header thay actor đã ra quyết định.

---

## 2. Decision Detail

**Định nghĩa:** Bảng/entity domain-owned, chứa **toàn bộ nội dung** của 1 quyết định cụ thể — `reasoning` đầy đủ, mọi trường đặc thù theo Decision Type, đúng mô hình Approach A (per-capability table) đã áp dụng nhất quán từ DDL Round 1-4. Header **không thay thế** Detail — Detail vẫn là nguồn sự thật duy nhất cho nội dung.

**Đã tồn tại (không migrate, theo [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 5 điều kiện #1):**

| Decision Type | Detail entity hiện có | Round |
|---|---|---|
| D2 — Assessment Evidence Verdict | `assessment_result` | DDL Round 2 |
| D3 — Recommendation Signal Synthesis | `recommendation_proposal` | DDL Round 4 |
| D4 — Knowledge Expansion Deep/Structural | `expansion_record` | DDL Round 3 |
| D7 — Discovery Self-Assessment Mismatch | `self_assessment_mismatch` | DDL Round 4 |

**Chưa tồn tại — cần thiết kế ở Round sau (KHÔNG thiết kế ở tài liệu này):**

| Decision Type | Detail cần có (mô tả, chưa thiết kế cột) | Domain/Capability sở hữu |
|---|---|---|
| D1 — Teaching Content Selection | 1 log ghi lại nội dung đã chọn dạy + lý do (GAP-01) | Teaching (Capability, không Domain riêng — DECISION-048) |
| D5 — Knowledge Expansion Local | 1 log lý do nội bộ, không hiển thị Learner (GAP-02) | Knowledge Graph Domain |
| D6 — Roadmap Mapping Dependency Edge | Mở rộng `roadmap_node_knowledge_node` (cột lý do) **hoặc** 1 Detail riêng (GAP-05/H-01) — **chưa quyết định ở tài liệu này, vì sẽ chạm `roadmap_node_knowledge_node` đã khóa ở Round 3, ngoài phạm vi "không sửa DDL Round 1-4"** | Goal & Roadmap Domain |
| D9a — Stuck Detection (tín hiệu) | 1 log tín hiệu phát hiện + ngưỡng/dữ liệu dùng | Chưa chốt hẳn (gần Mentor Interaction nhất — DECISION-048, Open) |
| D9b — Intervention Tier Selection | 1 log cấp độ can thiệp đã chọn + lý do | Teaching (Capability) |

### Required Fields (mức mô tả, áp dụng chung cho Detail mới — không phải DDL)

Mọi Detail mới nên giữ pattern đã nhất quán xuyên Round 1-4: định danh riêng (`<entity>_id`), FK tới entity nghiệp vụ bị ảnh hưởng (`knowledge_node_id`/`roadmap_node_id`/...), 1 trường `reasoning`-equivalent `NOT NULL` + CHECK không rỗng, nhóm audit `created_at`/`created_by_actor_type`/`created_by_actor_id` (append-only, không `updated_at`). **Không tự thêm `decision_header_id` ở tài liệu này nếu chọn phương án 1.1 (Header trỏ xuôi)** — chỉ thêm nếu Founder/ChatGPT chọn phương án 1.2 (mục 1.2).

### Ownership

Mỗi Detail entity write-owner bởi đúng 1 Domain/Capability — không đổi nguyên tắc Write-Ownership đã giữ xuyên Round 1-4. Header **không** sở hữu Detail, chỉ tham chiếu (đăng ký).

### Lifecycle

Append-only, immutable — đúng pattern `assessment_result`/`expansion_record`/`recommendation_proposal`/`self_assessment_mismatch` đã có. Không có lý do kiến trúc nào để Detail mới (D1/D5/D6/D9a/D9b) lệch khỏi pattern này — quyết định AI là 1 sự kiện đã xảy ra, không sửa lại.

### Persistence Responsibilities

Domain/Capability sở hữu Decision Type đó chịu trách nhiệm ghi Detail — không đổi từ pattern đã có. Khi Header tồn tại, **cùng actor, cùng transaction** phải ghi cả Header + Detail (xem mục 4 Synchronization Risk).

---

## 3. Explainability Linkage

Chuỗi trả lời "vì sao AI quyết định X" có 2 hình dạng, tùy Decision Type có Detail hay không:

**Với Decision Type có Detail (D1-D7, D9a, D9b):**

```
"Có decision gì xảy ra?" → Decision Header (timeline/inventory, decision_type + occurred_at)
            ↓ (detail_type/detail_id HOẶC decision_header_id ngược — mục 1.1/1.2)
"Nội dung/lý do đầy đủ là gì?" → Decision Detail (reasoning, mọi trường đặc thù)
            ↓ (trace_link, nếu Detail cần trỏ tới nguồn dữ liệu cụ thể)
"Dựa trên dữ liệu nguồn nào?" → TraceLink → Evidence / AssessmentResult / DiscoverySession / SelfAssessmentMismatch...
```

**Với D8 (không Detail, Runtime Reconstruction):**

```
"Có decision gì xảy ra?" → Decision Header (chỉ có decision_type='D8' + occurred_at + summary_reason ngắn)
            ↓ (không có Detail, không có TraceLink — không có gì để JOIN/nối)
"Vì sao chọn Mode này?" → Runtime Reconstruction (Application Layer tự suy luận lại từ Evidence/AssessmentResult hiện có tại occurred_at, KHÔNG qua bảng nào lưu sẵn câu trả lời)
```

**Điểm quan trọng:** Header là **bắt buộc** ngay cả với D8 — nếu không, "decision này có thực sự xảy ra không, lúc nào" hoàn toàn không có nơi trả lời (đúng phát hiện ở [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 3 Q1/Q4) — Runtime Reconstruction chỉ giải quyết "vì sao", không giải quyết "có xảy ra không, khi nào", 2 câu hỏi khác nhau.

---

## 4. Relationship to TraceLink

**Quan hệ: B — Partially Overlapping** (không phải đồng nhất, không phải hoàn toàn tách biệt), đã khóa ở [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md):

| Trục | Decision Header | TraceLink |
|---|---|---|
| Câu hỏi trả lời | "Có gì xảy ra, loại gì, lúc nào, cho ai" (forward registry) | "Kết luận này dựa trên gì" (backward provenance) |
| Cardinality | 0/1 cho mỗi decision | 0..N cho mỗi decision |
| Tồn tại độc lập? | Có — không cần gì khác | Không — luôn cần ≥2 bản ghi đã tồn tại để nối |
| Có thể thay thế nhau? | Không | Không |

**Không thay đổi `trace_link` ở tài liệu này** — Header là lớp bổ trợ, đứng cạnh, không sửa cấu trúc `trace_link` đã khóa từ DECISION-038/DDL Round 2. Khi Detail mới (D1/D5/D6/D9a/D9b) cần trỏ tới nguồn dữ liệu cụ thể, Detail đó **dùng `trace_link` đúng cách đã có** (thêm `decision_type`-tương-ứng vào `source_type` enum — vd `'teaching_content_selection'`, `'local_expansion'` đã có sẵn từ DECISION-038 gốc, `'stuck_detection_signal'`, `'intervention_tier_selection'`) — đây là **mở rộng enum value**, không phải thiết kế cơ chế mới, cùng cách Round 4 đã xử lý cho `recommendation_proposal`.

**Synchronization Risk (đã biết, không tự giải ở đây):** không có ràng buộc DB nào tự động đảm bảo Header + Detail + TraceLink luôn được tạo cùng 1 transaction — đây là **Application Layer Discipline dependency**, cùng họ rủi ro với GAP-04 (`assessment_result`↔`trace_link`), GAP-05/H-01 (`roadmap_node_knowledge_node` thiếu lý do), C-05 (`recommendation_proposal.traced_to[]` "no exception"). [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 5 khuyến nghị 1 giải pháp tổng thể (vd 1 Service/Repository layer duy nhất chịu trách nhiệm ghi cả 3 lớp trong 1 transaction) — **đây là khuyến nghị Application/Backend Design, ngoài phạm vi Database Design**, ghi nhận lại, không tự thiết kế service ở tài liệu này.

---

## 5. Relationship to Domain Entities

| Lớp | Thuộc Domain nào? | Quan hệ với entity nghiệp vụ |
|---|---|---|
| **Decision Header** | Không Domain nào (cross-cutting, giống `trace_link`) | Tham chiếu `learner_id`; (tùy phương án 1.1/1.2) tham chiếu Detail — không bao giờ tham chiếu trực tiếp entity nghiệp vụ khác (Evidence/KnowledgeNode...) |
| **Decision Detail** | Đúng 1 Domain/Capability sở hữu (Teaching/Discovery/Knowledge Graph/Goal & Roadmap/Mentor Interaction) | FK trực tiếp tới entity nghiệp vụ bị ảnh hưởng (đúng pattern Round 1-4: `assessment_result.knowledge_node_id`, `self_assessment_mismatch.discovery_session_id`...) |
| **TraceLink** | Không Domain nào (cross-cutting, đã khóa DECISION-038) | Đa hình `source_type`/`target_type`, không FK vật lý — không đổi |

**Không có Domain nào bị tạo mới, không Aggregate Boundary nào (Boundary 1-10, DDL Round 1-4) bị sửa lại** — Header/Detail là 2 lớp **bổ trợ kiến trúc** đứng trên các Boundary đã khóa, không mở Boundary mới (tương tự cách `trace_link` không mở Boundary nào ở DECISION-038/Round 2).

## Liên kết ngược

[SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md), [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).

**Đánh giá: [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md), [HEADER_DETAIL_BOUNDARY_REVIEW.md](HEADER_DETAIL_BOUNDARY_REVIEW.md), [DECISION_PERSISTENCE_GAP_CLOSURE.md](DECISION_PERSISTENCE_GAP_CLOSURE.md). Chưa có SQL/`CREATE TABLE` nào được tạo. Không sửa DDL Round 1-4. Đây là đề xuất kiến trúc, chưa chốt — chờ Founder/ChatGPT Lead Architect.**
