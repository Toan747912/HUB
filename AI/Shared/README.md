# AI Shared

Hợp đồng/cơ chế dùng chung cho mọi Engine: Output Envelope, Context System (always-load/conditional/never-load theo Capability), Human Control Boundaries.

Xem: [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../../Docs/04_AI_Architecture/AIArchitecture_Draft.md), [Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md](../../Docs/05_Prompt_Architecture/PromptArchitecture_Draft.md).

Chưa có spec implementation/code — khi có, nội dung ở đây nên là phần dùng chung được import bởi mọi engine khác trong `AI/`, tránh lặp lại logic Output Envelope ở từng engine.
