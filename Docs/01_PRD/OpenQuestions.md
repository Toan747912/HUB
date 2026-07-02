# Open Questions — chờ Founder xác nhận

Quy tắc: các câu hỏi dưới đây KHÔNG được tự giả định trong các tài liệu khác. Mọi nội dung phụ thuộc vào câu trả lời sẽ được đánh dấu **🔶 OPEN** tại vị trí liên quan và tham chiếu ngược về đây.

---

### Câu 1 — Quan hệ với workspace trước đó

Thư mục `HUB` đang trống khi bắt đầu phiên này. Tôi giả định tạm: đây là khởi đầu hoàn toàn mới cho "AI Mentor OS", không kế thừa ngầm định gì từ các thiết kế trước (nếu có).

**Cần xác nhận:** Đúng là khởi đầu mới hoàn toàn, hay có tài liệu/quyết định trước đó (ở nơi khác) cần Claude tham khảo/kế thừa?

---

### Câu 2 — Quy trình đồng bộ với ChatGPT (Lead Architect)

Brief nêu ChatGPT là Lead Architect dẫn dắt kiến trúc sản phẩm, nhưng không nói rõ luồng thông tin.

**Cần xác nhận:**
- Founder sẽ copy/paste output của ChatGPT vào đây để Claude tích hợp?
- Hay có tài liệu trung gian (ví dụ Google Doc/Notion) mà cả hai AI cùng tham chiếu?
- Khi tài liệu Claude viết mâu thuẫn với hướng ChatGPT đã chốt, ai/cái gì thắng theo mặc định — hay luôn phải hỏi lại Founder?

---

### Câu 3 — Phạm vi đa lĩnh vực cho MVP

Vision nêu 6 lĩnh vực (Lập trình, AI, Thiết kế, Ngoại ngữ, Marketing, Kinh doanh, Kỹ năng nghề nghiệp) là phạm vi hệ thống phải hỗ trợ.

**Cần xác nhận:** Đây là tầm nhìn dài hạn (hệ thống được *thiết kế để* mở rộng tới các lĩnh vực này), hay MVP phải *demo được* ít nhất 2-3 lĩnh vực ngay từ đầu để chứng minh tính tổng quát?

**Vì sao quan trọng:** Quyết định này ảnh hưởng trực tiếp đến độ phức tạp của Knowledge Graph và Assessment Philosophy (cách "Apply"/"Teach" một kỹ năng marketing rất khác cách áp dụng cho code) — xem [RequirementGaps.md](RequirementGaps.md) Gap #2. Đề xuất của Claude (chưa phải quyết định): MVP chỉ chọn 1 lĩnh vực (khả năng cao là lập trình, vì dễ đánh giá tự động nhất) để validate cơ chế cốt lõi (Discovery, Knowledge Graph, Roadmap động), sau đó mở rộng lĩnh vực thứ 2 để kiểm chứng tính tổng quát của framework trước khi build thêm.

---

### Câu 4 — "User" trong Roadmap Governance là ai

Brief dùng từ "User" cho cả hai nghĩa: (a) Founder — người ra quyết định dự án, và (b) người học cuối (learner) — người dùng sản phẩm thực tế.

Trong mục Roadmap Governance: "Mọi thay đổi phải được user phê duyệt" — đây nói về *learner tự phê duyệt roadmap học tập của chính họ* (gần như chắc chắn, vì đây là roadmap cá nhân hóa theo từng người học).

**Cần xác nhận:** Xác nhận lại đúng là learner cuối, không phải Founder, phê duyệt roadmap cá nhân của họ — để Claude không nhầm lẫn hai vai trò này khi viết PRD/Domain Model.

---

### Câu 5 — Cơ chế xác minh SelfAssessmentMismatch (OQ5)

**✅ ĐÃ ĐÓNG** bởi [DECISION-051](../11_Decisions/DECISION-051-Self-Assessment-Mismatch-Mechanism.md) (Xem chi tiết tại phần Resolved Questions ở cuối tài liệu).

---

### Câu 6 — AI Boundaries khi dạy/debug

Nguyên tắc 6 nói "không để user bị kẹt quá lâu", nhưng brief không nêu rõ AI được làm gì khi user bế tắc.

**Cần xác nhận:** AI có được sửa trực tiếp code/bài làm của user không? Hay chỉ được gợi ý theo từng cấp độ tăng dần (hint ladder) và để user tự gõ/tự sửa? Đây là một ranh giới quan trọng để tránh mâu thuẫn với nguyên tắc 1 (không học vẹt) — nếu AI sửa trực tiếp, user có thể copy-paste mà không hiểu.

