# Database — AI Mentor OS

> Mở khóa từ [DECISION-018-Domain-Modeling-Phase](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md) (điều kiện mở khóa đã đạt ở Round 6, [PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md)).

Database Design Phase, theo thứ tự:

1. [PersistenceArchitecture.md](PersistenceArchitecture.md) — Step 1, hoàn thành
2. [LogicalDatabaseModel.md](LogicalDatabaseModel.md) — Step 2, hoàn thành (READY toàn phần sau [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md))
3. [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) — Step 3, hoàn thành
4. [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md) — Readiness Assessment Step 1-3, kết luận READY
5. **Step 4 — Physical Database Design**, tách theo [DECISION-040](../11_Decisions/DECISION-040-Physical-Database-Design-Split.md):
   - **Step 4A — Database Blueprint**: [DatabaseBlueprint.md](DatabaseBlueprint.md) + [DatabaseBlueprintReview.md](DatabaseBlueprintReview.md) — kết luận READY_FOR_DDL
   - **Step 4A.5 — Database Naming Convention**: [DatabaseNamingConvention.md](DatabaseNamingConvention.md) (đã cập nhật `snake_case`) + [NamingIssueResolution.md](NamingIssueResolution.md) — kết luận READY_FOR_DDL
   - **Pre-DDL Platform Alignment**: [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) + [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) + [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md) — kết luận **READY_FOR_DDL**
   - **Step 4B — DDL Generation** (hiện tại):
     - **Round 1 — Core Foundation** (Identity/Goal/Roadmap/Learning Session Module): [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) + [DDL_ROUND1_REVIEW.md](DDL_ROUND1_REVIEW.md) — kết luận **READY_FOR_SQL_GENERATION** (sau khi [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md) APPROVED `learning_session_transition`)
     - **Round 2 — Knowledge + Evidence + Assessment + Traceability**: [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) + [DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md) + [ROUND2_ARCHITECTURE_REVIEW.md](ROUND2_ARCHITECTURE_REVIEW.md) — kết luận **READY_FOR_SQL_GENERATION** (`positive_evidence`/`negative_evidence` không tạo bảng riêng — map vào `evidence_link.stance` theo DECISION-022; `assessment` wrapper không tạo — chưa có cơ sở Domain Architecture)
     - **Round 3 — Cross-Module Closure** (`roadmap_node_knowledge_node`, `expansion_record`): [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) + [DDL_ROUND3_REVIEW.md](DDL_ROUND3_REVIEW.md) + [ROUND3_ARCHITECTURE_REVIEW.md](ROUND3_ARCHITECTURE_REVIEW.md) — kết luận **READY_FOR_SQL_GENERATION**; validate Round 1+2+3 (19 bảng) hỗ trợ AI Teaching (✅ gap nghiêm trọng nhất đã đóng)/Assessment (✅)/Recommendation (🟡 nền tảng sẵn sàng, capability tự thân hoãn Round 4)/Explainability (✅ đủ cấu trúc, 3 điểm enforcement phụ thuộc Application Layer đã ghi nhận)
     - **Round 3.5 — Explainability Integrity Review**: [EXPLAINABILITY_INTEGRITY_REVIEW.md](EXPLAINABILITY_INTEGRITY_REVIEW.md) + [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md) — review-only (không SQL, không entity mới, không Recommendation). Kết luận **NEEDS_REVISION** (phạm vi hẹp): 2 gap **Critical** mới phát hiện — Teaching decision không persist (GAP-01), Local Knowledge Expansion thiếu log lý do nội bộ bắt buộc theo DECISION-027 (GAP-02). Không huỷ verdict `READY_FOR_SQL_GENERATION` của Round 1/2/3; chỉ chặn SQL Generation cho riêng Teaching capability và Local Expansion capability tới khi Founder/Lead Architect chọn hướng xử lý.
     - Round 4+ (Discovery/Mentor Interaction/Recommendation, + forward-dependency còn mở: `sub_session.knowledge_node_id`, `sub_session↔mentor_session`, + 2 gap Critical từ Round 3.5): chưa bắt đầu

Quyết định liên quan: [DECISION-039-Knowledge-Graph-Persistence](../11_Decisions/DECISION-039-Knowledge-Graph-Persistence.md) (Knowledge Graph = bảng quan hệ + Recursive CTE, không SQL Server Graph Extensions ở v1).

> ✅ **Pre-DDL Platform Alignment hoàn thành:** [SupabaseCompatibilityReview.md](SupabaseCompatibilityReview.md) xác định 4 blocker (Naming case, ID Strategy/Supabase Auth, Versioning, Temporal) — cả 4 đã được hoàn thiện và khóa thành [DECISION-042](../11_Decisions/DECISION-042-Database-Naming-Convention-Alignment.md) (Naming snake_case), [DECISION-043](../11_Decisions/DECISION-043-Supabase-Auth-Alignment.md) (`learner.id = auth.users.id`), [DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md) (`version_number`), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) (History Table trigger-maintained, phạm vi thu hẹp). Đối chiếu đầy đủ: [PLATFORM_ALIGNMENT_REVIEW.md](PLATFORM_ALIGNMENT_REVIEW.md) — kết luận **READY_FOR_DDL**.
>
> [HybridAIArchitectureReview.md](HybridAIArchitectureReview.md) (kết luận READY cho Domain/Entity, đề xuất DECISION-046 cho 1 enum audit) **vẫn là proposal mở** — không chặn Step 4B, chỉ ảnh hưởng 1 enum (`actor_type`), khuyến nghị xác nhận trước khi viết CHECK constraint cho cột đó.
>
> **Step 4B (DDL Generation) có thể bắt đầu.**
