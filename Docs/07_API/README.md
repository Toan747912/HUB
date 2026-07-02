# API — AI Mentor OS

Sẽ chứa: hợp đồng API (endpoint, request/response DTO, auth) phục vụ `Apps/frontend`, `Apps/admin` gọi vào `Apps/backend`/`Apps/ai-service`.

> ✅ **API Architecture Review (boundary-level) hoàn thành** — không phải mở khóa Use Case Inventory/CoreDomainMap như điều kiện gốc dưới đây, mà là 1 Round **review kiến trúc boundary** đứng trước API Implementation, tương tự cách Application Services/Orchestration Review đứng trước Backend Implementation. **Không có endpoint/OpenAPI/controller nào được tạo ở Round này.**
>
> - [API_BOUNDARY_ANALYSIS.md](API_BOUNDARY_ANALYSIS.md) — Public/Internal/AI-Internal-Only API cho mọi Domain/Capability, theo write-ownership đã chốt
> - [COMMAND_QUERY_ARCHITECTURE.md](COMMAND_QUERY_ARCHITECTURE.md) — Command/Query/State Change/Consistency Expectation (Strong/Eventual), kế thừa từ Application Service Boundary Matrix
> - [FRONTEND_BACKEND_INTERACTION_REVIEW.md](FRONTEND_BACKEND_INTERACTION_REVIEW.md) — Frontend ↔ Backend ↔ Supabase ↔ AI Services, kết luận: Backend là cổng duy nhất cho mọi nghiệp vụ/AI Decision, Supabase trực tiếp chỉ cho Auth + đọc append-only; không cần BFF riêng
> - [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md) — Invocation pattern cho 10 AI Decision Type (D1-D9b); 4/10 (D5, D6, D8 điều kiện, D9a/D9b) chưa đủ thông tin để thiết kế Contract đầy đủ
> - [API_ARCHITECTURE_READINESS_ASSESSMENT.md](API_ARCHITECTURE_READINESS_ASSESSMENT.md) — Cross-check với Explainability/Decision Persistence/Orchestration (không phát hiện vi phạm), 10 Mandatory Questions, readiness: Backend Module Design ~35/100, Supabase RLS Design ~35/100, DDL Finalization ~30/100, Backend Implementation ~30/100 — **không hạng mục nào Ready for Implementation**, đúng dự kiến cho 1 Round review boundary
>
> Điều kiện gốc dưới đây (Use Case Inventory, CoreDomainMap ổn định) **vẫn áp dụng cho API Implementation thật** (endpoint/OpenAPI/controller) — Round này không thay đổi điều kiện đó, chỉ làm rõ boundary trước khi điều kiện đó được đáp ứng.

**Tạm dừng chính thức theo [DECISION-018-Domain-Modeling-Phase](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md).** Điều kiện mở khóa: Use Case Inventory chi tiết hơn mức hiện tại trong [Docs/01_PRD/PRD_v1.md](../01_PRD/PRD_v1.md), và [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) ổn định hơn.
