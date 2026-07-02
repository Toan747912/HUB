# RLS Boundary Matrix — AI Mentor OS

> Phạm vi: Task 3 — Actor × Resource Category, xác định Read/Create/Update/Archive/Deny. **Không viết SQL Policy.** Dùng đúng 8 Actor ([RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md)) × 6 Category ([RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md)).

---

## 0. Legend

| Ký hiệu | Ý nghĩa |
|---|---|
| **R** | Read — SELECT |
| **C** | Create — INSERT |
| **U** | Update — UPDATE (chỉ áp dụng nơi domain cho phép mutate; nhiều bảng là append-only theo DECISION-035, U không áp dụng) |
| **A** | Archive — soft-delete/Anonymize (DECISION-037) — **không bao giờ Hard Delete** |
| **D** | Deny — cấm tuyệt đối |
| **Direct** | Quyền thực thi trực tiếp bằng credential của chính actor (Postgres role nhìn thấy actor này) |
| **Via Backend** | Hành động *xảy ra* nhưng được `Apps/backend` (service_role) thực thi hộ, actor chỉ là người khởi phát yêu cầu — actor **không tự cầm credential ghi** |

**Nhắc lại nền tảng từ [RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md) mục 0:** Local AI, Background Job, System Process, Explainability Service, Decision Persistence Service đều thực thi dưới `service_role` của `Apps/backend` — ở **DB layer** chúng không phân biệt được; bảng dưới đây mô tả quyền **dự định ở Application layer** (Module boundary), không phải quyền RLS Postgres phân biệt được giữa 5 actor đó.

---

## 1. Ma trận Actor × Resource Category

| Actor | Learner-owned | Shared | System-owned (`auth.users`) | Audit-only | Explainability-only |
|---|---|---|---|---|---|
| **Learner** | R (Direct, own row); C/A (Via Backend — Command, không Direct) | R (Direct, `authenticated`); D (Create/Update — chỉ AI/Backend ghi) | D (không Backend tự viết, chỉ qua Supabase Auth SDK) | R (Direct, own row); D (Update — append-only, không ai update) | **D toàn bộ** (R/C/U/A) — không Direct, không cả Via Backend cho riêng Learner |
| **Admin** | R (Via Backend, cross-Learner — phạm vi chưa chốt, xem RLS_ACTOR_MODEL mục 1.2); D (Create/Update nghiệp vụ thay Learner) | R (Direct hoặc Via Backend, cùng quyền Learner vì Shared không phân biệt actor) | D | R (Via Backend, cross-Learner, mục đích support) | D (Admin không có lý do nghiệp vụ đọc trực tiếp `trace_link`/Header — nếu cần debug, qua Read Model đã JOIN sẵn của Module sở hữu Detail, không qua bảng thô) |
| **Local AI** | R (Via Backend, trong Module sở hữu); C (Via Backend, qua đúng Application Service write-owner) | R/C (Via Backend, KnowledgeExpansionService) | D | C (Via Backend, ghi 1 lần khi transition xảy ra); D (Update) | D (Local AI không tự gọi `trace_link`/Header — phải qua ExplainabilityService/DecisionPersistenceService, không ghi tắt) |
| **Cloud AI** | **D toàn bộ** (R/C/U/A) | **D toàn bộ** | D | **D toàn bộ** | **D toàn bộ** |
| **Background Job** | D (không đọc/ghi trực tiếp bảng nghiệp vụ — chỉ publish lại Event, Service nghiệp vụ mới ghi) | D | D | D | D |
| **System Process** | U (Via DB trigger — `row_version` tăng, History Table ghi, không phải "actor ứng dụng" ghi nghiệp vụ) | U (cùng cơ chế trigger) | D | C (Via DB trigger, nếu History Table áp dụng cho bảng Audit) | D |
| **Explainability Service** | D (không đọc/ghi bảng Learner-owned trực tiếp — chỉ nhận `(source_id, target_id)` đã được Module gọi xác nhận) | D | D | D | **C (Via Backend, duy nhất được ghi `trace_link`)**; R (đọc lại để xác nhận trước khi ghi, nếu cần); D (Update/Archive — `trace_link` append-only, không sửa/xoá) |
| **Decision Persistence Service** | D | D | D | D | **C (Via Backend, duy nhất được ghi Decision Header)**; R; D (Update/Archive) |

---

## 2. Sensitive Data — Highlight

