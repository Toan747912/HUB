# DECISION-050 — SQL Pre-Generation Finalization

- **Status:** ✅ **Accepted (Locked).**
- **Date:** SQL Pre-Generation Finalization Round — kế thừa [SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](../06_Database/MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](../06_Database/POSTGRESQL_FEATURE_MATRIX.md). Không có review/phân tích mới — chỉ chốt 6 open item đã được liệt kê tường minh từ Round Planning trước.
- **No new entity, aggregate, domain, hay capability nào được tạo ở Decision này.**

---

## Context

[POSTGRESQL_FEATURE_MATRIX.md](../06_Database/POSTGRESQL_FEATURE_MATRIX.md) và [SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md) đã hoàn thành kế hoạch sinh SQL cho 28 bảng (DDL Round 1-5), nhưng để lại 6 chi tiết chưa khóa — toàn bộ là chi tiết **bên trong** các bảng/cơ chế đã thiết kế (không phải entity/cấu trúc mới). DECISION-050 chốt 6 điểm này để gỡ block cuối cùng trước khi sinh SQL thật.

---

## Decision

### 1. `updated_at` Maintenance Strategy — **Database Trigger, duy nhất**

**Cơ chế:** 1 trigger function chung `fn_set_updated_at()`, gắn `BEFORE UPDATE FOR EACH ROW` — set `NEW.updated_at := now()` vô điều kiện (không so sánh `OLD`/`NEW` để phát hiện "không đổi thật" — giữ đơn giản, vì xác định "thay đổi có ý nghĩa" khác nhau tùy bảng, không có lợi ích đủ lớn để bù chi phí phức tạp).

| Khía cạnh | Quyết định |
|---|---|
| **Ownership** | Cross-cutting infrastructure — không Domain nào sở hữu, cùng vị thế `trace_link`/`decision_header`. Tạo 1 lần ở Batch 0 ([SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md) mục 2). |
| **Trigger Scope** | Gắn vào đúng 9 bảng Current State Snapshot đã xác định: `learner`, `roadmap`, `roadmap_node`, `learning_session`, `sub_session`, `knowledge_node`, `knowledge_node_mastery`, `discovery_session`, `mentor_session`. Chỉ `BEFORE UPDATE`, không bao giờ `BEFORE INSERT` (giá trị khởi tạo `updated_at = now()` đã có ở `DEFAULT`, không cần trigger). |
| **Exclusions** | 19 bảng append-only (không có cột `updated_at` — trigger không áp dụng được, không cần loại trừ tường minh, tự động không khớp). Bảng `history.*` (insert-only log, không cần `updated_at`). Application Layer **không được phép** tự set `updated_at` thủ công trong câu `UPDATE` — trigger là nguồn sự thật duy nhất (loại bỏ rủi ro lệch giá trị nếu Backend quên set). |

**Không có ngoại lệ nào khác** — quyết định này áp dụng đồng nhất cho cả 9 bảng, không có bảng nào dùng cơ chế khác (vd Application Layer set tay).

---

### 2. `intervention_decision_detail.intervention_tier` — **MODIFY: loại bỏ `direct_fix`**

**Đối chiếu:**
- **Learning Philosophy / AI Autonomy Boundary:** mọi hành động AI có tác động tới state Learner đã thiết lập nhất quán pattern "AI đề xuất, Learner xác nhận" ([DECISION-033](DECISION-033-Adaptive-Pause.md) Pause; `recommendation_proposal_response` Confirmed/Ignored; [DECISION-006](DECISION-006-Roadmap-Governance.md) Roadmap Governance). `direct_fix` (AI tự sửa trực tiếp bài làm/code của Learner) là hành động **tự thực thi, không qua xác nhận** — vi phạm trực tiếp pattern này, không phải biến thể nhỏ có thể chấp nhận.
- **Explainability:** `direct_fix` không tự nó là vấn đề explainability (vẫn có `intervention_reasoning` ghi lại) — nhưng explainability không giải quyết được câu hỏi gốc "AI có **được phép** làm việc này không", đó là Human Control Boundary, không phải Explainability.
- **Mentor Interaction:** vai trò Mentor AI đã định nghĩa là hướng dẫn/đồng hành (Hint/Guide), không phải thay Learner làm bài — `direct_fix` lệch khỏi định nghĩa vai trò gốc.

**Quyết định:** `intervention_tier` chốt **2 giá trị**: `hint`, `guided_walkthrough`. **`direct_fix` bị loại bỏ hoàn toàn** — nếu phát hiện Stuck nghiêm trọng tới mức cần can thiệp mạnh hơn `guided_walkthrough`, lối thoát đúng kiến trúc là: AI tạo 1 `recommendation_proposal` (action_type mới hoặc đã có) đề xuất hành động mạnh hơn, đi qua `recommendation_proposal_response` để Learner xác nhận — **không** thêm 1 giá trị `intervention_tier` tự thực thi. `intervention_decision_detail` (D9b) giữ nguyên cấu trúc cột đã thiết kế ở [DDL_ROUND5_DESIGN.md](../06_Database/DDL_ROUND5_DESIGN.md) mục 1.6 — chỉ đổi **danh sách giá trị CHECK**, không đổi cột/bảng.

