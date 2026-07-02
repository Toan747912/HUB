# Explainability Gap Resolution — Options Analysis (Round 3.6)

> Phạm vi: **chỉ phân tích phương án**. Không tạo bảng, không tạo entity, không tạo SQL, không chốt quyết định. Input: 2 gap Critical từ [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md) (GAP-01 Teaching, GAP-02 Local Knowledge Expansion). Output của round này là nguyên liệu cho Founder/ChatGPT Lead Architect quyết định ở vòng Domain Architecture tiếp theo — **không phải verdict**.

---

## 1. Critical Gap #1 — Teaching Decision Persistence

Bối cảnh: Teaching là quyết định AI tần suất cao nhất, hiện 0% traceability ở tầng lưu trữ (xem mục 1, [EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md)).

### Approach 1A — Dedicated Teaching Decision Log (entity riêng, append-only)

**Description:** Một concept log riêng, tương tự mô hình `expansion_record` — mỗi lần AI chọn "dạy KnowledgeNode X tiếp theo trong SubSession Z" sinh ra 1 bản ghi append-only chứa: KnowledgeNode được chọn, SubSession context, lý do (vd: prerequisite còn thiếu / Learner yêu cầu / retry sau sai), thời điểm.

- **Advantages:** Traceability đầy đủ và trực tiếp — trả lời được "vì sao AI dạy X trước Y" cho mọi trường hợp, không cần suy luận gián tiếp. Nhất quán với pattern đã có (`expansion_record`, `assessment_result`) nên dễ học/dễ review.
- **Disadvantages:** Tần suất ghi rất cao (mọi lượt dạy, không chỉ mọi SubSession) — rủi ro về write volume/storage nếu không có retention policy riêng. Là 1 entity mới — nếu mỗi capability AI đều xin "entity riêng" theo cùng lý do, dẫn tới entity sprawl (đối lập với Special Requirement của Round này).
- **Domain Impact:** Thuộc Mentor Interaction domain (cùng domain `sub_session`) — không tạo domain mới, nhưng làm domain này "nặng" thêm 1 entity ghi log tần suất cao.
- **Persistence Impact:** Persistence layer tăng đáng kể về write throughput; cần xác định sớm có cần archive/partition theo thời gian không (chỉ nêu vấn đề, không thiết kế).
- **Explainability Impact:** Cao nhất trong 4 approach — đóng GAP-01 hoàn toàn ở mức structural traceability.
- **Long-Term Scalability Impact:** Rủi ro nếu nhân rộng pattern này cho mọi capability tương lai (Discovery, Recommendation execution...) — mỗi capability lại có 1 log riêng, không có entry point enforcement chung (lặp lại đúng vấn đề GAP-07 đã nêu ở mức hệ thống).

### Approach 1B — Piggyback lên Evidence (gắn lý do Teaching vào dữ liệu đã tồn tại)

**Description:** Không tạo entity mới. Khi Learner phản hồi và `evidence` được tạo, đính kèm metadata mô tả "quyết định Teaching nào đã dẫn tới Evidence này" (vd: thêm field mang ngữ nghĩa "teaching context" vào `evidence`/`evidence_link` đã có, không phải bảng mới).

- **Advantages:** Không tăng entity count. Tái dùng write path đã tồn tại (Evidence Management) — không thêm 1 lượt ghi DB mới cho mỗi lượt dạy.
- **Disadvantages:** Chỉ ghi lại quyết định Teaching **khi Learner phản hồi** — nếu AI chọn dạy X nhưng Learner chưa phản hồi (bỏ giữa, chuyển sang Y), quyết định ban đầu **không được ghi nhận** vì không có Evidence nào sinh ra. Đây là gap đã nêu ở GAP-01 mục 4 ("biết kết quả là gì, không biết AI đã cân nhắc gì trước khi chọn") — Approach này chỉ thu hẹp gap, không đóng hoàn toàn.
- **Domain Impact:** Không tạo domain/entity mới, nhưng làm mờ ranh giới giữa "Evidence Management" (ghi nhận phản hồi Learner) và "Teaching" (chọn nội dung dạy) — 2 capability khác nhau bị trộn dữ liệu vào 1 entity.
- **Persistence Impact:** Thấp — tận dụng write path hiện có, không thêm bảng/throughput riêng.
- **Explainability Impact:** Trung bình — đóng được phần lớn case thực tế (Learner có phản hồi) nhưng vẫn còn blind spot ở case "AI chọn dạy nhưng không có phản hồi nào được ghi".
- **Long-Term Scalability Impact:** Rủi ro dài hạn: nếu sau này cần truy vết Teaching độc lập với Evidence (vd: phân tích "AI có xu hướng chọn sai nội dung dạy" mà không liên quan tới việc Learner trả lời đúng/sai), dữ liệu bị trộn lẫn sẽ khó tách lại.

