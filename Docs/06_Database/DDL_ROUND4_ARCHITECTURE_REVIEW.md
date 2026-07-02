# Round 4 Architecture Review — Aggregate Boundaries / FK Ownership / Cascade / Archive / Explainability / RLS / Supabase

> Validation toàn diện cho [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) — xác nhận Round 1+2+3+4 — **25 bảng tổng cộng** (19 từ Round 1-3 + `discovery_session`, `self_assessment_mismatch`, `mentor_session`, `recommendation_proposal`, `recommendation_proposal_response`, + 2 FK patch không tạo bảng mới). **Không thiết kế thêm bảng mới ở tài liệu này** — review/validation thuần.

## 0. Danh sách 25 bảng sau Round 4

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
| **4** | **Discovery** | **`discovery_session`, `self_assessment_mismatch`** |
| **4** | **Mentor Interaction** | **`mentor_session`** |
| **4** | **Recommendation** | **`recommendation_proposal`, `recommendation_proposal_response`** |

---

## 1. Aggregate Boundaries

| Boundary | Root | Children | Trạng thái sau Round 4 |
|---|---|---|---|
| 8 (mới) | `discovery_session` | `self_assessment_mismatch` | ✅ Đúng kế hoạch [LogicalDatabaseModel.md](LogicalDatabaseModel.md) — không Boundary phụ phát sinh ngoài dự kiến |
| 9 (mới) | `mentor_session` | — (standalone) | ✅ Đúng DECISION-031 — root độc lập, không con |
| 10 (mới) | `recommendation_proposal` | `recommendation_proposal_response` | ✅ `recommendation_proposal_response` là Supporting Persistence Entity mới, con trong Boundary đã có sẵn ở Logical Model — **không mở Boundary 11 mới**, phân loại đúng tiền lệ `learning_session_transition` ([DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)) |

**Kết luận:** Round 4 mở đúng 3 Boundary đã được Logical Model khóa từ trước (8/9/10), không phát sinh Boundary ngoài kế hoạch nào. `recommendation_proposal_response` là bảng phụ trợ duy nhất mới phát sinh ở Round 4 ngoài 4 entity Core được giao — cùng class với các Supporting Persistence Entity đã có (`approval_record`, `learning_session_transition`), đã đối chiếu không có Ownership Conflict.

## 2. FK Ownership

| FK | Write-owner cột nguồn | Write-owner bảng đích | Quan hệ sở hữu |
|---|---|---|---|
| `discovery_session.learner_id` | Discovery Domain | Identity Module | Tham chiếu, không sở hữu |
| `self_assessment_mismatch.discovery_session_id` | Discovery Domain | Discovery Domain (cùng domain) | Sở hữu — con trong Aggregate |
| `self_assessment_mismatch.knowledge_node_id` | Discovery Domain | Knowledge Graph Domain | Tham chiếu, không sở hữu (đúng nguyên tắc DECISION-015 áp dụng xuyên Round 2-4) |
| `self_assessment_mismatch.actual_assessment_result_id` | Discovery Domain | Assessment Domain | Tham chiếu, không sở hữu |
| `mentor_session.learner_id` | Mentor Interaction Domain | Identity Module | Tham chiếu |
| `mentor_session.sub_session_id` | Mentor Interaction Domain | Learning Session Domain | **Tham chiếu xuyên Domain, không sở hữu** — đúng tâm điểm DECISION-031 ("quan hệ giữa 2 domain là tham chiếu, không phải sở hữu chéo") |
| `recommendation_proposal.learner_id` | Recommendation Domain | Identity Module | Tham chiếu |
| `recommendation_proposal_response.recommendation_proposal_id` | Recommendation Domain | Recommendation Domain (cùng domain) | Sở hữu — con trong Aggregate |
| `sub_session.knowledge_node_id` *(patch)* | Learning Session Domain | Knowledge Graph Domain | Tham chiếu, không sở hữu |
| `evidence.mentor_session_id` *(patch)* | Evidence Domain | Mentor Interaction Domain | Tham chiếu, không sở hữu |

