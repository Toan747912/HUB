# AI Service API Review — AI Mentor OS

> Phạm vi: phân tích kiến trúc invocation pattern cho 10 AI Decision Type (D1-D9b). **Không thiết kế endpoint/payload, không chọn model/provider, không viết code.** Kế thừa [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](../06_Database/AI_DECISION_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](../06_Database/APPLICATION_ORCHESTRATION_REVIEW.md), [HybridAIArchitectureReview.md](../06_Database/HybridAIArchitectureReview.md) (Local AI/Cloud AI, còn là proposal mở — DECISION-046 chưa khoá).

---

## 0. Lưu ý đọc bảng

- **Invocation Pattern** = Local AI (chạy trong Backend process, không network hop) hay Cloud AI (gọi `Apps/ai-service`/external LLM qua network) — Round này **không quyết định** cái nào dùng cho từng Decision (đó là phạm vi HybridAIArchitectureReview/DECISION-046 còn mở), chỉ phân tích **hệ quả kiến trúc** nếu là Cloud AI.
- **Sync/Async** dùng đúng kết luận đã chốt: ghi `TraceLink`/Decision Header luôn **đồng bộ trong transaction** — không liên quan tới việc bản thân AI Decision được tính toán sync hay async với request gốc.
- Failure Handling/Retry kế thừa [APPLICATION_ORCHESTRATION_REVIEW.md](../06_Database/APPLICATION_ORCHESTRATION_REVIEW.md) mục 6-7 (Transaction Risks, Explainability Risks) — không phát sinh chiến lược mới ngoài những gì đã cảnh báo.

---

## 1. D1 — Teaching: Content Selection

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | `roadmap_node_knowledge_node`, `knowledge_node_mastery`, `knowledge_edge` (prerequisite order), Learning Mode hiện tại |
| **Outputs** | KnowledgeNode/nội dung được chọn (hiện không persist nội dung quyết định) |
| **Invocation Pattern** | Chưa chốt (Local/Cloud) — tần suất cao nhất hệ thống (mỗi lượt dạy), nên **chi phí network hop nếu Cloud AI là đáng kể nhất trong toàn hệ thống** — cần cân nhắc kỹ ở Round HybridAIArchitectureReview tiếp theo |
| **Sync/Async** | Sync với request hiển thị nội dung (Learner đang chờ) — không thể async vì Learner cần thấy ngay |
| **Persistence Interaction** | Persist Recommended (chưa Required) — qua DecisionPersistenceService khi mechanism tồn tại (GAP-01) |
| **Explainability Interaction** | Bắt buộc (DECISION-048) — category lý do + KnowledgeNode + thời điểm; **hiện 0% traceability** (GAP-01 chưa đóng) |
| **Failure Handling** | Nếu AI service down/timeout: không có fallback nào được thiết kế — đây là khoảng trống chưa có Round nào đánh giá (ngoài phạm vi review trước) |
| **Retry Requirements** | Chưa thiết kế — vì D1 là sync, retry phải có timeout ngắn (Learner đang chờ), không thể dùng chiến lược retry dài như Recommendation |

