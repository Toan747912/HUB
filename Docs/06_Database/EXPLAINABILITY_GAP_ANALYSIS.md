# Explainability Gap Analysis — Round 3.5

> Tổng hợp từ [EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md). Mỗi gap được gắn đúng 1 mức độ: Critical / High / Medium / Low. Không tạo SQL, không tạo entity mới — mọi mitigation ở đây là **đề xuất cho Founder/Lead Architect quyết định ở vòng tiếp theo**, không phải quyết định đã chốt.

## Bảng tổng hợp gap

| ID | Gap | Loại quyết định AI liên quan | Severity | Đã biết từ trước? |
|---|---|---|---|---|
| GAP-01 | Quyết định Teaching (chọn nội dung dạy tiếp theo) không được persist ở bất kỳ bảng nào | Teaching | **Critical** | Mới — Round 3.5 |
| GAP-02 | Local Knowledge Expansion không có cơ chế lưu lý do nội bộ, dù DECISION-027 yêu cầu bắt buộc | Knowledge Expansion (Local) | **Critical** | Một phần — Open Question #21 từ Domain Modeling, chưa từng đóng |
| GAP-03 | `expansion_record` không trace được tới `knowledge_edge` cụ thể nó tạo ra (cardinality chưa chốt) | Knowledge Expansion (Deep/Structural) | Medium | Đã biết — Round 3 Risk #1 |
| GAP-04 | `assessment_result` → Evidence chỉ truy vết được qua `trace_link`, không có FK/CHECK enforce ở DB | Assessment | High | Đã biết — Round 2 |
| GAP-05 | `roadmap_node_knowledge_node` không có cột lý do; fallback `approval_record` chỉ đủ granularity ở mức RoadmapNode | Roadmap Construction | High | Đã biết — Round 3 (Type B) |
| GAP-06 | Recommendation thiếu nguồn dữ liệu self-assessment mismatch (`discovery_session` chưa tồn tại) | Recommendation | Medium | Đã biết — Round 3 mục 4 |
| GAP-07 | Mọi điểm "có cơ chế nhưng phụ thuộc Application Layer" (GAP-03, GAP-04, GAP-05) đều phụ thuộc nhiều entry-point khác nhau có thể tạo dữ liệu mà không tuân thủ — không có 1 lớp enforcement tập trung | Assessment, Knowledge Expansion, Roadmap Construction (cross-cutting) | High | Đã biết — Round 3 khuyến nghị #4, chưa xử lý |

## Chi tiết và đề xuất xử lý

### GAP-01 — Teaching không có decision log (Critical)

- **Vì sao Critical:** Teaching là loại quyết định AI có tần suất cao nhất trong toàn hệ thống. Hiện tại 0% traceability ở tầng lưu trữ — không thể trả lời "vì sao AI dạy X trước Y" cho bất kỳ trường hợp nào, ngay cả khi mọi thứ khác hoạt động đúng.
- **Khác biệt với GAP khác:** đây không phải lỗi enforcement (thiếu FK/CHECK) mà là thiếu hẳn entity để chứa quyết định.
- **Đề xuất xử lý:** Founder/Lead Architect cân nhắc 1 trong 2 hướng ở vòng thiết kế tiếp theo (không quyết định ở đây):
  1. Thêm 1 entity "Teaching Decision Log" nhẹ (append-only, tương tự `expansion_record`).
  2. Hoặc xác nhận rằng Teaching decision được chấp nhận là *ephemeral by design* (không cần persist) — nếu vậy, cần ghi 1 Decision Log chính thức xác nhận đây là lựa chọn có cân nhắc, không phải gap bị bỏ sót.
- **Không tự xử lý vì:** vi phạm constraint "không thiết kế entity mới" của Round 3.5.

### GAP-02 — Local Expansion thiếu log lý do nội bộ (Critical)

