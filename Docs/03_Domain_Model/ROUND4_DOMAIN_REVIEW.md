# Round 4 Domain Review — AI Mentor OS

> Trạng thái: Báo cáo (không phải Decision Log). Tổng hợp tác động của DECISION-025/026/027, đối chiếu với rủi ro đã nêu ở [DOMAIN_ARCHITECTURE_REVIEW_ROUND3.md](DOMAIN_ARCHITECTURE_REVIEW_ROUND3.md), và khuyến nghị (không phải quyết định) về thời điểm có thể bắt đầu Database Design.

## 1. Tóm tắt 3 quyết định Round 4

| Quyết định | Nội dung | Đóng Open Question nào |
|---|---|---|
| [DECISION-025](../11_Decisions/DECISION-025-Knowledge-Graph-DAG.md) | Knowledge Graph là DAG — multi-parent, multi relation-type, cycle detection theo ngữ nghĩa graph (không phải cây) | Câu 16 |
| [DECISION-026](../11_Decisions/DECISION-026-Assessment-Core-Domain.md) | Assessment là Core Domain độc lập — nhận Evidence, đánh giá, là write-owner duy nhất của `KnowledgeNodeMastery`, sinh `AssessmentResult` | Câu 17 |
| [DECISION-027](../11_Decisions/DECISION-027-Explainability-First.md) | Mọi thay đổi Mastery/Recommendation/Knowledge Expansion phải có `traced_to[]` cụ thể — cấm quyết định hộp đen, kể cả Local Expansion (không hiển thị nhưng phải log nội bộ) | Không đóng câu nào trực tiếp, nhưng ràng buộc lên toàn bộ Capability ghi dữ liệu |

Cả 3 quyết định này đã được phản ánh vào [CoreDomainMap.md](CoreDomainMap.md), [AssessmentDomain.md](AssessmentDomain.md), [KnowledgeGraphModel.md](../../AI/KnowledgeEngine/KnowledgeGraphModel.md), [KnowledgeNode.md](../../AI/KnowledgeEngine/KnowledgeNode.md), [EvidenceModel.md](../../AI/EvidenceEngine/EvidenceModel.md), [AIArchitecture_Draft.md](../04_AI_Architecture/AIArchitecture_Draft.md), [PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md).

## 2. Tác động của DAG (DECISION-025) lên các lớp thiết kế tương lai

### 2.1 Database Design

- **Không còn `parent_id` đơn trên `knowledge_nodes`.** Quan hệ chuyển hoàn toàn sang bảng cạnh độc lập `knowledge_edges` (`from_node_id`, `to_node_id`, `relation_type`, `created_via`) — một node có thể xuất hiện nhiều lần là `to_node_id` từ các `from_node_id` khác nhau (multi-parent).
- **Cycle detection không còn là phép kiểm tra O(1)** ("node có phải cha của chính nó không") như cây — phải kiểm tra **reachability**: thêm cạnh A→B chỉ hợp lệ nếu B không thể reach tới A qua đường đi hiện có. Đây là quyết định kỹ thuật còn mở (câu 19), với 2 hướng đánh đổi rõ rệt:
  - **Runtime traversal mỗi lần thêm cạnh**: đơn giản hơn để bảo trì, không cần bảng phụ, nhưng chi phí đọc tăng theo độ sâu/độ rộng graph tại thời điểm ghi — chấp nhận được nếu Knowledge Graph không quá lớn/rậm trong giai đoạn đầu.
  - **Closure table** (bảng lưu sẵn toàn bộ cặp ancestor-descendant): đọc cực nhanh, nhưng mỗi lần thêm cạnh phải ghi lại nhiều dòng closure, và việc bảo trì đúng đắn (đặc biệt khi xóa/sửa cạnh) phức tạp hơn đáng kể.
  - 🔶 Đây là quyết định **chặn Database Design thực sự** — không thể thiết kế schema `knowledge_edges`/index liên quan nếu chưa chọn hướng.
