# Round 2 Architecture Review — Knowledge + Evidence + Assessment + Traceability

> Phân tích kiến trúc bắt buộc cho [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), bổ sung [DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md). 5 phân tích bắt buộc (Knowledge Graph/Evidence Ownership/AssessmentResult/Traceability/Delete Rule) + 5 câu hỏi kiến trúc bắt buộc.

## A. Knowledge Graph Validation

**Câu hỏi:** DAG model vẫn đúng? Multi-parent? Multi-child? Cycle detection assumptions không bị phá?

**Xác nhận:**

1. **DAG model vẫn đúng.** `knowledge_edge` là bảng quan hệ thuần (`from_knowledge_node_id`, `to_knowledge_node_id`, `relation_type`) — không có cột `parent_id` trên `knowledge_node`, không có cấu trúc cây ngầm định nào. Đúng [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md) (DAG, không phải cây).
2. **Multi-parent: được hỗ trợ đầy đủ.** Không có UNIQUE/CHECK nào hạn chế số lượng edge trỏ **tới** 1 `to_knowledge_node_id` — 1 node nhận nhiều cạnh vào từ nhiều node khác nhau (ví dụ `Validation` nhận cạnh từ cả `Multipart Form` và `Storage`, theo ví dụ trong [KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md)) là hợp lệ.
3. **Multi-child: được hỗ trợ đầy đủ.** Tương tự, không có ràng buộc nào hạn chế số lượng edge đi ra **từ** 1 `from_knowledge_node_id`.
4. **Cycle detection assumptions không bị phá.** [DECISION-029](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md) chọn Runtime Reachability Check (không Closure Table) — thiết kế Round 2 **không thêm bất kỳ cấu trúc phụ trợ nào** (không bảng ancestor/descendant, không cột `depth`, không trigger duy trì closure) mà lẽ ra sẽ mâu thuẫn với quyết định đó. `ck_knowledge_edge_no_self_loop` chỉ chặn trường hợp tầm thường nhất (A→A trực tiếp) ở tầng DB — **không thay thế** thuật toán reachability check đầy đủ (vẫn là trách nhiệm Application Layer khi tạo edge mới, đúng như tài liệu gốc đã ghi "Bất biến cần Application/Domain Layer đảm bảo").

**Kết luận: Knowledge Graph Validation — PASS, không phát hiện vi phạm.**

## B. Evidence Ownership Validation

**Câu hỏi:** Evidence thuộc aggregate nào — Assessment? KnowledgeNodeMastery? Aggregate riêng?

**Trả lời: `Evidence` là Aggregate Root riêng (Evidence Domain), KHÔNG thuộc Assessment, KHÔNG thuộc KnowledgeNodeMastery.**

**Giải thích:**
- [DECISION-026-Assessment-Core-Domain](../11_Decisions/DECISION-026-Assessment-Core-Domain.md) tách rõ: Evidence Domain **chỉ thu thập + phân loại** bằng chứng thô; Assessment Domain **diễn giải** bằng chứng đó thành thay đổi mastery. Đây là 2 trách nhiệm khác bản chất — thu thập dữ liệu khác với ra quyết định dựa trên dữ liệu đó.
- Về mặt thiết kế bảng: `evidence`/`evidence_link` **không có FK nào trỏ tới `assessment_result` hoặc `knowledge_node_mastery`**, và ngược lại, `assessment_result`/`knowledge_node_mastery` **không sở hữu** `evidence`/`evidence_link` — chúng chỉ **tham chiếu tới** Evidence qua `trace_link` (đa hình, không FK trực tiếp). Đây là quan hệ tham chiếu (reference), không phải sở hữu (ownership) — đúng định nghĩa Aggregate Boundary: 1 Aggregate không "chứa" entity của Aggregate khác, chỉ giữ ID tham chiếu.
- Lý do kiến trúc (từ [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md) Reasoning): tách Evidence khỏi Assessment cho phép Evidence được **tái sử dụng cho nhiều mục đích khác** ngoài cập nhật mastery (ví dụ hiển thị lịch sử bài làm cho Learner) mà không phụ thuộc logic đánh giá của Assessment — nếu Evidence là con của Assessment Aggregate, mọi lần đọc lịch sử Evidence sẽ phải "đi qua" Assessment một cách không cần thiết.
- `Evidence` chứa `EvidenceLink[]` làm con trong cùng Aggregate (Boundary 5) — đây là quan hệ sở hữu thật (`evidence_link.evidence_id ON DELETE CASCADE`), khác với quan hệ chỉ tham chiếu tới `knowledge_node` (`ON DELETE RESTRICT`, không sở hữu).

