# DDL Round 5 Design — Decision Persistence (Header / Detail)

> Database Design Phase — **Step 4B, Round 5**. Hiện thực hóa [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md) (Accepted, Locked) thành cột/bảng cụ thể. Áp dụng [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) (phương án 1.2 — Detail trỏ ngược tới Header, đã được DECISION-049 chốt).
>
> **Thiết kế DDL ở mức mô tả — KHÔNG SQL, không `CREATE TABLE`, không `CREATE POLICY`.** Round 1–4 **giữ nguyên không đổi** — không phát hiện xung đột trực tiếp nào với DECISION-049 cần sửa lại (xem mục 4).

## 0. Phạm vi Round 5

| # | Bảng | Decision Type | Lý do tồn tại | Đã hứa ở |
|---|---|---|---|---|
| 1 | `decision_header` | Tất cả (D1-D9b) | Supporting Persistence Entity trung tâm — DECISION-049 mục 1/2 | DECISION-049 |
| 2 | `teaching_decision_detail` | D1 | Đóng GAP-01 (Teaching Content Selection, 0% persistence) | DDL_ROUND4_GAP_ANALYSIS C-02 |
| 3 | `local_expansion_decision_detail` | D5 | Đóng GAP-02 (Local Expansion, không có log lý do nội bộ) | DDL_ROUND4_GAP_ANALYSIS C-03 |
| 4 | `roadmap_mapping_decision_detail` | D6 | Đóng GAP-05/H-01 (Dependency Edge thiếu cột lý do) — **không sửa `roadmap_node_knowledge_node`** | DDL_ROUND4_GAP_ANALYSIS H-01; DECISION_PERSISTENCE_ARCHITECTURE mục 2 (để ngỏ, nay quyết định) |
| 5 | `stuck_detection_decision_detail` | D9a | Nơi lưu tín hiệu Stuck Detection (thuật toán vẫn Open Q#6/#11 — Round 5 không giải thuật toán) | DECISION-048 |
| 6 | `intervention_decision_detail` | D9b | Nơi lưu cấp độ can thiệp đã chọn + lý do | DECISION-048 |

**D8 không có Detail** (Runtime Reconstruction, theo DECISION-049 mục 7/8) — chỉ ghi `decision_header` với `decision_type = 'D8'`, không bảng Detail nào tương ứng. **D2/D3/D4/D7 đã có Detail từ Round 2-4** (`assessment_result`/`recommendation_proposal`/`expansion_record`/`self_assessment_mismatch`) — **không tạo Detail mới, không migrate** — chỉ patch 1 cột `decision_header_id` lên 4 bảng đó (mục 5).

---

## 1. Table Specifications

### 1.1 `decision_header` (Supporting Persistence Entity — cross-cutting, không Domain)

**Purpose:** Đăng ký sự kiện "1 AI Decision đã xảy ra" — loại gì, ai ra quyết định, lúc nào, cho Learner nào — trả lời câu hỏi timeline/inventory xuyên mọi Capability, 1 truy vấn duy nhất, không UNION nhiều bảng Detail.

**Aggregate Owner:** Không Domain nào — cross-cutting, cùng vị thế `trace_link` (DECISION-038). Không mở Boundary mới.

**Lifecycle:** Append-only, immutable — đúng 1 lần tại thời điểm decision xảy ra.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `decision_header_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `learner_id` | `uuid` | NOT NULL | — | FK → `learner(id)` — mọi Decision Type trong taxonomy hiện tại đều gắn 1 Learner cụ thể |
| `decision_type` | `text` | NOT NULL | — | `D1`/`D2`/`D3`/`D4`/`D5`/`D6`/`D7`/`D8`/`D9a`/`D9b` — enum đóng, neo trực tiếp taxonomy DECISION-048 |
| `capability_or_domain` | `text` | NOT NULL | — | `teaching_capability`/`assessment_domain`/`recommendation_domain`/`knowledge_graph_domain`/`goal_roadmap_domain`/`discovery_domain`/`mentor_interaction_domain` — mô tả, **không phải FK** (Domain không phải entity vật lý) |
| `occurred_at` | `timestamptz` | NOT NULL | `now()` | Thời điểm decision xảy ra — trường bắt buộc cho mọi truy vấn timeline |
| `summary_reason` | `text` | NOT NULL | — | Tóm tắt ngắn, đọc được — **không thay thế** `reasoning` đầy đủ ở Detail; với D8 (không Detail), đây là lý do duy nhất hiển thị được ở tầng DB |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**Không có `updated_at`/`updated_by_*`, không có `detail_type`/`detail_id`** — theo DECISION-049 mục 3, Header tuyệt đối tối giản, không mang con trỏ xuôi nào tới Detail.

**PK:** `decision_header_id`.

**FK:** `learner_id → learner(id)` — `ON DELETE RESTRICT`.

**Uniqueness:** Không có — 1 Learner có nhiều decision qua thời gian, nhiều loại.

**Check Constraints:**
- `ck_decision_header_decision_type` — `decision_type IN ('D1','D2','D3','D4','D5','D6','D7','D8','D9a','D9b')`
- `ck_decision_header_capability_or_domain` — `capability_or_domain IN ('teaching_capability','assessment_domain','recommendation_domain','knowledge_graph_domain','goal_roadmap_domain','discovery_domain','mentor_interaction_domain')`
- `ck_decision_header_summary_reason_not_empty` — `length(trim(summary_reason)) > 0`
- `ck_decision_header_created_by_actor_type` — enum đóng (`learner`/`backend_core`/`ai_service`)

**Versioning:** Không áp dụng (immutable).

**Audit Strategy:** Chỉ nhóm created.

**History Strategy:** Không áp dụng — append-only đã tự là lịch sử đầy đủ (cùng nhóm `trace_link`/`self_assessment_mismatch`/`recommendation_proposal`, [DatabaseNamingConvention.md](DatabaseNamingConvention.md) mục 9).

**Retention Strategy:** Vĩnh viễn — xóa sẽ phá vỡ explainability của mọi Detail/Header tham chiếu nó (kể cả D8, nơi đây là **bản ghi duy nhất**).

**RLS Impact:** `learner_id = auth.uid()` — 0-hop, Strict RLS (cùng nhóm `evidence`/`assessment_result`/`discovery_session`). **Khác `trace_link`** (không có `learner_id`, pattern shared/global) — `decision_header` có `learner_id` nên dùng pattern Learner-owned trực tiếp, đơn giản hơn `trace_link`.

---

### 1.2 `teaching_decision_detail` (D1 — Teaching Capability)

**Purpose:** Ghi lại nội dung Teaching Capability đã chọn dạy tiếp theo (1 `knowledge_node` cụ thể) trong 1 `mentor_session`, kèm lý do lựa chọn — đóng GAP-01.

**Aggregate Owner:** Teaching Capability (orchestration, không có Domain riêng — DECISION-048 Decision Scope). Không mở Boundary mới — Supporting Persistence Entity, tham chiếu (không sở hữu) `mentor_session`/`knowledge_node`.

**Lifecycle:** Append-only, immutable.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `teaching_decision_detail_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `decision_header_id` | `uuid` | NOT NULL | — | FK → `decision_header` — đúng 1, theo DECISION-049 mục 3 (Detail trỏ về Header) |
| `mentor_session_id` | `uuid` | NOT NULL | — | FK → `mentor_session` — lượt tương tác mà nội dung này được chọn để dạy |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` — nội dung được chọn |
| `selection_reasoning` | `text` | NOT NULL | — | Lý do chọn nội dung này (không phải nội dung khác) — explainability artifact D1 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `teaching_decision_detail_id`.

**FK:**
- `decision_header_id → decision_header(decision_header_id)` — `ON DELETE RESTRICT`
- `mentor_session_id → mentor_session(mentor_session_id)` — `ON DELETE RESTRICT`
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT` (nhất quán 100% FK → `knowledge_node` từ Round 2)

**Unique Constraints:** `uq_teaching_decision_detail_decision_header_id` — `UNIQUE (decision_header_id)` — đúng 1 Detail / 1 Header (mục 7, Mandatory Questions).

**Check Constraints:**
- `ck_teaching_decision_detail_selection_reasoning_not_empty` — `length(trim(selection_reasoning)) > 0`
- `ck_teaching_decision_detail_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng. **Audit:** Chỉ created. **History:** Không áp dụng — append-only. **Retention:** Vĩnh viễn.

**RLS Impact:** Qua `decision_header.learner_id = auth.uid()` — 1-hop, nhất quán dùng `decision_header` làm đường RLS chuẩn cho mọi Detail (thay vì qua `mentor_session`, để 1 pattern duy nhất xuyên 5 Detail, xem mục 5 Architecture Review).

---

### 1.3 `local_expansion_decision_detail` (D5 — Knowledge Graph Domain)

**Purpose:** Ghi lý do **nội bộ** (không hiển thị Learner) cho 1 lần Knowledge Node Expansion loại **Local** — khác `expansion_record` (Deep/Structural, D4, Learner-facing, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.2) — đóng GAP-02.

**Aggregate Owner:** Knowledge Graph Domain. Không mở Boundary mới — Supporting Persistence Entity, tham chiếu `knowledge_node`.

**Lifecycle:** Append-only, immutable.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `local_expansion_decision_detail_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `decision_header_id` | `uuid` | NOT NULL | — | FK → `decision_header` |
| `knowledge_node_id` | `uuid` | NOT NULL | — | FK → `knowledge_node` — node được mở rộng Local |
| `expansion_reasoning` | `text` | NOT NULL | — | Lý do nội bộ — **không bắt buộc hiển thị Learner** (khác `expansion_record.expansion_reason`, luôn hiển thị) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `local_expansion_decision_detail_id`.

**FK:**
- `decision_header_id → decision_header(decision_header_id)` — `ON DELETE RESTRICT`
- `knowledge_node_id → knowledge_node(knowledge_node_id)` — `ON DELETE RESTRICT`

**Unique Constraints:** `uq_local_expansion_decision_detail_decision_header_id` — `UNIQUE (decision_header_id)`.

**Check Constraints:**
- `ck_local_expansion_decision_detail_expansion_reasoning_not_empty` — `length(trim(expansion_reasoning)) > 0`
- `ck_local_expansion_decision_detail_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng. **Audit:** Chỉ created. **History:** Không áp dụng. **Retention:** Vĩnh viễn.

**🔶 Giới hạn kế thừa từ `expansion_record` (Round 3 Risk #1):** không có FK tới `knowledge_edge` cụ thể được tạo từ lần Local Expansion này — cùng bản chất gap đã ghi nhận ở [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.2, vì cardinality `LocalExpansion ↔ KnowledgeEdge` cũng chưa được Domain Architecture khóa. Không tự thêm FK ở Round 5.

**RLS Impact:** Qua `decision_header.learner_id` — 1-hop.

---

### 1.4 `roadmap_mapping_decision_detail` (D6 — Goal & Roadmap Domain)

**Purpose:** Ghi lý do AI chọn 1 Dependency Edge cụ thể (`roadmap_node_knowledge_node`) — đóng GAP-05/H-01 **bằng Detail riêng, không sửa `roadmap_node_knowledge_node`** (Round 3 giữ nguyên, đúng yêu cầu "Round 1-4 must remain unchanged unless a direct conflict... is proven" — không có xung đột, chỉ thiếu 1 nơi lưu lý do, giải quyết bằng bảng mới).

**Aggregate Owner:** Goal & Roadmap Domain. Không mở Boundary mới — Supporting Persistence Entity, tham chiếu `roadmap_node_knowledge_node` (Boundary 3 mở rộng, Round 3).

**Lifecycle:** Append-only, immutable.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `roadmap_mapping_decision_detail_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `decision_header_id` | `uuid` | NOT NULL | — | FK → `decision_header` |
| `roadmap_node_knowledge_node_id` | `uuid` | NOT NULL | — | FK → `roadmap_node_knowledge_node` — đúng Dependency Edge cụ thể được giải thích |
| `mapping_reasoning` | `text` | NOT NULL | — | Lý do RoadmapNode này phụ thuộc KnowledgeNode kia — explainability artifact D6 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `roadmap_mapping_decision_detail_id`.

**FK:**
- `decision_header_id → decision_header(decision_header_id)` — `ON DELETE RESTRICT`
- `roadmap_node_knowledge_node_id → roadmap_node_knowledge_node(roadmap_node_knowledge_node_id)` — `ON DELETE RESTRICT`

**Unique Constraints:** `uq_roadmap_mapping_decision_detail_decision_header_id` — `UNIQUE (decision_header_id)`. **Không** UNIQUE trên `roadmap_node_knowledge_node_id` — 1 Dependency Edge có thể được AI nhắc lại/tái xác nhận lý do nhiều lần qua thời gian (cùng tinh thần `self_assessment_mismatch` cho phép lặp lại trên cùng `knowledge_node`).

**Check Constraints:**
- `ck_roadmap_mapping_decision_detail_mapping_reasoning_not_empty` — `length(trim(mapping_reasoning)) > 0`
- `ck_roadmap_mapping_decision_detail_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng. **Audit:** Chỉ created. **History:** Không áp dụng. **Retention:** Vĩnh viễn.

**RLS Impact:** Qua `decision_header.learner_id` — 1-hop. (Lưu ý: `roadmap_node_knowledge_node` chính nó cần 3-hop JOIN nếu truy theo nhánh Roadmap — [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 5 — nhưng `roadmap_mapping_decision_detail` **không cần đi đường đó**, vì đã có đường ngắn hơn qua `decision_header`.)

---

### 1.5 `stuck_detection_decision_detail` (D9a — gần Mentor Interaction Domain nhất, 🔶 chưa chốt hẳn)

**Purpose:** Lưu **tín hiệu** phát hiện Learner đang Stuck trong 1 `sub_session` + dữ liệu/ngưỡng đã dùng để phát hiện. **Không giải thuật toán Stuck Detection** (vẫn Open Question #6/#11) — Round 5 chỉ thiết kế nơi lưu kết quả phát hiện, đúng nguyên tắc đã áp dụng cho `self_assessment_mismatch` ở Round 4.

**Aggregate Owner:** 🔶 Mentor Interaction Domain (gần nhất theo DECISION-048 — write-owner chính thức chưa chốt hẳn ở Decision Log, ghi nhận như đã có). Không mở Boundary mới — tham chiếu `sub_session`.

**Lifecycle:** Append-only, immutable.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `stuck_detection_decision_detail_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `decision_header_id` | `uuid` | NOT NULL | — | FK → `decision_header` |
| `sub_session_id` | `uuid` | NOT NULL | — | FK → `sub_session` — phạm vi nội dung đang học khi phát hiện Stuck |
| `signal_payload` | `jsonb` | NOT NULL | `'{}'` | Dữ liệu/ngưỡng dùng để phát hiện — `jsonb` vì **cấu trúc chưa chốt** (thuật toán Open Q#6/#11), cùng lý do `evidence.raw_reference` |
| `detection_reasoning` | `text` | NOT NULL | — | Lý do coi đây là Stuck — explainability artifact D9a |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `stuck_detection_decision_detail_id`.

**FK:**
- `decision_header_id → decision_header(decision_header_id)` — `ON DELETE RESTRICT`
- `sub_session_id → sub_session(sub_session_id)` — `ON DELETE RESTRICT`

**Unique Constraints:** `uq_stuck_detection_decision_detail_decision_header_id` — `UNIQUE (decision_header_id)`.

**Check Constraints:**
- `ck_stuck_detection_decision_detail_detection_reasoning_not_empty` — `length(trim(detection_reasoning)) > 0`
- `ck_stuck_detection_decision_detail_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng. **Audit:** Chỉ created. **History:** Không áp dụng. **Retention:** Vĩnh viễn.

**RLS Impact:** Qua `decision_header.learner_id` — 1-hop.

---

### 1.6 `intervention_decision_detail` (D9b — Teaching Capability)

**Purpose:** Ghi cấp độ can thiệp (Intervention Tier) đã chọn sau khi 1 Stuck được phát hiện, kèm lý do — luôn là phản hồi trực tiếp cho đúng 1 `stuck_detection_decision_detail` cụ thể (chuỗi nhân-quả D9a → D9b trong cùng luồng Mentor Interaction).

**Aggregate Owner:** Teaching Capability. Không mở Boundary mới — tham chiếu `stuck_detection_decision_detail`.

**Lifecycle:** Append-only, immutable.

| Column | Data Type | Nullable | Default | Ghi chú |
|---|---|---|---|---|
| `intervention_decision_detail_id` | `uuid` | NOT NULL | sinh ở Application Layer (ULID-style) | **PK** |
| `decision_header_id` | `uuid` | NOT NULL | — | FK → `decision_header` (Header của chính quyết định D9b này, khác Header của D9a) |
| `stuck_detection_decision_detail_id` | `uuid` | NOT NULL | — | FK → `stuck_detection_decision_detail` — Stuck cụ thể mà can thiệp này phản hồi |
| `intervention_tier` | `text` | NOT NULL | — | `hint` / `guided_walkthrough` / `direct_fix` — 🔶 **suy luận của Claude**, chưa khóa Decision Log; [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md)/[AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md) đã cảnh báo "rủi ro leo lên Critical nếu intervention = direct fix" — cần Founder xác nhận danh sách trước khi sinh SQL |
| `intervention_reasoning` | `text` | NOT NULL | — | Lý do chọn tier này — explainability artifact D9b |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Audit |
| `created_by_actor_type` | `text` | NOT NULL | — | Audit — thực tế luôn `ai_service` |
| `created_by_actor_id` | `uuid` | NULL | — | Audit |

**PK:** `intervention_decision_detail_id`.

**FK:**
- `decision_header_id → decision_header(decision_header_id)` — `ON DELETE RESTRICT`
- `stuck_detection_decision_detail_id → stuck_detection_decision_detail(stuck_detection_decision_detail_id)` — `ON DELETE RESTRICT`

**Unique Constraints:** `uq_intervention_decision_detail_decision_header_id` — `UNIQUE (decision_header_id)`. **Không** UNIQUE trên `stuck_detection_decision_detail_id` — về lý thuyết 1 Stuck có thể nhận nhiều lượt can thiệp nối tiếp (tier leo thang qua thời gian nếu lượt đầu không hiệu quả) — Domain Architecture chưa khóa "đúng 1 intervention / stuck", nên không tự khóa cứng UNIQUE đó.

**Check Constraints:**
- `ck_intervention_decision_detail_intervention_tier` — `intervention_tier IN ('hint','guided_walkthrough','direct_fix')` *(🔶 đề xuất, xem ghi chú cột)*
- `ck_intervention_decision_detail_intervention_reasoning_not_empty` — `length(trim(intervention_reasoning)) > 0`
- `ck_intervention_decision_detail_created_by_actor_type` — enum đóng

**Versioning:** Không áp dụng. **Audit:** Chỉ created. **History:** Không áp dụng. **Retention:** Vĩnh viễn.

**RLS Impact:** Qua `decision_header.learner_id` — 1-hop.

---

### 1.7 Patch FK lên 4 Detail đã có (D2/D3/D4/D7) — không migrate, không đổi cấu trúc nội dung

Theo DECISION-049 mục 5 ("áp dụng từ thời điểm lock trở đi... không bắt buộc backfill"): thêm 1 cột mới, nullable, lên 4 bảng đã khóa từ Round 2-4 — **không sửa bất kỳ cột nội dung nào đã có**.

| Bảng | Cột mới | Nullable | FK | Lý do nullable |
|---|---|---|---|---|
| `assessment_result` (D2) | `decision_header_id` | NULL | → `decision_header`, `RESTRICT` | Hàng cũ (trước lock) không có Header — backfill tùy chọn, không bắt buộc |
| `recommendation_proposal` (D3) | `decision_header_id` | NULL | → `decision_header`, `RESTRICT` | Cùng lý do |
| `expansion_record` (D4) | `decision_header_id` | NULL | → `decision_header`, `RESTRICT` | Cùng lý do |
| `self_assessment_mismatch` (D7) | `decision_header_id` | NULL | → `decision_header`, `RESTRICT` | Cùng lý do |

**Hàng mới (sau lock):** Application Layer phải luôn điền `decision_header_id` khi tạo 4 entity này — đây là **kỳ vọng vận hành**, không phải ràng buộc DB (cột vẫn nullable để không phá dữ liệu cũ). 🔶 Nếu Founder/ChatGPT muốn ràng buộc cứng "mọi hàng mới phải có Header", cần 1 trigger kiểm tra `created_at > <thời điểm lock DECISION-049>` ⇒ `decision_header_id IS NOT NULL` — đề xuất, chưa thiết kế ở Round 5 (ngoài phạm vi, là Application/Backend Design).

**`uq_*_decision_header_id` cho cả 4 bảng** — nhất quán "đúng 1 Detail / 1 Header" (mục 7 Mandatory Questions), partial unique: `UNIQUE (decision_header_id) WHERE decision_header_id IS NOT NULL` (partial, cùng kỹ thuật `roadmap_node_knowledge_node`/`discovery_session` Round 3-4).

---

### 1.8 Mở rộng enum `trace_link` (data-dictionary, không sửa cấu trúc bảng)

Theo DECISION-049 mục 4 và [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 4 — Detail mới cần trỏ tới nguồn dữ liệu cụ thể đi qua `trace_link` đúng cách đã có, chỉ **mở rộng enum value**, không sửa cột/cấu trúc `trace_link`:

| `source_type` mới | Dùng bởi |
|---|---|
| `teaching_content_selection` | `teaching_decision_detail` (D1) |
| `local_expansion` | `local_expansion_decision_detail` (D5) |
| `stuck_detection_signal` | `stuck_detection_decision_detail` (D9a) |

`roadmap_mapping_decision_detail` (D6) và `intervention_decision_detail` (D9b) **không cần** mở rộng `trace_link` — cả 2 đã có FK trực tiếp tới đúng 1 nguồn cụ thể (`roadmap_node_knowledge_node_id`, `stuck_detection_decision_detail_id`), đủ provenance mà không cần lớp đa hình.

---

## 2. Constraint Specifications (tổng hợp)

| Bảng | Unique | Check | FK quan trọng |
|---|---|---|---|
| `decision_header` | — | `ck_*_decision_type`, `ck_*_capability_or_domain`, `ck_*_summary_reason_not_empty`, `ck_*_actor_type` | `learner_id` `RESTRICT` |
| `teaching_decision_detail` | `uq_*_decision_header_id` | `ck_*_selection_reasoning_not_empty`, `ck_*_actor_type` | `decision_header_id`/`mentor_session_id`/`knowledge_node_id` `RESTRICT` |
| `local_expansion_decision_detail` | `uq_*_decision_header_id` | `ck_*_expansion_reasoning_not_empty`, `ck_*_actor_type` | `decision_header_id`/`knowledge_node_id` `RESTRICT` |
| `roadmap_mapping_decision_detail` | `uq_*_decision_header_id` | `ck_*_mapping_reasoning_not_empty`, `ck_*_actor_type` | `decision_header_id`/`roadmap_node_knowledge_node_id` `RESTRICT` |
| `stuck_detection_decision_detail` | `uq_*_decision_header_id` | `ck_*_detection_reasoning_not_empty`, `ck_*_actor_type` | `decision_header_id`/`sub_session_id` `RESTRICT` |
| `intervention_decision_detail` | `uq_*_decision_header_id` | `ck_*_intervention_tier` *(đề xuất)*, `ck_*_intervention_reasoning_not_empty`, `ck_*_actor_type` | `decision_header_id`/`stuck_detection_decision_detail_id` `RESTRICT` |
| `assessment_result`/`recommendation_proposal`/`expansion_record`/`self_assessment_mismatch` *(patch)* | `uq_*_decision_header_id` *(partial, nullable)* | không đổi | `+decision_header_id` `RESTRICT` (nullable) |

---

## 3. Relationship Validation

| Quan hệ | Cardinality | Thiết kế Round 5 | Khớp? |
|---|---|---|---|
| `decision_header` ↔ `learner` | * — 1 | `decision_header.learner_id → learner(id)` | ✅ |
| `decision_header` ↔ mỗi Detail (5 mới + 4 đã có) | 1 — 0..1 | `<detail>.decision_header_id → decision_header`, UNIQUE mỗi bảng | ✅ — đúng DECISION-049 mục 3 |
| `teaching_decision_detail` ↔ `mentor_session`/`knowledge_node` | * — 1 mỗi FK | FK trực tiếp, `RESTRICT` | ✅ |
| `local_expansion_decision_detail` ↔ `knowledge_node` | * — 1 | FK trực tiếp, `RESTRICT` | ✅ |
| `roadmap_mapping_decision_detail` ↔ `roadmap_node_knowledge_node` | * — 1 | FK trực tiếp, `RESTRICT` — **không sửa** bảng đích | ✅ |
| `stuck_detection_decision_detail` ↔ `sub_session` | * — 1 | FK trực tiếp, `RESTRICT` | ✅ |
| `intervention_decision_detail` ↔ `stuck_detection_decision_detail` | * — 1 | FK trực tiếp, `RESTRICT` — chuỗi nhân-quả D9a→D9b | ✅ |
| `decision_header` ↔ `trace_link` | Không FK trực tiếp | Tách biệt hoàn toàn (DECISION-049 mục 4) — Detail (không phải Header) là điểm nối với `trace_link` khi cần | ✅ — đúng "Partially Overlapping", không gộp |

**Đối chiếu Aggregate Boundary:** Không Boundary nào trong số 10 đã khóa (Round 1-4) bị sửa. `decision_header` và 5 Detail mới **không mở Boundary mới** — đều là Supporting Persistence Entity, cùng vị thế `trace_link`/`learning_session_transition`/`approval_record`/`recommendation_proposal_response`. **Không phát hiện sai lệch cardinality nào.**

---

## 4. Đối chiếu "Round 1-4 giữ nguyên" — có xung đột trực tiếp nào với DECISION-049 không?

**Không.** Rà soát từng bảng Round 1-4 có khả năng liên quan:

| Bảng Round 1-4 | Có cần sửa không? | Lý do |
|---|---|---|
| `assessment_result`/`recommendation_proposal`/`expansion_record`/`self_assessment_mismatch` | 🟡 Patch — **chỉ thêm cột**, không sửa cột đã có | DECISION-049 mục 5 yêu cầu Header cho mọi decision **từ thời điểm lock**, áp dụng được bằng ADD COLUMN, không phải xung đột phải sửa lại |
| `roadmap_node_knowledge_node` | ❌ Không sửa | D6 đóng bằng Detail riêng (mục 1.4) — đúng quyết định đã để ngỏ ở [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 2, nay chọn nhánh "Detail riêng" |
| `trace_link` | ❌ Không sửa cấu trúc — chỉ mở rộng enum value (mục 1.8) | Đúng nguyên tắc đã áp dụng từ Round 4 cho `recommendation_proposal` |
| `mentor_session`/`sub_session`/`knowledge_node` | ❌ Không sửa | Chỉ được **tham chiếu** (FK mới từ Detail trỏ tới), không đổi cấu trúc của chính chúng |

**Kết luận: 0 xung đột trực tiếp được chứng minh.** "Patch thêm cột nullable" không phải "sửa lại" theo nghĩa thay đổi hành vi đã khóa — 4 bảng đó vẫn hoạt động đúng 100% như Round 2-4 đã thiết kế nếu cột mới luôn NULL.

---

## 5. RLS Impact Notes (Supabase) — tổng hợp

| Bảng | Pattern RLS | Hop |
|---|---|---|
| `decision_header` | `learner_id = auth.uid()` | 0 |
| 5 Detail mới | qua `decision_header.learner_id = auth.uid()` | 1 |
| 4 Detail đã có (sau patch) | Không đổi pattern cũ (`learner_id` trực tiếp hoặc qua bảng cha) — cột `decision_header_id` mới **không** cần Policy riêng, vì không lộ thêm dữ liệu Learner khác nào | 0 (không đổi) |

**Quyết định nhất quán:** mọi Detail mới dùng `decision_header.learner_id` làm đường RLS chuẩn (không phải qua FK domain-specific như `mentor_session`/`sub_session`) — giảm số pattern RLS khác nhau cần audit, đổi lại 1 JOIN thêm tới `decision_header` cho mọi Detail (chi phí chấp nhận được, cùng đánh đổi đã chọn ở Header/Detail nói chung).

---

## 6. Risks

| # | Rủi ro | Mức độ | Ghi chú |
|---|---|---|---|
| 1 | **`local_expansion_decision_detail` không có FK tới `knowledge_edge` cụ thể** — kế thừa đúng gap đã biết của `expansion_record` (Round 3 Risk #1) | Medium | Không phải lỗi mới, cùng bản chất, chưa chốt cardinality ở Domain Architecture |
| 2 | **`intervention_tier` (`hint`/`guided_walkthrough`/`direct_fix`) là enum suy luận của Claude**, đặc biệt nhạy vì DECISION-048 đã cảnh báo rủi ro leo cấp độ nếu `direct_fix` | **Medium-High** | Cần Founder/ChatGPT xác nhận danh sách + có nên giới hạn/cấm `direct_fix` ở tầng Application trước khi sinh SQL |
| 3 | **`stuck_detection_decision_detail.signal_payload` (jsonb) không có CHECK nào về cấu trúc** — vì thuật toán Stuck Detection chưa chốt (Open Q#6/#11) | Medium | Không phải thiếu sót Round 5 — không thể CHECK cấu trúc chưa tồn tại; cần revisit khi thuật toán chốt |
| 4 | **Đồng bộ Header+Detail+TraceLink vẫn là Application Layer Discipline, không DB-enforced** — đã biết từ [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 4 (Synchronization Risk), nay áp dụng cho 5 Detail mới + 4 patch | Medium | Cùng họ rủi ro GAP-04/GAP-05(cũ)/C-05 — khuyến nghị 1 Service/Repository layer duy nhất, ngoài phạm vi Database Design |
| 5 | **`decision_header_id` trên 4 bảng cũ là nullable vĩnh viễn** (không trigger nào buộc hàng mới phải có) — rủi ro hàng mới "quên" gắn Header nếu Application Layer không tuân thủ | Medium | Đề xuất trigger điều kiện theo `created_at`, chưa thiết kế (ngoài phạm vi DB Design thuần) |
| 6 | **`stuck_detection_decision_detail` write-owner chưa chốt hẳn** (🔶 gần Mentor Interaction nhất) — nếu Founder xác nhận thuộc Domain khác, không ảnh hưởng cấu trúc bảng, chỉ đổi Write-owner ghi chú | Low | Không phải rủi ro cấu trúc, chỉ là rủi ro tài liệu hóa |

## Liên kết ngược

[DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) (không đổi), [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md), [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DatabaseNamingConvention.md](DatabaseNamingConvention.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md).

**Đánh giá: [DDL_ROUND5_ARCHITECTURE_REVIEW.md](DDL_ROUND5_ARCHITECTURE_REVIEW.md) và [DDL_ROUND5_GAP_ANALYSIS.md](DDL_ROUND5_GAP_ANALYSIS.md). Chưa có SQL/`CREATE TABLE`/`CREATE POLICY` nào được tạo. Round 1-4 không bị sửa.**