- **Index 2 chiều bắt buộc**: cả `from_node_id` và `to_node_id` cần index riêng (trước đây với cây, chỉ cần index `parent_id` một chiều là đủ cho hầu hết truy vấn).
- **`relation_type` cần là cột có giá trị cố định** (enum hoặc bảng tham chiếu) — phụ thuộc câu 18 (danh sách đầy đủ) chưa chốt, nhưng không chặn schema cơ bản (có thể bắt đầu với enum mở, thêm giá trị sau).

### 2.2 Query Model

- **Truy vấn "tất cả node cha"/"tất cả node con"** không còn là single-row lookup hoặc simple walk — trở thành duyệt graph thực sự (recursive CTE hoặc graph traversal ở application layer), và phải **lọc theo `relation_type`** vì không phải mọi cạnh đều mang nghĩa cấu trúc (ví dụ `related_to` có thể không nên tính vào "ancestor chain" theo nghĩa sư phạm).
- **Rủi ro lớn nhất ở lớp Query**: nếu không phân loại rõ "structural" (ảnh hưởng tới mastery/roadmap logic, ví dụ `prerequisite_of`) vs "associative" (chỉ gợi ý liên quan, ví dụ `related_to`), các truy vấn downstream (Recommendation, Roadmap Proposal) dễ vô tình đếm cả cạnh associative vào logic "đã đủ điều kiện tiên quyết chưa" — gây sai lệch âm thầm, khó phát hiện qua test thông thường.
- Việc này không chặn Database Design (schema vẫn lưu được `relation_type` dù chưa phân loại xong), nhưng **chặn việc viết đúng business logic** ở Application layer sau này — nên câu 18 cần trả lời trước khi viết Query Model chi tiết, dù không cần trước khi tạo bảng.

### 2.3 Recommendation Engine

