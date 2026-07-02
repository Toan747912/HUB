# Final Schema Dependency Graph

> Đồ thị phụ thuộc cuối cùng của toàn bộ 32 bảng đã sinh thật (Batch 0-5), thay thế vai trò "kế hoạch" của [MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) bằng trạng thái **đã thực thi**. Không bảng/cột/FK nào trong đồ thị này khác với SQL đã sinh — đây là bản ghi lại đúng thứ tự `CREATE`/`ALTER` đã chạy, không phải 1 thiết kế mới.

## 1. Nguyên tắc

- Mũi tên `A → B` nghĩa là "A có FK trỏ tới B" ⇒ B phải tồn tại trước A (hoặc trước khi FK của A được `ALTER ADD CONSTRAINT`).
- `(CASCADE)` / `(RESTRICT)` ghi trên mỗi mũi tên là delete action thật trong SQL đã sinh.
- Bảng `history.*` không có FK ngược về `public.*` (chỉ ghi bằng trigger) — không xuất hiện trong đồ thị phụ thuộc FK, liệt kê riêng ở mục 4.

## 2. Thứ tự migration đã chạy thật (6 batch)

```
Batch 0  — fn_set_updated_at, fn_increment_version_number, fn_write_history,
           schema history, extension pgcrypto       (0 bảng)

Batch 1  — learner → auth.users (RESTRICT)
           history.learner
           goal → learner (RESTRICT), goal → goal.supersedes_goal_id (RESTRICT, self)
           roadmap → goal (RESTRICT)
           roadmap_node → roadmap (CASCADE), roadmap_node → roadmap_node.parent (CASCADE, self)
           approval_record → roadmap (RESTRICT), → roadmap_node (RESTRICT), → learner (RESTRICT)

Batch 2  — knowledge_node                              (root, không FK)
           history.knowledge_node
           knowledge_edge → knowledge_node ×2 (RESTRICT, RESTRICT)
           roadmap_node_knowledge_node → roadmap_node (CASCADE), → knowledge_node (RESTRICT)
           evidence → learner (RESTRICT)                 [mentor_session_id: cột để trống, chưa FK]
           evidence_link → evidence (CASCADE), → knowledge_node (RESTRICT)
           assessment_result → learner (RESTRICT), → knowledge_node (RESTRICT)
           knowledge_node_mastery → learner (RESTRICT), → knowledge_node (RESTRICT),
                                    → assessment_result (RESTRICT)
           trace_link                                      (không FK vật lý, polymorphic)
           expansion_record → knowledge_node (RESTRICT)

Batch 3  — learning_session → learner (RESTRICT), → goal (RESTRICT)
           sub_session → learning_session (CASCADE), → roadmap_node (RESTRICT)
                        [knowledge_node_id: cột để trống, chưa FK]
           learning_session_transition → learning_session (RESTRICT)
           discovery_session → learner (RESTRICT)
           history.discovery_session
           self_assessment_mismatch → discovery_session (CASCADE), → knowledge_node (RESTRICT),
                                      → assessment_result (RESTRICT)
           mentor_session → learner (RESTRICT), → sub_session (RESTRICT)
           history.mentor_session
           recommendation_proposal → learner (RESTRICT)
           recommendation_proposal_response → recommendation_proposal (CASCADE)

           ── FORWARD DEPENDENCY CLOSURES (đóng ngay trong batch này) ──
           sub_session.knowledge_node_id → knowledge_node (RESTRICT)   [đóng]
           evidence.mentor_session_id → mentor_session (RESTRICT)      [đóng]

Batch 4  — decision_header → learner (RESTRICT)
           teaching_decision_detail → decision_header (RESTRICT), → mentor_session (RESTRICT),
                                      → knowledge_node (RESTRICT)
           local_expansion_decision_detail → decision_header (RESTRICT), → knowledge_node (RESTRICT)
           roadmap_mapping_decision_detail → decision_header (RESTRICT),
                                              → roadmap_node_knowledge_node (RESTRICT)
           stuck_detection_decision_detail → decision_header (RESTRICT), → sub_session (RESTRICT)
           intervention_decision_detail → decision_header (RESTRICT),
                                           → stuck_detection_decision_detail (RESTRICT)

           ── PATCH (decision_header_id, nullable) ──
           assessment_result → decision_header (RESTRICT)
           recommendation_proposal → decision_header (RESTRICT)
           expansion_record → decision_header (RESTRICT)
           self_assessment_mismatch → decision_header (RESTRICT)

           ── ENUM EXTENSION ──
           trace_link.source_type +3 giá trị (teaching_decision_detail,
           local_expansion_decision_detail, stuck_detection_decision_detail)

Batch 5  — 0 bảng, 0 FK mới — chỉ 3 CREATE INDEX đóng gap FK-index
           (assessment_result.knowledge_node_id,
            knowledge_node_mastery.knowledge_node_id,
            knowledge_node_mastery.last_assessment_result_id)
```