## 2. D2 — Assessment: Evidence Verdict

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | `Evidence` + `EvidenceLink` (stance/weight/target), `KnowledgeNodeMastery` hiện tại |
| **Outputs** | `AssessmentResult` (8 trường, DECISION-030) + `KnowledgeNodeMastery` cập nhật |
| **Invocation Pattern** | Chưa chốt — nhưng khác D1 ở điểm: **không cần hiển thị ngay cho Learner** (Eventual qua event `EvidenceRecorded`), nên network hop Cloud AI ít rủi ro hơn về latency cảm nhận |
| **Sync/Async** | **Async** với hành động gốc (Learner gửi phản hồi) — AssessmentService consume `EvidenceRecorded` qua event, đã chốt Eventual ở Boundary Matrix |
| **Persistence Interaction** | Persist Required, đã locked, đã implement — `assessment_result` + `knowledge_node_mastery` |
| **Explainability Interaction** | Bắt buộc, đã locked (DECISION-027/038) — atomic `TraceLink` trong cùng transaction (GAP-04) |
| **Failure Handling** | Atomic write thất bại giữa chừng → Postgres rollback toàn bộ, an toàn (Orchestration Review mục 6 #1) |
| **Retry Requirements** | Event consumer down khi `EvidenceRecorded` phát ra → cần retry/dead-letter queue khi resume (Boundary Matrix mục 5) — không ảnh hưởng Service khác, không sai dữ liệu |

## 3. D3 — Recommendation: Signal Synthesis

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | `KnowledgeRegressionDetected`, `SelfAssessmentMismatchDetected`, dependency-gap query (Roadmap+Knowledge), pause-eligible signal (Learning Session) — 4 nguồn độc lập, tốc độ khác nhau |
| **Outputs** | `RecommendationProposal` + `traced_to[]` |
| **Invocation Pattern** | Chưa chốt — đặc thù riêng: phải tổng hợp **nhiều signal bất đồng bộ**, không có request đơn lẻ "1 input → 1 output" như D1/D2 |
| **Sync/Async** | Async hoàn toàn — tổng hợp tín hiệu (không có khái niệm "transaction chờ tổng hợp" ở tầng DB, Orchestration Review mục 6 #3) |
| **Persistence Interaction** | Persist Required khi build — schema-provisioned (`trace_link.source_type`), chưa build |
| **Explainability Interaction** | Bắt buộc `traced_to[]`, đã locked, không ngoại lệ — kể cả loại "pause" |
| **Failure Handling** | Không có cơ chế debounce/aggregation nào được thiết kế cho 4 nguồn signal dồn dập — rủi ro nghẽn logic đã flag (Orchestration Review mục 3 #2), chưa giải |
| **Retry Requirements** | Đề xuất bị trễ không gây mất toàn vẹn (Proposal-Only) — RecommendationService tự retry/dead-letter, không ảnh hưởng Service khác |

## 4. D4 — Knowledge Expansion: Deep/Structural

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | `knowledge_node` hiện tại, `knowledge_edge` hiện có, ngữ cảnh RoadmapNode active |
| **Outputs** | `knowledge_edge` mới + `expansion_record` (kèm `expansion_reason` hiển thị Learner) |
| **Invocation Pattern** | Chưa chốt — tần suất thấp hơn D1/D2 nhiều (chỉ khi cần mở rộng cấu trúc), network hop Cloud AI ít rủi ro latency hơn |
| **Sync/Async** | Có thể async với trigger gốc (`RoadmapNodeApproved`), nhưng **write phải sync/atomic nội bộ** (`KnowledgeEdge` + `ExpansionRecord` cùng transaction) |
| **Persistence Interaction** | Persist Required, đã locked, đã implement |
| **Explainability Interaction** | Bắt buộc, hiển thị Learner — đã locked, đã có field `expansion_reason` |
| **Failure Handling** | Atomic write rollback an toàn — giống D2 |
| **Retry Requirements** | Chưa cần đặc biệt — tần suất thấp, không có signal dồn dập như D3 |

## 5. D5 — Knowledge Expansion: Local

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | Giống D4, quy mô nhỏ hơn |
| **Outputs** | Chỉ `knowledge_edge` mới |
| **Invocation Pattern** | Chưa chốt — tự động, không approval, có thể tần suất cao hơn D4 đáng kể vì "nhỏ và tự động" theo định nghĩa |
| **Sync/Async** | Async với trigger, write cần atomic nội bộ (**hiện không atomic được — chưa có nơi ghi lý do, GAP-02**) |
| **Persistence Interaction** | Persist Required, đã locked, **chưa implement** (GAP-02 — chặn) |
| **Explainability Interaction** | Bắt buộc, nội bộ (không hiển thị Learner) — đã locked nhưng **không có cơ chế lưu** |
| **Failure Handling** | **Không thể đánh giá** — vì chưa có write path cho phần lý do, không biết failure mode của phần đó là gì cho tới khi GAP-02 đóng |
| **Retry Requirements** | Chưa thể thiết kế — phụ thuộc GAP-02 |

## 6. D6 — Roadmap Mapping: Dependency Edge Selection

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | `roadmap_node` đang xây/mở rộng, `knowledge_node` liên quan, có thể `knowledge_edge` (chuỗi prerequisite) |
| **Outputs** | 1 dòng `roadmap_node_knowledge_node`, nên kèm `approval_record` |
| **Invocation Pattern** | Chưa chốt — tần suất theo nhịp xây Roadmap, không theo nhịp học (thấp hơn D1) |
| **Sync/Async** | Sync nếu xảy ra trong luồng Roadmap Governance (Learner đang chờ approve) |
| **Persistence Interaction** | Persist Recommended — đã persist kết quả, thiếu lý do (GAP-05) |
| **Explainability Interaction** | Bắt buộc (DECISION-048, mở rộng) — hiện là khoảng trống, chưa có field lý do dependency |
| **Failure Handling** | Atomic với `ApprovalRecord` khi Governance áp dụng — rollback an toàn nếu implement đúng |
| **Retry Requirements** | Chưa thiết kế — phụ thuộc GAP-05 đóng trước |

## 7. D7 — Discovery: Self-Assessment Mismatch Detection

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | Self-assessment input Learner (nguồn cụ thể chưa chốt, Open Question #5), `AssessmentResult`/`Evidence` lịch sử |
| **Outputs** | `DiscoverySession` + `SelfAssessmentMismatch` (0..n) + `TraceLink` (tự-trace) |
| **Invocation Pattern** | Chưa chốt — tần suất theo nhịp Discovery (Goal Clarification/Continuous Discovery), không liên tục |
| **Sync/Async** | So sánh self-assessment vs Assessment history là Eventual (Boundary Matrix mục 3 #5) — phát hiện trễ vài phút/giờ vẫn có giá trị |
| **Persistence Interaction** | Persist Recommended — entity tồn tại, cơ chế xác minh chưa chốt |
| **Explainability Interaction** | Bắt buộc tự-trace, mới theo DECISION-048 — Discovery không còn chỉ là điểm đến trace cho Recommendation |
| **Failure Handling** | Atomic với TraceLink tự-trace — rollback an toàn nếu implement đúng |
| **Retry Requirements** | Chưa thiết kế — phụ thuộc Open Question #5 (nguồn self-assessment input) đóng trước |

## 8. D8 — Mentor Interaction: Learning Mode Selection

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | Tín hiệu tương tác hiện tại trong `MentorSession` (chưa chốt cụ thể) |
| **Outputs** | `MentorSessionModeChanged` + Mode mới (không có Detail persist) |
| **Invocation Pattern** | Chưa chốt — duy nhất trong 10 Decision không có Persisted Record cho chính nó |
| **Sync/Async** | Sync, atomic tự thân (1 row `mentor_session.mode`) |
| **Persistence Interaction** | **Do Not Persist** (mặc định, DECISION-027/048) — re-derivable hoàn toàn từ `MentorSession` hiện tại |
| **Explainability Interaction** | Bắt buộc qua **Runtime Reconstruction**, không qua Persisted Record (DECISION-048, Round 4.2) — **điều kiện áp dụng chưa xác minh**: mọi input dùng để quyết định phải tự truy xuất lại được từ domain khác (Evidence/AssessmentResult), cơ chế Mode Selection cụ thể chưa từng chốt |
| **Failure Handling** | **Silent failure risk** — nếu điều kiện Runtime Reconstruction sai (input chưa từng persist ở đâu), không có gì báo lỗi; hệ thống "chạy bình thường" cho tới khi có người hỏi "vì sao" và nhận câu trả lời rỗng/sai (Orchestration Review mục 7 #2 — rủi ro explainability nghiêm trọng nhất tìm được, không phát hiện được bằng monitoring lỗi thông thường) |
| **Retry Requirements** | Không áp dụng — không có write nào cần retry ngoài 1 row atomic |

## 9. D9a — Mentor Interaction: Stuck Detection (signal)

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | Lịch sử phản hồi/Evidence gần nhất trong `SubSession`/`MentorSession` (ngưỡng chưa chốt, Open Question #11) |
| **Outputs** | Tín hiệu "Stuck" (chưa có entity/event chính thức) |
| **Invocation Pattern** | **Hoàn toàn chưa tồn tại cơ chế** — không thể phân tích invocation pattern cụ thể |
| **Sync/Async** | Chưa chốt |
| **Persistence Interaction** | Persist Recommended — chưa có entity |
| **Explainability Interaction** | Bắt buộc (DECISION-048, mở rộng), cơ chế chưa chốt |
| **Failure Handling** | Không thể đánh giá — cơ chế Detection chưa tồn tại |
| **Retry Requirements** | Không thể thiết kế — blocked bởi Open Question #6/#11 |

## 10. D9b — Teaching: Intervention Tier Selection

| Thuộc tính | Giá trị |
|---|---|
| **Inputs** | Tín hiệu D9a (khi tồn tại) |
| **Outputs** | Mức can thiệp (hint level / direct fix) — chưa có entity/field ghi nhận |
| **Invocation Pattern** | Trùng bản chất D1 (Content Selection, Round 3.9) — khả năng dùng chung cơ chế invocation với D1 khi cả 2 được thiết kế |
| **Sync/Async** | Sync với hiển thị Learner (giống D1) |
| **Persistence Interaction** | Persist Recommended — chưa có entity |
| **Explainability Interaction** | Bắt buộc (DECISION-048), cơ chế chưa chốt |
| **Failure Handling** | Không thể đánh giá đầy đủ — phụ thuộc D9a tồn tại trước; rủi ro Criticality leo lên A nếu "direct fix" được chọn làm cơ chế (chưa chốt) |
| **Retry Requirements** | Chưa thiết kế — blocked bởi D9a |

---

## 11. Tổng hợp Sync vs Async

| Sync (Learner đang chờ) | Async (Eventual, qua event/signal) |
|---|---|
| D1 (Content Selection), D6 (khi trong luồng Governance), D8 (Mode change), D9b (Intervention) | D2 (Evidence→Assessment), D3 (Signal Synthesis), D7 (Discovery so sánh lịch sử) |

D4/D5 (Knowledge Expansion) ở giữa — trigger có thể async, nhưng write nội bộ luôn cần atomic/sync.

## 12. Tổng hợp khoảng trống chặn (không thể trả lời đầy đủ Inputs/Outputs/Failure)

| Decision | Lý do chưa thể phân tích đầy đủ |
|---|---|
| D5 | GAP-02 (chưa có nơi lưu lý do nội bộ) |
| D6 | GAP-05 (thiếu cột lý do dependency) |
| D8 | Điều kiện Runtime Reconstruction chưa xác minh |
| D9a, D9b | Cơ chế Stuck Detection hoàn toàn chưa tồn tại (Open Question #6/#11) |

**4/10 Decision Type chưa đủ thông tin để thiết kế API Contract đầy đủ ở Round tiếp theo** — đây là phát hiện chính của Round này cho phần AI Service, không phải lỗi của Round này (đúng giới hạn "Architecture review only").

---

## Liên kết ngược

[API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md), [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md), [AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](../06_Database/AI_DECISION_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](../06_Database/APPLICATION_ORCHESTRATION_REVIEW.md), [HybridAIArchitectureReview.md](../06_Database/HybridAIArchitectureReview.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).