- Trước DAG: "tìm dependency gap" = đơn giản đi ngược từ node hiện tại lên 1 nhánh cha duy nhất.
- Sau DAG: một node có thể cần hiểu biết từ **nhiều nhánh cha độc lập** — Recommendation Engine phải xác định gap theo từng nhánh, không thể giả định "1 path dẫn tới node này".
- Phải quyết định: gap-detection chỉ tính cạnh `relation_type = prerequisite_of` (loại structural), hay cũng xét `expands_to`? Đây là hệ quả trực tiếp của câu 18 chưa chốt — Recommendation Engine không thể tự suy luận đúng nếu danh sách `relation_type` và ý nghĩa "có tính prerequisite hay không" của từng loại chưa rõ.
- Không chặn việc thiết kế Recommendation Engine ở mức nguyên tắc (đã có DECISION-019, AIArchitecture mục 2 #13), nhưng chặn việc viết thuật toán gap-detection cụ thể.

## 3. Tác động của Assessment Domain độc lập (DECISION-026)

- Đã tách rõ: Evidence Domain chỉ thu thập/phân loại (không quyết định Regression); Assessment Domain là cửa duy nhất ghi `KnowledgeNodeMastery` và sinh `AssessmentResult`.
- Tác động Database Design: cần bảng `assessment_results` riêng, tách khỏi `evidence`/`evidence_links`. Granularity của bảng này (1 row/Evidence hay 1 row/EvidenceLink) là câu 20 — **không chặn việc tạo bảng cơ bản**, nhưng ảnh hưởng cấu trúc cột (1 `knowledge_node_id` cụ thể hay danh sách).

## 4. Tác động của Explainability First (DECISION-027)

- Đã đưa `traced_to[]` vào Output Envelope chung — ràng buộc tầng contract, không chỉ nguyên tắc.
- Tác động Database Design: mọi bảng ghi Mastery/Recommendation/Expansion cần ít nhất 1 cột/bảng phụ lưu tham chiếu nguồn (`evidence_id`/`assessment_result_id`/`discovery_session_id`). Không chặn schema cơ bản, nhưng câu 21 (entity log nội bộ cho Local Expansion — dùng Domain Event lưu trữ lâu dài hay entity riêng) ảnh hưởng có cần thêm 1 bảng `expansion_log` hay tái dùng event store.

## 5. Việc gì đã đủ ổn định để Database Design bắt đầu phần tương ứng

✅ Có thể bắt đầu schema cho các phần này ngay, không cần chờ thêm:
- `knowledge_nodes` (entity cơ bản, không còn field `parent`/`children`)
- `evidence`, `evidence_links` (cấu trúc many-to-many đã chốt từ Round 3, DECISION-022)
- `assessment_results` (cấu trúc cơ bản — entity tồn tại, owner rõ; chỉ granularity còn mở, không chặn việc tạo bảng với khả năng mở rộng sau)
- `knowledge_edges` ở mức **cột cơ bản** (`from_node_id`, `to_node_id`, `relation_type` dạng enum mở, `created_via`) — miễn là không thiết kế cơ chế cycle detection cùng lúc

## 6. Việc gì còn chặn Database Design thực sự

🔶 Chỉ 1 điểm là **blocking thật sự** (không thể hoàn thiện schema/index liên quan nếu thiếu):
- **Câu 19 — cơ chế cycle detection** (runtime traversal vs closure table). Lý do: 2 hướng dẫn tới 2 schema khác nhau (có/không có bảng closure phụ, có/không cần trigger hoặc application-level lock khi ghi cạnh mới).

🔶 Các câu còn lại (18, 20, 21, và toàn bộ câu Round 1/3 chưa trả lời) **không chặn việc tạo bảng cơ bản**, nhưng nên trả lời trước khi viết Application/Query logic chi tiết, để tránh phải sửa lại nhiều nơi:
- Câu 18 (danh sách `relation_type`) — chặn Query Model/Recommendation logic, không chặn DDL.
- Câu 20 (`AssessmentResult` granularity) — ảnh hưởng cột, không ảnh hưởng việc bảng tồn tại.
- Câu 21 (entity log Local Expansion) — ảnh hưởng có thêm 1 bảng phụ hay không, mức độ nhỏ.
- Câu 12-15 (Round 3, capability_weight/evidence_weight/Controlled Expansion) — ảnh hưởng giá trị/công thức trong Application layer, không ảnh hưởng cấu trúc bảng.

## 7. Khuyến nghị (không phải quyết định)

Đề xuất của Claude, chờ Founder/ChatGPT xác nhận: **Database Design có thể bắt đầu ngay ở phạm vi schema cơ bản** (mục 5) **song song** với việc chờ trả lời câu 19, vì câu 19 chỉ ảnh hưởng riêng tới `knowledge_edges` và cơ chế ghi cạnh — không ảnh hưởng các bảng khác. Có thể tách Database Design thành 2 nhánh: (a) bảng không phụ thuộc cycle detection — làm ngay; (b) bảng/index cho `knowledge_edges` — chờ câu 19. Đây chỉ là đề xuất trình tự làm việc, không phải mở khóa chính thức DECISION-018 (Domain Modeling Phase) — quyết định mở khóa vẫn cần Founder xác nhận rõ.

## 8. Danh sách Open Questions mới phát sinh Round 4 (tổng hợp)

| Câu | Nội dung | Mức độ chặn |
|---|---|---|
| 18 | Danh sách `relation_type` đầy đủ cho `KnowledgeEdge` | Chặn Query Model/Recommendation, không chặn DDL |
| 19 | Cơ chế cycle detection (runtime traversal vs closure table) | **Chặn Database Design** (riêng `knowledge_edges`) |
| 20 | `AssessmentResult` granularity (per-Evidence vs per-EvidenceLink) | Không chặn DDL, ảnh hưởng cột |
| 21 | Entity ghi log nội bộ cho Local Expansion (event store đủ chưa, hay cần entity riêng) | Không chặn DDL, ảnh hưởng số lượng bảng |

Chi tiết từng câu: [OpenQuestions.md](../01_PRD/OpenQuestions.md) mục "Round 4".
