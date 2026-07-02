# Decision Header vs TraceLink — Boundary Review (Round 4.4)

> Phạm vi: phân tích kiến trúc. **Không tạo bảng, không viết SQL, không chốt quyết định.** Trả lời câu hỏi còn mở từ [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 5 (Recommendation, điều kiện #2): Decision Header (khái niệm đề xuất, chưa build) và `TraceLink` ([DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), đã locked) có chồng lấp trách nhiệm không, và nếu có thì xử lý thế nào *trước khi* chọn persistence mechanism chính thức.

---

## 1. Comparison Matrix

| Tiêu chí | Decision Header (đề xuất) | TraceLink (đã locked, DECISION-038) |
|---|---|---|
| **Purpose** | Đăng ký **sự kiện** "1 AI Decision đã xảy ra" — loại gì, capability nào, lúc nào, cho Learner nào — bất kể decision đó có chuỗi truy vết sâu hay không | Ghi nhận **quan hệ** giữa 1 bản ghi kết luận (`AssessmentResult`, `RecommendationProposal`...) và (các) nguồn dữ liệu cụ thể đã dùng để tạo ra kết luận đó (`Evidence`, `AssessmentResult`, `DiscoverySession`) |
| **Ownership** | Cross-cutting, không thuộc domain nghiệp vụ nào — giống `TraceLink` ở điểm này | Cross-cutting, không thuộc domain nghiệp vụ nào (đã xác nhận tường minh ở DECISION-038 Consequences) |
| **Lifecycle** | Sinh ra **tại thời điểm decision xảy ra** — có thể là bản ghi **duy nhất** tồn tại cho 1 decision nếu decision đó không có Detail (vd: D8 — Mode Selection, dùng Runtime Reconstruction, không có Detail) | Chỉ sinh ra **khi đã có ít nhất 2 bản ghi tồn tại** (nguồn + đích) để nối — không thể tồn tại độc lập, luôn là quan hệ giữa 2 thực thể đã có sẵn |
| **Query patterns** | "Liệt kê mọi decision của Learner X, mọi loại, theo thời gian" — truy vấn dạng **timeline/inventory** phẳng, lọc theo `learner_id` + `decision_type` + khoảng thời gian | "Kết luận Y này dựa trên nguồn nào?" / "Nguồn Z này đã góp phần vào kết luận nào?" — truy vấn dạng **tra cứu cạnh (edge lookup)** giữa 2 node cụ thể đã biết |
| **Explainability role** | Là **điểm vào** (entry point) cho câu hỏi "có decision nào không, loại gì" — nhưng **không tự nó là câu trả lời đầy đủ "vì sao"** cho decision có Detail+TraceLink riêng (D2, D3...). Với D8 (không Detail), Header + Runtime Reconstruction **là** toàn bộ câu trả lời. | **Là chính cơ chế trả lời "vì sao"** cho mọi decision có chuỗi truy vết — đây là tầng thực thi thật của Explainability First (DECISION-027/048), không chỉ là điểm vào |
| **Audit role** | Audit ở mức "decision này **có được ghi nhận là đã xảy ra** không" (completeness của registry) | Audit ở mức "kết luận này **có được neo đúng vào nguồn** không" (completeness của provenance) — 2 loại audit khác nhau, không thay thế nhau |
| **Persistence role** | Với decision có Detail: Header là 1 **registry phụ trợ**, không phải nguồn sự thật của nội dung quyết định (nội dung nằm ở Detail). Với decision không Detail (D8): Header là **nguồn sự thật duy nhất** của việc "decision đã xảy ra" | Luôn là 1 **bảng quan hệ** (edge), không bao giờ là nguồn sự thật của nội dung — nội dung luôn nằm ở 2 đầu (`source`/`target`) mà nó nối |

---

## 2. Overlap Analysis

### Câu hỏi A/B/C: Cùng 1 khái niệm, chồng lấp 1 phần, hay 2 lớp hoàn toàn khác?

**Kết luận: B — Chồng lấp một phần (Partially Overlapping), không phải A, không phải C.**

- **Không phải A (cùng 1 khái niệm):** chủ thể của 2 cơ chế khác nhau về bản chất — Header nói về **sự xuất hiện của 1 hành động** (decision-as-event, cardinality 0/1 cho mỗi decision), TraceLink nói về **quan hệ giữa 2 bản ghi đã tồn tại** (relationship-as-edge, cardinality 0..N cho mỗi decision). 2 khái niệm này không thể gộp làm 1 mà không mất thông tin về cardinality khác nhau của chúng.
- **Không phải C (2 lớp hoàn toàn khác, không liên quan):** cả 2 đều là hạ tầng cross-cutting phục vụ chung 1 mục tiêu lớn hơn (Explainability First, DECISION-027/048), cả 2 đều có thể tham chiếu tới cùng 1 tập thực thể (`AssessmentResult`, `DiscoverySession`...) — chỉ khác vai trò: Header coi chúng là **chủ thể được đăng ký**, TraceLink coi chúng là **đầu mối của 1 cạnh**. Có điểm giao thật (cùng dữ liệu, cùng mục tiêu lớn) nên không thể coi là "hoàn toàn không liên quan".
- **Vì sao là B:** phần chồng lấp nằm ở **mục tiêu** (cả 2 đều phục vụ explainability) và **một phần dữ liệu tham chiếu** (cùng trỏ tới cùng các entity nghiệp vụ), nhưng **không chồng lấp** ở **chức năng cụ thể** (đăng ký sự kiện vs nối quan hệ) hay **cardinality** (1 vs N) hay **khả năng tồn tại độc lập** (Header có thể tồn tại không cần gì khác; TraceLink luôn cần 2 thực thể đã có).

---

## 3. Trả lời 7 câu hỏi

### Q1 — Decision Header giải quyết vấn đề gì?

Trả lời câu hỏi: **"Có cách nào biết được toàn bộ tập hợp 'AI đã quyết định gì, loại gì, lúc nào, cho ai' xuyên suốt mọi Capability, bằng 1 truy vấn duy nhất, kể cả với các decision không có Detail riêng (D8)?"** — hiện tại (theo Approach A, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 1) không có câu trả lời nào không cần UNION nhiều bảng không đồng cấu trúc, và D8 (không Detail) hoàn toàn không có nơi để "biết" decision đã xảy ra ngoài việc tự suy luận lại (Runtime Reconstruction) mỗi lần cần.

### Q2 — TraceLink giải quyết vấn đề gì?

Trả lời câu hỏi đã được DECISION-038 nêu rõ: **"Làm sao truy vết 1 kết luận AI tới đúng nguồn dữ liệu cụ thể đã dùng, mà không phải rải Polymorphic FK lên từng bảng nghiệp vụ (AssessmentResult, RecommendationProposal...)"** — đây là vấn đề về *mô hình hoá quan hệ truy vết*, không phải vấn đề về *đăng ký sự kiện*.

### Q3 — 1 trong 2 có thể thay thế cái còn lại không?

**Không — cả 2 chiều.**

- **TraceLink không thể thay Header:** TraceLink luôn cần ≥2 bản ghi đã tồn tại để nối. Với D8 (không Detail, không bản ghi kết luận nào được tạo), TraceLink **không có gì để nối** — không thể dùng TraceLink để trả lời "decision Mode Selection này có xảy ra không, lúc nào". Ngoài ra, hình dạng truy vấn của TraceLink (tra cứu cạnh, cần biết trước ít nhất 1 đầu) không phù hợp cho truy vấn "liệt kê toàn bộ decision theo thời gian" — sẽ phải biết trước *target* nào tồn tại rồi mới tra được, ngược lại với nhu cầu "tôi muốn biết có gì tồn tại" của Header.
- **Header không thể thay TraceLink:** để Header làm được việc TraceLink đang làm (chỉ rõ *chính xác* Evidence/AssessmentResult/DiscoverySession nào đã góp phần), Header sẽ phải có cột kiểu nguồn riêng (`source_type`/`source_id` tương tự TraceLink) — tái tạo đúng Polymorphic FK mà DECISION-038 đã từ chối, hoặc Header phải "phình" thêm cấu trúc theo từng loại nguồn, vi phạm chính kỷ luật "Header phải tối giản vĩnh viễn" mà [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 1 (Approach C) đã đặt ra làm điều kiện để tránh trôi dần thành God Table.

### Q4 — Thông tin nào CHỈ thuộc về Header?

- Việc decision có **thực sự xảy ra** hay không, tại thời điểm nào, do capability/domain nào — kể cả khi không có Detail nào được tạo ra.
- Vị trí của decision trong **taxonomy** (`decision_type`, 1 trong 10 loại đã xác định ở Round 3.8/3.9) — TraceLink không có khái niệm "loại decision", chỉ có khái niệm "loại entity nguồn/đích" (`source_type`/`target_type`), 2 phân loại khác nhau (1 phân loại theo *ý nghĩa nghiệp vụ của hành động*, 1 phân loại theo *loại bảng vật lý đang được tham chiếu*).
- Hình dạng "danh sách theo thời gian, theo Learner" — không phải hình dạng tự nhiên của 1 bảng quan hệ (edge table).

### Q5 — Thông tin nào CHỈ thuộc về TraceLink?

- Cặp cụ thể `(source_type, source_id) → (target_type, target_id)` — đây là nội dung cốt lõi của 1 cạnh truy vết, Header không có (và không nên có) khái niệm này.
- Khả năng 1 kết luận được nối tới **nhiều** nguồn (1 `AssessmentResult` có thể trace tới nhiều `EvidenceLink`) — cardinality N này thuộc bản chất quan hệ, không thuộc bản chất "đăng ký 1 sự kiện đã xảy ra" của Header (vốn cardinality 0/1 cho mỗi decision).
- Chuỗi truy vết nhiều bước (Evidence → AssessmentResult → RecommendationProposal) — đây là 1 graph nhỏ của các cạnh, chỉ TraceLink mô hình hoá được; Header không có khái niệm "chuỗi", chỉ có khái niệm "điểm xảy ra".

### Q6 — Gộp 2 cơ chế lại có tạo ra coupling/complexity/loss of clarity không?

**Có, cả 3.**

- **Coupling:** gộp buộc 2 mối quan tâm khác nhau (đăng ký sự kiện loại gì vs nối quan hệ tới entity loại gì) vào cùng 1 cấu trúc — mọi Decision Type mới (ảnh hưởng tới phần "đăng ký") và mọi loại entity nghiệp vụ mới có thể là điểm trace (ảnh hưởng tới phần "nối quan hệ") đều cùng chạm vào 1 bảng — tăng diện ảnh hưởng của mọi thay đổi tương lai, đúng kiểu coupling mà Header/Detail (tách riêng) được thiết kế để tránh ngay từ đầu ([SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 1, Approach C).
- **Complexity:** phải biểu diễn đồng thời 2 cardinality khác nhau (0/1 cho "decision xảy ra" và 0..N cho "quan hệ tới nguồn") trong 1 schema — dẫn tới cột thưa (sparse columns) khi 1 row chỉ dùng 1 trong 2 ý nghĩa, đây chính là biến thể nhẹ của vấn đề cột-thưa mà Approach B (Single Table, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 1) đã bị bác bỏ.
- **Loss of clarity:** Reasoning gốc của DECISION-038 mô tả rõ triết lý tách bạch "entity có thể được trace tới/từ" (passive, là các bảng nghiệp vụ) khỏi "quan hệ truy vết" (active, là `TraceLink`) — nhét thêm vai trò "đăng ký sự kiện decision" (1 vai trò active khác, không phải passive, không phải quan hệ) vào đúng bảng đó làm mất đi câu chuyện rõ ràng "TraceLink chỉ làm 1 việc" mà DECISION-038 đang có — người đọc sau này sẽ phải tự hỏi "row này tồn tại vì có 1 quan hệ, hay vì có 1 decision, hay cả 2?" mà không có cách phân biệt sạch.

### Q7 — Giữ riêng 2 cơ chế có tạo ra duplication/synchronization risk không?

- **Duplication:** nhẹ, có thể chấp nhận — cả 2 có thể cùng mang `learner_id`/timestamp, nhưng đây không phải trùng lặp *thẩm quyền* (mỗi bên vẫn là nguồn sự thật cho đúng 1 loại thông tin riêng) — cùng kiểu chấp nhận được như cách `KnowledgeNodeMastery` (current state) và `AssessmentResult` (lịch sử) cùng mang thông tin liên quan tới Mastery mà không bị coi là trùng lặp có hại ([PersistenceArchitecture.md](PersistenceArchitecture.md) mục 2.2 — "current state luôn tách khỏi lịch sử dẫn tới state đó", đã là nguyên tắc được chấp nhận).
- **Synchronization risk:** **có thật, cần ghi nhận rõ.** Không có gì ở tầng schema (kiểu FK NOT NULL) bắt buộc "mọi khi có 1 Detail + TraceLink được tạo, Header cũng phải được tạo cùng transaction" — đây là 1 **Application Layer Discipline dependency mới**, cùng loại rủi ro đã lặp lại nhiều lần ở các Round trước (GAP-04 cho `trace_link` đi kèm `assessment_result`; GAP-05 cho lý do đi kèm `roadmap_node_knowledge_node`) — không phải rủi ro mới về bản chất, chỉ là **1 điểm enforcement mới cần thêm vào danh sách** nếu Header được build.

---

## 4. Risks (tổng hợp)

| # | Rủi ro | Loại | Mức độ |
|---|---|---|---|
| 1 | **Synchronization risk giữa Header và Detail/TraceLink** (Q7) — không có ràng buộc DB tự động đảm bảo cả 2 luôn được tạo cùng nhau | Application Layer Discipline (kế thừa pattern GAP-04/05) | Trung bình |
| 2 | **Header trôi dần thành God Table nếu không giữ kỷ luật tối giản** — đã cảnh báo ở Round 4.3, nhắc lại vì Q3/Q6 cho thấy áp lực "muốn Header làm luôn việc của TraceLink" hoàn toàn có thể xảy ra trong thực tế (vd: 1 lập trình viên muốn tiện nên thêm cột `source_evidence_id` thẳng vào Header "cho gọn") | Kiến trúc, kế thừa Round 4.3 | Trung bình (nếu không có quy ước rõ) |
| 3 | **Nhầm lẫn vai trò nếu tài liệu hoá không rõ** — nếu Round tương lai không đọc kỹ Boundary Review này, có thể vô tình thiết kế lại theo hướng gộp (Q6) mà không nhận ra các hệ quả đã phân tích | Documentation/Knowledge continuity | Thấp, miễn Round này được liên kết ngược đúng từ DECISION-048/SHARED_DECISION_PERSISTENCE_REVIEW |

**Không có rủi ro nào ở mức đủ nghiêm trọng để khuyến nghị gộp 2 cơ chế** — toàn bộ rủi ro của việc *giữ riêng* (mục 4 #1, #3) đều là rủi ro vận hành/discipline có thể giảm nhẹ bằng quy ước rõ ràng, trong khi rủi ro của việc *gộp* (mục 3, Q6) là rủi ro **cấu trúc** khó sửa lại sau khi đã build.

---

## 5. Recommendation

**Khuyến nghị: Giữ 2 lớp riêng biệt (B — Partially Overlapping, không gộp).**

- **Decision Header** và **TraceLink** nên tiếp tục tồn tại như **2 cơ chế cross-cutting bổ trợ nhau, không thay thế nhau**: Header trả lời "có gì xảy ra, loại gì, khi nào" (forward registry); TraceLink trả lời "kết luận này dựa trên gì" (backward provenance). Đây không phải 2 cách làm cùng 1 việc — là 2 việc khác nhau, có giao điểm về mục tiêu lớn (Explainability First) nhưng không giao điểm về chức năng.
- **Khi Header được build (Round Persistence Mechanism tiếp theo), cần áp dụng nguyên tắc:** Header **không** mang cột kiểu `source_*`/`target_*` nào — bất kỳ nhu cầu "biết decision X dựa trên nguồn cụ thể nào" phải đi qua Detail + TraceLink hiện có, không phải qua Header. Đây là ranh giới cứng cần giữ để tránh rủi ro #2 (mục 4).
- **Rủi ro Synchronization (mục 4 #1) nên được ghi nhận là 1 yêu cầu thiết kế cho Round Persistence Mechanism tiếp theo** (không tự giải ở Round này) — cùng nhóm với các Application Layer Discipline dependency đã biết (GAP-04/05/07), có thể cần cùng 1 giải pháp tổng thể (vd: 1 service layer duy nhất chịu trách nhiệm ghi Header+Detail+TraceLink trong 1 transaction, đã được gợi ý từ Round 2/3 cho trường hợp tương tự).
- **Không khuyến nghị gộp Header vào TraceLink, và không khuyến nghị gộp TraceLink vào Header** — cả 2 hướng gộp đều được phân tích ở Q3/Q6 và đều dẫn tới mất khả năng, không chỉ là sắp xếp lại.

**Không chốt quyết định này** — đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect, theo đúng giới hạn Round 4.4 ("Do not lock decisions. Architecture review only"). Kết quả Round này nên được dùng làm điều kiện đầu vào khi Founder/Lead Architect chính thức chọn Persistence Mechanism (Approach A/B/C của [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md)) — không phải 1 quyết định độc lập đứng riêng.

## Liên kết ngược

[SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) (Round 4.3), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-048-All-AI-Decisions-Must-Be-Explainable](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6), [PersistenceArchitecture.md](PersistenceArchitecture.md).
