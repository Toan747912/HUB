# DECISION-049 — Decision Persistence Mechanism

- **Status:** ✅ **Accepted (Locked).**
- **Date:** Decision Persistence Finalization Round — kế thừa [SHARED_DECISION_PERSISTENCE_REVIEW.md](../06_Database/SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](../06_Database/HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DECISION_PERSISTENCE_ARCHITECTURE.md](../06_Database/DECISION_PERSISTENCE_ARCHITECTURE.md), [AI_DECISION_MECHANISM_MATRIX.md](../06_Database/AI_DECISION_MECHANISM_MATRIX.md), [HEADER_DETAIL_BOUNDARY_REVIEW.md](../06_Database/HEADER_DETAIL_BOUNDARY_REVIEW.md), [DECISION_PERSISTENCE_GAP_CLOSURE.md](../06_Database/DECISION_PERSISTENCE_GAP_CLOSURE.md). Không có phân tích mới nào ở Round này — chỉ chốt 1 phương án duy nhất từ các phương án đã phân tích.
- **Locks open item:** C-04 ("Decision Header mechanism chưa chọn", [DDL_GAP_CONSOLIDATION.md](../06_Database/DDL_GAP_CONSOLIDATION.md) / [DDL_ROUND4_GAP_ANALYSIS.md](../06_Database/DDL_ROUND4_GAP_ANALYSIS.md)).

---

## Context

