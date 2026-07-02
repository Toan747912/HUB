# Shared Decision Persistence Review (Round 4.3)

> Phạm vi: phân tích kiến trúc. **Không tạo bảng, không viết SQL, không chốt quyết định.** [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) đã locked — toàn bộ 9 Decision Type cần explainable qua persisted record (D1-D7, D9a, D9b) + 1 Decision Type (D8) qua Runtime Reconstruction đã được xác nhận phạm vi. Câu hỏi còn lại duy nhất: **lưu các bản ghi explainability này bằng cơ chế nào** — đây là câu hỏi Persistence Mechanism mà Round 3.6 đã nêu nhưng chưa chốt, nay được xét lại với đầy đủ context (DECISION-038 TraceLink đã locked, Supabase đã là platform chính thức theo [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md)/[PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md)).

---

## 0. Bối cảnh cần nhắc lại trước khi so sánh

- **2 Decision Type đã có persistence riêng và đã build:** `AssessmentResult` (D2) và `ExpansionRecord` (D4/D5) — đây **chính là hiện thân của Approach A** (per-capability table), đã tồn tại từ DDL Round 1-3, trước khi câu hỏi "cơ chế chung" được đặt ra. Bất kỳ phương án nào chọn ở Round này **không được giả định viết lại 2 entity đã build này** — câu hỏi thực tế là cơ chế nào dùng cho **7 Decision Type còn lại** (D1, D3, D6, D7, D9a, D9b cần persist; D8 không cần).
- **TraceLink (DECISION-038) đã locked** — là tầng hạ tầng cross-cutting cho truy vết *ngược* (từ AssessmentResult/RecommendationProposal trỏ về Evidence/AssessmentResult/DiscoverySession), dùng `source_type`/`target_type` dạng enum, **từ chối Polymorphic FK rải trên entity nghiệp vụ**. Mọi phương án dưới đây phải tương thích với quyết định này, không thiết kế lại.
- **Supabase là platform đã khoá** (DECISION-042..045) — đặc điểm cần tính tới: Row Level Security (RLS) so sánh trực tiếp `auth.uid()` với `learner_id`; PostgREST tự sinh API theo từng bảng; `jsonb` có sẵn cho payload tự do; `snake_case` bắt buộc theo convention đã chốt.

---

## 1. Architecture Comparison

### A. Independent Persistence per Capability

Mỗi Capability/Decision Type có 1 entity log riêng (đúng mô hình `AssessmentResult`/`ExpansionRecord` đã build) — vd: 1 entity cho Teaching Content Selection, 1 entity cho Roadmap Mapping reasoning, v.v.

| Tiêu chí | Đánh giá |
|---|---|
| **Domain isolation** | **Tốt nhất.** Mỗi entity log do đúng domain sở hữu (Teaching Capability sở hữu log của mình, Roadmap Engine sở hữu log của mình) — không domain nào phải biết về domain khác, khớp 100% nguyên tắc Write-Ownership đã giữ xuyên suốt từ Round 1. |
| **Explainability completeness** | Tốt **trong phạm vi 1 decision** (schema riêng, constraint riêng, không bị pha loãng). **Yếu ở góc nhìn xuyên decision** — câu hỏi "AI đã quyết định gì cho Learner X hôm nay, qua mọi capability" cần UNION nhiều bảng không cùng cấu trúc. |
| **Query complexity** | Thấp cho truy vấn trong 1 domain (đọc đúng 1 bảng quen). Cao cho truy vấn tổng hợp xuyên domain (UNION ALL N bảng, mỗi bảng cấu trúc khác nhau — không có "view chung" tự nhiên). |
| **Supabase compatibility** | Tốt — mỗi bảng có RLS Policy riêng, đơn giản (`learner_id = auth.uid()`), PostgREST tự sinh API rõ ràng theo từng bảng, kiểu dữ liệu mạnh (không cần `jsonb` payload mơ hồ). Chi phí: N bảng = N policy cần audit, dễ có 1 policy bị quên/viết sai khi N tăng. |
| **Future extensibility** | Thêm Decision Type mới = thêm 1 bảng mới, không đụng bảng cũ — an toàn, nhưng **lặp lại cấu trúc tương tự** (reasoning/source/timestamp) ở mỗi bảng mới, không có nơi nào enforce sự nhất quán đặt tên/cấu trúc giữa các bảng log — rủi ro "5 bảng log, 5 kiểu tên cột hơi khác nhau" theo thời gian nếu không có convention riêng. |
| **Risk of God Table** | **Không có** — đây chính là phương án đối lập hoàn toàn với God Table. |
| **Impact on TraceLink** | **Không cần sửa gì.** Khớp đúng mô hình `source_type` enum đã có — mỗi bảng log mới chỉ cần thêm 1 giá trị enum mới (`teaching_decision_log`, `roadmap_dependency_reason`...). Đây là cách `TraceLink` đã được thiết kế để mở rộng từ đầu (DECISION-038 Reasoning: "dễ mở rộng thêm loại entity mới sau này mà không cần sửa schema entity nghiệp vụ đã có"). |

