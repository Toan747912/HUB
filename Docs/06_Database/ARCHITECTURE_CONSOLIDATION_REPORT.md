# Architecture Consolidation Report — AI Mentor OS (Rounds 1 → 4.4)

> Phạm vi: **review tổng hợp, không tạo Decision mới, không tạo SQL/DDL.** Tổng hợp toàn bộ Decision Log (DECISION-001..048), Domain Architecture, Persistence Architecture, Explainability Architecture, Database Blueprint, và DDL Round 1-3 thành 1 báo cáo trạng thái duy nhất, trước khi tiếp tục sinh DDL.

---

## 1. Executive Summary

Hệ thống hiện có **45 Decision đã khoá** (DECISION-001 đến 048, thiếu 3 số 034/041/046 — không có file, không phải bị xoá, là số dự phòng chưa dùng), **0 Decision còn ở trạng thái Draft**, và **1 Decision được đề xuất (DECISION-046) nhưng chưa từng được soạn thành file** — đây là khoảng trống duy nhất giữa "đã đề xuất" và "đã có file Decision" trong toàn bộ Decision Log.

Domain Architecture (Round 1-6), Logical Database Model, Database Blueprint (Step 4A), và DDL Round 1-3 (Step 4B) đều đã tự rà soát và tự báo cáo **không phát hiện mâu thuẫn nội bộ** ở mỗi bước — xác nhận lại ở mục 4 của báo cáo này bằng cách quét toàn bộ "mâu thuẫn"/"xung đột" xuyên Docs/: **mọi mâu thuẫn từng được phát hiện đều đã có Decision đóng lại tường minh** (DECISION-037 cho xung đột Right-to-be-Forgotten vs retention; DECISION-043 cho xung đột UUID vs Sequential ID; DECISION-045 cho xung đột Temporal Table vs No-Event-Sourcing; Round 4.2 cho mâu thuẫn nội tại của DECISION-048 draft). **Không có mâu thuẫn nào đang mở.**

Tuy nhiên, hệ thống vẫn còn **14/24 Open Question** (OpenQuestions.md), **8 Requirement Gap** (RequirementGaps.md, chưa cái nào được đóng bằng Decision), **12 Open Domain Question** (CoreDomainMap.md mục 6), và **5 Risk + 5 Open Question** còn mở ở PersistenceArchitecture.md. Phần lớn các mục mở này **không chặn DDL Round 1-3** (đã được DDL Review tự xác nhận READY 3 lần liên tiếp) nhưng **sẽ chặn** các Decision Type mới mở rộng bởi DECISION-048 (D1, D6, D7, D9a, D9b) vì cơ chế persistence cho chúng **chưa được chọn** (Round 3.6/4.3/4.4 chỉ phân tích phương án, chưa chốt).

**Kết luận tổng quát:** Database (theo nghĩa 19+1 entity đã blueprint + DDL Round 1-3) ở trạng thái sẵn sàng cao nhất trong 5 hạng mục được yêu cầu đánh giá. API, Application Services, và AI Orchestration ở trạng thái sẵn sàng thấp — không phải vì có lỗi, mà vì **chưa từng có 1 Round/Phase nào dành riêng cho 3 hạng mục này** (xem mục 7).

---

## 2. Decision Inventory

### 2.1 Locked Decisions (45)

DECISION-001 → 033 (33 quyết định, Domain/Product Architecture, Round 1-6), DECISION-035 → 040 (6 quyết định, Persistence/Traceability Architecture, Round 7-8), DECISION-042 → 045 (4 quyết định, Supabase Platform Alignment), DECISION-047 (Learning Session Transition Log, DDL Round 1 Finalization), DECISION-048 (All AI Decisions Must Be Explainable, locked Round 4.3).

**Toàn bộ 45 Decision đều ở trạng thái `Accepted (Locked)`** — không có Decision nào đang ở trạng thái Draft/Proposed tại thời điểm báo cáo này.

### 2.2 Draft Decisions

**Không có.** DECISION-048 là Decision cuối cùng từng ở trạng thái Draft (Round 4.0-4.2) — đã locked ở Round 4.3.

### 2.3 Đề xuất chưa thành Decision (Proposed, no file)