### Approach 1C — Ephemeral-by-Design, ghi nhận chính thức bằng Decision Log (không persist)

**Description:** Chấp nhận rằng quyết định Teaching không cần persist ở tầng dữ liệu — vì nó có thể suy luận lại bất kỳ lúc nào từ state hiện tại (`roadmap_node_knowledge_node` + `knowledge_node_mastery` + `knowledge_edge`, đúng như mục 1 câu hỏi 2 của Integrity Review đã mô tả). Founder/Lead Architect ra 1 Decision Log chính thức xác nhận đây là lựa chọn có cân nhắc, không phải gap bị bỏ sót.

- **Advantages:** Không tăng write volume, không tăng entity count, không tăng độ phức tạp domain. Phù hợp nếu Teaching được coi là "stateless function of current state" thay vì "stateful decision" — về lý thuyết domain, Teaching có thể tái tạo (re-derivable) từ dữ liệu đã có nếu logic chọn lựa là deterministic.
- **Disadvantages:** Vi phạm trực diện DECISION-027 (Explainability First) nếu Teaching được coi là 1 trong các nhóm "không cho phép black-box decision" — cần xác nhận rõ Teaching có nằm trong phạm vi DECISION-027 hay không (DECISION-027 hiện liệt kê Mastery/Recommendation/Knowledge Expansion, **không liệt kê Teaching tường minh** — đây là điểm mơ hồ cần Founder làm rõ, không phải Round này tự suy diễn). Nếu logic chọn lựa Teaching không hoàn toàn deterministic (có yếu tố ngẫu nhiên/model-dependent), "re-derivable" không còn đúng và explainability thực sự mất.
- **Domain Impact:** Không có — giữ nguyên domain hiện tại.
- **Persistence Impact:** Không có — zero thay đổi.
- **Explainability Impact:** Thấp nhất trong 4 approach về structural traceability, nhưng **không nhất thiết thấp về explainability thực tế** nếu logic Teaching đơn giản và state hiện có đủ để suy luận lại quyết định mỗi lần cần audit.
- **Long-Term Scalability Impact:** Rủi ro lớn nếu Teaching logic phức tạp dần theo thời gian (thêm yếu tố cá nhân hoá, thêm signal từ Recommendation/Discovery) — "re-derivable" sẽ không còn đúng khi logic không còn pure/deterministic, và lúc đó việc thiếu persistence sẽ là nợ kỹ thuật khó truy hồi ngược (audit lịch sử cho các quyết định đã qua sẽ vĩnh viễn không thể phục dựng).

### Approach 1D — Shared "AI Decision Record" mechanism (xem mục 3 — Special Requirement)

Mô tả chi tiết ở mục 3, vì approach này không riêng cho Teaching mà là phương án chung cho cả 4 loại quyết định.

---

## 2. Critical Gap #2 — Local Knowledge Expansion Reason Persistence