**Kết luận: Evidence Ownership Validation — PASS. Evidence là Aggregate Root độc lập (Boundary 5), write-owner là Evidence Domain, không phải Assessment Domain hay 1 phần của KnowledgeNodeMastery.**

## C. AssessmentResult Validation

**Câu hỏi:** `AssessmentResult` là Source of Truth, Projection, hay Supporting Record? Ảnh hưởng tới Mastery thế nào?

**Trả lời: `AssessmentResult` là Source of Truth. `KnowledgeNodeMastery` là Snapshot được duy trì (maintained), KHÔNG phải Projection tính lại bằng replay.**

**Giải thích:**
- Theo [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md), hệ thống **không** dùng Event Sourcing đầy đủ — `KnowledgeNodeMastery` **không được tính lại** bằng cách replay toàn bộ `assessment_result` mỗi lần đọc (đó mới là định nghĩa chính xác của "Projection" trong CQRS/Event Sourcing). Thay vào đó, `knowledge_node_mastery` được **ghi trực tiếp** mỗi khi có `assessment_result` mới — đây là pattern "Snapshot + Event Log phục vụ Audit", không phải "Projection" theo nghĩa kỹ thuật chặt.
- **`AssessmentResult` là Source of Truth** vì: (a) nó là bản ghi immutable, đầy đủ 8 trường, không bao giờ sửa/xóa — đại diện chính xác "điều gì đã xảy ra và vì sao"; (b) `knowledge_node_mastery.last_assessment_result_id` là FK **bắt buộc non-nullable** trỏ ngược tới nó — nghĩa là **mọi giá trị hiện tại trên `knowledge_node_mastery` phải giải trình được bằng đúng 1 `assessment_result` cụ thể**; (c) nếu `assessment_result` và `knowledge_node_mastery` "bất đồng" (ví dụ do lỗi ghi), `assessment_result` luôn được coi là đúng — đây chính là ý nghĩa "Source of Truth".
- **`KnowledgeNodeMastery` là Supporting Record (Snapshot được duy trì)**, không phải Source of Truth độc lập và không phải Projection thuần: nó tồn tại để **đọc nhanh** ("Learner này hiểu KnowledgeNode này tới đâu, ngay bây giờ") mà không phải quét toàn bộ lịch sử `assessment_result` mỗi lần — nhưng giá trị của nó **luôn phải khớp** và **luôn phải trỏ được** về `assessment_result` đã sinh ra nó.

**Ảnh hưởng tới Mastery:**
- Mọi `UPDATE knowledge_node_mastery` (Step 4B sau) **phải xảy ra trong cùng giao dịch** với việc tạo `assessment_result` mới — không có đường ghi nào khác hợp lệ vào `knowledge_node_mastery` (đúng "Assessment Domain là write-owner duy nhất", [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md)).
- `version_number` trên `knowledge_node_mastery` ([DECISION-044](../11_Decisions/DECISION-044-Versioning-Strategy.md)) bảo vệ đúng rủi ro này: nếu 2 `assessment_result` được tạo gần như đồng thời (2 `MentorSession` khác nhau cùng đánh giá 1 KnowledgeNode), optimistic concurrency token đảm bảo lần ghi thứ 2 phát hiện được xung đột, không âm thầm ghi đè mất dữ liệu.
- Nếu sau này hệ thống cần "dựng lại" `knowledge_node_mastery` từ đầu (ví dụ phát hiện lỗi dữ liệu), cách làm đúng là **replay toàn bộ `assessment_result` theo thứ tự thời gian** — khả thi *về nguyên tắc* (vì `assessment_result` là Source of Truth đầy đủ), nhưng **không phải cơ chế vận hành bình thường** của hệ thống (chỉ dùng cho khắc phục sự cố).

