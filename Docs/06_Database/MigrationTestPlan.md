# Migration Test Plan (WP-05)

## 1. Objectives
- Certify MigrationModule reliability, correctness, and safety for production certification.
- Validate endpoint contracts, deterministic pipeline behavior, rollback guarantees, resilience controls, and observability.
- Ensure no security regressions in API response handling.

## 2. Scope
In scope:
- `POST /migration/run`
- `POST /migration/validate`
- `POST /migration/rollback`
- Cross-cutting controls: retry, timeout, circuit breaker, concurrency lock, structured logs, trace propagation.

Out of scope:
- Business logic redesign
- Non-migration modules

## 3. Test Environment
- App: `Apps/ai-backend`
- Runtime: NestJS (`npm run start:dev`)
- Build: `npm run build`
- Base URL: `http://localhost:3001`
- Test tooling:
  - curl / PowerShell Invoke-WebRequest
  - concurrent request runner (parallel curl/PowerShell jobs)
  - log capture from application stdout/stderr

## 4. Test Data Strategy
- Valid job: `job-1`
- Unknown job: `unknown-job`
- Invalid payload:
  - `{}`
  - `{"jobId":123}`
  - malformed JSON body
- Failure injection data:
  - step configured to fail SQL execution
  - step configured to exceed timeout threshold
  - transient SQL failure cases for retry testing

## 5. Success Criteria
- All mandatory tests pass.
- No Sev-1/Sev-2 defects.
- Error envelope normalized in all error paths.
- No stack traces in API responses.
- Deterministic order PLAN→VALIDATE→EXECUTE→VERIFY→COMMIT confirmed.
- Rollback and resilience controls verified with evidence.

---

## A. Endpoint Tests

### A-01 /migration/run happy path
- Purpose: Validate successful migration run API behavior.
- Steps:
  1. Send `POST /migration/run` with `{"jobId":"job-1"}` and `x-trace-id`.
- Expected Result:
  - 2xx response
  - `success=true`
  - `traceId` present
- Pass Criteria:
  - Response envelope valid and stable.

### A-02 /migration/validate happy path
- Purpose: Validate migration validation endpoint behavior.
- Steps:
  1. Send `POST /migration/validate` with valid payload.
- Expected Result:
  - 2xx response with valid success envelope.
- Pass Criteria:
  - Contract-compliant success response.

### A-03 /migration/rollback happy path
- Purpose: Validate rollback endpoint availability and contract.
- Steps:
  1. Send `POST /migration/rollback` with valid payload.
- Expected Result:
  - 2xx or controlled failure envelope depending on state.
- Pass Criteria:
  - No unnormalized errors; traceId present.

---

## B. Validation Tests

### B-01 Missing jobId
- Purpose: Confirm DTO validation and normalized 400.
- Steps:
  1. Send `{}` to each endpoint.
- Expected Result:
  - HTTP 400 with normalized error envelope.
- Pass Criteria:
  - `success=false`, `error`, `message`, `traceId` present.

### B-02 Invalid payload type
- Purpose: Confirm strict payload type validation.
- Steps:
  1. Send `{"jobId":123}`.
- Expected Result:
  - HTTP 400 normalized response.
- Pass Criteria:
  - No stack leakage; validation details safe and minimal.

### B-03 Malformed JSON
- Purpose: Ensure parser error handling is normalized and safe.
- Steps:
  1. Send malformed JSON payload to `/migration/run`.
- Expected Result:
  - HTTP 400 with normalized contract.
- Pass Criteria:
  - No stack traces or framework internals exposed.

---

## C. Pipeline Tests

### C-01 Deterministic pipeline sequence
- Purpose: Verify exact order PLAN→VALIDATE→EXECUTE→VERIFY→COMMIT.
- Steps:
  1. Trigger successful run.
  2. Collect logs by traceId.
- Expected Result:
  - Steps appear exactly once in required order.
- Pass Criteria:
  - No missing, duplicate, or out-of-order step.

---

## D. Rollback Tests

### D-01 Reverse rollback order
- Purpose: Verify rollback runs reverse order of executed steps.
- Steps:
  1. Inject execution failure after multiple steps.
  2. Inspect rollback logs.
- Expected Result:
  - rollback step order is reverse execution order.
- Pass Criteria:
  - Evidence confirms reverse sequence.

### D-02 No partial commit
- Purpose: Validate transactional safety on failure path.
- Steps:
  1. Trigger mid-execution failure.
  2. Verify final state.
- Expected Result:
  - No committed partial state.
- Pass Criteria:
  - Final state = failed/rolled_back, not committed.

