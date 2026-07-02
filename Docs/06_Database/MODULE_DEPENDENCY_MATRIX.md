# Module Dependency Matrix — AI Mentor OS

> Phạm vi: phân tích kiến trúc dependency direction giữa 19 Module đã chốt ở [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md). **Không thiết kế SQL/endpoint/code.** Kế thừa [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 2 (Domain Boundaries — bất biến), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md) mục 3-5 (Bottlenecks/Race Conditions/Circular Dependencies — đã phát hiện trước, không phát sinh mới).

---

## 1. Nguyên tắc Dependency Direction

| # | Nguyên tắc | Áp dụng |
|---|---|---|
| 1 | **Mọi Module nghiệp vụ phụ thuộc Shared Kernel; Shared Kernel không phụ thuộc ai** | Hướng phụ thuộc 1 chiều tuyệt đối — vi phạm = Shared Kernel không còn "shared" được nữa |
| 2 | **Module nghiệp vụ phụ thuộc *interface*, Infrastructure Module implement interface đó (Dependency Inversion)** | Core/Supporting Module không bao giờ import trực tiếp Persistence/AI Provider/Event Bus Infrastructure Module — luôn qua interface do chính Core/Supporting Module định nghĩa |
| 3 | **Core Module chỉ phụ thuộc Core Module khác qua 2 con đường: (a) đọc đồng bộ read-only, hoặc (b) consume Domain Event (async)** — không có con đường thứ 3 | Ngoại lệ duy nhất đã biết: Mentor Interaction Module → Evidence Module (sync write, mục 3) |
| 4 | **Supporting Module cross-cutting (Explainability, Decision Persistence) không bao giờ phụ thuộc Core Module** | Chúng chỉ **bị gọi**, không tự gọi ai — đảo ngược hướng phụ thuộc nếu vi phạm sẽ tạo vòng lặp ngay lập tức |
| 5 | **Không Core Module nào phụ thuộc 2 chiều (A→B và B→A cùng tồn tại bằng sync call)** | 1 trong 2 hướng luôn phải là async (event) hoặc read-only nếu cả 2 Module thực sự cần biết về nhau |

---

## 2. Ma trận Allowed Dependencies (theo hướng từ → đến)

| Module (từ) | Phụ thuộc được phép (đến) | Loại |
|---|---|---|
| Identity | Shared Kernel | — |
| Goal & Roadmap | Knowledge Graph (đọc `knowledge_node`), Shared Kernel, Decision Persistence (D6, gọi) | Sync read + Sync call (cross-cutting) |
| Knowledge Graph | Shared Kernel, Explainability (D4, gọi) | Sync call (cross-cutting) |
| Knowledge Graph | Goal & Roadmap | **Async only** — consume `RoadmapNodeApproved`, không sync read ngược |
| Evidence | Shared Kernel | — |
| Assessment | Evidence (consume `EvidenceRecorded`), Shared Kernel, Explainability (gọi) | Async + Sync call (cross-cutting) |
| Discovery | Assessment (đọc `AssessmentResult`), Evidence (đọc `Evidence`), Shared Kernel, Explainability (gọi) | Sync read (Eventual) + Sync call |
| Mentor Interaction | Evidence (sync write — ngoại lệ, xem mục 3), Learning Session (đọc), Teaching (đọc), Shared Kernel | Sync write (ngoại lệ) + Sync read |
| Recommendation | Assessment (consume event), Discovery (consume event), Goal & Roadmap (đọc), Knowledge Graph (đọc), Learning Session (đọc), Shared Kernel, Explainability (gọi) | Async + Sync read + Sync call |
| Learning Session | Goal & Roadmap (consume event), Recommendation (consume event), Shared Kernel | Async only |
| Teaching | Goal & Roadmap (đọc), Knowledge Graph (đọc), Assessment (đọc), Recommendation (đọc), Mentor Interaction (đọc), Decision Persistence (gọi), Shared Kernel | Sync read (Eventual) + Sync call |
| Explainability | Shared Kernel, Persistence Infrastructure (qua interface) | — |
| Decision Persistence | Shared Kernel, Persistence Infrastructure (qua interface) | — |
| Learning Profile | Assessment (đọc), Discovery (đọc), Goal & Roadmap (đọc), Shared Kernel | Sync read (Eventual) |
| Infrastructure Modules (5) | Shared Kernel | — (bị gọi bởi Module khác qua interface, không tự gọi Module nghiệp vụ nào) |
| Shared Kernel | *(không có)* | — |