| # | Đề xuất | Nguồn | Vì sao chưa thành Decision |
|---|---|---|---|
| 1 | **DECISION-046 — Hybrid AI Execution Model** | [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) mục 4 | Chờ Founder xác nhận 2 điều kiện: (a) Local AI có chạy offline thật không (ảnh hưởng High nếu có); (b) Explainability First có cần phân biệt Local/Cloud AI không (ảnh hưởng Low — chỉ mở rộng 1 enum) |

**Đây là số `046` còn thiếu trong dãy số Decision** — không phải lỗi đánh số, là 1 đề xuất đang chờ, đã được dự trù số nhưng chưa hiện thực hoá. Số `034` và `041` không có ghi chú đề xuất nào tương ứng tìm được — coi là số dự phòng không dùng, không phải gap cần điều tra thêm.

### 2.4 Persistence Mechanism — chưa chốt (không phải Decision bị thiếu, là 1 câu hỏi chưa tới lượt trả lời)

Không có số Decision nào được đề xuất cho việc chọn cơ chế persistence chung cho D1/D6/D7/D9a/D9b (Header/Detail vs Independent per Capability vs Single Table, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md)) — đây khác với DECISION-046 (đã có hình dạng đề xuất cụ thể), mục này vẫn đang ở giai đoạn phân tích phương án (Round 4.3-4.4), chưa tới giai đoạn "đề xuất 1 Decision cụ thể".

---

## 3. Open Questions / Deferred Questions / Architecture Assumptions

### 3.1 Open Questions (OpenQuestions.md) — 14/24 còn mở

| # | Câu hỏi | Mức ảnh hưởng tới DDL tiếp theo |
|---|---|---|
| 1 | Quan hệ với workspace trước đó | Không ảnh hưởng kỹ thuật |
| 2 | Quy trình đồng bộ với ChatGPT Lead Architect | Không ảnh hưởng kỹ thuật |
| 3 | Phạm vi đa lĩnh vực cho MVP | Không ảnh hưởng schema hiện có |
| 4 | "User" trong Roadmap Governance là ai | Thấp — chỉ cần xác nhận lại |
| 5 | Cơ chế xác minh SelfAssessmentMismatch | **Trung bình** — chặn việc D7 (Discovery) có nội dung cụ thể để explainable |
| 6 | AI Boundaries khi dạy/debug (hint-ladder vs direct-fix) | **Cao** — chặn D9a/D9b (Stuck Detection) hoàn toàn, không có gì để gắn explainability vào |
| 7 | Mô hình kinh doanh | Không ảnh hưởng kỹ thuật |
| 12 | Công thức `capability_weight` (Teach) | Trung bình — ảnh hưởng `AssessmentResult` payload thật |
| 13 | Công thức/kiểu dữ liệu `evidence_weight` | Trung bình — ảnh hưởng `Evidence`/`EvidenceLink` cột thật |
| 14 | Field `type` cấp Evidence còn cần không | Thấp — chỉ ảnh hưởng 1 cột |
| 15 | Tiêu chí Controlled Expansion (Local vs Deep/Structural) cụ thể | Trung bình — ảnh hưởng logic Application, không ảnh hưởng schema đã có |
| 18 | Danh sách `relation_type` đầy đủ cho KnowledgeEdge | Thấp-Trung bình — ảnh hưởng CHECK constraint/ENUM khi viết DDL cho cột này |
| 20 | `AssessmentResult` cardinality (per-Evidence hay per-EvidenceLink) | Thấp — nội dung đã chốt (DECISION-030), chỉ cardinality còn mở |
| 21 | Entity ghi log nội bộ cho Local Expansion | **Cao** — chính là GAP-02, decision đã yêu cầu persist (DECISION-027/048) nhưng chưa có nơi lưu |

**10/24 đã đóng** bởi DECISION-008/020/021/022/023/024/025/026/029/031/032/033 (xem CoreDomainMap.md mục 6 và DECISION tương ứng).

### 3.2 Requirement Gaps (RequirementGaps.md) — 8/8 còn mở, chưa có Decision nào đóng trực tiếp