- **Vì sao Critical:** vi phạm trực tiếp 1 yêu cầu đã được Domain Architecture xác định là bắt buộc (DECISION-027 áp dụng cho *mọi* thay đổi Knowledge Graph, không phân biệt Local hay Deep/Structural) — đây không phải "thiếu sót mới phát hiện" mà là "yêu cầu đã biết, chưa từng đóng" (Open Question #21).
- **Đề xuất xử lý:**
  1. Mở rộng `knowledge_edge` thêm 1 cột lý do nullable (ít phá vỡ nhất), hoặc
  2. Thiết kế 1 log entity riêng, nhẹ hơn `expansion_record`, dành riêng cho Local Expansion.
- Cả 2 phương án cần Founder/ChatGPT Lead Architect chốt ở vòng Domain Architecture trước khi đưa vào SQL Generation — không tự quyết định ở đây.

### GAP-03 — `expansion_record` không trace tới `knowledge_edge` cụ thể (Medium)

- Đã ghi nhận từ Round 3 (Risk #1). Giữ Medium vì: vẫn có traceability ở mức "node nào, lý do gì" (không phải 0%), chỉ thiếu chi tiết ở mức cạnh.
- **Đề xuất xử lý:** chốt cardinality `ExpansionRecord ↔ KnowledgeEdge` (1:1, 1:N, hay N:N) trước khi viết `CREATE TABLE` thật cho 2 bảng này.

### GAP-04 — `assessment_result` → Evidence phụ thuộc `trace_link` (High)

- Nâng từ "Medium" (cách gọi informal ở Round 2/3) lên **High** trong phân loại chính thức lần này — lý do: Assessment là loại quyết định ảnh hưởng trực tiếp tới Mastery của Learner (có thể thay đổi lộ trình học), mức độ ảnh hưởng cao hơn các gap Medium khác.
- **Đề xuất xử lý:** tập trung tạo `assessment_result` + `trace_link` vào 1 service layer duy nhất, trong 1 transaction DB, chặn mọi entry point khác.

### GAP-05 — `roadmap_node_knowledge_node` thiếu cột lý do (High)

- Type B gap (Round 3) — nâng lên **High** chính thức vì đây là cơ chế thực thi nguyên tắc "Mọi kiến thức phải gắn với dự án" lần đầu ở tầng DB; thiếu lý do làm giảm giá trị giải thích của chính cơ chế mới này.
- **Đề xuất xử lý:** thêm cột `dependency_reason` (nullable, text, không phá vỡ bảng hiện có) khi viết SQL thật — quyết định cần Founder xác nhận trước Round 4/SQL Generation.

### GAP-06 — Recommendation thiếu self-assessment mismatch signal (Medium)

- Không chặn Round 1-3 (đã đánh giá "không cần rework"). Medium vì chỉ ảnh hưởng tới Recommendation, có kế hoạch rõ (Discovery Module ở Round 4+), không phải gap bị bỏ sót ngoài kế hoạch.
- **Đề xuất xử lý:** không cần hành động ngay; theo dõi khi Discovery Module được thiết kế.

### GAP-07 — Thiếu 1 lớp enforcement tập trung cho mọi Application-Layer-dependent integrity point (High, cross-cutting)

- Không phải 1 gap riêng mà là gap **hệ thống**: GAP-03, GAP-04, GAP-05 cộng lại nghĩa là có 3 chỗ khác nhau trong codebase Application Layer phải "nhớ" tạo đúng bản ghi đi kèm, không có cơ chế chung nào kiểm tra.
- **Đề xuất xử lý:** xem xét 1 "Explainability Integrity Enforcement Service" tập trung (đã đề xuất ở Round 3, khuyến nghị #4, chưa được xử lý) — service này chịu trách nhiệm duy nhất việc ghi mọi cặp (decision record + trace/reason record) trong 1 transaction, không cho phép ghi rời.

## Phân bố severity

| Severity | Số lượng | Gap |
|---|---|---|
| Critical | 2 | GAP-01, GAP-02 |
| High | 3 | GAP-04, GAP-05, GAP-07 |
| Medium | 2 | GAP-03, GAP-06 |
| Low | 0 | — |

## Kết luận

**OUTPUT STATUS: `NEEDS_REVISION`**

Lý do: 2 gap **Critical** (GAP-01 Teaching, GAP-02 Local Expansion) đại diện cho việc 2 loại quyết định AI — trong đó Teaching là loại có tần suất cao nhất — hiện tại có **0% traceability ở tầng lưu trữ**, mâu thuẫn trực tiếp với nguyên tắc Explainability First (DECISION-027) vốn đã được xác nhận là nguyên tắc bắt buộc, không phải nguyên tắc tùy chọn.

**Phạm vi của NEEDS_REVISION này hẹp, không yêu cầu redesign Round 1-3:**
- KHÔNG cần sửa lại 19 bảng đã khóa.
- KHÔNG cần huỷ verdict `READY_FOR_SQL_GENERATION` đã có ở Round 1/2/3 cho phần đã thiết kế.
- CHỈ cần Founder/Lead Architect quyết định hướng xử lý cho GAP-01 và GAP-02 (persist hay chấp nhận ephemeral-by-design có ghi nhận chính thức) **trước khi Round 4 (SQL Generation thật) chạm tới Teaching capability hoặc Local Expansion capability**. Các bảng không liên quan tới 2 capability này có thể tiến hành SQL Generation song song.
- 3 gap High (GAP-04, GAP-05, GAP-07) không chặn SQL Generation nhưng cần được Founder xác nhận: chấp nhận rủi ro Application-Layer-dependent cho v1, hoặc thêm cột/enforcement trước khi viết DDL thật.

## Liên kết ngược

[EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md), [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md), [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md).
