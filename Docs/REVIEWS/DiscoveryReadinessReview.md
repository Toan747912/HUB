# Discovery Readiness Review

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — review do Claude (Co-Architect) thực hiện, không phải Decision khóa, không tự đóng bất kỳ Open Question/Decision nào.** Vị trí thư mục `Docs/REVIEWS/` là **folder cấp cao mới, ngoài quy ước đánh số 00-12** đã dùng cho toàn bộ `Docs/` tới nay ([Project_Index.md](../Project_Index.md) mục 3) — tạo theo đúng đường dẫn được yêu cầu tường minh, **đề xuất cân nhắc gộp vào `03_Domain_Model/`/`06_Database/` (theo từng artifact) hoặc đánh số riêng (`13_Reviews/`) ở 1 lượt dọn dẹp sau**, không tự ý đổi trong tài liệu này.

## 1. Phạm vi

9 artifact thuộc Discovery Design Phase (3 lượt build):

| # | Artifact | Lượt tạo |
|---|---|---|
| 1 | `DiscoveryDomain.md` | 1 |
| 2 | `DiscoveryStateMachine.md` | 1 (sửa lượt 2, 3) |
| 3 | `DiscoveryCompletionCriteria.md` | 2 |
| 4 | `DiscoveryPromptArchitecture.md` | 1 (sửa lượt 2) |
| 5 | `DiscoveryAPIContract.md` | 1 (sửa lượt 2) |
| 6 | `SelfAssessmentMismatchMechanism.md` | 2 |
| 7 | `CanonicalOutputContract.md` | 2 |
| 8 | `DiscoveryLifecycle.md` | 3 |
| 9 | `DiscoveryPersistenceStrategy.md` | 3 |

## 2. Phân loại từng Artifact