Bối cảnh: DECISION-027 yêu cầu Local Expansion vẫn phải log lý do nội bộ truy vết được dù không bắt buộc hiển thị cho Learner — yêu cầu này tồn tại từ Domain Modeling (Open Question #21) nhưng chưa từng được đóng ở tầng Database Design.

### Approach 2A — Thêm cột lý do trực tiếp vào `knowledge_edge`

**Description:** Mở rộng entity `knowledge_edge` đã có sẵn với 1 cột mang ngữ nghĩa "lý do tạo cạnh này" (nullable — vì cạnh có thể được tạo bởi cơ chế khác ngoài Expansion, vd: seed data ban đầu).

- **Advantages:** Ít phá vỡ nhất — không tạo entity mới, không thêm bảng nối. Lý do nằm ngay tại nơi nó mô tả (locality cao — không cần join để biết "cạnh này vì sao tồn tại").
- **Disadvantages:** `knowledge_edge` vốn là entity cấu trúc thuần (mô tả quan hệ prerequisite giữa 2 KnowledgeNode), không phải entity audit — trộn 2 trách nhiệm (structure + audit reasoning) vào 1 entity là vi phạm Single Responsibility ở mức domain, dù không vi phạm về mặt kỹ thuật. Nullable column cũng đồng nghĩa schema không thể enforce "mọi Local Expansion phải có lý do" — vẫn phụ thuộc Application Layer Discipline (lặp lại đúng vấn đề GAP-07).
- **Domain Impact:** Không tạo domain/entity mới, nhưng làm Knowledge Graph Domain phải gánh thêm trách nhiệm "audit reasoning" mà nó chưa từng có.
- **Persistence Impact:** Tối thiểu — 1 cột thêm vào bảng đã có, không thêm write path.
- **Explainability Impact:** Đóng được GAP-02 ở mức "có nơi để ghi" — nhưng vì nullable, không đảm bảo *luôn được ghi* (enforcement vẫn ở Application Layer, không ở DB).
- **Long-Term Scalability Impact:** Nếu sau này cần thêm metadata khác cho lý do Expansion (vd: confidence score, model version đã đưa ra quyết định), `knowledge_edge` sẽ tiếp tục phình thêm cột không liên quan tới bản chất "edge" của nó.

### Approach 2B — Log entity riêng, nhẹ hơn `expansion_record`, dành cho Local Expansion

**Description:** Một concept log riêng song song với `expansion_record` nhưng tối giản hơn (không cần `expansion_class`, không cần field "bắt buộc hiển thị cho Learner") — chỉ ghi: node nào được mở rộng, lý do nội bộ, thời điểm.

- **Advantages:** Tách rõ trách nhiệm — Local và Deep/Structural Expansion có 2 cơ chế khác nhau phản ánh đúng sự khác biệt về governance đã có (DECISION-023: Local không qua approval, Deep/Structural qua approval + hiển thị Learner). Không trộn audit vào structural entity (`knowledge_edge`) như 2A.
- **Disadvantages:** Tạo thêm 1 entity cho 1 khái niệm ("lý do Expansion") đã có 1 entity tương tự (`expansion_record`) — 2 entity cùng mô tả "lý do AI mở rộng Knowledge Graph", khác nhau chỉ ở governance tier. Đây chính là rủi ro entity sprawl mà Special Requirement của Round này muốn tránh.
- **Domain Impact:** Vẫn trong Knowledge Engine domain, không tạo domain mới, nhưng tăng số entity trong domain này từ "1 audit entity" lên "2 audit entity cùng mục đích".
- **Persistence Impact:** Thấp — Local Expansion theo định nghĩa là "nhỏ", write volume không lớn bằng Teaching, nhưng vẫn là 1 write path mới.
- **Explainability Impact:** Cao — đóng GAP-02 hoàn toàn, đối xứng với cách `expansion_record` đã đóng traceability cho Deep/Structural.
- **Long-Term Scalability Impact:** Trung bình — nếu ranh giới Local/Deep/Structural từng được điều chỉnh lại (vd: gộp 2 tier thành 1, hoặc thêm tier thứ 3), việc có 2 entity riêng cho cùng 1 khái niệm sẽ cần migrate logic ở 2 nơi.

### Approach 2C — Mở rộng phạm vi `expansion_record` để cover cả Local (gộp 2 nhánh vào 1 entity đã có)

**Description:** Không tạo entity mới. Thay vì giữ "Local = không có expansion_record" như thiết kế hiện tại, mở rộng định nghĩa `expansion_record` để áp dụng cho **mọi** lần Expansion (Local và Deep/Structural), phân biệt qua cột `expansion_class` đã tồn tại sẵn trong entity này. Sự khác biệt duy nhất giữ lại: field nào bắt buộc hiển thị cho Learner (đặc thù Deep/Structural) có thể để trống/không áp dụng cho Local.

- **Advantages:** Không tăng entity count — tái dùng 100% cơ chế đã có, đã được locked ở Round 3. `expansion_class` đã tồn tại sẵn đúng mục đích phân biệt 2 nhánh — tận dụng tối đa thiết kế hiện có thay vì xây thêm.
- **Disadvantages:** Thay đổi ngữ nghĩa của 1 entity đã locked ("đã hứa ở Round 2/3 chỉ dành cho Deep/Structural") — cần Founder xác nhận rõ đây là mở rộng phạm vi được phép, không phải vi phạm decision đã chốt. Có thể làm tăng write volume đáng kể nếu Local Expansion xảy ra thường xuyên hơn Deep/Structural (chưa có dữ liệu định lượng để so sánh tần suất 2 nhánh).
- **Domain Impact:** Không tạo entity mới — giữ Knowledge Engine domain gọn nhất trong 3 approach của Gap #2.
- **Persistence Impact:** Trung bình — gộp write path nghĩa là 1 bảng phải chịu tải của cả 2 nhánh, nhưng không có write path mới phải thiết kế từ đầu.
- **Explainability Impact:** Cao — đóng GAP-02 hoàn toàn và đồng thời cải thiện tính nhất quán (1 nơi duy nhất trả lời "AI đã từng mở rộng node này khi nào, vì sao" bất kể tier).
- **Long-Term Scalability Impact:** Tốt nhất trong 3 approach về việc tránh entity sprawl — nếu có tier Expansion thứ 3 trong tương lai, chỉ cần thêm giá trị enum `expansion_class`, không cần entity mới.

### Approach 2D — Shared "AI Decision Record" mechanism

Như Approach 1D, đây là phương án chung — phân tích chi tiết ở mục 3.

---

## 3. Special Requirement — Đánh giá cơ chế chung (Shared Mechanism)

**Câu hỏi:** Một cơ chế duy nhất có thể giải quyết cả 4 loại quyết định AI — Teaching, Recommendation, Knowledge Expansion, Roadmap Mapping — mà không trở thành God Object/God Table?

### 3.1 Vì sao câu hỏi này hợp lý

Cả 4 loại quyết định, nhìn qua lăng kính Integrity Review (mục 1-5), đều trả lời chung 1 cấu trúc câu hỏi:
1. AI dựa trên dữ liệu nào để quyết định?
2. AI tạo ra dữ liệu nào?
3. Có truy vết ngược được không?
4. Lý do là gì?

Đây là dấu hiệu của 1 "cross-cutting concern" (đúng như DECISION-027 tự mô tả là "cross-cutting principle") — về lý thuyết domain, cross-cutting concern thường là ứng viên tốt cho 1 cơ chế chung (vd: logging, audit trail, observability đều theo mô hình này ở các hệ thống khác).

### 3.2 Vì sao cơ chế chung có rủi ro trở thành God Object/God Table

Nếu thiết kế ngây thơ — 1 bảng duy nhất `ai_decision` chứa mọi loại quyết định với các cột optional khác nhau theo loại (vd: `knowledge_node_id` chỉ dùng cho Expansion, `roadmap_node_id` chỉ dùng cho Roadmap Mapping, `sub_session_id` chỉ dùng cho Teaching) — sẽ tái hiện đúng anti-pattern God Table:
- Phần lớn cột NULL cho mỗi row (mỗi loại quyết định chỉ dùng 1 tập con cột).
- Không thể đặt FK NOT NULL có ý nghĩa cho bất kỳ cột tham chiếu nào (vì không loại nào dùng hết các cột) — mất chính lợi ích mà GAP-04 đã chỉ ra Assessment cần (FK NOT NULL bắt buộc).
- Mọi capability (Teaching Engine, Recommendation Engine, Knowledge Engine, Roadmap Engine) đều phải đọc/viết vào 1 bảng chung — tạo coupling ngầm giữa các domain đã được tách riêng có chủ đích ở Round 1-3 (vd: Knowledge Graph và Roadmap Graph tách biệt theo DECISION-015 — 1 bảng chung sẽ xoá nhoà ranh giới này).
- Đây chính là vấn đề "God Object" ở mức domain: 1 entity gánh trách nhiệm của 4 domain khác nhau.

### 3.3 Phương án trung gian — "Decision Header / Decision Detail" (composition, không phải hợp nhất)

**Description:** Tách thành 2 lớp khái niệm:
- **Lớp chung (Header):** 1 cơ chế tối giản, chỉ chứa các trường thực sự chung cho mọi loại quyết định AI — định danh quyết định, loại quyết định (`decision_type`), actor, thời điểm, và 1 tham chiếu "traced_to" (đúng ngôn ngữ DECISION-027) trỏ tới Evidence/AssessmentResult/DiscoverySession.
- **Lớp riêng (Detail):** Mỗi loại quyết định giữ nguyên entity/mechanism đặc thù của nó đã có hoặc sẽ có — `expansion_record` (Expansion), `assessment_result` (Assessment), `roadmap_node_knowledge_node` (Roadmap Mapping), và 1 mechanism mới cho Teaching (theo 1 trong các Approach 1A/1B/1C) — mỗi Detail liên kết ngược về Header qua 1 tham chiếu, không phải ngược lại.

Đây không phải là 1 bảng mới cụ thể — là 1 **pattern** (tương tự cách `trace_link` đã hoạt động: `trace_link.source_type` đã có sẵn placeholder cho `'recommendation_proposal'` dù entity đó chưa tồn tại, theo ghi nhận ở mục 3 Integrity Review). Có thể coi `trace_link` hiện tại đã là 1 dạng sơ khai của "Header" này, nhưng đang đóng vai backward-trace (Detail → Evidence), chưa đóng vai forward-registry (danh sách mọi quyết định đã từng xảy ra, bất kể loại).

- **Advantages:** Tránh God Table vì Header tối giản, không chứa cột domain-specific nào — mỗi Detail vẫn sở hữu schema riêng phù hợp domain của nó (giữ đúng nguyên tắc Write-owner theo domain đã áp dụng nhất quán từ Round 1). Cho phép xây 1 "Explainability Integrity Enforcement Service" tập trung (đã đề xuất ở GAP-07) hoạt động ở tầng Header — service chỉ cần biết "có Header nào không có Detail tương ứng" để phát hiện vi phạm, không cần hiểu logic nghiệp vụ của từng Detail.
- **Disadvantages:** Vẫn phải xác định quan hệ Header↔Detail (polymorphic association) — đây là loại quan hệ DB truyền thống khó enforce bằng FK thuần (không thể có 1 FK trỏ tới "1 trong N bảng khác nhau" tuỳ giá trị `decision_type`) — chính vấn đề mà `trace_link` hiện tại đang gặp phải một phần (đã ghi nhận ở GAP-04: trace_link không có FK/CHECK enforce). Thêm 1 lớp gián tiếp (Header) có thể làm truy vấn "xem toàn bộ lịch sử quyết định của 1 KnowledgeNode" phải join qua 2 tầng thay vì 1.
- **Domain Impact:** Header là 1 khái niệm cross-cutting, không thuộc domain nghiệp vụ nào cụ thể (giống `trace_link` hiện tại) — ít rủi ro hơn so với 3.2 vì không domain nào phải "cho mượn" cột của mình vào 1 bảng chung; Detail vẫn thuộc đúng domain như hiện tại.
- **Persistence Impact:** Thêm 1 write path phụ mỗi khi 1 Detail được tạo (phải ghi cả Header và Detail) — đây là chi phí trực tiếp đổi lấy khả năng enforcement tập trung; nếu không đặt trong 1 transaction, lại tái tạo đúng vấn đề GAP-07 ở quy mô lớn hơn.
- **Explainability Impact:** Cao nhất trong toàn bộ phân tích Round này — đây là phương án duy nhất giải quyết đồng thời GAP-01, GAP-02 *và* cải thiện GAP-07 (enforcement tập trung) trong 1 cơ chế, đúng yêu cầu Special Requirement.
- **Long-Term Scalability Impact:** Tốt — mọi capability AI tương lai (Discovery, capability chưa đặt tên) chỉ cần "đăng ký" 1 `decision_type` mới và tuân thủ ghi Header, không cần thiết kế lại enforcement mỗi lần thêm capability. Rủi ro dài hạn duy nhất: nếu Header trở thành điểm nghẽn ghi (write hotspot) khi hệ thống có nhiều Learner đồng thời — Teaching có tần suất ghi cao nhất nên sẽ là nguồn tải chính lên Header.

### 3.4 Kết luận của Special Requirement (không phải quyết định)

Cơ chế chung **có thể** tránh God Object/God Table — nhưng chỉ nếu nó được thiết kế như 1 lớp Header tối giản đứng *trên* các Detail hiện có/tương lai (composition), không phải 1 bảng *thay thế* các Detail (hợp nhất). Bản chất rủi ro God Object không nằm ở việc "có 1 cơ chế chung" mà nằm ở việc "1 bảng chứa mọi dữ liệu domain-specific" — 2 việc khác nhau, dễ nhầm lẫn.

---

## 4. Lead Architect Recommendation

> Đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect cân nhắc ở vòng Domain Architecture tiếp theo — **không phải quyết định đã chốt**, theo đúng giới hạn Round 3.6 và mô hình governance đã thiết lập (Claude không tự quyết định).

- **Gap #1 (Teaching):** Khuyến nghị ưu tiên xem xét **Approach 1D (Shared Mechanism, mục 3.3)** trước khi quyết định riêng 1A/1B/1C cho Teaching — vì Teaching là capability tần suất cao nhất, nếu chọn 1A (entity riêng) trước khi có quyết định về Shared Mechanism, rủi ro phải migrate lại khi Shared Mechanism được xây sau. Nếu Founder quyết định **chưa** đầu tư Shared Mechanism ở giai đoạn này, Approach 1C (ephemeral-by-design + Decision Log xác nhận) là phương án rẻ nhất để không chặn Round 4 — nhưng đi kèm 1 điều kiện: cần làm rõ trước liệu Teaching có thuộc phạm vi bắt buộc của DECISION-027 hay không (hiện DECISION-027 không liệt kê Teaching tường minh — đây là một mơ hồ cần đóng độc lập với việc chọn approach).
- **Gap #2 (Local Expansion):** Khuyến nghị ưu tiên xem xét **Approach 2C (mở rộng `expansion_record`)** trong số các approach riêng cho Local Expansion — chi phí thấp nhất, tận dụng tối đa thiết kế đã locked, và tự nhiên tương thích nếu Shared Mechanism (3.3) được chọn sau (vì `expansion_record` đã mở rộng sẽ trở thành 1 Detail tốt dưới Header chung). Approach 2A (thêm cột vào `knowledge_edge`) nên tránh vì trộn lẫn trách nhiệm structural/audit.
- **Thứ tự quyết định đề xuất:** chốt Special Requirement (mục 3) **trước** khi chốt riêng Gap #1/Gap #2 — vì lựa chọn Shared Mechanism hay không ảnh hưởng ngược lại approach nào hợp lý cho từng gap riêng (đặc biệt Gap #1, nơi cả 4 approach phụ thuộc lẫn nhau nhiều hơn Gap #2).
- **Điều không khuyến nghị trong mọi trường hợp:** Approach 3.2 (1 bảng `ai_decision` hợp nhất, không tách Header/Detail) — rủi ro God Table đã phân tích ở mục 3.2 áp dụng bất kể chọn giải pháp nào cho Gap #1/#2 riêng lẻ.

## Liên kết ngược

[EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md), [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md).