**Không phát hiện Ownership Conflict nào** — mọi FK xuyên Domain đều là tham chiếu một chiều (đọc/biết, không ghi/sở hữu ngược), khớp [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5. Đây là điểm quan trọng nhất cần xác nhận cho `mentor_session ↔ sub_session`: **không có entity nào sở hữu entity kia** — cả hai vẫn write-owner bởi domain riêng của mình.

## 3. Cascade Strategy

Nhất quán nguyên tắc đã áp dụng từ Round 1: **`CASCADE` chỉ trong cùng Aggregate Boundary; `RESTRICT` cho mọi FK xuyên Boundary.**

| Bảng | FK | Rule | Trong/ngoài Aggregate |
|---|---|---|---|
| `self_assessment_mismatch` | `discovery_session_id` | `CASCADE` | Trong (Boundary 8) |
| `self_assessment_mismatch` | `knowledge_node_id`, `actual_assessment_result_id` | `RESTRICT` | Ngoài |
| `mentor_session` | `learner_id`, `sub_session_id` | `RESTRICT` | Ngoài (cả 2) |
| `recommendation_proposal_response` | `recommendation_proposal_id` | `CASCADE` | Trong (Boundary 10) |
| `recommendation_proposal` | `learner_id` | `RESTRICT` | Ngoài |

**Điểm cần nhấn mạnh:** `mentor_session.sub_session_id` là `RESTRICT` dù về trực giác "MentorSession thuộc về SubSession" — đây là quyết định **có chủ đích**, đúng [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6: `MentorSession` thuộc Aggregate khác (Boundary 9), `CASCADE` ở đây sẽ **sai** vì sẽ xóa lịch sử tương tác đã xảy ra khi `SubSession` cha bị archive — vi phạm trực tiếp yêu cầu "tiếp tục là lịch sử độc lập". Không có ngoại lệ `CASCADE` xuyên Aggregate nào được thêm ở Round 4.

## 4. Archive Strategy

| Entity | Khi Aggregate cha bị Archive | Cơ chế |
|---|---|---|
| `discovery_session` | Không có cha — tự đứng độc lập theo `learner` | `state = 'ended'`, giữ vĩnh viễn, không archive riêng |
| `self_assessment_mismatch` | Theo `discovery_session` cha (CASCADE nếu hard-delete, nhưng thực tế không hard-delete `discovery_session`) | Append-only, không cần archive riêng |
| `mentor_session` | **Khi `sub_session`/`learning_session` cha bị Archive** | **Không đổi** — `RESTRICT` đảm bảo `mentor_session` không bị xóa, không bị sửa; vẫn `state`/`ended_at` độc lập với trạng thái Archive của cha (đúng [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6) |
| `recommendation_proposal` | Không có cha | Vĩnh viễn, append-only |
| `recommendation_proposal_response` | Theo `recommendation_proposal` cha | Append-only, `CASCADE` chỉ áp dụng nếu hard-delete (không xảy ra thực tế) |

**Kết luận:** Archive Strategy của `mentor_session` là điểm rủi ro thiết kế **đã được giải quyết đúng** — nguy cơ thường gặp là lập trình viên DB vô tình dùng `CASCADE` vì "trực giác cha-con", Round 4 đã tránh đúng nguy cơ này bằng cách bám sát Logical Model mục 6 thay vì suy luận tự do.

## 5. Explainability Alignment

Tiếp nối bảng Explainability Integrity đã có ở [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) mục 3 — bổ sung các cơ chế mới từ Round 4:

| Cơ chế Explainability | Bảng liên quan | DB-level guarantee? | Chi tiết |
|---|---|---|---|
| `self_assessment_mismatch.mismatch_reasoning` không rỗng | `self_assessment_mismatch` | ✅ **Có** — `CHECK` | D7 (Discovery) |
| `self_assessment_mismatch` → KnowledgeNode bị mismatch | `self_assessment_mismatch.knowledge_node_id` | ✅ **Có** — FK `NOT NULL` | D7 |
| `self_assessment_mismatch` → AssessmentResult dùng so sánh | `self_assessment_mismatch.actual_assessment_result_id` | 🟡 **Một phần** — FK tồn tại nhưng **nullable**, không bắt buộc luôn có | D7 — cố ý, vì so sánh có thể dựa trực tiếp Evidence |
| `recommendation_proposal` → tín hiệu nguồn (`traced_to[]`, DECISION-027 "bắt buộc, không ngoại lệ") | `trace_link` (`source_type='recommendation_proposal'`) | ❌ **Không** — không CHECK nào bắt buộc tồn tại ≥1 `trace_link` tương ứng | **Cùng Loại A đã biết từ Round 2** (`assessment_result`↔`trace_link`) — nhưng **mức độ nghiêm trọng cao hơn**: DECISION-027 dùng từ "**no exception**" riêng cho `RecommendationProposal`, khác mức độ khuyến nghị chung ở các entity khác |
| `mentor_session` đổi `learning_mode`/`state` giữ lịch sử | `history.mentor_session` | ✅ **Có** — trigger-maintained | Đã chốt từ Naming Convention mục 9 |
| `recommendation_proposal_response` → ai phản hồi | `created_by_actor_type`/`created_by_actor_id` | ✅ **Có** — `NOT NULL` enum | Human Control Boundary — Learner luôn là actor xác nhận |

### Phát hiện chính Round 4: **Loại A Explainability Integrity Gap mở rộng sang điểm có mức độ nghiêm trọng cao nhất tới giờ**

`recommendation_proposal.traced_to[]` là trường hợp **đầu tiên** trong toàn bộ schema mà chính Decision Log ([DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), trích Blueprint: *"mandatory non-nullable, no exception"*) khẳng định **không có ngoại lệ** cho việc thiếu truy vết — nhưng cơ chế triển khai (`trace_link`, đa hình, không FK vật lý) **về bản chất không thể** được PostgreSQL enforce bằng CHECK/FK đơn giản (đã biết từ DECISION-038). Điều này nâng cấp rủi ro đã ghi ở Round 2/3 (Loại A) từ "rủi ro vận hành đã biết, chấp nhận được" lên "**điểm duy nhất nơi chấp nhận-được và yêu-cầu-Decision-Log trực tiếp mâu thuẫn**" — cần ghi nhận rõ cho Founder/ChatGPT, không tự coi là đã xử lý.

**Khuyến nghị (không tự quyết định):** nếu DECISION-027 thực sự yêu cầu enforcement cứng (không chỉ "nên có"), cần 1 trong 2: (a) trigger `AFTER INSERT` trên `recommendation_proposal` kiểm tra tồn tại `trace_link` tương ứng trong cùng transaction (Application Layer phải đảm bảo thứ tự ghi), hoặc (b) chấp nhận đây là invariant Application-layer-only và ghi rõ trong Decision Log là "no exception ở mức quy trình, không ở mức DB constraint". Đây là quyết định Founder/Lead Architect, không phải Database Design.

## 6. RLS Implications

| Bảng | Pattern RLS | Hop | Đặc điểm mới so với Round 1-3 |
|---|---|---|---|
| `discovery_session` | `learner_id = auth.uid()` | 0 | Không có gì mới — cùng pattern `evidence`/`assessment_result` |
| `self_assessment_mismatch` | qua `discovery_session.learner_id` | 1 | Không có gì mới |
| `mentor_session` | `learner_id = auth.uid()` | 0 | Không có gì mới |
| `recommendation_proposal` | `learner_id = auth.uid()` | 0 | Không có gì mới |
| `recommendation_proposal_response` | qua `recommendation_proposal.learner_id` | 1 | Không có gì mới |

**Không phát hiện pattern RLS mới nào cần thiết kế thêm** — tất cả 5 bảng đều khớp 2 pattern đã có (0-hop trực tiếp, 1-hop qua cha) đã dùng xuyên Round 1-3. Khác với `trace_link`/`expansion_record` (Round 2-3, không theo `learner_id`, cần pattern "shared/global"), không có bảng Round 4 nào rơi vào nhóm đó — cả 5 bảng đều **thuộc riêng 1 Learner**, đơn giản hơn dự kiến.

## 7. Supabase Implications

| Điểm | Đánh giá |
|---|---|
| `gen_random_uuid()` cho `discovery_session_id`/`mentor_session_id` | ✅ Có sẵn trong Supabase Postgres (extension `pgcrypto`/`uuid-ossp` hoặc native `gen_random_uuid()` từ PG13+) — không có rủi ro mới, cùng cách dùng từ Round 1 |
| ULID-style Application-Layer ID cho `self_assessment_mismatch_id`/`recommendation_proposal_id`/`recommendation_proposal_response_id` | ✅ Không có rủi ro Supabase-specific — cùng pattern `evidence_id`/`trace_link_id` đã dùng từ Round 2 |
| `history.discovery_session` / `history.mentor_session` — schema riêng | 🔶 Cần xác nhận: Supabase Dashboard/PostgREST mặc định chỉ expose schema `public` qua REST API — schema `history` **sẽ không tự động có REST endpoint**, đây là **đúng mong muốn** (History Table chỉ truy cập qua SQL trực tiếp/Backend, không qua client trực tiếp) nhưng cần document rõ trong Policy Authoring để tránh nhầm là "thiếu sót" |
| Partial unique index (`uq_discovery_session_learner_id_active`) | ✅ Đã xác nhận tương thích Supabase managed Postgres từ Round 3 ([ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) — không lặp lại rủi ro, chỉ là lần dùng thứ 2) |
| `jsonb` cho `recommendation_proposal.payload` | ✅ Native Postgres/Supabase, cùng cách dùng `evidence.raw_reference`/`assessment_result.teach_capability_scores` |

**Không phát hiện rủi ro Supabase-specific mới** — Round 4 chỉ tái sử dụng kỹ thuật đã validate ở Round 1-3 (UUID, ULID, partial index, jsonb, schema `history`).

## 8. Capability Validation — Discovery / Mentor Interaction / Recommendation có hoạt động end-to-end không?

### 8.1 AI Discovery (D7)

**Đường dữ liệu:** `discovery_session` (phiên đang mở) → `self_assessment_mismatch` (phát hiện lệch, kèm `knowledge_node_id` + `mismatch_reasoning`) → (tùy chọn) `actual_assessment_result_id` nối ngược `assessment_result` đã có từ Round 2.

**Sau Round 4: ✅ Đầy đủ** — đây là lần đầu tiên Discovery Domain có nơi lưu trữ nào trong DB, đóng đúng gap đã biết từ Round 2/3 (Focus Area 4, [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) mục 4).

### 8.2 AI Mentor Interaction

**Đường dữ liệu:** `learning_session` → `sub_session` → `mentor_session` (1-*, mới đóng) → `evidence` (`mentor_session_id`, mới đóng FK).

**Sau Round 4: ✅ Đầy đủ, đóng đúng gap nghiêm trọng thứ 2** (sau `roadmap_node↔knowledge_node` ở Round 3) — trước Round 4, không có cách nào (ở tầng dữ liệu) biết 1 `evidence` cụ thể sinh ra từ lượt tương tác Mentor nào, hay 1 `sub_session` đã trải qua bao nhiêu lượt Mentor Interaction.

### 8.3 AI Recommendation

**Đường dữ liệu:** `knowledge_node_mastery`/`assessment_result`/`evidence_link` (Round 2, tín hiệu Regression) + `self_assessment_mismatch` (Round 4, tín hiệu Discovery) + `roadmap_node_knowledge_node` (Round 3, Dependency gap) → `recommendation_proposal` (Round 4, đề xuất) → `recommendation_proposal_response` (Round 4, Learner xác nhận/từ chối) → (nếu pause) `learning_session_transition` (Round 1, ghi nhận transition thực tế).

**Sau Round 4: ✅ Đầy đủ end-to-end lần đầu tiên** — đây là capability đã được xác nhận ở Round 3 là "nền tảng sẵn sàng, capability tự thân chưa hoạt động" ([ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) mục 4) — Round 4 đóng đúng 2 bảng còn thiếu (`recommendation_proposal`, `discovery_session`) đã được dự báo trước, không có gap ẩn mới phát sinh ngoài Risk #1/#2 đã ghi ở [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md) mục 6.

### 8.4 AI Explainability

**Sau Round 4: ✅ Đủ cấu trúc cho 6 năng lực (Teaching/Assessment/Recommendation/Discovery/Mentor Interaction + Explainability của chính nó) — 🔶 enforcement vẫn phụ thuộc Application Layer ở các điểm đã biết, cộng 1 điểm mới có mức độ nghiêm trọng cao hơn (mục 5 trên — `recommendation_proposal.traced_to[]` "no exception").**

---

## 9. Cross-check (Task 5)

| Nguồn | Kết quả đối chiếu |
|---|---|
| [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 1/2/5/6 | ✅ Khớp 100% — 3 Boundary (8/9/10), mọi cardinality đã chốt đều được hiện thực đúng, Reference Rule mục 6 (`SubSession → MentorSession`: Restrict/Archive độc lập) được tuân thủ chính xác |
| [DatabaseBlueprint.md](DatabaseBlueprint.md) §1.13–1.16 | ✅ Khớp — PK Strategy, Temporal Requirement, FK required/optional đều đúng như blueprint đã ghi trước Round 4 |
| [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) | 🟡 Khớp về cấu trúc (traceback qua `trace_link`), nhưng **chưa thỏa enforcement "no exception"** ở tầng DB — xem mục 5 |
| [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md) | ✅ Khớp hoàn toàn — hierarchy 3 tầng, tham chiếu không sở hữu chéo, đóng đúng Open Question #22 ở tầng DB |
| [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md) | ✅ Không xung đột — Round 4 không chạm `goal`, và `recommendation_proposal` cố ý không FK trực tiếp tới `goal` (mục 3 [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md)) |
| [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md) | ✅ Khớp — `recommendation_proposal.action_type` hỗ trợ `pause_learning_session` như 1 giá trị enum, không phải cấu trúc riêng, đúng yêu cầu "không phải loại hành động hoàn toàn mới về cấu trúc" |
| [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) | ✅ Khớp — không có Polymorphic FK nào được thêm trên entity nghiệp vụ Round 4; mọi truy vết qua `trace_link` |
| [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) | ✅ Khớp 100% — `discovery_session`/`mentor_session` đúng nhóm "Cần History Table"; `self_assessment_mismatch`/`recommendation_proposal` đúng nhóm "append-only, không cần" — cả 2 phân loại đã được Naming Convention mục 9 chốt **trước** khi Round 4 viết, Round 4 chỉ hiện thực hóa đúng, không tự suy diễn |
| [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | 🟡 Khớp về phạm vi (D7 có nơi lưu) — Decision Header (cơ chế persist D1/D6/D7/D9 reasoning tập trung) **vẫn chưa được thiết kế**, ngoài phạm vi Round 4 theo đúng chỉ định ban đầu |

**Không phát hiện Ownership Conflict, Aggregate Conflict, hay Explainability Conflict nào** ngoài 2 điểm 🟡 đã nêu (DECISION-027 enforcement, DECISION-048 Decision Header) — cả 2 đều là gap **đã biết trước, có kế hoạch hoãn**, không phải xung đột phát sinh bất ngờ từ thiết kế Round 4.

---

## OUTPUT STATUS

**READY_FOR_SQL_GENERATION** (cho 5 bảng + 2 FK patch của Round 4)

Lý do:
- 5 bảng Round 4 thiết kế đầy đủ, đúng Logical Model, nhất quán Round 1-3 ([DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md)).
- 2 forward dependency cuối cùng đã đóng (`sub_session.knowledge_node_id`, `evidence.mentor_session_id`) — không còn forward dependency nào treo từ Round 1-3.
- 6 năng lực AI được validate: Discovery (✅ đầy đủ, mới), Mentor Interaction (✅ đầy đủ, mới), Recommendation (✅ đầy đủ end-to-end lần đầu), Teaching/Assessment (✅ không đổi từ Round 2-3), Explainability (🟡 đủ cấu trúc, 1 điểm enforcement mức độ cao hơn cần Founder xác nhận).
- Không phát hiện Ownership/Aggregate/Explainability Conflict nào ngoài 2 gap đã biết trước (Decision Header, DECISION-027 enforcement).

**Khuyến nghị xác nhận trước khi sinh SQL cho Round 4 (không tự quyết định):**
1. `uq_discovery_session_learner_id_active` — có khóa cứng invariant "1 Discovery Session active/Learner" hay không (Risk #4, [DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md)).
2. Danh sách `action_type`/`self_reported_level` — xác nhận hoặc mở rộng 2 enum suy luận (Risk #3).
3. `trace_link.target_type` có cần mở rộng thêm `self_assessment_mismatch` không (Risk #2).
4. `ck_evidence_mentor_session_id_consistency` — thêm CHECK ràng buộc `source_type`/`mentor_session_id` hay để nguyên (Risk #5).
5. Cơ chế enforcement cho `recommendation_proposal.traced_to[]` "no exception" — trigger hay quy trình Application Layer (mục 5).

**Khuyến nghị cho Round 5+ (ngoài phạm vi Round 4):** Decision Header (DECISION-048), D1 Teaching persistence (GAP-01), D5 Local Expansion reason store (GAP-02) — xem [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md) cho phân tích đầy đủ.

## Liên kết ngược

[DDL_ROUND4_DESIGN.md](DDL_ROUND4_DESIGN.md), [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).
