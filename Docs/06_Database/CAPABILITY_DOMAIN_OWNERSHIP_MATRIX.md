# Capability / Domain Ownership Matrix — Teaching Boundary (Round 3.9)

> Rút gọn từ [TEACHING_BOUNDARY_ANALYSIS.md](TEACHING_BOUNDARY_ANALYSIS.md) và [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md) để tra cứu nhanh. Không tạo entity/bảng/SQL. Không chốt quyết định — cột "Đề xuất" là khuyến nghị, không phải trạng thái đã khoá.

## 1. Ma trận theo Decision

| Decision | Aggregate Root riêng? | Domain Owner (hiện tại, Round 3.7/3.8) | Domain Owner (đề xuất, Round 3.9) | Capability Owner (hiện tại) | Capability Owner (đề xuất) | Persistence | Explainability |
|---|---|---|---|---|---|---|---|
| Content Selection (D1) | Không | Mentor Interaction *(gán theo vị trí)* | **Không có Domain sở hữu** — chỉ có domain cung cấp input (Roadmap, Knowledge, Assessment, Recommendation) | Teaching Engine | **Teaching Capability** (giữ nguyên, vai trò Orchestrator) | Persist Recommended | Nên có, chưa locked |
| Mode Selection (D8) | Có (`MentorSession`) | Mentor Interaction | **Mentor Interaction** (không đổi, nhưng nay là sở hữu thật, không phải gán theo vị trí) | Teaching Engine | **Mentor Interaction Domain tự quyết** (tách ra khỏi "Teaching") | Do Not Persist | Chưa xác định |
| Stuck Detection — phần Detection (D9a) | Không | Mentor Interaction *(gán theo vị trí)* | Gần Mentor Interaction nhất (đọc tín hiệu trong session), nhưng **chưa đóng hẳn** | Teaching Engine | Chưa xác định — cần Round riêng | Persist Recommended | Chưa xác định, cơ chế chưa chốt |
| Stuck Detection — phần Intervention Tier (D9b) | Không | Mentor Interaction *(gán theo vị trí)* | **Không có Domain sở hữu** — trùng bản chất với Content Selection | Teaching Engine | **Teaching Capability** | Persist Recommended | Chưa xác định, cơ chế chưa chốt |

## 2. Ma trận theo Domain (Boundary Analysis)

| Domain | Cung cấp input cho Teaching? | Bị Teaching ghi vào? | Loại quan hệ |
|---|---|---|---|
| Roadmap (Goal & Roadmap) | Có (`roadmap_node_knowledge_node`) | Không | Read-only |
| Knowledge Graph | Có (`knowledge_edge`) | Không | Read-only |
| Assessment | Có (`knowledge_node_mastery`) — nhiều nhất | Không | Read-only |
| Recommendation | Có (`RecommendationProposal`, semantic coupling cao hơn 3 domain trên) | Không | Read-only, nhưng có thể định hướng quyết định |
| Mentor Interaction | Có (context: session/Mode đang active) | **Có** (Mode Selection ghi vào `MentorSession`) | Hỗn hợp — Read (context) + Write (vào Aggregate của chính domain này, không phải Teaching mượn quyền) |

## 3. Tóm tắt thay đổi đề xuất so với Round 3.7/3.8

| # | Thay đổi đề xuất | Vì sao |
|---|---|---|
| 1 | Content Selection: bỏ gán "Domain Owner = Mentor Interaction", chuyển thành "không có Domain Owner, chỉ có Capability Owner" | Không có Aggregate Root, không ghi vào domain nào — gán Domain trước đây là gán theo vị trí, không theo write-ownership |
| 2 | Mode Selection: bỏ gán "Capability Owner = Teaching Engine", xác nhận là quyết định nội tại của Mentor Interaction Domain | Ghi vào Aggregate (`MentorSession`) mà Mentor Interaction đã sở hữu từ trước — không cần "Teaching" làm trung gian |
| 3 | Stuck Detection: tách thành D9a (Detection) và D9b (Intervention Tier) — không tiếp tục coi là 1 decision nguyên khối | D9a gần Mentor Interaction, D9b trùng bản chất Content Selection — gộp chung sẽ tiếp tục gây nhầm lẫn khi thiết kế persistence |

**Cả 3 thay đổi trên đều là khuyến nghị (xem [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md) Final Section) — chưa cập nhật vào [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md) (Round 3.8) hay [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md) chính thức, vì đó là sửa lại tài liệu đã tồn tại — cần Founder/ChatGPT Lead Architect xác nhận trước.**

## Liên kết ngược

[TEACHING_BOUNDARY_ANALYSIS.md](TEACHING_BOUNDARY_ANALYSIS.md), [TEACHING_VS_MENTOR_INTERACTION_REVIEW.md](TEACHING_VS_MENTOR_INTERACTION_REVIEW.md), [AI_DECISION_MATRIX.md](AI_DECISION_MATRIX.md), [AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md](AI_DECISION_ARCHITECTURE_REVIEW_ROUND38.md).
