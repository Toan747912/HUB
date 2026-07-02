# DECISION-048 — Lock Report (Round 4.3)

> [DECISION-048-All-AI-Decisions-Must-Be-Explainable.md](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) chuyển từ **Draft** sang **✅ Accepted (Locked)** theo Lock Request của Founder/Lead Architect. Không có nội dung quyết định nào bị sửa tại thời điểm lock — toàn bộ nội dung đã được rà soát qua Round 4.0 → 4.2 ([DECISION-048_FINAL_REVIEW.md](DECISION-048_FINAL_REVIEW.md) kết luận "sẵn sàng để lock"). Round 4.3 chỉ thực hiện: (1) đổi Status, (2) đồng bộ Decisions README/Project_Index/Open Questions, (3) phát hành báo cáo này. Không tạo Decision mới, không tạo entity, không sửa schema.

---

## 1. Final Scope

DECISION-048 mở rộng [DECISION-027 (Explainability First)](../11_Decisions/DECISION-027-Explainability-First.md) từ phạm vi gốc (3 nhóm: Mastery, Recommendation, Knowledge Expansion) sang **toàn bộ AI Decision Type đã được xác định qua rà soát đầy đủ 7 Capability** (Teaching, Assessment, Recommendation, Knowledge Expansion, Roadmap Mapping, Discovery, Mentor Interaction — Round 3.7-3.9).

**Nguyên tắc cốt lõi đã khóa:**
1. Mọi AI Decision thoả đủ 4 điều kiện C1-C4 ([AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) mục 1) phải explainable.
2. **Explainability và Persistence là 2 trục độc lập** (xác nhận chính thức ở Round 4.1, áp dụng trong toàn bộ DECISION-048) — không có quy tắc "Not Persisted ⇒ Not Explainable".
3. Explainability không đồng nghĩa Visibility cho Learner (giữ nguyên từ DECISION-027 — Local Expansion vẫn là ví dụ: truy vết nội bộ, không hiển thị).
4. Không AI Decision nào (thoả C1-C4) được phép là "black-box" chỉ vì thiếu cơ chế lưu trữ — thiếu cơ chế là 1 gap cần đóng, không phải lý do miễn trừ.

---

## 2. Final Decision Types Covered

10 Decision Type (9 từ Round 3.8, D9 tách thêm 1 ở Round 3.9) — **toàn bộ đều trong phạm vi Explainability của DECISION-048**, không còn decision nào miễn trừ hoàn toàn:

| Decision Type | Capability | Domain Owner | Explainability Status |
|---|---|---|---|
| D1 — Teaching: Content Selection | Teaching (Capability, Round 3.9) | Không có Domain sở hữu riêng (orchestration) | Required — mới mở rộng |
| D2 — Assessment: Evidence Verdict | Assessment Engine | Assessment | Required — đã locked từ DECISION-027 gốc |
| D3 — Recommendation: Signal Synthesis | Recommendation Engine | Recommendation | Required — đã locked từ DECISION-027 gốc |
| D4 — Knowledge Expansion: Deep/Structural | Knowledge Engine | Knowledge Graph | Required, Shown to Learner — đã locked (DECISION-023/027) |
| D5 — Knowledge Expansion: Local | Knowledge Engine | Knowledge Graph | Required, Internal-only — đã locked (DECISION-027) |
| D6 — Roadmap Mapping: Dependency Edge Selection | Roadmap Engine | Goal & Roadmap | Required — mới mở rộng |
| D7 — Discovery: Self-Assessment Mismatch Detection | Discovery Engine | Discovery | Required (tự explainable, không chỉ làm điểm đến trace) — mới mở rộng |
| D8 — Mentor Interaction: Learning Mode Selection | Mentor Interaction Domain (không phải "Teaching Engine") | Mentor Interaction | **Required — qua Runtime Reconstruction** (tái phân loại Round 4.1-4.2, không còn miễn trừ) |
| D9a — Mentor Interaction: Stuck Detection (tín hiệu) | Chưa chốt hẳn (Round 3.9) | Mentor Interaction (gần nhất) | Required — mới mở rộng, cơ chế chưa tồn tại |
| D9b — Teaching: Intervention Tier Selection | Teaching (Capability) | Không có Domain sở hữu riêng | Required — mới mở rộng, cơ chế chưa tồn tại |

