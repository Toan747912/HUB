# AI Mentor OS

Đây là root workspace cho dự án **AI Mentor OS** — một AI Apprenticeship Platform.

**Mọi AI Agent/người mới tham gia dự án: đọc [Docs/Project_Index.md](Docs/Project_Index.md) trước tiên.** File đó là bản đồ đầy đủ của dự án (tầm nhìn, nguyên tắc, kiến trúc workspace, quyết định đã khóa, câu hỏi còn mở, trạng thái hiện tại).

## Cấu trúc cấp cao

| Thư mục | Nội dung |
|---|---|
| `Docs/` | Tài liệu sản phẩm, yêu cầu, kiến trúc, quyết định |
| `Product/` | Mô hình sản phẩm vận hành (Goals, Roadmaps, Personas, LearningModels, KnowledgeModels, Assessments) |
| `AI/` | Spec từng AI Engine (Discovery, Roadmap, Teaching, Assessment, Knowledge, Recommendation, Shared) |
| `Apps/` | Mã nguồn ứng dụng (frontend, backend, ai-service, admin) — generic scaffold, xem [Apps/README.md](Apps/README.md) |
| `Infrastructure/` | Hạ tầng triển khai/vận hành — chưa có nội dung |
| `Research/` | Đối thủ, thực nghiệm, tài liệu tham khảo, ý tưởng |
| `Archive/` | Tài liệu/quyết định cũ, không còn là nguồn sự thật |

Chi tiết lý do của từng nhóm: xem [DECISION-014](Docs/11_Decisions/DECISION-014-Workspace-Architecture-Layered-Model.md).
