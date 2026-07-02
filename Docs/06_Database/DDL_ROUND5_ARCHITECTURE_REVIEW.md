# Round 5 Architecture Review — Decision Persistence Layer Validation

> Validation toàn diện cho [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md) — xác nhận Round 1+2+3+4+5 — **32 bảng tổng cộng** (25 từ Round 1-4 + `decision_header` + 5 Detail mới + 0 bảng mới từ 4 patch cột). **Không thiết kế thêm bảng mới ở tài liệu này** — review/validation thuần.

## 0. Danh sách bảng sau Round 5

| Round | Module | Bảng |
|---|---|---|
| 1-4 | (không đổi) | 25 bảng đã có — xem [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) mục 0 |
| **5** | **Decision Persistence (cross-cutting)** | **`decision_header`** |
| **5** | **D1 (Teaching)** | **`teaching_decision_detail`** |
| **5** | **D5 (Local Expansion)** | **`local_expansion_decision_detail`** |
| **5** | **D6 (Roadmap Mapping)** | **`roadmap_mapping_decision_detail`** |
| **5** | **D9a (Stuck Detection)** | **`stuck_detection_decision_detail`** |
| **5** | **D9b (Intervention)** | **`intervention_decision_detail`** |

(4 bảng Round 2-4 patch thêm `decision_header_id` — không phải bảng mới, không tăng tổng số bảng.)

---

## 1. Aggregate Boundaries

| Boundary | Trạng thái sau Round 5 |
|---|---|
| 1-10 (Round 1-4) | ✅ **Không đổi** — không bảng nào trong 10 Boundary bị thêm/sửa cột nội dung; 4 patch chỉ thêm 1 FK tham chiếu mới, không đổi Boundary membership |
| Decision Persistence Layer (`decision_header` + 5 Detail mới) | ✅ **Không mở Boundary mới** — cùng phân loại Supporting Persistence Entity với `trace_link` (DECISION-038), đúng quyết định đã chốt ở DECISION-049 mục 2 |

**Kết luận:** Round 5 là **lớp bổ trợ kiến trúc đứng trên** 10 Boundary đã khóa, không phải Boundary thứ 11 — nhất quán với cách `trace_link` được xử lý từ Round 2 (không Domain, không Boundary, cross-cutting).

## 2. FK Ownership

| FK | Write-owner cột nguồn | Write-owner bảng đích | Quan hệ sở hữu |
|---|---|---|---|
| `decision_header.learner_id` | (không Domain — cross-cutting) | Identity Module | Tham chiếu |
| `teaching_decision_detail.decision_header_id` | Teaching Capability | (không Domain — cross-cutting) | Tham chiếu, không sở hữu |
| `teaching_decision_detail.mentor_session_id`/`knowledge_node_id` | Teaching Capability | Mentor Interaction / Knowledge Graph Domain | Tham chiếu |
| `local_expansion_decision_detail.knowledge_node_id` | Knowledge Graph Domain | Knowledge Graph Domain (cùng domain) | Tham chiếu trong-domain |
| `roadmap_mapping_decision_detail.roadmap_node_knowledge_node_id` | Goal & Roadmap Domain | Goal & Roadmap Domain (cùng domain) | Tham chiếu trong-domain |
| `stuck_detection_decision_detail.sub_session_id` | Mentor Interaction Domain (🔶) | Learning Session Domain | Tham chiếu xuyên Domain |
| `intervention_decision_detail.stuck_detection_decision_detail_id` | Teaching Capability | Mentor Interaction Domain (🔶) | Tham chiếu xuyên Domain — chuỗi nhân-quả D9a→D9b |
| 4 patch (`*.decision_header_id`) | Domain gốc của từng bảng (không đổi) | (không Domain — cross-cutting) | Tham chiếu mới, không đổi sở hữu nội dung |

**Không phát hiện Ownership Conflict nào** — mọi FK mới đều là tham chiếu một chiều, không Domain nào "mượn" quyền sở hữu Domain khác. Điểm cần nhấn mạnh: `decision_header` **không sở hữu** Detail (đúng hướng đã chốt DECISION-049 mục 3) — Header chỉ được Detail tham chiếu ngược, không đảo vai trò.

## 3. Cascade Strategy

**Toàn bộ FK mới ở Round 5 là `RESTRICT`** — không có `CASCADE` nào được thêm:

