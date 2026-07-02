# API Architecture Readiness Assessment — AI Mentor OS

> Phạm vi: Task 5 (cross-check) + Mandatory Questions + Final Readiness Section của Round API Architecture Review. **Không thiết kế endpoint/SQL/code.** Tổng hợp kết luận từ [API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md), [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md), [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md).

---

## Task 5 — Cross-check với Application Services / Orchestration / Event / Explainability Architecture / DECISION-048

### 5.1 Không API nào bypass Explainability

| Kiểm tra | Kết quả |
|---|---|
| Mọi write Strong Consistency có cặp TraceLink/Decision Header (COMMAND_QUERY_ARCHITECTURE mục 11.1) đều được map vào đúng 1 Service sở hữu, không có API "ghi tắt" nào được đề xuất ở API_BOUNDARY_ANALYSIS | ✅ Pass |
| ExplainabilityService/DecisionPersistenceService được xác nhận "Never Public" + "AI-Internal-Only" ở mọi tài liệu (API_BOUNDARY_ANALYSIS mục 1.11/1.12, mục 2.2) — không có route nào lộ chúng ra Frontend | ✅ Pass |
| D1/D6/D7/D9a/D9b (5 Decision Type mở rộng bởi DECISION-048) được xác nhận **chưa có cơ chế lưu** (GAP-01/02/05, Open Q#6/#11) ở cả AI_SERVICE_API_REVIEW mục 12 và API_BOUNDARY_ANALYSIS — Round này **không tự đóng gap**, chỉ xác nhận lại đúng vị trí gap, không thiết kế API giả định gap đã đóng | ✅ Pass (đúng giới hạn "Architecture review only") |
| D8 Runtime Reconstruction risk (silent failure) được mang nguyên vẹn từ Orchestration Review sang AI_SERVICE_API_REVIEW mục 8, không bị "làm mờ" để API trông sẵn sàng hơn thực tế | ✅ Pass |

**Kết luận 5.1: Không có API nào trong 4 tài liệu Round này bypass Explainability.** Mọi điểm gap đã biết (GAP-01/02/05, Open Q#6/#11, D8 risk) được giữ nguyên trạng thái mở, không bị API Design "vô tình đóng" bằng cách giả định cơ chế tồn tại.

### 5.2 Không API nào bypass Decision Persistence

| Kiểm tra | Kết quả |
|---|---|
| Mọi API liên quan D1-D9b đều ghi rõ "Persist Required/Recommended/Do Not Persist" đúng theo AI_DECISION_MATRIX, không có API nào tự nâng/hạ mức persistence | ✅ Pass |
| Decision Header mechanism được xác nhận "pending" ở mọi nơi nhắc tới (API_BOUNDARY_ANALYSIS mục 1.9/1.12, AI_SERVICE_API_REVIEW D1/D6/D9b) — không API nào giả định mechanism đã chọn (Header/Detail pattern hay khác, vẫn là quyết định mở của Round 3.6/HEADER_TRACELINK_BOUNDARY_REVIEW) | ✅ Pass |
| Header/TraceLink Boundary (2 cơ chế tách biệt, không gộp, theo HEADER_TRACELINK_BOUNDARY_REVIEW) được tôn trọng — không API nào đề xuất 1 endpoint chung trả về cả "decision đã xảy ra" và "nguồn truy vết" như 1 cấu trúc duy nhất | ✅ Pass |

**Kết luận 5.2: Không có API nào bypass Decision Persistence.**

### 5.3 Không API nào bypass Orchestration Rules

| Kiểm tra | Kết quả |
|---|---|
| Mọi Command trong COMMAND_QUERY_ARCHITECTURE map đúng 1 Service Owner đã chốt ở APPLICATION_SERVICES_ARCHITECTURE — không Command nào được gán cho Service không đúng write-ownership | ✅ Pass |
| 5 Flow (F1-F5) được dùng làm cơ sở cho mục "cần orchestration" ở FRONTEND_BACKEND_INTERACTION_REVIEW mục 5 — không có operation nào được phân loại "không cần orchestration" mà thực ra thuộc 1 trong 5 flow | ✅ Pass |
| Race conditions đã biết (Orchestration Review mục 4: F1↔F3, F1↔F4, F2↔F5) không bị API Design giả định "đã giải quyết" — không tài liệu nào trong Round này tuyên bố các race condition này đã đóng | ✅ Pass |
| Circular dependency tiềm ẩn (Recommendation⇄Teaching⇄KnowledgeExpansion, Orchestration Review mục 5) không bị tạo điều kiện thêm bởi bất kỳ API mới nào — Round này không thêm event/API nối trực tiếp 3 Service này theo hướng tạo vòng | ✅ Pass |

**Kết luận 5.3: Không có API nào bypass Orchestration Rules.**

### 5.4 Tổng kết Task 5

**Không phát hiện vi phạm nào ở cả 3 mục kiểm tra.** Toàn bộ 4 tài liệu Round này được viết bằng cách **map vào** kỷ luật đã chốt từ các Round trước, không phát sinh API mới nào đứng ngoài kỷ luật đó — đúng tinh thần "Architecture review only, no API implementation."

---

## Mandatory Questions

**1. What are the API boundaries?**
9 Capability Service + 2 Service bổ sung có Public API (RoadmapMapping, EvidenceCapture — qua MentorInteraction, AccountLifecycle); 2 Service cross-cutting (Explainability, DecisionPersistence) là Internal/AI-Internal-Only tuyệt đối. Ranh giới chi tiết: [API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md) mục 1.

**2. What are the command boundaries?**
Mỗi Command thuộc đúng 1 Service Owner theo write-ownership CoreDomainMap mục 5; không Command nào ghi vào Aggregate không thuộc domain của Service mình. Chi tiết: [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md) mục 1-10.

**3. What are the query boundaries?**
Query chia 2 nhóm: (a) đọc trực tiếp Supabase được phép — read-only, single-table, append-only, không mang ý nghĩa AI Decision; (b) phải qua Backend — mọi Read Model tổng hợp/Projection hoặc liên quan AI Decision. Chi tiết: [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 2, 6.

**4. Which APIs require Backend authority?**
Toàn bộ API liên quan tới 10 Decision Type (D1-D9b) và toàn bộ Command Strong Consistency (8 cặp ghi, COMMAND_QUERY_ARCHITECTURE mục 11.1) — không Decision Type nào được phép tính toán ở Frontend. Chi tiết: [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 7.

**5. Which APIs can safely read directly (Supabase, không qua Backend)?**
Supabase Auth (đăng ký/đăng nhập); đọc lại `evidence`/`evidence_link`/`learning_session_transition` của chính Learner — dữ liệu append-only, RLS-protected, không cần tính toán lại. Chi tiết: [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 2.1.

**6. Which APIs require orchestration?**
Mọi Command thuộc 5 Flow (F1-F5) và mọi cặp ghi Strong Consistency có TraceLink/Decision Header đi kèm. Chi tiết: [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 5.

**7. Which APIs require explainability generation?**
9/10 Decision Type (D1-D7, D9a, D9b) cần Persisted Record + TraceLink/Decision Header; D8 cần Runtime Reconstruction (không Persisted Record riêng). Không Decision Type nào miễn explainability (DECISION-048). Chi tiết: [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md) mục 1-10.

**8. Which APIs require decision persistence?**
D2, D4, D5 (Persist Required, đã locked); D3 (Persist Required khi build); D1, D6, D7, D9a, D9b (Persist Recommended); D8 (Do Not Persist). Chi tiết: [AI_DECISION_MATRIX.md](../06_Database/AI_DECISION_MATRIX.md) mục bảng, ánh xạ lại ở [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md).

**9. Which APIs are AI-only?**
ExplainabilityService và DecisionPersistenceService (toàn bộ) — không bao giờ Public, chỉ gọi giữa 6 Service nghiệp vụ với nhau. Chi tiết: [API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md) mục 1.11-1.12.

**10. What is the recommended frontend interaction model?**
Frontend gọi Supabase Auth SDK cho Auth; gọi Supabase Client trực tiếp (RLS-protected) cho 1 tập hẹp Read-only append-only; gọi Backend API cho mọi Command và mọi Query mang ý nghĩa AI/orchestration. Backend đóng vai trò BFF hợp nhất cho cả `Apps/frontend` và `Apps/admin`, không cần BFF riêng. Chi tiết: [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 9.

---

## API_ARCHITECTURE_READINESS_ASSESSMENT

| Hạng mục | Điểm | Lý do |
|---|---|---|
| **Backend Module Design** | **~35/100 — BOUNDARIES KNOWN, MODULES NOT STRUCTURED** | Service catalog (9+3+2) và write-ownership đã chốt từ trước; Round này thêm rõ ràng Command/Query boundary + Backend-authority rule — đủ để bắt đầu cấu trúc module/folder theo Service, nhưng chưa có module boundary thật (namespace, dependency injection, package structure) nào được thiết kế |
| **Supabase RLS Design** | **~35/100 — PATTERN KNOWN (auth.uid() = learner_id), POLICY NOT WRITTEN** | DECISION-043 đã chốt `learner.id = auth.users.id`, đủ để viết RLS Policy theo pattern trực tiếp không cần JOIN; Round này bổ sung rõ "đâu là dữ liệu đọc trực tiếp Supabase cần RLS bảo vệ thật (vì là điểm Frontend chạm trực tiếp), đâu chỉ cần RLS làm defense-in-depth (vì Backend đã chặn trước)" — nhưng chưa viết 1 policy SQL nào |
| **DDL Finalization** | **~30/100, không đổi nhiều so với trước Round này** | Round API Architecture không tạo entity/cột mới — không ảnh hưởng DDL trực tiếp. Gián tiếp xác nhận lại 4 entity còn thiếu cho D3/D6-reason/D7/D9a/D9b vẫn là blocker cho DDL Round 4+, không phải phát hiện mới |
| **Backend Implementation** | **~30/100 — API CONTRACT SHAPE KNOWN FOR 6/10 DECISION TYPES, NOT FOR 4** | Tăng nhẹ so với ~25/100 (Round Orchestration) vì giờ có Command/Query/Consistency rõ cho 6/10 Decision Type (D2, D3, D4, D8 đầy đủ; D1, D6 một phần) — nhưng D5/D8(điều kiện)/D9a/D9b vẫn chặn (mục 12, AI_SERVICE_API_REVIEW) nên không thể viết Backend Implementation đầy đủ cho 4/10 |

**Không hạng mục nào đạt "Ready for Implementation" sau Round này** — đúng dự kiến, vì đây là Round phân tích boundary (API Architecture Review), không phải Round build. Mức tăng đáng kể nhất là khả năng trả lời "ai được gọi gì, qua đâu" một cách dứt khoát (Backend Module Design, Supabase RLS Design) — đây là điều kiện cần để bắt đầu 2 Round tiếp theo, không phải kết quả hoàn chỉnh của chúng.

### Điều kiện cần đóng trước khi chuyển sang Backend Module Design / RLS Design / DDL Finalization

1. GAP-01 (D1 — Teaching reasoning không persist), GAP-02 (D5 — Local Expansion không có nơi lưu lý do), GAP-05 (D6 — thiếu cột lý do dependency) — cần Founder/Lead Architect chọn Decision Header mechanism (Round 3.6 mục 3, vẫn mở) trước khi DDL có thể viết bảng Header thật.
2. Open Question #6/#11 (cơ chế Stuck Detection D9a/D9b) — cần 1 Round Domain Architecture bổ sung trước khi API/DDL cho D9a/D9b có ý nghĩa.
3. Điều kiện Runtime Reconstruction cho D8 (input phải truy xuất lại được từ domain khác) — cần xác minh khi cơ chế Mode Selection cụ thể được thiết kế, không phải verify được ở mức kiến trúc thuần.
4. DECISION-046 (Hybrid AI Execution Model — Local AI vs Cloud AI) — vẫn là proposal mở, ảnh hưởng trực tiếp tới Invocation Pattern ở [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md), cần chốt trước khi thiết kế API Contract chi tiết (timeout, retry cụ thể phụ thuộc network hop có tồn tại hay không).

---

## Liên kết ngược

[API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md), [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md), [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md), [APPLICATION_ORCHESTRATION_REVIEW.md](../06_Database/APPLICATION_ORCHESTRATION_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](../06_Database/HEADER_TRACELINK_BOUNDARY_REVIEW.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).