## 3. Kết luận về cycle

✅ **0 cycle thật** trong toàn bộ 28 bảng business. Mọi "forward dependency" xuất hiện trong lịch sử thiết kế (`sub_session.knowledge_node_id`, `evidence.mentor_session_id`) là hệ quả của việc chia 5 Design Round **tuần tự**, không phải phụ thuộc vòng tròn thật — cả 2 đã đóng tại Batch 3, ngay khi bảng đích tồn tại. Xác nhận lại — không cần XOR/lazy FK, không cần `DEFERRABLE`, không cần phá vỡ 1 FK nào để chạy migration.

2 self-reference hợp lệ (không phải cycle 2 bảng): `goal.supersedes_goal_id → goal.goal_id`, `roadmap_node.parent_roadmap_node_id → roadmap_node.roadmap_node_id` — cả 2 đều có `CHECK` chặn self-loop 1-hop (`ck_goal_no_self_supersede`, `ck_roadmap_node_no_self_parent`), và là cây/chuỗi tuyến tính nên không có cycle nhiều hop.

`knowledge_edge` (graph, không phải cây) **có khả năng** cycle nhiều hop về mặt cấu trúc dữ liệu (multi-parent DAG) — nhưng đây là rủi ro **dữ liệu**, không phải rủi ro **schema/migration**. Application Layer Runtime Reachability Check (DECISION-029) chịu trách nhiệm, không nằm trong phạm vi đồ thị migration này.

## 4. History tables (không tham gia đồ thị FK)

| History table | Nguồn (`public.*`) | Cơ chế ghi |
|---|---|---|
| `history.learner` | `learner` | `trg_learner_write_history` (AFTER UPDATE) |
| `history.knowledge_node` | `knowledge_node` | `trg_knowledge_node_write_history` |
| `history.discovery_session` | `discovery_session` | `trg_discovery_session_write_history` |
| `history.mentor_session` | `mentor_session` | `trg_mentor_session_write_history` |

## 5. Tổng kết số liệu

| Hạng mục | Số lượng |
|---|---|
| Bảng business | 28 |
| Bảng history | 4 |
| Tổng bảng | 32 |
| FK constraint (business, không tính history) | 41 |
| FK `CASCADE` | 7 (toàn bộ trong Aggregate Boundary) |
| FK `RESTRICT` | 34 |
| Forward dependency closure | 2 (đã đóng cả 2 tại Batch 3) |
| Cycle thật | 0 |

## Liên kết ngược

[MIGRATION_DEPENDENCY_GRAPH.md](MIGRATION_DEPENDENCY_GRAPH.md) (kế hoạch gốc), [SQL_BATCH5_REVIEW.md](SQL_BATCH5_REVIEW.md), [SQL_BATCH5_COMPLETION.sql](SQL_BATCH5_COMPLETION.sql), [FINAL_SCHEMA_READINESS_ASSESSMENT.md](FINAL_SCHEMA_READINESS_ASSESSMENT.md).