**Out Of Scope (không phải AI Decision, không phải decision được miễn trừ):**
- Hành vi không thoả C1-C4 (lựa chọn văn phong/diễn đạt, hành vi tất định, thu thập Evidence thô).
- Yêu cầu tái hiện chain-of-thought đầy đủ (explainability chỉ cần lý do truy vết được tới nguồn dữ liệu, không cần toàn bộ suy luận nội bộ).

---

## 3. Explainability Mechanisms

| Mechanism | Áp dụng cho | Trạng thái hạ tầng |
|---|---|---|
| **Persisted Record + TraceLink** (DECISION-038) | D2, D3, D4, D5 | Đã tồn tại/đã implement cho D2/D4; D3 schema-provisioned chưa build; D5 đã locked nhưng chưa implement (GAP-02, kế thừa) |
| **Persisted Record (cơ chế cụ thể chưa chốt)** | D1, D6, D7, D9a, D9b | Yêu cầu đã xác nhận; cơ chế lưu trữ cụ thể (Shared Mechanism/Header-Detail hay riêng từng cái) **chưa được chọn** — thuộc phạm vi Round 3.6, không thuộc DECISION-048 |
| **Runtime Reconstruction** (không cần Persisted Record riêng) | D8 | Duy nhất 1 decision dùng cơ chế này — điều kiện áp dụng (input phải truy xuất được từ domain khác) **chưa được xác minh**, vì cơ chế Mode Selection cụ thể chưa từng chốt |

**Nguyên tắc phân biệt 2 cơ chế (Persisted Record vs Runtime Reconstruction), khóa cùng DECISION-048:** 1 decision dùng Runtime Reconstruction hợp lệ chỉ khi mọi input quyết định của nó đã/sẽ được persist ở 1 domain khác có thể truy xuất theo timestamp — nếu không, decision đó phải dùng Persisted Record. Đây là tiêu chí lựa chọn cơ chế đã khóa, **không phải** lựa chọn tự do giữa 2 mechanism cho bất kỳ decision nào.

---

## 4. Deferred Items

Các quyết định/cơ chế sau **được DECISION-048 đặt ra yêu cầu nhưng không tự giải quyết** — nằm ngoài phạm vi của 1 Decision nguyên tắc (principle-level), thuộc về Round/Decision khác:

| # | Hạng mục | Thuộc phạm vi Round/Decision nào |
|---|---|---|
| 1 | Chọn Shared Mechanism (Header/Detail pattern hay khác) cho D1, D6, D7, D9a, D9b | Round 3.6 ([EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md)) — chưa chốt |
| 2 | Cơ chế Stuck Detection cụ thể (ngưỡng, hint-ladder vs direct-fix) — ảnh hưởng trực tiếp tới việc D9a/D9b có gì để gắn explainability vào | Open Question #6/#11 ([OpenQuestions.md](../01_PRD/OpenQuestions.md), đã thêm chú thích DECISION-048 ở Round 4.3) — chưa chốt |
| 3 | Xác minh điều kiện Runtime Reconstruction cho D8 (input có luôn truy xuất được từ domain khác không) | Phụ thuộc thiết kế Mode Selection cụ thể — chưa tồn tại ở Round nào |
| 4 | Mở rộng phạm vi `TraceLink` (DECISION-038, hiện chỉ "Recommendation, Assessment, Evidence") để phủ D1/D6/D7/D9a/D9b | Cần 1 cập nhật riêng cho DECISION-038 hoặc 1 Decision mới — không nằm trong DECISION-048 |
| 5 | Entity ghi log nội bộ cho Local Expansion (D5) — GAP-02 kế thừa | Open Question #21 ([OpenQuestions.md](../01_PRD/OpenQuestions.md)) — chưa chốt, DECISION-048 chỉ tái xác nhận yêu cầu gốc |
| 6 | Cardinality `roadmap_node_knowledge_node` ↔ lý do cụ thể (cột `dependency_reason`) cho D6 | GAP-05 kế thừa từ Round 3.5 — chưa chốt |
| 7 | Ranh giới sở hữu D9a giữa Mentor Interaction Domain và Teaching Capability | Round 3.9 mục 3 — chưa đóng |
| 8 | MentorSession chưa xuất hiện tường minh trong [PersistenceArchitecture.md](PersistenceArchitecture.md) mục 1 (Domain Persistence Matrix) — phát hiện ở Round 4.2, ảnh hưởng độ tin cậy của giả định Runtime Reconstruction cho D8 | Cần bổ sung 1 dòng cho Mentor Interaction Domain vào Persistence Architecture — chưa thực hiện |
| 9 | DECISION-027 không có forward-reference tới DECISION-048 (do quy ước "không sửa Decision đã khóa") | Rủi ro thuần về điều hướng tài liệu — chưa có quy ước "Superseded/Extended By" để đóng triệt để |
| 10 | Project_Index.md mục 7 (current status) có độ trễ — chưa phản ánh từng-round chi tiết của Round 3.6-4.2 (đã ghi chú tường minh trong Project_Index khi cập nhật ở Round 4.3, không backfill toàn bộ) | Document hygiene — không ảnh hưởng tính hợp lệ của DECISION-048, chỉ ảnh hưởng tốc độ tìm tài liệu của agent tương lai |

