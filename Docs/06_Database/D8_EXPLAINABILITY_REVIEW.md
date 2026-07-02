# D8 Explainability Review — Mode Selection (Round 4.1)

> Phạm vi: phân tích kiến trúc, không tạo entity/bảng/SQL/schema. Không chốt quyết định — kể cả kết luận của Round này. Mục tiêu: kiểm tra lại căn cứ loại trừ D8 (Mentor Interaction — Learning Mode Selection) khỏi yêu cầu Explainability trong [DECISION-048 (draft)](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), cụ thể là làm rõ **Explainability và Persistence có phải 2 trục độc lập hay không** — tránh mặc định "Not Persisted = Not Explainable" mà draft hiện tại có rủi ro ngụ ý.

---

## 0. Căn cứ hiện tại trong DECISION-048 (draft) cho việc loại trừ D8

Trích nguyên văn lý do đã dùng:
1. Re-derivable hoàn toàn từ `MentorSession`.
2. Criticality C.
3. Đã có quyết định Persistence riêng (`Do Not Persist`).

**Vấn đề cần soi lại:** 3 lý do này **không cùng bản chất** — (1) là 1 lý do về *khả năng giải trình* (epistemic — có thể biết được "vì sao" hay không); (2) là 1 lý do về *mức độ quan trọng nghiệp vụ* (không liên quan trực tiếp tới khả năng giải trình — 1 decision Criticality C vẫn có thể cần giải trình nếu Learner hỏi, chỉ là hậu quả nếu giải trình sai thấp hơn); (3) là 1 *quyết định khác đã chốt* (Persistence), không phải *lý do* cho quyết định Explainability — dùng (3) làm 1 trong các lý do loại trừ Explainability chính là hành vi mặc định "Not Persisted ⇒ Not Explainable" mà Round 4.1 yêu cầu kiểm tra lại.

---

## 1. Phân tích 5 câu hỏi

### Q1 — D8 có thể explainable mà không cần persistence không?

