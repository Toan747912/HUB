# AI Decision Architecture Review (Round 3.7)

> Phạm vi: **chỉ phân tích, không tạo entity/bảng/SQL, không chốt quyết định.** Mục tiêu: trước khi chọn persistence model (Round 3.6 đã phân tích các phương án nhưng chưa biết áp dụng cho đúng phạm vi nào), cần định nghĩa rõ **"AI Decision"** là gì trong AI Mentor Platform, và xác định từng Capability có thực sự sinh ra 1 AI Decision hay không. Đây là round nền (foundational), đứng *trước* Round 3.6 về thứ tự logic dù được thực hiện sau — Round 3.6 sẽ cần đọc lại dưới ánh sáng của kết quả Round này.

---

## 1. Decision Taxonomy

### 1.1 Định nghĩa "AI Decision"

Một hành động của AI được coi là **AI Decision** nếu thoả **cả 4** điều kiện sau (không chỉ 1):

| Điều kiện | Mô tả | Phân biệt với |
|---|---|---|
| **C1 — Judgment among alternatives** | AI phải chọn/đánh giá giữa nhiều khả năng hợp lệ khác nhau (không phải 1 phép tính xác định duy nhất có thể, không phải CRUD thuần) | Phép tính tổng/đếm/format dữ liệu — không có "alternative" nào bị loại bỏ |
| **C2 — Tác động tới state Learner hoặc cấu trúc tri thức dùng chung** | Kết quả ảnh hưởng tới Mastery, Roadmap, Knowledge Graph, hoặc trải nghiệm học tập trực tiếp của Learner | Logging/metrics nội bộ không ảnh hưởng tới Learner hoặc domain model |
| **C3 — Có thể gán cho 1 actor + 1 thời điểm cụ thể** | Quyết định xảy ra tại 1 điểm cụ thể trong thời gian, gán được `created_by_actor_type = ai_service` | Cấu hình tĩnh (vd: schema mặc định) không gán được thời điểm "quyết định" |
| **C4 — Có thể bị hỏi "vì sao chọn cái này mà không chọn cái khác"** | Câu hỏi này có ý nghĩa và có câu trả lời khác `null`/`không xác định` | Hành vi tất định 100% (deterministic, không có nhánh) — hỏi "vì sao" chỉ trả về "vì công thức luôn ra vậy", không phải 1 lý do mang tính lựa chọn |

Một hành động chỉ cần **thiếu 1 trong 4** điều kiện thì **không** được phân loại là AI Decision (dù vẫn có thể là 1 hành động AI quan trọng cần ghi log vì lý do khác — vd: observability, debugging).

### 1.2 Trục phân loại (dùng để so sánh xuyên Capability ở mục 5)

| Trục | Giá trị khả dĩ |
|---|---|
| **Decision Shape** | `Selection` (chọn 1 trong nhiều phương án đã biết) / `Detection-Classification` (đánh giá 1 điều kiện có đúng hay không) / `Synthesis` (tổng hợp nhiều tín hiệu rời rạc thành 1 output) / `Generative` (tạo ra cấu trúc/nội dung mới chưa từng tồn tại) |
| **Governance Tier** | `Autonomous` (không cần phê duyệt) / `Approval-Required` (cần `ApprovalRecord`/Learner xác nhận trước khi có hiệu lực) / `Proposal-Only` (AI không bao giờ tự thực thi, luôn giao Capability khác hoặc Learner quyết) |
| **Visibility to Learner** | `Shown` (lý do hiển thị trực tiếp) / `Internal-Only` (lý do tồn tại nhưng không hiển thị) / `N/A` (chưa xác định vì decision chưa tồn tại output cụ thể) |
| **Persistence Status (hiện tại)** | `Persisted-with-reasoning` / `Persisted-without-reasoning` / `Not-persisted` / `Schema-provisioned-not-built` |

---

## 2. Capability-by-Capability Determination

