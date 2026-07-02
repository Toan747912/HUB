# AI Decision Matrix (Round 3.8)

> Bảng tổng hợp 1 dòng / 1 Decision Type, rút gọn từ [AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md) để tra cứu nhanh. Không tạo entity/bảng/SQL — đây là ma trận phân tích, không phải schema. Không chốt quyết định.

| Decision Type | Capability Owner | Domain Owner | Explainable | Persisted | Criticality |
|---|---|---|---|---|---|
| D1 — Teaching: Content Selection | Teaching Engine | Mentor Interaction | Nên có — chưa locked | Persist Recommended | B — Important |
| D2 — Assessment: Evidence Verdict | Assessment Engine | Assessment | **CÓ** — locked (DECISION-027/030/038) | **Persist Required** — locked, implemented | **A — Critical** |
| D3 — Recommendation: Signal Synthesis | Recommendation Engine | Recommendation | **CÓ** — locked (DECISION-027) | **Persist Required** — locked, schema-provisioned, chưa build | B — Important |
| D4 — Knowledge Expansion: Deep/Structural | Knowledge Engine | Knowledge Graph | **CÓ, Shown to Learner** — locked (DECISION-023/027) | **Persist Required** — locked, implemented | **A — Critical** |
| D5 — Knowledge Expansion: Local | Knowledge Engine | Knowledge Graph | **CÓ, Internal-only** — locked (DECISION-027) | **Persist Required** — locked, **chưa implement** (GAP-02) | C — Optional |
| D6 — Roadmap Mapping: Dependency Edge Selection | Roadmap Engine | Goal & Roadmap | Nên có — chưa locked (GAP-05) | Persist Recommended — persisted nhưng thiếu lý do | B — Important |
| D7 — Discovery: Self-Assessment Mismatch Detection | Discovery Engine | Discovery | Nên có — chưa locked, cơ chế chưa chốt (Open Q#5) | Persist Recommended — entity tồn tại, lý do chưa chốt | B — Important |
| D8 — Mentor Interaction: Learning Mode Selection | Teaching Engine | Mentor Interaction | Chưa xác định | **Do Not Persist** (mặc định — re-derivable) | C — Optional |
| D9 — Mentor Interaction: Stuck Detection & Intervention Tier | Teaching Engine | Mentor Interaction | Chưa xác định, cơ chế chưa chốt (Open Q#6/#11) | Persist Recommended | B — Important (rủi ro leo lên A nếu intervention = direct fix) |

## Ghi chú đọc bảng

- **Cột "Explainable"** phản ánh **yêu cầu**, không phản ánh việc cơ chế lưu trữ đã tồn tại hay chưa — vd D5 "CÓ, locked" nhưng vẫn chưa có nơi lưu (xem cột Persisted + GAP-02).
- **Cột "Persisted"** dùng 4 giá trị đã định nghĩa ở Round này: `Persist Required` / `Persist Recommended` / `Persist Optional` (chưa có ứng viên ở Round 3.8) / `Do Not Persist`.
- **Capability Owner trùng nhau (Teaching Engine)** cho D1, D8, D9 — đây không phải lỗi nhập liệu, là phát hiện thật về cấu trúc hiện tại (1 Capability ôm 3 Decision Type có Criticality và Persistence rất khác nhau) — phân tích ở [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md) mục 3.
- **Domain Owner trùng nhau (Mentor Interaction)** cho D1, D8, D9 — cùng domain, cùng capability, nhưng 3 decision shape khác nhau (Selection / Selection / Detection-Classification) — phân tích ở mục 4 tài liệu trên.

## Liên kết ngược

[AI_DECISION_TAXONOMY.md](AI_DECISION_TAXONOMY.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md).
