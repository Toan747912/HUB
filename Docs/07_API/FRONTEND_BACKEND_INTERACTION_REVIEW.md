# Frontend ↔ Backend ↔ Supabase ↔ AI Services — Interaction Review

> Phạm vi: phân tích kiến trúc interaction model. **Không thiết kế endpoint, không chọn framework, không viết code.** Trả lời trực tiếp Task 3 + Mandatory Question 10 của đề bài. Kế thừa [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](../06_Database/APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md).

---

## 1. Chuỗi tương tác lý thuyết

```
Frontend (Apps/frontend, Apps/admin)
    ↓
Backend (Apps/backend) — chứa toàn bộ Application Service đã chốt
    ↓
Supabase (PostgreSQL + Auth + RLS + Storage)
    ↓
AI Services (Apps/ai-service) — Teaching/Assessment/Recommendation/Knowledge Expansion/Discovery engine
```

Đây là **chuỗi lý thuyết tối đa** — câu hỏi của Round này là xác định **những điểm nào trong chuỗi được phép tắt (bypass)** một cách an toàn, và những điểm nào **không**.

---

## 2. Q: Frontend có nói trực tiếp với Supabase không?

**Có, nhưng chỉ trong 2 trường hợp hẹp, không phải mặc định.**

### 2.1 Trường hợp được phép (an toàn để bypass Backend)

| # | Trường hợp | Vì sao an toàn |
|---|---|---|
| 1 | **Supabase Auth** (đăng ký/đăng nhập/refresh token) | Đây là hạ tầng Supabase tự quản lý, không phải nghiệp vụ AI Mentor OS — không có Application Service nào sở hữu nó, không có explainability/orchestration nào áp dụng |
| 2 | **Read-only, single-table, đã được RLS bảo vệ, không mang ý nghĩa AI Decision** — ví dụ: Learner đọc lại `evidence`/`evidence_link` lịch sử của chính mình (mục 1.7 API_BOUNDARY_ANALYSIS), đọc `learning_session_transition` (audit log đã ghi xong) | Đây là dữ liệu **đã chốt** (immutable/append-only), không có write nào xảy ra, không có TraceLink/Decision Header nào cần tính toán lại tại thời điểm đọc — RLS (`auth.uid() = learner_id`, theo DECISION-043) đủ để bảo vệ, không cần Service layer thêm |

### 2.2 Trường hợp KHÔNG được phép

**Mọi Command (write) và mọi Query có ý nghĩa tổng hợp/orchestration đều KHÔNG được Frontend gọi trực tiếp Supabase** — lý do nằm ở chính kỷ luật đã chốt từ Round Application Services:

1. **Atomic transaction pairs (Boundary Matrix mục 2)** — vd ghi `AssessmentResult` phải atomic với `TraceLink`. Nếu Frontend ghi trực tiếp qua `supabase-js`, không có gì enforce việc 2 write này xảy ra cùng transaction — đây chính là GAP-04/05/07 tái diễn ở 1 tầng mới, nghiêm trọng hơn vì giờ không chỉ là rủi ro "Service implement sai" mà là **rủi ro mọi client tuỳ biến** đều có thể ghi sai.
2. **Read Model tổng hợp từ nhiều domain** (vd `GetRoadmapProgress` — Roadmap × Mastery) cần Projection logic, không phải 1 query Supabase đơn bảng.
3. **Quyết định AI (D1-D9b)** không có "bảng" để Frontend đọc trực tiếp — chúng là kết quả tính toán của Service, không tồn tại sẵn dạng row chờ SELECT.

**Kết luận Q1:** Frontend **không nói trực tiếp với Supabase cho nghiệp vụ AI Mentor OS** — chỉ cho Auth và 1 tập hẹp Read-only đã chốt append-only.

---

## 3. Q: Frontend chỉ gọi Backend?

**Đúng, cho mọi Command và mọi Query mang ý nghĩa nghiệp vụ/AI** (xem mục 2.2). Đây là quy tắc mặc định — mục 2.1 là 2 ngoại lệ hẹp đã được chứng minh an toàn, không phải tiền lệ để mở rộng thêm tuỳ ý mà không qua review tương đương.

---

## 4. Q: Có cần BFF (Backend-for-Frontend) không?

**Không cần 1 BFF riêng tách khỏi `Apps/backend`** — phân tích:

- `Apps/backend` (chứa toàn bộ 9+3 Application Service đã chốt) **đã đóng đúng vai trò BFF về bản chất**: nó là tầng duy nhất Frontend gọi tới, tổng hợp dữ liệu từ nhiều Domain trước khi trả về Read Model phù hợp UI (vd `GetRoadmapProgress`).
- Lý do kinh điển để tách BFF riêng (Backend phục vụ nhiều loại client với hình dạng response khác nhau — Mobile vs Web vs Admin) **chưa xuất hiện trong PRD/Domain Architecture hiện tại** — `Apps/frontend` và `Apps/admin` đều là Web, không có client native riêng được xác nhận.
- **Admin có thể cần 1 tập Read Model khác** (vd xem AssessmentResult/RecommendationProposal của nhiều Learner, không chỉ "của chính mình") — đây là khác biệt về **authorization scope**, không phải khác biệt về **shape response** đủ lớn để cần BFF riêng; có thể giải quyết bằng route/policy riêng trong cùng `Apps/backend`, không cần tách service.

**Kết luận:** `Apps/backend` đóng vai trò BFF hợp nhất cho cả `Apps/frontend` và `Apps/admin`. Không cần BFF riêng ở Round này — nếu sau này xuất hiện client thứ 3 với nhu cầu response shape khác biệt thật (không chỉ authorization), cần 1 Round riêng để đánh giá lại.