**Kết luận: AssessmentResult Validation — PASS. Source of Truth = `assessment_result`; `knowledge_node_mastery` = Supporting Record/Snapshot duy trì trực tiếp, luôn phải giải trình được qua `assessment_result`.**

## D. Traceability Validation

**Câu hỏi:** Khi AI kết luận "Bạn chưa hiểu X", có truy ngược được tới Assessment, Evidence, Knowledge Node hay không?

**Trả lời: CÓ — với điều kiện Application Layer tuân thủ đúng quy trình ghi 2 bảng cùng giao dịch.**

**Chuỗi truy vết đầy đủ:**

```
"Bạn chưa hiểu X" (kết luận hiển thị cho Learner)
        │
        ▼
assessment_result (assessment_result_id, knowledge_node_id = X, reasoning = "...")
        │ knowledge_node_id (FK trực tiếp)          │ trace_link (source_type='assessment_result', source_id=assessment_result_id)
        ▼                                            ▼
knowledge_node (X — định nghĩa khái niệm)      trace_link.target_type='evidence', target_id=evidence_id
                                                     │
                                                     ▼
                                                evidence (bài làm/câu trả lời gốc)
                                                     │ evidence_id (FK)
                                                     ▼
                                                evidence_link (stance='refute', knowledge_node_id=X, evidence_weight=...)
```