---

### 3. `recommendation_proposal.action_type` — **LOCK 3 giá trị đã đề xuất, không đổi**

**Final set:** `pause_learning_session`, `review_knowledge_node`, `roadmap_adjustment_suggestion`.

| Khía cạnh | Quyết định |
|---|---|
| **Ownership** | Recommendation Domain sở hữu CHECK constraint này (cùng write-owner bảng `recommendation_proposal`) |
| **Extensibility Strategy** | **Không phải lookup table, không Admin-editable** (đúng nguyên tắc đã chốt ở [SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md) mục 5). Thêm giá trị mới **luôn cần 1 Decision Log entry mới** (giá trị `action_type` định nghĩa ranh giới hành động AI được phép đề xuất — đây là quyết định kiến trúc/chính sách, không phải dữ liệu cấu hình vận hành). Thực thi kỹ thuật: `ALTER TABLE ... DROP CONSTRAINT ck_recommendation_proposal_action_type, ADD CONSTRAINT ... CHECK (action_type IN (...))` ở 1 DDL Round sau, khi có Decision Log tương ứng. |

Không cần xem xét thêm vì cả 3 giá trị đã khớp đúng 3 cơ chế đã khóa: `pause_learning_session` (DECISION-033), `review_knowledge_node` (Regression signal, DECISION-016/021), `roadmap_adjustment_suggestion` (DECISION-006 Roadmap Governance).

---

### 4. `self_assessment_mismatch.self_reported_level` — **LOCK 4 giá trị đã đề xuất, không đổi**

**Final set:** `remember`, `explain`, `apply`, `teach` — tái dùng đúng 4 mức của Mastery Framework ([DECISION-017](DECISION-017-Mastery-Framework.md)).

| Khía cạnh | Quyết định |
|---|---|
| **Validation Rules** | `NOT NULL` + `CHECK IN (4 giá trị)` — đủ, không cần validation cross-field nào ở tầng DB (so sánh self-report vs actual assessment là logic Application/AI Layer, không phải DB constraint) |
| **Future Extensibility** | **Khóa cùng nhịp với Mastery Framework** — nếu DECISION-017 thay đổi (vd thêm mức thứ 5, hoặc tách `teach` thành sub-capability), `self_reported_level` **phải đổi theo cùng 1 Decision Log entry đó**, không tự tách riêng. Lý do: tách rời 2 taxonomy (self-reported vs actual-assessed) cho cùng 1 khái niệm sẽ tạo nguy cơ lệch ngữ nghĩa giữa "Learner tự nhận đạt Explain" và "AI đánh giá đạt Explain" — phải luôn là cùng 1 thước đo. |

---

### 5. `trace_link.source_type` — **RENAME 3 giá trị mới (Round 5) để khớp đúng convention đã có**

**Phát hiện khi rà soát:** mọi giá trị `source_type` hiện có (`assessment_result`, `recommendation_proposal`) là **tên bảng vật lý nguyên văn**, không phải mô tả ngắn. 3 giá trị đề xuất ở Round 5 (`teaching_content_selection`, `local_expansion`, `stuck_detection_signal`) lệch khỏi convention này — và `local_expansion` cụ thể **trùng nghĩa mơ hồ** với khái niệm "Expansion" đã gắn với `expansion_record` (D4, Deep/Structural) từ Round 3, dù 2 bảng khác nhau hoàn toàn.

**Quyết định: RENAME, khớp convention "giá trị = tên bảng":**

| Giá trị đề xuất (Round 5, chưa từng sinh SQL) | Giá trị chốt (DECISION-050) |
|---|---|
| `teaching_content_selection` | `teaching_decision_detail` |
| `local_expansion` | `local_expansion_decision_detail` |
| `stuck_detection_signal` | `stuck_detection_decision_detail` |

**Tác dụng phụ:** loại bỏ hoàn toàn mơ hồ với `expansion_record` — `local_expansion_decision_detail` không thể bị đọc nhầm thành "Deep/Structural Expansion". Đây là **sửa tên giá trị CHECK trước khi sinh SQL lần đầu** (chưa có SQL/migration nào tồn tại cho `trace_link` mở rộng — [DDL_ROUND5_DESIGN.md](../06_Database/DDL_ROUND5_DESIGN.md) mục 1.8 chỉ là đề xuất thiết kế, chưa `CREATE`/`ALTER` thật) — **không phải sửa lại 1 bảng đã build**.

---

### 6. 4 Partial Index đề xuất ([POSTGRESQL_FEATURE_MATRIX.md](../06_Database/POSTGRESQL_FEATURE_MATRIX.md) mục 3.2) — **3 ACCEPT, 1 REJECT**

