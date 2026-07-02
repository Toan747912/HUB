# DECISION-040 — Physical Database Design tách thành Step 4A (Database Blueprint) và Step 4B (DDL Generation)

- **Status:** Accepted (Locked)
- **Date:** 2026-06-27 (Database Design Phase, Step 4)

## Context

Sau khi Step 1-3 (Persistence Architecture, Logical Database Model, Physical Design Preparation) đạt READY ([PHYSICAL_DESIGN_READINESS.md](../06_Database/PHYSICAL_DESIGN_READINESS.md)), Physical Database Design (Step 4) là bước cuối trước khi có schema thực thi được. Bước này có 2 loại sản phẩm khác bản chất: (1) tài liệu thiết kế ở mức bảng/quan hệ/chiến lược (không phải SQL), và (2) SQL/DDL thực thi được. Gộp chung 1 bước dễ dẫn tới viết DDL trước khi mọi quyết định cấu trúc (PK/FK/uniqueness/index conceptual) được rà soát đầy đủ.

## Decision

Tách Step 4 thành 2 bước con:

- **Step 4A — Database Blueprint:** tài liệu thiết kế mức bảng/quan hệ (Entity Blueprint, Relationship Matrix, Database Modules, Index Strategy mức khái niệm) + review (`DatabaseBlueprintReview.md`) + Readiness Assessment cho DDL. **Không viết SQL, không `CREATE TABLE`, không constraint/index cụ thể.**
- **Step 4B — DDL Generation:** viết SQL/DDL thực thi được (`CREATE TABLE`, cột, kiểu dữ liệu, constraint, index cụ thể), dựa trên `DatabaseBlueprint.md` đã được xác nhận READY_FOR_DDL ở Step 4A.

**Step hiện tại: Step 4A.** Step 4B chưa bắt đầu.

## Reasoning

Tách rà soát cấu trúc (blueprint) khỏi việc viết SQL giúp phát hiện thiếu sót/mâu thuẫn (entity thiếu, naming collision, ownership sai) trước khi tốn công viết lại DDL — nhất quán với cách Database Design Phase đã chia Step 1-3 thành các lớp trách nhiệm riêng (Persistence Architecture → Logical Model → Physical Prep) thay vì nhảy thẳng vào schema. Đây cũng là điểm dừng tự nhiên để Founder/ChatGPT review cấu trúc bảng trước khi DDL được tạo ra, theo đúng vai trò Claude = Co-Architect/Documentation Manager (không tự quyết định, chỉ chuẩn bị để Founder/ChatGPT xác nhận).

## Consequences

- `Docs/06_Database/DatabaseBlueprint.md` và `DatabaseBlueprintReview.md` là sản phẩm của Step 4A.
- Step 4B (DDL Generation) chỉ bắt đầu sau khi `DatabaseBlueprintReview.md` kết luận `READY_FOR_DDL`.
- Không có entity/quan hệ mới phát sinh từ quyết định này — đây là quyết định về **quy trình**, không phải về domain/schema.

## Related Documents

- [Docs/06_Database/PHYSICAL_DESIGN_READINESS.md](../06_Database/PHYSICAL_DESIGN_READINESS.md)
- [Docs/06_Database/DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md)
- [Docs/06_Database/DatabaseBlueprintReview.md](../06_Database/DatabaseBlueprintReview.md)