### D-03 Idempotent rollback
- Purpose: Ensure repeated rollback is safe.
- Steps:
  1. Call rollback twice for same failed job.
- Expected Result:
  - Second rollback does not corrupt state.
- Pass Criteria:
  - Stable envelope and state.

---

## E. Concurrency Tests

### E-01 5 parallel same-job requests
- Purpose: Verify lock behavior.
- Steps:
  1. Fire 5 concurrent `/migration/run` requests for `job-1`.
- Expected Result:
  - Single effective execution path.
- Pass Criteria:
  - No race condition side-effects.

### E-02 Duplicate commit prevention
- Purpose: Ensure committed state not duplicated.
- Steps:
  1. Analyze responses and logs for commit operations.
- Expected Result:
  - Commit occurs once.
- Pass Criteria:
  - Exactly one commit event.

### E-03 Lock release verification
- Purpose: Ensure lock is not orphaned after completion/failure.
- Steps:
  1. Run concurrency case repeatedly.
- Expected Result:
  - Subsequent runs are not blocked indefinitely.
- Pass Criteria:
  - No deadlock symptoms.

---

## F. Retry Tests

### F-01 Transient SQL failure retry
- Purpose: Validate retry policy for transient failure.
- Steps:
  1. Inject transient SQL failure.
- Expected Result:
  - Retries occur up to configured policy.
- Pass Criteria:
  - Retry count and final outcome match policy.

### F-02 Retry exhaustion
- Purpose: Ensure controlled failure after max retries.
- Steps:
  1. Inject persistent failure.
- Expected Result:
  - Controlled error after retry limit.
- Pass Criteria:
  - Normalized error, no crash.

---

## G. Timeout Tests

### G-01 Step timeout handling
- Purpose: Validate 8-second timeout per step behavior.
- Steps:
  1. Inject long-running step > timeout threshold.
- Expected Result:
  - Safe abort and controlled failure.
- Pass Criteria:
  - Timeout is enforced and logged.

### G-02 Timeout rollback path
- Purpose: Confirm rollback invocation after timeout failure.
- Steps:
  1. Force timeout during execute phase.
- Expected Result:
  - rollback path triggered correctly.
- Pass Criteria:
  - Final state not partially committed.

---

## H. Circuit Breaker Tests

### H-01 Open after threshold failures
- Purpose: Validate breaker opens after configured failure count.
- Steps:
  1. Trigger failing run repeatedly.
- Expected Result:
  - Breaker transitions to OPEN after threshold.
- Pass Criteria:
  - OPEN state observed in behavior/logging.

### H-02 Reject while OPEN
- Purpose: Ensure open breaker blocks execution.
- Steps:
  1. Invoke run while breaker open.
- Expected Result:
  - Controlled rejection envelope.
- Pass Criteria:
  - No execution steps run.

### H-03 Cooldown recovery and close on success
- Purpose: Validate cooldown then recovery path.
- Steps:
  1. Wait cooldown.
  2. Re-run with success path.
- Expected Result:
  - Execution allowed and breaker closed on success.
- Pass Criteria:
  - State transitions observed in logs/behavior.

---

## I. Observability Tests

### I-01 Required log schema fields
- Purpose: Ensure structured logging completeness.
- Steps:
  1. Trigger success/failure requests.
  2. Inspect logs.
- Expected Result:
  - Fields present: `traceId`, `jobId`, `step`, `status`, `latencyMs`, `errorType`.
- Pass Criteria:
  - No missing required fields.

### I-02 Trace correlation
- Purpose: Verify response traceId equals log traceId.
- Steps:
  1. Send request with known traceId.
  2. Match with log entries.
- Expected Result:
  - End-to-end trace consistency.
- Pass Criteria:
  - 1:1 correlation confirmed.

---

## J. Security Tests

### J-01 No stack leakage
- Purpose: Prevent internal leakage in error responses.
- Steps:
  1. Trigger validation and runtime errors.
- Expected Result:
  - Normalized safe envelope only.
- Pass Criteria:
  - No stack, no sensitive internals.

### J-02 Invalid input protection
- Purpose: Confirm robust defensive handling of malformed/invalid input.
- Steps:
  1. Send malformed JSON and invalid types.
- Expected Result:
  - Controlled 4xx with normalized envelope.
- Pass Criteria:
  - No 5xx from malformed user input.

---

## Evidence Collection
For each test case collect:
- Test ID
- Timestamp
- Request (headers/body)
- HTTP status + response body
- Relevant log snippet
- Pass/Fail decision
- Defect link (if failed)
