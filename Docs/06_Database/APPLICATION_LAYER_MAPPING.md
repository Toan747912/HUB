# Application Layer Mapping — AI Mentor OS

> Phạm vi: Task 3 — map mọi Application Service, mọi Orchestration Flow (F1-F5), mọi Event Producer/Consumer vào đúng 1 Module ([BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md)). **Không thiết kế SQL/endpoint/code.** Mục tiêu: xác nhận Single Ownership, No Orphan Service, No Duplicate Ownership.

---

## 1. Application Service → Module (12 Service)

| # | Application Service | Module sở hữu | Loại Module |
|---|---|---|---|
| 1 | LearningSessionOrchestrationService | Learning Session | Core |
| 2 | AssessmentService | Assessment | Core |
| 3 | RecommendationService | Recommendation | Core |
| 4 | TeachingService | Teaching | Supporting |
| 5 | KnowledgeExpansionService | Knowledge Graph | Core |
| 6 | MentorInteractionService | Mentor Interaction | Core |
| 7 | DiscoveryService | Discovery | Core |
| 8 | ExplainabilityService | Explainability | Supporting |
| 9 | DecisionPersistenceService | Decision Persistence | Supporting |
| 10 | RoadmapMappingService | Goal & Roadmap | Core |
| 11 | EvidenceCaptureService | Evidence | Core |
| 12 | AccountLifecycleService | Identity | Core |

**Single Ownership:** ✅ 12/12 Service map vào đúng 1 Module — không Service nào xuất hiện ở 2 dòng.

**No Orphan Service:** ✅ Không có Service nào trong [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md) mục 1-2 (9 bắt buộc + 3 bổ sung) bị thiếu khỏi bảng trên — đối chiếu đủ 12/12.

**No Duplicate Ownership:** ✅ Không Module nào sở hữu 2 Service có write-ownership xung đột (vd không có Module nào vừa sở hữu AssessmentService vừa sở hữu RecommendationService — đúng tách biệt CoreDomainMap).

**Learning Profile Module** không sở hữu Service nào (đã ghi nhận ở BACKEND_MODULE_CATALOG mục 2.4) — đây là **chủ động không có Service**, không phải Orphan Module, vì CoreDomainMap mục 1 #9 xác nhận "Không cần Service riêng cho LearningProfile/Memory Profile".

---

## 2. Orchestration Flow (F1-F5) → Module

> Kế thừa [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md). Mỗi Flow đi qua **nhiều** Module (đúng bản chất orchestration — 1 Flow không thể thuộc 1 Module duy nhất), bảng dưới xác định Module nào là **Primary Owner** (khởi phát/kết thúc flow) và Module nào là **Participant**.

