# OQ5 Alternative Solutions: Self-Assessment Mismatch Mechanism

Tài liệu này thiết kế chi tiết 3 phương án giải quyết cho **Open Question 5 (OQ5)** về cơ chế xác minh và phát hiện sự sai lệch giữa năng lực tự khai báo của người học (`self_reported_level`) và năng lực quan sát thực tế (`observed_level`), theo yêu cầu của sprint chốt thiết kế Discovery.

---

## 1. Phương án A: Conservative (Tiếp cận Cận trọng)

Phương án này ưu tiên giảm thiểu tối đa sự can thiệp sai của AI, tránh gây ức chế cho người học bằng cách chỉ kích hoạt cảnh báo mismatch khi có bằng chứng cực kỳ rõ ràng.

### Detection Logic
- **Ngưỡng kích hoạt**: Chỉ tạo thực thể `SelfAssessmentMismatch` khi chênh lệch tuyệt đối giữa tự khai báo và quan sát thực tế **lớn hơn hoặc bằng 2 bậc** trên thang đo 5 điểm (`Unknown` = 0, `Remember` = 1, `Explain` = 2, `Apply` = 3, `Teach` = 4).
  $$\Delta = |index(self\_reported\_level) - index(observed\_level)| \ge 2$$
- **Chiều lệch**: Chỉ ghi nhận chiều **Overclaim** (tự nhận cao hơn thực tế). Chiều **Underclaim** (tự nhận thấp hơn thực tế) bị bỏ qua hoàn toàn, coi như người học muốn học lại từ đầu một cách tự nguyện.
- Sai lệch 1 bậc chỉ được ghi nhận âm thầm trong `CompetencySignal` để tham chiếu, không kích hoạt mismatch.

### Confidence Logic
- Độ tin cậy (`confidence`) tính toán cực kỳ khắt khe:
  $$confidence = 0.5 + (0.4 \times \text{is\_consistent}) + (0.1 \times \text{has\_history})$$
  - `is_consistent` (boolean): `true` nếu người học trả lời nhất quán trên ít nhất 2 câu hỏi probe khác nhau cho cùng một vùng kiến thức.
  - `has_history` (boolean): `true` nếu có dữ liệu lịch sử bổ trợ đáng tin cậy từ `AssessmentResult`.
- Nếu chỉ probe 1 câu hỏi duy nhất, độ tin cậy mặc định tối đa là `0.5`, không đủ để kích hoạt mismatch nếu không đạt độ lệch $\ge 2$ bậc.

### Risks & Impacts
- **False Positive Risk (Dương tính giả)**: **Cực kỳ thấp**. Rất hiếm khi một người học bị phân loại nhầm là mismatch vì khoảng cách 2 bậc (ví dụ: tự nhận làm được `Apply` nhưng thực tế không đạt cả mức `Remember`) là quá rõ ràng.
- **False Negative Risk (Âm tính giả)**: **Rất cao**. Bỏ sót nhiều trường hợp overclaim 1 bậc (ví dụ: tự nhận viết được code `Apply` nhưng thực tế chỉ dừng lại ở giải thích khái niệm `Explain`). Người học có thể bị đưa vào lộ trình học quá khó và dễ nản lòng.
- **Implementation Complexity**: **Thấp**. Logic đơn giản, chỉ cần sinh 1 câu hỏi probe tương ứng với level tự nhận, nếu sai thì hạ nhanh 2 bậc để kiểm tra khái niệm cơ bản.
- **Explainability Impact**: **Rõ ràng và dễ chấp nhận**. Do khoảng cách năng lực lớn, AI có thể đưa ra giải thích rất thuyết phục (ví dụ: *"Bạn tự nhận có khả năng cấu hình Docker nâng cao nhưng chưa nắm được khái niệm Docker Image là gì"*).

---

## 2. Phương án B: Balanced (Tiếp cận Cân bằng - Đề xuất)

Phương án này dung hòa giữa độ nhạy phát hiện và độ tin cậy của hệ thống, sử dụng cơ chế rẽ nhánh adaptive ngắn để kiểm chứng các trường hợp nghi ngờ.

### Detection Logic
- **Ngưỡng kích hoạt**:
  - Tự động kích hoạt khi chênh lệch **$\ge 2$ bậc**.
  - Nếu chênh lệch **bằng 1 bậc**, hệ thống không tạo mismatch ngay mà sinh thêm **1 câu hỏi probe xác thực (verification probe)**. Nếu câu hỏi thứ hai này vẫn xác nhận độ lệch, mismatch mới được tạo.
- **Chiều lệch**: Ghi nhận cả hai chiều:
  - **Overclaim**: Tạo mismatch với trạng thái `active` để gửi tín hiệu cho Recommendation Engine đề xuất ôn tập/hạ level học.
  - **Underclaim**: Tạo mismatch với trạng thái `passive` (chỉ ghi log) giúp Recommendation Engine đề xuất học vượt nếu người học chứng minh năng lực thực tế cao hơn tự nhận.

### Confidence Logic
- Công thức tính toán dựa trên tính nhất quán của chuỗi probe và độ tin cậy của loại probe:
  $$confidence = (AgreementRatio \times 0.6) + (ProbeQualityWeight \times 0.2) + (HistoricalWeight \times 0.2)$$
  - `AgreementRatio`: Số probe đạt kết quả đồng thuận / Tổng số probe đã thực hiện (tối đa 3).
  - `ProbeQualityWeight`: Trọng số chất lượng câu hỏi (ví dụ: câu hỏi thực hành code `Apply` có trọng số cao hơn câu hỏi trắc nghiệm `Remember`).
  - `HistoricalWeight`: Điểm cộng nếu khớp với xu hướng đánh giá lịch sử.

