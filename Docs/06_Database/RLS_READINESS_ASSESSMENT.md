# RLS Readiness Assessment — AI Mentor OS

> Phạm vi: Task 6 (cross-check) + Mandatory Questions + Final Readiness Section của Round Supabase RLS Architecture Review. **Không viết SQL Policy, không implement.** Tổng hợp [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md).

---

## Task 6 — Cross-check

### 6.1 No Ownership Conflicts

| Kiểm tra | Kết quả |
|---|---|
| Mọi bảng Learner-owned có đúng 1 Module ghi (đối chiếu [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) Owned Aggregates) | ✅ Pass — không bảng nào trong [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) có 2 Service Rule khác nhau |
| `knowledge_node_mastery` tiếp tục giữ đúng write-owner Assessment Module (không bị Round RLS gán nhầm về Knowledge Graph Module dù tên gọi dễ nhầm) | ✅ Pass — [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md) mục 1.5 xác nhận lại đúng DECISION-026 |
| `roadmap_node_knowledge_node` giữ đúng write-owner Goal & Roadmap Module, Knowledge Graph Module chỉ đọc | ✅ Pass — đúng [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 1.1 |

### 6.2 No Security Conflicts

| Kiểm tra | Kết quả |
|---|---|
| Không Module nào được cấp Policy ghi vào bảng không thuộc write-ownership của nó | ✅ Pass — mọi "Service Rule" ở [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md) chỉ liệt đúng 1 Service |
| Cloud AI xác nhận "Never Trusted với Database" không bị mâu thuẫn ở bất kỳ tài liệu nào khác trong Round này | ✅ Pass — nhất quán xuyên [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md) |
| Frontend-direct-access list (Round API: Auth + 2 bảng read-only) không bị Round này mở rộng thêm ngoài kế hoạch | ✅ Pass — [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md) mục 6 giữ đúng nguyên danh sách cũ, không thêm bảng nào |

### 6.3 No Explainability Violations

| Kiểm tra | Kết quả |
|---|---|
| `trace_link` xác nhận lại "Never Exposed" cho `authenticated` — không Policy SELECT nào được đề xuất cho Learner | ✅ Pass — [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md) mục 1.11 |
| Không actor nào ngoài ExplainabilityService có quyền ghi `trace_link` trong toàn bộ Boundary Matrix | ✅ Pass — [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md) mục 1, cột Explainability-only toàn D trừ đúng 1 actor |
| Explainability vẫn được xác nhận là Supporting Application Module (không phải Infrastructure thuần) — không bị Round RLS vô tình "hạ cấp" thành 1 bảng thông thường chỉ cần RLS đơn giản | ✅ Pass — [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) giữ category riêng "Explainability-only", không gộp vào "AI-owned"/"Shared" |

### 6.4 No Decision-Persistence Violations

| Kiểm tra | Kết quả |
|---|---|
| Decision Header (mechanism pending) tiếp tục không có Policy nào được viết "tạm" trước khi mechanism chốt | ✅ Pass — mọi nơi đều ghi "chưa build"/"pending", không tự giả định cấu trúc |
| Decision Persistence Module và Explainability Module tiếp tục tách biệt, không gộp 1 Policy chung cho cả 2 (đúng HEADER_TRACELINK_BOUNDARY_REVIEW) | ✅ Pass — 2 mục riêng ở mọi tài liệu Round này |

**Kết luận Task 6: Không phát hiện vi phạm nào ở cả 4 mục kiểm tra.** Toàn bộ RLS Architecture của Round này được xây từ việc **map vào** kết luận đã chốt của 6 Round trước (Domain, Database Blueprint, DDL 1-3, Explainability, Event, API, Backend Module) — không phát sinh ownership/security/explainability/decision-persistence rule mới nào đứng ngoài các Round đó.

---

## Mandatory Questions

**1. Who are all actors?**
8 actor: Learner, Admin, Local AI, Cloud AI, Background Job, System Process, Explainability Service, Decision Persistence Service. Chi tiết: [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md) mục 1.

**2. Which actors are trusted?**
Local AI, Background Job, System Process, Explainability Service, Decision Persistence Service — chạy trong trust boundary `Apps/backend`/DB engine. Chi tiết: [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md) mục 2.

**3. Which actors are partially trusted?**
Learner, Admin — danh tính xác thực qua Supabase Auth, nhưng input/hành vi không được tin tuyệt đối, mọi write qua Application Service validate.

**4. Which actors are never trusted?**
Cloud AI — actor duy nhất không nên có bất kỳ Supabase credential nào, kể cả tạm thời/phạm vi hẹp.

**5. Which entities are learner-owned?**
13 bảng đã DDL + 4 bảng dự kiến (Round 4+) — danh sách đầy đủ: [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) mục 2.

**6. Which entities are shared?**
`knowledge_node`, `knowledge_edge`, `expansion_record` — đọc công khai cho `authenticated`, ghi chỉ qua service_role (KnowledgeExpansionService).

**7. Which entities must never be directly exposed?**
`trace_link`, Decision Header (pending), `auth.users` (không phải bảng Backend tự quản — Backend không tự ý đọc/ghi ngoài cách Supabase Auth quy định).

**8. What may Frontend access directly?**
Supabase Auth SDK (đăng ký/đăng nhập/refresh); `evidence`/`evidence_link` (đọc lịch sử của chính mình); `learning_session_transition` (đọc audit log của chính mình). Không gì khác.

**9. What must always go through Backend?**
Mọi Command; mọi Query tổng hợp/Projection; toàn bộ 3 bảng Shared (Learner chỉ đọc trực tiếp, không ghi trực tiếp); toàn bộ `trace_link`/Decision Header.

**10. How should AI services authenticate?**
Local AI: không cần — kế thừa `service_role` của Backend. Cloud AI: chỉ authenticate 1 chiều (Backend → Cloud AI provider, qua API key của Backend) — **không bao giờ** nhận credential Supabase. Chi tiết: [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md) mục 7.

**11. How should Explainability Service access data?**
Không qua RLS (chạy dưới `service_role`, bypass) — ranh giới thật là **code-level internal authorization**: chỉ 4 Core Module (Assessment/Recommendation/Knowledge Graph/Discovery) được gọi nó, thực thi qua function nội bộ, không qua route Public nào. Không có Policy `authenticated` nào cho `trace_link`.

**12. How should Decision Persistence Service access data?**
Cùng mô hình như Q11 — code-level internal authorization, không RLS, tách biệt khỏi Explainability Service (không gộp Module/Policy).

**13. What are the highest-risk security boundaries?**
(a) Cloud AI vô tình nhận credential Supabase (dù tạm thời) — đây là rủi ro nghiêm trọng nhất vì nó phá vỡ hoàn toàn trust boundary đã thiết kế; (b) `service_role` bypass RLS đồng nghĩa **mọi lỗi logic trong Application Service đều không được RLS chặn** — đặc biệt cho Assessment Module (write-owner `KnowledgeNodeMastery` duy nhất) và Explainability Module (cơ chế trace duy nhất); (c) `roadmap_node_knowledge_node` 3-hop JOIN — rủi ro hiệu năng có thể dẫn tới áp lực "tắt RLS cho nhanh" trong giai đoạn implement, đây là **sai lầm phải tránh tuyệt đối** (xem Q14).

**14. What are the most dangerous RLS mistakes?**
(a) **Giả định RLS phân biệt được giữa Local AI/Background Job/System Process/Explainability/Decision Persistence** — không thể, vì chúng dùng chung `service_role`; nếu thiết kế Policy dựa trên giả định sai này, toàn bộ Policy đó vô nghĩa khi chạy thật. (b) **Tắt RLS "tạm thời" cho bảng hiệu năng kém (`roadmap_node_knowledge_node`) rồi quên bật lại** — vì đây không phải bảng Shared, tắt RLS nghĩa là mọi Learner đọc được Roadmap của mọi Learner khác. (c) **Viết Policy SELECT cho `trace_link`/Decision Header "để debug nhanh" rồi không gỡ** — phá vỡ nguyên tắc Never Exposed đã xác nhận xuyên suốt 6 Round trước. (d) **Nhầm `evidence`/`assessment_result` (Learner-owned, Strict) với `knowledge_node` (Shared)** khi viết Policy cho 2 bảng có vẻ "liên quan tri thức" — đây là nhầm lẫn category dễ xảy ra nhất do tên bảng gây liên tưởng sai.

**15. Is the platform ready for policy authoring?**
**Có, với điều kiện** — xem mục Readiness Assessment dưới đây. Boundary đã đủ rõ cho 13/17 bảng đã DDL (Strict RLS pattern đã có sẵn từ DDL Round 1-3, Round này chỉ hệ thống hoá lại); 3 bảng Shared đã rõ; 1 bảng Explainability-only đã rõ là "Never Exposed". Vẫn **chưa Ready hoàn toàn** vì: 4 bảng Round 4+ chưa DDL, Decision Header chưa chốt mechanism, Admin authorization scope chưa chốt.

---

## RLS_READINESS_ASSESSMENT

| Hạng mục | Điểm | Lý do |
|---|---|---|
| **Supabase Policy Authoring** | **~65/100 — STRATEGY COMPLETE FOR 13/17 TABLE, PATTERN REUSABLE FOR REST** | Tăng mạnh từ ~45/100 (Round Backend Module) — đây là Round đầu tiên trả lời dứt khoát "Policy nào cho bảng nào, theo pattern gì" cho toàn bộ bảng đã DDL; có thể bắt đầu viết SQL Policy thật cho 13 bảng Strict RLS + 3 bảng Shared ngay khi được yêu cầu. Chưa đạt 100 vì: 4 bảng Round 4+ chưa DDL (không thể viết Policy cho bảng chưa tồn tại), Decision Header pending, và **rủi ro Q14(a) (giả định sai về service_role) cần được Founder/Lead Architect xác nhận đã hiểu đúng trước khi bất kỳ ai viết SQL thật** |
| **DDL Finalization** | **~40/100, tăng nhẹ** | RLS Architecture không tạo cột/bảng mới, nhưng xác nhận lại dứt khoát **không cần denormalize `learner_id` ngay** (có thể viết Policy 3-hop JOIN được, chỉ là rủi ro hiệu năng, không phải blocker) — gỡ bớt 1 phần lưỡng lự đã treo từ DDL Round 1; vẫn bị chặn bởi đúng các gap đã biết (GAP-01/02/05, Open Q#6/#11) không liên quan tới RLS |
| **Backend Implementation** | **~55/100, tăng nhẹ** | Mức tăng nhỏ so với ~50/100 (Round Backend Module) — Round này không thêm code-level boundary mới, nhưng xác nhận rõ ràng **Explainability/Decision Persistence Module cần internal authorization riêng (code, không phải RLS)** — đây là 1 yêu cầu implementation cụ thể hơn so với Round trước, dù chưa viết |
| **Production Deployment** | **~15/100 — NEW SECURITY RISK SURFACE IDENTIFIED, NOT MITIGATED** | Mới đánh giá lần đầu. Round này phát hiện rủi ro triển khai thật cụ thể nhất từ đầu dự án tới giờ: **Cloud AI credential isolation** phải được đảm bảo ở tầng deployment (secrets management, network policy — Cloud AI process/container không được có biến môi trường Supabase nào) — đây là quyết định Infrastructure/Deployment, chưa Round nào (kể cả Backend Module) đánh giá cụ thể; cũng chưa có Round nào xác nhận **`service_role` key được lưu/luân chuyển thế nào trong môi trường thật** |

**Không hạng mục nào đạt "Ready for Implementation"** — nhưng Supabase Policy Authoring (~65/100) là điểm cao nhất trong toàn bộ chuỗi Round Architecture Review tới giờ, phản ánh đúng tính chất Round này: nó trả lời 1 câu hỏi hẹp hơn (RLS strategy) nhưng trả lời **gần như đầy đủ** cho phần đã có DDL.

### Điều kiện cần đóng trước khi viết SQL Policy thật

1. **Founder/Lead Architect xác nhận đã hiểu đúng giới hạn của RLS với `service_role`** (Q14a) — nếu không, rủi ro lớn nhất là viết Policy tưởng như bảo vệ được nhưng thực ra vô nghĩa với mọi actor Backend-side.
2. **Admin authorization scope** (cross-Learner read phạm vi gì) — cần 1 Decision riêng, chưa có.
3. **DDL Round 4+** cho `mentor_session`/`discovery_session`/`self_assessment_mismatch`/`recommendation_proposal` — Policy chỉ có thể viết sau khi bảng tồn tại.
4. **Decision Header mechanism** — cần chốt trước khi biết Policy của nó nằm trong nhóm "Strict RLS" hay "Never Exposed" (xem [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) mục 1 dòng 21).
5. **Quyết định denormalize `learner_id` cho `roadmap_node`/`roadmap_node_knowledge_node` hay giữ JOIN sâu** — không blocker, nhưng nên chốt trước khi viết Policy thật để tránh viết lại.

---

## Liên kết ngược

[RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [BACKEND_MODULE_READINESS_ASSESSMENT.md](BACKEND_MODULE_READINESS_ASSESSMENT.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md).
