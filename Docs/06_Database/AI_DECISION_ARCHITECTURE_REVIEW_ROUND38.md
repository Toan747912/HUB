# AI Decision Architecture Review — Round 3.8

> Phạm vi: phân tích kiến trúc dựa trên [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) và [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md). Không tạo entity/bảng/SQL/API/Frontend. Không chốt quyết định — kể cả ở mục Final Section.

---

## 1. Missing Decision Types?

**Có 2 ứng viên chưa được liệt kê trong 9 Decision Type hiện tại — không tự thêm vào Taxonomy chính thức ở Round này, chỉ flag:**

- **Roadmap Critique / Structural Review** (DECISION-006, nhắc tới ở [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md) mục "2 lựa chọn — B") — đây là 1 cơ chế AI đánh giá *cấu trúc* Roadmap (khác với D6 — Roadmap Mapping, vốn chỉ chọn KnowledgeNode cho 1 RoadmapNode cụ thể). Roadmap Critique có vẻ cũng thoả C1-C4 (chọn cảnh báo cấu trúc nào để đưa ra, ảnh hưởng Roadmap, gán theo thời điểm review, có lý do) nhưng **không được đặt tên rõ là 1 Capability độc lập** trong danh sách 7 Capability của Round 3.7/3.8 — có thể đã bị gộp ngầm vào "Roadmap Mapping" hoặc bị bỏ sót vì nó cũ hơn (DECISION-006, trước cả Domain Modeling Phase).
- **Goal Clarification / Competency Probing** (2 capability con của Discovery Engine theo [AI/DiscoveryEngine/README.md](../../AI/DiscoveryEngine/README.md), cùng với Continuous Discovery) — Round 3.7/3.8 gộp cả 3 vào D7 "Self-Assessment Mismatch Detection", nhưng Goal Clarification (làm rõ Goal ban đầu của Learner) có thể là 1 decision shape khác hẳn (gần giống Generative/Selection hơn là Detection-Classification) — chưa rõ liệu việc gộp này có làm mất đi 1 decision type riêng hay không.

**Kết luận mục 1:** Taxonomy hiện tại (9 Decision Type) là **đầy đủ ở mức Capability được giao** (đúng 7 Capability theo đề bài Round 3.7/3.8), nhưng **chưa chắc đầy đủ ở mức sub-capability** — 2 ứng viên trên cần Founder/Lead Architect xác nhận có nên tách ra hay tiếp tục gộp.

---

## 2. Overlapping Decision Types?

- **D1 (Teaching) và D9 (Stuck Detection) có khả năng chồng lấp tại thời điểm chạy:** cả 2 đều quyết định "nên làm gì tiếp theo với Learner trong 1 SubSession" — Teaching chọn nội dung kế tiếp trong luồng bình thường; Stuck Detection chọn can thiệp khi luồng bình thường bị nghẽn. Câu hỏi chưa có câu trả lời: khi Learner "stuck", AI có dừng decision D1 lại và chỉ chạy D9, hay D9 là 1 input bổ sung cho D1 (vd: D1 vẫn chọn nội dung, nhưng "nội dung" lúc này là 1 hint)? Nếu là input bổ sung, D9 thực ra không nên là decision riêng — nó là 1 input của D1. Round này **không tự quyết định cách gộp**, chỉ flag overlap.
- **D3 (Recommendation) và D7 (Discovery) chồng lấp về mục đích, không chồng lấp về cơ chế:** cả 2 đều "phát hiện điều gì đó cần chú ý và đề xuất hành động", nhưng D7 chỉ phát hiện (không đề xuất hành động cụ thể), D3 tổng hợp phát hiện của D7 (và nguồn khác) thành đề xuất. Đây **không phải overlap có hại** — là 1 pipeline 2 bước hợp lý (Discovery detect → Recommendation propose), nhưng cần ghi nhận rõ ràng để tránh sau này có người đề xuất "gộp Discovery vào Recommendation" mà không nhận ra 2 decision shape khác nhau (Detection-Classification vs Synthesis).
- **D4/D5 (Knowledge Expansion Deep vs Local) đã được Round 3.6 mục 4.1 xác nhận là cùng 1 decision shape (Generative), chỉ khác governance tier** — không phải overlap thật, là 1 decision type với 2 tier, đã ghi nhận, không lặp lại phân tích ở đây.

---

## 3. Capability Boundary Problems?

**Phát hiện chính của Round này — đã có dấu hiệu từ Round 3.7 mục 4.2, nay được xác nhận rõ qua Matrix:**

`Teaching Engine` là **Capability Owner của cả D1, D8, D9** (xem [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md)) — 3 Decision Type có:
- Decision shape khác nhau (Selection / Selection / Detection-Classification).
- Criticality khác nhau (B / C / B-với-rủi-ro-leo-A).
- Persistence requirement khác nhau (Recommended / Do Not Persist / Recommended).