| Lý do | Áp dụng cho |
|---|---|
| `decision_header` là append-only, không hard-delete trong thực tế — nhưng về nguyên tắc thiết kế, xóa Header phải bị chặn nếu còn Detail tham chiếu (giữ nguyên vẹn explainability) | Mọi `<detail>.decision_header_id` |
| FK xuyên Domain (Detail tham chiếu entity nghiệp vụ ở Domain khác) — đúng nguyên tắc "Cascade chỉ trong Aggregate, Restrict giữa Aggregate/Domain" áp dụng nhất quán từ Round 1 | `mentor_session_id`, `knowledge_node_id`, `roadmap_node_knowledge_node_id`, `sub_session_id`, `stuck_detection_decision_detail_id` |

**Không có ngoại lệ `CASCADE` nào được thêm ở Round 5** — nhất quán 100% với Round 1-4.

## 4. Archive Strategy

| Entity | Khi entity tham chiếu bị Archive | Cơ chế |
|---|---|---|
| 5 Detail mới | Nếu `mentor_session`/`sub_session`/`roadmap_node_knowledge_node`/`knowledge_node` cha bị Archive | `RESTRICT` đảm bảo Detail không bị xóa/sửa — tiếp tục là lịch sử độc lập, cùng nguyên tắc đã áp dụng cho `mentor_session ↔ sub_session` ở Round 4 |
| `decision_header` | Không có cha — đứng độc lập theo `learner` | Vĩnh viễn, không archive riêng |
| `intervention_decision_detail` | Nếu hệ thống sau này "archive" 1 `stuck_detection_decision_detail` (hiện chưa có khái niệm archive cho Detail nào) | Không áp dụng — mọi Detail append-only, không có trạng thái Archive riêng để xử lý |

**Không phát hiện rủi ro Archive mới** — mọi Detail Round 5 đều append-only, không có trạng thái "Active/Archived" riêng cần đồng bộ.

## 5. Explainability Alignment

| Cơ chế Explainability | Bảng liên quan | DB-level guarantee? | Chi tiết |
|---|---|---|---|
| `decision_header.summary_reason` không rỗng | `decision_header` | ✅ **Có** — CHECK | Bắt buộc ngay cả D8 (không Detail) |
| Mỗi Detail `*_reasoning` không rỗng | 5 Detail mới | ✅ **Có** — CHECK mỗi bảng | D1/D5/D6/D9a/D9b |
| Detail → Header (đúng 1) | `uq_*_decision_header_id` | ✅ **Có** — UNIQUE + FK NOT NULL | Trả lời Mandatory Q6/Q7 |
| Header → Detail (D8 không có) | — | ✅ **Đúng theo thiết kế** — D8 không có bảng Detail, Header tự đủ (Runtime Reconstruction trả lời "vì sao", Header trả lời "có xảy ra không, khi nào") | DECISION-049 mục 7/8 |
| 4 Detail cũ (D2/D3/D4/D7) → Header | `decision_header_id` (nullable) | 🟡 **Một phần** — FK tồn tại nhưng **không bắt buộc** (nullable vĩnh viễn) | Risk #5, [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md) |
| `teaching_decision_detail`/`local_expansion_decision_detail`/`stuck_detection_decision_detail` → nguồn dữ liệu cụ thể | `trace_link` (enum mở rộng) | ❌ **Không** — không CHECK nào bắt buộc tồn tại `trace_link` tương ứng | **Cùng Loại A đã biết** từ Round 2 (`assessment_result`↔`trace_link`), nay mở rộng sang 3 Detail mới |

### Phát hiện chính Round 5: **Loại A Explainability Integrity Gap mở rộng thêm 3 điểm, nhưng KHÔNG còn mức độ nghiêm trọng "no exception" như C-05 (Round 4)**

Khác với `recommendation_proposal.traced_to[]` (Round 4, DECISION-027 dùng từ "no exception"), 3 Detail mới có TraceLink (D1/D5/D9a) **không** có yêu cầu "no exception" tương đương trong Decision Log hiện tại — đây là Loại A ở mức độ rủi ro đã biết, chấp nhận được (cùng nhóm GAP-04), **không** nâng cấp lên Critical như C-05. Risk #4 ([DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md)) ghi nhận đúng mức độ này.