| # | Artifact | Phân loại | Lý do chính |
|---|---|---|---|
| 1 | `DiscoveryDomain.md` | **NEEDS_REVISION** | Chưa hấp thụ `ClaimedSkillArea` (entity mới do `DiscoveryPersistenceStrategy.md` mục 1 đề xuất) vào mục 3 (Aggregate) — tài liệu tầng Domain đang đi sau tài liệu tầng Database, ngược hướng phụ thuộc thông thường (Domain phải định nghĩa entity trước, Database hiện thực hóa sau). Xem mục 4 Dependency Issues #1. |
| 2 | `DiscoveryStateMachine.md` | **NEEDS_REVISION** | Không sai, nhưng giờ là tài liệu phái sinh/lịch sử của `DiscoveryLifecycle.md` (mục 1-2) — duy trì 2 nơi mô tả transition cùng lúc có rủi ro lệch nhau theo thời gian nếu chỉ 1 trong 2 được cập nhật. Đề xuất gộp hẳn vào `DiscoveryLifecycle.md`, để file này chỉ còn mục 3/5/6 (nội dung không trùng). |
| 3 | `DiscoveryCompletionCriteria.md` | **NEEDS_REVISION** | Logic đầy đủ và tự nhất quán, nhưng (a) tham chiếu `claimed_skill_area` mục 4 chưa trỏ sang `DiscoveryPersistenceStrategy.md` (viết trước khi tài liệu đó tồn tại); (b) số cụ thể cho Retry Limit toàn phiên vẫn chưa có (chỉ có công thức). |
| 4 | `DiscoveryPromptArchitecture.md` | **NEEDS_REVISION** | Input Contract mục 3 (Competency Probe) vẫn dùng `knowledge_node_or_skill_label` — khái niệm này **đã bị thay thế** bởi `claimed_skill_area_id` ở `DiscoveryPersistenceStrategy.md` mục 4, nhưng tài liệu này chưa cập nhật theo. Đây là **dependency issue cụ thể**, không phải lỗi tự thân. |
| 5 | `DiscoveryAPIContract.md` | **NEEDS_REVISION** | 3 endpoint hiện có (`start`/`answer`/`session/:id`) không đủ phủ vòng đời mới: thiếu hành động `abandon` ([DiscoveryLifecycle.md](../03_Domain_Model/DiscoveryLifecycle.md) Risk #2) và thiếu luồng "phản biện mismatch" ([SelfAssessmentMismatchMechanism.md](../03_Domain_Model/SelfAssessmentMismatchMechanism.md) Risk #3). Idempotency (Risk gốc lượt 1) vẫn chưa thiết kế. |
| 6 | `SelfAssessmentMismatchMechanism.md` | **BLOCKED** | Thiết kế logic đầy đủ (9/9 mục được yêu cầu đều có nội dung) nhưng **2 giá trị số cốt lõi vẫn hoàn toàn chưa có**: ngưỡng kích hoạt mismatch (`≥1` hay `≥2` bậc) và công thức `confidence`/`evidence_weight` thật (OQ13). Không thể implement đúng nếu thiếu — đây là blocker thật, không chỉ thiếu sót tài liệu. Tài liệu tự nhận thức rõ điều này (mục 4, mục 7) nên không bị xem là cẩu thả, nhưng trạng thái vẫn là BLOCKED cho mục đích Code Phase. |
| 7 | `CanonicalOutputContract.md` | **NEEDS_REVISION** | Phát hiện **documentation drift trong chính lượt sinh ra nó**: mục 7 Risk #2 nói "next_step chưa có giá trị cho BLOCKED, chưa tự sửa DiscoveryAPIContract.md" — nhưng `DiscoveryAPIContract.md` **đã được sửa thêm `"blocked"`** ở bước cross-reference update ngay sau đó, cùng lượt 2. Risk #2 hiện đã lỗi thời, cần cập nhật lại. Ngoài ra chưa phản ánh state `EXPIRED`/`ABANDONED` mới (lượt 3) vào Layer 2/3. |
| 8 | `DiscoveryLifecycle.md` | **NEEDS_REVISION** | Tự nhất quán, giải quyết đúng 1 Risk cũ (`BLOCKED` không lối thoát), nhưng tự phát hiện ra 1 câu hỏi domain hoàn toàn mới chưa từng được đặt ra ở bất kỳ lượt nào trước: **có cho phép nhiều `DiscoverySession` `continuous` đang mở đồng thời cho cùng 1 Goal hay không** (Risk #3) — ảnh hưởng trực tiếp logic `archived_at`. |
| 9 | `DiscoveryPersistenceStrategy.md` | **NEEDS_REVISION** | Thiết kế giải quyết đúng vấn đề (mục 1-6 mạch lạc, dùng lại tiền lệ `roadmap_node_knowledge_node`), nhưng **đề xuất sửa đổi chưa được áp dụng** vào `DiscoverySchema_Draft.sql` (chỉ có 1 comment trỏ chéo) — 2 tài liệu hiện mô tả `competency_signal` khác nhau (schema cũ: `knowledge_node_id` nullable; persistence strategy mới: `claimed_skill_area_id` NOT NULL). |

**Không có artifact nào được phân loại `READY`** — mọi tài liệu đều có ít nhất 1 dependency chưa khép kín với 1 tài liệu khác trong cùng bộ, đúng bản chất của 1 thiết kế được xây 3 lượt liên tiếp (mỗi lượt phát hiện thêm gap ở lượt trước, theo đúng tinh thần GOVERNANCE.md — không phải dấu hiệu chất lượng kém).

## 3. Blocking Issues (chặn Code Phase thật sự)

1. **OQ5 chưa Founder/Lead Architect xác nhận chính thức** — `SelfAssessmentMismatchMechanism.md` là đề xuất đầy đủ nhưng không phải quyết định; code hóa "verification_method"/ngưỡng mismatch mà chưa xác nhận = code hóa 1 giả định chưa duyệt.
2. **OQ12/13 (`capability_weight`, `evidence_weight`) chưa có giá trị** — chặn việc implement `confidence` thật cho cả Discovery lẫn các domain khác đã từng phụ thuộc 2 câu hỏi này.
3. **`competency_signal` có 2 mô tả mâu thuẫn nhau** giữa `DiscoverySchema_Draft.sql` (lượt 1) và `DiscoveryPersistenceStrategy.md` (lượt 3, chưa áp dụng) — code hóa schema ở trạng thái hiện tại sẽ cần viết lại ngay sau đó.
4. **3 endpoint còn thiếu** (`abandon`, mismatch-contest follow-up, và idempotency cho `start`/`answer`) — bề mặt API chưa đủ để code đúng toàn bộ vòng đời đã thiết kế ở `DiscoveryLifecycle.md`.

## 4. Dependency Issues

1. **Hướng phụ thuộc ngược** — `ClaimedSkillArea` được định nghĩa lần đầu ở tài liệu tầng Database (`DiscoveryPersistenceStrategy.md`, 06_Database) thay vì tầng Domain (`DiscoveryDomain.md`, 03_Domain_Model) trước. Nên đồng bộ ngược lại `DiscoveryDomain.md` mục 3 trước khi code, giữ đúng thứ tự thẩm quyền tài liệu ([Project_Index.md](../Project_Index.md) mục 3: "quyết định gốc → tài liệu chi tiết → mô hình vận hành rút gọn").
2. **`DiscoveryPromptArchitecture.md` và `DiscoveryAPIContract.md` chưa cập nhật theo `claimed_skill_area_id`** (mục 2 bảng) — nếu code theo đúng 2 tài liệu này hiện tại, sẽ code sai so với `DiscoveryPersistenceStrategy.md` mới hơn.
3. **`CanonicalOutputContract.md` chưa phản ánh `EXPIRED`/`ABANDONED`** (state mới nhất, lượt 3) — Layer 2/3 (Session Envelope, Event Contract) chỉ tính tới `BLOCKED`.

## 5. Governance Issues

1. **Không có locked Decision nào bị sửa** — đã rà soát lại cả 9 artifact, không tài liệu nào tự ý đổi nội dung `11_Decisions/`. ✅
2. **Không có Capability mới ngoài 4 capability đã duyệt** (Goal Clarification, Competency Probing, Continuous Discovery, SelfAssessmentMismatch Detection) — `ClaimedSkillArea`/`archived_at` là entity/thuộc tính hỗ trợ, không phải Capability mới. ✅
3. **`Docs/REVIEWS/` là folder mới ngoài quy ước 00-12** — không phải vi phạm Governance (không file nào trong `11_Decisions/` cấm tạo folder mới), nhưng lệch khỏi tiền lệ đã dùng nhất quán tới giờ — ghi nhận, không tự sửa (mục đầu tài liệu).
4. **OQ5 vẫn chính thức "Chưa trả lời"** trong `OpenQuestions.md`/`Backlog.md` §D dù đã có đề xuất đầy đủ — đúng quy trình (Claude không tự đóng), nhưng cần Founder lưu ý đây là điểm cần quyết định sớm nhất nếu muốn vào Code Phase.

## 6. Recommendation

**Thứ tự xử lý đề xuất trước khi vào Code Phase** (ưu tiên giảm dần):

1. Founder/Lead Architect xác nhận hoặc phản biện `SelfAssessmentMismatchMechanism.md` (đóng OQ5 chính thức, kèm giá trị ngưỡng cụ thể).
2. Áp dụng đề xuất sửa đổi schema ở `DiscoveryPersistenceStrategy.md` mục 7 vào `DiscoverySchema_Draft.sql` — xóa mâu thuẫn 2 mô tả.
3. Đồng bộ ngược `ClaimedSkillArea` vào `DiscoveryDomain.md` mục 3 (đúng thứ tự thẩm quyền tài liệu).
4. Cập nhật `DiscoveryPromptArchitecture.md`/`DiscoveryAPIContract.md` theo `claimed_skill_area_id`; bổ sung 3 endpoint còn thiếu (mục 3 #4).
5. Cập nhật `CanonicalOutputContract.md` Layer 2/3 cho `EXPIRED`/`ABANDONED`, sửa Risk #2 đã lỗi thời.
6. Quyết định Risk #3 mới của `DiscoveryLifecycle.md` (nhiều `DiscoverySession` continuous đồng thời/Goal có hợp lệ không).
7. *(Thấp ưu tiên, dọn dẹp)* Gộp `DiscoveryStateMachine.md` vào `DiscoveryLifecycle.md`, cân nhắc vị trí `Docs/REVIEWS/`.

**Không đề xuất bỏ qua bước nào ở trên để vào Code Phase sớm hơn** — mục 3 (Blocking Issues) đều là loại lỗi sẽ buộc viết lại code sau khi phát hiện, không phải rủi ro lý thuyết.

## 7. Discovery Design Readiness Score: **58/100**

| Hạng mục | Điểm tối đa | Điểm | Ghi chú |
|---|---|---|---|
| Domain Model completeness | 20 | 14 | Đầy đủ về Aggregate/Boundary/Event, trừ điểm vì chưa hấp thụ `ClaimedSkillArea` |
| Persistence/Schema completeness | 20 | 10 | Thiết kế hợp lý nhưng đang ở trạng thái 2 phiên bản mâu thuẫn (mục 3 #3) |
| API/Contract completeness | 20 | 11 | Hệ phân cấp 4 lớp tốt, nhưng thiếu 3 endpoint + chưa phản ánh state mới |
| Explainability/Governance compliance | 20 | 17 | Không vi phạm Decision nào, D7/DECISION-048 được tôn trọng xuyên suốt — điểm cao nhất |
| Open Question resolution | 20 | 6 | OQ5 mới chỉ có đề xuất, OQ12/13 vẫn hoàn toàn mở — đây là hạng mục yếu nhất |

**Tổng: 58/100** — thiết kế có chiều sâu và tự phản biện tốt (mỗi lượt tự phát hiện gap của lượt trước, không che giấu), nhưng còn quá nhiều giá trị số/quyết định Founder chưa chốt và 1 mâu thuẫn schema thật để an toàn bắt đầu code.

## 8. Can Discovery move into Code Phase?

# **NO**

Lý do ngắn gọn: ít nhất 1 blocking issue (mục 3 #3 — `competency_signal` có 2 mô tả mâu thuẫn) sẽ khiến bất kỳ code nào viết hôm nay cũng cần sửa lại ngay khi áp dụng `DiscoveryPersistenceStrategy.md`, và 2 blocking issue khác (OQ5, OQ12/13) phụ thuộc quyết định của Founder/Lead Architect mà Claude không có thẩm quyền tự đóng. Khuyến nghị hoàn thành tối thiểu mục 6 bước 1-4 trước khi mở khóa Code Phase.