| Index đề xuất | Quyết định | Lý do |
|---|---|---|
| `ix_learning_session_learner_id_active` (`WHERE state = 'active'`) | ✅ **ACCEPT** | Hot Path #7 đã khóa ([DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 4) — truy vấn "LearningSession active của Learner" là hot path mở mỗi lần Learner vào hệ thống; `WHERE` trên enum ổn định, rủi ro thấp |
| `ix_sub_session_learning_session_id_active` (`WHERE state = 'active'`) | ✅ **ACCEPT** | Cùng Hot Path #7, cùng lý do |
| `ix_mentor_session_learner_id_active` (`WHERE state = 'active'`) | ✅ **ACCEPT** | Phục vụ truy vấn "đang trong lượt tương tác nào" — cùng nhóm lý do, không phát sinh rủi ro mới |
| `ix_discovery_session_learner_id_active` (`WHERE state = 'active'`) | ❌ **REJECT** | **Trùng lặp hoàn toàn** với `uq_discovery_session_learner_id_active` (Partial Unique Index đã thiết kế ở [DDL_ROUND4_DESIGN.md](../06_Database/DDL_ROUND4_DESIGN.md) mục 1.1) — Unique Constraint **tự động** tạo 1 B-Tree index với đúng `WHERE` clause này; tạo thêm 1 Index riêng là lãng phí không gian + chi phí ghi, không tăng thêm khả năng truy vấn nào |

**Không index nào bị "defer"** — cả 4 đủ thông tin để quyết định ngay, không cần chờ dữ liệu thật để đánh giá.

---

## MANDATORY QUESTIONS

**1. Are any new entities required?**
❌ Không.

**2. Are any DDL Round 1–5 tables modified?**
❌ Không — không cột/bảng/FK/PK nào trong 28 bảng đã khóa bị đổi cấu trúc. **Duy nhất 1 điều chỉnh:** danh sách giá trị CHECK đề xuất cho `trace_link.source_type` (mục 5) và `intervention_decision_detail.intervention_tier` (mục 2) — cả 2 đều là **giá trị CHECK chưa từng sinh SQL**, không phải sửa lại bảng đã build.

**3. Are any migrations invalidated?**
❌ Không — chưa có migration/SQL nào được tạo trước Decision này ([SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md) là Planning, không phải SQL thật) — không có gì để invalidate.

**4. Are any locked decisions contradicted?**
❌ Không — loại bỏ `direct_fix` (mục 2) **siết chặt thêm**, không mâu thuẫn, pattern Human Control Boundary đã khóa ở DECISION-003/006/033/048. 5 quyết định còn lại đều là khóa giá trị/cơ chế chưa từng được Decision Log nào chốt trước đây — không có gì để mâu thuẫn.

**5. Does this decision unblock SQL generation?**
✅ Có — toàn bộ 6 open item chặn SQL Generation đã được khóa.

**6. Can PostgreSQL SQL generation begin immediately afterward?**
✅ Có.

---

## FINAL STATUS

**Accepted (Locked).**

---

## Related Decisions

- [DECISION-003-Core-Principles](DECISION-003-Core-Principles.md), [DECISION-006-Roadmap-Governance](DECISION-006-Roadmap-Governance.md), [DECISION-017-Mastery-Framework](DECISION-017-Mastery-Framework.md), [DECISION-033-Adaptive-Pause](DECISION-033-Adaptive-Pause.md) — nền tảng Human Control Boundary áp dụng cho mục 2.
- [DECISION-044-Versioning-Strategy](DECISION-044-Versioning-Strategy.md), [DECISION-045-Temporal-Strategy](DECISION-045-Temporal-Strategy.md) — nền tảng cho mục 1 (Audit/Snapshot classification).
- [DECISION-038-Traceability-Model](DECISION-038-Traceability-Model.md) — nền tảng cho mục 5.
- [DECISION-048-All-AI-Decisions-Must-Be-Explainable](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-049-Decision-Persistence-Mechanism](DECISION-049-Decision-Persistence-Mechanism.md) — nền tảng cho mục 2/3/4/5.

## Liên kết ngược

[SQL_GENERATION_MASTER_PLAN.md](../06_Database/SQL_GENERATION_MASTER_PLAN.md), [MIGRATION_DEPENDENCY_GRAPH.md](../06_Database/MIGRATION_DEPENDENCY_GRAPH.md), [POSTGRESQL_FEATURE_MATRIX.md](../06_Database/POSTGRESQL_FEATURE_MATRIX.md), [DDL_ROUND4_DESIGN.md](../06_Database/DDL_ROUND4_DESIGN.md), [DDL_ROUND5_DESIGN.md](../06_Database/DDL_ROUND5_DESIGN.md).

**Next Step:** PostgreSQL SQL Generation — sinh `CREATE TABLE`/`CREATE INDEX`/`CREATE POLICY`/migration thật cho 28 bảng, theo đúng thứ tự đã khóa ở [MIGRATION_DEPENDENCY_GRAPH.md](../06_Database/MIGRATION_DEPENDENCY_GRAPH.md), áp dụng 6 điểm đã chốt ở Decision này.