**Tổng số điểm phụ thuộc Application Layer cho Explainability Integrity (Loại A) tăng từ 4 (sau Round 4: `assessment_result`, `expansion_record`, `roadmap_node_knowledge_node`, `recommendation_proposal`) lên 7 sau Round 5** (+`teaching_decision_detail`, +`local_expansion_decision_detail`, +`stuck_detection_decision_detail`) — xu hướng tăng dần đã được dự báo từ Round 3, không phải phát hiện bất ngờ.

## 6. RLS Implications

| Bảng | Pattern RLS | Hop |
|---|---|---|
| `decision_header` | `learner_id = auth.uid()` | 0 |
| 5 Detail mới | qua `decision_header.learner_id` | 1 |
| 4 Detail cũ (sau patch) | Không đổi pattern đã có | Không đổi |

**Không phát hiện pattern RLS mới nào** — toàn bộ Round 5 tái sử dụng 2 pattern đã validate (0-hop/1-hop theo `learner_id`), đúng cách Round 4 đã làm với `discovery_session`/`mentor_session`/`recommendation_proposal`.

## 7. Supabase Implications

| Điểm | Đánh giá |
|---|---|
| ULID-style Application-Layer ID cho `decision_header_id` + 5 Detail mới | ✅ Không rủi ro mới — cùng pattern `trace_link_id`/`evidence_id` |
| Partial unique index `uq_*_decision_header_id WHERE decision_header_id IS NOT NULL` (4 patch) | ✅ Đã validate từ Round 3-4, lần dùng thứ 3 |
| `jsonb` cho `stuck_detection_decision_detail.signal_payload` | ✅ Native, cùng pattern `evidence.raw_reference`/`recommendation_proposal.payload` |
| Mở rộng `ck_trace_link_source_type` (CHECK, không phải PG ENUM type) | ✅ Không cần `ALTER TYPE` phức tạp — chỉ `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` với danh sách mới, tương thích Supabase managed Postgres không hạn chế |

**Không phát hiện rủi ro Supabase-specific mới.**

## 8. Capability Validation — D1/D5/D6/D9a/D9b có đầy đủ explainability path không?

### 8.1 D1 — Teaching Content Selection

**Đường dữ liệu:** `decision_header` (decision_type='D1') → `teaching_decision_detail` (1-1, `knowledge_node_id` + `mentor_session_id` + `selection_reasoning`) → (tùy chọn) `trace_link` (source_type='teaching_content_selection') → Evidence/AssessmentResult/KnowledgeNodeMastery đã dùng để quyết định.

**Sau Round 5: ✅ Đầy đủ** — đóng đúng GAP-01 (Critical, đã treo từ EXPLAINABILITY_GAP_ANALYSIS Round 3.5 tới giờ).

### 8.2 D5 — Local Knowledge Expansion

**Đường dữ liệu:** `decision_header` (D5) → `local_expansion_decision_detail` (`knowledge_node_id` + `expansion_reasoning` nội bộ) → (tùy chọn) `trace_link`.