**🔶 Thu hẹp ở [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (Round 4.0-4.3, locked):** câu hỏi cơ chế (hint ladder vs direct fix) vẫn **mở**, không bị đóng — nhưng DECISION-048 đã chốt 1 ràng buộc áp dụng cho bất kỳ cơ chế nào được chọn sau này: quyết định Stuck Detection (tín hiệu phát hiện, D9a) và Intervention Tier Selection (D9b) **đều phải explainable** — bất kể chọn hint-ladder hay direct-fix, AI phải lưu lại được "vì sao coi Learner là stuck" và "vì sao chọn mức can thiệp này". Đây là 1 ràng buộc bổ sung cho câu hỏi gốc, không phải câu trả lời cho nó.

---

### Câu 7 — Mô hình kinh doanh

Brief không đề cập mô hình kinh doanh, nhưng MVP Plan cần biết để ưu tiên đúng (free tier giới hạn gì, có cần tính năng thanh toán trong MVP không, B2C cá nhân hay có hướng B2B/đào tạo doanh nghiệp).

**Cần xác nhận:** Founder có muốn đưa business model vào vòng tài liệu này, hay để lại cho vòng sau (tài liệu hiện tại là Product/Requirements/Architecture, chưa phải Go-to-market)?

---

## Round 2 — phát sinh từ DECISION-015..018 (Knowledge/Evidence Engine, Domain Modeling Phase)

### Câu 8 — Knowledge Node Expansion có cần governance giống Roadmap không

**✅ ĐÃ ĐÓNG ở Round 3 bởi [DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md):** mô hình 2 tier — Local (AI tự làm) / Deep-Structural (AI tự làm nhưng phải minh bạch lý do). Tiêu chí cụ thể phân biệt 2 tier vẫn 🔶 OPEN, xem câu 15.

---

### Câu 9 — Teach: cần đủ 5/5 sub-capability hay đủ ngưỡng N/5

**✅ ĐÃ ĐÓNG ở Round 3 bởi [DECISION-020](../11_Decisions/DECISION-020-Teach-Composite-Capability.md):** không dùng ngưỡng pass/fail — Teach dùng weighted composite score. Trọng số cụ thể giữa 5 sub-capability vẫn 🔶 OPEN, xem câu 12.

---

### Câu 10 — Ngưỡng Negative Evidence để trigger Knowledge Regression

**✅ ĐÃ ĐÓNG ở Round 3 bởi [DECISION-021](../11_Decisions/DECISION-021-Evidence-Weighting.md):** dựa trên Evidence Weight, không dựa trên số lượng (bác bỏ đề xuất "lặp lại ≥2 lần" của Claude ở Round 2). Công thức Weight cụ thể vẫn 🔶 OPEN, xem câu 13.

---

### Câu 11 — Một Evidence có thể gắn nhiều Knowledge Node cùng lúc không

~~[CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) mô hình hóa `Evidence` là Aggregate độc lập, giả định 1 Evidence có thể chứng minh hiểu biết cho nhiều Knowledge Node cùng lúc.~~ **✅ ĐÃ ĐÓNG ở Round 3 bởi [DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md):** xác nhận Many-to-Many, qua `EvidenceLink` (mỗi link có chiều support/refute + weight riêng).

---

## Round 3 — phát sinh từ DECISION-019..024

### Câu 12 — Công thức `capability_weight` cho 5 sub-capability của Teach (OQ12)

**✅ ĐÃ ĐÓNG** bởi [DECISION-052](../11_Decisions/DECISION-052-Teach-Capability-Composite-Weighting.md) (Xem chi tiết tại phần Resolved Questions ở cuối tài liệu).

---

### Câu 13 — Công thức/kiểu dữ liệu `evidence_weight` và ai gán (OQ13)

**✅ ĐÃ ĐÓNG** bởi [DECISION-053](../11_Decisions/DECISION-053-Evidence-Weighting-and-Knowledge-Regression.md) (Xem chi tiết tại phần Resolved Questions ở cuối tài liệu).

---

### Câu 14 — Field `type` (Positive/Negative) cấp Evidence còn cần không

[DECISION-022](../11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md) chuyển support/refute xuống cấp `EvidenceLink` (per Knowledge Node). [AI/EvidenceEngine/EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md) tạm bỏ field `type` cấp Evidence.

**Cần xác nhận:** Đúng là bỏ hoàn toàn, hay vẫn giữ 1 field tổng quát ở cấp Evidence (ví dụ để hiển thị nhanh "evidence này chủ yếu tích cực/tiêu cực") song song với `EvidenceLink.direction`?

---

### Câu 15 — Tiêu chí Controlled Expansion (Local vs Deep/Structural) cụ thể

[DECISION-023](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md) chốt nguyên tắc (cục bộ = tự làm, sâu/đáng kể = cần lý do rõ ràng) nhưng bảng tiêu chí cụ thể (mở 1 cấp vs nhiều cấp, có tạo Dependency Edge mới hay không) là đề xuất kỹ thuật của Claude, chưa được duyệt.

**Cần xác nhận:** Bảng tiêu chí trong [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md) mục Controlled Expansion có đúng ý Founder/ChatGPT không, hay cần ranh giới khác?

---

### Câu 16 — Knowledge Graph là cây (1 cha) hay DAG (nhiều cha)

**✅ ĐÃ ĐÓNG ở Round 4 bởi [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md):** xác nhận DAG — multi-parent, multi relation-type, cycle detection. Danh sách `relation_type` đầy đủ và cơ chế cycle detection cụ thể vẫn 🔶 OPEN, xem câu 18, 19.

---

### Câu 17 — Assessment Engine thuộc Core Domain nào

**✅ ĐÃ ĐÓNG ở Round 4 bởi [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md):** Assessment là Core Domain độc lập — không thuộc Evidence, không thuộc Knowledge. Là write-owner của `KnowledgeNodeMastery`.

---

## Round 4 — phát sinh từ DECISION-025..027

### Câu 18 — Danh sách `relation_type` đầy đủ cho KnowledgeEdge

[DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md) yêu cầu "nhiều relation type" nhưng không liệt kê. Claude đề xuất khởi điểm `expands_to`/`prerequisite_of`/`related_to` tại [AI/KnowledgeEngine/KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md).

**Cần xác nhận:** Danh sách này đủ chưa, có cần thêm loại nào khác (ví dụ "alternative_to", "contrasts_with")?

---

### Câu 19 — Cơ chế cycle detection cụ thể

**✅ ĐÃ ĐÓNG ở Round 5 bởi [DECISION-029](../11_Decisions/DECISION-029-Cycle-Detection-Strategy.md):** Runtime Reachability Check cho v1 — không dùng closure table, ưu tiên đơn giản/dễ bảo trì, chỉ tối ưu khi có bằng chứng vấn đề hiệu năng thực tế.

---

### Câu 20 — `AssessmentResult` granularity (cardinality)

[DECISION-030](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md) (Round 5) đã chốt **nội dung** mỗi `AssessmentResult` phải chứa (8 trường: KnowledgeNode/Remember/Explain/Apply/Teach/Confidence/Evidence References/Reasoning) — nhưng **chưa chốt cardinality**: 1 Evidence (có thể có nhiều EvidenceLink, mỗi link 1 KnowledgeNode) sinh ra 1 `AssessmentResult` duy nhất, hay 1 AssessmentResult riêng cho mỗi EvidenceLink?

**Cần xác nhận:** Founder/ChatGPT chọn cardinality nào — ảnh hưởng trực tiếp tới việc truy vết Explainability (DECISION-027) có rõ ràng theo từng KnowledgeNode hay không. Câu hỏi này **vẫn mở**, chỉ thu hẹp phạm vi so với Round 4.

---

### Câu 21 — Entity ghi log nội bộ cho Local Expansion

[DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) yêu cầu Local Expansion (không hiển thị lý do cho Learner) vẫn phải "truy vết được". Domain Event `KnowledgeNodeExpanded` (Local) có đủ làm nguồn truy vết, hay cần một entity ghi log bền vững riêng (giống `ExpansionRecord` nhưng không hiển thị)?

**Cần xác nhận:** Domain Event lưu trữ lâu dài (event store) có được coi là "truy vết được" theo đúng tinh thần DECISION-027, hay cần entity riêng để dễ truy vấn hơn?

**🔶 Tái xác nhận ở [DECISION-048](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) (Round 4.0-4.3, locked):** câu hỏi *cơ chế lưu cụ thể* vẫn mở (chưa chọn giữa event store đủ hay cần entity riêng) — DECISION-048 không tự chọn, chỉ tái khẳng định yêu cầu gốc của DECISION-027 vẫn còn hiệu lực đầy đủ cho Local Expansion (D5), không có ngoại lệ mới nào được thêm.

---

## Round 5 — phát sinh từ DECISION-028..030

### Câu 22 — `SubSession` (Learning Session Domain) ↔ `MentorSession` (Mentor Interaction Domain)

**✅ ĐÃ ĐÓNG ở Round 6 bởi [DECISION-031](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md):** 2 entity khác nhau — hierarchy `LearningSession → SubSession → MentorSession`. `SubSession` là tầng mới, gắn phạm vi RoadmapNode/KnowledgeNode; `MentorSession` giữ nguyên định nghĩa Round 1, là con (theo tham chiếu) của `SubSession`.

---

### Câu 23 — Goal đổi giữa đường có tạo `LearningSession` mới không

**✅ ĐÃ ĐÓNG ở Round 6 bởi [DECISION-032](../11_Decisions/DECISION-032-Immutable-Goal.md):** Goal là immutable — đổi Goal luôn tạo `Goal` mới + `LearningSession` mới, session cũ chuyển sang `Archived` (đổi tên từ "Abandoned"). Không bao giờ đổi `goal_id` tại chỗ.

---

### Câu 24 — Ngưỡng tự động chuyển `LearningSession` sang Paused

**✅ ĐÃ ĐÓNG ở Round 6 bởi [DECISION-033](../11_Decisions/DECISION-033-Adaptive-Pause.md):** không dùng ngưỡng thời gian cố định. Paused chỉ phát sinh từ Learner tự pause trực tiếp, hoặc Learner xác nhận `RecommendationProposal` loại pause do Recommendation Engine đề xuất. Stuck Detection (Gap 4) vẫn là câu hỏi riêng, chưa trả lời.

---

## Resolved Questions (Sprint Design Closure)

### Câu 5 — Cơ chế xác minh SelfAssessmentMismatch (OQ5)
**Nội dung câu hỏi:** Brief nêu khái niệm nhưng không nêu cơ chế: khi user nói "Tôi biết Docker", AI xác minh bằng cách nào?  
**Xác nhận độ thích nghi:** Khi mismatch được phát hiện, AI có quyền tự điều chỉnh độ khó/level ngay không?  
**Trạng thái:** ✅ **ĐÃ ĐÓNG** bởi [DECISION-051](../11_Decisions/DECISION-051-Self-Assessment-Mismatch-Mechanism.md) & [DECISION-055](../11_Decisions/DECISION-055-Discovery-Schema-Reconciliation.md).
- **Cơ chế:** Áp dụng Option B (Balanced Approach) từ [OQ5_Alternatives.md](../03_Domain_Model/OQ5_Alternatives.md). Ghi nhận mismatch $\ge 2$ levels lập tức. Ghi nhận 1-level chênh lệch sau khi kiểm tra qua verification probe thứ hai.
- **Quyền AI:** AI tự thích nghi trong phiên (in-session probe levels). Với Roadmap ngoài phiên, AI tạo recommendation proposal gửi Learner duyệt (`requires_confirmation = false` cho việc ghi mismatch, nhưng roadmap changes cần learner approval).
- **Mapping:** Ghi nhận signals thông qua `claimed_skill_area_id` NOT NULL và mapping dần với `knowledge_node_id` nullable (DECISION-055).

---

### Câu 12 — Công thức `capability_weight` cho 5 sub-capability của Teach (OQ12)
**Nội dung câu hỏi:** [DECISION-020](../11_Decisions/DECISION-020-Teach-Composite-Capability.md) chốt Teach dùng weighted composite score nhưng không cho trọng số cụ thể giữa Explain/Simplify/Guide/Review/Transfer Knowledge.  
**Trạng thái:** ✅ **ĐÃ ĐÓNG** bởi [DECISION-052](../11_Decisions/DECISION-052-Teach-Capability-Composite-Weighting.md).
- **Quyết định:** Áp dụng mô hình Progressive Weight (Model B): Explain (10%), Simplify (15%), Guide (25%), Review (25%), Transfer (25%). Mastery threshold đặt tại $\ge 75\%$.

---

### Câu 13 — Công thức/kiểu dữ liệu `evidence_weight` và ai gán (OQ13)
**Nội dung câu hỏi:** [DECISION-021](../11_Decisions/DECISION-021-Evidence-Weighting.md) chốt Knowledge Regression dựa trên Evidence Weight, không dựa số lượng — nhưng chưa định nghĩa Weight cụ thể.  
**Trạng thái:** ✅ **ĐÃ ĐÓNG** bởi [DECISION-053](../11_Decisions/DECISION-053-Evidence-Weighting-and-Knowledge-Regression.md).
- **Quyết định:** Áp dụng Model B (Progressive Weight): $evidence\_weight = SourceWeight \times AI\_Confidence$. Baseline source weights là cố định (Test = 1.0, Lab = 0.8, Probe = 0.5, Chat = 0.3). AI Confidence trích xuất động (0.0 đến 1.0) từ lời gọi AI. Regression kích hoạt khi tổng Negative Evidence $\ge 1.5$.
