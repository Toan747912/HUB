# DECISION-004 — Goal-Oriented Learning Philosophy

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Cần xác định đơn vị nhập lượng cơ bản từ người học: họ nhập "công nghệ muốn học" hay "mục tiêu muốn đạt"?

## Decision

User không học công nghệ — user học để đạt mục tiêu. Ví dụ: **đúng** = "Xây dựng web dịch lồng tiếng video"; **sai** = "Học NodeJS". AI tự suy luận: cần học gì, theo thứ tự nào, học sâu tới đâu — từ một mục tiêu bằng ngôn ngữ tự nhiên.

## Reasoning

Học theo tên công nghệ dẫn tới kiến thức rời rạc, không có động lực thực tế gắn kèm — vi phạm trực tiếp nguyên tắc 3 ([DECISION-003](DECISION-003-Core-Principles.md)). Việc AI tự suy luận lộ trình là điều kiện để Roadmap có thể là tài liệu sống ([DECISION-005](DECISION-005-Dynamic-Roadmap-System.md)).

## Consequences

- Input đầu vào của Discovery Engine ([DECISION-007](DECISION-007-Discovery-Engine.md)) là Goal tự nhiên ngữ, không phải một danh sách công nghệ chọn sẵn.
- Domain Model dùng `Goal` làm entity gốc cho Roadmap, không dùng "Technology"/"Course" làm gốc (xem [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)).

## Related Documents

- [Docs/00_Vision/ProductVision.md](../00_Vision/ProductVision.md)
- [Docs/03_Domain_Model/DomainModel_Draft.md](../03_Domain_Model/DomainModel_Draft.md)