### Risks & Impacts
- **False Positive Risk (Dương tính giả)**: **Thấp - Trung bình**. Việc sử dụng probe kiểm chứng thứ hai (khi lệch 1 bậc) giúp loại bỏ hầu hết các trường hợp người học trả lời sai do sơ suất hoặc hiểu lầm đề bài.
- **False Negative Risk (Âm tính giả)**: **Thấp**. Phát hiện kịp thời hầu hết các lệch lạc về mặt nhận thức để điều chỉnh lộ trình học phù hợp.
- **Implementation Complexity**: **Trung bình**. Đòi hỏi Session Orchestrator của Discovery Engine hỗ trợ luồng câu hỏi thích ứng (adaptive branching) ngắn trong phiên (sinh câu hỏi tiếp theo dựa trên kết quả câu hỏi trước).
- **Explainability Impact**: **Rất tốt**. Cung cấp đầy đủ chuỗi bằng chứng (`traced_to` chỉ tới ít nhất 2 câu trả lời cụ thể của người học) giúp người học hiểu rõ tại sao hệ thống đưa ra nhận định đó.

---

## 3. Phương án C: Aggressive (Tiếp cận Chủ động/Nhạy bén)

Phương án này ưu tiên phát hiện sớm nhất mọi rủi ro hổng kiến thức của người học, phản ứng ngay lập tức với bất kỳ tín hiệu sai lệch nào.

### Detection Logic
- **Ngưỡng kích hoạt**: Kích hoạt lập tức thực thể `SelfAssessmentMismatch` cho bất kỳ sai lệch nào **$\ge 1$ bậc** ở cả hai chiều ngay từ câu hỏi probe đầu tiên.
- Không sử dụng câu hỏi kiểm chứng bổ sung để tiết kiệm thời gian phiên Discovery.
- Mọi mismatch lập tức kích hoạt điều chỉnh nóng (hot adjustment) cấu trúc Roadmap mà không cần chờ tích lũy thêm bằng chứng.

### Confidence Logic
- Độ tin cậy mặc định ở mức cao dựa trên giả định AI có khả năng đánh giá chính xác chỉ qua một câu trả lời:
  $$confidence = 1.0 - (0.2 \times \text{ambiguity\_score})$$
  - `ambiguity_score` (0.0 to 1.0): Điểm số đánh giá mức độ mơ hồ trong câu trả lời NLP của người học do AI trích xuất.

### Risks & Impacts
- **False Positive Risk (Dương tính giả)**: **Rất cao**. Một câu trả lời vội vã, sai chính tả hoặc lỗi định dạng của người học có thể khiến AI kết luận là mismatch và hạ bậc lộ trình học một cách oan uổng.
- **False Negative Risk (Âm tính giả)**: **Cực kỳ thấp**. Gần như không bỏ sót bất kỳ lỗ hổng kiến thức nào của người học.
- **Implementation Complexity**: **Cao**. Do hệ thống phản ứng quá nhạy, Roadmap và Recommendation Engine sẽ liên tục nhận các tín hiệu mismatch dao động, dễ dẫn đến trạng thái lộ trình học không ổn định (chao đảo giữa nâng và hạ bậc liên tục).
- **Explainability Impact**: **Kém thuyết phục và dễ gây tranh cãi**. Người học dễ cảm thấy bị AI "bắt bẻ" oan uổng chỉ qua một lỗi nhỏ, dẫn tới việc họ liên tục sử dụng tính năng phản biện (contest mismatch), làm tăng tải xử lý và giảm trải nghiệm người dùng.

---

## 4. Ma trận so sánh các phương án (Comparison Matrix)

| Tiêu chí so sánh | Option A: Conservative | Option B: Balanced (Recommended) | Option C: Aggressive |
| :--- | :--- | :--- | :--- |
| **Độ nhạy phát hiện** | Thấp | **Trung bình - Cao** | Cực kỳ cao |
| **Tỷ lệ Dương tính giả (FP)** | Cực kỳ thấp (< 5%) | **Thấp (< 10%)** | Rất cao (> 25%) |
| **Tỷ lệ Âm tính giả (FN)** | Cao (> 30%) | **Thấp (< 10%)** | Cực kỳ thấp (< 2%) |
| **Số câu hỏi probe trung bình/vùng** | 1 - 2 câu | **2 - 3 câu** | 1 câu |
| **Độ phức tạp cài đặt** | Thấp | **Trung bình** | Cao |
| **Mức độ hài lòng của người học** | Trung bình (lộ trình có thể hơi khó) | **Cao (chính xác và công bằng)** | Thấp (cảm giác bị đánh giá khắt khe) |
| **Khả năng giải thích lý do (Explainability)**| Rất dễ giải thích | **Đầy đủ bằng chứng cụ thể** | Khó thuyết phục, dễ bị phản biện |

---

## 5. Khuyến nghị và Đề xuất triển khai

Đề xuất Founder chọn **Option B (Balanced)** vì các lý do sau:
1. **Tuân thủ DECISION-048 (Explainability-First)**: Hỗ trợ tạo chuỗi bằng chứng truy vết rõ ràng, giúp người học tin tưởng vào nhận định của AI.
2. **Bảo vệ Trải nghiệm Người học (Nguyên tắc 6)**: Sử dụng probe kiểm chứng thứ hai giúp bảo vệ người học khỏi việc bị hạ bậc oan uổng do lỗi vô tình, đồng thời giữ số lượng câu hỏi trong phiên Discovery ở mức ngắn gọn (tổng cộng dưới 15 câu).
3. **Tính ổn định của Hệ thống**: Cung cấp tín hiệu chất lượng cao, có chọn lọc cho Recommendation Engine, tránh gây xáo trộn liên tục cho Roadmap.
