# DECISION-048 — All AI Decisions Must Be Explainable

- **Status:** ✅ **Accepted (Locked).** Soạn ở Round 4.0, cập nhật Round 4.2 (tái phân loại D8 sau Round 4.1), **khóa ở Round 4.3 (Lock Request)** theo xác nhận của Founder/Lead Architect — xem [DECISION-048_LOCK_REPORT.md](../06_Database/DECISION-048_LOCK_REPORT.md) cho hồ sơ lock đầy đủ.
- **Date:** Round 4.0 (draft) → Round 4.2 (cập nhật D8) → Round 4.3 (locked) — kế thừa Round 3.7 ([AI_DECISION_ARCHITECTURE_REVIEW.md](../06_Database/AI_DECISION_ARCHITECTURE_REVIEW.md)), Round 3.8 ([AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](../06_Database/AI_DECISION_MATRIX.md)), Round 3.9 ([TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](../06_Database/TEACHING_VS_MENTOR_INTERACTION_REVIEW.md)), Round 4.1 ([D8_EXPLAINABILITY_REVIEW.md](../06_Database/D8_EXPLAINABILITY_REVIEW.md)), Round 4.2 ([DECISION-048_FINAL_REVIEW.md](../06_Database/DECISION-048_FINAL_REVIEW.md)).
- **Revision note (Round 4.2, giữ lại cho lịch sử):** D8 đã được tái phân loại từ "miễn Explainability" thành "Explainable qua Runtime Reconstruction" — xem mục Decision Scope và [DECISION-048_FINAL_REVIEW.md](../06_Database/DECISION-048_FINAL_REVIEW.md) cho chi tiết thay đổi và consistency review đầy đủ. Không có thay đổi nội dung nào ở Round 4.3 (lock) ngoài đổi Status — đúng kỷ luật "lock = đóng băng nội dung đã review, không sửa thêm khi lock".

---

## Context

[DECISION-027](DECISION-027-Explainability-First.md) (Round 4, gốc) thiết lập nguyên tắc Explainability First nhưng chỉ liệt kê tường minh **3 nhóm**: Mastery, Recommendation, Knowledge Expansion (cả Local và Deep/Structural). Tại thời điểm đó, hệ thống chưa có 1 taxonomy đầy đủ về "AI Decision là gì" — DECISION-027 được viết dựa trên 3 cơ chế đã tồn tại sẵn field `reasoning`/`expansion_reason` riêng lẻ, không phải dựa trên 1 rà soát toàn hệ thống.

Round 3.7-3.9 đã rà soát đầy đủ 7 Capability ban đầu (Teaching, Assessment, Recommendation, Knowledge Expansion, Roadmap Mapping, Discovery, Mentor Interaction), xác lập:
- 1 định nghĩa AI Decision chính thức (4 điều kiện C1-C4, [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md) mục 1).
- **10 Decision Type cụ thể** (9 ở Round 3.8, tách thêm 1 ở Round 3.9 — xem mục "Decision Scope" dưới đây), trong đó chỉ 4 đã nằm trong phạm vi DECISION-027.
- Teaching được phân loại là **Capability điều phối, không phải Domain** (Round 3.9) — hệ quả: Mode Selection (trước đây gán nhầm cho "Teaching Engine") thực ra là quyết định nội tại của Mentor Interaction Domain.

Khoảng trống này (4/10 đã được yêu cầu explainable, 6/10 chưa) là động lực trực tiếp cho DECISION-048 — không phải để thay thế DECISION-027, mà để **mở rộng phạm vi của nó** dựa trên taxonomy đầy đủ hiện đã có.

**Cập nhật Round 4.1-4.2:** Round 4.0 ban đầu loại trừ D8 (Mode Selection) khỏi yêu cầu Explainability, dùng 3 lý do gộp chung (re-derivable, Criticality C, Do Not Persist). Round 4.1 ([D8_EXPLAINABILITY_REVIEW.md](../06_Database/D8_EXPLAINABILITY_REVIEW.md)) phát hiện cách trình bày này **mặc định Persistence và Explainability là 1 trục duy nhất** — vi phạm chính nguyên tắc mà DECISION-048 đặt ra ("Explainability không đồng nghĩa với Persistence", xem mục Decision). Round 4.1 kết luận: 2 trục là **độc lập** — D8 vẫn explainable, chỉ khác cơ chế (Runtime Reconstruction thay vì Persisted Record). Round 4.2 cập nhật DECISION-048 để phản ánh đúng kết luận này — không có Decision Type nào còn được miễn Explainability hoàn toàn; chỉ khác nhau về **cơ chế** đạt được nó.