| Gap | Nội dung | Trạng thái |
|---|---|---|
| 1 | Ranh giới Roadmap Structure (governance) vs Learning Parameters (AI tự điều chỉnh) chưa chi tiết | Open |
| 2 | Knowledge Philosophy 4 cấp độ chưa tổng quát hoá cho lĩnh vực phi kỹ thuật | Open, không cấp bách (MVP có thể chỉ cần lập trình) |
| 3 | AI có quyền phản biện goal/roadmap không hợp lý không | Open |
| 4 | Không có định nghĩa định lượng "kẹt quá lâu" (Stuck) | Open — **trùng Open Question #6**, là 1 vấn đề, không phải 2 |
| 5 | Mastery Score tổng chưa có công thức (dù Teach/Regression đã có công thức riêng) | Open |
| 6 | Quan hệ Learning Mode ↔ Knowledge Level chưa rõ | Open |
| 7 | Cơ chế Learner đổi Goal giữa đường — tái dùng kiến thức cũ thế nào | Open — domain-level đã có DECISION-032 (Goal immutable, tạo Goal mới), nhưng *tái sử dụng kiến thức* cụ thể vẫn chưa định nghĩa |
| 8 | Chưa định nghĩa failure mode sản phẩm | Open, để PRD v2, không cấp bách |

### 3.3 Open Domain Questions (CoreDomainMap.md mục 6) — 12 còn mở (5 đã đóng ở Round 4-6)

