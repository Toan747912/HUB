# DECISION-043 — Supabase Auth Alignment: `learner.id = auth.users.id` (Shared UUID, No Separate Mapping)

- **Status:** Accepted (Locked) — closes [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 2.1/3.1 #1 (High impact), supersedes ID Strategy in [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 2 cho riêng `Learner`
- **Date:** 2026-06-27 (Database Design Phase, Pre-DDL Platform Alignment)

## Context

[PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 2 đề xuất `Learner` dùng PK kiểu Sequential/Identity-friendly (`BIGINT IDENTITY`) + 1 định danh public riêng — đề xuất này được viết trước khi platform được xác nhận. Sau khi Founder xác nhận **Database Platform = Supabase**, [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 2.1 xác định xung đột: Supabase Auth (`auth.users`) dùng **UUID** làm khóa chính, và Row Level Security (RLS) — cơ chế phân quyền cốt lõi của Supabase — luôn so sánh qua `auth.uid()` (trả về UUID). Cần quyết định quan hệ giữa `Learner` (Identity Domain, Aggregate Root đã chốt) và `auth.users` (do Supabase quản lý, ngoài phạm vi Domain Architecture).

## Decision

**`learner.id = auth.users.id`** — `Learner` dùng **chung 1 giá trị UUID** với `auth.users`, không tạo PK nội bộ riêng + cột mapping riêng.

### Đánh giá 2 phương án

| Phương án | Mô tả | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **(A) — Được chọn: `learner.id = auth.users.id`** | `learner.id` là UUID, đồng thời là PK của `learner` và FK tới `auth.users.id` (`learner.id UUID PRIMARY KEY REFERENCES auth.users(id)`) | RLS Policy viết trực tiếp `auth.uid() = learner.id` hoặc `auth.uid() = learner_id` (ở bảng khác) — không cần JOIN qua bảng mapping; khớp đúng pattern `public.profiles` được khuyến nghị rộng rãi trong tài liệu/ví dụ chính thức của Supabase; không có 2 định danh cho cùng 1 người dùng (tránh lớp bug "đồng bộ 2 ID" — ví dụ quên cập nhật mapping khi tạo Learner mới) | `learner` phụ thuộc trực tiếp vào `auth.users` tồn tại trước — không thể tạo `Learner` độc lập khỏi Supabase Auth (nhưng đây đúng là bản chất nghiệp vụ: không có Learner nào tồn tại mà không qua đăng nhập) |
| **(B) — Không chọn: `learner.id` riêng + cột mapping `auth_user_id`** | `learner.id` là 1 PK độc lập (UUID hoặc khác), thêm cột `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` | Tách rời "định danh nghiệp vụ" khỏi "định danh đăng nhập" — về lý thuyết cho phép 1 Learner có thể đổi/không gắn auth method nào đó | Mọi RLS Policy (không chỉ trên `learner`, mà trên **toàn bộ bảng có `learner_id`** — tức gần như mọi bảng trong schema) phải JOIN qua `learner` để đổi `auth.uid()` thành `learner.id` trước khi so sánh — tăng độ phức tạp và chi phí truy vấn ở **mọi** Policy, không chỉ 1 chỗ; lợi ích "tách rời" không tương ứng với bất kỳ yêu cầu nghiệp vụ nào đã chốt ở Domain Architecture (không có Open Question hay Decision nào nói Learner cần tồn tại độc lập khỏi auth) |

**Kết luận đánh giá:** Phương án (B) chỉ có lợi nếu hệ thống có nhu cầu nghiệp vụ thực sự cho "Learner không gắn với 1 auth identity cụ thể" (ví dụ tài khoản khách/demo) — **không có yêu cầu nào như vậy được xác nhận** ở Domain Architecture/PRD hiện tại. Khi không có nhu cầu đó, chi phí vận hành của (B) (JOIN ở mọi RLS Policy) không được đền bù bởi lợi ích lý thuyết của nó.

## Khuyến nghị kiến trúc cuối cùng (Final Recommendation)

1. **`learner.id UUID PRIMARY KEY REFERENCES auth.users(id)`** — không có PK nội bộ riêng, không có cột mapping riêng, không có "định danh public riêng" theo đề xuất cũ ở [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md) mục 2 (lý do "tránh lộ thứ tự sinh" không còn áp dụng — UUID do Supabase Auth sinh ra, không tuần tự, không lộ thông tin khối lượng dữ liệu).
2. **Mọi FK `learner_id` trong toàn schema (gần như mọi bảng — Goal, Evidence, KnowledgeNodeMastery, MentorSession, LearningSession, DiscoverySession, RecommendationProposal...) đều là UUID**, tham chiếu `learner.id` — đây là hệ quả trực tiếp, không phải quyết định riêng.
3. **Cảnh báo cần xử lý ở tầng Application/Backend (không phải DDL, ghi nhận để không quên):** [DECISION-037](DECISION-037-Right-To-Be-Forgotten-Anonymization.md) chốt Right-to-be-Forgotten qua **Anonymization, không Hard Delete**. Nếu FK `learner.id REFERENCES auth.users(id)` dùng `ON DELETE CASCADE`, việc 1 user tự xóa tài khoản qua Supabase Auth API sẽ **cascade xóa cứng `learner`** — vi phạm trực tiếp DECISION-037. **Bắt buộc dùng `ON DELETE RESTRICT`** (hoặc không cho phép xóa `auth.users` trực tiếp qua API mà không qua workflow Anonymization trước) — Backend phải chạy quy trình Anonymization (đổi `learner` sang trạng thái Anonymized) **trước khi** cho phép xóa `auth.users`, không dựa vào cascade tự động của database.
4. **Không cần ID Strategy "Hybrid" (ULID cho append-only / Sequential cho Snapshot) áp dụng cho `Learner`** — `Learner` luôn dùng UUID do Supabase Auth cấp, không tự sinh. Các entity Snapshot khác (`Goal`, `Roadmap`, `KnowledgeNode`...) **không bị ảnh hưởng bởi quyết định này** — ID Strategy của chúng (nếu cần điều chỉnh thêm cho phù hợp PostgreSQL, ví dụ thay `NEWSEQUENTIALID()` bằng `gen_random_uuid()`) là phạm vi kỹ thuật riêng, không thuộc quyết định này (không có Decision nào yêu cầu — ghi nhận như điểm cần theo dõi ở Step 4B, không tự mở rộng phạm vi DECISION-043 ra ngoài Supabase Auth Alignment).

## Consequences

- Đóng điểm ảnh hưởng High #1 ở [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md) mục 3.1/3.4.
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 1.1 (`Learner`) cần cập nhật: PK Strategy đổi từ "Sequential/Identity-friendly + Public ID riêng" thành "UUID, chia sẻ với `auth.users.id`, không Public ID riêng".
- Mọi entity khác có FK `learner_id` (hầu hết Relationship Matrix ở [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md) mục 2) cần xác nhận kiểu dữ liệu UUID cho cột này — không đổi cardinality/ownership, chỉ đổi kiểu dữ liệu vật lý.
- **Yêu cầu mới cho Application Layer (không phải DDL):** workflow xóa tài khoản (right-to-be-forgotten) phải Anonymize `learner` **trước** khi gọi Supabase Auth API xóa `auth.users` — đây là ràng buộc về **thứ tự thao tác ở tầng ứng dụng**, không phải thay đổi schema.
- Không ảnh hưởng Domain Architecture — `Learner` vẫn là Aggregate Root độc lập (Boundary 1) theo đúng định nghĩa đã chốt.

## Related Documents

- [DECISION-037-Right-To-Be-Forgotten-Anonymization](DECISION-037-Right-To-Be-Forgotten-Anonymization.md)
- [DatabaseBlueprint.md](../06_Database/DatabaseBlueprint.md)
- [PhysicalDesignPreparation.md](../06_Database/PhysicalDesignPreparation.md)
- [SupabaseCompatibilityReview.md](../06_Database/SupabaseCompatibilityReview.md)
- [PLATFORM_ALIGNMENT_REVIEW.md](../06_Database/PLATFORM_ALIGNMENT_REVIEW.md)
