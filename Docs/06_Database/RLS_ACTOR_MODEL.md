# RLS Actor Model — AI Mentor OS

> **⛔ SUPERSEDED (2026-07-02):** This document describes a Postgres/Supabase RLS architecture that was never implemented. [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md) establishes MongoDB as the canonical persistence platform, with access control enforced entirely in the NestJS application layer (JWT + RBAC) instead of database-level row security. Retained for historical record only — do not use as current architecture guidance.


> Phạm vi: phân tích kiến trúc actor/trust cho Authorization Architecture. **Không viết SQL Policy, không implement.** Kế thừa [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md).

---

## 0. Sự thật nền tảng phải nói trước (Supabase-specific, không phải giả định)

**Supabase chỉ có 3 "vai" (role) ở tầng Postgres mà RLS thực sự nhìn thấy: `anon`, `authenticated`, `service_role`.** `service_role` **bỏ qua hoàn toàn RLS** (bypass, không phải "được phép mọi thứ qua policy" — RLS không chạy với role này). Đây là sự thật kỹ thuật quan trọng nhất của toàn Round này: **8 actor được đề bài yêu cầu liệt kê không map 1-1 vào 3 role Postgres** — nhiều actor (Local AI, Background Job, System Process, Explainability Service, Decision Persistence Service) đều chạy **trong `Apps/backend`** và rất có thể dùng **chung 1 `service_role` credential**. Nghĩa là: **RLS không thể, và không nên được kỳ vọng, phân biệt giữa các actor này** — sự phân biệt đó phải nằm ở **Application Layer** (đúng Module boundary đã chốt ở [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md)), không phải ở Database Layer. Toàn bộ tài liệu này được viết với nguyên tắc này làm nền.

---

## 1. Bảng Actor đầy đủ

### 1.1 Learner

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Học, phản hồi, phê duyệt Roadmap, xác nhận đề xuất, xem tiến độ/lý do AI |
| **Read Permissions** | Dữ liệu của chính mình (mọi bảng Learner-owned, xem [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md)); dữ liệu Shared (Knowledge Graph, đọc công khai cho mọi `authenticated`) |
| **Write Permissions** | Tạo `Goal`, `Evidence` (qua phản hồi), `DiscoverySession` input, phê duyệt/từ chối `RoadmapNode` (qua `ApprovalRecord`), confirm Pause — **toàn bộ qua Backend, không ghi trực tiếp bảng AI-owned/System-owned** |
| **Restricted Areas** | `trace_link`, Decision Header (mechanism pending), bảng của Learner khác, mọi write trực tiếp vào `KnowledgeNodeMastery`/`AssessmentResult`/`RecommendationProposal` |
| **Trust Level** | **Partially Trusted** — danh tính xác thực qua Supabase Auth (`auth.uid()`), nhưng **không được tin về tính đúng đắn nghiệp vụ của input** (mọi input phải qua validate/orchestration ở Backend trước khi trở thành state nghiệp vụ) |

### 1.2 Admin

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Vận hành/support — xem dữ liệu nhiều Learner để debug/hỗ trợ, **không** tham gia luồng học trực tiếp |
| **Read Permissions** | Cross-Learner read cho mục đích vận hành — phạm vi cụ thể (toàn bộ hay theo yêu cầu hỗ trợ) **chưa được PRD/Domain Architecture chốt** — ghi nhận là khoảng trống, không tự giả định |
| **Write Permissions** | Tối thiểu — Admin **không nên** có quyền ghi nghiệp vụ thay Learner (vd tự sửa `KnowledgeNodeMastery`) trừ khi có 1 Decision riêng cho phép can thiệp thủ công, hiện chưa có |
| **Restricted Areas** | Mọi write nghiệp vụ trực tiếp (giống Learner, Admin không bypass Application Service nào) |
| **Trust Level** | **Partially Trusted** — danh tính xác thực qua `Apps/admin`, nhưng **không có role Postgres riêng trong Supabase mặc định** (xem mục 0) — phải đi qua `Apps/backend` với 1 lớp authorization riêng (custom claim hoặc bảng `admin_user`), không dựa vào RLS để phân biệt Admin vs Learner ở tầng DB |