**Có, có điều kiện.** Explainability không đòi hỏi phải có 1 bản ghi lưu trữ riêng cho *chính decision đó* — nó đòi hỏi có thể trả lời "vì sao" bằng **bất kỳ nguồn dữ liệu nào** tồn tại được tại thời điểm cần audit, không nhất thiết phải là 1 bản ghi do decision đó tự tạo ra. Điều kiện: các input đã dùng để quyết định đổi Mode phải **bản thân chúng có thể truy xuất lại được** (vd: qua `Evidence`/`AssessmentResult` — cả 2 đều append-only, có timestamp, theo [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 1). Nếu input là dữ liệu transient không được lưu ở bất kỳ đâu (vd: 1 tín hiệu cảm xúc suy luận tức thời từ 1 lượt chat, không gắn vào Evidence nào), thì explainability **không** đạt được dù có hay không có persistence riêng cho D8 — đây là giới hạn thật, không phải giới hạn do thiếu persistence.

### Q2 — D8 có thể re-derive từ runtime state không?

**Một phần, không hoàn toàn.** Tách 2 câu hỏi nhỏ:
- *"Mode hiện tại là gì?"* — Có, trivial, đọc trực tiếp `MentorSession.mode` (current state, theo CoreDomainMap).
- *"Vì sao Mode đổi từ A sang B tại thời điểm T?"* — **Re-derivation chỉ cho ra 1 lý do hợp lý (plausible), không đảm bảo đúng là lý do thật đã dùng tại thời điểm T.** Có thể truy `Evidence`/`AssessmentResult` có timestamp ≤ T để dựng lại "trạng thái Learner lúc đó", rồi suy luận ngược "với trạng thái này, đổi sang Mode B là hợp lý" — nhưng đây là **suy luận hậu nghiệm (post-hoc inference)**, không phải khôi phục chính xác quá trình quyết định đã chạy. Nếu có nhiều tín hiệu cùng tồn tại gần thời điểm T (vd: vừa có `AssessmentResult` mới + vừa có `RecommendationProposal` mới), suy luận ngược có thể mơ hồ giữa nhiều nguyên nhân hợp lý.

### Q3 — Learner có thể hỏi hợp lý "Vì sao bạn chọn Mode này?" không?

**Có — đây là câu hỏi hoàn toàn hợp lý, độc lập với Criticality.** Đổi Mode (vd: từ giải thích trực tiếp sang Socratic Guidance) là 1 thay đổi **cảm nhận được trực tiếp** trong tương tác — Learner hoàn toàn có thể cảm thấy bị "đổi luật chơi" giữa đường và hỏi vì sao, ngay cả khi thay đổi đó không ảnh hưởng tới Mastery (Criticality C theo phân loại Round 3.8). Đây là điểm quan trọng nhất của Round 4.1: **Criticality (mức ảnh hưởng nghiệp vụ) và "câu hỏi có hợp lý để hỏi" (UX/trust dimension) là 2 trục khác nhau** — 1 decision ảnh hưởng nghiệp vụ thấp vẫn có thể là 1 decision Learner quan tâm giải thích cao, vì nó ảnh hưởng trực tiếp tới *cảm nhận* của họ về cuộc tương tác, không phải tới *kết quả* học tập.

### Q4 — Nếu có, cần thông tin gì để trả lời?

Mức tối thiểu để trả lời có ý nghĩa (không cần chain-of-thought đầy đủ, theo nguyên tắc đã chốt từ DECISION-027):
- Mode trước và Mode sau.
- 1 category lý do (vd: "Learner có dấu hiệu bối rối 2 lượt liên tiếp" / "Learner yêu cầu trực tiếp" / "RoadmapNode hiện tại đòi hỏi Socratic Guidance theo thiết kế nội dung").
- Thời điểm đổi.
- (Lý tưởng, không bắt buộc) 1 tham chiếu cụ thể tới tín hiệu đã kích hoạt (vd: `evidence_id` hoặc `assessment_result_id` gần nhất) — cùng hình dạng tối thiểu đã áp dụng cho D1/D6/D7/D9a/D9b ở DECISION-048 draft, không phải 1 yêu cầu đặc biệt riêng cho D8.

### Q5 — Trả lời câu hỏi này cần A. persisted record, B. runtime reconstruction, hay C. either?

**C — either, nhưng 2 lựa chọn không tương đương về chất lượng đảm bảo.**

| Lựa chọn | Cho ra gì | Đảm bảo |
|---|---|---|
| A — Persisted decision record | Lý do **chính xác** đã được dùng tại thời điểm quyết định | Cao — không phụ thuộc suy luận lại |
| B — Runtime reconstruction | Lý do **hợp lý, suy luận lại được** từ state/input đã persist ở domain khác | Trung bình — đúng "có khả năng cao", không đúng "chắc chắn", và phụ thuộc giả định "mọi input dùng để quyết định đều đã persist ở đâu đó" (giả định **chưa được xác minh** cho D8 — xem mục 3) |
| C — Either | Cả 2 đều **về nguyên tắc** đáp ứng được "explainable" | Đúng theo nghĩa hẹp, nhưng 2 lựa chọn không hoán đổi được tự do — chọn B kéo theo 1 ràng buộc ngầm (input phải persist sẵn ở nơi khác) mà hiện chưa có gì xác nhận ràng buộc này luôn đúng |

---

## 2. Current Position (Lập trường hiện tại của DECISION-048 draft)

D8 **không** thuộc phạm vi yêu cầu Explainability của DECISION-048 — lý do đưa ra là tổ hợp Criticality C + Do Not Persist + Re-derivable, được trình bày như 1 nhóm lý do đồng đẳng dẫn tới 1 kết luận duy nhất ("không cần explainable").

**Hệ quả của cách trình bày này (rủi ro, không phải lỗi cố ý):** người đọc lại DECISION-048 trong tương lai có thể rút ra quy tắc ngầm "Not Persisted ⇒ Not Explainable" từ chính ví dụ D8 — đúng là điều Round 4.1 yêu cầu kiểm tra, và đúng là rủi ro thật khi đọc nguyên văn mục Decision Scope của draft hiện tại.

---

## 3. Alternative Position (Lập trường thay thế)

**Explainability và Persistence là 2 trục độc lập.** D8 vẫn **explainable** — chỉ là explainable **bằng cơ chế khác** (Runtime Reconstruction, Option B ở mục 1 Q5) thay vì bằng cơ chế Persisted Record (Option A) mà D2/D3/D4/D5 đang dùng.

Theo lập trường này, dòng D8 trong Decision Scope của DECISION-048 nên được viết lại thành:

> D8 — Explainability Required: **CÓ** (qua Runtime Reconstruction, không qua Persisted Record) — **với điều kiện**: mọi input dùng để quyết định Mode Selection phải là dữ liệu đã/sẽ được persist ở 1 domain khác có thể truy xuất theo timestamp (Evidence, AssessmentResult, hoặc tín hiệu tương đương) — **điều kiện này chưa được xác minh** ở Round nào trước đây, vì cơ chế Mode Selection cụ thể (input nào, công thức gì) chưa từng được chốt ([AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) mục 3.7 đã ghi "tín hiệu tương tác hiện tại — chưa chốt cụ thể").

Khác biệt cốt lõi so với Current Position: **không có decision nào trong taxonomy được miễn hoàn toàn khỏi Explainability chỉ vì lý do persistence** — mọi decision thoả C1-C4 vẫn cần 1 đường dẫn tới "vì sao", chỉ khác đường dẫn đó có hình dạng gì (persisted ID cụ thể, hay suy luận lại từ state khác).

---

## 4. Tradeoff Analysis

| | Giữ Current Position (D8 miễn Explainability hoàn toàn) | Chuyển sang Alternative Position (D8 explainable qua Runtime Reconstruction) |
|---|---|---|
| **Rõ ràng về nguyên tắc** | Đơn giản hơn để viết, nhưng tạo tiền lệ "Not Persisted = Not Explainable" có thể bị áp dụng sai cho decision khác trong tương lai (vd: nếu D9a sau này cũng được quyết "Do Not Persist" vì lý do kỹ thuật, người viết Decision Log kế tiếp có thể trích D8 làm tiền lệ để cũng miễn luôn Explainability cho D9a — dù D9a có Criticality cao hơn nhiều) | Giữ 2 trục tách biệt nhất quán trên toàn bộ taxonomy — không decision nào là "ngoại lệ hoàn toàn", chỉ có "ngoại lệ về phương thức" — dễ áp dụng nhất quán hơn về dài hạn |
| **Chi phí thực thi ngay bây giờ** | Thấp nhất — không cần làm gì thêm | Thấp — **không đòi hỏi thiết kế persistence mới** (đúng giới hạn "No SQL/DDL/schema" của Round này); chỉ đòi hỏi xác nhận 1 điều kiện (input của Mode Selection phải truy xuất được từ domain khác) — đây là 1 ràng buộc hành vi (behavioral contract), không phải 1 bảng/cột mới |
| **Rủi ro nếu giả định "input đã persist ở nơi khác" sai** | Không áp dụng (đã miễn hoàn toàn, không cần giả định gì) | Nếu sau này Mode Selection dùng 1 tín hiệu transient không persist ở đâu (vd: phân tích cảm xúc tức thời không gắn Evidence), Alternative Position sẽ "nợ" 1 gap thật (giống GAP-01/02 nhưng cho D8) — nhưng đây là **nợ được nhìn thấy trước và ghi nhận có chủ đích**, khác hẳn nợ bị che giấu bởi 1 miễn trừ tuyệt đối |
| **Tính nhất quán với câu hỏi UX thật (mục 1, Q3)** | Không xử lý được trường hợp Learner thực sự hỏi "vì sao đổi Mode" — theo Current Position, câu trả lời chính thức là "không có nghĩa vụ trả lời", dù câu hỏi hoàn toàn hợp lý | Có đường trả lời rõ — sản phẩm/Mentor Interaction có thể (không bắt buộc phải persist) trả lời bằng cách suy luận lại từ state hiện có, đáp ứng đúng nhu cầu UX thật |
| **Phù hợp với cảnh báo "IMPORTANT" của Round 4.1** | Không phù hợp — chính là ví dụ của điều Round 4.1 yêu cầu tránh | Phù hợp trực tiếp — tách rõ 2 khái niệm theo đúng yêu cầu |

---

## 5. Recommendation

**Khuyến nghị chuyển DECISION-048 (draft) sang Alternative Position cho D8** — không phải vì Current Position sai về kết luận thực tế (D8 vẫn không cần 1 persisted record riêng — kết luận này **giữ nguyên**), mà vì cách trình bày hiện tại trộn lẫn 2 khái niệm (Explainability, Persistence) theo cách có thể bị đọc sai/dùng sai làm tiền lệ.

**Cụ thể, đề xuất 2 thay đổi nhỏ cho DECISION-048 (draft), chưa lock, chờ Founder/Lead Architect xác nhận:**

1. Đổi dòng D8 trong bảng Decision Scope từ "Explainability Required? **KHÔNG**" thành "Explainability Required? **CÓ — qua Runtime Reconstruction, không qua Persisted Record**", kèm điều kiện (input phải truy xuất được từ domain khác).
2. Trong mục "Explicitly NOT Required", **bỏ D8** ra khỏi danh sách (vì D8 không còn là 1 trường hợp "không yêu cầu explainable") — danh sách "NOT Required" chỉ nên còn lại mục #2 và #3 đã có (hành vi không thoả C1-C4, và yêu cầu không cần chain-of-thought đầy đủ) — tức là, sau Round 4.1, **không có Decision Type nào (D1-D9b) được miễn Explainability hoàn toàn** — chỉ có 1 decision (D8) dùng cơ chế khác để đạt nó.

**Không khuyến nghị mở lại quyết định Persistence của D8** (vẫn `Do Not Persist`, theo Round 3.8 — Round 4.1 không xét lại trục này) — đây chính là điểm minh chứng rõ nhất cho việc 2 trục độc lập: D8 đổi từ "miễn Explainability" sang "Explainable qua cơ chế khác" **mà không cần đổi gì** ở quyết định Persistence.

**Không chốt quyết định này** — đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect xác nhận trước khi DECISION-048 được cập nhật/locked, theo đúng giới hạn Round 4.1.

## Liên kết ngược

[DECISION-048-All-AI-Decisions-Must-Be-Explainable (draft)](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md).
