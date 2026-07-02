# Mastery Model — Engine-level Spec

> Theo [DECISION-009](../../Docs/11_Decisions/DECISION-009-Knowledge-Philosophy.md), [DECISION-016](../../Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md), [DECISION-017](../../Docs/11_Decisions/DECISION-017-Mastery-Framework.md), **[DECISION-020](../../Docs/11_Decisions/DECISION-020-Teach-Composite-Capability.md) (Round 3)**.

## Cấu trúc `KnowledgeNodeMastery` (Learner × Knowledge Node)

```
KnowledgeNodeMastery
├── Remember:  <đạt / chưa đạt>                 ← vẫn binary, KHÔNG đổi ở Round 3
├── Explain:   <đạt / chưa đạt>                 ← Level 2, KHÔNG phải Teach.Explain, vẫn binary
├── Apply:     <đạt / chưa đạt>                 ← vẫn binary
├── Teach:                                       ← Round 3: KHÔNG còn binary
│   ├── teach_score: <weighted composite score>  ← tổng hợp có trọng số từ 5 sub-capability dưới
│   ├── Explain (sub-capability)      ← khác Level 2 ở trên, xem ghi chú đặt tên
│   ├── Simplify
│   ├── Guide
│   ├── Review
│   └── Transfer Knowledge
│       (mỗi sub-capability có capability_weight riêng — 🔶 giá trị cụ thể chưa quyết định)
├── Evidence[]:    tham chiếu tới EvidenceLink (support/refute + evidence_weight) — xem AI/EvidenceEngine
├── Confidence:    🔶 kiểu dữ liệu chờ Architecture (Gap 5)
└── MasteryScore:  🔶 công thức tổng hợp toàn-node chờ Architecture (Gap 5) — Round 3 chỉ chốt công thức riêng cho Teach, chưa chốt công thức tổng MasteryScore cấp Node
```

⚠️ **Lưu ý quan trọng (Round 3):** Remember/Explain(Level 2)/Apply **vẫn giữ nguyên binary đạt/chưa đạt** theo [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../../Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md) (Round 1) — DECISION-020 chỉ tạo ngoại lệ cho **Teach**, không áp dụng weighted score cho 3 cấp độ còn lại. Đây không phải nghịch lý — chỉ là Teach có bản chất composite (5 sub-capability) còn 3 cấp độ kia không.

## Quy tắc cập nhật (Evidence-Based, không Time-Based)

- Mastery của 1 cấp độ/sub-capability chỉ thay đổi khi có Evidence mới liên quan trực tiếp tới nó.
- Positive Evidence → có thể nâng trạng thái (nếu đủ điều kiện — điều kiện cụ thể 🔶 OPEN).
- Negative Evidence → có thể kích hoạt **Knowledge Regression** — hạ trạng thái đã ghi nhận trước đó.
- Không có tiến trình tự động giảm theo thời gian (không đọc `last_used_at` để tính decay).

## ⚠️ Lưu ý đặt tên (rủi ro đã ghi nhận ở DECISION-017)

"Explain" xuất hiện 2 lần trong cấu trúc trên với 2 ý nghĩa khác nhau:
- `Remember/Explain/Apply/Teach.Explain` (Level 2) — Learner giải thích lại cho hệ thống/AI để tự xác nhận hiểu.
- `Teach.Explain` (sub-capability) — Learner giải thích cho **người khác**, là một phần biểu hiện của Teach.

Khi vào Database Design (sau khi mở khóa DECISION-018), 2 trường này cần tên cột/field khác nhau rõ ràng (ví dụ `level_explain` vs `teach_explain`) để tránh nhầm lẫn ở tầng implementation.

## Còn mở

**Đã đóng ở Round 3:**
- ~~Teach đạt được khi nào: 5/5 hay ngưỡng N/5?~~ → đóng bởi DECISION-020 (weighted score, không dùng ngưỡng pass/fail).
- ~~Số lượng Negative Evidence tối thiểu cho Regression?~~ → đóng bởi DECISION-021 (dựa trên Evidence Weight, không đếm số lượng).

**Còn mở:**
- Công thức tổng hợp MasteryScore cấp Node (Gap 5) — vẫn chưa có.
- `capability_weight` cụ thể cho từng sub-capability của Teach (DECISION-020) — 🔶 OPEN mới.
- `evidence_weight` — kiểu dữ liệu, ai gán, công thức (DECISION-021) — 🔶 OPEN mới.

Theo dõi tại [OpenQuestions.md](../../Docs/01_PRD/OpenQuestions.md) (câu 12+) và [Backlog.md](../../Docs/10_Backlog/Backlog.md).
