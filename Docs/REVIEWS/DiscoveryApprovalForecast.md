# Discovery Approval Forecast

Tài liệu này dự báo và tính toán lại điểm số sẵn sàng phê duyệt thiết kế của Discovery Engine (Discovery Readiness Score) dưới ba kịch bản giả định khác nhau nhằm giúp Founder và Lead Architect đưa ra lộ trình tối ưu trước khi bước vào Code Phase.

Điểm số xuất phát hiện tại là **58/100** (Phán quyết: **NO**), đánh giá bởi [DiscoveryReadinessReview.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/REVIEWS/DiscoveryReadinessReview.md).

---

## 1. Tóm tắt Điểm số qua các Kịch bản

| Hạng mục đánh giá | Điểm tối đa | Hiện tại (Baseline) | Kịch bản A (Chỉ chốt OQ5) | Kịch bản B (OQ5 + OQ12) | Kịch bản C (OQ5 + OQ12 + OQ13) | Kịch bản C + Đồng bộ Kỹ thuật (Mục tiêu) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Domain Model completeness** | 20 | 14 | 16 | 17 | 18 | 20 |
| **Persistence/Schema completeness** | 20 | 10 | 10 | 10 | 14 | 20 |
| **API/Contract completeness** | 20 | 11 | 11 | 11 | 11 | 19 |
| **Explainability/Governance** | 20 | 17 | 17 | 18 | 18 | 20 |
| **Open Question resolution** | 20 | 6 | 11 | 15 | 18 | 20 |
| **TỔNG ĐIỂM** | **100** | **58/100** | **65/100** | **71/100** | **79/100** | **99/100** |
| **Phán quyết phê duyệt** | - | **NO** | **NO** | **NO** | **YES (Có điều kiện)** | **YES** |

---

## 2. Chi tiết từng Kịch bản

### Kịch bản A: Chỉ giải quyết OQ5 (Cơ chế SelfAssessmentMismatch)
*Giả định: Founder chính thức phê duyệt phương án **Option B (Balanced)** cho OQ5.*

- **Sự thay đổi về điểm số**:
  - **Open Question resolution**: $+5$ điểm (từ 6 lên 11). OQ5 là câu hỏi mở cốt lõi của Discovery, việc đóng câu này giải quyết 50% sự mơ hồ ở lớp nghiệp vụ.
  - **Domain Model completeness**: $+2$ điểm (từ 14 lên 16). Việc xác định rõ ngưỡng mismatch và cơ chế verify probe giúp hoàn thiện thiết kế logic của thực thể `SelfAssessmentMismatch`.
- **Tổng điểm mới**: **65/100**
- **Phán quyết**: **NO**
- **Lý do**: Hệ thống vẫn bị chặn bởi OQ12 & OQ13 (không thể tính toán độ tin cậy thực tế và logic Regression). Đồng thời, mâu thuẫn schema vật lý và thiếu API endpoints vẫn chưa được xử lý.

---

### Kịch bản B: Giải quyết OQ5 + OQ12 (Sub-capability weights cho Teach)
*Giả định: Kịch bản A + Founder phê duyệt mô hình trọng số lũy tiến **Model B (Progressive)** cho OQ12.*

- **Sự thay đổi về điểm số**:
  - **Open Question resolution**: $+4$ điểm (từ 11 lên 15).
  - **Domain Model completeness**: $+1$ điểm (từ 16 lên 17). Công thức tính toán điểm Teach Composite Mastery được định lượng rõ ràng, khép kín logic của Mastery Model.
  - **Explainability/Governance**: $+1$ điểm (từ 17 lên 18). Việc công khai trọng số của Teach giúp tăng tính minh bạch của các quyết định AI.
- **Tổng điểm mới**: **71/100**
- **Phán quyết**: **NO**
- **Lý do**: Mặc dù đã vượt qua ngưỡng trung bình (70 điểm), hệ thống vẫn bị chặn bởi OQ13 (`evidence_weight` cho Regression). Không có OQ13, cơ chế Regression của Evidence Engine không thể hoạt động.

---

### Kịch bản C: Giải quyết OQ5 + OQ12 + OQ13 (Toàn bộ các Open Questions lớn)
*Giả định: Kịch bản B + Founder phê duyệt công thức tích của **Model B (Progressive)** cho OQ13.*

- **Sự thay đổi về điểm số**:
  - **Open Question resolution**: $+3$ điểm (từ 15 lên 18). Cả ba câu hỏi lớn của Discovery được đóng hoàn toàn. (2 điểm còn thiếu thuộc về các câu hỏi nhỏ như chính sách concurrency BLK-DOM-01).
  - **Domain Model completeness**: $+1$ điểm (từ 17 lên 18). Khép kín toàn bộ logic nghiệp vụ Discovery và Assessment.
  - **Persistence/Schema completeness**: $+4$ điểm (từ 10 lên 14). Với việc định lượng được `evidence_weight`, thiết kế logic của bảng `competency_signal` và `evidence` đã hoàn tất về mặt khái niệm.
- **Tổng điểm mới**: **79/100**
- **Phán quyết**: **YES (Có điều kiện)**
- **Điều kiện mở khóa Code Phase**:
  - Điểm số 79/100 phản ánh thiết kế logic đã hoàn toàn chín muồi và không còn bất kỳ "giả định mơ hồ" nào.
  - Tuy nhiên, dự án vẫn bị chặn kỹ thuật bởi các rào cản vật lý: mâu thuẫn schema chưa sửa trong SQL file (BLK-SCHEMA-01) và thiếu API endpoints (BLK-API-01). Hệ thống chỉ có thể vào Code Phase sau khi thực hiện đồng bộ kỹ thuật các file này (Phase B và Phase C của lộ trình tháo gỡ).

---

## 3. Lộ trình Đồng bộ Kỹ thuật để đạt điểm tối đa (99/100)

Sau khi Founder chốt các quyết định ở Kịch bản C, việc thực hiện các bước kỹ thuật sau sẽ đưa điểm số lên **99/100**:

1. **Đồng bộ Domain (BLK-DEP-01)**: Đưa `ClaimedSkillArea` ngược về Aggregate Root của [DiscoveryDomain.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/DiscoveryDomain.md) ($+2$ điểm Domain completeness $\rightarrow 20/20$).
2. **Reconcile SQL Schema (BLK-SCHEMA-01)**: Sửa file `DiscoverySchema_Draft.sql` theo đúng mô tả của persistence strategy ($+6$ điểm Persistence completeness $\rightarrow 20/20$).
3. **Cập nhật Hợp đồng API & Prompts (BLK-API-01, BLK-DEP-02, BLK-DEP-03)**:
   - Thêm các endpoint `abandon`, `contest` và idempotency vào API Contract.
   - Cập nhật Canonical Output Contract Layer 2 & 3 cho `EXPIRED` & `ABANDONED`.
   - Sửa Prompt input contract theo `claimed_skill_area_id`.
   - ($+8$ điểm API completeness $\rightarrow 19/20$, trừ 1 điểm nhỏ cho Idempotency testing).
4. **Giải quyết Concurrency Policy (BLK-DOM-01)**: Đóng câu hỏi về đa phiên hoạt động ($+2$ điểm Open Question $\rightarrow 20/20$ và $+2$ điểm Explainability $\rightarrow 20/20$).

Khi hoàn thành toàn bộ lộ trình trên, Discovery Phase sẽ đạt trạng thái **READY** tuyệt đối để lập trình viên bắt đầu viết code mà không lo sợ rủi ro rework thiết kế.