**Xác nhận từng chặng:**
1. **→ Knowledge Node:** `assessment_result.knowledge_node_id` là FK trực tiếp, `NOT NULL`, `ON DELETE RESTRICT` — luôn truy được, không thể NULL.
2. **→ Assessment (chính nó):** `assessment_result` tự thân đã chứa `reasoning` (bắt buộc, `CHECK` không rỗng) — câu trả lời "vì sao AI kết luận vậy" có sẵn ngay tại đây, không cần đi đâu khác.
3. **→ Evidence:** **không phải FK trực tiếp** — phải qua `trace_link` (`source_type='assessment_result'`, `source_id=assessment_result_id`, `target_type='evidence'`, `target_id=evidence_id`). Đây là điểm **duy nhất phụ thuộc Application Layer**: nếu Application không tạo `trace_link` cùng giao dịch với `assessment_result`, chuỗi truy vết **đứt tại đây** — Database không có cơ chế nào tự phát hiện hoặc ngăn chặn việc thiếu sót này (đã ghi nhận ở [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 1.6 và Risk #6).
4. **→ Evidence cụ thể support/refute KnowledgeNode nào:** từ `evidence_id`, join `evidence_link WHERE evidence_id = ... AND knowledge_node_id = X` để biết chính xác `stance`/`evidence_weight` nào đã góp phần.

**Kết luận: Traceability Validation — PASS về mặt cấu trúc (đủ bảng/cột để chuỗi truy vết tồn tại), nhưng có 1 điểm rủi ro vận hành rõ ràng: tính đầy đủ của chuỗi truy vết phụ thuộc 100% vào việc Application Layer luôn tạo `trace_link` đúng, đầy đủ, cùng giao dịch — Database không tự enforce được (do bản chất đa hình của `trace_link`, đã được chấp nhận từ DECISION-038). Khuyến nghị mạnh: viết integration test xác nhận invariant "mọi `assessment_result` đều có ≥1 `trace_link` trỏ tới `evidence`" trước khi đưa vào production.**

## E. Delete Rule Review

**Câu hỏi:** Toàn bộ `ON DELETE` đảm bảo `KnowledgeNode` không thể làm mất Evidence/AssessmentResult/Recommendation Evidence ngoài ý muốn?

**Rà soát toàn bộ FK trỏ tới `knowledge_node` trong phạm vi Round 2:**

| FK | `ON DELETE` | Hệ quả nếu cố xóa `knowledge_node` |
|---|---|---|
| `knowledge_edge.from_knowledge_node_id` | `RESTRICT` | Không xóa được nếu còn cạnh đi ra |
| `knowledge_edge.to_knowledge_node_id` | `RESTRICT` | Không xóa được nếu còn cạnh đi vào |
| `knowledge_node_mastery.knowledge_node_id` | `RESTRICT` | Không xóa được nếu còn ≥1 Learner có Mastery cho node này |
| `evidence_link.knowledge_node_id` | `RESTRICT` | Không xóa được nếu còn ≥1 EvidenceLink trỏ tới node này |
| `assessment_result.knowledge_node_id` | `RESTRICT` | Không xóa được nếu còn ≥1 AssessmentResult đánh giá node này |
| `trace_link.target_id` khi `target_type` liên quan tới `knowledge_node` | **Không áp dụng** — `trace_link` không trỏ tới `knowledge_node` (Scope của TraceLink chỉ gồm `evidence`/`assessment_result`/`discovery_session` làm target — `knowledge_node` không nằm trong danh sách target hợp lệ theo [PhysicalDesignPreparation.md](PhysicalDesignPreparation.md) mục 6) | Không phải lỗ hổng — `knowledge_node` không bao giờ là target của `trace_link` |
| "Recommendation Evidence" (`recommendation_proposal` → `evidence`/`assessment_result` qua `trace_link`) | **`recommendation_proposal` ngoài phạm vi Round 2** | Không đánh giá được trực tiếp ở Round này — nhưng `trace_link` (cơ chế chung) đã không có FK vật lý nào ở cả 2 đầu, nên không có `ON DELETE` nào "chảy qua" `trace_link` tới `knowledge_node`/`evidence`/`assessment_result` — rủi ro mất dữ liệu qua đường này **không tồn tại theo thiết kế** (đa hình không FK = không cascade) |

**Kết luận tổng hợp: Delete Rule Review — PASS.** **100% FK trỏ tới `knowledge_node` trong phạm vi Round 2 đều là `RESTRICT`, không có FK nào là `CASCADE`/`SET NULL`** — về lý thuyết, không thể xóa 1 `knowledge_node` đang được tham chiếu bởi `knowledge_edge`/`knowledge_node_mastery`/`evidence_link`/`assessment_result`, dù ai đó (Application Layer có lỗi, hoặc truy cập trực tiếp DB) cố tình thử. Vì `trace_link` không có FK vật lý ở bất kỳ chiều nào, không có đường "cascade ngầm" nào có thể chảy từ việc xóa `knowledge_node` tới `evidence`/`assessment_result` qua `trace_link` — rủi ro "Recommendation Evidence" bị mất theo nêu trong yêu cầu **không thể xảy ra qua cơ chế DB**, vì không có cơ chế DB nào kết nối chúng theo kiểu cascade.

**Lưu ý duy nhất cần nhắc lại:** vì `knowledge_node` thực tế **không bao giờ bị xóa** trong vận hành bình thường (immutable-by-default, append-only philosophy xuyên toàn hệ thống — không phải vì RESTRICT mà vì triết lý thiết kế), toàn bộ phân tích trên có tính "phòng ngừa lý thuyết" hơn là tình huống thực tế dự kiến xảy ra — đúng như cách [LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 6 đã ghi: *"quy tắc Restrict ở đây mang tính lý thuyết, không có tình huống xóa thực tế xảy ra"*.

---

## 1. Có domain mới nào được phát hiện không?

**Không.** 7 bảng Round 2 đều map 1:1 vào entity đã có trong [LogicalDatabaseModel.md](LogicalDatabaseModel.md)/[CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) — Knowledge Graph Domain, Evidence Domain, Assessment Domain, và hạ tầng cross-cutting `TraceLink`. Không có Domain/Aggregate Root nào được tạo thêm.

**2 điểm cần nói rõ (không phải Domain mới, nhưng cần ghi nhận):**
- `positive_evidence`/`negative_evidence` — đã từ chối tạo, vì sẽ tương đương "mở lại" 1 quyết định domain đã đóng (DECISION-022), không phải phát hiện domain mới.
- `assessment` (wrapper) — nếu Founder/ChatGPT thực sự muốn, **đây sẽ là 1 entity mới** cần Decision Log riêng trước khi thiết kế (tương tự quy trình DECISION-047) — nhưng Round 2 **không tự tạo nó**, chỉ ghi nhận làm câu hỏi mở.

## 2. Có aggregate nào quá lớn không?

**Không có Aggregate nào quá lớn trong phạm vi Round 2.** Đối chiếu lại 11 Aggregate Boundary đã chốt ([LogicalDatabaseModel.md](LogicalDatabaseModel.md) mục 5):
- Boundary 4 (`KnowledgeNode ⊃ KnowledgeEdge[], ExpansionRecord[]`) — Round 2 chỉ thiết kế 2/3 thành phần (`KnowledgeEdge` có; `ExpansionRecord` chưa, xem Risk #3 ở [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md)) — **Aggregate này hiện đang "thiếu" hơn là "quá lớn"**.
- Boundary 5 (`Evidence ⊃ EvidenceLink[]`) — nhỏ, gọn, đúng kích thước (1 cha + 1 loại con, không phình ra entity thứ 3 nào).
- Assessment Domain không phải 1 Aggregate Boundary chứa cả 2 entity (`AssessmentResult`, `KnowledgeNodeMastery`) — chúng là **2 Aggregate Root riêng** (Boundary 6 và 7), không gộp — đúng thiết kế, tránh được rủi ro 1 Aggregate quá lớn ôm cả lịch sử đánh giá (vô hạn theo thời gian) và trạng thái hiện tại (cần đọc nhanh) trong cùng 1 ranh giới giao dịch.

**Không phát hiện Aggregate "phình to" theo thời gian** kiểu thường gặp (ví dụ 1 Aggregate Root ôm toàn bộ children không giới hạn số lượng, gây vấn đề khi load toàn bộ Aggregate) — `Evidence ⊃ EvidenceLink[]` bị giới hạn tự nhiên (1 Evidence chỉ có vài EvidenceLink, theo số KnowledgeNode liên quan tới 1 lượt nộp bài, không tăng vô hạn).

## 3. Có coupling nguy hiểm không?

**1 coupling cần nêu rõ, không nguy hiểm nhưng cần hiểu đúng bản chất:** `assessment_result`/`evidence_link` đều có cột `knowledge_node_id` trỏ **trực tiếp** tới `knowledge_node` (Round 2), trong khi Roadmap Module (Round 1) cũng có quan hệ M:N `roadmap_node ↔ knowledge_node` (Dependency Edge, chưa tạo FK vì `knowledge_node` chưa tồn tại lúc đó — nay đã tồn tại, bảng nối này **vẫn chưa được tạo** ở Round 2, xem mục dưới). Đây là **coupling 2 chiều giữa Roadmap Module và Knowledge Module đã được Domain Architecture chốt từ đầu** (Roadmap Graph và Knowledge Graph là 2 graph riêng, kết nối qua Dependency Edge, [DECISION-015](../11_Decisions/DECISION-015-Knowledge-Engine.md)) — **không phải coupling phát sinh ngoài ý muốn** ở tầng Database Design.

**Không phát hiện coupling nguy hiểm nào khác:**
- Không có FK chéo giữa Evidence Domain và Knowledge Graph Domain ngoài `evidence_link.knowledge_node_id` (tham chiếu thuần, không sở hữu).
- Không có FK chéo giữa Assessment Domain và Evidence Domain ở tầng bảng — quan hệ giữa chúng **chỉ qua `trace_link`** (đa hình, không FK cứng) — đây thực ra là **giảm coupling** so với nếu dùng FK trực tiếp (đổi `evidence` schema không bắt buộc đổi `assessment_result` schema và ngược lại).
- `knowledge_node_mastery.last_assessment_result_id` là 1 FK 1 chiều rõ ràng (Mastery → AssessmentResult), không có FK ngược lại — không tạo circular dependency giữa 2 bảng.

**1 forward-dependency chưa đóng (không phải coupling nguy hiểm, nhưng cần nêu vì liên quan trực tiếp câu hỏi này):** Bảng nối `roadmap_node_knowledge_node` (Dependency Edge, đã hứa ở [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 1.4 "sẽ được thêm ở Round có Knowledge Module") **vẫn chưa được tạo ở Round 2** — `knowledge_node` giờ đã tồn tại, nên về kỹ thuật bảng nối này **có thể** tạo ngay bây giờ, nhưng **không được yêu cầu trong phạm vi Round 2** (chỉ giao 7 bảng Knowledge/Evidence/Assessment/Traceability, không có Roadmap). Ghi nhận làm gap cần đóng ở Round kế tiếp, không tự thêm ở đây (nhất quán nguyên tắc "không tự thêm bảng ngoài phạm vi giao", áp dụng y như cách xử lý `ExpansionRecord`/`assessment` ở trên).

## 4. Có vi phạm Learning Philosophy không?

**Không.** Xem phân tích chi tiết ở [DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md) mục 3 — cả 5 nguyên tắc được đối chiếu đều đạt (✅), không có vi phạm trực tiếp nào ở 7 bảng Round 2.

**1 điểm cần Founder/ChatGPT theo dõi sau khi Round 3+ hoàn thành** (không phải vi phạm hiện tại): nguyên tắc "Mọi kiến thức phải gắn với dự án" hiện chỉ được thực thi gián tiếp qua Roadmap Module (Round 1) + Dependency Edge (chưa tạo bảng nối, mục 3 trên) — nếu bảng nối `roadmap_node_knowledge_node` không bao giờ được tạo hoặc bị bỏ quên, `knowledge_node` về lý thuyết **có thể tồn tại hoàn toàn tách biệt khỏi mọi Roadmap/Goal**, làm nguyên tắc này thành "không thực thi được ở tầng dữ liệu", chỉ còn là quy ước Application Layer. Khuyến nghị: đóng gap bảng nối này sớm.

## 5. Nếu triển khai thật hôm nay, bottleneck lớn nhất là gì?

**Bottleneck lớn nhất: tính đầy đủ của `trace_link` hoàn toàn phụ thuộc kỷ luật ghi dữ liệu ở Application Layer, không có cơ chế DB nào backstop.**

Lý do đây là bottleneck lớn nhất, không phải các rủi ro khác đã liệt kê:
- Mọi yêu cầu Explainability First (DECISION-027) — vốn là 1 trong 7 Core Principles của toàn sản phẩm — **đứng hoàn toàn trên 1 giả định duy nhất**: code Application Layer luôn nhớ tạo `trace_link` đúng, đủ, cùng giao dịch với `assessment_result`/`recommendation_proposal`. Nếu 1 đường code (ví dụ 1 endpoint mới được thêm sau, hoặc 1 batch job sửa dữ liệu) quên bước này, hệ thống **không có cách nào tự phát hiện** — không CHECK constraint, không FK, không trigger nào ở tầng DB (đa hình của `trace_link` khiến điều này về cơ bản không khả thi bằng công cụ DB thuần) có thể bắt được lỗi "thiếu trace_link".
- So sánh với rủi ro khác đã liệt kê (Risk #1, #2, #3 ở [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md)): những rủi ro đó là **câu hỏi cần xác nhận trước khi build** (chặn ở giai đoạn thiết kế, dễ phát hiện, dễ sửa bằng review tài liệu) — còn rủi ro `trace_link` là **lỗi runtime âm thầm, chỉ phát hiện được khi Learner hỏi "vì sao" và hệ thống không trả lời được**, tức là phát hiện ra **sau khi đã ảnh hưởng tới trải nghiệm thật**, đúng lúc nguyên tắc cốt lõi nhất của sản phẩm (Explainability, gắn liền "AI phải giải thích được lý do đánh giá") bị vi phạm trước mặt Learner.
- Mức độ ảnh hưởng nếu xảy ra: không chỉ 1 bug kỹ thuật — vi phạm trực tiếp [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), nguyên tắc đã được nhắc đi nhắc lại xuyên suốt toàn bộ Decision Log từ Round 4 tới giờ.

**Khuyến nghị giảm thiểu (không phải thiết kế lại, không phải SQL — chỉ ghi nhận hướng xử lý cho bước triển khai thật sau này):** wrapper/service layer duy nhất chịu trách nhiệm tạo `assessment_result` (và tương tự cho `recommendation_proposal` ở Round sau) nên **luôn** bắt buộc kèm tham số `evidence_references` không được rỗng, và tự động tạo `trace_link` tương ứng trong cùng transaction — không để bất kỳ đường code nào tạo `assessment_result` trực tiếp mà bỏ qua bước này. Đây là khuyến nghị cho Application/Backend Design (ngoài phạm vi Database Design), ghi nhận ở đây vì đó là bottleneck thực tế lớn nhất nếu triển khai hôm nay.

---

## Kết luận tổng hợp

| Hạng mục | Kết quả |
|---|---|
| Knowledge Graph Validation | ✅ PASS |
| Evidence Ownership Validation | ✅ PASS — Aggregate Root riêng (Evidence Domain) |
| AssessmentResult Validation | ✅ PASS — Source of Truth = `assessment_result`; `knowledge_node_mastery` = Supporting Record |
| Traceability Validation | ✅ PASS về cấu trúc — 🔶 rủi ro vận hành (Application Layer) đã ghi nhận rõ |
| Delete Rule Review | ✅ PASS — 100% FK tới `knowledge_node` là `RESTRICT` |
| Domain mới? | Không |
| Aggregate quá lớn? | Không |
| Coupling nguy hiểm? | Không (1 coupling đã biết, đúng kiến trúc gốc; 1 gap forward-dependency cần đóng ở Round sau) |
| Vi phạm Learning Philosophy? | Không |
| Bottleneck triển khai thật | Kỷ luật ghi `trace_link` ở Application Layer (không có backstop ở DB) |

## OUTPUT STATUS

**READY_FOR_SQL_GENERATION**

Không có vi phạm cấu trúc/Domain/Learning Philosophy nào chặn việc viết DDL thật cho 7 bảng đã thiết kế. 3 mục ghi nhận ở [DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md) mục 0 (`positive_evidence`/`negative_evidence` không tạo, `assessment` không tạo, `ExpansionRecord` hoãn) và Risk #1-3 là **quyết định đã có lý do rõ ràng dựa trên Decision Log**, không phải điểm mơ hồ cần Founder xác nhận trước khi tiến hành — khác với tình huống `learning_session_transition` ở Round 1 (đó là **thêm** 1 bảng mới, cần duyệt; đây là **không thêm** bảng không có cơ sở, không cần duyệt thêm gì để tiếp tục).

**Khuyến nghị xác nhận sớm (không chặn SQL Generation của 7 bảng này, nhưng ảnh hưởng phạm vi Round kế tiếp):**
1. Xác nhận dứt điểm: `assessment` (wrapper) có cần tồn tại hay không — nếu cần, xử lý qua Decision Log riêng trước khi Round nào đó thiết kế nó.
2. Lên kế hoạch đóng gap `ExpansionRecord` và bảng nối `roadmap_node_knowledge_node` ở Round 3 (hoặc 1 Round bổ sung) — cả 2 đều là entity/quan hệ đã khóa, chỉ đang hoãn vì lý do thứ tự Round, không phải vì không cần.
3. RLS Policy thật cho `knowledge_node`/`knowledge_edge` (role-based, không phải per-learner) và `trace_link` (khuyến nghị mediated qua Backend) — viết ở bước khác, ngoài phạm vi DDL Design.

## Liên kết ngược

[DDL_ROUND2_DESIGN.md](DDL_ROUND2_DESIGN.md), [DDL_ROUND2_REVIEW.md](DDL_ROUND2_REVIEW.md), [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md), [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md).