### 2.1 Teaching

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ.** Thoả cả 4 điều kiện: C1 — chọn 1 KnowledgeNode/nội dung cụ thể trong số nhiều KnowledgeNode hợp lệ theo Roadmap Node đang active; C2 — ảnh hưởng trực tiếp trải nghiệm học (Learner học gì tiếp theo); C3 — gán được cho 1 lượt chọn trong 1 SubSession cụ thể; C4 — "vì sao dạy X trước Y" có câu trả lời có ý nghĩa (prerequisite còn thiếu / Learner yêu cầu / retry sau sai). |
| 2a | Decision là gì? | Chọn KnowledgeNode/nội dung cụ thể để dạy tiếp theo trong 1 SubSession đang active, theo Learning Mode hiện tại. |
| 2b | Inputs | `SubSession.roadmap_node_id` → `roadmap_node_knowledge_node` (KnowledgeNode nào RoadmapNode yêu cầu) → `knowledge_node_mastery` (mức Learner đã đạt) → `knowledge_edge` (thứ tự prerequisite) → Learning Mode đang active. |
| 2c | Outputs | KnowledgeNode/nội dung được chọn để trình bày cho Learner trong lượt tương tác này. **Hiện tại không persist** (xem GAP-01, [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md)). |
| 2d | Phải explainable gì? | Tối thiểu: KnowledgeNode nào được chọn + lý do thuộc 1 trong các loại đã biết (prerequisite gap / Learner request / retry) + thời điểm + SubSession context. **Không nhất thiết cần** giải thích toàn bộ quá trình suy luận nội bộ của model — chỉ cần lý do ở mức "category" đủ để audit. |

### 2.2 Assessment

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ.** C1 — verdict/mastery_delta không phải phép tính tất định đơn giản (đòi hỏi đánh giá chất lượng Evidence); C2 — ghi thẳng vào `KnowledgeNodeMastery`; C3 — gán cho 1 `assessment_result` cụ thể; C4 — "vì sao mastery tăng/giảm" có câu trả lời (`reasoning` field). |
| 2a | Decision là gì? | Đánh giá `Evidence`(+`EvidenceLink`) liên quan tới 1 KnowledgeNode, sinh `verdict`/`mastery_delta`, cập nhật `KnowledgeNodeMastery`. |
| 2b | Inputs | `Evidence` + `EvidenceLink` (stance/weight/target dimension), `KnowledgeNodeMastery` hiện tại (trạng thái trước đánh giá). |
| 2c | Outputs | `AssessmentResult` (8 trường theo DECISION-030, gồm `reasoning`), `KnowledgeNodeMastery` được cập nhật. |
| 2d | Phải explainable gì? | Đã chốt ở DECISION-027: phải truy vết được tới `Evidence`/`EvidenceLink` cụ thể (hiện một phần phụ thuộc Application Layer — GAP-04), không chỉ text `reasoning` tự do. |

### 2.3 Recommendation

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ** (về bản chất capability, dù chưa build) — đã được Founder/Lead Architect xác nhận là Capability độc lập ([DECISION-019](../11_Decisions/DECISION-019-Recommendation-Engine.md)). C1 — tổng hợp nhiều tín hiệu rời rạc, không phải 1 phép cộng đơn giản; C2 — ảnh hưởng định hướng học tiếp theo của Learner; C3 — gán theo 1 lượt tổng hợp cụ thể; C4 — "vì sao gợi ý cái này" có câu trả lời (`traced_to[]`). |
| 2a | Decision là gì? | Tổng hợp các tín hiệu rời rạc (Knowledge Regression, SelfAssessmentMismatch, dependency gap, pause signal) thành 1 đề xuất hành động cụ thể cho Learner. |
| 2b | Inputs | `knowledge_node_mastery` + `assessment_result` + `evidence_link` (regression); `roadmap_node_knowledge_node` + `knowledge_node_mastery` (dependency gap — sẵn sàng từ Round 3); `learning_session`/`learning_session_transition` (pause — sẵn sàng từ Round 1); `discovery_session` (self-assessment mismatch — **chưa sẵn sàng**, xem mục 2.6). |
| 2c | Outputs | `RecommendationProposal` + `traced_to[]` — **chưa tồn tại bảng**, nhưng `trace_link.source_type` đã có placeholder `'recommendation_proposal'` (provisioned ahead). |
| 2d | Phải explainable gì? | Theo DECISION-027 (đã liệt kê tường minh): bắt buộc `traced_to[]` — không cho phép tồn tại 1 RecommendationProposal nào không trỏ về ít nhất 1 nguồn tín hiệu cụ thể. |

