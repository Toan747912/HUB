# DECISION-037 — Right to Be Forgotten via Anonymization (No Hard Delete for Learning Data)

- **Status:** Accepted (Locked) — resolves Risk #3 / Open Question #5 in [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md)
- **Date:** 2026-06-27 (Round 7 / Database Design Phase, Step 2)

## Context

[PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 7 (Risk #3) xác định một xung đột chưa giải quyết: yêu cầu xóa dữ liệu cá nhân (right-to-be-forgotten) đối lập trực tiếp với nguyên tắc "Evidence/AssessmentResult vĩnh viễn, không xóa" cần cho Explainability First (DECISION-027). Cần 1 quyết định rõ để Logical Database Model (Step 2) có thể xác định Reference Rule (cascade/restrict/archive) cho quan hệ `Learner` → mọi entity khác.

## Decision

**Sử dụng Anonymization** khi Learner yêu cầu thực hiện right-to-be-forgotten.

**Không sử dụng Hard Delete cho dữ liệu học tập** (`Goal`, `Roadmap`, `Evidence`, `AssessmentResult`, `KnowledgeNodeMastery`, `RecommendationProposal`, `LearningSession`, ...) — toàn bộ dữ liệu này **được giữ lại vĩnh viễn**, chỉ có liên kết định danh tới `Learner` bị **ẩn danh hóa** (ví dụ thay `learner_id` thật bằng 1 định danh ẩn danh không thể truy ngược, hoặc xóa/che các trường định danh cá nhân trực tiếp trên `Learner` mà không xóa dữ liệu học tập liên quan).

## Reasoning

Hard delete dữ liệu học tập sẽ phá vỡ chuỗi Explainability First (DECISION-027) cho mọi `AssessmentResult`/`KnowledgeNodeMastery`/`RecommendationProposal` đã từng tham chiếu Learner đó, và có thể ảnh hưởng tính toàn vẹn của Knowledge Graph dùng chung (nếu Evidence của Learner đó từng góp phần vào Knowledge Expansion). Anonymization giữ nguyên giá trị phân tích/audit/Explainability của dữ liệu học tập (vẫn biết "1 Learner nào đó đã có chuỗi suy luận này") trong khi vẫn thỏa mãn yêu cầu pháp lý "không thể nhận diện được cá nhân cụ thể nữa" — đây là cách giải quyết tiêu chuẩn cho xung đột giữa quyền xóa dữ liệu cá nhân và yêu cầu giữ lịch sử audit.

## Consequences

- **Đóng Risk #3 / Open Question #5** trong [PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md).
- `Learner` (User Profile) cần phân biệt 2 nhóm trường: **định danh cá nhân** (tên, email, thông tin liên hệ — bị ẩn danh hóa khi thực hiện right-to-be-forgotten) và **định danh hệ thống** (1 khóa nội bộ ổn định, không đổi, vẫn được các domain khác tham chiếu sau khi ẩn danh hóa).
- [LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md) (Step 2) cần định nghĩa Reference Rule từ `Learner` tới mọi entity khác là **"Archive/Anonymize"**, không phải "Cascade Delete" hay "Restrict" theo nghĩa chặn xóa.
- Đây là 1 yêu cầu nghiệp vụ mới (không phải chi tiết kỹ thuật) — cần được phản ánh vào tài liệu Product/Compliance nếu có (hiện `Docs/` chưa có mục Compliance riêng — ghi nhận như nợ tài liệu, không tự tạo mục mới ở vòng này).
- Không định nghĩa cơ chế ẩn danh hóa cụ thể (thuật toán, có thể đảo ngược hay không) — đó là chi tiết Application/Security Design, để lại cho vòng sau.

## Related Documents

- [DECISION-027-Explainability-First](DECISION-027-Explainability-First.md)
- [Docs/06_Database/PersistenceArchitecture.md](../06_Database/PersistenceArchitecture.md) mục 7 (Risk #3)
- [Docs/06_Database/LogicalDatabaseModel.md](../06_Database/LogicalDatabaseModel.md)
