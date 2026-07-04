# CI-004 — Automate OpenAPI & SDK Generation Pipeline

## Status

Deferred (not started)

## Summary

`npm run openapi:generate` (Apps/ai-backend) and `npm run sdk:generate`
(Apps/frontend) are currently run manually. See
[Apps/frontend/APIIntegrationGuide.md](../../../frontend/APIIntegrationGuide.md)
for the workflow.

## Trigger condition

Pick up this item when **at least one** of the following becomes true:

1. There are 2+ active developers on the project.
2. Frontend and backend start releasing independently.
3. The manual generation step gets skipped in practice (e.g. backend DTO
   changes break the frontend build ~3+ times in a month).
4. CI is already gating PR merges for other reasons.

## Planned scope (when triggered)

- Add a GitHub Actions step that runs both generation commands after backend
  changes.
- Add drift detection: regenerate the spec/client in CI and fail if the
  regenerated output differs from what's committed (generated SDK != committed
  SDK).

## Why deferred

Automating a two-command manual workflow before it has caused real pain adds
CI complexity without proven value for a single-developer project. Revisit
using the trigger conditions above, not on a fixed schedule.