Một Capability ôm 3 decision có hồ sơ rủi ro khác nhau hoàn toàn **không tự nó là vấn đề** (1 Engine có thể có nhiều decision con), nhưng tạo ra rủi ro cụ thể: bất kỳ thiết kế persistence/explainability nào "cho Teaching Engine" mà không tách rõ 3 decision con sẽ có 1 trong 2 lỗi — (a) áp persistence rule của decision nghiêm trọng nhất (D9) lên cả 3, gây overhead không cần thiết cho D8; hoặc (b) áp rule của decision nhẹ nhất (D8) lên cả 3, bỏ sót rủi ro thật của D9. **Đây là lý do kỹ thuật trực tiếp khiến GAP-01 (Teaching) ở Round 3.5 khó đóng bằng 1 giải pháp duy nhất** — gap đó thực ra là 3 gap có hình dạng khác nhau núp dưới 1 tên.

**Khuyến nghị (không chốt):** trước khi thiết kế bất kỳ persistence mechanism nào "cho Teaching Engine", nên tách rõ ở tầng AI Architecture xem D1/D8/D9 có nên tiếp tục là 1 Capability hay tách thành Capability con (sub-capability) có boundary riêng — đã từng có tiền lệ tương tự với "Teach" (DECISION-020, Teach Composite Capability gồm 5 sub-capability: Explain/Simplify/Guide/Review/Transfer Knowledge) — Teaching Engine có thể cần cùng kiểu xử lý "composite" này.

---

## 4. Domain Boundary Problems?

- **Mentor Interaction Domain sở hữu D1, D8, D9 — cùng vấn đề như mục 3 nhưng ở tầng Domain.** CoreDomainMap hiện chỉ liệt kê "MentorSession, Learning Mode context" làm trách nhiệm của Domain này (mục 1, dòng 7) — không liệt kê tường minh "Teaching Content Selection" hay "Stuck Detection" là thuộc Domain này, dù qua suy luận taxonomy (mục 3.1/3.7, [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md)) cả 3 đều được gán vào đây. **Domain Ownership của D1 đặc biệt đáng chú ý:** Teaching Content Selection *đọc* dữ liệu từ Goal & Roadmap (`roadmap_node_knowledge_node`) và Knowledge Graph (`knowledge_node_mastery`, `knowledge_edge`) nhiều hơn nó đọc từ Mentor Interaction Domain (`SubSession` chỉ cho context, không cho nội dung quyết định) — việc gán D1 vào Mentor Interaction Domain dựa trên "decision diễn ra ở đâu" (đúng theo Round 3.7) chứ không phải "decision dùng dữ liệu của domain nào nhiều nhất" — 2 tiêu chí gán Domain Ownership này **có thể cho ra câu trả lời khác nhau**, và Round này chỉ dùng tiêu chí thứ nhất (nơi decision diễn ra) theo đúng cách CoreDomainMap đã làm cho các domain khác (vd: Assessment "diễn ra" trong Assessment Domain dù đọc Evidence từ domain khác).
- **Discovery Domain (D7) chưa rõ ranh giới với Assessment Domain** ở khía cạnh: cả 2 đều so sánh observation với 1 baseline (self-report vs hệ thống) để ra verdict — đã nêu ở Round 3.7 mục 4.2, không phát hiện mới, chỉ nhắc lại vì vẫn chưa đóng.

---

## 5. Risks if Persistence Starts Now?

Nếu Round 4 (SQL Generation/Persistence implementation) bắt đầu xử lý các Decision Type này **ngay sau Round 3.8, trước khi mục 1-4 ở trên được Founder làm rõ**, rủi ro cụ thể:

1. **Rủi ro rework cho D1/D8/D9 (Teaching/Mentor Interaction):** nếu persistence được thiết kế riêng cho "Teaching" mà không biết D9 (Stuck Detection) có thể leo Criticality A tuỳ cơ chế intervention (mục 3 đã nêu), và mục 3 Capability Boundary chưa đóng — thiết kế persistence "xong" cho Teaching có thể phải sửa lại khi D9 được làm rõ.
2. **Rủi ro tạo persistence không tương xứng Criticality cho D5 (Local Expansion):** đã có sẵn yêu cầu Persist Required (locked, DECISION-027) dù Criticality chỉ C — nếu team build nhanh theo đúng "Required" mà không hiểu đây là explainability-driven (không phải impact-driven), có thể vô tình đầu tư engineering effort (vd: làm 1 entity nặng, đầy đủ approval flow như D4) không tương xứng — lãng phí so với 1 cơ chế nhẹ hơn nhiều cũng đủ đáp ứng yêu cầu locked.
3. **Rủi ro cho D6 (Roadmap Mapping) và D7 (Discovery):** cả 2 đang ở "Persist Recommended", không "Required" — nếu Round 4 hiểu nhầm "Recommended" thành "có thể bỏ qua hoàn toàn", 2 gap đã biết từ Round 3.5 (GAP-05) sẽ tiếp tục tồn tại sau khi Database Round 4 hoàn thành, trong khi đáng ra đây là cơ hội cuối dễ đóng nhất (trước khi `roadmap_node_knowledge_node`/`discovery_session` có dữ liệu thật, sửa schema dễ hơn nhiều so với sau khi đã có dữ liệu production).
4. **Rủi ro nhân rộng anti-pattern nếu chọn xây riêng cho từng Decision Type mà không chờ quyết định Shared Mechanism (Round 3.6 mục 3):** nếu Round 4 bắt đầu build persistence riêng cho D1 trước khi biết D1 có nên dùng Header/Detail pattern chung với D3/D4/D6 hay không, có 9 decision type (không phải 4 như ước lượng ban đầu Round 3.6) đang chờ — xây riêng từng cái trước khi quyết định Shared Mechanism có rủi ro tạo 5-6 cơ chế rời rạc cùng giải quyết 1 vấn đề, đúng kiểu "entity sprawl" mà Round 3.6 mục 3.2 đã cảnh báo.
5. **Rủi ro thấp/không có cho D2, D4 (đã locked, đã implement)** — 2 decision này an toàn để Round 4 tiếp tục, không bị ảnh hưởng bởi các điểm mở của Round 3.8.

