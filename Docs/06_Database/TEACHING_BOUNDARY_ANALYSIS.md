# Teaching Boundary Analysis (Round 3.9)

> Phạm vi: phân tích kiến trúc, không tạo entity/bảng/SQL/API/Frontend, không chốt quyết định. Tách riêng 3 decision đang gộp dưới "Teaching Engine" ([AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), D1/D8/D9) để trả lời câu hỏi gốc: Teaching là 1 Domain, hay là 1 Capability điều phối nhiều Domain?

---

## 1. Content Selection (D1)

| Thuộc tính | Giá trị | Phân tích |
|---|---|---|
| **Decision Type** | Selection — chọn 1 KnowledgeNode/nội dung cụ thể trong số nhiều khả năng hợp lệ | Không thay đổi từ Round 3.7/3.8 |
| **Domain Owner** | **Không có Domain nào thực sự sở hữu decision này** | Decision đọc từ 3 domain khác (Goal & Roadmap, Knowledge Graph, Assessment) nhưng **không ghi vào bất kỳ Aggregate nào** — không có Aggregate Root của riêng nó (khác Mode Selection, xem mục 2). Gán "Mentor Interaction" ở Round 3.7/3.8 là gán theo **nơi decision diễn ra** (trong `SubSession`), không phải theo **dữ liệu nó ghi vào** — đây chính là điểm mơ hồ cần làm rõ ở Round này. |
| **Capability Owner** | Teaching Engine | Giữ nguyên |
| **Persistence Requirement** | Persist Recommended (Round 3.8) | Không đổi |
| **Explainability Requirement** | Nên có (chưa locked) | Không đổi |

**Nhận xét cốt lõi:** Content Selection không có "nhà" — nó là 1 phép tổng hợp đọc-nhiều, ghi-không-gì (read-many, write-nothing), thuần túy orchestration logic. Đây là dấu hiệu mạnh nhất cho thấy Content Selection **không phải decision thuộc về 1 Domain**, mà là sản phẩm của 1 **Capability điều phối**.

---

## 2. Mode Selection (D8)

| Thuộc tính | Giá trị | Phân tích |
|---|---|---|
| **Decision Type** | Selection — chọn/đổi 1 trong 4 Learning Mode (A-D) | Không đổi |
| **Domain Owner** | **Mentor Interaction** — sở hữu thật, không phải gán theo vị trí | Khác hẳn Content Selection: `MentorSessionModeChanged` ghi trực tiếp vào `MentorSession`, entity mà Mentor Interaction Domain **đã là write-owner từ Round 1** (DECISION-031 xác nhận `MentorSession` write-owner bởi Mentor Interaction Domain, không đổi). Đây là 1 thay đổi state nội tại của Aggregate `MentorSession` — không cần đọc rộng ra ngoài domain này để biết "nên đổi Mode hay không" (input chủ yếu là tín hiệu tương tác trong chính `MentorSession`/`SubSession` đang diễn ra). |
| **Capability Owner** | Teaching Engine (theo CoreDomainMap hiện tại) — **nhưng nên xem lại** | Vì Mode Selection ghi vào Aggregate của Mentor Interaction, hợp lý hơn nếu Capability Owner cũng là 1 Capability gắn trực tiếp với Mentor Interaction (không nhất thiết phải là "Teaching Engine") |
| **Persistence Requirement** | Do Not Persist (mặc định, Round 3.8) | Không đổi — re-derivable từ state hiện tại của `MentorSession` |
| **Explainability Requirement** | Chưa xác định | Không đổi |

**Nhận xét cốt lõi:** Mode Selection **có 1 Domain sở hữu thật** (Mentor Interaction, qua Aggregate `MentorSession` đã tồn tại) — đây là decision duy nhất trong 3 decision có write-ownership rõ ràng, không mơ hồ.

---

## 3. Stuck Detection & Intervention Tier (D9)

| Thuộc tính | Giá trị | Phân tích |
|---|---|---|
| **Decision Type** | Detection-Classification (Learner có "stuck" không) + Selection (mức can thiệp nào) | Composite — 2 decision shape trong 1 decision type, đã ghi nhận từ Round 3.7 |
| **Domain Owner** | **Hỗn hợp — không có Domain đơn lẻ sở hữu trọn vẹn** | Phần "detection" (đọc lịch sử phản hồi/Evidence gần nhất trong `SubSession`/`MentorSession`) gần với phạm vi Mentor Interaction (vì dữ liệu nằm trong session đang diễn ra) — nhưng phần "chọn mức can thiệp" (hint level vs direct fix) **chính là 1 dạng Content Selection** nếu can thiệp là "dạy lại theo cách khác" — tạo overlap trực tiếp với Decision D1 (đã flag ở [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) mục 2). |
| **Capability Owner** | Teaching Engine | Không đổi, nhưng giống Content Selection — không có Aggregate riêng để ghi vào |
| **Persistence Requirement** | Persist Recommended (Round 3.8) | Không đổi |
| **Explainability Requirement** | Chưa xác định, cơ chế cốt lõi chưa chốt (Open Question #6/#11) | Không đổi |

**Nhận xét cốt lõi:** Stuck Detection thừa hưởng đúng vấn đề của Content Selection (không có Aggregate riêng) **cộng thêm** 1 overlap trực tiếp với Content Selection (nếu "intervention" nghĩa là dạy lại nội dung theo cách khác) — đây là decision có boundary mơ hồ nhất trong 3.

---

## 4. Tổng hợp 3 decision

| Decision | Có Aggregate Root riêng? | Domain Owner thật (theo write-ownership) | Bản chất |
|---|---|---|---|
| Content Selection (D1) | **Không** | Không có — đọc 3 domain, ghi 0 domain | Orchestration thuần |
| Mode Selection (D8) | **Có** (`MentorSession`, đã tồn tại) | Mentor Interaction | Domain decision thật |
| Stuck Detection (D9) | **Không** | Không có — đọc Mentor Interaction + có thể trùng lặp output với D1 | Orchestration + overlap chưa giải quyết |

**Kết luận sơ bộ của tài liệu này (chi tiết hoá ở [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md)):** 2/3 decision (D1, D9) không có dấu hiệu của 1 Domain thật (không Aggregate Root, không write-ownership riêng) — chỉ 1/3 (D8) có. Việc gộp cả 3 dưới 1 nhãn "Teaching" và gán cho "Mentor Interaction Domain" như Round 3.7/3.8 đã làm là **gán theo vị trí xảy ra**, không phải **gán theo sở hữu dữ liệu** — 2 tiêu chí này cho ra kết quả khác nhau, và sự khác nhau đó chính là nguồn gốc Capability/Domain Boundary Problem đã nêu ở Round 3.8.

## Liên kết ngược

[TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md), [CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md](CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [DECISION-028-Learning-Session-Domain](../11_Decisions/DECISION-028-Learning-Session-Domain.md), [DECISION-031-SubSession-vs-MentorSession](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md).