### 1.3 Local AI

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Tính toán AI Decision (D1-D9b) chạy **trong process `Apps/backend`** (theo [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md), DECISION-046 vẫn mở) |
| **Read Permissions** | Mọi bảng cần đọc để tính toán Decision (qua Module Public Surface, không raw query) |
| **Write Permissions** | Ghi qua đúng Application Service sở hữu (vd AssessmentService ghi `assessment_result`) — Local AI **không tự ghi DB**, nó là 1 thành phần *trong* Service, không phải actor DB riêng |
| **Restricted Areas** | Không có quyền DB riêng nó — mọi quyền là quyền của `Apps/backend` (service_role) |
| **Trust Level** | **Trusted** — chạy trong cùng trust boundary với `Apps/backend`, nhưng **không phải actor RLS phân biệt được** (mục 0) — trust ở đây là trust kiến trúc (code review, Module boundary), không phải trust do RLS cấp |

### 1.4 Cloud AI

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Tính toán AI Decision qua network hop tới `Apps/ai-service`/external LLM provider |
| **Read Permissions** | **Không nên có quyền đọc Supabase trực tiếp** — chỉ nhận input đã được Backend chuẩn bị (đúng [AI_SERVICE_API_REVIEW.md](../07_API/AI_SERVICE_API_REVIEW.md), AI Provider Infrastructure Module là Port/Adapter, không phải Cloud AI tự query DB) |
| **Write Permissions** | **Không có** — Cloud AI trả output về Backend, Backend ghi DB qua đúng Application Service, Cloud AI không bao giờ cầm credential ghi DB |
| **Restricted Areas** | Toàn bộ Supabase — Cloud AI không nên có bất kỳ Supabase credential nào (`service_role` hay khác), kể cả tạm thời |
| **Trust Level** | **Never Trusted (với Database)** — đây là actor duy nhất trong 8 actor **không nên có đường dẫn kỹ thuật nào tới Supabase**, dù chạy trong kiến trúc của chính dự án; nó chỉ được tin ở mức "trả lời hợp lệ cho 1 lời gọi cụ thể", không được tin với quyền truy cập dữ liệu |