---

## Decision

**Mọi AI Decision thoả đủ 4 điều kiện C1-C4 ([AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md) mục 1) đều phải explainable — có khả năng truy vết được "vì sao AI chọn X mà không chọn Y", bất kể decision đó có persist hay không.**

"Explainable" tại đây nghĩa là (giữ definition gốc từ DECISION-027, không đổi):
- Phải có 1 lý do gán được với decision (không phải lý do tự do dạng text không kiểm tra được — ưu tiên truy vết bằng ID cụ thể tới nguồn dữ liệu đã dùng để quyết định, theo mô hình `TraceLink`/[DECISION-038](DECISION-038-Traceability-Model.md) đã locked).
- **Explainability và Persistence là 2 trục độc lập** (xác nhận chính thức ở Round 4.1, [D8_EXPLAINABILITY_REVIEW.md](../06_Database/D8_EXPLAINABILITY_REVIEW.md)) — 1 decision có thể "explainable" mà không cần 1 Persisted Record riêng cho chính nó, **nếu** mọi input đã dùng để quyết định đều tự truy xuất lại được từ dữ liệu đã persist ở domain khác (cơ chế gọi là **Runtime Reconstruction** — xem D8 ở mục Decision Scope là ví dụ duy nhất hiện tại dùng cơ chế này). Ngược lại, **không có quy tắc nào suy ra "Not Persisted ⇒ Not Explainable"** — đây chính là điều DECISION-048 chủ động bác bỏ sau Round 4.1.
- Explainability **không đồng nghĩa với Visibility cho Learner** — DECISION-023/027 đã phân biệt rõ Local Expansion (truy vết nội bộ, không hiển thị) — nguyên tắc này giữ nguyên cho mọi decision mới được đưa vào phạm vi.

**Không cho phép tồn tại 1 AI Decision nào (thoả C1-C4) bị coi là "black-box" chỉ vì nó chưa có cơ chế lưu trữ** — nếu cơ chế chưa tồn tại, đây là 1 gap cần đóng (theo các Approach đã phân tích ở [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](../06_Database/EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md)), không phải lý do để miễn trừ decision đó khỏi yêu cầu. **Sau Round 4.2, không có Decision Type nào (thoả C1-C4) được miễn Explainability hoàn toàn** — mục "Out Of Scope" dưới đây chỉ còn chứa các hành vi **không phải AI Decision**, không còn chứa decision nào dùng cơ chế thay thế.

---

## Decision Scope — Toàn bộ AI Decision Type đã xác định (Round 3.8 + 3.9)

