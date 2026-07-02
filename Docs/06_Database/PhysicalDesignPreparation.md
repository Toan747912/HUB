# Physical Design Preparation — AI Mentor OS

> Database Design Phase — Step 3. Theo [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md). Xây trên [LogicalDatabaseModel.md](LogicalDatabaseModel.md) (Step 2, nay đã READY toàn phần) và [PersistenceArchitecture.md](PersistenceArchitecture.md) (Step 1).
>
> **Chỉ chuẩn bị cho Physical Database Design — không thiết kế `CREATE TABLE`, không cột, không index, không constraint cụ thể.** Các mục 2-5 (ID/Audit/Soft Delete/Versioning) là **đề xuất** (proposal) — chưa phải Decision Log, cần Founder/ChatGPT xác nhận trước khi Physical Design áp dụng làm chuẩn chính thức. Mục 6 (TraceLink) là **thiết kế mức Logical** theo DECISION-038 đã khóa. Mục 7 (SQL Server) là **đánh giá**, không phải lựa chọn cuối cùng về hệ quản trị CSDL.

## 1. Bối cảnh

10/10 phần của Logical Database Model đã READY ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 10, cập nhật Round 8 sau DECISION-038). Step 3 chuẩn bị 4 chiến lược xuyên hệ thống (ID, Audit, Soft Delete, Versioning) + thiết kế mô hình `TraceLink` + đánh giá sự phù hợp của SQL Server — để Physical Database Design (Step 4) có nền tảng nhất quán, không phải tự quyết định lặt vặt cho từng bảng riêng lẻ.

## 2. Đề xuất: ID Strategy

**Đề xuất: Hybrid** (không phải UUID/ULID/Snowflake thuần).

| Lớp entity | ID đề xuất | Lý do |
|---|---|---|
| Entity append-only, tần suất ghi cao (`Evidence`, `EvidenceLink`, `AssessmentResult`, `KnowledgeEdge`, `TraceLink`, `ApprovalRecord`, `ExpansionRecord`, `SelfAssessmentMismatch`) | **ULID-style** (hoặc tương đương: định danh có thành phần thời gian ở đầu, sinh được ở Application Layer không cần round-trip tới DB) | Tránh phân mảnh clustered index (nhược điểm kinh điển của UUID v4 ngẫu nhiên trên SQL Server); vẫn sinh được độc lập ở nhiều tiến trình (AI service, backend) mà không cần xin ID từ DB trước — quan trọng vì Evidence/AssessmentResult có thể được tạo từ AI Service, không chỉ Backend Core |
| Entity Current State Snapshot, tần suất ghi thấp-trung bình (`Learner`, `Goal`, `Roadmap`, `RoadmapNode`, `KnowledgeNode`, `KnowledgeNodeMastery`, `LearningSession`, `SubSession`, `MentorSession`, `RecommendationProposal`, `DiscoverySession`) | **Sequential/Identity-friendly** (ví dụ `BIGINT IDENTITY` nội bộ, hoặc GUID sinh tuần tự kiểu `NEWSEQUENTIALID()` nếu cần GUID) | Tần suất ghi thấp hơn, lợi ích "sinh độc lập không cần DB" ít quan trọng hơn lợi ích hiệu năng index tuần tự của SQL Server |
| Định danh lộ ra ngoài (API công khai, nếu có, hoặc tham chiếu cross-system với AI Service) | **1 định danh "public" riêng** (UUID), tách khỏi khóa nội bộ | Không lộ thứ tự sinh/khối lượng dữ liệu nội bộ qua ID công khai (rò rỉ thông tin nghiệp vụ qua ID tuần tự là rủi ro phổ biến) |

**Không đề xuất Snowflake** (cần điều phối worker/node ID giữa nhiều tiến trình sinh ID — độ phức tạp vận hành không cần thiết ở quy mô hiện tại; ULID đạt được lợi ích tương đương — sortable theo thời gian — với độ phức tạp thấp hơn).

## 3. Đề xuất: Audit Strategy

