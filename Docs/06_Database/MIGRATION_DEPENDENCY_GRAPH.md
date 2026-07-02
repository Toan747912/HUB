# Migration Dependency Graph — AI Mentor OS

> Phụ lục chi tiết cho [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 3. Liệt kê **mọi FK** xuyên 28 bảng, xác nhận **không có chu trình phụ thuộc thật (true cycle)** nào, và đưa ra 1 thứ tự topological hợp lệ đầy đủ. Không SQL.

## 1. Bảng phụ thuộc đầy đủ (Adjacency List)

Mỗi dòng: `Bảng → [bảng nó phụ thuộc qua FK NOT NULL]` (FK nullable đánh dấu riêng, không bắt buộc thứ tự tạo bảng nhưng vẫn cần bảng đích tồn tại trước khi `ALTER ADD CONSTRAINT`/insert dữ liệu thật).

| Bảng | Phụ thuộc FK NOT NULL | Phụ thuộc FK nullable | Round |
|---|---|---|---|
| `learner` | `auth.users` (ngoài hệ thống, Supabase quản lý) | — | 1 |
| `goal` | `learner` | `goal` (self, `supersedes_goal_id`) | 1 |
| `roadmap` | `goal` | — | 1 |
| `roadmap_node` | `roadmap`; `roadmap_node` (self, `parent_roadmap_node_id`) | — | 1 |
| `approval_record` | `roadmap`, `learner` (`approved_by_learner_id`) | `roadmap_node` | 1 |
| `learning_session` | `learner`, `goal` | — | 1 |
| `sub_session` | `learning_session` | `roadmap_node`, `knowledge_node` *(đóng ở Batch 2)* | 1 |
| `learning_session_transition` | `learning_session` | — | 1 |
| `knowledge_node` | — (gốc graph) | — | 2 |
| `knowledge_edge` | `knowledge_node` ×2 (`from_`/`to_`) | — | 2 |
| `evidence` | `learner` | `mentor_session` *(đóng ở Batch 4)* | 2 |
| `evidence_link` | `evidence`, `knowledge_node` | — | 2 |
| `assessment_result` | `learner`, `knowledge_node` | `decision_header` *(đóng ở Batch 5)* | 2 |
| `knowledge_node_mastery` | `learner`, `knowledge_node`, `assessment_result` (`last_assessment_result_id`) | — | 2 |
| `trace_link` | — (đa hình, không FK vật lý) | — | 2 |
| `roadmap_node_knowledge_node` | `roadmap_node`, `knowledge_node` | — | 3 |
| `expansion_record` | `knowledge_node` | `decision_header` *(đóng ở Batch 5)* | 3 |
| `discovery_session` | `learner` | — | 4 |
| `self_assessment_mismatch` | `discovery_session`, `knowledge_node` | `assessment_result` (`actual_assessment_result_id`), `decision_header` *(đóng ở Batch 5)* | 4 |
| `mentor_session` | `learner`, `sub_session` | — | 4 |
| `recommendation_proposal` | `learner` | `decision_header` *(đóng ở Batch 5)* | 4 |
| `recommendation_proposal_response` | `recommendation_proposal` | — | 4 |
| `decision_header` | `learner` | — | 5 |
| `teaching_decision_detail` | `decision_header`, `mentor_session`, `knowledge_node` | — | 5 |
| `local_expansion_decision_detail` | `decision_header`, `knowledge_node` | — | 5 |
| `roadmap_mapping_decision_detail` | `decision_header`, `roadmap_node_knowledge_node` | — | 5 |
| `stuck_detection_decision_detail` | `decision_header`, `sub_session` | — | 5 |
| `intervention_decision_detail` | `decision_header`, `stuck_detection_decision_detail` | — | 5 |

---

## 2. Xác nhận: Không có Cycle thật

Kiểm tra từng cặp "nghi ngờ" (2 bảng có vẻ phụ thuộc qua lại):

| Cặp nghi ngờ | `A → B`? | `B → A`? | Cycle? |
|---|---|---|---|
| `sub_session` ↔ `mentor_session` | `mentor_session.sub_session_id → sub_session` | `sub_session` **không** có FK nào tới `mentor_session` | ❌ Không cycle |
| `evidence` ↔ `mentor_session` | `evidence.mentor_session_id → mentor_session` (nullable) | `mentor_session` không FK tới `evidence` | ❌ Không cycle |
| `sub_session` ↔ `knowledge_node` | `sub_session.knowledge_node_id → knowledge_node` (nullable) | `knowledge_node` không FK tới `sub_session` | ❌ Không cycle |
| `assessment_result` ↔ `knowledge_node_mastery` | `knowledge_node_mastery.last_assessment_result_id → assessment_result` (NOT NULL) | `assessment_result` không FK tới `knowledge_node_mastery` | ❌ Không cycle |
| `decision_header` ↔ (9 bảng Detail) | mọi Detail `→ decision_header` | `decision_header` **không** FK tới bất kỳ Detail nào (đúng DECISION-049 — Header không trỏ xuôi) | ❌ Không cycle (đây là điểm DECISION-049 cố ý thiết kế để loại trừ cycle) |
| `stuck_detection_decision_detail` ↔ `intervention_decision_detail` | `intervention_decision_detail.stuck_detection_decision_detail_id → stuck_detection_decision_detail` | Chiều ngược không tồn tại | ❌ Không cycle |
| `discovery_session` ↔ `self_assessment_mismatch` | `self_assessment_mismatch.discovery_session_id → discovery_session` | Chiều ngược không tồn tại | ❌ Không cycle |

**Kết luận: 0/28 bảng nằm trong bất kỳ chu trình phụ thuộc nào.** Toàn bộ "forward dependency"/"cột giữ chỗ" ghi nhận ở Round 1-4 là tạo tác của quy trình Design tuần tự (mỗi Round chỉ biết phạm vi bảng của chính nó tại thời điểm viết) — **không phải** giới hạn cấu trúc dữ liệu thật. Điều này xác nhận lựa chọn đóng gói ở [SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md) mục 2 là an toàn theo cả 2 hướng (giữ 5 batch theo Round, hoặc gộp 1 batch flat).

---

## 3. Thứ tự Topological đầy đủ (1 lời giải hợp lệ, theo đúng Batch đã chọn)

```
Batch 0:  (không có bảng — chỉ extension/schema/trigger function)

Batch 1:  1. learner
          2. goal                    (← learner)
          3. roadmap                 (← goal)
          4. roadmap_node            (← roadmap, self)
          5. approval_record         (← roadmap, roadmap_node, learner)
          6. learning_session        (← learner, goal)
          7. sub_session             (← learning_session, roadmap_node)
          8. learning_session_transition (← learning_session)

Batch 2:  9.  knowledge_node          (gốc)
          10. knowledge_edge          (← knowledge_node ×2)
          11. evidence                (← learner)
          12. evidence_link           (← evidence, knowledge_node)
          13. assessment_result       (← learner, knowledge_node)
          14. knowledge_node_mastery  (← learner, knowledge_node, assessment_result)
          15. trace_link              (không FK)
          ⤷ CLOSURE: ALTER sub_session ADD FK knowledge_node_id → knowledge_node

Batch 3:  16. roadmap_node_knowledge_node (← roadmap_node, knowledge_node)
          17. expansion_record           (← knowledge_node)

Batch 4:  18. discovery_session             (← learner)
          19. self_assessment_mismatch      (← discovery_session, knowledge_node, [assessment_result])
          20. mentor_session                (← learner, sub_session)
          21. recommendation_proposal       (← learner)
          22. recommendation_proposal_response (← recommendation_proposal)
          ⤷ CLOSURE: ALTER evidence ADD FK mentor_session_id → mentor_session

Batch 5:  23. decision_header                    (← learner)
          24. teaching_decision_detail            (← decision_header, mentor_session, knowledge_node)
          25. local_expansion_decision_detail     (← decision_header, knowledge_node)
          26. roadmap_mapping_decision_detail      (← decision_header, roadmap_node_knowledge_node)
          27. stuck_detection_decision_detail       (← decision_header, sub_session)
          28. intervention_decision_detail          (← decision_header, stuck_detection_decision_detail)
          ⤷ CLOSURE: ALTER assessment_result/recommendation_proposal/expansion_record/self_assessment_mismatch
                      ADD COLUMN decision_header_id + FK → decision_header
          ⤷ CLOSURE: mở rộng ck_trace_link_source_type (+3 giá trị)

Batch 6:  RLS — ENABLE + POLICY cho 28 bảng (không có thứ tự phụ thuộc nội bộ, có thể chạy song song theo bảng)
```

**Mọi số thứ tự (1-28) tăng dần đúng nghĩa topological** — không bảng nào tham chiếu 1 bảng có số thứ tự lớn hơn nó (trừ 2 self-reference đã đánh dấu, hợp lệ vì PostgreSQL cho phép FK tự tham chiếu ngay trong cùng `CREATE TABLE`).

---

## 4. Bảng không có phụ thuộc nào (gốc của graph — tạo được bất cứ lúc nào sau Batch 0)

| Bảng | Lý do là gốc |
|---|---|
| `learner` | Chỉ phụ thuộc `auth.users` (ngoài hệ thống, luôn có sẵn từ Supabase Auth) |
| `knowledge_node` | Gốc của Knowledge Graph — không FK tới bảng nghiệp vụ nào khác |
| `trace_link` | Đa hình, không FK vật lý — có thể tạo bất cứ lúc nào sau khi schema tồn tại |

## Liên kết ngược

[SQL_GENERATION_MASTER_PLAN.md](SQL_GENERATION_MASTER_PLAN.md), [POSTGRESQL_FEATURE_MATRIX.md](POSTGRESQL_FEATURE_MATRIX.md), [DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md)–[DDL_ROUND5_DESIGN.md](DDL_ROUND5_DESIGN.md).

**Chưa có SQL nào được tạo — đây là graph phụ thuộc thuần, phục vụ lập kế hoạch thứ tự migration.**
