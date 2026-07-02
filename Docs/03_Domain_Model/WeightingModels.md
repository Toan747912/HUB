# Weighting Models for Teach Capability and Evidence Assessment

Tài liệu này thiết kế chi tiết 3 mô hình trọng số ứng viên để giải quyết **Open Question 12 (OQ12)** về trọng số các sub-capability của Teach và **Open Question 13 (OQ13)** về công thức/kiểu dữ liệu của `evidence_weight` nhằm phục vụ việc tính toán Mastery Score và kích hoạt Knowledge Regression.

---

## 1. Mô hình A: Equal Weight (Mô hình Trọng số Đồng đều)

### Chi tiết Thiết kế
- **OQ12 (`capability_weight` cho Teach)**:
  Cả 5 sub-capability của Teach (Explain, Simplify, Guide, Review, Transfer Knowledge) đóng góp ngang nhau vào điểm số tổng hợp:
  $$capability\_weight = 0.20 \text{ (20\%) cho mỗi sub-capability}$$
  $$Score_{Teach} = 0.2 \times (S_{Explain} + S_{Simplify} + S_{Guide} + S_{Review} + S_{Transfer})$$

- **OQ13 (`evidence_weight` cho Evidence)**:
  Trọng số cố định theo loại nguồn dữ liệu (Source Type), không phụ thuộc vào ngữ cảnh hay đánh giá của AI:
  - Dự án thực tế/Test lớn: `1.0`
  - Bài tập thực hành/Lab: `0.7`
  - Probe câu hỏi ngắn: `0.4`
  - Quan sát hội thoại/NLP chat: `0.2`
  - Công thức tính: $evidence\_weight = BaselineSourceWeight$ (Lưu dạng số thập phân `numeric(3,2)`).
  - Ngưỡng kích hoạt Regression: Tổng trọng số Negative Evidence lũy kế vượt quá **`1.0`** (ví dụ: chỉ cần 1 Test hỏng hoặc 3 Probe hỏng).

### Đánh giá các tiêu chí
- **Fairness (Công bằng)**: **Trung bình**. Xem mọi khả năng trong Teach có giá trị ngang nhau, điều này có thể không công bằng với những người học có khả năng giải thích tốt (`Explain`) nhưng chưa thành thạo kỹ năng hướng dẫn người khác (`Guide`).
- **Explainability (Khả năng giải thích)**: **Cực kỳ cao**. Công thức tính toán tuyến tính, đơn giản, minh bạch. Bất kỳ câu lệnh SQL hoặc giải thích AI nào cũng có thể diễn giải chính xác điểm số thay đổi như thế nào.
- **Robustness (Độ bền vững)**: **Thấp**. Hệ thống dễ bị ảnh hưởng bởi nhiễu (ví dụ: người học làm sai 2 câu probe do hiểu lầm đề bài, tích lũy đủ $0.4 \times 2 = 0.8$ cộng thêm một câu chat sai $0.2$ lập tức kích hoạt Regression oan uổng).
- **AI Compatibility (Tương thích AI)**: **Cực kỳ tốt**. Không đòi hỏi AI phải tính toán gì thêm ngoài việc trích xuất điểm pass/fail thô. Rất dễ lưu trữ và truy vấn trong database.

---

## 2. Mô hình B: Progressive Weight (Mô hình Trọng số Lũy tiến - Đề xuất)