---

## 3. Forbidden Dependencies (trả lời Mandatory Question 7)

| # | Cặp Module **không bao giờ** được phụ thuộc trực tiếp | Lý do |
|---|---|---|
| 1 | **Knowledge Graph → Goal & Roadmap (sync, write hoặc read)** | CoreDomainMap mục 2: "Knowledge Graph... không biết Roadmap nào dùng nó (Dependency Edge một chiều: Roadmap → Knowledge)" — chỉ được phép theo hướng ngược lại (Goal & Roadmap đọc Knowledge Graph), và chỉ được consume event 1 chiều (Knowledge Graph nghe `RoadmapNodeApproved`, không hỏi ngược) |
| 2 | **Evidence → Assessment** (mọi hướng) | CoreDomainMap mục 2: "Evidence chỉ thu thập + phân loại bằng chứng thô — không cập nhật Mastery" — quan hệ chỉ tồn tại 1 chiều Assessment → Evidence (qua event), không có lý do nghiệp vụ nào để Evidence cần biết Assessment tồn tại |
| 3 | **Recommendation → bất kỳ Module nào (write)** | DECISION-019 — Recommendation chỉ đọc, không bao giờ ghi vào Aggregate của Module khác; mọi "hành động" của Recommendation là phát `RecommendationProposed`, không phải gọi write API của Module khác |
| 4 | **Teaching → bất kỳ Core Module nào (write)** | Teaching không sở hữu Aggregate nào (Round 3.9) — không có lý do kiến trúc nào để nó cần quyền ghi vào Module khác; mọi write hợp lệ của Teaching chỉ là gọi Decision Persistence Module |
| 5 | **Explainability → bất kỳ Core/Supporting Module nào** | Explainability chỉ bị gọi, không tự gọi — vi phạm tạo vòng lặp (A gọi Explainability, Explainability gọi lại A hoặc B) |
| 6 | **Decision Persistence → bất kỳ Core/Supporting Module nào** | Cùng lý do mục 5 |
| 7 | **Bất kỳ Core/Supporting Module → Persistence/AI Provider/Event Bus Infrastructure Module (trực tiếp, không qua interface)** | Vi phạm Dependency Inversion (nguyên tắc 2) — phá khả năng thay đổi Infrastructure implementation (vd đổi Local AI → Cloud AI) mà không chạm Core Module |
| 8 | **Shared Kernel → bất kỳ Module nào** | Vi phạm nguyên tắc 1 — Shared Kernel phải là điểm tận cùng của mọi mũi tên phụ thuộc, không phải điểm bắt đầu |

---

## 4. Event Relationships (Producer → Consumer, theo Module)

| Event | Producer Module | Consumer Module(s) |
|---|---|---|
| `GoalDefined`/`GoalArchived` | Goal & Roadmap | Learning Session |
| `RoadmapNodeApproved`/`RoadmapNodeRejected` | Goal & Roadmap | Knowledge Graph |
| `KnowledgeNodeExpanded` (Local/Deep-Structural) | Knowledge Graph | Goal & Roadmap (đọc lại, không sync), Mentor Interaction (Deep/Structural, hiển thị) |
| `EvidenceRecorded` | Evidence | Assessment |
| `AssessmentResultCreated` | Assessment | Recommendation, Discovery, Learning Profile (đọc trực tiếp, không phải consumer event thật) |
| `KnowledgeRegressionDetected` | Assessment | Recommendation |
| `SelfAssessmentMismatchDetected` | Discovery | Recommendation |
| `RecommendationProposed` (mọi subtype) | Recommendation | Mentor Interaction/Teaching (review), Learning Session (pause) |
| `LearningSessionStarted`/`Paused`/`Resumed`/`Completed`/`Archived` | Learning Session | Recommendation (Completed), Goal & Roadmap (Started) |
| `SubSessionStarted`/`Ended` | Learning Session | Mentor Interaction, Teaching |
| `MentorSessionModeChanged` | Mentor Interaction | *(không consumer bắt buộc — chỉ audit/Header)* |

