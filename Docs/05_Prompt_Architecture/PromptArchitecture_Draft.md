# Prompt Architecture Draft — AI Mentor OS

> Trạng thái: Draft. Đây là **contract** đầu vào/ra cho từng Capability — KHÔNG phải prompt engineering (chưa quyết định wording, few-shot, hay system prompt cụ thể). Mục đích: đảm bảo mọi prompt thật sau này tuân theo cùng một khung, không bị rời rạc giữa các điểm gọi AI.

## 1. Output Envelope chung

Mọi lời gọi AI, bất kể Capability nào, trả về một cấu trúc thống nhất:

```
{
  capability: <tên capability>,
  result: <nội dung chuyên biệt theo capability>,
  requires_confirmation: <boolean>,
  reasoning: <lý do ngắn, hiển thị được cho Learner — phục vụ nguyên tắc minh bạch>,
  traced_to: [<ID Evidence/AssessmentResult/DiscoverySession cụ thể>]  // mới, Round 4 — bắt buộc khi capability thay đổi Mastery/Recommendation/Knowledge Expansion
}
```

`requires_confirmation` được suy ra máy móc từ Human Control Boundaries trong [AIArchitecture_Draft.md](AIArchitecture_Draft.md) mục 3 — không để từng Capability tự quyết định tùy ý.

`traced_to` *(mới, Round 4 — [DECISION-027-Explainability-First](../11_Decisions/DECISION-027-Explainability-First.md))*: bắt buộc, không optional, cho mọi capability ghi vào Mastery/RecommendationProposal/KnowledgeNode. Rỗng `[]` không hợp lệ với 3 nhóm này — đây là cơ chế chặn "black-box decision" ở tầng contract, không chỉ ở tầng nguyên tắc.

## 2. Input Contract theo Capability (tối thiểu)

| Capability | Input bắt buộc | Input có điều kiện |
|---|---|---|
| Goal Clarification | Câu trả lời/raw input của Learner, lịch sử câu hỏi đã hỏi trong DiscoverySession hiện tại | Goal cũ (nếu đang làm rõ goal mới sau khi đổi goal) |
| Competency Probing | KnowledgeNode/kỹ năng đang được Learner tự nhận, câu trả lời/hành vi quan sát được | KnowledgeNodeMastery hiện tại nếu đã có dữ liệu trước đó |
| Roadmap Proposal | Goal, RoadmapNode cha đang được mở | KnowledgeNodeMastery liên quan |
| Teaching | KnowledgeNode, Learning Mode đang active, KnowledgeNodeMastery hiện tại của Learner cho KnowledgeNode | Câu hỏi cụ thể của Learner nếu có |
| Understanding Verification | KnowledgeNode, cấp độ đang verify (Explain/Apply/Teach), Evidence vừa tạo trong session | — |
| Socratic Guidance | KnowledgeNode, câu trả lời gần nhất của Learner | Lịch sử câu hỏi đã hỏi trong session (tránh hỏi lặp) |
| Stuck Detection & Support | Tín hiệu bế tắc (🔶 OPEN, xem AIArchitecture_Draft mục 5) | Lịch sử hint đã đưa ra (nếu mô hình hint tăng dần được chốt) |
| Continuous Discovery | Trạng thái Goal/KnowledgeNodeMastery hiện tại | — |
| Roadmap Critique | Lựa chọn cụ thể của Learner cần phản biện | SelfAssessmentMismatch liên quan |
| Knowledge Profile Synthesis | Toàn bộ KnowledgeNodeMastery của Learner | Goal History |
| Evidence Management | Nội dung tương tác vừa xảy ra, KnowledgeNode liên quan | KnowledgeNodeMastery hiện tại (so sánh phát hiện Regression theo Evidence Weight, *Round 3*) |
| Knowledge Node Expansion | KnowledgeNode cha, lý do cần mở rộng | Node con đã tồn tại nơi khác cùng Domain; RoadmapNode đang active (để phân loại Local/Deep, *Round 3*) |
| Recommendation *(mới, Round 3)* | KnowledgeRegressionDetected/SelfAssessmentMismatchDetected vừa xảy ra | Lịch sử RecommendationProposal đã đưa ra |