### 2.4 Knowledge Expansion — Deep/Structural

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ.** C1 — chọn node/cạnh con nào để thêm trong số nhiều khả năng mở rộng hợp lệ (Generative); C2 — thay đổi cấu trúc Knowledge Graph dùng chung (ảnh hưởng tới mọi Learner dùng chung node đó, không riêng 1 Learner); C3 — gán cho 1 `expansion_record`; C4 — `expansion_reason` bắt buộc trả lời "vì sao mở rộng node này". |
| 2a | Decision là gì? | Mở rộng 1 `KnowledgeNode` bằng node/cạnh con mới ở quy mô cấu trúc, khi phát hiện nhu cầu (vd: Roadmap Node đang active cần độ sâu kiến thức lớn hơn hiện có). |
| 2b | Inputs | `knowledge_node` hiện tại, `knowledge_edge` hiện có (tránh trùng lặp), ngữ cảnh RoadmapNode đang active. |
| 2c | Outputs | `knowledge_edge` mới (1 hoặc nhiều) + `expansion_record`. |
| 2d | Phải explainable gì? | `expansion_reason` **bắt buộc hiển thị cho Learner** (DECISION-023) — đây là decision duy nhất trong toàn hệ thống có yêu cầu hiển thị explainability ra ngoài, không chỉ nội bộ. |

### 2.5 Knowledge Expansion — Local

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ.** Cùng bản chất quyết định với 2.4 (cùng decision shape — Generative) — chỉ khác về governance tier (Autonomous, không cần approval) và visibility (internal-only thay vì shown). Việc *quy mô nhỏ* không làm mất tính chất "decision" — vẫn thoả đủ C1-C4. |
| 2a | Decision là gì? | Mở rộng `KnowledgeNode` ở quy mô nhỏ, không qua approval. |
| 2b | Inputs | Tương tự 2.4 — `knowledge_node` + `knowledge_edge` hiện có. |
| 2c | Outputs | `knowledge_edge` mới. Không có `expansion_record` (theo thiết kế hiện tại). |
| 2d | Phải explainable gì? | Theo DECISION-027: **truy vết được nội bộ, không bắt buộc hiển thị** cho Learner — nhưng vẫn phải tồn tại 1 lý do gắn được với decision này (hiện chưa có nơi lưu — GAP-02). |

