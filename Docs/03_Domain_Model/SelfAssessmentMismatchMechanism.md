# SelfAssessmentMismatch Mechanism (Proposed Resolution — OpenQuestions.md câu 5)

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — đề xuất thiết kế đầy đủ (Co-Architect) để giải quyết [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 5.** Đây **không phải Decision khóa** — đóng câu 5 chính thức cần Founder/Lead Architect xác nhận rồi tạo file `DECISION-XXX` mới theo [GOVERNANCE.md](../GOVERNANCE.md) mục 2 (Claude không tự đóng Open Question). Tài liệu này là **đề xuất đủ chi tiết để xác nhận**, không phải bản thân sự xác nhận.
>
> Cơ sở: [DECISION-007-Discovery-Engine](../11_Decisions/DECISION-007-Discovery-Engine.md), [DiscoveryDomain.md](DiscoveryDomain.md) mục 3 (cột `verification_method`, Risk #1), [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (D7), [DECISION-009-Knowledge-Philosophy](../11_Decisions/DECISION-009-Knowledge-Philosophy.md) (4-level Remember/Explain/Apply/Teach — tái sử dụng làm thang đo chung, xem mục 1).

## 0. Quyết định thiết kế cốt lõi: tái sử dụng thang đo Knowledge Philosophy

Thay vì phát minh 1 thang đo mới cho `self_reported_level`/`observed_level` (đã bị flag là 🔶 OPEN ở [DiscoveryDomain.md](DiscoveryDomain.md) mục 6 Risk #1), đề xuất **dùng lại nguyên trạng 4 cấp đã khóa ở [DECISION-009](../11_Decisions/DECISION-009-Knowledge-Philosophy.md)**: `Unknown < Remember < Explain < Apply < Teach` (5 điểm, "Unknown" là điểm 0 thêm để biểu diễn "Learner tự nhận không biết gì").

**Lý do:** (1) tránh 2 thang đo song song cho cùng 1 khái niệm "mức độ hiểu" trong cùng hệ thống; (2) thang đo này đã có sẵn ngữ nghĩa rõ ràng (Knowledge Philosophy) mà Learner/Founder đã chấp nhận; (3) giải quyết đồng thời Risk #1 ở `DiscoveryDomain.md` mà không cần mở thêm 1 Open Question riêng. Đây vẫn là **đề xuất**, không phải đương nhiên đúng — nếu Founder/ChatGPT đã có thang đo khác trong đầu cho Discovery, đây là điểm cần phản biện đầu tiên.

## 1. Inputs

| Input | Bắt buộc | Nguồn |
|---|---|---|
| `competency_signal.self_reported_level` | Có | Trích xuất từ `DiscoveryAnswer.raw_input` (NLP/AI extraction — bản thân việc "trích xuất" này là 1 lời gọi AI riêng, không phải Mismatch Detector, xem mục 2) |
| `probe_response` | Có | Câu trả lời của Learner cho 1 câu hỏi xác minh được AI sinh ra, hiệu chỉnh theo đúng level Learner tự nhận (xem mục 3) |
| `assessment_history` | Có điều kiện | `AssessmentResult`/`Evidence` lịch sử cho cùng `knowledge_node_id`, nếu Learner đã tương tác với node này trước đó (chỉ áp dụng cho Continuous Discovery, Capability #8 — Goal Clarification lần đầu không có lịch sử) |
| `knowledge_node_or_skill_label` | Có | Giống [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 3 — KnowledgeNode nếu đã có, text tự do nếu chưa |

## 2. Detection Logic

Detection xảy ra ở **2 bước tách biệt**, không gộp làm 1 lời gọi AI duy nhất (giữ đúng nguyên tắc "1 Capability = 1 trách nhiệm" đã dùng xuyên hệ thống):

**Bước 1 — Self-Report Extraction** *(thuộc Competency Probing, Capability #2, không phải Mismatch Detector)*: trích `self_reported_level` từ `raw_input` tự do của Learner, ánh xạ vào 1 trong 5 điểm của thang đo mục 0. Đây không phải "detection" — chỉ là đọc hiểu input.

**Bước 2 — Mismatch Comparison** *(Mismatch Detector, D7)*: so sánh `self_reported_level` với `observed_level` (kết quả của mục 3 Verification Logic). Quy tắc kích hoạt:

```
mismatch_found = |index(self_reported_level) − index(observed_level)| >= 1
```

Trong đó `index()` là vị trí trên thang đo mục 0 (Unknown=0 .. Teach=4). **Ngưỡng `>= 1` (chênh lệch tối thiểu 1 bậc) là đề xuất, chưa khóa** — có thể cần ngưỡng `>= 2` để giảm false positive (xem mục 7).

**Chiều lệch quan trọng hơn độ lớn ở Phase 1:**
- `self_reported_level > observed_level` ("overclaim") — Learner tự nhận cao hơn thực tế. Đây là trường hợp DECISION-007 mô tả gốc ("Tôi biết Docker" nhưng không xác minh được).
- `self_reported_level < observed_level` ("underclaim") — Learner tự nhận thấp hơn thực tế (ví dụ tự ti, hoặc dùng thuật ngữ khác). Quan trọng không kém về mặt cá nhân hóa (Roadmap có thể an toàn nhảy nhanh hơn) nhưng **rủi ro thấp hơn nếu bỏ qua** (worst case là Roadmap dạy lại điều đã biết, không gây hại như overclaim dẫn tới hổng kiến thức). Đề xuất: cả 2 chiều đều tạo `SelfAssessmentMismatch`, nhưng `reasoning` phải nêu rõ chiều lệch để tầng tiêu thụ (Recommendation Engine) xử lý khác nhau.

## 3. Verification Logic

**Cơ chế đề xuất: Calibrated Micro-Probe** — AI sinh 1 câu hỏi/bài tập nhỏ **hiệu chỉnh đúng theo level Learner tự nhận** (không phải câu hỏi chung chung):

| Self-reported level | Loại probe tương ứng |
|---|---|
| `Remember` | Câu hỏi định nghĩa/khái niệm cơ bản |
| `Explain` | Yêu cầu giải thích bằng lời, không chỉ định nghĩa |
| `Apply` | Bài tập nhỏ áp dụng thực tế (ví dụ: "viết 1 dòng lệnh Docker để...") |
| `Teach` | Yêu cầu Learner giải thích như đang dạy người khác, hoặc phản biện 1 phát biểu sai cố ý |

`observed_level` = mức cao nhất mà Learner **thực sự vượt qua được** trong chuỗi probe, không phải mức probe ban đầu được hỏi. Nếu Learner tự nhận `Apply` nhưng trả lời probe `Apply` sai, AI **không tự động kết luận `observed_level = Unknown`** — hạ 1 bậc xuống `Explain` để kiểm tra tiếp (tránh kết luận vội với 1 điểm dữ liệu duy nhất). Đây là 1 chuỗi adaptive ngắn (tối đa 2-3 probe liên tiếp cho 1 `CompetencySignal`, xem liên kết với Retry Limits ở [DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md)).

**Kết hợp `assessment_history` (nếu có):** nếu Continuous Discovery và đã có `AssessmentResult` cho cùng node, `observed_level` ưu tiên dùng dữ liệu lịch sử (đã qua Assessment Engine, đáng tin hơn 1 probe ngắn của Discovery) — probe chỉ bổ sung khi lịch sử quá cũ hoặc không đủ field tương ứng. Nguyên tắc Evidence-Based (không suy giảm theo thời gian, [DECISION-016](../11_Decisions/DECISION-016-Evidence-Based-Decay.md)) áp dụng tương tự ở đây: lịch sử không "hết hạn", chỉ bị "ghi đè" bởi tín hiệu mới hơn nếu có.

## 4. Confidence Calculation

**🔶 Chỉ chốt được hình dạng công thức, không chốt được số cụ thể** — vì `confidence` phụ thuộc cùng loại trọng số chưa có giá trị ở [OpenQuestions.md](../01_PRD/OpenQuestions.md) câu 13 (`evidence_weight`). Đề xuất hình dạng:

```
confidence = f(probe_count, signal_agreement, has_historical_evidence)
```

| Yếu tố | Ảnh hưởng |
|---|---|
| `probe_count` | Càng nhiều probe đồng nhất kết quả → confidence càng cao (nhưng giới hạn bởi Retry Limits) |
| `signal_agreement` | Probe hiện tại và `assessment_history` (nếu có) đồng thuận → confidence cao hơn 1 nguồn đơn lẻ |
| `has_historical_evidence` | Có `assessment_history` → cộng thêm confidence so với chỉ dựa probe đơn |

**Không đề xuất công thức số cụ thể (ví dụ trọng số 0.x)** ở tài liệu này — làm vậy sẽ tự trả lời câu 13 mà chưa có xác nhận, vi phạm [GOVERNANCE.md](../GOVERNANCE.md) mục 3. `confidence` trong Output Envelope ([DiscoveryAPIContract.md](../07_API/DiscoveryAPIContract.md) mục 1) dùng đúng hình dạng này nhưng giá trị thật chỉ tính được sau khi câu 13 đóng.

## 5. Auto-Adjust Boundaries

Trả lời trực tiếp đoạn 2 của câu 5 ("AI có quyền tự điều chỉnh độ khó/level ngay, hay phải hỏi lại"), bằng cách **tách theo phạm vi ảnh hưởng**, đối chiếu Human Control Boundary đã khóa ([AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md) mục 3):

| Phạm vi ảnh hưởng | Hành động AI được phép | Cần xác nhận? |
|---|---|---|
| **Trong-phiên (in-session)** — đổi độ khó probe tiếp theo trong cùng `DiscoverySession` | AI tự làm ngay, không chờ xác nhận | **Không** — khớp dòng đã khóa "Điều chỉnh độ khó/tốc độ gợi ý trong 1 Lesson" (Gap 1, mục 3 bảng Human Control Boundary), Discovery probe tiếp theo coi như tương đương 1 "Lesson" ngắn |
| **Ghi nhận mismatch** — tạo `SelfAssessmentMismatch` | AI tự làm, phải truy vết được (`traced_to[]`) | Không cần Learner xác nhận để *ghi nhận* — đây là quan sát nội bộ, không phải hành động thay đổi gì của Learner |
| **Ngoài-phiên (cross-domain)** — dùng mismatch để đề xuất đổi Roadmap, ghi đè `KnowledgeNodeMastery` | AI **không được tự làm** | **Có, bắt buộc** — Discovery không sở hữu `Roadmap`/`KnowledgeNodeMastery` ([DiscoveryDomain.md](DiscoveryDomain.md) mục 2); mọi hành động ngoài phạm vi Discovery phải đi qua Recommendation Engine (đề xuất) → Learner xác nhận, hoặc Roadmap Engine → `ApprovalRecord` |

**Kết luận đề xuất:** ranh giới "tự thích nghi" (nguyên tắc 4) áp dụng **chỉ trong phạm vi 1 `DiscoverySession`**; ranh giới "không tự sửa Roadmap" áp dụng **cho mọi thứ ngoài phạm vi đó** — không có vùng xám giữa 2 mức này theo thiết kế này.

## 6. Human Confirmation Requirements

| Sự kiện | `requires_confirmation` | Lý do |
|---|---|---|
| Ghi `SelfAssessmentMismatch` mới | `false` | Quan sát nội bộ, không phải hành động (mục 5) |
| Hiển thị mismatch cho Learner ở `DISCOVERY_COMPLETE` summary | N/A (không phải AI Decision — chỉ hiển thị dữ liệu đã có) | Theo nguyên tắc 7 ("AI được phản biện nhưng không ép buộc") — Learner **được xem** lý do (`reasoning`) và **được phản biện** (mục 7 False Positive), không bị ép chấp nhận |
| Recommendation Engine dùng mismatch để đề xuất hành động (ví dụ ôn lại) | `true` (đã khóa sẵn ở Capability #13, ngoài phạm vi Discovery) | Discovery chỉ là nguồn tín hiệu, không tự quyết |

Cập nhật so với giá trị tạm `true` mặc định ở [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 4 — đề xuất đổi thành `false` cho chính hành động "ghi nhận mismatch", theo lý giải mục 5-6 ở trên. **Đề xuất cập nhật, chưa tự sửa file đó** (xem mục Generated Documents trong báo cáo kèm theo).

## 7. False Positive Handling

"False Positive" = `mismatch_found = true` nhưng Learner thực sự có năng lực đúng như tự nhận (probe bị hiểu nhầm, Learner có ngày tệ, câu hỏi probe kém chất lượng).

**Không xóa/sửa bản ghi `SelfAssessmentMismatch` đã tạo** — giữ nguyên tính bất biến (immutable, mục 3 [DiscoveryDomain.md](DiscoveryDomain.md)). Thay vào đó:

1. **Learner có thể phản hồi trực tiếp** tại `DISCOVERY_COMPLETE` summary (hoặc ngay sau khi mismatch hiển thị) — phản hồi này tạo 1 `DiscoveryAnswer` mới gắn với 1 `DiscoveryQuestion` follow-up loại "phản biện mismatch" (🔶 chưa có trong [DiscoveryAPIContract.md](../07_API/DiscoveryAPIContract.md), đề xuất bổ sung — xem Risks).
2. Phản hồi này có thể trigger **1 `CompetencySignal` mới** (không sửa cái cũ) với `observed_level` cập nhật nếu probe lại cho kết quả khác — cùng cơ chế Continuous Discovery, không cần state machine mới.
3. **Không tự động "rút lại" mismatch cũ** — Recommendation Engine (ngoài phạm vi Discovery) là nơi quyết định có còn dùng mismatch cũ làm tín hiệu hay không, dựa trên việc có `CompetencySignal` mới hơn cho cùng node hay không (nguyên tắc Evidence-Based, không thời gian).

**Giảm tỷ lệ false positive ở nguồn:** ngưỡng `>= 1` bậc (mục 2) có thể quá nhạy — đề xuất Founder cân nhắc `>= 2` bậc làm ngưỡng kích hoạt mặc định, giữ `>= 1` bậc chỉ để log nội bộ (không tạo `SelfAssessmentMismatch` chính thức, chỉ giữ trong `CompetencySignal`). **Chưa chốt — đề xuất, cần xác nhận.**

## 8. False Negative Handling

"False Negative" = `mismatch_found = false` nhưng thực sự có sai lệch (probe quá dễ/không đại diện, Learner đoán đúng may mắn).

**Giới hạn cố hữu, không giải quyết triệt để được trong 1 `DiscoverySession`:** 1 probe ngắn (tối đa 2-3 câu, mục 3) là tín hiệu nhiễu — không đủ để loại trừ false negative hoàn toàn. Thiết kế Phase 1 **chấp nhận giới hạn này một cách tường minh**, không giả vờ giải quyết được, và dựa vào:

1. **Continuous Discovery (Capability #8)** — false negative ở 1 thời điểm có cơ hội được phát hiện lại sau, khi Learner tương tác nhiều hơn với cùng `knowledge_node` qua Teaching/Assessment thật (không chỉ Discovery probe) — `assessment_history` ở mục 1 ngày càng giàu hơn theo thời gian.
2. **Assessment Engine là nguồn xác thực mạnh hơn** — `AssessmentResult` (8 trường, [DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md)) đáng tin hơn 1 `CompetencySignal` của Discovery; nếu sau này Assessment Engine phát hiện sai lệch tương tự, đó là tín hiệu mạnh hơn, không phụ thuộc gì vào Discovery đã bỏ sót trước đó.

**Không đề xuất cơ chế "tăng độ nhạy" cụ thể nào ở Phase 1** (ví dụ ngẫu nhiên hóa độ khó probe) — đây là 1 hướng cải tiến khả dĩ, ghi vào Risks, không thiết kế chi tiết vì chưa có yêu cầu rõ từ brief.

## 9. Examples

### Ví dụ 1 — Overclaim cổ điển (Docker, theo đúng ví dụ gốc DECISION-007)

- `self_reported_level` = `Apply` ("Tôi biết Docker, tôi dùng hàng ngày").
- Probe (mục 3, loại `Apply`): "Viết 1 lệnh Docker để chạy 1 container Postgres, map port 5432 ra ngoài."
- Learner trả lời sai cú pháp cơ bản → hạ xuống probe `Explain`: "Giải thích sự khác biệt giữa `docker run` và `docker start`." → Learner trả lời mơ hồ, không phân biệt được.
- `observed_level` = `Remember` (chỉ dừng ở nhận biết tên lệnh).
- `mismatch_found = true` (chênh 2 bậc `Apply` → `Remember`), chiều **overclaim**.
- `reasoning`: "Learner tự nhận mức Apply nhưng không hoàn thành được bài tập Apply hoặc câu hỏi Explain liên quan — quan sát được ở mức Remember."
- `traced_to`: [`discovery_answer:<id của câu trả lời Apply probe>`, `discovery_answer:<id của câu trả lời Explain probe>`].

### Ví dụ 2 — Underclaim (đối lập)

- `self_reported_level` = `Remember` ("Tôi chỉ biết sương sương về React").
- Probe `Remember`: Learner trả lời đúng và mở rộng thêm — AI thử nâng lên probe `Apply`: "Viết 1 component React đơn giản dùng `useState`." → Learner làm đúng, gọn, đúng convention.
- `observed_level` = `Apply` (vượt xa mức tự nhận).
- `mismatch_found = true` (chênh 2 bậc), chiều **underclaim**.
- `reasoning`: "Learner tự nhận mức Remember nhưng hoàn thành tốt bài tập Apply — có thể đang khiêm tốn hoặc dùng thuật ngữ khác để tự đánh giá."

### Ví dụ 3 — Không mismatch (đúng như tự nhận)

- `self_reported_level` = `Explain`. Probe `Explain` đạt, thử nâng `Apply` không đạt hoàn toàn nhưng đạt 1 phần.
- `observed_level` = `Explain` (probe `Apply` không đủ rõ để nâng bậc — giữ nguyên theo nguyên tắc "không kết luận vội", mục 3).
- `mismatch_found = false` — không tạo `SelfAssessmentMismatch`, chỉ lưu `CompetencySignal`.

## 10. Risks

1. **Ngưỡng kích hoạt (`>= 1` bậc) chưa được Founder duyệt** — đề xuất `>= 2` làm mặc định để giảm false positive (mục 7), chưa chốt.
2. **Công thức `confidence` chỉ có hình dạng, không có số** — phụ thuộc câu 13 (`evidence_weight`), chặn việc triển khai thật dù thiết kế logic đã đủ.
3. **"Phản biện mismatch" (mục 7) chưa có endpoint trong `DiscoveryAPIContract.md`** — đề xuất bổ sung 1 luồng follow-up, chưa thiết kế chi tiết request/response.
4. **2-3 probe liên tiếp mỗi `CompetencySignal` chưa đối chiếu với Retry Limits** — xem [DiscoveryCompletionCriteria.md](DiscoveryCompletionCriteria.md) mục 5, cần đảm bảo 2 cơ chế không xung đột (probe chain nội bộ 1 signal vs retry limit toàn phiên).