| # | Decision Type | Capability | Explainability Required? | Vì sao |
|---|---|---|---|---|
| D1 | Teaching — Content Selection | Teaching (Capability, không Domain — Round 3.9) | **CÓ** | Thoả đủ C1-C4; tần suất cao nhất trong hệ thống — chính vì tần suất cao mà rủi ro "0% traceability" (GAP-01) ảnh hưởng diện rộng nhất nếu không đóng. Không có Aggregate Root riêng không phải lý do miễn trừ — explainability không yêu cầu phải có Domain sở hữu. |
| D2 | Assessment — Evidence Verdict | Assessment Engine | **CÓ** (đã locked) | Đã yêu cầu từ DECISION-027 gốc — giữ nguyên, không đổi. |
| D3 | Recommendation — Signal Synthesis | Recommendation Engine | **CÓ** (đã locked) | Đã yêu cầu từ DECISION-027 gốc (`traced_to[]` bắt buộc) — giữ nguyên. |
| D4 | Knowledge Expansion — Deep/Structural | Knowledge Engine | **CÓ** (đã locked) | Đã yêu cầu từ DECISION-023/027 — giữ nguyên, bắt buộc hiển thị cho Learner. |
| D5 | Knowledge Expansion — Local | Knowledge Engine | **CÓ** (đã locked) | Đã yêu cầu từ DECISION-027 gốc — giữ nguyên, truy vết nội bộ, không hiển thị. |
| D6 | Roadmap Mapping — Dependency Edge Selection | Roadmap Engine | **CÓ** (mới, mở rộng phạm vi) | Thoả đủ C1-C4 (Round 3.7 mục 2.7); ảnh hưởng trực tiếp cấu trúc Roadmap cá nhân hoá (Criticality B) — không có lý do kiến trúc nào để miễn trừ, chỉ là DECISION-027 gốc chưa rà soát tới khi viết. |
| D7 | Discovery — Self-Assessment Mismatch Detection | Discovery Engine | **CÓ** (mới, mở rộng phạm vi) | Thoả đủ C1-C4; đã được DECISION-027 gốc dùng làm **điểm đến** của truy vết cho Recommendation (`source_discovery_session_id`) nhưng chưa từng yêu cầu Discovery **tự** explainable — đây là 1 khoảng trống logic (1 nguồn truy vết không tự minh bạch thì chuỗi truy vết không hoàn chỉnh), DECISION-048 đóng khoảng trống này. |
| D8 | Mentor Interaction — Learning Mode Selection | Mentor Interaction Domain (tái xác nhận chủ sở hữu, Round 3.9 — không còn gọi là "Teaching Engine") | **CÓ — qua Runtime Reconstruction, không qua Persisted Record** (cập nhật Round 4.2, đảo từ "KHÔNG" ở Round 4.0) | Thoả đủ C1-C4 (Learner có thể hỏi hợp lý "vì sao đổi Mode", [D8_EXPLAINABILITY_REVIEW.md](../06_Database/D8_EXPLAINABILITY_REVIEW.md) mục 1 Q3) — Criticality C và Persistence = Do Not Persist **không phải lý do miễn Explainability**, chỉ là 2 quyết định độc lập khác. **Điều kiện áp dụng:** mọi input dùng để quyết định Mode Selection phải tự truy xuất lại được từ domain khác (Evidence/AssessmentResult hoặc tương đương) — **chưa được xác minh**, vì cơ chế Mode Selection cụ thể chưa từng chốt (Open, xem Remaining Risks ở [DECISION-048_FINAL_REVIEW.md](../06_Database/DECISION-048_FINAL_REVIEW.md)). |
| D9a | Mentor Interaction — Stuck Detection (tín hiệu phát hiện) | Chưa chốt hẳn (gần Mentor Interaction nhất, Round 3.9 mục 3) | **CÓ** (mới, mở rộng phạm vi) | Thoả đủ C1-C4; ảnh hưởng tới tính toàn vẹn quá trình học, rủi ro Criticality leo lên A nếu can thiệp sai (Round 3.8 mục D9). |
| D9b | Teaching — Intervention Tier Selection | Teaching (Capability) | **CÓ** (mới, mở rộng phạm vi) | Cùng lý do D9a — đồng thời trùng bản chất với D1 (Content Selection) theo phân tích Round 3.9, nên áp dụng cùng yêu cầu. |

**Tổng kết (cập nhật Round 4.2):** **10/10 Decision Type yêu cầu explainable** (4 đã locked từ DECISION-027 gốc, 5 mới mở rộng bởi DECISION-048 Round 4.0, D8 tái phân loại ở Round 4.2). **Không còn Decision Type nào được miễn Explainability hoàn toàn** — D8 là decision duy nhất dùng cơ chế Runtime Reconstruction thay vì Persisted Record, nhưng vẫn nằm trong phạm vi yêu cầu.

---

## Out Of Scope

> Đổi tên từ "Explicitly NOT Required to be Explainable" (Round 4.0) sang **"Out Of Scope"** ở Round 4.2 — theo đúng kết luận Round 4.1: không có AI Decision nào (thoả C1-C4) được miễn Explainability. Mục này **chỉ còn chứa các hành vi không phải AI Decision** — chúng nằm ngoài phạm vi DECISION-048 vì chưa từng thoả điều kiện đầu vào (C1-C4), không phải vì được xét rồi miễn trừ. **D8 đã được rút khỏi mục này** (xem Decision Scope) vì D8 là 1 AI Decision thật, chỉ dùng cơ chế Runtime Reconstruction thay vì Persisted Record.

