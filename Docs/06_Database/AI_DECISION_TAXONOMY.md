# AI Decision Taxonomy (Round 3.8)

> Phạm vi: **chỉ phân tích kiến trúc, không tạo entity/bảng/SQL/API/Frontend, không chốt quyết định.** Tổng hợp và chính thức hoá kết quả rời rạc của Round 3.5 ([EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md)), Round 3.6 ([EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md)), Round 3.7 ([AI_DECISION_ARCHITECTURE_REVIEW.md](AI_DECISION_ARCHITECTURE_REVIEW.md)) thành **1 taxonomy duy nhất, đầy đủ**. Đây là tài liệu tham chiếu chính thức cho mọi Round Database/Persistence tiếp theo liên quan tới AI Decision — không thay thế, chỉ tổng hợp lại có hệ thống.

---

## 1. Định nghĩa AI Decision

Giữ nguyên định nghĩa đã thiết lập ở Round 3.7 ([AI_DECISION_ARCHITECTURE_REVIEW.md](AI_DECISION_ARCHITECTURE_REVIEW.md) mục 1.1) — không định nghĩa lại từ đầu, chỉ trích dẫn để tài liệu này tự đủ (self-contained):

Một hành động của AI là **AI Decision** nếu thoả **cả 4** điều kiện:

| # | Điều kiện | Diễn giải ngắn |
|---|---|---|
| C1 | Judgment among alternatives | AI chọn/đánh giá giữa nhiều khả năng hợp lệ — không phải 1 phép tính xác định duy nhất |
| C2 | Tác động tới state Learner hoặc cấu trúc tri thức dùng chung | Ảnh hưởng Mastery, Roadmap, Knowledge Graph, hoặc trải nghiệm học trực tiếp |
| C3 | Gán được cho 1 actor + 1 thời điểm cụ thể | `created_by_actor_type = ai_service` tại 1 điểm thời gian xác định |
| C4 | Trả lời được "vì sao chọn cái này, không chọn cái khác" | Câu hỏi có ý nghĩa và có câu trả lời khác `null` |

Hành động AI không thoả đủ 4 điều kiện (vd: Evidence Engine ghi nhận observation thô — không "chọn" gì) **không** là AI Decision, dù vẫn có thể cần log vì lý do khác (observability/debugging) — không thuộc phạm vi taxonomy này.

---

## 2. Danh sách AI Decision đã xác định (9 Decision Type, trải trên 7 Capability)

| # | Decision Type | Capability | Ghi chú phạm vi |
|---|---|---|---|
| D1 | Teaching — Content Selection | Teaching | Chọn KnowledgeNode/nội dung dạy tiếp theo trong 1 SubSession |
| D2 | Assessment — Evidence Verdict | Assessment | Đánh giá Evidence, sinh verdict/mastery_delta |
| D3 | Recommendation — Signal Synthesis | Recommendation | Tổng hợp tín hiệu rời rạc thành 1 đề xuất hành động |
| D4 | Knowledge Expansion — Deep/Structural | Knowledge Expansion | Mở rộng cấu trúc Knowledge Graph, quy mô lớn, có approval/hiển thị |
| D5 | Knowledge Expansion — Local | Knowledge Expansion | Mở rộng nhỏ, tự động, không approval, không hiển thị |
| D6 | Roadmap Mapping — Dependency Edge Selection | Roadmap Mapping | Chọn KnowledgeNode nào RoadmapNode phụ thuộc |
| D7 | Discovery — Self-Assessment Mismatch Detection | Discovery | Phát hiện sai lệch tự đánh giá vs năng lực quan sát được |
| D8 | Mentor Interaction — Learning Mode Selection | Mentor Interaction | Chọn/đổi Learning Mode (A-D) cho 1 MentorSession |
| D9 | Mentor Interaction — Stuck Detection & Intervention Tier | Mentor Interaction | Phát hiện Learner "stuck" + chọn mức can thiệp |