**Không có Deferred Item nào ở mức blocking cho việc lock** — toàn bộ là quyết định/cơ chế tầng dưới (mechanism-level), đúng theo phân tầng "DECISION-048 là nguyên tắc, không phải cơ chế" đã giữ xuyên suốt Round 4.0-4.2.

---

## 5. Traceability to Prior Decisions

```
DECISION-027 (Explainability First, Round 4 gốc)
   │  3 nhóm: Mastery / Recommendation / Knowledge Expansion
   ▼
Round 3.5-3.6  EXPLAINABILITY_GAP_ANALYSIS.md / EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md
   │  Phát hiện GAP-01 (Teaching), GAP-02 (Local Expansion) — phạm vi DECISION-027 không đủ
   ▼
Round 3.7  AI_DECISION_ARCHITECTURE_REVIEW.md
   │  Định nghĩa AI Decision (C1-C4), rà soát 7 Capability — tất cả đều sinh AI Decision
   ▼
Round 3.8  AI_DECISION_TAXONOMY.md / AI_DECISION_MATRIX.md
   │  9 Decision Type chính thức, Criticality/Persistence/Explainability cho từng cái
   │  Phát hiện Capability/Domain Boundary Problem (Teaching Engine ôm D1/D8/D9)
   ▼
Round 3.9  TEACHING_BOUNDARY_ANALYSIS.md / TEACHING_VS_MENTOR_INTERACTION_REVIEW.md / CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md
   │  Teaching = Capability, không Domain. D9 tách D9a/D9b. D8 thuộc Mentor Interaction Domain thật.
   │  → 10 Decision Type chính thức (D1-D9b)
   ▼
Round 4.0  DECISION-048 (draft) — mở rộng DECISION-027 sang 10 Decision Type, D8 ban đầu bị loại trừ
   ▼
Round 4.1  D8_EXPLAINABILITY_REVIEW.md
   │  Phát hiện draft mặc định "Not Persisted ⇒ Not Explainable" — sai. Explainability/Persistence độc lập.
   ▼
Round 4.2  DECISION-048 (cập nhật) + DECISION-048_FINAL_REVIEW.md
   │  D8: Explainability = Required qua Runtime Reconstruction. "Explicitly NOT Required" → "Out Of Scope".
   │  Consistency review vs DECISION-027/038/Taxonomy/Boundary/D8 Review — PASS, sẵn sàng lock.
   ▼
Round 4.3  DECISION-048 — ✅ LOCKED (tài liệu này)
```