**Sau Round 5: ✅ Đầy đủ** — đóng GAP-02 (Critical). **Giới hạn kế thừa không đổi:** không trace tới `knowledge_edge` cụ thể được tạo ra (Risk #1, cùng bản chất `expansion_record` Round 3).

### 8.3 D6 — Roadmap Mapping (Dependency Edge)

**Đường dữ liệu:** `decision_header` (D6) → `roadmap_mapping_decision_detail` (`roadmap_node_knowledge_node_id` + `mapping_reasoning`) — **không cần TraceLink**, vì FK trực tiếp đã đủ provenance (chỉ 1 nguồn duy nhất: chính Dependency Edge đó).

**Sau Round 5: ✅ Đầy đủ** — đóng GAP-05/H-01, mà **không phải sửa `roadmap_node_knowledge_node`** (Round 3 giữ nguyên 100%, đúng yêu cầu Round 5).

### 8.4 D9a — Stuck Detection (tín hiệu)

**Đường dữ liệu:** `decision_header` (D9a) → `stuck_detection_decision_detail` (`sub_session_id` + `signal_payload` + `detection_reasoning`) → (tùy chọn) `trace_link`.

**Sau Round 5: 🟡 Đầy đủ về mặt *nơi lưu*, chưa đầy đủ về mặt *nội dung được lưu là gì*** — `signal_payload` là `jsonb` không cấu trúc vì thuật toán Stuck Detection (Open Q#6/#11) vẫn chưa chốt. Đây **không phải gap của Round 5** — là gap thuật toán/Domain Architecture đã biết trước, ngoài phạm vi DDL.

### 8.5 D9b — Intervention Tier Selection

**Đường dữ liệu:** `decision_header` (D9b) → `intervention_decision_detail` (`stuck_detection_decision_detail_id` + `intervention_tier` + `intervention_reasoning`).

**Sau Round 5: ✅ Đầy đủ về cấu trúc** — nhưng `intervention_tier` là enum suy luận chưa khóa Decision Log (Risk #2, mức Medium-High do liên quan trực tiếp tới rủi ro "AI tự fix code" đã từng được flag là Open Question ở giai đoạn PRD).

### 8.6 D8 — Mode Selection (không đổi)

**Sau Round 5: ✅ Không đổi** — vẫn Runtime Reconstruction, chỉ có `decision_header` (decision_type='D8'), không Detail. Điều kiện "input phải tự truy xuất lại được" vẫn là Open Item (DECISION-048_FINAL_REVIEW), không thuộc phạm vi DDL.

---

## 9. Cross-check (Task 5)

| Nguồn | Kết quả đối chiếu |
|---|---|
| [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) | ✅ Khớp — mọi Detail mới có `reasoning` không rỗng, đúng nguyên tắc gốc; phạm vi DECISION-027 (3 nhóm gốc) không bị sửa, chỉ được DECISION-048/049 mở rộng cơ chế |
| [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) | ✅ Khớp — không Polymorphic FK nào thêm trên Detail/Header; `trace_link` chỉ mở rộng enum value, không đổi cấu trúc |
| [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) | ✅ Khớp — toàn bộ `decision_header` + 5 Detail mới là append-only, đúng nhóm "không cần History Table"; không bảng nào trong Round 5 cần `history.*` |
| [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md) | ✅ Khớp — `decision_header`/5 Detail mới cùng phân loại Supporting Persistence Entity đã được tiền lệ này xác lập, không Ownership Conflict |
| [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | ✅ Khớp — cả 10 Decision Type đều có nơi lưu "đã xảy ra" (Header); 9/10 có Detail nội dung đầy đủ; D8 dùng Runtime Reconstruction đúng ngoại lệ duy nhất đã khóa |
| [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md) | ✅ Khớp 100% — Detail trỏ về Header (không đảo chiều), Header không có `detail_type`/`detail_id`, Header/TraceLink tách biệt, D6 dùng Detail riêng (không sửa Round 3) |

**Không phát hiện Explainability Conflict, Aggregate Conflict, Persistence Conflict, hay Traceability Conflict nào.**

---

## OUTPUT STATUS

**READY_FOR_SQL_GENERATION** (cho `decision_header` + 5 Detail mới + 4 FK patch)

Lý do:
- 6 bảng mới + 4 patch thiết kế đầy đủ, đúng DECISION-049, nhất quán Round 1-4.
- 6 Decision Type còn thiếu persistence (D1/D5/D6/D9a/D9b + D8-qua-Header) nay đều có cơ chế — đóng GAP-01/GAP-02/GAP-05 ở mức **cấu trúc** (xem [DDL_ROUND5_GAP_ANALYSIS.md](DDL_ROUND5_GAP_ANALYSIS.md) cho đánh giá "đóng đến đâu" chính xác).
- Không phát hiện Boundary/Ownership/Aggregate Conflict nào — Round 1-4 không bị sửa cấu trúc.
- 0 xung đột trực tiếp với DECISION-049 được chứng minh cần sửa Round 1-4 (mục 4, [DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md)).

**Khuyến nghị xác nhận trước khi sinh SQL:**
1. `intervention_tier` — danh sách enum (Risk #2) — đặc biệt nhạy vì liên quan rủi ro "direct fix".
2. `stuck_detection_decision_detail.signal_payload` — cấu trúc jsonb chờ thuật toán Stuck Detection chốt (Risk #3, Open Q#6/#11) — không chặn SQL generation (jsonb không cần cấu trúc trước), nhưng cần biết để Backend tiêu thụ đúng.
6. Cơ chế ép buộc Header cho hàng mới của 4 Detail cũ (Risk #5) — trigger hay Application Layer Discipline thuần.

## Liên kết ngược

[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md), [DDL_ROUND5_GAP_ANALYSIS.md](DDL_ROUND5_GAP_ANALYSIS.md), [DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md), [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-049](../11_Decisions/DECISION-049-Decision-Persistence-Mechanism.md).