**Đối chiếu với mục 2/3:** mọi quan hệ Event ở đây khớp đúng hướng Allowed Dependencies — không Event nào tạo ra 1 dependency bị cấm ở mục 3 (vd Knowledge Graph không phát event nào mà Goal & Roadmap phải *sync chờ*, chỉ đọc lại sau).

---

## 5. Data Relationships (FK/tham chiếu xuyên Module, không phải Event)

| # | Quan hệ dữ liệu | Module sở hữu FK | Module được tham chiếu |
|---|---|---|---|
| 1 | `roadmap_node_knowledge_node.knowledge_node_id` | Goal & Roadmap | Knowledge Graph |
| 2 | `evidence_link.knowledge_node_id` | Evidence | Knowledge Graph |
| 3 | `assessment_result.knowledge_node_id`, `knowledge_node_mastery.knowledge_node_id` | Assessment | Knowledge Graph |
| 4 | `assessment_result.source_evidence_id` | Assessment | Evidence |
| 5 | `trace_link.(source/target)_id` đa hình | Explainability | Assessment, Recommendation, Knowledge Graph, Discovery (mọi Module có write Strong Consistency) |
| 6 | `sub_session.roadmap_node_id` (đã biết, forward dependency từ DDL Round 1) | Learning Session | Goal & Roadmap |
| 7 | Mọi `learner_id` trong toàn schema | Mọi Module | Identity |

**Quan sát:** `trace_link` (mục 4) là điểm có **scatter dependency rộng nhất** — 4 Module khác nhau đều có FK đa hình trỏ vào nó qua Explainability Module. Đây không phải lỗi thiết kế — là hệ quả tất yếu của việc tập trung hoá Explainability vào 1 cơ chế duy nhất (DECISION-038), đã được chấp nhận từ Database Design Phase.

---

## 6. Circular Dependency Risks (trả lời Task 2 phần Determine)

### 6.1 Đã thực hoá — Không có

Không có cycle nào tồn tại trong Allowed Dependencies (mục 2) — kiểm tra bằng cách truy theo từng mũi tên: Identity (gốc) → mọi Module khác chỉ đi 1 hướng tới Shared Kernel/Identity, không có đường nào quay lại.

### 6.2 Tiềm ẩn (Latent) — Kế thừa từ Orchestration Review, nay gắn đúng Module

> Đây là cùng 1 rủi ro đã phát hiện ở [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md) mục 5 — Round này **không phát hiện rủi ro mới**, chỉ ánh xạ chính xác vào tên Module.

**Recommendation Module ⇄ Teaching Module ⇄ Knowledge Graph Module:** Recommendation chỉ đạo Teaching (qua `RecommendationProposed`, đọc) ôn lại 1 khái niệm; nếu Teaching trong tương lai có khả năng tự phát tín hiệu "gap" trigger Knowledge Graph (Expansion), và Expansion lại tạo nội dung mới đủ để Recommendation đề xuất tiếp — tạo vòng 3 Module. **Không tồn tại hôm nay** (Teaching hiện chỉ đọc, không phát tín hiệu nào tới Knowledge Graph) — nhưng nếu Round Application Layer tương lai nối thêm đường Teaching → Knowledge Graph (write hoặc trigger), **phải có termination condition rõ trước khi nối**, không nối ngầm.

**Khuyến nghị kiến trúc bổ sung (mới ở Round này):** nếu đường Teaching → Knowledge Graph được thêm sau này, nó phải đi qua Event (async, có thể drop/dedupe) — **không bao giờ qua sync call trực tiếp** — để giữ đúng nguyên tắc 3 (mục 1) và giảm rủi ro vòng lặp tức thời (infinite sync loop) thành rủi ro vòng lặp event có thể giám sát/circuit-break được.