Đáng chú ý nhất cho giai đoạn tiếp theo (3 câu trực tiếp ảnh hưởng DECISION-048's Deferred Items):
- **#9** — `relation_type` đầy đủ cho KnowledgeEdge (= Open Question #18).
- **#10** — Explainability cho Local Expansion cần entity riêng hay Domain Event đủ (= GAP-02 = Open Question #21).
- **#7, #11** — `capability_weight`, ngưỡng Stuck Detection (= Open Question #12, #6).

Còn lại 8 câu (RoadmapNode↔KnowledgeNode optional, Evidence/Assessment/Mastery Domain Event mechanism, tên trùng "Explain", `evidence_weight`, field `type` Evidence, Controlled Expansion criteria, LearningSession Aggregate Root riêng cho query lịch sử) — không câu nào chặn DDL hiện tại, đều là tinh chỉnh ở mức Application/Query Optimization.

### 3.4 Architecture Assumptions (giả định đang được dùng làm nền, chưa được Founder xác nhận tường minh)

| # | Giả định | Nguồn | Rủi ro nếu sai |
|---|---|---|---|
| 1 | **Hybrid AI luôn đồng bộ thời gian thực, không có Local AI chạy offline thật** ("cách hiểu A", [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) mục 0) | Round Pre-DDL Review | **Cao** — nếu sai (cách hiểu B đúng), cần thiết kế lại "Pending Sync"/"Offline Queue" — ảnh hưởng tính append-only/immutable đã chốt cho `Evidence`/`AssessmentResult` |
| 2 | **Mode Selection (D8) chỉ dùng input đã persist ở domain khác** (điều kiện cho Runtime Reconstruction hợp lệ, DECISION-048) | Round 4.1-4.3 | Trung bình — nếu sai, D8 thực sự là black-box dù DECISION-048 coi nó đã explainable |
| 3 | **`MentorSession` dùng storage pattern Snapshot đơn giản** (suy luận, không tường minh trong PersistenceArchitecture.md mục 1) | Round 4.2 phát hiện | Thấp-Trung bình — chỉ ảnh hưởng độ tin cậy của giả định #2, không tự nó là blocker |
| 4 | **Mọi Decision Type mới (D1/D6/D7/D9a/D9b) sẽ dùng cùng 1 cơ chế persistence** khi được chọn (ngụ ý bởi cách DECISION-048 nói "Shared Mechanism" là điều kiện tiên quyết) | Round 3.6/4.3 | Thấp — đây là giả định làm việc hợp lý, không phải rủi ro kỹ thuật, chỉ là chưa được chốt |

---

## 4. Cross-Document Contradiction Check

Quét toàn bộ Docs/ cho "mâu thuẫn"/"xung đột"/"contradiction" (kết quả đầy đủ ở phụ lục nghiên cứu nội bộ Round này). **Kết luận: không có mâu thuẫn nào còn mở** giữa Domain Model / Decision Log / Persistence Architecture / Explainability Architecture / Database Blueprint / DDL Round 1-3. Mọi lần từ "mâu thuẫn" xuất hiện thuộc 1 trong 3 nhóm:

1. **Mâu thuẫn đã được phát hiện và đóng bằng 1 Decision cụ thể:**
   - DECISION-037 đóng xung đột "Right-to-be-Forgotten" vs "Evidence/AssessmentResult vĩnh viễn" (giải pháp: Anonymization, không Hard Delete).
   - DECISION-043 đóng xung đột "UUID (Supabase Auth/RLS)" vs "Sequential ID đề xuất ban đầu" (giải pháp: `learner.id = auth.users.id`).
   - DECISION-045 đóng xung đột "Temporal Table" vs "No Full Event Sourcing" (DECISION-035) — giải pháp: trigger-history chỉ nơi chưa có companion log.
   - Round 4.2 đóng mâu thuẫn nội tại của chính DECISION-048 draft (D8 carve-out tự mâu thuẫn với câu mở đầu "Explainability ≠ Persistence").

2. **Mâu thuẫn được nêu như 1 khái niệm cần phân biệt rõ, không phải lỗi thật** (DECISION-020 — ngoại lệ Teach weighted score vs "no partial state" rule của Prompt Architecture; DECISION-027 — làm rõ Local Expansion không mâu thuẫn DECISION-023).

3. **Câu khẳng định "không có mâu thuẫn" từ các Review tự kiểm tra** (DatabaseBlueprintReview.md, DDL_ROUND1/2/3_REVIEW.md, PLATFORM_ALIGNMENT_REVIEW.md, DECISION-048_FINAL_REVIEW.md — tất cả tự xác nhận PASS, không phát hiện gì mới).

**Không tìm thấy mâu thuẫn nhóm 4 (phát hiện mới, chưa từng được ghi nhận, chưa có Decision đóng) ở Round Consolidation này.**

---

## 5. Decision Dependency Graph

> Không vẽ đủ 45 Decision (nhiều Decision Round 1 độc lập về sản phẩm/triết lý, không có cạnh kỹ thuật rõ). Tập trung vào **5 chuỗi phụ thuộc chính** ảnh hưởng trực tiếp tới khả năng tiếp tục DDL.

### 5.1 Chuỗi Knowledge Graph

```
DECISION-010 (Knowledge Graph, Round 1)
   └─→ DECISION-015 (Knowledge Engine)
         └─→ DECISION-024 (Concept = KnowledgeNode)
               └─→ DECISION-025 (DAG, không phải cây)
                     └─→ DECISION-029 (Cycle Detection: Runtime Reachability)
                           └─→ DECISION-039 (Persistence: Relational Table + Recursive CTE)
   └─→ DECISION-023 (Controlled Expansion: Local vs Deep/Structural)
```

### 5.2 Chuỗi Mastery / Assessment

```
DECISION-009 (Knowledge Philosophy: Remember/Explain/Apply/Teach)
   └─→ DECISION-017 (Mastery Framework)
         └─→ DECISION-020 (Teach = Composite, weighted score)
DECISION-016 (Evidence-Based Decay)
   └─→ DECISION-021 (Evidence Weighting)
         └─→ DECISION-022 (Evidence ↔ KnowledgeNode M2M)
               └─→ DECISION-026 (Assessment = Core Domain độc lập, write-owner Mastery)
                     └─→ DECISION-030 (AssessmentResult: 8 trường bắt buộc)
```

### 5.3 Chuỗi Explainability (chuỗi quan trọng nhất cho giai đoạn tiếp theo)

```
DECISION-026, DECISION-030 (Assessment có AssessmentResult làm "biên lai" explainability)
DECISION-019 (Recommendation Engine, scope hẹp — proposal-only)
DECISION-023 (Controlled Expansion, expansion_reason bắt buộc)
   └─→ DECISION-027 (Explainability First — gộp 3 nhóm trên thành 1 nguyên tắc)
         └─→ DECISION-038 (TraceLink — hạ tầng thực thi DECISION-027, không Polymorphic FK)
               └─→ DECISION-048 (mở rộng DECISION-027 từ 3 nhóm → 10 Decision Type)
                     [phụ thuộc thêm: DECISION-031 (D8 thuộc Mentor Interaction Domain thật),
                                      DECISION-035 (hỗ trợ Runtime Reconstruction cho D8)]
                     └─→ [CHƯA CHỐT] Shared Persistence Mechanism (Header/Detail, Round 4.3-4.4)
                           └─→ [CHƯA TỒN TẠI] DECISION-04X cho D1/D6/D7/D9a/D9b
```

### 5.4 Chuỗi Orchestration (Learning Session)

```
DECISION-028 (Learning Session = Orchestrator Domain)
   └─→ DECISION-031 (SubSession ≠ MentorSession, hierarchy 3 tầng)
         └─→ DECISION-032 (Goal immutable → LearningSession mới khi đổi Goal)
               └─→ DECISION-033 (Adaptive Pause, không ngưỡng cố định)
                     └─→ DECISION-047 (Learning Session Transition Log, DDL Round 1)
```

### 5.5 Chuỗi Platform Alignment (Supabase)

```
[Founder xác nhận Platform = Supabase]
   └─→ DECISION-042 (snake_case naming)
   └─→ DECISION-043 (learner.id = auth.users.id — phụ thuộc Identity Domain đã chốt từ Round 1)
   └─→ DECISION-044 (version_number trigger-incremented — phụ thuộc DECISION-026 vì chỉ áp dụng cho KnowledgeNodeMastery)
   └─→ DECISION-045 (Temporal: trigger-history — phụ thuộc DECISION-035, chỉ áp dụng nơi CHƯA có companion log)
         (4 quyết định này độc lập với nhau về nội dung, nhưng cùng phụ thuộc 1 điều kiện gốc: Platform = Supabase)
```

### 5.6 Phụ thuộc còn treo (chưa có Decision ở đầu mũi tên)

```
DECISION-048 ──requires──→ [Shared Persistence Mechanism — chưa chốt]
DECISION-048 ──requires──→ [Stuck Detection mechanism — Open Question #6/#11, chưa chốt]
DECISION-048 ──requires──→ [DECISION-038 mở rộng scope — chưa có Decision riêng]
HybridAIArchitectureReview ──proposes──→ [DECISION-046 — chưa thành file]
SHARED_DECISION_PERSISTENCE_REVIEW ──requires──→ [Header ↔ TraceLink boundary — đã review (Round 4.4), khuyến nghị giữ riêng, CHƯA CHỐT thành Decision]
```

---

## 6. Open Risks

| # | Rủi ro | Nguồn | Mức độ | Chặn gì |
|---|---|---|---|---|
| 1 | **Shared Persistence Mechanism cho 5 Decision Type (D1/D6/D7/D9a/D9b) chưa chốt** | Round 3.6/4.3/4.4 | Cao | Chặn việc viết DDL thật cho bất kỳ decision nào trong 5 cái này — DECISION-048 đã yêu cầu explainable nhưng chưa có "nơi lưu" |
| 2 | **Stuck Detection mechanism hoàn toàn chưa tồn tại** (Open Question #6/#11) | Backlog/RequirementGaps Gap 4 | Cao | Chặn D9a/D9b có nội dung cụ thể để gắn explainability — đây là decision Criticality có thể leo lên A (Round 3.8) |
| 3 | **Giả định Hybrid AI "đồng bộ, không offline" chưa được Founder xác nhận tường minh** | HybridAIArchitectureReview.md | Cao (có điều kiện) | Nếu sai, toàn bộ tính append-only/immutable hiện có cho Evidence/AssessmentResult cần xem lại — ảnh hưởng ngược tới Database Design đã hoàn thành |
| 4 | **GAP-02 — Local Expansion log entity chưa tồn tại** dù đã được DECISION-027/048 yêu cầu persist | Round 3.5, kế thừa | Trung bình | Decision đã yêu cầu nhưng chưa có cơ chế — vi phạm tạm thời nguyên tắc Explainability First cho tới khi được build |
| 5 | **GAP-05 — Roadmap Mapping (`roadmap_node_knowledge_node`) thiếu cột lý do** | Round 3.5, kế thừa | Trung bình | Tương tự #4, decision đã yêu cầu (DECISION-048) nhưng chưa có cột |
| 6 | **`MentorSession` chưa xuất hiện tường minh trong Domain Persistence Matrix** | Phát hiện Round 4.2 | Thấp-Trung bình | Làm giảm độ tin cậy của giả định Runtime Reconstruction cho D8 |
| 7 | **DECISION-046 (Hybrid AI) chưa được tạo file**, dù đã được đề xuất và độ phức tạp đóng thấp | HybridAIArchitectureReview.md | Thấp | Nếu Step 4B viết ENUM `ActorType` trước khi đóng, cần `ALTER TYPE` sau — chi phí nhỏ nhưng tránh được nếu đóng sớm |
| 8 | **Application Services layer chưa từng có 1 Round/Phase riêng** — mọi "Application Layer Discipline dependency" (GAP-04, GAP-05, GAP-07, Header/TraceLink sync risk) đều bị đẩy về tầng này nhưng tầng này chưa được thiết kế | Tổng hợp xuyên nhiều Round | **Cao, mang tính hệ thống** | Không chặn DDL (DDL không cần Application Layer tồn tại trước), nhưng chặn mọi việc *thực thi* đúng các ràng buộc đã thiết kế (vd: "AssessmentResult + TraceLink phải cùng transaction" không có gì enforce ngoài discipline) |
| 9 | **API layer chưa từng được thiết kế** — không có Decision, Review, hay Draft nào về REST/GraphQL/Supabase Edge Functions | Quan sát trực tiếp từ cấu trúc Docs/ | Cao (nhưng đúng tiến độ — chưa tới phase này) | Không chặn DDL, nhưng là khoảng trống lớn nhất giữa "Database sẵn sàng" và "sản phẩm chạy được" |

---

## 7. Architecture Readiness Assessment

> Thang điểm định tính 0-100, dựa trên bằng chứng đã thu thập (mục 2-6) — không phải điểm số đã có sẵn ở bất kỳ tài liệu nào trước đây, là tổng hợp của Round Consolidation này.

| Hạng mục | Điểm | Đánh giá |
|---|---|---|
| **Database** | **~85/100 — READY WITH KNOWN GAPS** | Domain Architecture, Logical Model, Database Blueprint, DDL Round 1-3, Platform Alignment đều tự báo cáo READY/PASS liên tục qua nhiều Round. Điểm trừ: GAP-02 (Local Expansion log), GAP-05 (Roadmap reason column), Shared Persistence Mechanism cho 5 Decision Type chưa chọn, 1 vài Open Question ảnh hưởng cột cụ thể (relation_type, evidence_weight, capability_weight). Không có mâu thuẫn nào, chỉ có **thiếu hoàn thiện**, không phải **lỗi**. |
| **API** | **~15/100 — NOT STARTED** | Không có Decision, Draft, hay Review nào về API tồn tại trong toàn bộ Docs/. Đúng tiến độ dự kiến (DECISION-018 đã tạm dừng Database/API/UI cho tới khi Domain Model xong, DECISION-040 chỉ tách Step 4A/4B cho Database) — không phải dấu hiệu bị bỏ sót, chỉ là **chưa tới lượt**. |
| **Application Services** | **~10/100 — IDENTIFIED AS REQUIRED, NOT DESIGNED** | Đây là hạng mục có **nhiều phụ thuộc ngầm nhất** (ít nhất 5 gap khác nhau — GAP-04, GAP-05, GAP-07, Header/TraceLink Sync Risk, Mode Selection input verification — đều bị đẩy về "Application Layer Discipline") nhưng **chưa từng có 1 dòng thiết kế nào** cho tầng này. Rủi ro mang tính hệ thống: nhiều ràng buộc quan trọng (transaction nhất quán, input verification) đang **chỉ tồn tại như ghi chú trong tài liệu**, không có cơ chế nào (kể cả kế hoạch) để enforce. |
| **Supabase RLS** | **~30/100 — PRINCIPLES LOCKED, POLICIES NOT AUTHORED** | 2 quyết định nền tảng đã khoá (DECISION-042 naming, DECISION-043 `learner.id = auth.users.id` cho phép viết RLS Policy đơn giản) — nhưng **chưa có 1 RLS Policy cụ thể nào được viết**, kể cả ở mức nguyên tắc cho 19 entity đã blueprint. Round 4.3 mới chỉ nêu 1 khuyến nghị kỹ thuật (denormalize `learner_id` lên Detail) ở mức ý tưởng. |
| **AI Orchestration** | **~35/100 — CONCEPTUALLY SCOPED, MULTIPLE OPEN MECHANISMS** | 13 Capability đã định nghĩa rõ "làm gì" (AIArchitecture_Draft.md), nhưng "chạy thế nào" (Hybrid AI) mới chỉ có 1 Review với giả định chưa xác nhận (mục 3.4 #1), và ranh giới Capability/Domain cho Teaching/Mentor Interaction (D9a ownership) vẫn còn mở từ Round 3.9. Đây không phải điểm yếu do thiếu phân tích — Round 3.7-4.4 đã phân tích rất sâu — mà do **nhiều câu hỏi mở cố ý chưa chốt** để chờ Founder/Lead Architect. |

**Quan sát chung:** điểm số thấp ở API/Application Services/AI Orchestration **không phản ánh chất lượng công việc kém** — phản ánh đúng thực tế: toàn bộ 4.4 Round vừa qua tập trung 100% vào Domain + Database + Explainability. 3 hạng mục điểm thấp chưa từng được giao Round nào.

---

## 8. Recommended Next Phase

**Không khuyến nghị tiếp tục DDL Round 4 ngay** cho 5 Decision Type còn thiếu persistence (D1/D6/D7/D9a/D9b) — vì chưa có Shared Mechanism được chọn (Risk #1, mục 6). Khuyến nghị thứ tự xử lý:

1. **Đóng Shared Persistence Mechanism** (Header/Detail vs alternatives, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) + [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md)) — đây là phụ thuộc nền cho mọi việc viết DDL tiếp theo liên quan AI Decision.
2. **Đóng DECISION-046 (Hybrid AI)** — chi phí thấp (theo HybridAIArchitectureReview.md), nên đóng sớm trước khi viết ENUM `ActorType` thật, tránh `ALTER TYPE` sau.
3. **Đóng Open Question #6/#11 (Stuck Detection mechanism)** — chặn trực tiếp D9a/D9b, và là 1 trong 2 Critical Gap còn lại từ Round 3.5 chưa đóng triệt để (cùng nhóm GAP-02).
4. **Đóng GAP-02 (Local Expansion log) và GAP-05 (Roadmap reason column)** — 2 gap cụ thể nhất, chi phí đóng thấp (1 entity nhẹ + 1 cột), nên xử lý cùng lúc với bước 1 vì cùng thuộc phạm vi Persistence Mechanism.
5. **Mở 1 Round riêng cho Application Services Architecture** trước khi viết code Backend thật — đây là khoảng trống lớn nhất về mặt rủi ro hệ thống (mục 6 Risk #8), không thể tiếp tục trì hoãn vì số lượng ràng buộc phụ thuộc vào nó đang tăng dần qua mỗi Round (GAP-04 → GAP-05 → GAP-07 → Header/TraceLink Sync → Mode Selection verification — cùng 1 loại rủi ro lặp lại 5 lần).
6. **Chỉ sau khi 1-5 hoàn tất:** tiếp tục DDL Round 4+ (viết bảng thật cho Shared Mechanism + 5 Decision Type), sau đó mới mở Phase API (hiện ~15/100, chưa có gì để mất nếu trì hoãn thêm) và Phase Supabase RLS Policy cụ thể (phụ thuộc trực tiếp vào DDL Round 4+ đã có bảng thật để viết Policy lên).

**Không chốt quyết định nào ở báo cáo này** — đây là review tổng hợp và khuyến nghị thứ tự, theo đúng giới hạn "Review only, No new decisions" của yêu cầu Consolidation.

## Liên kết ngược

Toàn bộ 45 file Decision ([Docs/11_Decisions/](../11_Decisions/)), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [DatabaseBlueprint.md](DatabaseBlueprint.md) / [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md), [DDL_ROUND1-3_DESIGN/REVIEW.md](.), [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) / [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md), [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) / [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DECISION-048_LOCK_REPORT.md](DECISION-048_LOCK_REPORT.md), [OpenQuestions.md](../01_PRD/OpenQuestions.md), [RequirementGaps.md](../01_PRD/RequirementGaps.md), [Backlog.md](../10_Backlog/Backlog.md).