**Không có Capability nào trong 7 Capability được yêu cầu trả lời "No"** — kết quả này giữ nguyên từ Round 3.7, không thay đổi ở Round này. 2 Capability (Knowledge Expansion, Mentor Interaction) mỗi cái sinh ra 2 Decision Type khác nhau vì khác biệt rõ về governance tier/criticality (xem mục 4, 5).

---

## 3. Phân tích theo Capability

### 3.1 Teaching

| Thuộc tính | Giá trị |
|---|---|
| Decision Type(s) | D1 — Content Selection |
| Inputs | `SubSession.roadmap_node_id` → `roadmap_node_knowledge_node` → `knowledge_node_mastery` → `knowledge_edge` (prerequisite order) → Learning Mode đang active |
| Outputs | KnowledgeNode/nội dung được chọn trình bày cho Learner (hiện không persist) |
| Domain Ownership | **Mentor Interaction** (decision xảy ra trong ngữ cảnh `MentorSession`/`SubSession`, không phải Knowledge Graph hay Goal & Roadmap — 2 domain đó chỉ là nguồn input, không sở hữu decision) |
| Capability Ownership | **Teaching Engine** |
| Explainability Requirement | Category lý do (prerequisite gap / Learner request / retry) + KnowledgeNode + thời điểm — **chưa được DECISION-027 liệt kê tường minh** (đã nêu ở Round 3.7 mục 5.1) |
| Persistence Requirement | Xem mục 6 (Persist Recommended) |

### 3.2 Assessment

| Thuộc tính | Giá trị |
|---|---|
| Decision Type(s) | D2 — Evidence Verdict |
| Inputs | `Evidence` + `EvidenceLink` (stance/weight/target dimension), `KnowledgeNodeMastery` hiện tại |
| Outputs | `AssessmentResult` (8 trường, DECISION-030) + `KnowledgeNodeMastery` cập nhật |
| Domain Ownership | **Assessment** (write-owner duy nhất của `KnowledgeNodeMastery`, DECISION-026) |
| Capability Ownership | **Assessment Engine** |
| Explainability Requirement | Bắt buộc truy vết tới Evidence/EvidenceLink cụ thể — **đã locked** (DECISION-027, DECISION-038 — qua `TraceLink`) |
| Persistence Requirement | Xem mục 6 (Persist Required, đã locked) |

### 3.3 Recommendation

| Thuộc tính | Giá trị |
|---|---|
| Decision Type(s) | D3 — Signal Synthesis |
| Inputs | `knowledge_node_mastery` + `assessment_result` + `evidence_link` (regression); `roadmap_node_knowledge_node` + `knowledge_node_mastery` (dependency gap); `learning_session`/`transition` (pause); `discovery_session` (mismatch — input chưa sẵn sàng) |
| Outputs | `RecommendationProposal` + `traced_to[]` (qua `TraceLink`, DECISION-038) — **schema chưa tồn tại, chưa build** |
| Domain Ownership | **Recommendation** — chỉ đọc, không ghi vào domain khác (DECISION-019) |
| Capability Ownership | **Recommendation Engine** |
| Explainability Requirement | Bắt buộc `traced_to[]` — **đã locked** (DECISION-027) |
| Persistence Requirement | Xem mục 6 (Persist Required khi build, schema-provisioned hiện tại) |

### 3.4 Knowledge Expansion (2 nhánh)

| Thuộc tính | D4 — Deep/Structural | D5 — Local |
|---|---|---|
| Inputs | `knowledge_node` hiện tại, `knowledge_edge` hiện có, ngữ cảnh RoadmapNode active | Giống D4, quy mô nhỏ hơn |
| Outputs | `knowledge_edge` mới + `expansion_record` | Chỉ `knowledge_edge` mới |
| Domain Ownership | **Knowledge Graph** | **Knowledge Graph** |
| Capability Ownership | **Knowledge Engine** | **Knowledge Engine** |
| Explainability Requirement | `expansion_reason` bắt buộc **hiển thị cho Learner** — đã locked (DECISION-023/027) | Truy vết **nội bộ**, không bắt buộc hiển thị — đã locked (DECISION-027), **chưa có cơ chế lưu** (GAP-02) |
| Persistence Requirement | Persist Required, đã locked + đã implement (`expansion_record`) | Persist Required, đã locked nhưng **chưa implement** (xem mục 6) |