---

## Final Section — Lead Architect Recommendation

### Có nên tạo DECISION-048 "All AI Decisions Must Be Explainable"?

**Khuyến nghị: YES — nhưng với phạm vi được làm rõ, không phải mở rộng mù mờ.**

**Lý do ủng hộ:**

- Mục 5 (Explainability Requirement, [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md)) cho thấy 5/9 Decision Type (D1, D6, D7, D8, D9) hiện **không** nằm trong phạm vi tường minh của DECISION-027, dù tất cả đều thoả đủ 4 điều kiện AI Decision (mục 1, cùng tài liệu) — về mặt logic kiến trúc, **không có lý do nào đã được ghi nhận** để 5 decision này được miễn trừ yêu cầu explainability mà 4 decision còn lại phải tuân theo. Sự khác biệt hiện tại là *lịch sử tích lũy* (DECISION-027 viết tại Round 4, trước khi taxonomy đầy đủ tồn tại), không phải *quyết định kiến trúc có chủ đích*.
- Hạ tầng cần thiết (`TraceLink`, DECISION-038) đã tồn tại và được thiết kế tổng quát — "không thuộc domain nghiệp vụ nào, là cross-cutting layer" — nghĩa là mở rộng phạm vi explainability không đòi hỏi thiết kế lại hạ tầng, chỉ đòi hỏi áp dụng hạ tầng đã có cho nhiều decision hơn.
- DECISION-048 không tự nó persist gì — nó chỉ là **nguyên tắc** (giống DECISION-027) — tách "phải explainable" (nguyên tắc) ra khỏi "persist bằng cách nào" (Round 3.6 vẫn cần tiếp tục phân tích riêng) giữ đúng kỷ luật đã có trong toàn bộ Decision Log (mỗi Decision giải quyết đúng 1 câu hỏi, không trộn).

**Lý do cần thận trọng (không phải lý do để chọn NO, mà là điều kiện áp dụng):**

- DECISION-048 **không nên** lặp lại nguyên văn DECISION-027 với phạm vi mở rộng đơn giản — vì mục 3, 4 ở trên cho thấy 3/5 decision còn thiếu (D1, D8, D9) có vấn đề Capability/Domain Boundary **chưa đóng**. Nếu DECISION-048 được viết và locked trước khi boundary đó rõ, sẽ tạo ra 1 nguyên tắc đúng nhưng không thể thực thi nhất quán (vì không rõ "Teaching" ở đây là D1 hay cả D1+D8+D9 gộp).
- Khuyến nghị cụ thể về **trình tự**, không phải về **nội dung quyết định**: DECISION-048 nên được viết **sau khi** Capability Boundary Problem (mục 3) được Founder/Lead Architect xác nhận cách xử lý — nếu không, DECISION-048 sẽ phải sửa lại (hoặc cần 1 DECISION phụ) ngay sau khi viết.

**Không khuyến nghị NO** vì lý do "chưa cần" — taxonomy mục 1 (định nghĩa AI Decision) đã tồn tại độc lập với việc có DECISION-048 hay không; sự bất nhất hiện tại giữa D2/D3/D4/D5 (locked) và D1/D6/D7/D8/D9 (chưa locked) sẽ tiếp tục là 1 nguồn nhầm lẫn cho mọi Round tương lai nếu không được giải quyết bằng 1 nguyên tắc chung, dù là ở Round 3.9 hay muộn hơn.

**Không chốt quyết định này** — đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect quyết định ở vòng tiếp theo, đúng giới hạn Round 3.8 và mô hình governance đã thiết lập.

## Liên kết ngược

[AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW.md](AI_DECISION_ARCHITECTURE_REVIEW.md) (Round 3.7), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-020-Teach-Composite-Capability](../11_Decisions/DECISION-020-Teach-Composite-Capability.md), [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md), [AI/DiscoveryEngine/README.md](../../AI/DiscoveryEngine/README.md).