1. **Bất kỳ hành động AI nào không thoả đủ C1-C4** (định nghĩa AI Decision, [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md) mục 1) — vd: lựa chọn cách diễn đạt/văn phong khi trình bày nội dung đã được Content Selection (D1) chọn, hành vi tất định (deterministic) không có nhánh lựa chọn, hoặc thao tác thu thập dữ liệu thô của Evidence Engine (Evidence Engine bản thân không sinh AI Decision — Round 3.7 mục 4.1). Các hành vi này **nằm ngoài phạm vi DECISION-048 hoàn toàn** — chúng chưa từng là đối tượng của nguyên tắc Explainability First để bắt đầu.
2. **Việc tái hiện đầy đủ quá trình suy luận nội bộ của model (chain-of-thought) cho mọi decision** — explainability theo DECISION-027/048 chỉ yêu cầu *lý do ở mức truy vết được tới nguồn dữ liệu cụ thể* (category lý do + ID tham chiếu), không yêu cầu *toàn bộ quá trình suy luận chi tiết* của AI. Đây không phải 1 decision bị loại trừ — là 1 ranh giới định nghĩa của chính khái niệm "explainable" áp dụng đồng đều cho mọi decision trong scope. Phân biệt này giữ nguyên từ DECISION-027 gốc.

**Kiểm tra tính nhất quán (yêu cầu Round 4.2):** cả 2 mục trên đều thoả điều kiện "Out Of Scope items are not AI Decisions" — mục 1 thất bại ở C1 (không có judgment among alternatives mang tính lựa chọn nghiệp vụ) hoặc C2 (không ảnh hưởng state Learner/tri thức dùng chung); mục 2 không phải 1 "decision" mà là 1 thuộc tính định nghĩa của *cách* trả lời, áp dụng cho mọi decision, không riêng decision nào — không vi phạm yêu cầu "Out Of Scope chỉ chứa non-AI-Decision".

---

## Reasoning

DECISION-027 gốc đúng về nguyên tắc nhưng phạm vi của nó là sản phẩm của thời điểm viết (Round 4, trước khi taxonomy đầy đủ tồn tại) — 3 nhóm được liệt kê là 3 nhóm **đã có cơ chế `reasoning` sẵn**, không phải 3 nhóm được chọn vì lý do kiến trúc loại trừ 4 nhóm còn lại. Sau khi Round 3.7-3.9 xác nhận cả 10 Decision Type đều thoả cùng 1 bài test (C1-C4), việc tiếp tục giữ phạm vi cũ sẽ tạo ra 1 sự bất nhất không có cơ sở kiến trúc — đúng như đã phân tích ở [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](../06_Database/AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) Final Section.

Hạ tầng cần thiết để thực thi DECISION-048 **đã tồn tại và đã được thiết kế tổng quát** — `TraceLink` ([DECISION-038](DECISION-038-Traceability-Model.md)) được mô tả rõ là "không thuộc bất kỳ Core Domain nghiệp vụ nào... hạ tầng cross-cutting". Mở rộng phạm vi explainability không đòi hỏi thiết kế lại hạ tầng truy vết — chỉ đòi hỏi áp dụng cơ chế đã có cho nhiều decision hơn, và (riêng cho D1/D6/D7/D9a/D9b) đóng các gap về **nơi lưu lý do** đã được flag từ Round 3.5-3.6 (GAP-01, GAP-05, GAP-06 mở rộng) nhưng **DECISION-048 bản thân không thiết kế cơ chế lưu đó** — đây vẫn là nguyên tắc, việc chọn persistence mechanism cụ thể (Header/Detail pattern hay khác) thuộc về Round 3.6 và các Round Database tiếp theo.

