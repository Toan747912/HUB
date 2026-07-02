# Supabase Auth Alignment — RLS Architecture Review

> Phạm vi: Task 4 — đối chiếu [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) với Actor Model/Resource Classification/Boundary Matrix vừa xây ở Round này. **Không viết SQL Policy.** Xác nhận Ownership Model, Auth Flow, Session Flow, Backend Flow.

---

## 1. Đối chiếu DECISION-043

| Nội dung DECISION-043 | Xác nhận lại ở Round này | Trạng thái |
|---|---|---|
| `learner.id = auth.users.id` — UUID chung, không PK nội bộ riêng | [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) mục 1 dòng 1 — `learner` RLS = `id = auth.uid()`, 0 hop | ✅ Khớp, không phát sinh mâu thuẫn |
| Mọi FK `learner_id` toàn schema là UUID, tham chiếu `learner.id` | Toàn bộ 13 bảng Learner-owned đã DDL (mục 2.1) đều dùng `learner_id uuid` hoặc tham chiếu qua chuỗi FK tới `learner.id` | ✅ Khớp |
| `ON DELETE RESTRICT` cho `learner.id REFERENCES auth.users(id)` — bắt buộc Anonymization trước khi xoá `auth.users` | [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md) mục 1.1 (Learner) — `AnonymizeLearner` là Command duy nhất hợp lệ, không actor nào khác được set `anonymized_at` | ✅ Khớp |
| Không cần ID Strategy Hybrid cho `Learner` — chỉ `Learner` dùng UUID Supabase Auth, entity khác (Goal/Roadmap/KnowledgeNode...) không bị ảnh hưởng | Xác nhận lại — mọi bảng khác trong [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) dùng `gen_random_uuid()`/ULID-style riêng, không phụ thuộc `auth.users` | ✅ Khớp |

**Kết luận mục 1: Không phát hiện mâu thuẫn nào giữa DECISION-043 và RLS Architecture của Round này.** DECISION-043 là tiền đề kỹ thuật cho phép toàn bộ mô hình RLS "trực tiếp `learner_id = auth.uid()`, 0 hop" áp dụng được cho 6/13 bảng Learner-owned đã DDL — nếu không có DECISION-043, mọi Policy sẽ cần JOIN qua bảng mapping (đúng phương án B đã bị bác bỏ).

---

## 2. Ownership Model

**Xác nhận:** Ownership = `learner_id` (trực tiếp hoặc qua FK chain) tới `learner.id` = `auth.users.id`. Đây là **mô hình ownership duy nhất** trong toàn schema — không có 2 mô hình ownership khác nhau cùng tồn tại (vd không có "tenant_id" hay "organization_id" nào khác — đúng vì PRD/Domain Architecture chưa từng đề cập multi-tenancy ở mức tổ chức, chỉ có Learner cá nhân).

**Hệ quả đã ghi nhận (không mới):** 3 bảng Shared (`knowledge_node`/`knowledge_edge`/`expansion_record`) **không có ownership Learner** — đây không phải ngoại lệ của model, là 1 model khác hẳn (role-based, không ownership-based) cùng tồn tại song song, đã phân tích đầy đủ ở [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md).

---

## 3. Auth Flow

```
Learner mở Frontend
    │
    ▼
Supabase Auth SDK (Apps/frontend) ── đăng ký/đăng nhập ──► Supabase Auth (auth.users)
    │
    ▼
Nhận JWT (chứa `sub` = auth.users.id = learner.id)
    │
    ▼
Mọi request tiếp theo tới Apps/backend kèm JWT trong header
    │
    ▼
Apps/backend verify JWT (qua Supabase JWT secret hoặc Supabase client) → trích `learner_id`
```