### Chi tiết Thiết kế
- **OQ12 (`capability_weight` cho Teach)**:
  Phân bổ trọng số tăng dần dựa theo độ khó nhận thức (Bloom's Taxonomy). Hướng dẫn (`Guide`), đánh giá (`Review`) và chuyển giao kiến thức (`Transfer`) đòi hỏi tư duy bậc cao hơn nên chiếm tỷ trọng lớn hơn:
  - `Explain`: **0.10 (10%)**
  - `Simplify`: **0.15 (15%)**
  - `Guide`: **0.25 (25%)**
  - `Review`: **0.25 (25%)**
  - `Transfer Knowledge`: **0.25 (25%)**
  $$Score_{Teach} = 0.10 \times S_{Explain} + 0.15 \times S_{Simplify} + 0.25 \times (S_{Guide} + S_{Review} + S_{Transfer})$$

- **OQ13 (`evidence_weight` cho Evidence)**:
  Trọng số là tích của Trọng số nguồn (`SourceWeight`) và Điểm tin cậy của AI (`AI_Confidence`) trích xuất từ chất lượng câu trả lời:
  $$evidence\_weight = SourceWeight \times AI\_Confidence$$
  - `SourceWeight` cố định: Test = `1.0`, Lab = `0.8`, Probe = `0.5`, Chat = `0.3`.
  - `AI_Confidence` động (0.0 đến 1.0): AI đánh giá câu trả lời của người học (độ dài, tính logic, sự mạch lạc, lỗi chính tả/cú pháp). Nếu câu trả lời quá ngắn hoặc mơ hồ, `AI_Confidence` sẽ thấp (ví dụ: `0.3`), làm giảm trọng số của evidence này để tránh gây nhiễu hệ thống.
  - Ngưỡng kích hoạt Regression: Tổng trọng số Negative Evidence lũy kế vượt quá **`1.5`**.

### Đánh giá các tiêu chí
- **Fairness (Công bằng)**: **Rất cao**. Phản ánh chính xác rằng năng lực dạy học không chỉ là nói lại kiến thức (`Explain`) mà là khả năng phản biện và chuyển giao. Bảo vệ người học khỏi việc bị Regression chỉ vì một câu trả lời mơ hồ.
- **Explainability (Khả năng giải thích)**: **Tốt**. Vẫn là mô hình công thức toán học tường minh, có thể giải thích chi tiết (ví dụ: *"Bạn bị hạ bậc vì có 2 Negative Evidence từ bài thực hành với độ tin cậy đánh giá cao từ AI"*). Khớp hoàn hảo với `reasoning` của DECISION-048.
- **Robustness (Độ bền vững)**: **Cao**. Độ nhiễu được lọc qua bộ nhân `AI_Confidence`. Những evidence mơ hồ sẽ có trọng số rất nhỏ, không thể tự kích hoạt Regression nếu không có một chuỗi thất bại thực tế.
- **AI Compatibility (Tương thích AI)**: **Tốt**. API của AI Engine chỉ cần trả ra thêm một trường `confidence` (số thập phân) cùng với kết quả đánh giá. Database lưu trữ 2 trường: `source_weight` và `confidence` để tính toán động hoặc lưu kết quả nhân sẵn.

---

## 3. Mô hình C: Evidence Dominant (Mô hình Bằng chứng Áp đảo)

### Chi tiết Thiết kế
- **OQ12 (`capability_weight` cho Teach)**:
  Mô hình trọng số động dựa trên độ bao phủ của bằng chứng. Nếu người học có bằng chứng trực tiếp cho sub-capability cao nhất (`Transfer Knowledge`), trọng số của nó sẽ áp đảo hoàn toàn các phần còn lại:
  - Nếu có bằng chứng `Transfer Knowledge` (Đạt): Trọng số của `Transfer` tự động tăng lên **0.50 (50%)**, 4 phần còn lại chia đều mỗi phần 12.5%.
  - Nếu chưa đánh giá `Transfer Knowledge`: Trọng số phân bổ đều theo mô hình Progressive (Mô hình B).

- **OQ13 (`evidence_weight` cho Evidence)**:
  Áp dụng quy tắc "Bằng chứng áp đảo" (Dominant override). Một bằng chứng tiêu cực mạnh (Negative Evidence có chất lượng cao và từ nguồn kiểm thử trực tiếp) sẽ ngay lập tức phủ quyết (override) mọi bằng chứng tích cực trước đó, không cần lũy kế điểm số:
  - Nếu xuất hiện 1 Negative Evidence từ nguồn `Test` hoặc `Lab` với `AI_Confidence > 0.8`: `evidence_weight` được set vô hạn (hoặc kích hoạt Regression trực tiếp, bỏ qua mọi Positive Evidence lũy kế).
  - Ngược lại, các bằng chứng từ Probe/Chat thông thường vẫn cộng dồn với ngưỡng Regression là `1.2`.

### Đánh giá các tiêu chí
- **Fairness (Công bằng)**: **Trung bình**. Rất tốt cho việc kiểm soát hổng kiến thức nghiêm trọng, nhưng có thể quá khắt khe đối với người học khi một lỗi sơ suất trong kỳ thi lớn xóa sạch mọi thành quả tự học/tích lũy tích cực trước đó.
- **Explainability (Khả năng giải thích)**: **Phức tạp**. Việc giải thích thay đổi điểm số đòi hỏi logic rẽ nhánh có điều kiện (conditional logic) thay vì công thức tuyến tính (ví dụ: *"Bạn bị Regression vì bài kiểm tra X là bằng chứng áp đảo phủ quyết toàn bộ quá trình học tập"*), có thể gây cảm giác độc đoán từ phía AI.
- **Robustness (Độ bền vững)**: **Trung bình**. Rất nhạy bén với các lỗi nghiêm trọng, nhưng cực kỳ kém bền vững trước rủi ro người học gặp "ngày tồi tệ" khi làm bài test lớn.
- **AI Compatibility (Tương thích AI)**: **Khó cài đặt hơn**. Đòi hỏi các logic nghiệp vụ phức tạp ở tầng Application (chứ không chỉ ở Database SQL queries) để xử lý các điều kiện override và thay đổi trọng số động.

---

## 4. Ma trận so sánh các mô hình trọng số

| Tiêu chí | Model A: Equal Weight | Model B: Progressive Weight (Recommended) | Model C: Evidence Dominant |
| :--- | :--- | :--- | :--- |
| **Tính công bằng (Fairness)** | Trung bình | **Rất cao** | Trung bình |
| **Khả năng giải thích (Explainability)** | Rất dễ | **Tốt (đáp ứng DECISION-048)** | Phức tạp, dễ gây tranh cãi |
| **Độ bền vững trước nhiễu (Robustness)** | Thấp | **Cao** | Trung bình |
| **Tương thích AI & Database** | Cực kỳ tốt | **Tốt** | Khó cài đặt hơn |
| **Tính phù hợp với Bloom's Taxonomy** | Không | **Có (tương thích sâu sắc)** | Chỉ tập trung vào đỉnh Bloom |

---

## 5. Đề xuất Lựa chọn Triển khai

Khuyến nghị Founder phê duyệt **Model B (Progressive Weight)** làm Decision khóa cho OQ12 & OQ13 vì:
1. **Khớp với triết lý Giáo dục**: Phản ánh đúng độ khó thực sự của 5 sub-capability của Teach.
2. **Kháng nhiễu tốt**: Việc nhân thêm điểm số tin cậy của AI (`AI_Confidence`) đảm bảo các lỗi chính tả, câu trả lời cụt lủn không vô tình kích hoạt Knowledge Regression.
3. **Phù hợp với Database Design**: Cấu trúc bảng `competency_signal` và `assessment_result` hiện tại có thể lưu trữ trực tiếp các trường số này một cách dễ dàng, hỗ trợ viết các câu lệnh SQL tính toán Mastery Score tường minh.