### 1.5 Background Job

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Retry/dead-letter cho Event consumer thất bại ([BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 3.5) |
| **Read Permissions** | Đọc dead-letter queue/Event Bus state — không đọc trực tiếp bảng nghiệp vụ ngoài việc "đánh thức lại" Service đã từng thất bại |
| **Write Permissions** | Không tự ghi DB nghiệp vụ — chỉ publish lại Event để Service nghiệp vụ xử lý (Service đó mới ghi) |
| **Restricted Areas** | Mọi bảng nghiệp vụ trực tiếp |
| **Trust Level** | **Trusted** — cùng trust boundary `Apps/backend`, cùng giới hạn ở mục 0 (không phân biệt được bằng RLS) |

### 1.6 System Process

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Trigger DB (versioning `row_version`, History Table — DECISION-044/045), migration | 
| **Read Permissions** | Đọc row đang bị sửa (trong phạm vi trigger) |
| **Write Permissions** | Ghi `history.<table>` (trigger-maintained), tăng `row_version` — **không phải actor nghiệp vụ**, là cơ chế DB engine-level |
| **Restricted Areas** | Không áp dụng — System Process không "quyết định" gì, chỉ thực thi cơ chế đã định nghĩa sẵn ở DDL |
| **Trust Level** | **Trusted** — chạy ở tầng DB engine (Postgres trigger function), tách hẳn khỏi mọi actor ứng dụng, trust tuyệt đối vì phạm vi hành động cố định, không nhận input tuỳ biến từ bên ngoài |

### 1.7 Explainability Service

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Ghi `trace_link` duy nhất toàn hệ thống (DECISION-038) |
| **Read Permissions** | Không cần đọc rộng — chỉ cần xác nhận `(source_id, target_id)` tồn tại (có thể tin tưởng caller đã validate, hoặc tự validate tối thiểu) |
| **Write Permissions** | `trace_link` — **chỉ Module này được ghi**, theo đúng nguyên tắc "Cơ chế ghi TraceLink duy nhất" |
| **Restricted Areas** | Mọi bảng nghiệp vụ khác — Explainability Module không có lý do đọc/ghi bất kỳ Aggregate nào ngoài `trace_link` |
| **Trust Level** | **Trusted**, nhưng cần **internal authorization riêng trong `Apps/backend`** (không phải RLS) để đảm bảo *chỉ* 4 Core Module (Assessment/Recommendation/Knowledge Graph/Discovery) gọi được nó — vì `service_role` không phân biệt được Module nào đang gọi (mục 0), đây phải là 1 quy ước code-level (vd chỉ expose function nội bộ, không expose qua route Public nào) |

### 1.8 Decision Persistence Service

| Thuộc tính | Giá trị |
|---|---|
| **Responsibilities** | Đăng ký AI Decision (forward registry, mechanism pending) |
| **Read Permissions** | Tương tự Explainability Service — tối thiểu |
| **Write Permissions** | Decision Header (khi mechanism tồn tại) — chỉ Module này ghi |
| **Restricted Areas** | Giống Explainability Service |
| **Trust Level** | **Trusted**, cùng giới hạn internal authorization như mục 1.7 — không tách biệt được bằng RLS, phải tách biệt bằng code/Module boundary |

---

## 2. Phân loại Trust Level (trả lời Mandatory Question 2-4)

| Trust Level | Actor | Lý do |
|---|---|---|
| **Trusted** | Local AI, Background Job, System Process, Explainability Service, Decision Persistence Service | Chạy trong trust boundary `Apps/backend` (hoặc DB engine), không nhận input thô trực tiếp từ bên ngoài hệ thống mà chưa qua validate |
| **Partially Trusted** | Learner, Admin | Danh tính được xác thực (Supabase Auth), nhưng **input/hành vi không được tin tuyệt đối** — mọi write phải qua Application Service validate, không có quyền bypass orchestration |
| **Never Trusted (với Database)** | Cloud AI | Actor duy nhất chạy ngoài trust boundary vật lý của `Apps/backend` (network hop tới provider khác) — không bao giờ cấp credential truy cập Supabase, bất kể mức độ "tin tưởng" về chất lượng output |

**Lưu ý quan trọng:** "Trusted" ở đây là trust **kiến trúc** (chạy trong boundary do chính dự án kiểm soát), không phải trust **tuyệt đối về hành vi đúng** — 1 bug trong Local AI hay Background Job vẫn có thể gây hại, nhưng giải pháp cho rủi ro đó là Module boundary/code review (đã thiết kế ở Backend Module Architecture Round), không phải RLS, vì RLS không nhìn thấy sự khác biệt giữa các actor "Trusted" này.

---

## 3. Hệ quả kiến trúc (chuẩn bị cho các tài liệu tiếp theo)

1. **RLS Policy thật sự chỉ cần phân biệt 2 nhóm: `Learner` (authenticated, `auth.uid()`) và "mọi actor Trusted khác" (service_role, bypass RLS).** Đây là kết luận quan trọng nhất của Round này cho [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md).
2. **Admin cần 1 cơ chế riêng** — không có sẵn trong Supabase 3-role model, cần quyết định (custom claim trên JWT, hay bảng `admin_user` + check ở Backend) — **đây là 1 khoảng trống mới phát hiện ở Round này**, chưa từng được Round nào trước đó (kể cả API Architecture) phân tích.
3. **Cloud AI không bao giờ nên cầm `service_role` hoặc bất kỳ Supabase credential nào** — nếu kiến trúc hiện tại có bất kỳ đường nào cho phép điều này, đó là lỗi nghiêm trọng nhất có thể xảy ra (xem [RLS_READINESS_ASSESSMENT.md](RLS_READINESS_ASSESSMENT.md) mục "highest-risk security boundaries").
4. **Explainability/Decision Persistence Service cần internal authorization (code-level), không phải RLS-level** — vì chúng chia sẻ `service_role` với mọi Module khác trong `Apps/backend`.

---

## Liên kết ngược

[RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md).