### 3.5 Roadmap Mapping

| Thuộc tính | Giá trị |
|---|---|
| Decision Type(s) | D6 — Dependency Edge Selection |
| Inputs | `roadmap_node` đang xây/mở rộng, `knowledge_node` liên quan, có thể `knowledge_edge` (chuỗi prerequisite) |
| Outputs | 1 dòng `roadmap_node_knowledge_node`, nên kèm `approval_record` (không bắt buộc schema) |
| Domain Ownership | **Goal & Roadmap** (Write-owner đã chốt ở [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1 — Knowledge Graph chỉ đọc) |
| Capability Ownership | **Roadmap Engine** |
| Explainability Requirement | Chưa nằm trong phạm vi tường minh DECISION-027; về nguyên tắc taxonomy (mục 1) nên có lý do cặp dependency cụ thể — **đang là khoảng trống** (GAP-05) |
| Persistence Requirement | Xem mục 6 (Persist Recommended — đã persist nhưng thiếu lý do) |

### 3.6 Discovery

| Thuộc tính | Giá trị |
|---|---|
| Decision Type(s) | D7 — Self-Assessment Mismatch Detection |
| Inputs | Self-assessment input từ Learner (nguồn cụ thể chưa chốt), `Evidence`/`AssessmentResult` quan sát được cùng phạm vi |
| Outputs | `DiscoverySession` (+ `SelfAssessmentMismatch` 0..n) |
| Domain Ownership | **Discovery** |
| Capability Ownership | **Discovery Engine** |
| Explainability Requirement | DECISION-027 chỉ dùng `DiscoverySession` làm **điểm đến** của truy vết (cho Recommendation), chưa yêu cầu Discovery **tự** explainable — khoảng trống logic đã nêu ở Round 3.7 mục 2.6 |
| Persistence Requirement | Xem mục 6 (Persist Recommended — entity tồn tại, cơ chế xác minh chưa chốt, Open Question #5) |

### 3.7 Mentor Interaction (2 nhánh)

| Thuộc tính | D8 — Mode Selection | D9 — Stuck Detection & Intervention |
|---|---|---|
| Inputs | Tín hiệu tương tác hiện tại trong `MentorSession` (chưa chốt cụ thể) | Lịch sử phản hồi/Evidence gần nhất trong `SubSession`/`MentorSession` (ngưỡng chưa chốt — Open Question #11) |
| Outputs | `MentorSessionModeChanged` + Mode mới | Hành động can thiệp (hint level / direct fix) — **chưa có entity/field ghi nhận** |
| Domain Ownership | **Mentor Interaction** | **Mentor Interaction** |
| Capability Ownership | **Teaching Engine** (theo CoreDomainMap — Mentor Interaction Domain → Teaching Engine, không có Engine riêng) | **Teaching Engine** |
| Explainability Requirement | Chưa được DECISION-027 nhắc tới; mức tối thiểu nên có "vì sao đổi Mode lúc này" | Chưa được DECISION-027 nhắc tới; cơ chế cốt lõi (ngưỡng Stuck, hint-ladder vs direct-fix) chưa chốt — Open Question #6 |
| Persistence Requirement | Xem mục 6 (Do Not Persist by default) | Xem mục 6 (Persist Recommended) |

---

## 4. Decision Classification (Criticality)

Phân loại theo **Impact on Learner / Knowledge Graph / Roadmap / Recommendation / Assessment** — không theo tần suất hay chi phí kỹ thuật.

| Decision | Impact Learner | Impact Knowledge Graph | Impact Roadmap | Impact Recommendation | Impact Assessment | **Criticality** |
|---|---|---|---|---|---|---|
| D2 — Assessment Verdict | Trực tiếp, ngay lập tức (Mastery) | Không | Gián tiếp (qua Recommendation/dependency) | Là input chính | Là chính nó | **A — Critical** |
| D4 — Expansion Deep/Structural | Gián tiếp (qua nội dung học sau này) | **Trực tiếp, ảnh hưởng mọi Learner dùng chung node** | Gián tiếp | Gián tiếp | Không | **A — Critical** |
| D3 — Recommendation Synthesis | Trực tiếp định hướng (nhưng chỉ là đề xuất, Learner/Capability khác vẫn quyết) | Không | Có thể ngụ ý đổi cấu trúc | Là chính nó | Không | **B — Important** |
| D6 — Roadmap Mapping | Trực tiếp (cấu trúc lộ trình cá nhân) | Không | **Trực tiếp** | Là input cho dependency-gap signal | Không | **B — Important** |
| D1 — Teaching Content Selection | Trực tiếp nhưng từng-lượt (1 lượt sai không có hậu quả cấu trúc lâu dài, Assessment phía sau mới quyết Mastery) | Không | Không | Không | Không | **B — Important** |
| D7 — Discovery Mismatch Detection | Gián tiếp (kích hoạt Recommendation/Assessment xem xét lại) | Không | Không | Là input trực tiếp | Là input gián tiếp | **B — Important** |
| D9 — Stuck Detection & Intervention | Trực tiếp, **mức độ phụ thuộc lựa chọn chưa chốt** (hint vô hại vs direct fix có thể che mất cơ hội học) | Không | Không | Không | Gián tiếp (ảnh hưởng Evidence sinh ra sau đó) | **B — Important** (cảnh báo: có thể leo lên A nếu "direct fix" được chọn làm cơ chế — chưa chốt, xem mục 2 Round 3.8 Review) |
| D5 — Expansion Local | Gián tiếp, quy mô nhỏ theo thiết kế | Có, nhưng nhỏ theo định nghĩa "Local" | Không | Không | Không | **C — Optional** |
| D8 — Mode Selection | Trực tiếp nhưng chỉ ảnh hưởng *cách* dạy, không ảnh hưởng *nội dung*/Mastery | Không | Không | Không | Không | **C — Optional** |

**Quan sát:** Criticality (mức ảnh hưởng nghiệp vụ) và mức độ đã được locked về Explainability/Persistence (DECISION-027) **không hoàn toàn tương ứng nhau** — D5 (Local Expansion) là Criticality C nhưng đã bị DECISION-027 bắt buộc persist, trong khi D6 (Roadmap Mapping, Criticality B) và D1 (Teaching, Criticality B) lại chưa nằm trong phạm vi bắt buộc nào. Điểm này được phân tích sâu hơn ở [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) mục 5.

---

## 5. Explainability Requirement — Tổng hợp

| Decision | Explainability bắt buộc? | Trạng thái |
|---|---|---|
| D2, D3, D4, D5 | **CÓ** | Đã locked (DECISION-027), cơ chế hạ tầng đã chốt (`TraceLink`, DECISION-038) |
| D1, D6, D7, D8, D9 | **Nên có** (theo taxonomy mục 1, thoả đủ C1-C4) nhưng **chưa locked** | Khoảng trống — cần Founder/Lead Architect quyết định mở rộng phạm vi DECISION-027 hay không (xem mục Final Section / DECISION-048 ở Round Review) |

---

## 6. Persistence Requirement — Tổng hợp

| Decision | Phân loại | Lý do |
|---|---|---|
| D2 — Assessment Verdict | **Persist Required** | Đã locked (DECISION-026/030); là "biên lai" Explainability bắt buộc giữa Evidence và thay đổi Mastery — không có lựa chọn khác về nguyên tắc domain. |
| D4 — Expansion Deep/Structural | **Persist Required** | Đã locked (DECISION-023); ảnh hưởng cấu trúc dùng chung, bắt buộc hiển thị lý do cho Learner — không thể ephemeral. |
| D5 — Expansion Local | **Persist Required** | Đã locked (DECISION-027 — "vẫn phải log lý do nội bộ truy vết được") dù Criticality chỉ là C — đây là 1 yêu cầu **explainability-driven**, không phải **impact-driven**; persist vì nguyên tắc đã chốt, không phải vì impact cao. **Chưa implement** (GAP-02). |
| D3 — Recommendation Synthesis | **Persist Required** (khi build) | Đã locked (DECISION-027 — `traced_to[]` bắt buộc); schema đã được "đặt trước chỗ" qua `trace_link.source_type`. |
| D6 — Roadmap Mapping | **Persist Recommended** | Đã có persistence cho *kết quả* (`roadmap_node_knowledge_node`) nhưng thiếu *lý do* — recommended nâng lên Required ở vòng SQL Generation thật (đã nêu từ Round 3.5/3.6), chưa locked nên giữ "Recommended" ở Round này. |
| D1 — Teaching Content Selection | **Persist Recommended** | Tần suất cao nhất trong hệ thống — persist toàn bộ mọi lượt ở độ chi tiết đầy đủ có thể tạo write-volume lớn không cần thiết; recommended persist ở mức tối thiểu (category lý do + KnowledgeNode + thời điểm) thay vì "Required" tuyệt đối, chờ Founder xác nhận phạm vi DECISION-027 có nên mở rộng phủ Teaching hay không. |
| D7 — Discovery Mismatch Detection | **Persist Recommended** | Entity (`DiscoverySession`/`SelfAssessmentMismatch`) đã tồn tại trong Domain Model, nhưng cơ chế xác minh + lý do cụ thể chưa chốt (Open Question #5) — recommended giữ nguyên persist ở mức entity hiện có, chưa nên thêm field lý do mới trước khi cơ chế chốt (tránh phải sửa lại 2 lần). |
| D9 — Stuck Detection & Intervention | **Persist Recommended** | Tác động tiềm tàng tới tính toàn vẹn quá trình học (D9 có thể leo Criticality), nên nên persist dù cơ chế chưa chốt — recommended thay vì required vì chưa có entity và cơ chế cốt lõi (hint-ladder vs direct-fix, Open Question #6) chưa tồn tại để biết persist cái gì. |
| D8 — Mode Selection | **Do Not Persist** (mặc định) | Re-derivable hoàn toàn từ state hiện tại của `MentorSession` tại mọi thời điểm cần audit (Mode hiện tại luôn đọc được từ `MentorSession`, không cần lịch sử đổi Mode để giải thích quyết định khác); Criticality C; persist mọi lần đổi Mode sẽ tạo write-volume không tương xứng với giá trị explainability thu được. Có thể cần persist optional nếu sau này cần phân tích "AI đổi Mode có hợp lý không" ở mức nghiên cứu/analytics — không phải nhu cầu vận hành hiện tại. |

**Không có Decision nào được phân loại "Persist Optional"** (tầng giữa "Recommended" và "Do Not Persist") trong 9 Decision hiện có — mọi decision đều đủ rõ để rơi vào 1 trong 3 nhóm còn lại (Required/Recommended/Do Not Persist). Đây không phải lỗi phân loại — chỉ phản ánh việc level "Optional" chưa có ứng viên tự nhiên ở taxonomy hiện tại; có thể xuất hiện sau khi cơ chế D7/D9 được chốt chi tiết hơn.

---

## 7. Liên kết ngược

[AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md), [AI_DECISION_ARCHITECTURE_REVIEW.md](AI_DECISION_ARCHITECTURE_REVIEW.md) (Round 3.7), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md) (Round 3.5), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md).
