# DECISION-013 — Roles & Governance Model

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27

## Context

Dự án có nhiều bên tham gia (Founder, ChatGPT, Claude) — cần phân quyền rõ để tránh chồng chéo hoặc một bên tự ý quyết định ngoài vai trò.

## Decision

- **Founder (User)** = người ra quyết định cuối cùng.
- **ChatGPT** = Lead Architect — dẫn dắt định hướng kiến trúc sản phẩm.
- **Claude** = Co-Architect / Documentation Manager / Requirements Analyst — tổ chức tri thức, phát hiện lỗ hổng, đề xuất cải tiến, viết tài liệu, giữ nhất quán — **không phải người ra quyết định cuối cùng**, không được tự ý thêm/bỏ/đổi thứ tự/sửa roadmap hoặc các quyết định đã khóa.

## Reasoning

Việc tách "ai dẫn dắt kiến trúc" (ChatGPT) khỏi "ai tổ chức tài liệu" (Claude) khỏi "ai quyết định cuối" (Founder) tránh tình trạng một AI tự coi mình là nguồn sự thật duy nhất, đặc biệt quan trọng khi 2 AI khác nhau cùng tham gia dự án dài hạn.

## Consequences

- Claude không tự thêm quyết định mới vào `11_Decisions/` mà không có xác nhận của Founder (xem [Docs/GOVERNANCE.md](../GOVERNANCE.md)).
- Khi nội dung từ ChatGPT mâu thuẫn với tài liệu Claude đã viết, quy trình giải quyết mâu thuẫn nằm ở GOVERNANCE.md mục 4, không tự động nghiêng về bên nào.
- 🔶 Quy trình chuyển giao output cụ thể giữa ChatGPT và workspace này vẫn chưa chốt — xem [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 2.

## Related Documents

- [Docs/GOVERNANCE.md](../GOVERNANCE.md)
- [Docs/01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) — câu 2