---

## 7. Tight Coupling Risks

| # | Cặp Module | Vì sao tight coupling | Mức độ |
|---|---|---|---|
| 1 | **Mentor Interaction ↔ Evidence** | Mentor Interaction gọi sync-write trực tiếp vào Evidence Module's Aggregate (mục 2, ngoại lệ duy nhất) — đây là **coupling chặt nhất trong toàn hệ thống**, vì 2 Module có 2 Aggregate Root khác nhau nhưng hành vi "tạo Evidence" lại nằm trọn trong transaction của Mentor Interaction's request. Nếu Evidence Module đổi schema/contract, Mentor Interaction Module bị ảnh hưởng ngay, không có lớp đệm async | **Cao** — đã ghi nhận từ Application Services Architecture, không phải phát hiện mới, nhưng đây là Round đầu tiên gọi tên nó đúng là "tight coupling" ở mức Module |
| 2 | **Explainability ↔ {Assessment, Recommendation, Knowledge Graph, Discovery}** | 4 Module gọi đồng bộ vào cùng 1 Module, cùng transaction, tần suất cao — đúng "Bottleneck" đã xác nhận ở Orchestration Review mục 3 #1 | Trung bình-Cao — chấp nhận được vì đây là thiết kế cố ý (tập trung enforcement), không phải coupling ngẫu nhiên |
| 3 | **Teaching ↔ {Goal & Roadmap, Knowledge Graph, Assessment, Recommendation, Mentor Interaction}** | Teaching đọc từ 5 Module khác chỉ để chọn 1 kết quả — không ghi gì, nên đây là **fan-in coupling**, không phải tight coupling 2 chiều; rủi ro thực: Teaching dễ "biết quá nhiều" về 5 Module khác, khiến mọi đổi schema ở 5 Module đó đều có khả năng ảnh hưởng Teaching | Thấp-Trung bình — chấp nhận được vì Teaching không có Aggregate riêng để bảo vệ, nhưng cần giữ kỷ luật chỉ đọc qua Read Model đã ổn định (Public Surface), không đọc trực tiếp bảng nội bộ của 5 Module đó |

---

## 8. Shared Ownership Risks

| # | Rủi ro | Phân tích |
|---|---|---|
| 1 | **`learner_id` xuất hiện ở mọi Module — không phải Shared Ownership thật** | `learner_id` là FK tham chiếu Identity Module, không phải dữ liệu được nhiều Module cùng ghi — đây là Reference, không phải Shared Ownership; không cần xử lý gì thêm |
| 2 | **Decision Header + Detail (khi Detail tồn tại) — Sync Risk đã biết (Header/TraceLink Boundary Review)** | Không phải Shared Ownership theo nghĩa 2 Module cùng ghi 1 bảng — mỗi Module (Detail) và Decision Persistence Module (Header) ghi 2 bảng khác nhau, nhưng **phải đồng bộ về thời điểm** (cùng transaction) — rủi ro là *thiếu enforcement DB*, không phải *tranh quyền ghi* |
| 3 | **Không có trường hợp 2 Module thực sự cùng ghi 1 Aggregate** | Đã xác nhận lại từ CoreDomainMap mục 5: "Không có Ownership Conflict mới" — mọi Aggregate có đúng 1 write-owner; kết luận này vẫn đúng ở mức Module (1 Module = 1 write-owner, không lệch khỏi Aggregate ownership) |

**Kết luận mục 8:** Không có Shared Ownership Risk thật nào trong 19 Module — rủi ro gần nhất (Header/Detail sync) là **Cross-Module Transaction Discipline Risk**, không phải **Ownership Conflict**, 2 loại rủi ro khác nhau về bản chất dù cùng mức độ nghiêm trọng.

---

## Liên kết ngược

[BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [APPLICATION_LAYER_MAPPING.md](APPLICATION_LAYER_MAPPING.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md), [APPLICATION_SERVICE_BOUNDARY_MATRIX.md](APPLICATION_SERVICE_BOUNDARY_MATRIX.md), [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md).