[DECISION-048](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (locked) yêu cầu toàn bộ 10 Decision Type (D1-D9b) phải explainable, nhưng tự nhận **không chọn cơ chế persistence cụ thể** — việc đó để lại cho Round Database tiếp theo. 6 tài liệu phân tích đã liệt kê ở trên đã so sánh đầy đủ 3 phương án (Independent per Capability / Single AI Decision Table / Header-Detail) và khuyến nghị **Header/Detail**, đồng thời xác nhận quan hệ Header↔TraceLink là "Partially Overlapping" — nhưng cả 2 tài liệu nguồn đều **chủ động không chốt**, để ngỏ cho Founder/Lead Architect quyết định cuối cùng. DECISION-049 là quyết định đó.

---

## Decision

### 1. Decision Header tồn tại.

Tạo 1 entity mới: **`decision_header`** — lớp đăng ký tối giản, cross-cutting, ghi nhận sự kiện "1 AI Decision đã xảy ra" cho mọi Decision Type trong taxonomy D1-D9b.

### 2. Phân loại `decision_header`

| Câu hỏi | Trả lời |
|---|---|
| Domain Entity? | ❌ Không. |
| Aggregate Root? | ❌ Không. |
| Supporting Persistence Entity? | ✅ **Đúng.** Cùng phân loại với `trace_link`, `learning_session_transition`, `approval_record`, `recommendation_proposal_response` — không thuộc Core Domain nghiệp vụ nào, không mở Aggregate Boundary mới. |

### 3. Header ↔ Detail — chọn đúng 1 chiều

**Detail trỏ về Header.** Mỗi Decision Detail (entity domain-owned chứa nội dung quyết định: `assessment_result`, `expansion_record`, `recommendation_proposal`, `self_assessment_mismatch`, và mọi Detail mới ở Round 5) mang 1 cột `decision_header_id` — FK đơn, không đa hình, trỏ về đúng 1 `decision_header`.

**`decision_header` không mang `detail_type`/`detail_id` hay bất kỳ con trỏ xuôi nào tới Detail.** Đây là phương án được chốt thay cho phương án còn lại (Header trỏ xuôi qua `detail_type`/`detail_id`) — chọn vì giữ Header tuyệt đối tối giản, loại bỏ hoàn toàn rủi ro Header bị hiểu nhầm là 1 dạng Polymorphic FK thứ hai cạnh `trace_link`. Truy vấn "Header → Detail" (khi cần) thực hiện bằng JOIN ngược theo `decision_type` đã biết trên Header, trỏ đúng bảng Detail tương ứng — chi phí 1 join, chấp nhận được theo đúng phân tích đã có ở [SHARED_DECISION_PERSISTENCE_REVIEW.md](../06_Database/SHARED_DECISION_PERSISTENCE_REVIEW.md).

### 4. Header ↔ TraceLink — phán quyết cuối cùng

**Giữ 2 lớp hoàn toàn riêng biệt — không gộp theo bất kỳ chiều nào.**

- `decision_header` **không bao giờ** mang cột `source_*`/`target_*` — mọi nhu cầu "decision này dựa trên nguồn dữ liệu cụ thể nào" đi qua Detail + `trace_link` hiện có (DECISION-038, không sửa).
- `trace_link` **không bao giờ** mang cột mô tả "đây có phải 1 decision đã xảy ra không" — vai trò đó thuộc về `decision_header`.
- Header = forward registry (decision-as-event, cardinality 0..1). TraceLink = backward provenance (relationship-as-edge, cardinality 0..N). 2 vai trò không thay thế nhau, không chồng lấp chức năng — chỉ chồng lấp mục tiêu lớn (Explainability First).

### 5. Decision Type nào cần Header

**Toàn bộ 10/10** — D1, D2, D3, D4, D5, D6, D7, D8, D9a, D9b. Không có ngoại lệ, kể cả D8 (Header là nguồn sự thật duy nhất cho "decision đã xảy ra" của D8, vì D8 không có Detail).

**Áp dụng từ thời điểm lock trở đi:** mọi decision mới (bao gồm D2/D3/D4/D7, đã có Detail từ trước) phải ghi `decision_header` cùng lúc với Detail. **Không bắt buộc backfill** Header cho dữ liệu D2/D3/D4/D7 đã tồn tại trước thời điểm lock — backfill là tùy chọn vận hành, không phải điều kiện của Decision này.

### 6. Decision Type nào cần Detail

**9/10** — toàn bộ trừ **D8**. 4 đã có Detail (D2→`assessment_result`, D3→`recommendation_proposal`, D4→`expansion_record`, D7→`self_assessment_mismatch`, không migrate, không đổi cấu trúc). 5 cần Detail mới, thiết kế ở DDL Round 5: D1, D5, D6, D9a, D9b.

### 7. Decision Type nào được dùng Runtime Reconstruction

**Chỉ D8.** Không Decision Type nào khác đủ điều kiện — D1/D5/D6/D9a/D9b đều tạo ra nội dung lựa chọn mới (judgment cụ thể giữa các lựa chọn hợp lệ), không phải hàm xác định suy ra được từ input đã persist.

### 8. D8 có được giữ ở trạng thái reconstruction-only không

**Có — giữ nguyên, có điều kiện ràng buộc đi kèm, không chặn việc lock Decision này.** Điều kiện: mọi input dùng để Mode Selection phải tự truy xuất lại được từ domain khác (Evidence/AssessmentResult hoặc tương đương). Việc xác minh điều kiện này thuộc trách nhiệm Mentor Interaction Domain khi cơ chế Mode Selection cụ thể được thiết kế — **không phải điều kiện tiên quyết để lock DECISION-049.** Nếu sau này điều kiện này được xác nhận sai (Mode Selection có yếu tố lựa chọn tự do), D8 chuyển sang Persisted Record qua 1 Decision Log riêng — không yêu cầu sửa lại DECISION-049.

### 9. DECISION-049 có đóng GAP-01 / GAP-02 / GAP-05 không

**Không đóng trực tiếp — DECISION-049 đóng đúng 1 gap khác (C-04, lựa chọn cơ chế), không phải 3 gap về nội dung Detail còn thiếu.**

| Gap | Trạng thái sau DECISION-049 |
|---|---|
| GAP-01 (D1 — Teaching, 0% persistence) | Vẫn mở — cơ chế đích đã chốt (Header + Detail mới + TraceLink), thực thi ở DDL Round 5 |
| GAP-02 (D5 — Local Expansion, không có log lý do) | Vẫn mở — cùng tình trạng GAP-01; câu hỏi "Detail là bảng mới hay mở rộng `expansion_record`" để DDL Round 5 quyết định ở mức thiết kế cột |
| GAP-05 (D6 — Roadmap Mapping, thiếu cột lý do) | Vẫn mở — cùng tình trạng; câu hỏi "sửa `roadmap_node_knowledge_node` hay thêm Detail mới tham chiếu nó" để DDL Round 5 quyết định |

DECISION-049 loại bỏ blocker duy nhất ngăn 3 gap này được đóng (thiếu cơ chế persistence chung) — việc đóng thật sự (thiết kế cột, tạo bảng) là phạm vi DDL Round 5, không phải phạm vi của Decision này.

### 10. DDL nào trở nên khả thi sau DECISION-049

- Thiết kế Detail mới cho **D1** (Teaching Content Selection Log), **D5** (Local Expansion Reason Log), **D9a** (Stuck Detection Signal Log), **D9b** (Intervention Tier Selection Log) — write-owner theo đúng Domain/Capability đã xác nhận ở [DECISION-048](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) Decision Scope.
- Thiết kế Detail/cột bổ sung cho **D6** (mở rộng `roadmap_node_knowledge_node` hoặc Detail mới tham chiếu nó — chọn cụ thể ở DDL Round 5).
- Thiết kế `decision_header` (cột, PK, FK `learner_id`, enum `decision_type` 10 giá trị, audit append-only).
- Thêm cột `decision_header_id` (nullable, FK → `decision_header`) vào 4 Detail đã có (`assessment_result`, `expansion_record`, `recommendation_proposal`, `self_assessment_mismatch`) — patch FK, không đổi cấu trúc nội dung đã khóa.
- Mở rộng `trace_link.source_type`/`target_type` enum cho các Detail mới (D1/D5/D9a/D9b) khi chúng được thiết kế.

**D9a/D9b vẫn phụ thuộc Open Question #6/#11 (cơ chế Stuck Detection bản thân) chưa được giải ở Decision này** — DECISION-049 xác nhận *cơ chế persistence* cho D9a/D9b (Header+Detail+TraceLink, không Runtime Reconstruction), không xác nhận *thuật toán/tiêu chí* phát hiện Stuck, vẫn là việc của Round khác (Domain/Algorithm Design, ngoài phạm vi DDL).

---

## RATIONALE

**Vì sao Header/Detail thắng Independent-per-Capability (Approach A):** Approach A không giải quyết được nhu cầu truy vấn tổng hợp xuyên decision ("AI đã quyết định gì cho Learner X, mọi loại, theo thời gian") mà Recommendation Engine và Learning Profile drill-down sẽ ngày càng cần — đẩy toàn bộ chi phí UNION nhiều bảng không đồng cấu trúc sang Application Layer, lặp lại đúng rủi ro "Application Layer Discipline" đã bị flag nhiều lần (GAP-04/05/07).

**Vì sao Header/Detail thắng Single AI Decision Table (Approach B):** Approach B tái tạo đúng định nghĩa God Table — mọi Capability đọc/viết cùng 1 bảng vật lý, xóa nhòa ranh giới Domain đã tách riêng có chủ đích (DECISION-015); đồng thời tạo 2 lớp discriminator chồng nhau với `trace_link.source_type` (cùng phân loại 1 thứ ở 2 nơi); buộc migrate `assessment_result`/`expansion_record` đã build, vi phạm tinh thần "không sửa lại cấu trúc đã khóa".

**Vì sao Detail trỏ về Header (không phải Header trỏ xuôi qua `detail_type`/`detail_id`):** giữ Header tuyệt đối tối giản — không một cột discriminator+id nào trên Header có thể bị hiểu nhầm là tái tạo vai trò `source_*`/`target_*` của TraceLink. Đây là rủi ro đã được cảnh báo cụ thể ("1 lập trình viên muốn tiện nên thêm `source_evidence_id` thẳng vào Header") — loại bỏ hoàn toàn bằng cách không cho Header bất kỳ con trỏ xuôi nào.

**Vì sao Header và TraceLink không gộp:** 2 cơ chế khác cardinality (0..1 vs 0..N) và khác hình dạng truy vấn (timeline/inventory vs edge lookup) — gộp theo bất kỳ chiều nào đều mất khả năng biểu diễn đúng 1 trong 2 nhu cầu, không phải vấn đề sắp xếp lại mà là mất thông tin cấu trúc.

**Vì sao không trì hoãn thêm:** mọi phương án đã được phân tích đầy đủ ở 6 tài liệu nguồn — không có thông tin mới nào xuất hiện kể từ Round phân tích cuối cùng làm thay đổi kết luận khuyến nghị; trì hoãn thêm chỉ kéo dài tình trạng GAP-01/02/05/C-04 không có lộ trình thực thi.

---

## MIGRATION IMPACT

Tài liệu cần cập nhật để phản ánh DECISION-049 đã lock:

| Tài liệu | Cập nhật cần làm |
|---|---|
| [DDL_GAP_CONSOLIDATION.md](../06_Database/DDL_GAP_CONSOLIDATION.md) | C-04 chuyển trạng thái "chưa chọn" → "đã chọn, chờ thực thi DDL Round 5" |
| [DDL_ROUND4_GAP_ANALYSIS.md](../06_Database/DDL_ROUND4_GAP_ANALYSIS.md) | Mục Critical/C-04 cập nhật tham chiếu tới DECISION-049; GAP-01/02/05 ghi rõ "cơ chế đã chốt, chờ DDL Round 5" |
| [DECISION_PERSISTENCE_GAP_CLOSURE.md](../06_Database/DECISION_PERSISTENCE_GAP_CLOSURE.md) | Đổi trạng thái mục 5/6 (Remaining Unresolved Issues #5, #6) từ "chưa chốt" → "đã lock ở DECISION-049", xóa 2 phương án song song ở #6 (chỉ còn phương án đã chọn) |
| [DECISION_PERSISTENCE_ARCHITECTURE.md](../06_Database/DECISION_PERSISTENCE_ARCHITECTURE.md) | Mục 1.1/1.2 (2 phương án Header↔Detail) thay bằng tham chiếu DECISION-049 — chỉ giữ phương án đã chọn (Detail trỏ về Header) |
| [DECISION-048-All-AI-Decisions-Must-Be-Explainable.md](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | Mục Consequences → Persistence Architecture: cập nhật "cần Founder/Lead Architect quyết định Shared Mechanism" → tham chiếu DECISION-049 đã lock |
| [DECISION-038-Traceability-Model.md](DECISION-038-Traceability-Model.md) | Ghi nhận phạm vi mở rộng (D1/D6/D7-tự-truy-vết/D9a) cần 1 cập nhật enum riêng — không tự sửa ở DECISION-049, chỉ ghi nhận nhu cầu, thực thi ở DDL Round 5 |
| [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) | Thêm `decision_header` vào danh sách entity cấp Blueprint trước khi DDL Round 5 viết cột chi tiết |
| [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) | Thêm `decision_header` vào mục 9 (Temporal — append-only, không cần History Table) và mục 10 (Audit — chỉ nhóm created) |
| [README.md](../06_Database/README.md) (nếu có index) | Thêm DECISION-049 + 6 tài liệu phân tích vào danh sách Decision đã lock |

---

## NEXT STEP

**DDL Round 5 — Decision Persistence DDL Design.**

Phạm vi: thiết kế cột/bảng chi tiết cho `decision_header` + 4 Detail mới (D1/D5/D9a/D9b) + giải pháp D6 (mở rộng `roadmap_node_knowledge_node` hoặc Detail mới) + patch FK `decision_header_id` lên 4 Detail đã có + mở rộng enum `trace_link`. Không trong phạm vi DECISION-049 này — DECISION-049 chỉ chốt kiến trúc, không thiết kế cột.

---

## Related Decisions

- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md) — nguyên tắc gốc, không đổi.
- [DECISION-038-Traceability-Model](DECISION-038-Traceability-Model.md) — `trace_link` không sửa cấu trúc, chỉ mở rộng enum ở Round sau.
- [DECISION-043-Supabase-Auth-Alignment](DECISION-043-Supabase-Auth-Alignment.md) — `decision_header.learner_id` theo đúng quy ước `learner.id` đã khóa.
- [DECISION-045-Temporal-Strategy](DECISION-045-Temporal-Strategy.md) — `decision_header` append-only, không cần History Table.
- [DECISION-047-Learning-Session-Transition-Log](DECISION-047-Learning-Session-Transition-Log.md) — tiền lệ Supporting Persistence Entity được approve tương tự.
- [DECISION-048-All-AI-Decisions-Must-Be-Explainable](DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) — DECISION-049 thực thi đúng phần "chọn persistence mechanism" mà DECISION-048 đã dự báo và để ngỏ.

## Liên kết ngược (tài liệu phân tích, không phải Decision)

[SHARED_DECISION_PERSISTENCE_REVIEW.md](../06_Database/SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](../06_Database/HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DECISION_PERSISTENCE_ARCHITECTURE.md](../06_Database/DECISION_PERSISTENCE_ARCHITECTURE.md), [AI_DECISION_MECHANISM_MATRIX.md](../06_Database/AI_DECISION_MECHANISM_MATRIX.md), [HEADER_DETAIL_BOUNDARY_REVIEW.md](../06_Database/HEADER_DETAIL_BOUNDARY_REVIEW.md), [DECISION_PERSISTENCE_GAP_CLOSURE.md](../06_Database/DECISION_PERSISTENCE_GAP_CLOSURE.md), [DDL_GAP_CONSOLIDATION.md](../06_Database/DDL_GAP_CONSOLIDATION.md), [DDL_ROUND4_GAP_ANALYSIS.md](../06_Database/DDL_ROUND4_GAP_ANALYSIS.md).