**Xác nhận khớp [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 2.1:** đăng ký/đăng nhập là điểm Frontend được phép nói trực tiếp với Supabase — không qua Backend, đúng như Round API đã kết luận, **không bị Round này thay đổi**.

**Điểm mới của Round này:** Auth Flow chỉ tạo ra **danh tính** (`learner_id`), không tạo ra **authorization** — JWT hợp lệ chỉ chứng minh "đây đúng là Learner X", không chứng minh "Learner X được phép làm hành động Y". Authorization (Command có hợp lệ không, có vi phạm DECISION-019/033 không...) **luôn là việc của Application Service**, RLS chỉ chặn ở mức "không đọc/ghi row của Learner khác" — đây là lớp bảo vệ **cuối cùng**, không phải lớp bảo vệ **đầu tiên hoặc duy nhất**.

---

## 4. Session Flow

| Giai đoạn | Actor | Cơ chế |
|---|---|---|
| Tạo session | Learner | Supabase Auth SDK, JWT có thời hạn + refresh token |
| Refresh session | Learner (tự động, qua SDK) | Supabase Auth SDK tự refresh, không qua Backend |
| Kết thúc session | Learner (đăng xuất) | Supabase Auth SDK, không phải `learning_session`/`sub_session` (nghiệp vụ) — **2 khái niệm "session" hoàn toàn khác nhau, không liên quan kỹ thuật, dễ gây nhầm tên khi đọc code sau này** |

**Lưu ý đặt tên quan trọng (mới phát hiện ở Round này):** `learning_session`/`sub_session`/`mentor_session` (nghiệp vụ, Domain Architecture) và "session" của Supabase Auth (kỹ thuật, JWT lifecycle) dùng cùng từ "session" nhưng **không có quan hệ 1-1** — 1 Supabase Auth session có thể chứa nhiều `learning_session` (qua nhiều lần truy cập), và 1 `learning_session` có thể trải qua nhiều Supabase Auth session (Learner đăng xuất rồi đăng nhập lại giữa lúc đang Pause). **Không cần Decision mới** — chỉ cần ghi nhận để tránh nhầm lẫn khi thiết kế Policy/code thật.

---

## 5. Backend Flow

```
Apps/backend nhận request (kèm JWT của Learner, hoặc không kèm gì nếu là Background Job/System Process nội bộ)
    │
    ├── Nếu có JWT Learner → verify, trích learner_id → gọi Application Service tương ứng,
    │                          Service thực thi business logic, ghi DB qua service_role
    │                          (RLS không áp dụng cho service_role — bypass, theo RLS_ACTOR_MODEL mục 0)
    │
    └── Nếu là Background Job/System Process/Local AI nội bộ → không có JWT Learner,
                                 chạy với service_role trực tiếp, authorization là
                                 Module boundary (code-level), không phải RLS
```

**Xác nhận khớp [API_BOUNDARY_ANALYSIS.md](../07_API/API_BOUNDARY_ANALYSIS.md) + [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md):** Backend Flow không đổi gì so với 2 Round trước — Round này chỉ làm rõ thêm rằng **mọi write nghiệp vụ, kể cả write "thay mặt Learner", đều chạy dưới `service_role`**, nghĩa là **RLS không bảo vệ chống lại lỗi logic trong Application Service** — nếu AssessmentService có bug ghi sai `learner_id`, RLS sẽ không chặn được (service_role bypass), đây là rủi ro phải xử lý ở Application Layer (test/code review), không phải RLS.

---

## 6. Trả lời Mandatory Question 8-9

### Q8 — Frontend có thể truy cập trực tiếp gì?

Giữ nguyên kết luận [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md) mục 2.1, nay xác nhận lại với RLS cụ thể:

| Trực tiếp được phép | RLS Policy tương ứng (dự kiến, chưa viết SQL) |
|---|---|
| Supabase Auth (đăng ký/đăng nhập/refresh) | Không áp dụng RLS (Auth là hệ thống riêng) |
| `evidence`/`evidence_link` (đọc lịch sử của chính mình) | `learner_id = auth.uid()` (0 hop) / qua `evidence.learner_id` (1 hop) |
| `learning_session_transition` (đọc audit log) | qua `learning_session.learner_id` (1 hop) |

### Q9 — Cái gì luôn phải qua Backend?

Mọi Command (toàn bộ [COMMAND_QUERY_ARCHITECTURE.md](../07_API/COMMAND_QUERY_ARCHITECTURE.md)); mọi Query tổng hợp/Projection; **toàn bộ 3 bảng Shared** (`knowledge_node`/`knowledge_edge`/`expansion_record` — Learner chỉ đọc trực tiếp, không bao giờ ghi trực tiếp dù có JWT hợp lệ); **toàn bộ `trace_link`/Decision Header** (Explainability-only, không actor ứng dụng nào đọc/ghi trực tiếp).

### Admin truy cập gì?

**Chưa chốt đầy đủ** (ghi nhận lại từ RLS_ACTOR_MODEL mục 1.2) — nhưng xác nhận 1 nguyên tắc: **Admin không có con đường Supabase riêng** (không có Supabase role "admin" mặc định) — Admin **luôn qua `Apps/admin` → `Apps/backend`**, giống Frontend/Learner về kiến trúc, khác về **phạm vi authorization** (cross-Learner) mà Backend phải tự kiểm tra (vd custom claim, bảng `admin_user`, hoặc role riêng trong `Apps/backend`'s own authorization layer — không phải Supabase RLS phân biệt được).

### AI truy cập gì?

**Local AI:** không có "truy cập" riêng — nó là code chạy trong `Apps/backend`, dùng chung mọi quyền của Module chứa nó.
**Cloud AI:** **không có quyền truy cập Supabase nào** — nhận input/trả output qua lời gọi từ Backend, không cầm credential nào (xác nhận lại RLS_ACTOR_MODEL mục 1.4, đây là câu trả lời cho Mandatory Question 10 ở mục 7 dưới).

---

## 7. Trả lời Mandatory Question 10 — AI services nên authenticate thế nào?

| AI Service | Cơ chế đề xuất |
|---|---|
| **Local AI** | Không cần authenticate riêng — chạy trong process `Apps/backend`, kế thừa `service_role` credential của Backend, không có boundary network để cần "authenticate" theo nghĩa thông thường |
| **Cloud AI** | **2 chiều cần authenticate riêng biệt, không nhầm lẫn:** (a) `Apps/backend` → Cloud AI provider: dùng API key/credential của **chính Backend** (vd OpenAI/Anthropic API key), không liên quan Supabase; (b) Cloud AI provider → Supabase: **không tồn tại, không nên tồn tại** — Cloud AI không bao giờ nhận credential Supabase nào, kể cả token có thời hạn ngắn hay phạm vi hẹp. Nếu Cloud AI cần dữ liệu, Backend phải tự đọc trước rồi truyền vào prompt/payload — không phải để Cloud AI tự query |

**Đây là câu trả lời rõ nhất và quan trọng nhất của toàn bộ Round 4 (đề bài) cho câu hỏi authenticate AI** — sự phân biệt Local/Cloud không nằm ở "loại Supabase credential khác nhau", mà ở **Cloud AI không có Supabase credential nào hết**.

---

## Liên kết ngược

[RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [RLS_BOUNDARY_MATRIX.md](RLS_BOUNDARY_MATRIX.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [FRONTEND_BACKEND_INTERACTION_REVIEW.md](../07_API/FRONTEND_BACKEND_INTERACTION_REVIEW.md).