**Cập nhật Round 4.2:** Round 4.0 từng loại trừ tường minh D8 để tránh tình trạng người đọc tự hỏi "Mode Selection bị bỏ sót hay cố ý miễn trừ?" — nhưng cách diễn đạt đó tự mâu thuẫn với câu đầu của mục Decision ("Explainability không đồng nghĩa với Persistence"), vì 1 trong 3 lý do loại trừ chính là "đã có quyết định Persistence riêng". Round 4.1 chỉ ra: Criticality và Persistence là 2 quyết định *độc lập*, không phải *lý do* cho việc miễn Explainability. Cách xử lý đúng (Round 4.2 áp dụng) là **giữ D8 trong phạm vi yêu cầu, đổi cơ chế đạt được nó** (Runtime Reconstruction) — vẫn trả lời rõ "không bị bỏ sót", nhưng không còn ngụ ý "Not Persisted ⇒ Not Explainable".

---

## Consequences

### Domain Architecture

- [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) cần (ở vòng cập nhật chính thức tiếp theo, không phải trong DECISION-048 này) ghi nhận: Teaching là Capability điều phối, không phải Domain (Round 3.9); Mode Selection (D8) là quyết định nội tại của Mentor Interaction Domain, không phải "Teaching Engine output" — đây là sửa lại 1 nhãn đã gán sai từ trước, không phải thêm Domain mới.
- Discovery Domain có thêm 1 trách nhiệm tường minh: tự explainable cho `SelfAssessmentMismatch` (D7), không chỉ là điểm đến của truy vết từ Recommendation.
- Không Domain nào bị tạo mới, không Domain nào bị xoá — DECISION-048 không thay đổi Aggregate Root nào (đúng giới hạn "Architecture Analysis Only" của các Round trước).

### Persistence Architecture