| # | Dữ liệu | Vì sao nhạy cảm | Boundary áp dụng |
|---|---|---|---|
| 1 | `evidence`/`evidence_link` | Chứa phản hồi thô của Learner — có thể tiết lộ mức độ hiểu/sai lầm cá nhân, dữ liệu hành vi học tập chi tiết nhất trong hệ thống | Strict Learner-owned, 0-1 hop, không Shared, không Admin Read mặc định |
| 2 | `assessment_result.reasoning` | Có thể chứa diễn giải về điểm yếu nghiệp vụ của Learner cụ thể | Cùng nhóm `evidence` |
| 3 | `learner.anonymized_at` | Là cờ Right-to-be-Forgotten — chính giá trị này nếu bị đọc/ghi sai sẽ vi phạm trực tiếp DECISION-037 | Chỉ AccountLifecycleService (Via Backend) được set; không actor nào khác Update |
| 4 | `trace_link`/Decision Header | Không "nhạy cảm" theo nghĩa thông tin cá nhân, nhưng **nhạy cảm về tính toàn vẹn explainability** — sai 1 row ở đây làm hỏng cả chuỗi truy vết của 1 quyết định AI | Explainability-only, không Direct cho bất kỳ actor ứng dụng nào |

## 3. Cross-User Access — Highlight

| # | Trường hợp | Actor | Đánh giá |
|---|---|---|---|
| 1 | Admin đọc dữ liệu nhiều Learner | Admin | **Duy nhất trường hợp cross-user hợp lệ đã biết** — nhưng phạm vi chưa chốt (xem RLS_ACTOR_MODEL mục 1.2), cần xác nhận trước khi viết Policy thật |
| 2 | Learner đọc `approval_record` của Roadmap người khác | Learner | **Không hợp lệ** — `approval_record` Learner-owned qua `roadmap.goal_id → goal.learner_id`, không có đường nào cho phép Learner A đọc `approval_record` của Learner B |
| 3 | 1 Learner đọc `knowledge_node_mastery` của Learner khác | Learner | **Không hợp lệ** — đây là dữ liệu cá nhân hoá rõ nhất, dù `knowledge_node` (Shared) là chung, Mastery trên node đó là riêng |

**Không phát hiện cross-user access pattern nào ngoài Admin** — đúng kỳ vọng từ thiết kế Learner-owned nhất quán xuyên suốt Round 1-3.

## 4. Shared Knowledge Access — Highlight

| Bảng | Ai đọc | Ai ghi | Rủi ro cần lưu ý |
|---|---|---|---|
| `knowledge_node`/`knowledge_edge` | Mọi `authenticated` Learner | Chỉ KnowledgeExpansionService (Via Backend) | **Không có ranh giới theo Learner** — nếu Learner A và Learner B học 2 Goal hoàn toàn khác nhau, cả 2 vẫn đọc được toàn bộ Knowledge Graph (đúng thiết kế — tri thức dùng chung, không phải rò rỉ) |
| `expansion_record` | Mọi `authenticated` Learner | Chỉ KnowledgeExpansionService | Cùng tính chất — "lý do mở rộng" là tri thức chung, không phải hành vi cá nhân của 1 Learner cụ thể |

**Đây không phải lỗ hổng bảo mật** — đã được DDL_ROUND2_DESIGN/ROUND3_DESIGN xác nhận là *chủ định* (shared/global resource), Round này chỉ nhắc lại để không bị nhầm thành thiếu RLS.

## 5. AI-Generated Content Access — Highlight

| Nội dung | Ai tạo | Ai đọc | Lưu ý |
|---|---|---|---|
| `assessment_result.reasoning`, `expansion_record.expansion_reason` | AI (qua Application Service, Via Backend) | Learner sở hữu (Learner-owned) hoặc mọi Learner (Shared, cho `expansion_record`) | Nội dung AI tạo nhưng **quyền đọc theo category của bảng chứa nó**, không có category riêng "AI-generated" tách biệt — đúng kết luận mục 2 [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md) ("AI-owned là tính chất của Writer, không phải Category Visibility riêng") |
| D1/D6/D9b reasoning (chưa có nơi lưu — GAP-01/05, Open Q#6/#11) | — | — | **Không thể đánh giá Boundary cho nội dung chưa có bảng** — ghi nhận là khoảng trống tiếp tục, không tự giả định |

---

## Liên kết ngược

[RLS_ACTOR_MODEL.md](RLS_ACTOR_MODEL.md), [RLS_RESOURCE_CLASSIFICATION.md](RLS_RESOURCE_CLASSIFICATION.md), [SUPABASE_AUTH_ALIGNMENT.md](SUPABASE_AUTH_ALIGNMENT.md), [RLS_POLICY_STRATEGY.md](RLS_POLICY_STRATEGY.md), [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md), [DECISION-035](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md).
