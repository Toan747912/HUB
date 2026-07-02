# Teaching vs Mentor Interaction — Boundary Review (Round 3.9)

> Phạm vi: phân tích kiến trúc dựa trên [TEACHING_BOUNDARY_ANALYSIS.md](TEACHING_BOUNDARY_ANALYSIS.md). Không tạo entity/bảng/SQL/API/Frontend. Không chốt quyết định — kể cả ở Final Section.

---

## 1. Boundary Analysis — 5 Domain liên quan

### 1.1 Roadmap Domain (Goal & Roadmap)

- **Quan hệ với Teaching:** Cung cấp `roadmap_node_knowledge_node` (Dependency Edge) làm input cho Content Selection — Teaching cần biết RoadmapNode đang active yêu cầu KnowledgeNode nào.
- **Hướng dữ liệu:** Read-only từ phía Teaching. Roadmap Domain **không đọc ngược lại** bất kỳ gì từ Teaching (đã đúng theo nguyên tắc Domain Boundary đã chốt ở [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mục 2 — "Goal & Roadmap không sở hữu định nghĩa KnowledgeNode", và ngược lại không có quy tắc nào cho Teaching viết vào Roadmap).
- **Có write-overlap với Teaching không?** Không.

### 1.2 Knowledge Domain (Knowledge Graph)

- **Quan hệ với Teaching:** Cung cấp `knowledge_edge` (thứ tự prerequisite) làm input cho Content Selection.
- **Hướng dữ liệu:** Read-only từ phía Teaching.
- **Có write-overlap với Teaching không?** Không — Knowledge Expansion (D4/D5) là 1 Capability khác hoàn toàn (Knowledge Engine), không liên quan tới luồng ghi của Teaching.

### 1.3 Assessment Domain

- **Quan hệ với Teaching:** Cung cấp `knowledge_node_mastery` (mức Learner đã đạt) làm input cho cả Content Selection (biết nên dạy gì tiếp) và Stuck Detection (biết lịch sử đánh giá gần nhất có liên tục thấp không).
- **Hướng dữ liệu:** Read-only từ phía Teaching. **Đáng chú ý:** đây là domain Teaching đọc nhiều nhất về *mức độ ảnh hưởng tới quyết định* (cả 2/3 decision của Teaching cần dữ liệu Assessment), nhưng Assessment hoàn toàn không biết tới sự tồn tại của Teaching.
- **Có write-overlap với Teaching không?** Không — Assessment là write-owner duy nhất của Mastery (DECISION-026), không có ngoại lệ.

### 1.4 Recommendation Domain

- **Quan hệ với Teaching:** Theo thiết kế đã khoá (DECISION-019), nếu Recommendation đề xuất "ôn lại KnowledgeNode X", hành động cụ thể được **giao cho Teaching Engine thực thi** (xem [AI/RecommendationEngine/README.md](../../AI/RecommendationEngine/README.md) mục "Khuyến nghị"). Đây là **hướng ngược lại** so với 3 domain trên — Recommendation không chỉ là input thô, mà có thể là 1 "lệnh đề xuất" mà Teaching cần quyết định có theo hay không.
- **Hướng dữ liệu:** Read-only từ phía Teaching (Teaching đọc `RecommendationProposal` đã có, không ghi vào Recommendation).
- **Có write-overlap với Teaching không?** Không, nhưng quan hệ ngữ nghĩa (semantic coupling) chặt hơn 3 domain trên — Recommendation có thể trực tiếp định hướng Content Selection chọn gì.

### 1.5 Mentor Interaction Domain

- **Quan hệ với Teaching:** **Khác hẳn 4 domain trên.** Đây là domain duy nhất mà Teaching (cụ thể là Mode Selection, D8) **ghi trực tiếp vào Aggregate đã tồn tại** (`MentorSession`). Đồng thời, Content Selection và Stuck Detection **chạy trong ngữ cảnh** `SubSession`/`MentorSession` (cần biết session nào, Mode nào đang active) dù không ghi vào đó.
- **Hướng dữ liệu:** Hỗn hợp — Read (context cho D1/D9) + Write (D8, vào Aggregate đã có của chính Mentor Interaction).
- **Có write-overlap với Teaching không?** **Có, nhưng không phải overlap có hại** — Mode Selection (D8) ghi vào `MentorSession` chính là Mentor Interaction Domain tự ghi vào Aggregate của mình, không phải Teaching "mượn" quyền ghi của domain khác. Vấn đề chỉ là **gán nhãn Capability sai** (gọi đây là "Teaching" trong khi nó là 1 hành vi nội tại của Mentor Interaction).

### 1.6 Tổng hợp Boundary Analysis

| Domain | Hướng dữ liệu với Teaching | Write-overlap thật? |
|---|---|---|
| Roadmap | Read-only (Teaching đọc) | Không |
| Knowledge | Read-only (Teaching đọc) | Không |
| Assessment | Read-only (Teaching đọc, nhiều nhất) | Không |
| Recommendation | Read-only nhưng semantic coupling cao (có thể định hướng quyết định) | Không |
| **Mentor Interaction** | **Hỗn hợp — Read (context) + Write (Mode, vào Aggregate riêng của chính domain này)** | **Có, nhưng đúng chỗ** |

**Quan sát quan trọng nhất:** Trong 5 domain, **không có domain nào** mà "Teaching" cần ghi vào theo nghĩa sở hữu dữ liệu mới — domain duy nhất có ghi (Mentor Interaction, qua Mode) là ghi vào Aggregate domain đó **đã sở hữu từ trước Teaching tồn tại**. Đây là dấu hiệu kiến trúc rất rõ: **Teaching không cần một Aggregate Root của riêng nó để hoạt động** — nó hoạt động hoàn toàn bằng cách đọc 4 domain khác và (khi cần đổi Mode) nhờ Mentor Interaction tự ghi vào chính nó.

---

## 2. Does a Teaching Domain Actually Exist?

**KHÔNG.**

Áp dụng đúng tiêu chí đã dùng cho mọi Domain khác trong [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) (mục 3 — Aggregate Roots; mỗi Domain có ít nhất 1 Aggregate Root nó write-own): không có Aggregate Root nào được gán cho "Teaching" ở CoreDomainMap hiện tại, và mục 1.6 trên cho thấy lý do tại sao — không có dữ liệu nào cần 1 Aggregate riêng cho Teaching để biểu diễn. 3 decision của Teaching:

- Content Selection: không ghi gì (hiện tại) — nếu sau này persist (theo khuyến nghị Round 3.6/3.8), bản ghi đó **có thể** cần 1 Aggregate riêng (vd: "Teaching Decision Log") — nhưng đây sẽ là Aggregate phục vụ **observability/explainability**, không phải Aggregate phục vụ **nghiệp vụ cốt lõi** (khác hẳn `AssessmentResult`, vốn vừa là audit vừa là điều kiện tồn tại của `KnowledgeNodeMastery`).
- Mode Selection: ghi vào Aggregate đã thuộc Mentor Interaction.
- Stuck Detection: tương tự Content Selection — nếu persist, sẽ là Aggregate phục vụ explainability, không phải nghiệp vụ cốt lõi.

### Nếu KHÔNG — domain nào sở hữu các decision?

| Decision | Domain sở hữu thật | Vai trò |
|---|---|---|
| Content Selection (D1) | **Không domain nào** — chỉ có domain *cung cấp input* (Roadmap, Knowledge, Assessment, Recommendation) | Orchestration logic, không write-owned bởi domain nghiệp vụ nào |
| Mode Selection (D8) | **Mentor Interaction** | Domain decision thật, write vào Aggregate đã có |
| Stuck Detection (D9) | **Không domain nào** trọn vẹn — phần "đọc tín hiệu" gần Mentor Interaction, phần "chọn can thiệp" trùng Content Selection | Orchestration logic + overlap chưa giải quyết (xem [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) mục 2) |

### Capability nào nên điều phối?

**Teaching nên là 1 Capability điều phối (orchestrator), không phải Domain** — đọc 4 domain (Roadmap, Knowledge, Assessment, Recommendation) để quyết Content Selection và phần "chọn can thiệp" của Stuck Detection; **không** điều phối Mode Selection (decision đó nên được nhìn nhận lại là thuộc về Mentor Interaction Domain tự quyết, không phải "Teaching" mượn).

Mô hình này **có tiền lệ trực tiếp trong chính kiến trúc đã khoá**: Learning Session (DECISION-028) đã được xác lập là "Core Domain đóng vai trò Orchestrator" — đọc/điều phối 6 domain khác mà **không sở hữu** bất kỳ entity nào của chúng, chỉ ghi vào chính nó (`LearningSession`/`SubSession`). Teaching, nếu được mô hình theo đúng pattern này, sẽ là 1 **Capability điều phối ở độ phân giải nhỏ hơn** (trong phạm vi 1 SubSession/MentorSession, không phải toàn bộ Goal như Learning Session) — không cần là 1 Domain riêng vì nó không có dữ liệu nghiệp vụ cốt lõi cần sở hữu, chỉ cần (tối đa) 1 lớp ghi log explainability nhẹ — đúng bản chất các Approach đã phân tích ở Round 3.6 (1A/1D) cho GAP-01.

---

## 3. Capability nào nên điều phối các decision này?

**Teaching Capability** (giữ tên hiện tại, không cần đổi tên) — với phạm vi được làm rõ lại:

- **Sở hữu thật:** Content Selection (D1), và phần "chọn mức/loại can thiệp" của Stuck Detection (D9b).
- **Không sở hữu, chỉ tiêu thụ kết quả:** Mode Selection (D8) — nên được tái phân loại là 1 decision của **Mentor Interaction Domain tự thực hiện**, không phải decision Teaching "mượn" Mentor Interaction để thực hiện. Capability Owner của D8 nên là 1 capability gắn trực tiếp với Mentor Interaction (tên cụ thể: ngoài phạm vi Round này, chỉ flag là không nên tiếp tục gọi "Teaching Engine").
- **Cần làm rõ thêm trước khi đóng hẳn:** phần "phát hiện stuck" (D9a, Detection) — gần Mentor Interaction hơn Teaching (đọc tín hiệu trong session đang diễn ra) nhưng quyết định cuối "có alert/can thiệp không" lại cần thông tin nội dung (Teaching biết được nội dung nào khó) — đây là 1 trường hợp **2 capability cùng cần tham gia 1 decision**, chưa có pattern rõ để xử lý (Learning Session/Recommendation đều không có tiền lệ "2 capability cùng quyết 1 decision" — luôn là 1 capability quyết, capability khác chỉ cung cấp input).

---

## 4. Risks if Current Model Remains Unchanged

1. **GAP-01 (Teaching, Round 3.5) sẽ tiếp tục không thể đóng bằng 1 giải pháp duy nhất** — vì bản chất nó là 3 decision khác nhau (1 Domain decision thật + 2 Capability-orchestration decision, 1 trong 2 lại overlap nhau) núp dưới 1 tên. Bất kỳ thiết kế persistence "cho Teaching" mà không tách D8 ra sẽ tiếp tục nhầm lẫn.
2. **DECISION-048 (đề xuất ở Round 3.8) nếu được viết trước khi đóng Round 3.9 sẽ phải dùng từ "Teaching" mơ hồ** — không rõ nguyên tắc explainability áp dụng cho Content Selection có áp dụng cho Mode Selection hay không (về logic Round này, **không nên** — Mode Selection ít quan trọng hơn, đã xếp Criticality C, Do Not Persist).
3. **Risk tích lũy kỹ thuật nếu Mode Selection tiếp tục bị gọi là "Teaching Engine output":** bất kỳ ai (kể cả ChatGPT Lead Architect ở vòng sau) đọc lại Decision Log sẽ thấy "Teaching Engine sở hữu Mode Selection" và có thể tự suy luận sai rằng đổi Mode cần tuân theo cùng governance/explainability với Content Selection — dẫn tới over-engineering cho 1 decision Criticality C.
4. **Risk cho Stuck Detection (D9) nếu không tách D9a/D9b:** nếu xây dựng persistence cho D9 như 1 khối duy nhất, sẽ khó tách sau này khi cần biết "việc phát hiện stuck đúng/sai" (chất lượng Mentor Interaction's detection) độc lập với "việc chọn can thiệp đúng/sai" (chất lượng Teaching's content choice) — 2 câu hỏi khác nhau, cần audit riêng để cải thiện đúng phần bị lỗi.
5. **Risk thấp nếu giữ nguyên cho riêng D1 (Content Selection)** — phân loại "Teaching Engine sở hữu Content Selection, đọc 4 domain khác" đã đúng và ổn định, không có risk mới phát sinh từ Round này cho phần này.

---

## Final Section — Lead Architect Recommendation

### A. Teaching Domain hay B. Teaching Capability (orchestrating multiple Domains)?

**Khuyến nghị: B — Teaching là Capability điều phối, không phải Domain.**

**Lý do:**

1. **Không có Aggregate Root nào tự nhiên thuộc về "Teaching"** (mục 2) — đây là tiêu chí đã dùng nhất quán cho mọi Domain khác trong CoreDomainMap; Teaching không thoả tiêu chí này ở cả 3 decision con khi xét tách biệt.
2. **Tiền lệ kiến trúc đã có và đã locked:** Learning Session (DECISION-028) chứng minh mô hình "Capability/Domain điều phối, không sở hữu dữ liệu domain khác, chỉ đọc" là 1 pattern hợp lệ và đã được Founder/Lead Architect chấp nhận trong hệ thống này — Teaching áp dụng đúng cùng pattern, ở độ phân giải nhỏ hơn (trong 1 SubSession, không phải toàn bộ Goal).
3. **Tránh lặp lại sai lầm "gán Domain theo vị trí xảy ra" thay vì "gán Domain theo write-ownership"** — mục 1.6 cho thấy rõ 2 tiêu chí này cho 2 câu trả lời khác nhau cho D1/D9; chọn B tránh phải tạo ra 1 Domain giả (không có dữ liệu cốt lõi để sở hữu) chỉ để có nơi "gán" decision.
4. **Hệ quả trực tiếp, cần xử lý riêng (không phải lý do chọn B, mà là điều kiện đi kèm):** chọn B đồng nghĩa **Mode Selection (D8) cần được tách ra khỏi "Teaching"** và trả lại đúng cho Mentor Interaction Domain tự quyết — đây không phải 1 phần của câu trả lời A/B, là 1 phát hiện phụ (mục 3) cần Founder xác nhận riêng.

**Không khuyến nghị A (Teaching Domain)** vì sẽ buộc phải tạo ra 1 Aggregate Root "giả" (không có dữ liệu nghiệp vụ cốt lõi, chỉ có dữ liệu audit/explainability) để thoả tiêu chí Domain — đi ngược lại cách mọi Domain khác trong hệ thống này được định nghĩa (luôn có dữ liệu nghiệp vụ thật làm lý do tồn tại, audit là hệ quả, không phải lý do chính — đúng như cách Evidence/Assessment/Knowledge Graph mỗi domain đều có).

**Không chốt quyết định này** — đây là khuyến nghị của Claude (Co-Architect) cho Founder/ChatGPT Lead Architect, theo đúng giới hạn Round 3.9 và mô hình governance đã thiết lập trong toàn bộ Decision Log.

## Liên kết ngược

[TEACHING_BOUNDARY_ANALYSIS.md](TEACHING_BOUNDARY_ANALYSIS.md), [CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md](CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md), [DECISION-028-Learning-Session-Domain](../11_Decisions/DECISION-028-Learning-Session-Domain.md), [DECISION-031-SubSession-vs-MentorSession](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md), [DECISION-019-Recommendation-Engine](../11_Decisions/DECISION-019-Recommendation-Engine.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md).
