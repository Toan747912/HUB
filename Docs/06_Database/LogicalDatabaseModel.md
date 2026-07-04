# Logical Database Model — AI Mentor OS

> **⛔ SUPERSEDED (2026-07-02):** This document blueprints a Postgres/Supabase schema that was never implemented. [DECISION-058](../11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md) establishes MongoDB as canonical — see [MongoPersistenceModel.md](MongoPersistenceModel.md) for the as-built collection diagram. Retained for historical record only.


> Database Design Phase — Step 2. Theo [DECISION-035](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [DECISION-036](../11_Decisions/DECISION-036-LearningProfile-Is-Projection.md), [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md). Xây trên [PersistenceArchitecture.md](PersistenceArchitecture.md) (Step 1) và [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md)/[AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md)/[LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md).
>
> **Chỉ mô tả Logical Model.** KHÔNG thiết kế SQL, không `CREATE TABLE`, không cột, không index, không constraint cụ thể. "Entity" dưới đây là khái niệm logic (tương đương 1 bảng/collection ở Physical Design sau này), không phải định nghĩa vật lý.

## 1. Candidate Entities

18 entity logic, tổng hợp từ toàn bộ Aggregate Root đã chốt qua Round 1-7 ([CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 3) — **cập nhật Step 4B Round 1:** +1 Supporting Persistence Entity (`LearningSessionTransition`, [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md)), không tính vào 18 Domain Entity gốc vì không phải Core Domain Entity/Aggregate (xem ghi chú ở dòng tương ứng trong bảng dưới). **`LearningProfile` không xuất hiện trong danh sách này** — theo [DECISION-036](../11_Decisions/DECISION-036-LearningProfile-Is-Projection.md), nó là Read Model tính từ entity khác, không có persistence boundary riêng.

| Entity | Domain | Aggregate Root? | Persistence Pattern (theo DECISION-035) |
|---|---|---|---|
| `Learner` | Identity | Root (độc lập) | Current State Snapshot |
| `Goal` | Goal & Roadmap | Root (độc lập) | Append-only (immutable, DECISION-032) |
| `Roadmap` | Goal & Roadmap | Root (chứa `RoadmapNode`, `ApprovalRecord`) | Current State Snapshot (cấu trúc) + Append-only (`ApprovalRecord`) |
| `RoadmapNode` | Goal & Roadmap | Con trong Aggregate `Roadmap` | Current State Snapshot |
| `ApprovalRecord` | Goal & Roadmap | Con trong Aggregate `Roadmap` | Append-only |
| `KnowledgeNode` | Knowledge Graph | Root (chứa `KnowledgeEdge` đi ra, `ExpansionRecord`) | Current State Snapshot (nội dung) |
| `KnowledgeEdge` | Knowledge Graph | Con trong Aggregate `KnowledgeNode` | Append-only (immutable, DECISION-025/029) |
| `ExpansionRecord` | Knowledge Graph | Con trong Aggregate `KnowledgeNode` | Append-only |
| `Evidence` | Evidence | Root (chứa `EvidenceLink[]`) | Append-only |
| `EvidenceLink` | Evidence | Con trong Aggregate `Evidence` | Append-only |
| `KnowledgeNodeMastery` | Assessment | Root (độc lập) | Current State Snapshot |
| `AssessmentResult` | Assessment | Root (độc lập) | Append-only |
| `DiscoverySession` | Discovery | Root (chứa `SelfAssessmentMismatch`) | Current State Snapshot (phiên) + Append-only (mismatch) |
| `SelfAssessmentMismatch` | Discovery | Con trong Aggregate `DiscoverySession` | Append-only |
| `MentorSession` | Mentor Interaction | Root (độc lập) | Append-only (lượt tương tác đã xảy ra, không sửa lại) |
| `RecommendationProposal` | Recommendation | Root (độc lập) | Append-only (nội dung) + trạng thái xử lý append-thêm |
| `LearningSession` | Learning Session | Root (chứa `SubSession[]`, `LearningSessionTransition[]`) | Current State Snapshot |
| `SubSession` | Learning Session | Con trong Aggregate `LearningSession` | Current State Snapshot |
| `LearningSessionTransition` *(thêm ở Step 4B Round 1, [DECISION-047](../11_Decisions/DECISION-047-Learning-Session-Transition-Log.md))* | Learning Session | **Supporting Persistence Entity** — con trong Aggregate `LearningSession`, KHÔNG phải Domain Entity/Aggregate riêng | Append-only |

## 2. Relationships & Cardinalities

| Quan hệ | Cardinality | Ghi chú |
|---|---|---|
| `Learner` — `Goal` | 1 — * | Mỗi Goal mới (DECISION-032) gắn cố định 1 Learner; Learner có nhiều Goal theo thời gian (chain, không có "Goal active" mutable — suy ra từ Goal mới nhất chưa bị thay thế) |
| `Goal` — `Roadmap` | 1 — 1 | Không đổi từ Round 1-4 |
| `Roadmap` — `RoadmapNode` | 1 — * | Cây phân cấp, tự tham chiếu (`RoadmapNode` — `RoadmapNode`, 1 — *, cha-con) |
| `RoadmapNode` — `KnowledgeNode` | * — * | Dependency Edge, qua DECISION-015 (Round 2) |
| `Roadmap`/`RoadmapNode` — `ApprovalRecord` | 1 — * | Mỗi đổi cấu trúc cần 1 `ApprovalRecord` (DECISION-006) |
| `KnowledgeNode` — `KnowledgeNode` (qua `KnowledgeEdge`) | * — * | DAG, multi-parent, multi relation-type (DECISION-025) |
| `KnowledgeNode` — `ExpansionRecord` | 1 — * | Chỉ sinh khi Expansion loại Deep/Structural (DECISION-023) |
| `Evidence` — `EvidenceLink` | 1 — * | — |
| `EvidenceLink` — `KnowledgeNode` | * — 1 | Evidence ↔ KnowledgeNode many-to-many thực hiện qua bảng nối `EvidenceLink` (DECISION-022) |
| `Evidence` — `Learner` | * — 1 | — |
| `Evidence` — `MentorSession` | * — 1 (tùy chọn) | Evidence sinh từ 1 lượt tương tác cụ thể — xem Open Question #1 nếu cần bắt buộc |
| `KnowledgeNodeMastery` — `Learner` | * — 1 | — |
| `KnowledgeNodeMastery` — `KnowledgeNode` | * — 1 | 1 `KnowledgeNodeMastery` / Learner×KnowledgeNode |
| `AssessmentResult` — `KnowledgeNode` | * — 1 | Theo DECISION-030 (trường `KnowledgeNode` bắt buộc) |
| `AssessmentResult` — `Evidence`/`EvidenceLink` | * — * | "Evidence References" — tham chiếu, không sở hữu |
| `AssessmentResult` → `KnowledgeNodeMastery` | ghi trực tiếp, không phải FK lưu trữ | Quan hệ nhân quả (DECISION-035), không phải quan hệ tham chiếu cần Reference Rule |
| `DiscoverySession` — `Learner` | * — 1 | — |
| `DiscoverySession` — `SelfAssessmentMismatch` | 1 — * | — |
| `SelfAssessmentMismatch` — `KnowledgeNode` | * — 1 | — |
| `MentorSession` — `Learner` | * — 1 | — |
| `MentorSession` — `SubSession` | * — 1 | Hierarchy 3 tầng (DECISION-031) — `MentorSession` tham chiếu `SubSession`, không thuộc Aggregate của nó |
| `RecommendationProposal` — `Learner` | * — 1 | — |
| `RecommendationProposal` — (`Evidence` \| `AssessmentResult` \| `DiscoverySession`) qua `traced_to[]` | * — * (đa hình) | Không phải 1 FK đơn — xem mục 4 và Open Question #1 |
| `LearningSession` — `Learner` | * — 1 | — |
| `LearningSession` — `Goal` | 1 — 1 | Mỗi `Goal` (immutable) có đúng 1 `LearningSession` trong toàn vòng đời của nó (DECISION-028/032) |
| `LearningSession` — `SubSession` | 1 — * | — |
| `SubSession` — `RoadmapNode`/`KnowledgeNode` | * — 1 | Phạm vi đang xử lý |

## 3. Ownership

Không định nghĩa lại — Ownership đã chốt đầy đủ ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 5. Logical Model chỉ xác nhận: **mỗi entity logic ở mục 1 có đúng 1 domain write-owner**, không có entity nào bị ghi bởi 2 domain. Không phát sinh Ownership Conflict mới ở Step 2.

## 4. Lifecycle (theo entity)

| Entity | Lifecycle |
|---|---|
| `Learner` | Created → Active (mutable) → **Anonymized** (DECISION-037, right-to-be-forgotten — không Hard Delete) |
| `Goal` | Created (immutable) → **Superseded** (khi Learner đổi Goal — không tự chuyển trạng thái, được "thay thế" bởi Goal mới, bản thân row không đổi) |
| `Roadmap`/`RoadmapNode` | Created → Mutated qua `ApprovalRecord` (lặp lại) → đứng yên khi `LearningSession` gắn Goal của nó chuyển Completed/Archived |
| `ApprovalRecord` | Created (immutable, append-only) |
| `KnowledgeNode` | Created → (nội dung có thể sửa — 🔶 OPEN, xem Open Question #4) — không bao giờ xóa |
| `KnowledgeEdge` | Created (immutable, append-only) — không bao giờ sửa/xóa (DECISION-025/029) |
| `ExpansionRecord` | Created (immutable, append-only) |
| `Evidence`/`EvidenceLink` | Created (immutable, append-only) — không bao giờ sửa/xóa |
| `KnowledgeNodeMastery` | Created (lần đầu có Evidence cho Learner×KnowledgeNode) → Updated liên tục (ghi trực tiếp mỗi `AssessmentResult` mới, DECISION-035) — không bao giờ xóa |
| `AssessmentResult` | Created (immutable, append-only) |
| `DiscoverySession` | Created → Active → Ended (đơn giản, không đổi từ Round 1) |
| `SelfAssessmentMismatch` | Created (immutable, append-only) |
| `MentorSession` | Created → Active (có thể đổi Learning Mode giữa phiên) → Ended (immutable sau khi kết thúc) |
| `RecommendationProposal` | Created (Proposed, nội dung immutable) → **Confirmed** \| **Ignored** (1 lần chuyển, ghi nhận như fact bổ sung — không update tại chỗ, theo PersistenceArchitecture.md mục 3.4) |
| `LearningSession` | Started → Active ⇄ Paused → **Completed** \| **Archived** (terminal, DECISION-028/032/033) |
| `SubSession` | Started (Active) → Ended — không có Paused riêng |

## 5. Aggregate Persistence Boundaries

Ranh giới giao dịch (đọc/ghi đồng thời, toàn vẹn nội bộ) — khớp 1:1 với Aggregate Root đã chốt ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 3, không mở rộng thêm:

```
Boundary 1:  Learner                                          (đơn lẻ)
Boundary 2:  Goal                                              (đơn lẻ, immutable)
Boundary 3:  Roadmap ⊃ RoadmapNode[], ApprovalRecord[]          (1 giao dịch / đổi cấu trúc)
Boundary 4:  KnowledgeNode ⊃ KnowledgeEdge[] (đi ra), ExpansionRecord[]   (1 giao dịch / Expansion)
Boundary 5:  Evidence ⊃ EvidenceLink[]                          (1 giao dịch / lượt ghi nhận)
Boundary 6:  KnowledgeNodeMastery                               (đơn lẻ, 1 / Learner×KnowledgeNode)
Boundary 7:  AssessmentResult                                   (đơn lẻ, immutable)
Boundary 8:  DiscoverySession ⊃ SelfAssessmentMismatch[]        (1 giao dịch / phát hiện mismatch)
Boundary 9:  MentorSession                                      (đơn lẻ)
Boundary 10: RecommendationProposal                             (đơn lẻ)
Boundary 11: LearningSession ⊃ SubSession[], LearningSessionTransition[]   (1 giao dịch / mở Sub Session mới hoặc đổi state)
```

**Quy tắc rút ra:** không có giao dịch nào cần ghi đồng thời lên **2 Boundary khác nhau** trong cùng 1 transaction theo Domain Architecture hiện tại — ví dụ ghi 1 `AssessmentResult` (Boundary 7) và cập nhật `KnowledgeNodeMastery` (Boundary 6) là **2 transaction logic riêng**, dù xảy ra "đồng thời" về nghiệp vụ (Assessment Domain có thể chọn ghi cả hai trong 1 transaction kỹ thuật ở Physical Design sau này để đảm bảo nhất quán, nhưng đó là chi tiết Physical Design, không phải ranh giới Aggregate logic).

## 6. Reference Rules

| Quan hệ | Reference Rule | Lý do |
|---|---|---|
| `Learner` → (mọi entity tham chiếu `learner_id`) | **Anonymize** | DECISION-037 — không Hard Delete, không Cascade Delete; khi Learner thực hiện right-to-be-forgotten, định danh cá nhân trên `Learner` bị ẩn danh hóa, mọi entity khác **giữ nguyên**, chỉ còn tham chiếu tới 1 định danh hệ thống không thể truy ngược |
| `Goal` → `Roadmap` | **Archive (cùng nhau)** | Goal immutable không tự xóa; khi `LearningSession` gắn Goal đó chuyển Archived, `Roadmap` tương ứng coi như đứng yên theo — không có hành động xóa nào, chỉ ngừng nhận thay đổi mới |
| `Roadmap` → `RoadmapNode` | **Cascade (trong phạm vi Aggregate)** | `RoadmapNode` là con trong Boundary 3 — không có vòng đời độc lập ngoài `Roadmap` cha |
| `RoadmapNode` → `KnowledgeNode` | **Restrict** | `KnowledgeNode` không bao giờ bị xóa trong toàn hệ thống (append-only theo triết lý chung) — quy tắc Restrict ở đây mang tính lý thuyết, không có tình huống xóa thực tế xảy ra |
| `KnowledgeNode` → `KnowledgeEdge`/`ExpansionRecord` | **Cascade (trong phạm vi Aggregate)**, nhưng *không bao giờ áp dụng* vì `KnowledgeNode` không bị xóa | Con trong Boundary 4 |
| `Evidence` → `EvidenceLink` | **Cascade (trong phạm vi Aggregate)** | Con trong Boundary 5 |
| `EvidenceLink`/`AssessmentResult` → `KnowledgeNode` | **Restrict** | Không được phép tồn tại `EvidenceLink`/`AssessmentResult` trỏ tới `KnowledgeNode` đã xóa — nhất quán vì `KnowledgeNode` không xóa |
| `RecommendationProposal`/`AssessmentResult` → `Evidence` (Evidence References / traced_to[]) | **Restrict** | Evidence được tham chiếu không bao giờ được xóa — vi phạm Explainability First nếu cho phép |
| `LearningSession` → `Goal` | **Archive (cùng nhau)** | Khi Goal bị "thay thế" (DECISION-032), `LearningSession` chuyển Archived — đây là transition 2 chiều cùng xảy ra trong 1 hành động nghiệp vụ ("đổi Goal"), không phải cascade kiểu xóa |
| `LearningSession` → `SubSession` | **Cascade (trong phạm vi Aggregate)** | Con trong Boundary 11 |
| `SubSession` → `MentorSession` | **Restrict / Archive độc lập** | `MentorSession` thuộc Aggregate khác (Boundary 9, Mentor Interaction Domain) — khi `SubSession`/`LearningSession` Archived, `MentorSession` **không bị xóa, không bị sửa**, tiếp tục là lịch sử độc lập, chỉ không còn được Sub Session "đang active" nào tham chiếu thêm |
| `DiscoverySession` → `SelfAssessmentMismatch` | **Cascade (trong phạm vi Aggregate)** | Con trong Boundary 8 |

**Không có quan hệ nào dùng Cascade Delete theo nghĩa "xóa cha thì xóa con" giữa 2 Aggregate khác nhau** — Cascade chỉ áp dụng nội bộ trong 1 Aggregate (entity con không có ý nghĩa tồn tại độc lập). Giữa Aggregate với Aggregate, chỉ có **Restrict** (không cho xóa nếu còn tham chiếu) hoặc **Archive** (chuyển trạng thái, không xóa) — nhất quán với nguyên tắc immutable-by-default đã chốt ở [PersistenceArchitecture.md](PersistenceArchitecture.md).

## 7. Entity Relationship Overview (text-based)

```
Learner ──1───*── Goal ──1───1── Roadmap ──1───*── RoadmapNode ──*───* ── KnowledgeNode
   │                                          │                         │   │  ▲
   │                                          *                         │   │  │ (KnowledgeEdge, DAG, *──*)
   │                                    ApprovalRecord                  │   ▼  │
   │                                                                    │ KnowledgeNode (cùng entity, self-ref qua Edge)
   │                                                                    │   │
   │                                                                    │   1
   │                                                                    │   *
   │                                                                    │ ExpansionRecord
   │
   ├──1───*── LearningSession ──1───1── Goal (cùng Goal ở trên)
   │              │
   │              1
   │              *
   │           SubSession ──*───1── RoadmapNode / KnowledgeNode (phạm vi)
   │              │
   │              *  (tham chiếu, không sở hữu)
   │              ▼
   │          MentorSession ──*───1── Learner (cùng Learner ở trên)
   │
   ├──1───*── Evidence ──1───*── EvidenceLink ──*───1── KnowledgeNode
   │              ▲
   │              │ (tham chiếu, "Evidence References")
   │              │
   ├──1───*── AssessmentResult ──*───1── KnowledgeNode
   │              │
   │              ▼ (ghi trực tiếp, không phải FK lưu trữ — DECISION-035)
   │          KnowledgeNodeMastery ──*───1── KnowledgeNode
   │              ▲
   │              │ (cùng Learner)
   │
   ├──1───*── DiscoverySession ──1───*── SelfAssessmentMismatch ──*───1── KnowledgeNode
   │
   └──1───*── RecommendationProposal ──*───*── (Evidence | AssessmentResult | DiscoverySession)   [traced_to[], đa hình]
```

## 8. Persistence Risks

| # | Rủi ro | Mức độ |
|---|---|---|
| 1 | ~~`traced_to[]`/"Evidence References" là tham chiếu đa hình~~ — **✅ đóng ở Round 8 bởi [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)** (mô hình `TraceLink` tập trung, không Polymorphic FK rải trên từng entity) | Đã giải quyết |
| 2 | **Đồng bộ trạng thái Archive giữa 3 Aggregate riêng** (`Goal`, `Roadmap`, `LearningSession`) khi Learner đổi Goal — vì đây là 3 Boundary riêng (mục 5), không có transaction logic chung nào bắt buộc cả 3 cùng chuyển trạng thái trong 1 bước; nếu Physical Design không xử lý cẩn thận (ví dụ qua 1 transaction kỹ thuật hoặc Saga), có thể xảy ra trạng thái nửa-archived | Trung bình |
| 3 | **Anonymization (DECISION-037) chạm tới hầu hết entity có `learner_id`** — về mặt logic là "chỉ sửa Learner", nhưng về vận hành cần xác nhận lại mọi entity tham chiếu Learner vẫn đọc được sau khi ẩn danh hóa (không có FK nào bị NULL hóa nhầm) | Trung bình |
| 4 | **`KnowledgeEdge` (M:N qua DAG) có thể tăng nhanh** khi Knowledge Graph mở rộng — không phải lỗi thiết kế (đã chấp nhận ở DECISION-029), nhưng là rủi ro vận hành cần theo dõi khi sang Physical Design (đặc biệt index 2 chiều) |Thấp (đã biết, đã chấp nhận trade-off) |
| 5 | **`RoadmapNode` tự tham chiếu (cây) + `KnowledgeNode` tự tham chiếu (DAG qua Edge)** là 2 kiểu self-reference khác bản chất (cây 1 cha vs đồ thị nhiều cha) — cần đảm bảo Physical Design không nhầm áp dụng cùng 1 pattern lưu trữ cho cả hai | Thấp (đã phân biệt rõ ở Domain Architecture, chỉ là điểm cần lưu ý khi hiện thực) |

## 9. Open Questions

1. ~~Pattern cụ thể cho tham chiếu đa hình~~ → **✅ đóng ở Round 8 bởi [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)** — `TraceLink`. Chi tiết Scope/Ownership/Lifecycle: [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6.
2. **🔶 `Evidence` — `MentorSession` có bắt buộc (1) hay tùy chọn (0..1)?** — nếu Evidence luôn sinh từ đúng 1 MentorSession thì nên là bắt buộc; nếu có nguồn Evidence khác (ví dụ trực tiếp từ Discovery) thì cần tùy chọn. Domain Architecture hiện tại chưa nói rõ.
3. **🔶 Đồng bộ Archive giữa `Goal`/`Roadmap`/`LearningSession`** — có cần 1 trường `archived_at` trên cả `Goal` và `Roadmap` (dù bản thân chúng "immutable"/"không có state riêng"), hay chỉ `LearningSession.state` là nguồn sự thật duy nhất cho "Goal này còn active không"? Liên quan Risk #2.
4. **🔶 `KnowledgeNode` (nội dung) có version/history khi sửa không** — kế thừa từ [PersistenceArchitecture.md](PersistenceArchitecture.md) Open Question #4, vẫn chưa trả lời, ảnh hưởng trực tiếp Lifecycle ở mục 4.
5. Các Open Question kế thừa từ Round 4-7 chưa trả lời (câu 18, 20, 21 trong [OpenQuestions.md](../01_PRD/OpenQuestions.md); cơ chế "retract" Evidence/KnowledgeEdge từ PersistenceArchitecture.md Open Question #2-3) vẫn áp dụng nguyên trạng, không lặp lại nội dung ở đây.

## 10. Readiness Assessment cho Physical Database Design

### Kết luận: ✅ READY (cập nhật Round 8)

**Sẵn sàng cho toàn bộ 10/10 phần** — caveat duy nhất còn lại (pattern tham chiếu đa hình) đã đóng bởi [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) (`TraceLink`). Toàn bộ entity, quan hệ, cardinality, ownership, lifecycle, aggregate boundary, và reference rule đã đủ rõ để Physical Design tiến hành cho toàn bộ 18 entity + `TraceLink`.

**Không có blocker nào liên quan tới Domain Architecture hay Persistence Strategy** — toàn bộ nền tảng từ Round 1-8 (DECISION-001 đến DECISION-038, trừ gap 034) đã đủ ổn định. Đánh giá chi tiết Step 3 (ID/Audit/Soft Delete/Versioning Strategy, SQL Server suitability): [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md).

## Liên kết ngược

[PersistenceArchitecture.md](PersistenceArchitecture.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md), [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md), [RuntimeLearningFlow.md](../03_Domain_Model/RuntimeLearningFlow.md), [PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md), [DECISION-035](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [DECISION-036](../11_Decisions/DECISION-036-LearningProfile-Is-Projection.md), [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md).

**Vẫn chưa thiết kế bảng/cột/SQL — đây là Logical Model (Step 2). Physical Database Design là bước kế tiếp, chưa bắt đầu.**