**Tham chiếu trực tiếp (Related Decisions, không đổi từ Round 4.0):**
- [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md) — nguyên tắc gốc, được mở rộng, không bị thay thế.
- [DECISION-038-Traceability-Model](../11_Decisions/DECISION-038-Traceability-Model.md) — hạ tầng `TraceLink` thực thi DECISION-048 cho D2-D5; cần mở rộng phạm vi riêng cho D1/D6/D7/D9a/D9b (Deferred Item #4).
- [DECISION-019-Recommendation-Engine](../11_Decisions/DECISION-019-Recommendation-Engine.md) — xác nhận phạm vi Recommendation (D3) và chuỗi truy vết qua D7.
- [DECISION-023-Controlled-Knowledge-Expansion](../11_Decisions/DECISION-023-Controlled-Knowledge-Expansion.md) — nguồn yêu cầu explainability cho D4/D5.
- [DECISION-026-Assessment-Core-Domain](../11_Decisions/DECISION-026-Assessment-Core-Domain.md), [DECISION-030-Assessment-Result-Granularity](../11_Decisions/DECISION-030-Assessment-Result-Granularity.md) — nguồn yêu cầu explainability cho D2.
- [DECISION-031-SubSession-vs-MentorSession](../11_Decisions/DECISION-031-SubSession-vs-MentorSession.md) — xác nhận `MentorSession` write-owner bởi Mentor Interaction Domain, nền tảng cho việc D8 thuộc domain này.
- [DECISION-035-No-Full-Event-Sourcing](../11_Decisions/DECISION-035-No-Full-Event-Sourcing.md) — hỗ trợ cơ chế Runtime Reconstruction (Evidence/AssessmentResult append-only, có timestamp, truy xuất "as-of-time T" được).

**Tài liệu phân tích đã dẫn tới quyết định này (không phải Decision, nhưng là hồ sơ lý do bắt buộc tham chiếu khi cần hiểu "vì sao"):** [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW.md](AI_DECISION_ARCHITECTURE_REVIEW.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md), [TEACHING_BOUNDARY_ANALYSIS.md](TEACHING_BOUNDARY_ANALYSIS.md), [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md), [CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md](CAPABILITY_DOMAIN_OWNERSHIP_MATRIX.md), [D8_EXPLAINABILITY_REVIEW.md](D8_EXPLAINABILITY_REVIEW.md), [DECISION-048_FINAL_REVIEW.md](DECISION-048_FINAL_REVIEW.md), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md](EXPLAINABILITY_GAP_RESOLUTION_OPTIONS.md).

---

## 6. Đồng bộ tài liệu đã thực hiện ở Round 4.3

| Tài liệu | Thay đổi |
|---|---|
| [11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md) | Status: Draft → ✅ Accepted (Locked) |
| [11_Decisions/README.md](../11_Decisions/README.md) | Thêm dòng DECISION-048 vào Decisions Index |
| [Project_Index.md](../Project_Index.md) | Cập nhật số lượng quyết định khóa (45→46), thêm tóm tắt DECISION-048 ở mục 5, cập nhật "Giai đoạn hiện tại" ở mục 7 (kèm ghi chú độ trễ tài liệu Round 3.6-4.2, xem Deferred Item #10) |
| [01_PRD/OpenQuestions.md](../01_PRD/OpenQuestions.md) | Thêm chú thích DECISION-048 vào câu 6 (Stuck Detection — ràng buộc explainability mới, câu hỏi cơ chế vẫn mở) và câu 21 (Local Expansion log — tái xác nhận yêu cầu, chưa chọn cơ chế) — **không câu hỏi nào bị đóng**, chỉ thu hẹp/ghi chú |

**Không có Open Question nào bị đóng bởi DECISION-048** — đúng bản chất 1 Decision nguyên tắc (mở rộng yêu cầu) khác với 1 Decision cơ chế (chọn giải pháp cụ thể, mới thường đóng được Open Question).

## Liên kết ngược

[DECISION-048-All-AI-Decisions-Must-Be-Explainable](../11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md), [DECISION-048_FINAL_REVIEW.md](DECISION-048_FINAL_REVIEW.md), [D8_EXPLAINABILITY_REVIEW.md](D8_EXPLAINABILITY_REVIEW.md), [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md).