| Flow | Primary Owner | Participant Module(s) | Cross-check với MODULE_DEPENDENCY_MATRIX |
|---|---|---|---|
| **F1 — Assessment Flow** | Assessment | Evidence (khởi phát), Explainability (atomic), Recommendation (tail), Discovery (tail) | Khớp mục 2/4 — Evidence→Assessment async, Assessment→Explainability sync call, Assessment→Recommendation async |
| **F2 — Teaching Flow** | Teaching | Goal & Roadmap (đọc), Knowledge Graph (đọc), Assessment (đọc), Recommendation (đọc), Mentor Interaction (trình bày kết quả) | Khớp mục 2 — toàn bộ là sync read (Eventual), không write nào ngoài Decision Persistence (pending) |
| **F3 — Knowledge Expansion Flow** | Knowledge Graph | Goal & Roadmap (trigger, async), Explainability (atomic, Deep/Structural), Mentor Interaction (hiển thị) | Khớp mục 2/4 — Goal & Roadmap → Knowledge Graph chỉ qua event, đúng Forbidden Dependency #1 (không sync ngược) |
| **F4 — Recommendation Flow** | Recommendation | Assessment (signal), Discovery (signal), Goal & Roadmap + Knowledge Graph (dependency-gap query), Learning Session (pause-eligible), Explainability (atomic), Mentor Interaction/Teaching (review), Learning Session (pause) | Khớp mục 2 — Recommendation chỉ đọc + consume event, không ghi vào Module khác (Forbidden #3) |
| **F5 — Mentor Interaction Flow** | Mentor Interaction | *(không Participant Module khác — D8 atomic tự thân, đúng Boundary Matrix mục 2 #8)* | Khớp — F5 là flow nội bộ duy nhất của 1 Module |

**Quan sát quan trọng:** F1 và F4 đều có Assessment/Discovery/Recommendation tham gia — đúng nhận định đã có từ [APPLICATION_ORCHESTRATION_REVIEW.md](APPLICATION_ORCHESTRATION_REVIEW.md) mục 2 ("F1's tail được tổng quát hoá thành F4"), nay xác nhận thêm ở mức Module: **Assessment Module và Recommendation Module là 2 điểm giao nhau thật của F1↔F4**, không phải 2 flow tách biệt hoàn toàn về Module tham gia.

---

## 3. Event Producer/Consumer → Module

> Bảng đầy đủ đã có ở [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md) mục 4 — mục này chỉ xác nhận **Single Ownership cho Producer** (Task 3 yêu cầu riêng), không lặp lại toàn bảng.

| Kiểm tra | Kết quả |
|---|---|
| Mỗi Domain Event có đúng 1 Producer Module | ✅ — 16 Domain Event ([EVENT_CATALOG.md](EVENT_CATALOG.md) mục 1), không Event nào có 2 Module cùng phát (vd `RecommendationProposed` luôn từ Recommendation Module dù có nhiều subtype) |
| Không Module nào "mượn" quyền phát Event của Module khác | ✅ — vd Mentor Interaction Module không tự phát `AssessmentResultCreated` dù nó tạo ra Evidence khởi nguồn cho chuỗi đó |
| Application Event (`DecisionRegistered`, `TraceLinkCreated`) có Producer rõ | ✅ — Decision Persistence Module và Explainability Module, đúng 1-1, không tuỳ chọn ai phát cũng được |
| System Event (`ConsumerLagAlert`, `DeadLetterQueued`) | Thuộc Event Bus Infrastructure Module (mục 3.4, BACKEND_MODULE_CATALOG) — không phải Module nghiệp vụ nào, đúng phân loại "vận hành, không nghiệp vụ" |

---

## 4. Đối chiếu tổng hợp — Không Orphan, Không Duplicate (trả lời Task 3 phần Verify)

### 4.1 Single Ownership

| Đối tượng | Đã kiểm tra | Kết quả |
|---|---|---|
| 12 Application Service | Mục 1 | ✅ Pass |
| 16 Domain Event + 2 Application Event | Mục 3 | ✅ Pass |
| 11 Aggregate Root (CoreDomainMap mục 3) | [BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md) mục 1 (Owned Aggregates) | ✅ Pass — mỗi Aggregate xuất hiện ở đúng 1 Module |

### 4.2 No Orphan Service

Không Service nào trong 12 Service thiếu Module sở hữu (mục 1). Không Flow nào (F1-F5) thiếu Primary Owner (mục 2). Không Event nào thiếu Producer Module (mục 3).

### 4.3 No Duplicate Ownership

Không Module nào xuất hiện là sở hữu chủ của 2 Aggregate thuộc 2 Domain khác nhau theo CoreDomainMap (vd không Module nào vừa giữ `KnowledgeNode` vừa giữ `RoadmapNode` — 2 Aggregate này tách đúng 2 Module: Knowledge Graph và Goal & Roadmap). Không Service nào được map vào 2 Module (kiểm tra trực tiếp từ bảng mục 1 — mỗi dòng có đúng 1 giá trị cột "Module sở hữu").

**Kết luận Task 3:** Toàn bộ Application Layer (Service + Flow + Event) đã được map đầy đủ, nhất quán, không orphan, không duplicate.

---

## Liên kết ngược

[BACKEND_MODULE_CATALOG.md](BACKEND_MODULE_CATALOG.md), [MODULE_DEPENDENCY_MATRIX.md](MODULE_DEPENDENCY_MATRIX.md), [INFRASTRUCTURE_BOUNDARY_REVIEW.md](INFRASTRUCTURE_BOUNDARY_REVIEW.md), [APPLICATION_SERVICES_ARCHITECTURE.md](APPLICATION_SERVICES_ARCHITECTURE.md), [APPLICATION_ORCHESTRATION_DESIGN.md](APPLICATION_ORCHESTRATION_DESIGN.md), [EVENT_CATALOG.md](EVENT_CATALOG.md).