### 2.6 Discovery

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ**, dù cơ chế cụ thể chưa chốt (Open Question #5). C1 — đánh giá "self-assessment của Learner và Evidence quan sát được có đủ mâu thuẫn để coi là Mismatch hay không" là 1 judgment call có ngưỡng, không phải so sánh bằng tuyệt đối; C2 — `SelfAssessmentMismatch` ảnh hưởng trực tiếp tới Assessment + Recommendation phía sau; C3 — gán cho 1 `DiscoverySession` cụ thể; C4 — "vì sao coi đây là mismatch" có câu trả lời có ý nghĩa (vd: self-rated "hiểu rõ" nhưng Evidence/Assessment liên tục cho verdict thấp). |
| 2a | Decision là gì? | Phát hiện (detect/classify) liệu có tồn tại sai lệch đáng kể giữa tự đánh giá của Learner và năng lực thực tế quan sát qua Evidence/Assessment — sinh `SelfAssessmentMismatch` nếu có. |
| 2b | Inputs | Self-assessment input từ Learner (nguồn cụ thể chưa chốt — có thể qua Goal Clarification/Competency Probing), `Evidence`/`AssessmentResult` quan sát được cho cùng phạm vi KnowledgeNode/Goal. |
| 2c | Outputs | `DiscoverySession` (+ `SelfAssessmentMismatch` 0..n trong cùng Aggregate). |
| 2d | Phải explainable gì? | DECISION-027 đã gọi tên `DiscoverySession` như 1 nguồn truy vết hợp lệ cho Recommendation phát sinh từ Mismatch — ngụ ý Discovery's output phải tự nó explainable (vì sao đây là Mismatch) trước khi có thể làm nguồn truy vết cho capability khác. Đây là điểm **chưa từng được nêu tường minh** trước Round này — DECISION-027 dùng `DiscoverySession` như điểm đến của truy vết (traced_to), nhưng chưa yêu cầu rõ Discovery tự giải thích quyết định của chính nó. |

### 2.7 Roadmap Mapping

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ.** C1 — chọn KnowledgeNode nào trong số nhiều KnowledgeNode liên quan là "thực sự cần" cho 1 RoadmapNode cụ thể (không phải mọi KnowledgeNode liên quan đều được gắn); C2 — ảnh hưởng cấu trúc Roadmap cá nhân hoá của Learner; C3 — gán cho 1 lượt xây/mở rộng RoadmapNode cụ thể; C4 — "vì sao RoadmapNode X cần KnowledgeNode Y" có câu trả lời có ý nghĩa (vd: Y là dependency trực tiếp được suy luận từ nội dung công việc của X). |
| 2a | Decision là gì? | Đề xuất/tạo liên kết Dependency Edge giữa 1 `RoadmapNode` và 1 `KnowledgeNode` khi xây/mở rộng Roadmap. |
| 2b | Inputs | `roadmap_node` đang xây/mở rộng, `knowledge_node` liên quan, có thể `knowledge_edge` (suy luận chuỗi prerequisite). |
| 2c | Outputs | 1 dòng `roadmap_node_knowledge_node`; nên (không bắt buộc về schema) kèm `approval_record` theo quy trình Roadmap Governance. |
| 2d | Phải explainable gì? | Hiện **chưa có yêu cầu tường minh nào trong DECISION-027** (DECISION-027 chỉ liệt kê Mastery/Recommendation/Knowledge Expansion — không liệt kê Roadmap Mapping) — nhưng theo cùng logic taxonomy mục 1.1, decision này thoả đủ C1-C4 nên về *nguyên tắc* nên có cùng yêu cầu explainability tối thiểu (vì sao cặp dependency cụ thể này được thêm). Đây là 1 khoảng trống cần Founder làm rõ — không tự suy diễn DECISION-027 áp dụng hay không. |

### 2.8 Mentor Interaction

| # | Câu hỏi | Trả lời |
|---|---|---|
| 1 | Có sinh ra AI Decision? | **CÓ, nhưng phạm vi chưa rõ ranh giới với Teaching** — đây là phát hiện quan trọng của Round này, không tự giải quyết. Domain "Mentor Interaction" sở hữu `MentorSession` + "Learning Mode context" + sự kiện `MentorSessionModeChanged`; TeachingEngine README gộp 3 capability (Teaching, Socratic Guidance, Stuck Detection & Support) vào cùng 1 Engine nhưng CoreDomainMap lại map Engine này vào Domain "Mentor Interaction" (không phải 1 Domain "Teaching" riêng). Tách 2 loại judgment khác nhau trong phạm vi này: (a) **Learning Mode selection/switching** — chọn 1 trong 4 Learning Mode (A-D) cho 1 MentorSession, thoả đủ C1-C4; (b) **Stuck Detection trigger + intervention tier** — đánh giá Learner có "stuck" hay không và chọn mức hỗ trợ (hint ladder vs direct fix) — cơ chế chưa chốt (Open Question #6, TeachingEngine README) nhưng về bản chất là Detection-Classification + Selection, cũng thoả C1-C4. |
| 2a | Decision là gì? | (a) Chọn/đổi Learning Mode active cho 1 `MentorSession`. (b) Phát hiện Learner bị "stuck" + chọn mức can thiệp. |
| 2b | Inputs | (a) Tín hiệu từ tương tác hiện tại trong `MentorSession` (chưa chốt cụ thể tín hiệu nào). (b) Lịch sử phản hồi/Evidence gần nhất trong cùng `SubSession`/`MentorSession` (chưa chốt ngưỡng — Open Question #11, kế thừa Gap 4). |
| 2c | Outputs | (a) `MentorSessionModeChanged` event + Mode mới của `MentorSession`. (b) Hành động can thiệp cụ thể (hint ở cấp độ nào, hoặc fix trực tiếp) — chưa có entity/field nào ghi nhận lựa chọn này. |
| 2d | Phải explainable gì? | Chưa được DECISION-027 nhắc tới tường minh (giống Roadmap Mapping, mục 2.7). Tối thiểu nên trả lời được "vì sao đổi Mode lúc này" và "vì sao coi đây là stuck, vì sao chọn mức can thiệp này" — nhưng cả 2 câu hỏi này phụ thuộc cơ chế chưa chốt, nên **chưa thể định nghĩa explainability scope đầy đủ cho tới khi Open Question #6/#11 được đóng**. |

---

## 3. Decision Taxonomy Summary Table

| Capability | Decision Shape | Governance Tier | Visibility to Learner | Persistence Status (hiện tại) |
|---|---|---|---|---|
| Teaching | Selection | Autonomous | N/A (chưa có output persist để xét) | Not-persisted |
| Assessment | Detection-Classification + Selection (magnitude) | Autonomous (nhưng auto-ghi vào Mastery, không cần Learner phê duyệt) | Shown (reasoning hiển thị qua Mentor Interaction) | Persisted-with-reasoning |
| Recommendation | Synthesis | Proposal-Only | Shown (chính là nội dung gợi ý) | Schema-provisioned-not-built |
| Knowledge Expansion — Deep/Structural | Generative | Approval-Required (hiển thị + có governance riêng theo DECISION-023) | Shown | Persisted-with-reasoning (ở mức node; không ở mức edge cụ thể — GAP-03) |
| Knowledge Expansion — Local | Generative | Autonomous | Internal-Only | Not-persisted |
| Discovery | Detection-Classification | Autonomous (tự sinh `SelfAssessmentMismatch`, không cần phê duyệt để "được tồn tại" như 1 phát hiện) | N/A — chưa chốt có hiển thị trực tiếp cho Learner hay chỉ làm input nội bộ cho Recommendation | Persisted-without-reasoning (entity tồn tại, nhưng decision "vì sao là mismatch" chưa được yêu cầu lưu rõ — xem 2.6) |
| Roadmap Mapping | Selection | Approval-Required (về nguyên tắc — Roadmap Governance), nhưng **không enforce bằng schema** | N/A — chưa chốt | Persisted-without-reasoning (Type B Gap — GAP-05) |
| Mentor Interaction — Mode Selection | Selection | Autonomous | N/A — chưa chốt | Not-persisted |
| Mentor Interaction — Stuck Detection | Detection-Classification + Selection | Chưa chốt (có thể cần Approval nếu "direct fix" được chọn — liên quan Open Question hint-ladder-vs-direct-fix) | N/A — chưa chốt | Not-persisted (không có entity nào hiện hữu) |

---

## 4. Decision Boundaries

### 4.1 Ranh giới đã rõ (kế thừa từ CoreDomainMap, không phát sinh mới)

- **Assessment vs Evidence:** Evidence chỉ thu thập + phân loại bằng chứng thô, **không tự đưa ra Decision** (không thoả C1 — Evidence Engine không "chọn" gì, chỉ ghi nhận observation) → đúng, Evidence Engine bản thân **không** sinh AI Decision theo định nghĩa mục 1.1, dù dữ liệu nó tạo ra (`Evidence`/`EvidenceLink`) là input bắt buộc cho Assessment Decision.
- **Recommendation vs Roadmap Mapping / Teaching:** Recommendation chỉ tổng hợp tín hiệu thành đề xuất, không tự thực thi (DECISION-019) — khi đề xuất ngụ ý đổi cấu trúc Roadmap, quyền quyết định cuối cùng vẫn thuộc về Roadmap Mapping decision (qua Roadmap Governance), không phải Recommendation tự làm. Ranh giới này đã rõ, không cần làm rõ thêm.
- **Knowledge Expansion Deep/Structural vs Local:** Ranh giới về *governance tier* đã rõ (DECISION-023), nhưng ranh giới về *decision shape* là giống nhau (cùng Generative) — đáng chú ý vì điều này nghĩa là 2 nhánh này **nên được coi là 1 decision type với governance tier khác nhau**, không phải 2 decision type độc lập (liên quan trực tiếp tới Approach 2C của Round 3.6).

### 4.2 Ranh giới chưa rõ — phát hiện mới của Round này

- **Teaching vs Mentor Interaction (Mode Selection / Stuck Detection):** TeachingEngine README gộp "Teaching, Socratic Guidance, Stuck Detection & Support" làm 1 Engine, nhưng theo Domain Model, "Teaching" (chọn nội dung dạy) và "Mentor Interaction" (Mode/Stuck) là 2 decision khác nhau về input/output (mục 2.1 vs 2.8) dù chạy trong cùng 1 SubSession/MentorSession. **Chưa rõ liệu đây là 1 decision tổng hợp duy nhất** (AI chọn nội dung + Mode + đánh giá Stuck cùng lúc, như 1 hành động) **hay 3 decision tách biệt** xảy ra ở các thời điểm khác nhau trong cùng 1 tương tác. Ranh giới này ảnh hưởng trực tiếp tới việc liệu GAP-01 (Teaching) có nên được giải quyết cùng cơ chế với Mentor Interaction hay tách riêng.
- **Discovery vs Assessment:** Cả 2 đều là Detection-Classification dựa trên Evidence, nhưng Discovery so sánh với *self-assessment* (input từ Learner) còn Assessment so sánh với *kỳ vọng/mức mastery hiện tại* (input từ hệ thống). Về hình thức decision, 2 capability này có cấu trúc rất giống nhau (Detection + ngưỡng) — đáng để hỏi liệu Discovery có nên dùng lại cùng pattern với Assessment (vd: 1 "verdict" tương tự `AssessmentResult`) hay tiếp tục là 1 entity hoàn toàn khác hình dạng (`SelfAssessmentMismatch`). Không tự đề xuất gộp ở Round này — chỉ flag.
- **Roadmap Mapping vs Teaching:** Cả 2 đều "chọn KnowledgeNode liên quan tới 1 context cụ thể" (Roadmap Mapping chọn cho RoadmapNode, Teaching chọn cho SubSession) — khác mục đích (cấu trúc vs nội dung dạy ngay lúc đó) nhưng cùng input data shape (`roadmap_node_knowledge_node`, `knowledge_edge`). Ranh giới về *mục đích* đã rõ; ranh giới về *liệu có nên dùng chung 1 decision-recording mechanism* thì chưa — liên quan trực tiếp Special Requirement của Round 3.6.

---

## 5. Explainability Scope

### 5.1 Bảng tổng hợp "phải explainable gì" theo từng decision

| Decision | Explainability bắt buộc theo DECISION-027 (hiện tại) | Explainability nên có theo Taxonomy (mục 1.1) | Khoảng cách |
|---|---|---|---|
| Teaching | Không liệt kê tường minh | Category lý do (prerequisite/request/retry) + KnowledgeNode + thời điểm | DECISION-027 chưa phủ — cần Founder xác nhận phạm vi (đã nêu ở Round 3.6 mục 4) |
| Assessment | Có — truy vết tới Evidence/AssessmentResult bắt buộc | Khớp | Không có khoảng cách ở mức nguyên tắc; còn khoảng cách ở mức enforcement (GAP-04) |
| Recommendation | Có — `traced_to[]` bắt buộc | Khớp | Không có khoảng cách ở mức nguyên tắc; capability chưa build nên chưa kiểm chứng thực tế |
| Knowledge Expansion (cả 2 nhánh) | Có — kể cả Local (truy vết nội bộ, không cần hiển thị) | Khớp | Không có khoảng cách ở mức nguyên tắc; còn khoảng cách ở mức tồn tại cơ chế lưu (GAP-02, GAP-03) |
| Discovery | Không liệt kê tường minh là *nguồn phải tự explainable* (chỉ được dùng làm *điểm đến* của truy vết từ Recommendation) | Mismatch phải tự giải thích được "vì sao coi là mismatch" trước khi làm nguồn truy vết hợp lệ cho capability khác | Khoảng cách logic: dùng X làm nguồn truy vết mà không yêu cầu X tự explainable là 1 chuỗi truy vết không hoàn chỉnh |
| Roadmap Mapping | Không liệt kê | Lý do cặp dependency cụ thể | DECISION-027 chưa phủ |
| Mentor Interaction (Mode/Stuck) | Không liệt kê | Lý do đổi Mode / lý do coi là stuck + mức can thiệp | DECISION-027 chưa phủ, và cơ chế cốt lõi (ngưỡng Stuck) còn chưa chốt nên chưa thể định nghĩa đầy đủ |

### 5.2 Quan sát chính

DECISION-027 hiện liệt kê đúng 3 nhóm (Mastery, Recommendation, Knowledge Expansion) — sau khi rà soát đủ 7 Capability ở Round này, có **4 decision type khác** (Teaching, Discovery-as-source, Roadmap Mapping, Mentor Interaction) cũng thoả đủ 4 điều kiện AI Decision ở mục 1.1 nhưng **không nằm trong phạm vi tường minh của DECISION-027**. Đây không phải lỗi của DECISION-027 tại thời điểm nó được viết (Round 4) — DECISION-027 được viết trước khi taxonomy đầy đủ này tồn tại. Round này chỉ **nêu khoảng cách**, không tự mở rộng phạm vi DECISION-027 (việc đó là sửa 1 Decision đã Locked — ngoài quyền hạn của Round phân tích).

---

## 6. Cross-Capability Consistency Analysis

### 6.1 Tính nhất quán về hình thức (đã nhất quán)

- Mọi decision thoả mãn taxonomy mục 1.1 đều có cùng 4 thành phần hỏi được: input nào, output nào, ai/khi nào, vì sao — không có capability nào "đặc biệt" tới mức phải hỏi câu khác hẳn. Đây là tín hiệu tốt cho khả năng dùng 1 cơ chế chung (đã phân tích ở Round 3.6 mục 3) — *hình thức câu hỏi* nhất quán, dù *câu trả lời cụ thể* khác nhau theo domain.

### 6.2 Tính không nhất quán hiện tại (chưa giải quyết, chỉ ghi nhận)

- **Không nhất quán về Persistence Status:** 3/9 decision (Assessment, Knowledge Expansion Deep/Structural, một phần Discovery) đã persist; 6/9 chưa (Teaching, Knowledge Expansion Local, Recommendation [chưa build], Roadmap Mapping [persist nhưng thiếu lý do], Mentor Interaction Mode, Mentor Interaction Stuck). Không có quy luật rõ ràng giải thích *vì sao* nhóm này persist mà nhóm kia không — lịch sử cho thấy đây là kết quả tích lũy qua nhiều Round độc lập (Round 1-3 build Assessment/Expansion trước vì chúng nằm trên đường tới hoàn thiện Database Round 1-3), không phải 1 nguyên tắc thiết kế chủ đích.
- **Không nhất quán về phạm vi DECISION-027:** đã nêu ở mục 5.2 — nguyên tắc Explainability First được viết cho 3 nhóm tại 1 thời điểm cụ thể (Round 4), trước khi Discovery/Roadmap Mapping/Mentor Interaction được phân tích đầy đủ ở mức decision (chỉ tồn tại như Domain/Capability, chưa được nhìn qua lăng kính "đây có là AI Decision không"). Khoảng cách này có nguy cơ tạo cảm giác "Explainability chỉ áp dụng cho 3 nhóm được may đo riêng" nếu không được làm rõ.
- **Không nhất quán về ranh giới Engine vs Domain:** TeachingEngine gộp 3 capability nhưng Domain Model chia theo Mentor Interaction — đây là sự không khớp giữa lớp "AI Architecture" (Capability theo Engine) và lớp "Domain Architecture" (Capability theo Domain ghi dữ liệu), đã tồn tại từ trước Round này nhưng chỉ lộ rõ thành vấn đề khi cố gắng trả lời "Mentor Interaction có sinh AI Decision không" (mục 2.8) — không có cách trả lời sạch nếu không tách rõ 2 lớp kiến trúc này trước.

### 6.3 Ý nghĩa cho Round 3.6 (persistence model)

Kết quả Round 3.6 (Shared "AI Decision Record" mechanism, Header/Detail pattern) được phân tích **trước khi** có taxonomy đầy đủ này. Sau Round 3.7, phạm vi ứng viên cho "Header" không còn chỉ là 4 loại (Teaching, Recommendation, Expansion, Roadmap Mapping) như đề bài Round 3.6 nêu, mà ít nhất 9 decision instance trải trên 7 Capability (kể cả Discovery và 2 decision con của Mentor Interaction) — nếu chọn Shared Mechanism, phạm vi cần tính tới rộng hơn ước lượng ban đầu của Round 3.6.

---

## 7. Kết luận (không chốt)

Toàn bộ 7 Capability được yêu cầu rà soát đều **có** sinh AI Decision theo định nghĩa mục 1.1 — không có Capability nào trả lời "No" tuyệt đối ở Round này (kể cả Evidence Engine, dù không nằm trong 7 Capability được yêu cầu, được ghi nhận ở mục 4.1 là ví dụ "No" rõ ràng để đối chiếu). Khác biệt thực sự nằm ở **governance tier, visibility, và persistence status hiện tại** — không nằm ở việc có là Decision hay không.

**Việc cần Founder/ChatGPT Lead Architect làm rõ trước khi Round 3.6 (persistence model) được chốt:**
1. DECISION-027 có nên mở rộng phạm vi tường minh để phủ Teaching, Discovery-as-source, Roadmap Mapping, Mentor Interaction — hay giữ nguyên 3 nhóm hiện tại và coi 4 nhóm còn lại là "chưa đủ ưu tiên"?
2. Ranh giới Teaching vs Mentor Interaction (mục 4.2) cần được tách rõ ở tầng Domain Architecture trước khi thiết kế bất kỳ persistence mechanism nào cho Teaching — nếu không, rủi ro thiết kế 1 cơ chế cho "Teaching" rồi phát hiện Mentor Interaction cần chính cơ chế đó, dẫn tới rework.
3. Phạm vi ứng viên cho Shared Mechanism (Round 3.6 mục 3) cần được tái đánh giá với danh sách 9 decision instance đầy đủ của Round này, không chỉ 4 loại ban đầu.

## Liên kết ngược

[EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-019-Recommendation-Engine](../11_Decisions/DECISION-019-Recommendation-Engine.md), [AI/TeachingEngine/README.md](../../AI/TeachingEngine/README.md), [AI/DiscoveryEngine/README.md](../../AI/DiscoveryEngine/README.md).
