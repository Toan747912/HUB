# Decision Persistence Gap Closure — Can This Architecture Close GAP-01 / GAP-02 / GAP-05 / D7 / D9?

> Đánh giá tác động của [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) + [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md) + [HEADER_DETAIL_BOUNDARY_REVIEW.md](HEADER_DETAIL_BOUNDARY_REVIEW.md) lên các gap đã biết. **Kiến trúc thuần — không SQL, không bảng nào được tạo ở Round này, không sửa DDL Round 1-4.**

## 1. Can This Architecture Close GAP-01 (D1 — Teaching 0% persistence)?

**Không — chưa đóng, nhưng nay có lộ trình đóng rõ ràng, điều kiện trước đây không có.**

Trước Round này: GAP-01 là Critical vì **không có cơ chế nào được định nghĩa** cho D1 — không biết nên persist theo hình dạng nào, ai sở hữu, quan hệ với TraceLink ra sao. Sau Round này:
- ✅ Đã xác định **Header required = Có, Detail required = Có, TraceLink required = Có** ([AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md)).
- ✅ Đã xác định Runtime Reconstruction **không đủ** cho D1 (judgment-based, không phải pure derivation) — loại trừ 1 lối tắt sai trước khi ai đó thử áp dụng.
- ✅ Đã xác định ranh giới Header (tối giản, không chứa nội dung Teaching) vs Detail (chứa toàn bộ nội dung/lý do chọn dạy) — tránh nhầm 2 vai trò khi thiết kế Detail thật.
- ❌ **Chưa có**: cột/bảng Detail thực tế cho D1 (cố ý, ngoài phạm vi "không tạo bảng" của Round này); enum `trace_link.source_type` chưa được mở rộng thêm giá trị cho D1.

**Kết luận:** GAP-01 **vẫn Critical, vẫn mở** — nhưng chuyển từ "Critical + không có hướng giải" sang "Critical + đã có kiến trúc đích, chỉ còn thiếu bước thiết kế Detail cụ thể (Round sau)". Đây là tiến bộ thật, không phải đóng gap.

## 2. Can This Architecture Close GAP-02 (D5 — Local Expansion no internal reason store)?

**Không — cùng tình trạng như GAP-01, với 1 điểm khác biệt quan trọng cần lưu ý.**

GAP-02 có 1 đặc điểm riêng GAP-01 không có: [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md) (Round 3.6) đã từng đề xuất "2C — mở rộng `expansion_record`" (entity D4 đã có) làm phương án khả thi cho D5, thay vì 1 Detail hoàn toàn mới. Kiến trúc Header/Detail ở Round này **không loại trừ** phương án đó — Detail của D5 **có thể** là `expansion_record` được mở rộng (nếu Founder/ChatGPT chọn) hoặc 1 entity mới riêng — tài liệu này **không tự quyết định** giữa 2 hướng vì việc đó sẽ chạm `expansion_record` đã khóa ở DDL Round 3 (ngoài phạm vi "không sửa DDL Round 1-4" của Round này).

**Kết luận:** GAP-02 **vẫn Critical, vẫn mở.** Kiến trúc Round này xác nhận D5 cần Header+Detail+TraceLink giống D1, nhưng **để ngỏ có chủ đích** câu hỏi "Detail của D5 là bảng mới hay mở rộng `expansion_record`" cho Round Detail Design tiếp theo — đây là 1 quyết định DDL thật (đụng bảng đã khóa hoặc tạo bảng mới), không phải quyết định kiến trúc thuần.

## 3. Can This Architecture Close GAP-05 (D6 — Roadmap Mapping reason column)?

**Không — và GAP-05 có ràng buộc chặt hơn GAP-01/02 vì bảng chính (`roadmap_node_knowledge_node`) đã tồn tại và đã khóa từ DDL Round 3.**

[DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 2 đã nêu rõ: đóng GAP-05 cần 1 trong 2 — (a) thêm cột lý do vào `roadmap_node_knowledge_node` (sửa DDL Round 3 — **bị cấm tường minh** ở Round này), hoặc (b) tạo 1 Detail entity mới riêng, tham chiếu `roadmap_node_knowledge_node` (không sửa nó, chỉ thêm bảng mới trỏ vào). Phương án (b) **tương thích** với ràng buộc "không sửa DDL Round 1-4" — nhưng **tài liệu này không tự chọn (b) thay Founder**, chỉ xác nhận nó khả thi về mặt kiến trúc.

**Kết luận:** GAP-05/H-01 **vẫn High, vẫn mở.** Kiến trúc Round này thu hẹp không gian giải pháp còn 2 hướng rõ ràng (sửa bảng cũ hoặc thêm bảng mới), nhưng không tự chọn — quyết định này **đặc biệt nhạy** vì đụng tới ranh giới "sửa DDL đã khóa", nên cần xác nhận Founder/ChatGPT rõ ràng hơn các gap khác.

## 4. D7 Persistence — Status

**Đã đóng từ trước Round này (DDL Round 4) — Round này không đóng D7, chỉ tích hợp D7 vào kiến trúc Header.**

`self_assessment_mismatch` (Detail của D7) đã tồn tại với `mismatch_reasoning` CHECK không rỗng, FK tới `discovery_session`/`knowledge_node` — thỏa đầy đủ yêu cầu Detail. Việc còn lại (Header cho D7) là **tùy chọn đăng ký ngược**, không phải điều kiện để D7 "explainable" — D7 **đã** explainable đầy đủ ở mức Detail/FK-trực-tiếp ngay từ DDL Round 4, trước khi Header được đề xuất.

**Điểm cần làm rõ (không phải gap mới, là 1 làm-rõ phạm vi):** câu hỏi gốc của Task ("Can this close D7 persistence?") có thể bị hiểu nhầm là D7 đang mở — **không đúng**, D7 persistence đã đóng. Phạm vi Round này cho D7 chỉ là: xác nhận D7 phù hợp khớp vào Header (mục Mechanism Matrix: Header required = Có, khuyến nghị) — 1 cải thiện về tính **tổng hợp/timeline**, không phải về tính **explainable** (đã có sẵn).

## 5. D9 Persistence (D9a/D9b) — Status

**Không đóng — và đây là gap sâu hơn các gap khác, không chỉ là vấn đề persistence mechanism.**

Khác GAP-01/02/05 (đã biết rõ "cần lưu gì, chỉ chưa chọn lưu ở đâu"), D9a/D9b còn vướng 1 lớp vấn đề **trước** câu hỏi persistence: **cơ chế Stuck Detection bản thân chưa từng được thiết kế** (Open Question #6/#11, [EVENT_CATALOG.md](EVENT_CATALOG.md)/[AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md)) — chưa biết tín hiệu nào, ngưỡng nào, ai sở hữu (Mentor Interaction hay Teaching, ranh giới "chưa đóng" theo DECISION-048 Consequences). Kiến trúc Header/Detail **không thể tự giải quyết vấn đề này** — Header/Detail trả lời "lưu quyết định đã có ở đâu", không trả lời "quyết định này được tạo ra bằng thuật toán/tiêu chí nào".

**Kết luận:** D9a/D9b persistence **vẫn hoàn toàn mở**, và **mở ở 2 lớp**: (1) thuật toán/ranh giới sở hữu Stuck Detection — ngoài phạm vi Database Design hoàn toàn; (2) persistence mechanism cho kết quả của (1) khi nó được thiết kế — Round này chỉ trả lời được phần (2) ở mức kiến trúc ("sẽ cần Header+Detail+TraceLink, không nên Runtime Reconstruction"), không trả lời được phần (1).

---

## 6. Remaining Unresolved Issues (tổng hợp)

| # | Vấn đề | Loại | Mức độ |
|---|---|---|---|
| 1 | GAP-01 (D1) — Detail entity cụ thể chưa thiết kế | DDL, Round Detail Design sau | Critical (không đổi) |
| 2 | GAP-02 (D5) — Detail entity cụ thể chưa thiết kế, **+ câu hỏi mở rộng `expansion_record` hay tạo mới chưa quyết** | DDL, Round Detail Design sau | Critical (không đổi) |
| 3 | GAP-05/H-01 (D6) — sửa bảng cũ hay tạo Detail mới chưa quyết, **đụng ranh giới "không sửa DDL đã khóa"** | DDL, cần xác nhận Founder rõ hơn các gap khác | High (không đổi) |
| 4 | D9a/D9b — cơ chế Stuck Detection (thuật toán/tiêu chí/ranh giới sở hữu) hoàn toàn chưa thiết kế | Domain/Algorithm Design, ngoài phạm vi Database | Open Q#6/#11, High |
| 5 | Header/Detail Architecture (toàn bộ tài liệu này) **chưa được Founder/ChatGPT chốt** — vẫn là đề xuất | Decision Log | Cần 1 DECISION-0XX mới để lock, chưa tồn tại |
| 6 | `detail_type`/`detail_id` (mục 1.1, [DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md)) vs phương án Detail trỏ ngược (mục 1.2) — 2 phương án chưa chọn | Architecture, chờ Founder | Medium |
| 7 | Synchronization risk Header+Detail+TraceLink (không tạo cùng transaction) — cần 1 Service layer, chưa thiết kế | Application/Backend Design | Medium (kế thừa pattern GAP-04/05/07/C-05) |
| 8 | `trace_link.source_type`/`target_type` enum chưa mở rộng cho D1/D5/D9a/D9b (khi Detail của chúng được build) | DDL, Round Detail Design sau | Medium — mở rộng enum, không phải cơ chế mới |
| 9 | D8 Runtime Reconstruction — điều kiện "mọi input tự truy xuất lại được" vẫn chưa xác minh | Mentor Interaction Domain Design | Đã biết từ Round 4.1/4.2, không đổi |
| 10 | Cách Header tích hợp ngược (tùy chọn) với D2/D3/D4/D7 đã build — chưa quyết, không bắt buộc | Architecture, chờ Founder | Low |

**So với [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md) (C-02/C-03/C-04):** C-04 ("Decision Header mechanism chưa chọn") **chuyển từ "chưa có đề xuất nào" sang "đã có đề xuất kiến trúc đầy đủ, chưa được chốt"** — đây là tiến bộ rõ ràng, nhưng C-04 vẫn Critical cho tới khi Founder/ChatGPT thực sự lock 1 DECISION-0XX mới. C-02 (GAP-01) và C-03 (GAP-02) **không đổi mức độ** — vẫn Critical, lý do đã giải thích ở mục 1/2.

---

## 7. Cross-check (Task 5)

| Decision | Verify | Kết quả |
|---|---|---|
| [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) | No Explainability conflicts | ✅ Không xung đột — kiến trúc Header/Detail là cơ chế **thực thi** nguyên tắc đã có (Mastery/Recommendation/Knowledge Expansion vẫn explainable đúng cách cũ), không thay đổi định nghĩa "explainable" |
| [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md) | No Traceability conflicts | ✅ Không xung đột — `trace_link` không bị sửa cấu trúc; Header **không** tái tạo Polymorphic FK (mục 1.1 đã phân tích kỹ); mọi mở rộng TraceLink cho Decision Type mới chỉ là thêm enum value, đúng cách DECISION-038 được thiết kế để mở rộng từ đầu |
| [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md) | No Persistence conflicts | ✅ Không xung đột — Header/Detail mới (khi build) là **append-only**, không cần History Table (đúng nhóm "append-only" đã có, không phải nhóm "Current State Snapshot mutable" — Header/Detail không bao giờ `UPDATE`) |
| [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | No Explainability conflicts (cốt lõi của Round này) | ✅ Không xung đột — kiến trúc Header/Detail là **hệ quả trực tiếp** đã được DECISION-048 dự báo ("việc chọn persistence mechanism cụ thể... thuộc về... các Round Database tiếp theo") — Round này chính là Round đó, không đi ngược lại bất kỳ điều khoản nào của DECISION-048 |

**Aggregate conflicts:** ✅ Không có — Header/Detail không mở Boundary mới, không sửa Boundary 1-10 đã khóa (DDL Round 1-4). Detail mới (khi build) sẽ là con/đứng cạnh entity đã có trong Boundary tương ứng, không tạo Boundary 11+ nào ở Round này.

**Không phát hiện xung đột nào trong cả 4 trục được yêu cầu** (Explainability, Aggregate, Persistence, Traceability).

---

## 8. Mandatory Questions

**1. Is Decision Header required?**
✅ Có — bắt buộc cho ít nhất D8 (trường hợp duy nhất Header là nguồn sự thật duy nhất của "decision đã xảy ra") và khuyến nghị mạnh cho D1/D5/D6/D9a/D9b (giải quyết nhu cầu truy vấn tổng hợp xuyên decision mà Approach A một mình không giải quyết được, [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) mục 5).

**2. Is Header a Domain Entity?**
❌ Không — cross-cutting, không thuộc Core Domain nghiệp vụ nào, cùng vị thế `trace_link` ([DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md) mục 1 Ownership).

**3. Is Header a Supporting Persistence Entity?**
✅ Đúng — cùng phân loại với `trace_link`, `learning_session_transition`, `approval_record`, `recommendation_proposal_response` (đã dùng ở DDL Round 1-4): không phải Core Domain Entity, không mở Aggregate Boundary nghiệp vụ mới, phục vụ 1 nhu cầu hạ tầng cross-cutting.

**4. Does every AI Decision require Header?**
✅ Có — cả 10/10 Decision Type (D1-D9b), bao gồm D8 (qua Header + Runtime Reconstruction). Không có Decision Type nào được miễn trừ khỏi Header, đúng tinh thần "không decision nào là black-box" của DECISION-048.

**5. Does every AI Decision require Detail?**
❌ Không — chỉ 9/10 (toàn bộ trừ D8). D8 là ngoại lệ duy nhất, có điều kiện ràng buộc rõ (Runtime Reconstruction hợp lệ chỉ khi input tự truy xuất lại được — điều kiện này **chưa xác minh**, mục 6 #9).

**6. Which decisions can use runtime reconstruction?**
Chỉ **D8** trong trạng thái hiện tại. Không Decision Type nào khác đủ điều kiện — lý do xuyên suốt (xem [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md) cột cuối): D1/D5/D6/D9a/D9b đều tạo ra **nội dung lựa chọn mới** (judgment cụ thể giữa nhiều lựa chọn hợp lệ), không phải 1 hàm xác định từ input đã persist — nên không suy luận lại được dù biết hết input.

**7. Can D8 remain reconstruction-only?**
🟡 **Có, với điều kiện chưa xác minh.** Per [D8_EXPLAINABILITY_REVIEW.md](D8_EXPLAINABILITY_REVIEW.md): hợp lệ **chỉ khi** mọi input dùng để Mode Selection tự truy xuất lại được từ domain khác — cơ chế Mode Selection cụ thể (input nào, ngưỡng nào) **chưa từng được chốt** ở bất kỳ Round nào, nên câu trả lời "có" hiện tại vẫn là 1 giả định hợp lý, không phải đã kiểm chứng. Nếu Mentor Interaction Domain sau này thiết kế Mode Selection có yếu tố lựa chọn tự do (giống D1), D8 sẽ phải chuyển sang Persisted Record.

**8. Can GAP-01 be closed?**
❌ Chưa — bằng kiến trúc Round này (xem mục 1). Có thể đóng ở Round Detail Design tiếp theo, dùng đúng kiến trúc đã đề xuất ở đây làm khung.

**9. Can GAP-02 be closed?**
❌ Chưa — bằng kiến trúc Round này (xem mục 2). Thêm 1 câu hỏi mở riêng (mở rộng `expansion_record` hay tạo Detail mới) cần quyết trước khi đóng được.

**10. Can D7 be fully explainable?**
✅ **Đã** — từ DDL Round 4, trước Round này. Round này chỉ bổ sung khả năng D7 tham gia truy vấn timeline/inventory qua Header (cải thiện về tổng hợp, không phải về explainability — đã đầy đủ từ trước).

**11. Can D9a/D9b be fully explainable?**
❌ Không — chưa thể, vì cơ chế Stuck Detection bản thân (không chỉ persistence mechanism) chưa được thiết kế (Open Q#6/#11). Kiến trúc Header/Detail sẵn sàng tiếp nhận D9a/D9b ngay khi cơ chế đó tồn tại, nhưng không thể tự làm D9a/D9b explainable trước khi có nội dung gì để explain.

**12. Is TraceLink still required?**
✅ Có — không đổi, không bị thay thế bởi Header. TraceLink vẫn là cơ chế duy nhất cho provenance (nguồn dữ liệu cụ thể đã dùng); Header chỉ bổ trợ ở vai trò registry/timeline, 2 vai trò khác nhau đã xác nhận lại ở [HEADER_DETAIL_BOUNDARY_REVIEW.md](HEADER_DETAIL_BOUNDARY_REVIEW.md).

**13. Is another persistence entity required?**
🟡 Một phần — Header là 1 Supporting Persistence Entity mới (cần xác nhận Founder). Ngoài Header, **mỗi Decision Type còn thiếu Detail (D1, D5, D9a, D9b, + có thể D6)** sẽ cần 1 Detail entity riêng — nhưng đây không phải "entity bổ sung cho cơ chế persistence chung", mà là Detail cụ thể từng domain, đã được dự báo từ DDL Finalization Review, không phải phát hiện mới của Round này.

**14. Is SQL generation blocked?**
🟡 **Một phần.** SQL cho 25 bảng Core (DDL Round 1-4) **không bị ảnh hưởng, vẫn sẵn sàng** ([DDL_ROUND4_ARCHITECTURE_REVIEW.md](DDL_ROUND4_ARCHITECTURE_REVIEW.md) READY_FOR_SQL_GENERATION, không đổi). SQL cho Header/Detail mới: ❌ **bị chặn** — kiến trúc mới chỉ là đề xuất, chưa chốt (mục 6 #5), chưa có cột/bảng cụ thể nào được thiết kế (cố ý, ngoài phạm vi Round này).

**15. What remains after this round?**
Xem mục 9 (Readiness Assessment) — tổng hợp đầy đủ.

---

## 9. DECISION_PERSISTENCE_READINESS_ASSESSMENT

| Trục | Đánh giá | Điều kiện còn thiếu |
|---|---|---|
| **Full SQL Generation** | 🔴 **Chưa sẵn sàng cho Header/Detail mới.** 🟢 Không đổi (vẫn sẵn sàng) cho 25 bảng Core Round 1-4 | Cần: (1) Founder/ChatGPT lock kiến trúc Header/Detail (hoặc chọn phương án khác) thành 1 DECISION-0XX mới; (2) chọn phương án `detail_type`/`detail_id` (mục 1.1) vs Detail trỏ ngược (mục 1.2); (3) thiết kế cột cụ thể cho 5 Detail còn thiếu (D1/D5/D6/D9a/D9b) — Round Detail Design riêng, **chưa làm ở đây theo đúng giới hạn được giao** |
| **Policy Authoring (RLS)** | 🔴 **Chưa sẵn sàng cho Header/Detail mới** | Pattern dự kiến đơn giản (`learner_id = auth.uid()` cho Header, tương tự Detail) — nhưng không thể viết Policy chính thức trước khi schema được chốt. 🟢 Không đổi cho 25 bảng Core |
| **Backend Implementation** | 🔴 **Chưa sẵn sàng** | Cần schema chốt trước; ngoài ra D9a/D9b còn vướng thêm lớp thuật toán Stuck Detection chưa thiết kế — backend không thể implement Detail cho D9a/D9b dù schema có sẵn, vì chưa biết logic sinh ra nó |
| **Production Deployment** | 🔴 **Chưa sẵn sàng toàn hệ thống** (không đổi từ [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md)) | DECISION-048 yêu cầu 10/10 Decision Type explainable trước khi tuyên bố hệ thống tuân thủ đầy đủ — hiện tại 4/10 đã đóng hoàn toàn (D2/D3/D4/D7), 1/10 có điều kiện chưa xác minh (D8), 5/10 vẫn mở (D1/D5/D6/D9a/D9b) |

**Tổng kết:** Round này **không đóng** bất kỳ gap Critical/High nào đã liệt kê trước đó (GAP-01/02/05, D9) — nhưng chuyển toàn bộ chúng từ trạng thái "chưa có hướng giải" sang "có kiến trúc đích rõ ràng, chỉ còn thiếu (a) quyết định lock của Founder/ChatGPT và (b) thiết kế Detail cụ thể ở Round sau". Đây là tiến bộ kiến trúc thật, đúng vai trò được giao ("Architecture only... Do NOT create SQL... Do NOT create tables") — đóng gap thật sẽ là việc của Round Detail Design tiếp theo, sau khi Header/Detail Architecture được Founder/ChatGPT xác nhận.

## Liên kết ngược

[DECISION_PERSISTENCE_ARCHITECTURE.md](DECISION_PERSISTENCE_ARCHITECTURE.md), [AI_DECISION_MECHANISM_MATRIX.md](AI_DECISION_MECHANISM_MATRIX.md), [HEADER_DETAIL_BOUNDARY_REVIEW.md](HEADER_DETAIL_BOUNDARY_REVIEW.md), [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md), [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md), [DDL_ROUND4_GAP_ANALYSIS.md](DDL_ROUND4_GAP_ANALYSIS.md), [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md), [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md), [DECISION-045](../11_Decisions/DECISION-045-Temporal-Strategy.md), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md).

**Chưa có SQL/`CREATE TABLE`/migration nào được tạo. DDL Round 1-4 không bị sửa. Đây là đề xuất kiến trúc của Claude (Co-Architect), chưa chốt — chờ Founder/ChatGPT Lead Architect.**