## 3. Output Contract theo Capability (tối thiểu)

| Capability | Trường output chuyên biệt | Cấm tuyệt đối |
|---|---|---|
| Goal Clarification | `next_question` hoặc `clarified_goal` | Không tự sinh Roadmap trong cùng lượt gọi này |
| Competency Probing | `assessed_level`, `mismatch_detected` (boolean + lý do) | Không tự sửa KnowledgeNodeMastery — chỉ đề xuất, ghi qua flow riêng |
| Roadmap Proposal | `proposed_nodes[]`, `rationale` | Không có trường nào tự mang nghĩa "đã áp dụng" — luôn ở trạng thái đề xuất |
| Teaching | `explanation`, `mental_model` (nếu có) | Không trả về full source code giải bài tập của Learner (nếu Gap/Câu 6 chốt theo hướng không sửa trực tiếp) |
| Understanding Verification | `verification_questions[]` và: với Remember/Explain(Level 2)/Apply → `verdict` (pass/fail); với **Teach** → `teach_score` (weighted composite, *ngoại lệ Round 3, DECISION-020*) | Không có trạng thái "partial" mơ hồ cho Remember/Explain/Apply — đạt/chưa đạt rõ ràng. Teach là ngoại lệ duy nhất, không áp pass/fail (xem ghi chú dưới) |
| Socratic Guidance | `guiding_question` | Không trả lời trực tiếp nội dung đang hỏi |
| Stuck Detection & Support | `hint_text` (cấp độ hint) hoặc `escalation_action` | 🔶 cấm cụ thể chờ xác nhận Gap 6 (OpenQuestions câu 6) |
| Roadmap Critique | `warning_text`, `risk_reasoning` | Không có trường "blocked"/"denied" — AI không được chặn hành động của Learner (nguyên tắc 7) |
| Knowledge Profile Synthesis | `summary_text` theo từng KnowledgeNode/Domain | Không tự suy ra hành động đề xuất (đó là việc của Roadmap Proposal/Critique, không trộn vào đây) |
| Evidence Management | `evidence_links[]` (mỗi link: `knowledge_node_id`, `direction` support/refute, `evidence_weight`, *cấu trúc mới Round 3*), `regression_detected` (boolean + lý do) | Không tự cập nhật KnowledgeNodeMastery trực tiếp — chỉ tạo Evidence/EvidenceLink, cập nhật chính thức do Knowledge Engine xử lý |
| Knowledge Node Expansion | `proposed_children[]`, `rationale`, `expansion_tier` (`local` \| `deep_structural`, *Round 3*) — nếu `deep_structural` thì `rationale` là bắt buộc, không optional | Không tự gắn node con vào Roadmap — Expansion Edge tách biệt khỏi Dependency Edge (DECISION-015) |
| Recommendation *(mới, Round 3)* | `recommended_action`, `target` (KnowledgeNode hoặc RoadmapNode), `reasoning` | Không có trường nào tự thực thi hành động — luôn ở trạng thái đề xuất, giống Roadmap Proposal (DECISION-019) |

## 4. Quy tắc dùng chung

1. Không Capability nào tự gọi sang Capability khác trực tiếp — việc điều phối (gọi Capability nào, khi nào) thuộc lớp Application/Use Case, không thuộc lớp Prompt.
2. Mọi `reasoning`/`rationale`/`warning_text` phải viết bằng ngôn ngữ Learner hiểu được — không phải log kỹ thuật nội bộ.
3. Capability không tự chọn KnowledgeNode ngoài phạm vi Context đã được nạp (theo [AIArchitecture_Draft.md](AIArchitecture_Draft.md) mục 4) — tránh AI "tự bịa" nội dung không có trong Knowledge Graph.

## 5. Còn thiếu, chờ vòng sau

- Wording/system prompt thật cho từng Capability — việc của bước "Prompt Engineering", sau khi Output/Input Contract này được Founder + ChatGPT xác nhận.
- Cơ chế chọn Learning Mode mặc định khi Learner chưa chọn (heuristic nào) — chưa có trong brief, cần bổ sung câu hỏi nếu thấy cần ở vòng sau.
