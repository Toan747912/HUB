# Goal API Error Mapping TODO

- [ ] Update `src/modules/goal/interface/filters/http-exception.filter.ts` to map application errors:
  - GoalNotFoundError -> 404 GOAL_NOT_FOUND
  - GoalVersionConflictError -> 409 VERSION_CONFLICT
  - GoalValidationError -> 400 VALIDATION_ERROR
  - GoalStateTransitionError -> 400 VALIDATION_ERROR
- [ ] Re-test GET /goal/:id (missing) expecting 404 + GOAL_NOT_FOUND
- [ ] Re-test DELETE /goal/:id (missing) expecting 404 + GOAL_NOT_FOUND
- [ ] Generate `GoalApiErrorMappingReport.md` with Root Cause, Mapping Table, Test Results, Classification