---

## 5. Q: Operations nào cần orchestration?

Toàn bộ Command/Internal Command ở [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md) mục 11.1 (8 cặp ghi Strong) cần orchestration — đặc biệt:

| Operation | Orchestration vì |
|---|---|
| Mọi write có TraceLink đi kèm (Assessment, Recommendation, Discovery) | Phải gọi ExplainabilityService trong cùng transaction |
| Mọi write có Decision Header đi kèm (khi mechanism tồn tại) | Phải gọi DecisionPersistenceService trong cùng transaction |
| `ArchiveGoalAndSupersede` | Chạm 2 Aggregate khác Service (Goal & Roadmap + Learning Session) trong 1 yêu cầu nghiệp vụ |
| `SelectNextContent` (D1) | Tổng hợp đọc từ 4 domain (Knowledge/Roadmap/Assessment/Recommendation) trước khi trả 1 kết quả |
| Toàn bộ luồng F1-F5 ([APPLICATION_ORCHESTRATION_DESIGN.md](../06_Database/APPLICATION_ORCHESTRATION_DESIGN.md)) | Mỗi flow tự thân là 1 chuỗi orchestration đa Service |

## 6. Q: Operations nào read-only?

Toàn bộ Query ở [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md) — không Query nào có side-effect. Tập con an toàn để đọc trực tiếp Supabase (không qua Backend) đã liệt kê ở mục 2.1 — phần còn lại vẫn nên qua Backend dù chỉ đọc, vì cần Projection logic hoặc vì là Read Model của 1 quyết định AI chưa tồn tại dạng bảng đơn.

## 7. Q: Operations nào cần server authority?

**Mọi operation có liên quan tới ít nhất 1 trong 4 điều ở [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md)/[AI_DECISION_TAXONOMY.md](../06_Database/AI_DECISION_TAXONOMY.md) (10 Decision Type D1-D9b) cần server authority tuyệt đối** — không Decision Type nào được phép tính toán/quyết định ở Frontend, vì:

1. Explainability (TraceLink/Decision Header) chỉ có ý nghĩa nếu quyết định được tạo ra và ghi nhận **tại đúng 1 nơi, đúng 1 thời điểm, gán cho đúng 1 actor** (điều kiện C3, AI_DECISION_TAXONOMY mục 1) — Frontend không phải nơi đáng tin để gán actor/timestamp cho 1 AI Decision.
2. Mọi write Strong Consistency (mục 11.1, COMMAND_QUERY_ARCHITECTURE) yêu cầu atomic transaction — chỉ Backend (chạy trong cùng process/DB connection) mới enforce được điều này.
3. RLS (Supabase) bảo vệ được **quyền truy cập theo `learner_id`**, nhưng **không bảo vệ được tính đúng đắn nghiệp vụ** (vd: RLS không thể biết 1 `AssessmentResult` có atomic với `TraceLink` tương ứng hay không) — đây là lý do RLS không thay thế được Server Authority cho Command, chỉ bổ trợ cho Query.

---

## 8. Vai trò của Supabase trong chuỗi (làm rõ thêm, không phải câu hỏi gốc nhưng cần nói rõ)

- **Supabase = Database engine + Auth provider cho Backend dùng**, không phải 1 tầng API riêng mà Frontend gọi cho nghiệp vụ — đúng mô hình "Supabase as managed Postgres + Auth", không phải "Supabase as BaaS thay Backend hoàn toàn".
- RLS Policy (dựa trên `auth.uid() = learner_id`, DECISION-043) vẫn nên được **bật cho mọi bảng**, kể cả bảng chỉ Backend ghi — đây là **lớp bảo vệ thứ 2** (defense in depth) nếu Backend có lỗi authorization, không phải lớp duy nhất. Chi tiết RLS cụ thể từng bảng nằm ngoài phạm vi Round này (xem Final Section — chưa Ready cho RLS Design).

---

## 9. Mô hình khuyến nghị (trả lời Mandatory Question 10)

```
Frontend (Apps/frontend, Apps/admin)
    │
    ├── Supabase Auth SDK ──────────────► Supabase Auth (đăng ký/đăng nhập/session)
    │
    ├── Supabase Client (RLS-protected) ─► Read-only, append-only, single-table,
    │                                       không mang ý nghĩa AI Decision
    │                                       (evidence history, transition log...)
    │
    └── Backend API (Apps/backend) ──────► Mọi Command
                                            Mọi Query tổng hợp/orchestration
                                            Mọi Read Model liên quan AI Decision
                                            │
                                            ├──► Supabase (PostgreSQL, qua Service Role
                                            │     hoặc connection riêng, RLS vẫn bật làm
                                            │     defense-in-depth)
                                            │
                                            └──► AI Services (Apps/ai-service) — invocation
                                                  pattern chi tiết ở AI_SERVICE_API_REVIEW.md
```

**Nguyên tắc tổng quát:** *"Backend là cổng duy nhất cho mọi thứ có ý nghĩa nghiệp vụ hoặc AI Decision; Supabase trực tiếp chỉ dành cho Auth và dữ liệu đã-chốt-xong (immutable/append-only) không cần tính toán lại."* Đây không phải nguyên tắc mới — là hệ quả tất yếu của toàn bộ kỷ luật atomic/explainability đã chốt từ Round Application Services, áp dụng vào câu hỏi "ai được gọi gì".

---

## Liên kết ngược

[API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md), [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md), [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md), [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md), [APPLICATION_ORCHESTRATION_DESIGN.md](../06_Database/APPLICATION_ORCHESTRATION_DESIGN.md).
