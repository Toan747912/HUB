# Persistence Architecture — AI Mentor OS

> Trạng thái: Database Design Phase — Step 1 (Persistence Architecture). Theo bối cảnh được xác nhận: Domain Architecture đã hoàn thành ([PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md), Round 6), [DECISION-018](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md) được mở khóa.
>
> **Phạm vi:** Trả lời "mỗi Core Domain sẽ được lưu trữ như thế nào" ở mức nguyên tắc/pattern. **KHÔNG thiết kế bảng, không thiết kế cột, không viết SQL/Mongo Schema, không thiết kế API.** Mọi tên entity dùng dạng domain-level (`Goal`, `Evidence`...), không phải tên bảng.
>
> Nguồn thẩm quyền cho định nghĩa entity/ownership: [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md), [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md). Tài liệu này chỉ thêm 1 lớp mới: **chiến lược lưu trữ**, không định nghĩa lại entity nào đã chốt.

## 0. Quy ước thuật ngữ (đối chiếu trước khi đọc bảng)

Đề bài yêu cầu phân tích 9 mục, nhưng `CoreDomainMap.md` có 10 Core Domain với tên gọi khác đôi chỗ. Đối chiếu để không tạo nhầm lẫn:

| Tên trong yêu cầu này | Tên chính thức trong Domain Architecture | Ghi chú |
|---|---|---|
| Goal | Goal (con của Goal & Roadmap Domain) | Không đổi |
| Roadmap | Roadmap (con của Goal & Roadmap Domain) | Không đổi |
| LearningSession | Learning Session Domain | Không đổi |
| KnowledgeGraph | Knowledge Graph Domain | Không đổi |
| Evidence | Evidence Domain | Không đổi |
| Assessment | Assessment Domain | Tách 2 Aggregate: `KnowledgeNodeMastery` + `AssessmentResult` — phân tích riêng |
| Recommendation | Recommendation Domain | Không đổi |
| **User Profile** | `Learner` (Identity Domain, Domain #1) | Tên mới do đề bài đặt — ánh xạ vào Aggregate Root `Learner` đã có |
| **Memory Profile** | `LearningProfile` (Projection, Domain #9) + nội dung [DECISION-011-User-Memory](../11_Decisions/DECISION-011-User-Memory.md) | **Không phải entity mới** — đây là cùng 1 khái niệm đã có 2 tên qua các Round (Round 1 gọi "Memory", Round 4 đổi tên "Learning Profile"). DECISION-011 đã chốt: đây là **view tổng hợp tính toán, không phải nguồn dữ liệu độc lập**. 🔶 Cần Founder/ChatGPT xác nhận lại tên "Memory Profile" có ý định khác "Learning Profile" hay không — xem mục 8. |

Không có domain nào trong 9 mục trên là entity hoàn toàn mới so với Domain Architecture đã khóa — đây là điểm quan trọng để Database Design không vô tình tạo thêm Aggregate Root mới ngoài Decision Log.

## 1. Domain Persistence Matrix

| Domain | Aggregate Root | Mutable/Immutable | Snapshot/Event | Audit | Explainability | Versioning | Retention | Storage Pattern |
|---|---|---|---|---|---|---|---|---|
| **Goal** | `Goal` | Immutable (DECISION-032) | Snapshot (mỗi row = 1 trạng thái đầy đủ, không cần replay) | Tự động (immutable = audit) | Thấp (Goal là phát biểu trực tiếp của Learner, không phải suy luận AI) | Không cần version field — chuỗi `superseded_by`/`supersedes` đủ | Vĩnh viễn | **Insert-only Snapshot** |
| **Roadmap** | `Roadmap` (chứa `RoadmapNode`, `ApprovalRecord`) | Mutable (cấu trúc cây đổi qua thời gian) **nhưng chỉ qua ApprovalRecord** | Hybrid (state hiện tại = snapshot; mỗi đổi cấu trúc = 1 event/ApprovalRecord) | Cao — bắt buộc ApprovalRecord trước mọi đổi cấu trúc (DECISION-006) | Cao cho `RoadmapNodeProposed` (cần lý do AI đề xuất) | Theo chuỗi `ApprovalRecord` — không cần snapshot toàn cây mỗi lần | Vĩnh viễn (gắn với Goal, archive cùng Goal) | **Hybrid (mutable state + immutable change log)** |
| **LearningSession** | `LearningSession` (chứa `SubSession[]`) | Mutable khi Active/Paused; **immutable khi Completed/Archived** (terminal, DECISION-028) | Snapshot (state hiện tại trên row) + Event log cho transition (khuyến nghị, không bắt buộc theo Domain Architecture) | Cao — cần biết khi nào Paused, do ai/cái gì kích hoạt (DECISION-033) | Bắt buộc cho transition→Paused do Recommendation (phải trace tới RecommendationProposal); transition khác tự minh bạch theo domain logic | Không cần — không có concurrent edit trên 1 session | Vĩnh viễn cho session Completed/Archived (Explainability First + Memory Profile phụ thuộc) | **Hybrid (Snapshot row + append-only transition log)** |
| **KnowledgeGraph** | `KnowledgeNode` (sở hữu `KnowledgeEdge` đi ra, `ExpansionRecord`) | Node: mutable (sửa mô tả); **Edge: immutable, append-only** (DECISION-023/025/029) | Graph snapshot (đồ thị hiện tại) + Edge = bản chất là event (mỗi cạnh là 1 "fact" không đổi) | Edge tự audit qua timestamp+`created_via`; Local Expansion cần log nội bộ riêng (câu 21, vẫn 🔶 OPEN) | Deep/Structural bắt buộc hiển thị (`ExpansionRecord`); Local bắt buộc truy vết nội bộ (DECISION-027) | Không cần version cho Edge (append-only tự nhiên là lịch sử đầy đủ); Node content nếu sửa cần xem xét version — 🔶 chưa quyết định | Vĩnh viễn — Knowledge Graph dùng chung, không xóa | **Graph Model** (xem mục 3.1 phân tích riêng) |
| **Evidence** | `Evidence` (chứa `EvidenceLink[]`) | **Immutable hoàn toàn** | **Event** — bản chất chính là `EvidenceRecorded`, không có "current state" riêng để snapshot | Tự động (immutable = audit trail đầy đủ) | Là **nguồn** explainability cho Assessment/Recommendation — không tự cần giải thích, mà *được tham chiếu* | Không áp dụng — sửa = tạo record mới tham chiếu record cũ, không update | Vĩnh viễn — xóa Evidence phá vỡ chuỗi `traced_to[]` của mọi AssessmentResult tham chiếu nó | **Event (pure append-only)** |
| **Assessment** | `AssessmentResult` + `KnowledgeNodeMastery` (2 Aggregate, [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md)) | `AssessmentResult`: immutable. `KnowledgeNodeMastery`: mutable (current state) | `AssessmentResult` = Event; `KnowledgeNodeMastery` = Snapshot **derived từ** chuỗi `AssessmentResult` | Cao — mọi đổi `KnowledgeNodeMastery` phải trace được tới đúng 1 `AssessmentResult` (DECISION-027) | Cao nhất trong toàn hệ thống — `AssessmentResult` chính là artifact explainability (8 trường, DECISION-030) | `KnowledgeNodeMastery` nên có version/timestamp để phát hiện ghi đồng thời (rủi ro, xem mục 7) | `AssessmentResult` vĩnh viễn; `KnowledgeNodeMastery` chỉ cần giữ giá trị mới nhất (lịch sử đã có trong AssessmentResult) | **Snapshot + Event** (kinh điển: snapshot để đọc nhanh, event log để tái tạo/audit) |
| **Recommendation** | `RecommendationProposal` | Nội dung đề xuất: immutable. Trạng thái xử lý (`confirmed`/`ignored`): xem mục 3.4 | Event (tạo đề xuất) + Event (xử lý đề xuất) — 2 fact liên kết, không phải 1 record mutable | Cao — cần giữ **toàn bộ lịch sử**, kể cả đề xuất bị bỏ qua | Bắt buộc `traced_to[]` (DECISION-027) — không có ngoại lệ, kể cả loại "pause" (DECISION-033) | Không áp dụng cho nội dung; trạng thái xử lý chỉ có 1 lần chuyển (proposed→confirmed/ignored), không cần version | Vĩnh viễn — **có** lưu lại toàn bộ Recommendation history (xem mục 3.5) | **Event (append-only) + trạng thái xử lý dạng append thêm, không update tại chỗ** |
| **User Profile** (`Learner`) | `Learner` | Mutable (thông tin định danh có thể sửa) | Snapshot — không cần event log cho trường định danh thông thường | Thấp, trừ trường nhạy cảm (đổi email/auth — thuộc phạm vi Security, không phải Domain Architecture) | Không áp dụng — Learner không phải quyết định AI | Không cần ngoài `updated_at` chuẩn | Vĩnh viễn khi tài khoản active; xóa tài khoản (right-to-be-forgotten) là 🔶 OPEN — xem Risk #3 | **CRUD** (domain duy nhất dùng CRUD thuần) |
| **Memory Profile** (= `LearningProfile`, Projection) | **Không có** — đã chốt từ Round 4 ("Domain 9 không có Aggregate Root ghi") | Không áp dụng (không phải entity ghi) | Snapshot **nếu** có cache; nếu không, tính trực tiếp khi đọc | Không áp dụng trực tiếp — audit nằm ở domain nguồn (`Goal`, `AssessmentResult`, `DiscoverySession`) | Phải cho phép "drill-down" về nguồn gốc (Evidence/AssessmentResult/Goal History) khi Learner hỏi — kế thừa Explainability của domain nguồn | Không áp dụng (luôn phản ánh state hiện tại của domain nguồn, hoặc có `computed_at` nếu cache) | Không áp dụng trực tiếp — retention do domain nguồn quyết định (đều vĩnh viễn) | **Derived/Computed View** (Read Model — không nằm trong 5 ví dụ gốc, xem mục 3.6) |

## 2. Persistence Decisions

Các quyết định xuyên domain rút ra từ bảng trên (áp dụng nhất quán, không riêng 1 domain):

1. **Immutable-by-default cho mọi entity mang ý nghĩa "bằng chứng/quyết định/lịch sử"** (`Goal`, `Evidence`, `AssessmentResult`, `KnowledgeEdge`, `RecommendationProposal` nội dung) — chỉ 2 domain được phép có entity mutable thực sự: `Roadmap`/`RoadmapNode` (qua cổng ApprovalRecord) và `Learner` (không mang ý nghĩa quyết định AI).
2. **"Current state" luôn tách khỏi "lịch sử dẫn tới state đó"** khi cả hai đều cần tồn tại — không bao giờ chỉ lưu state hiện tại mà xóa lịch sử (`KnowledgeNodeMastery` ← `AssessmentResult`; `LearningSession.state` ← transition log; `LearningProfile` ← toàn bộ domain nguồn).
3. **Không có domain nào dùng Event Sourcing đầy đủ (replay toàn bộ event để dựng state)** — kể cả `Evidence`/`AssessmentResult` (gần với Event Sourcing nhất) chỉ cần **append**, không cần khả năng "replay" để tính lại state, vì state hiện tại (`KnowledgeNodeMastery`) được ghi trực tiếp song song mỗi lần có `AssessmentResult` mới, không tính lại từ đầu. Đây là **Event Log phục vụ Audit/Explainability**, không phải Event Sourcing kinh điển phục vụ tái tạo state.
4. **Graph Model là pattern riêng, không quy về CRUD hay Event** — `KnowledgeGraph` cần được nhìn nhận là 1 loại storage pattern thứ 5, ngoài 4 pattern còn lại, vì truy vấn của nó (reachability, traversal) khác bản chất truy vấn quan hệ thông thường.
5. **Recommendation history không bao giờ bị xóa hoặc ghi đè** — kể cả đề xuất Learner từ chối/bỏ qua, vì đây là dữ liệu có giá trị cho audit ("AI đã từng cảnh báo chưa") và cho việc cải thiện Recommendation Engine sau này (không phải quyết định đã khóa, chỉ là khả năng — không thiết kế thêm gì cho việc này ở vòng này).

## 3. Storage Patterns — phân tích riêng theo yêu cầu đặc biệt

### 3.1 Knowledge Graph

- **DAG implications:** Không được giả định cấu trúc cây (không có cột `parent_id` đơn trên `KnowledgeNode`). Một node có thể có nhiều cạnh vào (multi-parent) — storage phải tách hoàn toàn quan hệ (Edge) ra khỏi entity (Node), không nhúng quan hệ vào node.
- **Edge persistence:** Edge là **immutable, append-only, không có khái niệm "sửa cạnh"** — nếu một cạnh sai (ví dụ Expansion nhầm), cách sửa duy nhất theo Domain Architecture hiện tại là *thêm cạnh mới đúng*, không phải xóa/sửa cạnh cũ. **Đây là 1 khoảng trống chưa có cơ chế "retract edge"** — ghi nhận ở mục 7 (Risks), không tự quyết định ở vòng này.
- **Cycle detection persistence impact:** [DECISION-029](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md) chọn Runtime Reachability Check, **không phải Closure Table** → hệ quả persistence: **không cần lưu thêm bất kỳ cấu trúc phụ trợ nào** (không bảng ancestor/descendant, không cột "depth", không trigger duy trì closure). Toàn bộ chi phí cycle detection nằm ở **thời điểm ghi** (truy vấn traversal qua Edge hiện có), không tạo thêm gánh nặng lưu trữ — đây là điểm giảm độ phức tạp lớn nhất của toàn bộ Persistence Architecture cho domain này.

### 3.2 Evidence

**Immutable hoàn toàn — không có ngoại lệ.** Không có Evidence nào được update hoặc xóa trong bất kỳ trường hợp nào (kể cả khi Evidence "sai" — ví dụ Learner nộp nhầm bài). Nếu cần "vô hiệu hóa" 1 Evidence, cách làm đúng theo Explainability First là **thêm 1 Evidence/annotation mới chỉ ra Evidence cũ không còn hợp lệ**, không phải xóa — nhưng cơ chế "vô hiệu hóa" cụ thể **chưa được Domain Architecture định nghĩa** (không phát sinh nhu cầu cho tới nay) — ghi nhận là Open Question, không tự thêm cơ chế mới ở vòng Persistence Architecture này.

### 3.3 Assessment

**Snapshot + History, không phải 1 trong 2.** `KnowledgeNodeMastery` là snapshot (trạng thái "tin hiện tại" về mức độ hiểu) — **nhưng snapshot này phải luôn có thể được giải trình bằng cách trỏ tới `AssessmentResult` gần nhất** đã gây ra giá trị đó. Hai entity không thể tách rời: xóa lịch sử `AssessmentResult` mà giữ `KnowledgeNodeMastery` sẽ vi phạm Explainability First ngay lập tức (DECISION-027) — vì vậy retention của `KnowledgeNodeMastery` **phụ thuộc hoàn toàn** vào retention vĩnh viễn của `AssessmentResult`.

### 3.4 Recommendation

**Có lưu Recommendation history — quyết định rõ ràng, không mơ hồ.** Lý do: (a) Explainability First đòi hỏi mọi đề xuất phải truy vết được vĩnh viễn, không chỉ đề xuất đang "active"; (b) đề xuất bị Learner bỏ qua vẫn là dữ liệu quan trọng (ví dụ: "Recommendation đã cảnh báo Regression 3 lần, Learner bỏ qua cả 3" là thông tin có giá trị cho Mentor Interaction sau này). Trạng thái xử lý (`confirmed`/`ignored`) nên được mô hình là **1 fact bổ sung gắn với proposal đó** (ví dụ 1 event "Learner confirmed proposal X tại thời điểm Y"), không phải ghi đè trực tiếp lên proposal — giữ toàn bộ chuỗi proposal nguyên vẹn, nhất quán với nguyên tắc immutable-by-default.

### 3.5 Learning Session

**Session Archive Strategy:** Khi 1 `LearningSession` chuyển sang `Archived` (Goal đổi, DECISION-032) hoặc `Completed` — **không di chuyển dữ liệu sang nơi lưu trữ khác (không "cold storage" riêng ở vòng Persistence Architecture này)**, chỉ đổi `state`. Lý do: Archived/Completed vẫn cần truy vấn nhanh cho Memory Profile (Learner xem lại Goal cũ) — tách sang storage khác (ví dụ cold/archive table) là tối ưu vật lý, thuộc về Database Design chi tiết (bảng/index) hoặc Infrastructure, không phải quyết định Persistence Architecture. **Quyết định ở tầng này chỉ là:** Archived là trạng thái terminal, dữ liệu giữ nguyên vị trí, vĩnh viễn, không xóa, không nén/tóm tắt mất thông tin.

### 3.6 Memory Profile (bổ sung — không có trong 5 domain đặc biệt của đề bài nhưng cần nói rõ vì đổi tên)

Vì "Memory Profile" trong yêu cầu này được ánh xạ vào `LearningProfile` (Projection, không Aggregate Root), storage pattern phù hợp nhất **không nằm trong danh sách ví dụ gốc** (CRUD/Event Sourcing/Hybrid/Snapshot+Event/Graph Model) — đó là **Read Model / Materialized View**: dữ liệu hiển thị được tính từ domain khác, có thể cache để tăng tốc đọc, nhưng cache đó **không bao giờ là nguồn sự thật**. Nếu Database Design sau này chọn cache (ví dụ vì tính lại mỗi lần đọc quá chậm), cache đó phải được tái tạo được hoàn toàn từ `Goal`/`AssessmentResult`/`DiscoverySession` — không có write API riêng cho Memory Profile.

## 4. Audit Strategy

Nguyên tắc audit thống nhất xuyên domain, suy ra từ Persistence Decisions (mục 2):

- **Audit-by-immutability** là chiến lược chính: với `Goal`, `Evidence`, `AssessmentResult`, `KnowledgeEdge`, `RecommendationProposal` — bản ghi không đổi chính là audit trail, không cần cơ chế audit log riêng song song (tránh trùng lặp 2 nguồn sự thật).
- **Audit-by-companion-log** cho 2 trường hợp có "current state" mutable nhưng cần lịch sử: `Roadmap` (qua `ApprovalRecord`), `LearningSession` (qua transition log khuyến nghị — không bắt buộc theo Domain Architecture đã khóa, nhưng khuyến nghị mạnh ở Persistence Architecture vì lợi ích audit > chi phí lưu trữ thấp).
- **Không cần audit log riêng** cho `Learner` (User Profile) ở phạm vi Domain Architecture hiện tại — nếu cần (ví dụ tuân thủ pháp lý khi đổi thông tin nhạy cảm), đó là yêu cầu Security/Compliance, nằm ngoài phạm vi Persistence Architecture của domain nghiệp vụ.
- **`KnowledgeNodeMastery` không tự audit được nếu đứng riêng** — audit của nó hoàn toàn dựa vào khả năng join ngược tới `AssessmentResult` mới nhất; Database Design phải đảm bảo liên kết này luôn có (không nullable).

## 5. Versioning Strategy

- **Hầu hết domain không cần version field truyền thống** (`v1`, `v2`...) vì đã đạt cùng mục tiêu qua immutability + append-only (lịch sử đầy đủ tự nhiên là "mọi version").
- **Ngoại lệ cần xem xét versioning thực sự (optimistic concurrency):** `KnowledgeNodeMastery` — vì đây là entity mutable duy nhất bị ghi bởi 1 domain (Assessment) nhưng có thể bị ghi từ nhiều luồng đánh giá gần như đồng thời (ví dụ Learner làm nhiều bài cùng lúc trên nhiều thiết bị, hoặc nhiều `MentorSession` chạy song song trong các `SubSession` khác nhau cùng ảnh hưởng 1 `KnowledgeNode`). Khuyến nghị: cần version/timestamp để Application Layer phát hiện ghi đè mất dữ liệu — quyết định cơ chế cụ thể (optimistic lock, last-write-wins có cảnh báo, hay queue hóa ghi) để lại cho Database/Application Design.
- **`Roadmap`/`RoadmapNode`:** versioning ở mức cấu trúc đã được đảm bảo bởi chuỗi `ApprovalRecord` (mỗi approval = 1 "version" hợp lệ của cấu trúc) — không cần version field bổ sung.
- **`KnowledgeNode` (nội dung mô tả, nếu cho sửa):** 🔶 chưa quyết định — Domain Architecture không có quy định nào về việc sửa nội dung KnowledgeNode có cần version hay không (khác với Edge, đã chốt immutable). Xem Open Question.

## 6. Explainability Support Strategy

Tổng hợp lại các ràng buộc Explainability First (DECISION-027) ở góc nhìn persistence — không lặp lại nội dung domain, chỉ nói storage phải đảm bảo gì:

1. **Mọi cột/trường tham chiếu nguồn (`source_evidence_id`, `source_assessment_result_id`, `source_discovery_session_id`, `traced_to[]`) phải non-nullable tại nơi Explainability First áp dụng** — đây là một ràng buộc tầng lưu trữ trực tiếp suy ra từ DECISION-027, không phải tùy chọn thiết kế.
2. **Không storage pattern nào (kể cả Snapshot) được phép "quên" liên kết tới Event/nguồn gốc của nó** — `KnowledgeNodeMastery` (snapshot) luôn phải trỏ được tới `AssessmentResult` mới nhất; `LearningSession.state = Paused` luôn phải phân biệt được "Learner tự pause" hay "qua Recommendation" (cần lưu nguồn gốc transition, không chỉ giá trị state).
3. **Xóa dữ liệu (delete) bị cấm trên toàn bộ chuỗi explainability** — `Evidence` → `AssessmentResult` → `RecommendationProposal`/`KnowledgeNodeMastery` update — xóa bất kỳ điểm nào trong chuỗi này làm hỏng khả năng giải trình của các điểm sau nó. Storage layer (kể cả khi vào Database Design) không được cung cấp soft path nào dẫn tới mất tham chiếu này (ví dụ cascade delete).
4. **Memory Profile (Read Model) phải hỗ trợ "drill-down"** — khi hiển thị 1 kết luận tổng hợp (ví dụ "bạn mạnh về X"), phải có đường dẫn ngược tới `AssessmentResult`/`Evidence` cụ thể đã góp phần — đây là yêu cầu functional cho Database Design sau này (không thiết kế chi tiết ở đây, chỉ ghi nhận ràng buộc).

## 7. Risks

| # | Rủi ro | Domain liên quan | Mức độ |
|---|---|---|---|
| 1 | **Ghi đồng thời (concurrent write) lên `KnowledgeNodeMastery`** không có version/lock rõ ràng ở mức Domain Architecture — có thể mất dữ liệu nếu 2 `AssessmentResult` ghi gần như đồng thời mà không có cơ chế tuần tự hóa | Assessment | Trung bình-Cao |
| 2 | **Không có cơ chế "retract" cho `KnowledgeEdge` sai** — nếu AI tạo nhầm 1 cạnh (Expansion lỗi), hệ thống hiện tại chỉ có thể "thêm cạnh đúng" chứ không có cách đánh dấu cạnh cũ là sai, có thể làm graph rối theo thời gian | Knowledge Graph | Trung bình |
| 3 | ~~Right-to-be-forgotten xung đột với retention vĩnh viễn~~ — **✅ đóng ở Round 7 bởi [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md)** (Anonymization, không Hard Delete) | User Profile, Evidence, Assessment | Đã giải quyết |
| 4 | **Recommendation history tăng không giới hạn theo thời gian** — vì quyết định "giữ toàn bộ, không xóa" (mục 3.4), cần chiến lược tiering/cold-storage ở Database Design/Infrastructure sau này, nếu không sẽ ảnh hưởng hiệu năng đọc dần theo thời gian | Recommendation | Thấp (đã biết trước, chưa cấp bách) |
| 5 | **`LearningSession.Paused` là derived/event-driven, không có nguồn ghi tự động theo thời gian** (DECISION-033) — nếu Application Layer cần biết "session này có còn active không" theo thời gian thực mà không có background job, cần quyết định bổ sung ở Application/Database Design (đã ghi nhận từ Round 5, nhắc lại vì ảnh hưởng trực tiếp tới Storage Pattern của LearningSession) | Learning Session | Thấp-Trung bình |
| 6 | **Graph traversal cho cycle detection (Runtime Reachability) có thể chậm dần khi Knowledge Graph lớn/rậm** — đã được chấp nhận như đánh đổi có chủ đích ở DECISION-029 ("chỉ tối ưu khi có bằng chứng"), nhưng cần giám sát thực tế khi vận hành, không phải rủi ro thiết kế sai | Knowledge Graph | Thấp (đánh đổi đã được chấp nhận) |

## 8. Open Questions

1. ~~"Memory Profile" có đúng là `LearningProfile`?~~ → **✅ đóng ở Round 7 bởi [DECISION-036](../11_Decisions/DECISION-036-LearningProfile-Is-Projection.md)** — xác nhận là Projection, không Aggregate Root, không write path riêng.
2. **🔶 Cơ chế "vô hiệu hóa" 1 `Evidence` sai (nộp nhầm) chưa được định nghĩa** — hiện tại Domain Architecture không có khái niệm "Evidence bị retract". Cần Founder/ChatGPT xác nhận có cần thêm khái niệm này không trước khi Database Design viết schema chi tiết cho Evidence.
3. **🔶 Cơ chế "retract"/"deprecate" cho `KnowledgeEdge` sai** — tương tự câu 2, ở Knowledge Graph. Liên quan Risk #2.
4. **🔶 `KnowledgeNode` (nội dung, không phải Edge) có cho sửa không, và nếu có thì có cần version/history không?** — Domain Architecture chỉ chốt Edge là immutable, chưa nói rõ về nội dung Node.
5. ~~Right-to-be-forgotten cho `Learner`~~ → **✅ đóng ở Round 7 bởi [DECISION-037](../11_Decisions/DECISION-037-Right-To-Be-Forgotten-Anonymization.md)** — Anonymization, không Hard Delete cho dữ liệu học tập. Đóng cả Risk #3 ở mục 7.
6. **🔶 Cơ chế version/concurrency cụ thể cho `KnowledgeNodeMastery`** (optimistic lock, hàng đợi ghi tuần tự, hay chấp nhận last-write-wins có cảnh báo) — để lại cho Database/Application Design, nhưng cần 1 hướng được chọn trước khi viết schema chi tiết.
7. Các Open Question kế thừa từ Round 4-6 chưa trả lời (câu 18, 20, 21 — danh sách `relation_type`, `AssessmentResult` cardinality, entity log Local Expansion) vẫn áp dụng và có thể ảnh hưởng chi tiết cột khi vào Database Design Step 2 — không lặp lại nội dung, xem [OpenQuestions.md](../01_PRD/OpenQuestions.md).

## Liên kết ngược

[CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [AssessmentDomain.md](../03_Domain_Model/AssessmentDomain.md), [LearningSessionDomain.md](../03_Domain_Model/LearningSessionDomain.md), [RuntimeLearningFlow.md](../03_Domain_Model/RuntimeLearningFlow.md), [PRE_DATABASE_REVIEW.md](../03_Domain_Model/PRE_DATABASE_REVIEW.md), [DECISION-018](../11_Decisions/DECISION-018-Domain-Modeling-Phase.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-029-Cycle-Detection-Strategy](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md), [DECISION-030-Assessment-Result-Granularity](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md), [DECISION-032-Immutable-Goal](../11_Decisions/DECISION-032-Immutable-Goal.md), [DECISION-033-Adaptive-Pause](../11_Decisions/DECISION-033-Adaptive-Pause.md).

**Đây vẫn là tài liệu ở mức nguyên tắc/pattern (Step 1 của Database Design Phase) — Step 2 (thiết kế bảng/cột/SQL) chưa bắt đầu trong tài liệu này.**