### B. Single AI Decision Table

1 bảng duy nhất chứa mọi Decision Type, phân biệt qua 1 cột discriminator (`decision_type`), các cột domain-specific để nullable hoặc dồn vào 1 cột `jsonb` payload chung.

| Tiêu chí | Đánh giá |
|---|---|
| **Domain isolation** | **Kém nhất.** Mọi Capability (Teaching, Roadmap Engine, Discovery Engine...) đọc/viết cùng 1 bảng vật lý — tái tạo chính xác anti-pattern đã bị bác bỏ ở Round 3.6 mục 3.2: ranh giới domain đã tách riêng có chủ đích (vd: Knowledge Graph tách khỏi Roadmap, DECISION-015) bị xoá nhoà ở tầng lưu trữ. |
| **Explainability completeness** | Cao cho truy vấn tổng hợp ("mọi quyết định của Learner X") — 1 SELECT. **Thấp cho từng decision cụ thể** — không thể có constraint NOT NULL có ý nghĩa cho cột nào (vì không Decision Type nào dùng hết mọi cột), buộc phải dồn phần payload đặc thù vào `jsonb` không được DB validate cấu trúc nội bộ. |
| **Query complexity** | Thấp cho tổng hợp; **Cao cho truy vấn theo loại cụ thể** — phải filter `decision_type` rồi tự diễn giải `jsonb` payload ở Application Layer (không tận dụng được index/constraint Postgres cho cấu trúc bên trong `jsonb` một cách tự nhiên như cột thường). |
| **Supabase compatibility** | RLS Policy gọn (1 policy áp cho mọi loại) — điểm cộng. Nhưng **kiểu Postgres/PostgREST sinh ra cho 1 cột `jsonb` không có cấu trúc cố định** — TypeScript types tự sinh (Supabase codegen) sẽ trả về `Json`/`any`-shape cho payload, mất lợi ích an toàn kiểu dữ liệu mà các bảng riêng (Approach A) có được. |
| **Future extensibility** | Có vẻ linh hoạt ("thêm decision_type mới, không cần bảng mới") nhưng thực chất đẩy gánh nặng đảm bảo cấu trúc payload ra ngoài DB, vào quy ước ngầm giữa các team/Capability — không có gì ở tầng schema ngăn 2 Capability vô tình dùng cùng 1 field name cho 2 ý nghĩa khác nhau trong `jsonb`. |
| **Risk of God Table** | **Cao nhất — chính là định nghĩa của God Table.** Đây là phương án mà Round 3.6 mục 3.2 đã phân tích và khuyến nghị tránh; không có thông tin mới ở Round 4.3 làm thay đổi kết luận đó. |
| **Impact on TraceLink** | **Xung đột vai trò, không chỉ là "cần sửa".** Nếu mọi decision dồn vào 1 bảng, `TraceLink.source_type` sẽ phải sụp về 1 giá trị duy nhất (`ai_decision`), phân biệt tiếp qua `decision_type` bên trong — tạo ra **2 lớp discriminator chồng nhau** (`TraceLink.source_type` và `ai_decision.decision_type`) làm cùng 1 việc ở 2 nơi khác nhau. Đây không phải vấn đề kỹ thuật nhỏ — là 2 cơ chế cross-cutting cạnh tranh vai trò, đúng kiểu rủi ro "2 nguồn sự thật" mà [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 2.2 đã cảnh báo tránh ("Current state luôn tách khỏi lịch sử... không bao giờ chỉ lưu... mà xóa lịch sử" — nguyên tắc tránh trùng lặp nguồn sự thật áp dụng tương tự ở đây). |

### C. Header / Detail Architecture

1 lớp Header tối giản, cross-cutting (id, decision_type, learner_id, capability, thời điểm, tóm tắt lý do, tham chiếu `traced_to`) đứng trên các Detail — mỗi Detail vẫn là 1 entity riêng theo đúng domain của nó (như Approach A), hoặc với D8, không cần Detail nào cả (Runtime Reconstruction).

| Tiêu chí | Đánh giá |
|---|---|
| **Domain isolation** | **Tốt — tương đương Approach A cho phần Detail.** Header không thuộc domain nghiệp vụ nào (giống cách `TraceLink` "không thuộc bất kỳ Core Domain nghiệp vụ nào", DECISION-038) — không domain nào phải "cho mượn" cấu trúc của mình vào 1 bảng chung; chỉ cần "đăng ký" sự tồn tại của decision vào Header. |
| **Explainability completeness** | **Cao nhất.** Header trả lời tốt câu hỏi tổng hợp (1 bảng, mọi decision_type, đủ để biết "có gì đã xảy ra, khi nào, do capability nào") — gần bằng Approach B ở khoản này; đồng thời Detail giữ nguyên đầy đủ cấu trúc/constraint đặc thù — bằng Approach A ở khoản đó. Không phải đánh đổi 1-trong-2 như A/B, mà giữ được cả hai ở 2 lớp khác nhau. |
| **Query complexity** | Trung bình — truy vấn tổng hợp xuyên decision: chỉ cần Header (rẻ như B). Truy vấn sâu 1 loại cụ thể: Header JOIN Detail (1 join thêm so với A, nhưng vẫn rẻ hơn việc A phải UNION N bảng khi cần nhìn tổng hợp). |
| **Supabase compatibility** | Tốt, với 1 điều kiện kỹ thuật cần lưu ý: RLS Policy của Header dùng trực tiếp `learner_id = auth.uid()` (đơn giản). RLS Policy của từng Detail **nên denormalize `learner_id` ngay trên Detail** (không chỉ dựa vào JOIN ngược qua Header trong policy) để tránh subquery lặp lại trên mọi truy vấn Detail — đây là 1 chi tiết kỹ thuật cần quyết định ở vòng Physical Design, không phải vấn đề chặn ở tầng kiến trúc. |
| **Future extensibility** | **Tốt nhất.** Thêm Decision Type mới = đăng ký 1 giá trị `decision_type` mới + (nếu cần) 1 Detail mới — không đụng Header, không đụng Detail khác. Decision Type không cần Detail (như D8, dùng Runtime Reconstruction) vẫn đăng ký được vào Header mà không cần tạo Detail rỗng vô nghĩa. |
| **Risk of God Table** | **Thấp, có điều kiện** — Header chỉ an toàn nếu **giữ tuyệt đối tối giản**, không bao giờ tích lũy thêm cột domain-specific theo thời gian (đây là 1 kỷ luật thiết kế cần duy trì, không phải thuộc tính tự động có được — nếu vi phạm kỷ luật này, Header có thể trôi dần về Approach B). |
| **Impact on TraceLink** | **Bổ trợ, không trùng lặp — nhưng có 1 câu hỏi kiến trúc chưa đóng.** `TraceLink` hiện làm nhiệm vụ "truy vết ngược" (decision → nguồn dữ liệu đã dùng); Header làm nhiệm vụ bổ sung "đăng ký xuôi" (có 1 decision loại gì đã xảy ra, khi nào). 2 việc này không phải 1 — nhưng giống nhau ở bản chất "cross-cutting, không thuộc domain nghiệp vụ nào" tới mức cần Founder/Lead Architect xác nhận: **Header có nên hấp thụ luôn vai trò của TraceLink (gộp 2 thành 1), hay giữ 2 lớp riêng, phối hợp với nhau?** Round 4.3 không tự trả lời câu hỏi này — chỉ ghi nhận là 1 quyết định còn mở (xem mục 5). |

---

## 2. Pros / Cons (tổng hợp nhanh)

| | A — Independent per Capability | B — Single Table | C — Header/Detail |
|---|---|---|---|
| **Pros chính** | Domain isolation hoàn hảo; không rủi ro God Table; khớp 100% với 2 entity đã build (`AssessmentResult`/`ExpansionRecord`) | Truy vấn tổng hợp đơn giản nhất; ít bảng nhất | Cân bằng tốt nhất giữa isolation và truy vấn tổng hợp; mở rộng rẻ nhất dài hạn; tương thích ngược với những gì đã build |
| **Cons chính** | Truy vấn tổng hợp xuyên decision tốn kém (UNION nhiều bảng); không có cơ chế enforce nhất quán cấu trúc giữa các bảng log | Rủi ro God Table cao; xung đột vai trò với TraceLink; mất type-safety cho payload | Cần 1 join thêm cho truy vấn sâu; cần kỷ luật giữ Header tối giản; còn 1 câu hỏi mở về quan hệ với TraceLink |

---

## 3. Scalability Analysis

- **Write volume:** D1 (Teaching — Content Selection) là decision tần suất cao nhất trong toàn hệ thống (mọi lượt dạy). Dưới **A**, write load của D1 chỉ ảnh hưởng 1 bảng riêng — không lan ra bảng khác. Dưới **B**, mọi write (kể cả D1 tần suất cao) dồn vào 1 bảng vật lý duy nhất — rủi ro **write hotspot/contention** khi nhiều `SubSession` đang chạy đồng thời, ảnh hưởng cả tới việc đọc/viết của các Decision Type khác (vd: Assessment) dù chúng không liên quan logic gì tới Teaching. Dưới **C**, Header nhận **mọi** write (giống B về tổng khối lượng) — nhưng vì Header chỉ có vài cột tối giản (không có payload nặng), chi phí ghi mỗi row thấp hơn nhiều so với 1 row đầy đủ payload trong B; đây chính là lý do Header phải "tối giản" không chỉa là nguyên tắc kiến trúc mà còn là yêu cầu hiệu năng thực tế.
- **Retention:** [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 2.5 đã chốt "Recommendation history không bao giờ bị xóa" — nguyên tắc tương tự áp dụng cho mọi entity mang ý nghĩa quyết định AI (immutable-by-default, mục 2.1). Dưới **A**, mỗi bảng có thể (về lý thuyết, chưa quyết) có chiến lược retention/tiering riêng theo đặc tính riêng (vd: D1 tần suất cao có thể cần tiering sớm hơn D6). Dưới **B/C**, toàn bộ decision dồn vào 1 (hoặc 1 Header) bảng kế thừa **cùng 1 retention policy** — nếu sau này muốn tiering khác nhau theo loại decision, sẽ khó tách hơn so với A.
- **Index/Query growth theo thời gian:** Header (C) tăng trưởng tuyến tính theo tổng số decision toàn hệ thống — cần index theo `(learner_id, decision_type, created_at)` để giữ truy vấn nhanh khi dữ liệu lớn; đây là 1 bảng "nóng" cần giám sát, tương tự cách `Evidence`/`AssessmentResult` đã được xác định là append-only tăng không giới hạn ở Round trước — không phải rủi ro mới, là rủi ro đã biết áp dụng cho 1 bảng mới.

---

## 4. Migration Impact

**Đây là yếu tố quyết định thực tế nhất, không chỉ là lý thuyết kiến trúc:**

- `AssessmentResult` (D2) và `ExpansionRecord` (D4/D5) **đã được build từ DDL Round 1-3** — đây là 2 ví dụ sống của Approach A, đã locked, đã có dữ liệu (hoặc sẵn sàng nhận dữ liệu) trong production schema.
- **Approach B nếu được chọn bây giờ đòi hỏi migrate 2 entity đã build này vào 1 bảng chung** — rủi ro cao (đổi cấu trúc bảng đã có thể đã có dữ liệu thật, đổi mọi query/Application code đang đọc 2 bảng đó, vi phạm tinh thần "không sửa lại Decision đã khoá" nếu coi cấu trúc bảng đã build tương đương 1 quyết định ngầm đã chốt).
- **Approach C không đòi hỏi sửa 2 entity đã build** — Header có thể được giới thiệu như 1 lớp đăng ký bổ sung, *thêm vào sau*, cho riêng 5-6 Decision Type còn chưa có cơ chế lưu (D1, D6, D7, D9a, D9b) — hoặc tuỳ chọn mở rộng để cả `AssessmentResult`/`ExpansionRecord` cũng "đăng ký" vào Header (không bắt buộc, không phá vỡ cấu trúc nội bộ của chúng). Đây là khác biệt thực tế quan trọng nhất giữa C và B mà phân tích kiến trúc thuần (mục 1) không tự lộ ra nếu không xét tới lịch sử implementation đã có.
- **Approach A** không có chi phí migration nào (tiếp tục đúng pattern đã làm) — nhưng "chi phí migration thấp nhất" không đồng nghĩa "tốt nhất về dài hạn", vì nó không giải quyết được nhu cầu truy vấn tổng hợp xuyên decision mà Recommendation Engine và Memory Profile/Learning Profile (Round 5/7, Read Model cần "drill-down") sẽ ngày càng cần khi số Decision Type tăng.

---

## 5. Recommendation

**Khuyến nghị: C — Header/Detail**, với 2 điều kiện áp dụng cụ thể (không chốt, chờ Founder/Lead Architect xác nhận):

1. **Không migrate `AssessmentResult`/`ExpansionRecord` đã build** — Header chỉ đăng ký các Decision Type còn thiếu cơ chế (D1, D6, D7, D9a, D9b); việc 2 entity cũ có "đăng ký ngược" vào Header hay không là tuỳ chọn, không bắt buộc, để lại cho Round Physical Design sau.
2. **Cần 1 quyết định riêng (chưa đóng ở Round này) về quan hệ Header ↔ TraceLink** — gộp thành 1 cơ chế, hay giữ 2 lớp riêng phối hợp nhau. Đây là rủi ro lớn nhất nếu bỏ qua: xây Header mà không trả lời câu hỏi này trước có thể dẫn tới 2 cơ chế cross-cutting cạnh tranh vai trò (đúng vấn đề đã thấy ở Approach B mục Impact on TraceLink, nhưng ở quy mô nhỏ hơn nếu không cẩn thận).

**Vì sao không chọn A dù chi phí migration thấp nhất:** A giải quyết đúng yêu cầu của DECISION-048 (mọi decision explainable) nhưng không giải quyết được nhu cầu *tổng hợp* xuyên decision mà các Capability tiêu thụ chéo (Recommendation đọc tín hiệu từ Assessment + Discovery + Roadmap; Learning Profile cần "drill-down" xuyên domain) sẽ ngày càng cần khi hệ thống lớn hơn — A đẩy toàn bộ chi phí tổng hợp này sang Application Layer (UNION nhiều bảng thủ công), lặp lại đúng kiểu rủi ro "Application Layer Discipline" đã bị flag nhiều lần (GAP-04/05/07) ở các Round trước.

**Vì sao không chọn B dù đơn giản nhất về số lượng bảng:** rủi ro God Table đã được chính dự án này xác định và bác bỏ từ Round 3.6 mục 3.2 — không có thông tin mới ở Round 4.3 (kể cả góc nhìn Supabase) làm thay đổi kết luận đó; ngược lại, góc nhìn Supabase (mất type-safety cho `jsonb` payload qua PostgREST codegen) còn làm yếu thêm vị thế của B.

**Không chốt quyết định này** — đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect, theo đúng giới hạn Round 4.3 ("Do not lock decisions. Architecture analysis only").

## Liên kết ngược

[EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6, phân tích gốc của 3 phương án), [DECISION-048-All-AI-Decisions-Must-Be-Explainable](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (locked), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md), [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) / [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md) (Round 3.8).