Không định nghĩa cột cụ thể (ngoài phạm vi tài liệu này) — chỉ định nghĩa **2 nhóm metadata bắt buộc theo loại entity**, kế thừa nguyên tắc đã chốt ở [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 4:

1. **Entity Append-only (immutable):** chỉ cần metadata "nguồn gốc tạo" (thời điểm, tác nhân/domain nào tạo) — bản ghi tự nó là audit trail đầy đủ, không cần audit log song song.
2. **Entity Current State Snapshot (mutable):** cần cả metadata "nguồn gốc tạo" **và** "lần sửa gần nhất" — nhưng quan trọng hơn, theo DECISION-035, **không dựa vào audit log để biết "ai/cái gì đã đổi state này lần cuối"** mà phải dựa vào liên kết ngược tới entity append-only đã gây ra thay đổi đó (ví dụ `KnowledgeNodeMastery` → `AssessmentResult` mới nhất; `LearningSession.state = Paused` → `TraceLink`/`RecommendationProposal` nếu do Recommendation kích hoạt).

**Đề xuất cụ thể cho SQL Server (xem mục 7):** dùng **Temporal Tables (System-Versioned)** cho toàn bộ entity ở nhóm 2 — đây là tính năng native của SQL Server tự động duy trì lịch sử thay đổi (1 bảng history song song, do engine quản lý) mà không cần Application Layer tự viết audit log thủ công. Đây là **đề xuất**, không phải quyết định cuối — Physical Design cần xác nhận có dùng tính năng SQL Server-specific này hay giữ cách trung lập hệ quản trị (audit log tự viết ở Application Layer).

## 4. Đề xuất: Soft Delete Strategy

**Không dùng cờ `is_deleted` tổng quát cho toàn hệ thống.** Lý do: theo triết lý immutable-by-default đã chốt xuyên Round 3-7, hầu hết entity **không bao giờ bị xóa** (kể cả "xóa mềm") — chúng chỉ chuyển trạng thái có ý nghĩa nghiệp vụ cụ thể:

| Entity | "Soft delete" tương đương | Không phải |
|---|---|---|
| `Learner` | **Anonymization** (DECISION-037) | `is_deleted = true` |
| `Goal` | **Superseded** (bị thay thế bởi Goal mới, DECISION-032) — bản ghi cũ không đổi | Xóa/ẩn Goal cũ |
| `LearningSession`/`SubSession` | **Archived/Completed/Ended** (trạng thái terminal đã có, DECISION-028/032) | Cờ xóa riêng |
| `RoadmapNode` | **Trạng thái "retired/superseded" qua ApprovalRecord** (nếu Learner bỏ 1 nhánh Roadmap) — đề xuất mới, cần xác nhận | Xóa cứng node khỏi cây |
| Mọi entity append-only (`Evidence`, `AssessmentResult`, `KnowledgeEdge`, `RecommendationProposal`, `TraceLink`...) | **Không áp dụng khái niệm xóa/soft-delete** — không bao giờ bị ẩn hay xóa | — |

**Trường hợp ngoại lệ duy nhất nên cho phép xóa cứng thật (không phải soft delete):** dữ liệu rõ ràng là **draft/lỗi nhập liệu chưa được tham chiếu bởi bất kỳ entity nào khác** (ví dụ 1 `DiscoverySession` bị tạo nhầm do lỗi client, chưa sinh ra `SelfAssessmentMismatch` hay bất kỳ Evidence nào) — đây là tình huống hiếm, nên xử lý như ngoại lệ có kiểm soát ở Application Layer, không thiết kế cơ chế xóa chung cho toàn hệ thống.

## 5. Đề xuất: Versioning Strategy

Kế thừa [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 5 — cụ thể hóa thêm 1 bước:

- **Entity append-only:** không cần version — mỗi bản ghi mới chính là "version mới" theo nghĩa lịch sử.
- **Entity Current State Snapshot có rủi ro ghi đồng thời** (`KnowledgeNodeMastery` là rủi ro đã xác định rõ nhất — xem PersistenceArchitecture.md Risk #1): **đề xuất dùng concurrency token** (ví dụ kiểu `ROWVERSION`/`rowversion` — tính năng native SQL Server, tăng tự động mỗi lần row bị sửa) để Application Layer phát hiện ghi đè mất dữ liệu (optimistic concurrency), không cần tự quản lý số version thủ công.
- **`Roadmap`/`RoadmapNode`:** không cần concurrency token riêng — đã được bảo vệ bằng cổng `ApprovalRecord` (chỉ 1 đường ghi hợp lệ tại 1 thời điểm theo Roadmap Governance, DECISION-006).
- **`Learner`:** rủi ro ghi đồng thời thấp (Learner tự sửa thông tin của chính mình, không có nhiều tác nhân ghi cùng lúc) — không cần concurrency token, nhưng không có hại nếu áp dụng đồng nhất.

## 6. Thiết kế: TraceLink Model

Theo [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md). Đây là thiết kế mức Logical (không phải cột/bảng vật lý).

### Scope

`TraceLink` đại diện cho **1 quan hệ truy vết có hướng** giữa 1 entity "kết quả/quyết định" và 1 entity "nguồn gốc" — áp dụng cho đúng 3 nhóm quan hệ đã xác định là đa hình ở Logical Model:

1. `AssessmentResult` → "Evidence References" (trỏ tới `Evidence`/`EvidenceLink`)
2. `RecommendationProposal` → `traced_to[]` (trỏ tới `Evidence`, `AssessmentResult`, hoặc `DiscoverySession`)
3. `KnowledgeNodeExpanded` (Local) → lý do nội bộ truy vết được (DECISION-027/Open Question #21 kế thừa — TraceLink là cơ chế khả dĩ cho việc này, không tự đóng câu hỏi đó ở đây)

**Không áp dụng `TraceLink` cho quan hệ đã có kiểu cố định rõ ràng** — ví dụ `EvidenceLink → KnowledgeNode` (luôn đúng 1 loại đích) tiếp tục là quan hệ trực tiếp thông thường, không đi qua `TraceLink`. `TraceLink` chỉ dùng đúng nơi tính đa hình (nhiều loại đích/nguồn có thể) thực sự tồn tại.

### Ownership

`TraceLink` **không thuộc Core Domain nghiệp vụ nào** — không phải Aggregate Root của Assessment/Evidence/Recommendation/Knowledge Graph. Đây là hạ tầng cross-cutting thực thi Explainability First ở tầng lưu trữ (tương tự cách Learning Session là hạ tầng điều phối ở tầng runtime, nhưng `TraceLink` ở tầng persistence).

- **Ghi:** domain nào tạo ra entity "kết quả" (Assessment Domain khi tạo `AssessmentResult`; Recommendation Domain khi tạo `RecommendationProposal`; Knowledge Graph Domain khi Local Expansion) **tự ghi `TraceLink` của chính nó** trong cùng 1 đơn vị giao dịch với việc tạo entity đó — không có 1 domain trung tâm "quản lý TraceLink hộ" các domain khác.
- **Đọc:** mọi domain (và Memory Profile/Learning Profile khi cần "drill-down" theo PersistenceArchitecture.md mục 6) đều có thể đọc `TraceLink` để truy vết — đọc không giới hạn domain, vì mục đích của nó là minh bạch xuyên hệ thống.

### Lifecycle

**Created → (không đổi, vĩnh viễn).** `TraceLink` luôn được tạo **đồng thời, cùng giao dịch** với entity nó mô tả (ví dụ: tạo `AssessmentResult` và các `TraceLink` trỏ tới Evidence của nó phải atomic — không có `AssessmentResult` nào tồn tại mà thiếu `TraceLink` tương ứng). Sau khi tạo, `TraceLink` **không bao giờ sửa hoặc xóa** — nhất quán hoàn toàn với nguyên tắc immutable-by-default đã áp dụng cho mọi entity append-only khác trong hệ thống.

## 7. Đánh giá: SQL Server Suitability

Founder có nền tảng SQL Server mạnh — đánh giá độ phù hợp dựa trên đặc điểm Domain/Persistence Architecture đã chốt:

| Đặc điểm hệ thống cần | Tính năng SQL Server liên quan | Mức phù hợp |
|---|---|---|
| Audit Strategy (Snapshot + lịch sử thay đổi, mục 3) | **Temporal Tables (System-Versioned)** — tự động duy trì bảng lịch sử, không cần code audit log thủ công | Rất phù hợp — khớp trực tiếp pattern Snapshot+Event đã chốt (DECISION-035) cho `KnowledgeNodeMastery`/`LearningSession`/`Roadmap`/`Learner` |
| Versioning Strategy (optimistic concurrency, mục 5) | **`rowversion`/`ROWVERSION`** — kiểu dữ liệu native, tự tăng mỗi lần sửa row | Rất phù hợp — đúng nhu cầu, không cần tự quản lý version number |
| `RoadmapNode` (cây, tự tham chiếu) | **Recursive CTE** (`WITH ... AS (...)`) — hỗ trợ tốt, ổn định | Phù hợp tốt |
| `KnowledgeNode`/`KnowledgeEdge` (DAG, reachability check — DECISION-029) | 2 lựa chọn: (a) bảng quan hệ thường (`from_node_id`/`to_node_id`) + Recursive CTE cho traversal; (b) **SQL Server Graph Extensions** (`NODE`/`EDGE` table, mệnh đề `MATCH`, có từ SQL Server 2017) | Phù hợp — **cần Physical Design chọn (a) hay (b)**, không phải blocker, chỉ là 1 lựa chọn kỹ thuật cụ thể nằm ngoài phạm vi Step 3 |
| ID Strategy Hybrid (mục 2) | `NEWSEQUENTIALID()` cho GUID tuần tự nếu cần GUID nội bộ; `BIGINT IDENTITY` cho entity tần suất ghi thấp | Phù hợp tốt — đúng lý do đề xuất Hybrid ở mục 2 (tránh phân mảnh clustered index, vấn đề kinh điển và đã biết rõ trên SQL Server) |
| `TraceLink` (mục 6) — bảng quan hệ tập trung, ghi nhiều, đọc theo nhiều chiều | Bảng quan hệ thông thường + index phù hợp (chi tiết để Physical Design) | Phù hợp — không cần tính năng đặc biệt |
| Evidence/Reasoning (nội dung tự do, có thể bán cấu trúc) | **Kiểu `JSON`/`nvarchar(max)` với hàm JSON** (từ SQL Server 2016+) | Phù hợp — đủ cho nhu cầu hiện tại, không cần NoSQL riêng cho phần này |

**Kết luận:** **SQL Server phù hợp tốt** với toàn bộ Persistence Architecture/Logical Model đã chốt — không phát hiện nhu cầu nào của hệ thống mà SQL Server không đáp ứng được ở mức nguyên tắc. Điểm duy nhất cần quyết định ở Physical Design (không phải ở Step 3 này): chọn mô hình lưu Knowledge Graph là **bảng quan hệ + Recursive CTE** (đơn giản hơn, đội ngũ SQL Server truyền thống dễ vận hành/debug hơn) hay **SQL Server Graph Extensions** (khớp ngữ nghĩa DAG tự nhiên hơn, nhưng là tính năng ít phổ biến hơn, cần đánh giá kinh nghiệm vận hành thực tế của team). Đề xuất nghiêng về **bảng quan hệ + Recursive CTE** trước, vì nhất quán với quyết định "đơn giản trước" đã áp dụng ở DECISION-029 (Runtime Reachability Check thay Closure Table) — cùng triết lý, không thêm tính năng phức tạp khi chưa có bằng chứng cần thiết.

## 8. Liên kết ngược

[LogicalDatabaseModel.md](LogicalDatabaseModel.md), [PersistenceArchitecture.md](PersistenceArchitecture.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), [DECISION-037-Right-To-Be-Forgotten-Anonymization](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md), [PHYSICAL_DESIGN_READINESS.md](PHYSICAL_DESIGN_READINESS.md).

**Vẫn chưa thiết kế `CREATE TABLE`/cột/index/constraint — đây là chuẩn bị cho Physical Database Design, chưa phải Physical Database Design.**
