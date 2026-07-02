# Header / Detail / TraceLink Boundary Review (Decision Persistence Round)

> Trả lời trực tiếp 5 câu hỏi ranh giới cho kiến trúc đề xuất ở [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md). Kế thừa và **không mâu thuẫn** với [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) (Round 4.4, đã trả lời quan hệ Header↔TraceLink ở mức tổng quát) — tài liệu này mở rộng sang quan hệ **Header↔Detail** (chưa được Round 4.4 phân tích trực tiếp) và tổng hợp lại cả 3 lớp.
>
> **Kiến trúc thuần — không SQL, không chốt quyết định.**

## 1. Can Header exist without Detail?

**Có — và đây là trường hợp đã có tiền lệ thiết kế (D8).**

D8 (Mentor Interaction — Mode Selection) là ví dụ sống: theo [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (locked), D8 **không có Detail** (Do Not Persist) nhưng **vẫn phải explainable** — Header (ghi nhận "decision này đã xảy ra, lúc nào") + Runtime Reconstruction (trả lời "vì sao") là **toàn bộ** câu trả lời, không thiếu Detail nào cả vì D8 chủ động không cần Detail theo thiết kế.

**Trường hợp thứ 2, khác bản chất — không nên nhầm với D8:** với D1/D5/D6/D9a/D9b, **trước khi** Detail tương ứng được thiết kế/build, Header **về mặt kỹ thuật** vẫn có thể tồn tại độc lập (không có ràng buộc DB nào cấm) — nhưng đây là **trạng thái tạm/thiếu sót**, không phải thiết kế đúng đắn: Header một mình không trả lời được "vì sao" cho các Decision Type này (khác D8, vì chúng **cần** Detail theo Mechanism Matrix, [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md)). Phải phân biệt rõ 2 trường hợp: **"Header không cần Detail" (D8, đúng thiết kế)** khác **"Header có Detail nhưng Detail chưa được build" (D1/D5/D9a/D9b hiện tại, là 1 gap đang chờ đóng, không phải trạng thái chấp nhận được lâu dài)**.

## 2. Can Detail exist without Header?

**Có, trên thực tế — 4 Detail đã tồn tại từ trước khi Header được đề xuất (D2, D3, D4, D7), không có Header nào.** Đây không phải vi phạm gì — Header **chưa từng tồn tại** lúc các Detail đó được build (DDL Round 2-4), nên không có gì để "thiếu".

**Đi tới (sau khi Header được build, nếu được Founder/ChatGPT chốt):** 🟡 **Có thể, nhưng không nên — và DB không enforce được điều này.** Không có FK/trigger nào bắt buộc "mọi Detail insert phải kèm 1 Header insert cùng transaction" — đây là **Application Layer Discipline dependency** (cùng họ rủi ro GAP-04/GAP-05/C-05 đã liệt kê ở [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md)). Nếu Detail mới được tạo mà actor quên ghi Header, hệ quả: quyết định đó **vẫn explainable đầy đủ ở mức Detail/TraceLink** (không mất thông tin "vì sao"), nhưng **biến mất khỏi câu hỏi timeline/inventory tổng hợp** ("AI đã quyết định gì xuyên mọi Capability cho Learner X") — 1 dạng suy giảm explainability "âm thầm", khó phát hiện vì không gây lỗi rõ ràng ở truy vấn riêng từng Detail.

**Khuyến nghị (không tự chốt):** nếu Founder/ChatGPT build Header, nên đi kèm 1 quy ước bắt buộc ở Application/Backend Layer (không phải DB Constraint, vì DB không biểu diễn được "phải có dòng tương ứng ở bảng khác" như 1 CHECK đơn) — ví dụ 1 Service layer duy nhất chịu trách nhiệm ghi cả Header+Detail trong 1 transaction, đã gợi ý ở [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 5.

## 3. Should Header own TraceLink?

**Không.**

Nếu Header "sở hữu" TraceLink (vd: TraceLink trở thành con trong Aggregate của Header, hoặc Header tự mang `source_*`/`target_*`), 2 hệ quả xấu xảy ra đồng thời:
1. **Tái tạo đúng Polymorphic FK mà DECISION-038 đã từ chối** — Header sẽ cần biết "loại nguồn nào" cho mỗi decision, đúng việc TraceLink đang làm, dẫn tới 2 cơ chế cùng phân loại 1 thứ ở 2 nơi (đã phân tích kỹ ở [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) Q3/Q6 cho hướng gộp tổng quát; đây là 1 biến thể cụ thể của đúng rủi ro đó — "sở hữu" cũng là 1 dạng gộp một phần).
2. **Vi phạm trực tiếp kỷ luật "Header phải tối giản"** đã đặt ra ở [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) Approach C — Header "sở hữu" TraceLink nghĩa là Header giờ phải biết về mọi loại entity nghiệp vụ có thể là điểm trace (Evidence, AssessmentResult, DiscoverySession, SelfAssessmentMismatch...), một danh sách sẽ **luôn tăng** theo thời gian — đúng con đường trôi dần thành God Table.

## 4. Should TraceLink own Header?

**Không.**

TraceLink không thể "sở hữu" Header vì bản chất cardinality đối lập: TraceLink luôn là 1 **cạnh (edge)** giữa 2 bản ghi **đã tồn tại** (cardinality 0..N, không có ý nghĩa nếu 1 trong 2 đầu không tồn tại) — Header là **sự kiện (event)** có thể tồn tại độc lập, không cần "đối tác" nào để tồn tại (cardinality 0/1, đặc biệt rõ với D8 — không có Detail, không có 2 bản ghi nào để TraceLink nối). Nếu TraceLink "sở hữu" Header, mọi Header (kể cả D8) sẽ buộc phải có ít nhất 1 dòng TraceLink tương ứng để "thuộc về" TraceLink — điều này **không khả thi cho D8** (không có gì để nối) và sẽ buộc phải đặc cách D8 ra ngoài, tạo ra 2 luật khác nhau cho cùng 1 cơ chế — vi phạm tính nhất quán mà chính việc tách Header ra đời để giải quyết.

## 5. Should Header remain minimal?

**Có — đây là điều kiện sống còn của toàn bộ kiến trúc Approach C, không phải 1 khuyến nghị tùy chọn.**

[SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 1 (Approach C, dòng "Risk of God Table") đã nêu rõ: "Header chỉ an toàn nếu **giữ tuyệt đối tối giản**... nếu vi phạm kỷ luật này, Header có thể trôi dần về Approach B [Single AI Decision Table, đã bị bác bỏ]." [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md) mục 4 Risk #2 nhắc lại cụ thể: áp lực thực tế "1 lập trình viên muốn tiện nên thêm cột `source_evidence_id` thẳng vào Header cho gọn" là **hoàn toàn có thể xảy ra** nếu không có quy ước rõ.

**Ranh giới cứng cần giữ (tổng hợp từ cả 2 Round trước + tài liệu này):**
- Header **không** mang `source_*`/`target_*` (vai trò của TraceLink).
- Header **không** mang trường nội dung domain-specific nào (vai trò của Detail) — kể cả khi "tiện" vì chỉ 1-2 trường.
- Header **chỉ** mang: định danh, `decision_type`, `learner_id`, thời điểm, ai/capability nào, 1 tóm tắt ngắn, và (tùy phương án đã đề xuất ở [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 1.1/1.2) 1 con trỏ tới Detail.

---

## Evaluate: Header / Detail / TraceLink Responsibilities (tổng hợp)

| Trách nhiệm | Header | Detail | TraceLink |
|---|---|---|---|
| Ghi nhận "có decision xảy ra không, loại gì, lúc nào" | ✅ **Duy nhất** | ❌ | ❌ |
| Lưu nội dung/lý do đầy đủ, đặc thù theo domain | ❌ | ✅ **Duy nhất** | ❌ |
| Trỏ tới nguồn dữ liệu cụ thể đã dùng (provenance) | ❌ (cấm tường minh) | 🟡 Gián tiếp — Detail **dùng** TraceLink, không tự làm | ✅ **Duy nhất** |
| Trả lời truy vấn timeline/inventory xuyên mọi Capability | ✅ **Duy nhất, rẻ** (1 bảng, không UNION) | ❌ (cần UNION N bảng nếu không có Header) | ❌ (sai hình dạng truy vấn — cần biết trước 1 đầu) |
| Trả lời truy vấn "kết luận Y dựa trên gì" | ❌ | 🟡 Gián tiếp (qua TraceLink Detail nắm) | ✅ **Duy nhất** |
| Là cơ chế explainability duy nhất khi không có Detail (D8) | ✅ (kết hợp Runtime Reconstruction) | — (không áp dụng, D8 không có Detail) | ❌ (không có gì để nối) |
| Aggregate/Domain ownership | Không Domain nào (cross-cutting) | Đúng 1 Domain/Capability | Không Domain nào (cross-cutting) |
| Cardinality so với 1 decision | 0..1 | 0..1 (nếu Decision Type có Detail) | 0..N |
| Có thể tồn tại độc lập, không cần lớp khác | ✅ Có | ✅ Có (đã chứng minh — 4 Detail tồn tại trước Header) | ❌ Không (luôn cần ≥2 bản ghi) |

**Kết luận tổng hợp:** 3 lớp giữ đúng 3 trách nhiệm **không chồng lấp về chức năng cụ thể**, dù có giao điểm về mục tiêu lớn (Explainability First) — đúng kết luận "B — Partially Overlapping" đã khóa ở Round 4.4 cho riêng cặp Header/TraceLink, và nay được xác nhận **không xung đột** khi thêm Detail vào bức tranh: Detail là lớp nội dung domain-specific hoàn toàn tách biệt khỏi cả 2 lớp cross-cutting (Header, TraceLink). **Không phát hiện trách nhiệm nào bị trùng lặp giữa 3 lớp** sau khi mở rộng phân tích từ cặp (Header, TraceLink) sang bộ ba (Header, Detail, TraceLink).

## Liên kết ngược

[DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md), [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md), [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).

**Đánh giá: [DECISION_PERSISTENCE_GAP_CLOSURE.md](DECISION_PERSISTENCE_GAP_CLOSURE.md). Chưa có SQL nào được tạo. Chưa chốt quyết định nào.**
