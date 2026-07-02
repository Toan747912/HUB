# Canonical Output Contract (Draft)

> Phase 1 Build — Discovery Engine. **Trạng thái: Draft — đề xuất kiến trúc, chưa Decision khóa.** Giải quyết mâu thuẫn bề mặt giữa Contract A (`goal_snapshot/competency_profile/mismatch_signals/confidence/reasoning/traced_to/next_step`, [DiscoveryAPIContract.md](DiscoveryAPIContract.md) mục 1) và Contract B (`capability/result/requires_confirmation/reasoning/traced_to`, [PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md) mục 1 — **đã khóa-liền-kề**, không phải Decision riêng nhưng đang được dùng làm chuẩn xuyên 13 Capability).
>
> **Nguyên tắc giải quyết:** không chọn A thắng B hay ngược lại — cả 2 đúng nhưng **ở 2 lớp khác nhau**, đã được [DiscoveryAPIContract.md](DiscoveryAPIContract.md) mục 5 gợi ý trước (lượt 1), tài liệu này hình thức hóa đầy đủ thành 1 hệ phân cấp 4 lớp.

## 1. Hệ phân cấp 4 lớp

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4 — Error Contract                                     │
│   (bao trùm, có thể xảy ra ở bất kỳ lớp nào dưới đây)         │
├─────────────────────────────────────────────────────────────┤
│ Layer 3 — Event Contract                                     │
│   (phát sinh SAU KHI Layer 1/2 ghi dữ liệu thành công)        │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 — API Contract  (= Contract A cũ)                    │
│   (tổng hợp 1..n Layer 1, do Application/Backend xây dựng)   │
├─────────────────────────────────────────────────────────────┤
│ Layer 1 — AI Capability Contract  (= Contract B cũ)           │
│   (output thô của 1 lời gọi AI, theo PromptArchitecture)      │
└─────────────────────────────────────────────────────────────┘
```

**Quy tắc dòng chảy:** Layer 1 → (Application Layer tổng hợp, không phải AI) → Layer 2 → (nếu ghi DB thành công) → Layer 3. Layer 4 không nằm trong dòng chảy tuyến tính — nó là **đường thoát** khỏi bất kỳ điểm nào trong 3 lớp trên khi có lỗi.

## 2. Layer 1 — AI Capability Contract

**Không đổi so với [PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md) mục 1** — giữ nguyên `capability/result/requires_confirmation/reasoning/traced_to`. Đổi tên gọi (không đổi cấu trúc) thành **"Capability Output Envelope"** để phân biệt rõ với Layer 2, tránh nhầm "Output Envelope" trần trụi chỉ về 1 trong 2 lớp.

```json
{
  "capability": "self_assessment_mismatch_detection",
  "result": { "...": "chuyên biệt theo capability, xem PromptArchitecture_Draft.md mục 3" },
  "requires_confirmation": false,
  "reasoning": "...",
  "traced_to": ["discovery_answer:<id>"]
}
```

**Phạm vi:** 1 lời gọi AI = 1 envelope. 1 request API (`POST /api/discovery/answer`) có thể sinh **nhiều** Capability Output Envelope (ví dụ: Competency Probe Prompt + Mismatch Detector Prompt trong cùng 1 request, theo [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 1).

## 3. Layer 2 — API Contract

**Không đổi so với [DiscoveryAPIContract.md](DiscoveryAPIContract.md) mục 1** — giữ nguyên `goal_snapshot/competency_profile/mismatch_signals/confidence/reasoning/traced_to/next_step`. Đổi tên gọi thành **"Session Output Envelope"**.

**Thuật toán tổng hợp (Application Layer, không phải AI) — chính thức hóa quan hệ với Layer 1:**

| Trường Layer 2 | Suy ra từ Layer 1 như thế nào |
|---|---|
| `goal_snapshot` | `result.clarified_goal` của Capability Output Envelope gần nhất từ Goal Clarification (nếu có trong request này), hoặc đọc thẳng `Goal` hiện tại nếu không có lời gọi Goal Clarification trong request |
| `competency_profile` | Gộp `result.assessed_level` từ mọi Capability Output Envelope của Competency Probing trong session (không chỉ request hiện tại — đọc toàn bộ `CompetencySignal[]` đã lưu) |
| `mismatch_signals` | Gộp `result.mismatch_found = true` từ mọi Capability Output Envelope của Mismatch Detector trong session |
| `confidence` | Hàm tổng hợp trên tập `CompetencySignal` (xem [SelfAssessmentMismatchMechanism.md](../03_Domain_Model/SelfAssessmentMismatchMechanism.md) mục 4 — hình dạng, không có số) |
| `reasoning` | Nếu request hiện tại chỉ gọi 1 Capability → dùng `reasoning` của envelope đó; nếu gọi nhiều → Application Layer nối ngắn gọn (🔶 chưa có quy tắc nối cụ thể, xem Risks) |
| `traced_to` | **Hợp (union)** toàn bộ `traced_to[]` của mọi Capability Output Envelope trong request — không trùng lặp ID |
| `next_step` | Suy từ `DiscoverySession.state` sau khi request xử lý xong (theo [DiscoveryLifecycle.md](../03_Domain_Model/DiscoveryLifecycle.md) mục 1) — `"continue"`, `"complete"`, `"blocked"`, `"expired"`, hoặc `"abandoned"` (locked by DECISION-051 and DECISION-054) |

**`requires_confirmation` không xuất hiện ở Layer 2** — đây là quyết định có chủ ý: tại Layer 2, mọi `requires_confirmation = true` ở Layer 1 (nếu có) được xử lý **trước khi** tổng hợp thành Session Envelope, không lộ ra ngoài như 1 cờ rời — Application Layer chặn/route riêng các action cần xác nhận (ví dụ Goal Clarifier `clarified_goal` cần confirm, theo [DiscoveryPromptArchitecture.md](../05_Prompt_Architecture/DiscoveryPromptArchitecture.md) mục 2), không trộn vào response chính.

## 4. Layer 3 — Event Contract (mới)

**Chưa tồn tại trước đây trong project** — chỉ có tên Domain Event (`DiscoverySessionStarted`, `DiscoverySessionCompleted`, `SelfAssessmentMismatchDetected`, [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) mục 5) nhưng chưa có **shape chuẩn**. Đề xuất, tái sử dụng pattern `actor_type`/`actor_id` đã khóa ([DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 10):

```json
{
  "event_type": "SelfAssessmentMismatchDetected",
  "occurred_at": "2026-06-30T12:00:00Z",
  "aggregate_type": "discovery_session",
  "aggregate_id": "<discovery_session_id>",
  "payload": { "self_assessment_mismatch_id": "...", "knowledge_node_id": "..." },
  "traced_to": ["discovery_answer:<id>"],
  "actor_type": "ai_service",
  "actor_id": null
}
```

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `event_type` | Có | Tên Domain Event đã khóa (3 tên ở [DiscoveryDomain.md](../03_Domain_Model/DiscoveryDomain.md) mục 5) |
| `occurred_at` | Có | Timestamp ghi nhận, không phải timestamp xử lý (có thể lệch nếu Eventual, [DiscoveryAPIContract.md](DiscoveryAPIContract.md) mục 2.2) |
| `aggregate_type` / `aggregate_id` | Có | Luôn `discovery_session` ở Phase 1 — Discovery chỉ có 1 Aggregate Root |
| `payload` | Có | Tối thiểu — chỉ ID, không nhúng toàn bộ entity (tránh Event quá nặng, nhất quán cách `TraceLink` tách khỏi entity nghiệp vụ, [DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md)) |
| `traced_to` | Có điều kiện | Bắt buộc không rỗng cho `SelfAssessmentMismatchDetected` (D7, DECISION-048) — không bắt buộc cho `DiscoverySessionStarted`/`Completed` (không phải AI Decision, chỉ là chuyển trạng thái) |
| `actor_type` / `actor_id` | Có | Tái dùng enum đã khóa (`learner`/`backend_core`/`ai_service`, [DatabaseNamingConvention.md](../06_Database/DatabaseNamingConvention.md) mục 10) |

**Quan hệ với Layer 2:** Event chỉ phát **sau khi** Session Output Envelope (Layer 2) đã được ghi DB thành công — không phát Event cho 1 response đã trả về Layer 4 (Error).

## 5. Layer 4 — Error Contract (mới)

**Chưa tồn tại trước đây trong project** — gap thật, không phải tùy chọn. Lý do bắt buộc thiết kế: [AI_SERVICE_API_REVIEW.md](AI_SERVICE_API_REVIEW.md) mục 8 (D8) đã ghi nhận **"Silent failure risk"** là "rủi ro explainability nghiêm trọng nhất tìm được, không phát hiện được bằng monitoring lỗi thông thường" — Discovery (D7) có cùng loại rủi ro nếu `traced_to[]` bắt buộc (mục 4 ở trên) mà thiếu, và không có Error Contract để báo lỗi tường minh thay vì âm thầm bỏ qua.

```json
{
  "error_code": "EXPLAINABILITY_TRACE_MISSING",
  "message": "Không thể xác nhận lý do — vui lòng thử lại",
  "capability": "self_assessment_mismatch_detection",
  "retriable": false,
  "trace_id": "<request correlation id>"
}
```

| `error_code` (đề xuất danh sách khởi điểm, chưa đóng) | Khi nào | `retriable` |
|---|---|---|
| `VALIDATION_FAILED` | Request thiếu trường bắt buộc (ví dụ `raw_input` rỗng ở `POST /api/discovery/answer`) | `true` — Learner sửa input rồi gửi lại |
| `EXPLAINABILITY_TRACE_MISSING` | 1 Capability Output Envelope trả `mismatch_found = true` nhưng `traced_to[]` rỗng — **chặn cứng ở Application Layer, không cho qua Layer 2** (thực thi DECISION-048 ở tầng contract, không chỉ tầng nguyên tắc — học từ rủi ro D8 nêu trên) | `false` — đây là lỗi hệ thống (AI Service vi phạm contract), không phải lỗi Learner |
| `SESSION_BLOCKED` | Request gửi vào 1 `DiscoverySession` đang ở `BLOCKED` mà không đi qua transition hợp lệ ([DiscoveryStateMachine.md](../03_Domain_Model/DiscoveryStateMachine.md) mục 2) | `true` — qua route resume riêng |
| `CAPABILITY_CALL_FAILED` | Lời gọi AI Service thất bại (timeout, lỗi hạ tầng) | `true` |

**`message`** luôn bằng ngôn ngữ Learner hiểu được (nhất quán [PromptArchitecture_Draft.md](../05_Prompt_Architecture/PromptArchitecture_Draft.md) mục 4 quy tắc 2) — chi tiết kỹ thuật (nếu cần debug) đi kèm `trace_id`, tra cứu log riêng, không nhúng vào `message`.

**Không có Error Contract nào được phép "nuốt" 1 vi phạm Explainability (DECISION-048) thành response thành công** — đây là quy tắc cốt lõi của Layer 4, trực tiếp đóng lại rủi ro D8 đã ghi nhận, áp dụng phòng ngừa cho D7 trước khi nó xảy ra (thay vì phát hiện sau).

## 6. Đối chiếu tổng thể

| | Layer 1 (Capability) | Layer 2 (API/Session) | Layer 3 (Event) | Layer 4 (Error) |
|---|---|---|---|---|
| Ai tạo ra? | AI Service (1 lời gọi) | Backend/Application (tổng hợp) | Backend (sau khi ghi DB) | Bất kỳ lớp nào phát hiện lỗi |
| Tần suất | 1-n lần / 1 API request | 1 lần / 1 API request | 0-n lần / 1 API request (1 event / Domain Event xảy ra) | 0-1 lần / 1 API request (thay thế Layer 2 nếu xảy ra) |
| `traced_to` bắt buộc khi nào | Theo Capability (PromptArchitecture_Draft mục 1) | Hợp từ Layer 1 | Theo Event Type (mục 4) | Không áp dụng (đây chính là cơ chế phát hiện thiếu traced_to) |
| Đã khóa/locked-adjacent? | Có (PromptArchitecture_Draft.md, dùng xuyên 13 Capability) | Có (DiscoveryAPIContract.md, lượt 1) | Không — mới hoàn toàn | Không — mới hoàn toàn |

## 7. Risks

1. **Quy tắc nối `reasoning` khi 1 request gọi nhiều Capability (mục 3) chưa cụ thể** — chỉ đề xuất "Application Layer nối ngắn gọn", chưa có thuật toán/template.
2. **`next_step` không có giá trị cho `BLOCKED`** — Layer 2 hiện chỉ có `continue`/`complete`; khi `DiscoverySession` chuyển `BLOCKED` ([DiscoveryCompletionCriteria.md](../03_Domain_Model/DiscoveryCompletionCriteria.md) mục 7), Session Output Envelope cần 1 giá trị `next_step` thứ 3 (đề xuất `"blocked"`) — **đề xuất bổ sung, chưa tự sửa [DiscoveryAPIContract.md](DiscoveryAPIContract.md) mục 1** trong tài liệu này (xem Generated Documents).
3. **Danh sách `error_code` ở mục 5 chỉ là khởi điểm** — chưa rà soát hết mọi failure mode có thể (ví dụ race condition giữa 2 request `answer` cùng lúc cho 1 session — liên quan Idempotency, [DiscoveryAPIContract.md](DiscoveryAPIContract.md) Risk #2 cũ).
4. **Event Contract (Layer 3) chưa có cơ chế delivery cụ thể** (message queue? domain event table? Outbox pattern?) — tài liệu này chỉ định nghĩa **shape**, không định nghĩa **cơ chế truyền tải**, đúng giới hạn Phase Design hiện tại (không code/infrastructure).
5. **Layer 4 `EXPLAINABILITY_TRACE_MISSING` ngụ ý Application Layer phải tự validate `traced_to[]` không rỗng trước khi build Layer 2** — đây là 1 trách nhiệm mới cho Application Layer chưa từng được giao tường minh ở tài liệu nào trước đó; nhất quán với tinh thần DECISION-048 nhưng **là đề xuất cơ chế thực thi cụ thể, chưa được xác nhận**.