- Phạm vi ứng viên cần persist-để-explainable tăng từ 4 lên 9 Decision Type (D1, D2, D3, D4, D5, D6, D7, D9a, D9b — toàn bộ trừ D8) — **D8 vẫn không cần persist riêng** (Do Not Persist, không đổi từ Round 3.8), nhưng nay vì lý do "đạt explainability qua Runtime Reconstruction", không phải vì "được miễn explainability" (cập nhật Round 4.2). Cần Founder/Lead Architect quyết định Shared Mechanism (Header/Detail pattern, Round 3.6 mục 3) **trước khi** xây riêng persistence cho từng Decision Type mới — DECISION-048 **không tự chọn cơ chế**, chỉ xác nhận *yêu cầu* tồn tại.
- D9a/D9b (Stuck Detection tách 2 phần, Round 3.9) hiện chưa có entity nào — DECISION-048 không tạo entity, chỉ ghi nhận yêu cầu explainability sẽ áp dụng ngay khi cơ chế Stuck Detection được thiết kế (Open Question #6/#11).

### Traceability Model

- `TraceLink` ([DECISION-038](DECISION-038-Traceability-Model.md)) hiện mô tả phạm vi "cho Recommendation, Assessment, Evidence" — DECISION-048 tạo nhu cầu mở rộng phạm vi này để phủ thêm Teaching (D1, D9b), Roadmap Mapping (D6), Discovery tự-truy-vết (D7), và Stuck Detection (D9a) khi có entity. **Đây là hệ quả cần 1 cập nhật riêng cho DECISION-038** (hoặc 1 Decision mới tham chiếu ngược) — DECISION-048 không tự sửa DECISION-038.

### Recommendation Engine

- Tác động tối thiểu về nghĩa vụ trực tiếp (Recommendation đã tuân thủ `traced_to[]` từ DECISION-027 gốc) — nhưng **chất lượng chuỗi truy vết được củng cố**: trước DECISION-048, Recommendation có thể trace tới `DiscoverySession` (1 "điểm đến" hợp lệ) dù `DiscoverySession` đó tự nó không explainable — tạo 1 chuỗi truy vết có "mắt xích mù". Sau DECISION-048 (khi D7 được đóng), chuỗi truy vết của Recommendation trở thành liên tục thật, không chỉ liên tục về hình thức ID.

### Teaching Capability

- Lần đầu có nghĩa vụ explainability tường minh cho Content Selection (D1) và Intervention Tier Selection (D9b) — trước đây hoàn toàn ngoài phạm vi DECISION-027.
- **Không sở hữu** Mode Selection (D8) — theo Round 3.9, D8 không còn thuộc phạm vi sở hữu của Teaching Capability (đã trả lại cho Mentor Interaction Domain) — DECISION-048 không tạo thêm gánh nặng nhầm chỗ. Nghĩa vụ explainability của D8 (cập nhật Round 4.2) thuộc về Mentor Interaction Domain, không phải Teaching.

### Mentor Interaction Domain

- Được xác nhận là chủ sở hữu thật của D8 (Mode Selection) — **và nay (Round 4.2) cũng là nơi chịu trách nhiệm đáp ứng nghĩa vụ Explainability của D8**, qua cơ chế Runtime Reconstruction (không cần Persisted Record riêng). Đây là nghĩa vụ nhẹ hơn nhiều so với D1-D7/D9a/D9b (không cần thiết kế entity/log mới), nhưng **không còn là 1 miễn trừ hoàn toàn** — khác với cách Round 4.0 trình bày.
- **Điều kiện cần xác minh (Open, chưa đóng):** Runtime Reconstruction cho D8 chỉ hợp lệ nếu mọi input dùng để quyết định Mode Selection đều truy xuất lại được từ domain khác (Evidence/AssessmentResult) — cơ chế Mode Selection cụ thể (input nào, ngưỡng nào) chưa từng được chốt ở bất kỳ Round nào trước đây, nên điều kiện này **chưa được xác minh đúng/sai**, chỉ là giả định hợp lý.
- Có khả năng đồng-sở-hữu D9a (Stuck Detection signal) cùng Teaching Capability — ranh giới này **chưa đóng** (Round 3.9 mục 3) — DECISION-048 không tự đóng ranh giới này, chỉ xác nhận rằng bất kể domain/capability nào sở hữu D9a, nó vẫn phải explainable.

---

## Related Decisions

- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md) — nguyên tắc gốc, DECISION-048 mở rộng phạm vi, không thay thế.
- [DECISION-038-Traceability-Model](DECISION-038-Traceability-Model.md) — hạ tầng `TraceLink` thực thi DECISION-048; cần cập nhật phạm vi riêng (không nằm trong DECISION-048).
- [DECISION-019-Recommendation-Engine](DECISION-019-Recommendation-Engine.md) — xác nhận Recommendation chỉ tổng hợp tín hiệu, liên quan tới D3 và chuỗi truy vết qua D7.
- [DECISION-023-Controlled-Knowledge-Expansion](DECISION-023-Controlled-Knowledge-Expansion.md) — nguồn của yêu cầu explainability cho D4/D5.
- [DECISION-026-Assessment-Core-Domain](DECISION-026-Assessment-Core-Domain.md), [DECISION-030-Assessment-Result-Granularity](DECISION-030-Assessment-Result-Granularity.md) — nguồn của yêu cầu explainability cho D2.
- [DECISION-035-No-Full-Event-Sourcing](DECISION-035-No-Full-Event-Sourcing.md) — xác nhận mô hình Append-only/Snapshot đã chốt; **không** còn được trích làm căn cứ "carve-out D8" sau Round 4.2 (D8 không còn là 1 carve-out) — vẫn liên quan vì hỗ trợ cơ chế Runtime Reconstruction (Evidence/AssessmentResult append-only, có timestamp, nên truy xuất lại được theo "as-of-time T").

## Liên kết ngược (tài liệu phân tích, không phải Decision)

[AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](../06_Database/AI_DECISION_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW.md](../06_Database/AI_DECISION_ARCHITECTURE_REVIEW.md) (Round 3.7), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](../06_Database/AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) (Round 3.8), [TEACHING_BOUNDARY_ANALYSIS.md](../06_Database/TEACHING_BOUNDARY_ANALYSIS.md), [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](../06_Database/TEACHING_VS_MENTOR_INTERACTION_REVIEW.md), [CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md](../06_Database/CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md) (Round 3.9), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](../06_Database/EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6), [D8_EXPLAINABILITY_REVIEW.md](../06_Database/D8_EXPLAINABILITY_REVIEW.md) (Round 4.1), [DECISION-048_FINAL_REVIEW.md](../06_Database/DECISION-048_FINAL_REVIEW.md) (Round 4.2).
