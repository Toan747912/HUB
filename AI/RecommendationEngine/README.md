# Recommendation Engine

✅ **Status: Accepted (Locked) theo [DECISION-019](../../Docs/11_Decisions/DECISION-019-Recommendation-Engine.md), Round 3.** Founder/Lead Architect đã xác nhận khuyến nghị của Claude dưới đây: Recommendation Engine là Capability #13 độc lập, phạm vi thu hẹp (chỉ tổng hợp tín hiệu, không tự thực thi). Phân tích gốc (Round 2) được giữ lại nguyên văn dưới đây làm hồ sơ lý do quyết định.

## Phân tích

Với Evidence Engine và Knowledge Engine mới (Round 2), hệ thống giờ có nhiều **nguồn tín hiệu** rời rạc về việc Learner nên làm gì tiếp theo:

- Knowledge Regression (Evidence Engine) → có Knowledge Node nào tụt mastery, có thể cần ôn lại.
- SelfAssessmentMismatch (Discovery Engine) → có vùng tự đánh giá sai cần làm rõ lại.
- Knowledge Node chưa mở rộng nhưng Roadmap Node đang active phụ thuộc nó ở mức sâu hơn (Knowledge Engine) → có thể cần học thêm trước khi tiếp tục.
- Roadmap Critique (đã có) → cảnh báo ở mức cấu trúc Roadmap, không phải ở mức "nên ôn khái niệm gì".

**Không có Capability nào hiện tại sở hữu việc tổng hợp các tín hiệu rời rạc này thành một gợi ý hành động cụ thể cho Learner** (ví dụ: "trước khi học OAuth, nên ôn lại Refresh Token Rotation — bạn vừa trả lời sai 2 lần").

## 2 lựa chọn

**A — Recommendation Engine là Capability độc lập.**
- Ưu điểm: tách trách nhiệm rõ — Knowledge Engine trả lời "trạng thái graph là gì", Evidence Engine trả lời "bằng chứng nào vừa xuất hiện", Recommendation Engine trả lời "vậy nên làm gì tiếp theo". Tránh các Engine khác phải tự nhúng logic gợi ý riêng (trùng lặp khi có thêm nguồn tín hiệu mới trong tương lai — ví dụ Analytics sau này). Khớp với việc thư mục `AI/RecommendationEngine/` đã tồn tại sẵn trong kiến trúc workspace (DECISION-014).
- Nhược điểm: thêm 1 lớp gọi AI nữa (chi phí/độ trễ), cần Output Envelope + Context System riêng.

**B — Gộp vào Capability đã có** (mở rộng Roadmap Critique để bao gồm cả gợi ý ôn tập, hoặc để Teaching Engine tự đọc Evidence/Knowledge signal khi bắt đầu mỗi session).
- Ưu điểm: ít capability hơn, ít chi phí gọi AI hơn.
- Nhược điểm: Roadmap Critique vốn được định nghĩa ở tầng cấu trúc Roadmap (DECISION-006), trộn thêm "gợi ý ôn tập khái niệm" vào sẽ làm nó vừa lo cấu trúc vừa lo nội dung — vi phạm single-responsibility đã thấy có giá trị ở các Capability khác.

## Khuyến nghị

**Chọn A — giữ Recommendation Engine là Capability độc lập**, với phạm vi thu hẹp rõ: nó **chỉ tổng hợp tín hiệu thành gợi ý**, luôn ở dạng đề xuất (không tự áp dụng), và giao lại hành động cụ thể cho Capability khác thực thi:
- Nếu gợi ý là "ôn lại Knowledge Node X" → giao cho Teaching Engine.
- Nếu gợi ý ngụ ý thay đổi cấu trúc Roadmap → giao cho Roadmap Critique (vẫn cần Learner phê duyệt theo DECISION-006, Recommendation Engine không bỏ qua Roadmap Governance).

Điều này giữ nguyên mọi Human Control Boundary đã khóa — Recommendation Engine không có quyền tự sửa gì cả, chỉ là "lớp tổng hợp tín hiệu".

**Cần Founder/ChatGPT xác nhận trước khi chính thức thêm Capability #13 vào AI Architecture** — chưa thêm vào [AIArchitecture_Draft.md](../../Docs/04_AI_Architecture/AIArchitecture_Draft.md) trong vòng này vì đây là khuyến nghị, chưa là quyết định.
