# Migration Operational Runbook (WP-05)

## A. Service Startup

### A.1 Prerequisites
- Node/npm installed and compatible with project lockfile.
- Environment variables configured for backend runtime.
- No conflicting process bound to service port.
- Build passes: `npm run build`.
- Access to logs (stdout/stderr or centralized log sink).

### A.2 Startup Sequence
1. Navigate to backend:
   - `cd Apps/ai-backend`
2. Start service:
   - `npm run start:dev` (or production start command in deployment)
3. Confirm startup success:
   - Nest application started log appears.
4. Confirm route registration:
   - `/migration/run`, `/migration/validate`, `/migration/rollback` are mapped.

### A.3 Health Verification
- Perform smoke checks:
  - POST valid payload to `/migration/validate`.
- Confirm:
  - response envelope valid
  - traceId present
  - logs include structured fields

---

## B. Service Shutdown

### B.1 Graceful Shutdown
1. Stop process with standard signal/terminal interrupt.
2. Confirm no in-flight migration jobs are left in inconsistent state.
3. Verify process exits cleanly and port is released.
4. Archive final logs for traceability.

### B.2 Emergency Shutdown
Use only if graceful shutdown is unavailable:
1. Force kill process.
2. Immediately execute recovery checklist:
   - restart service
   - verify route registration
   - verify migration state consistency
3. Open incident record due to ungraceful stop.

---

## C. Migration Execution

### C.1 Pre-checks
- Confirm valid `jobId` exists.
- Confirm circuit breaker for target job is not in OPEN reject state.
- Confirm no active lock deadlock for target job.
- Confirm logging pipeline is operational.

### C.2 Execution Steps
1. Call `POST /migration/run` with:
   - JSON body `{ "jobId": "<id>" }`
   - `x-trace-id` header
2. Monitor logs by traceId.
3. Verify deterministic step progression:
   - PLAN → VALIDATE → EXECUTE → VERIFY → COMMIT

### C.3 Validation Steps
- Verify response contract:
  - success envelope on success
  - normalized error envelope on failure
- Verify final job state aligns with logs and expected outcome.

---

## D. Rollback Operations

### D.1 Rollback Triggers
- SQL execution failure
- timeout failure
- retry exhaustion
- explicit manual rollback request
- integrity check failure during VERIFY

### D.2 Rollback Sequence
1. Invoke `POST /migration/rollback` with `jobId`.
2. Confirm rollback executes in reverse-order step strategy.
3. Confirm rollback idempotency on repeated invocation.
4. Ensure no partial commit remains.

### D.3 Rollback Verification
- Validate final state is rolled back/failed-safe.
- Validate error envelope on rollback failure is normalized.
- Verify trace-linked logs include rollback phases and outcomes.

---

## E. Circuit Breaker Operations

### E.1 CLOSED State
- Normal execution allowed.
- Failures increment job-level breaker counters.

### E.2 OPEN State
- Triggered after threshold failures.
- New execution requests are rejected quickly with controlled response.
- No pipeline execution should proceed while OPEN.

### E.3 HALF_OPEN State
- Entered after cooldown.
- Limited trial execution allowed.
- Success returns to CLOSED.
- Failure returns to OPEN and resets cooldown timer.

Operational note:
- Capture state transition evidence in logs for each breaker transition.

---

## F. Incident Response

### F.1 Severity Levels
- **SEV-1**: Service unavailable, data integrity risk, unrecoverable migration fault.
- **SEV-2**: Critical degradation (timeouts/retries/circuit instability causing high failure rate).
- **SEV-3**: Non-critical functional issue with workaround.
- **SEV-4**: Documentation/observability cosmetic issue.

### F.2 Response Workflow
1. Detect and classify severity.
2. Freeze risky migration operations if integrity risk exists.
3. Capture evidence:
   - traceId, payload, responses, log excerpts
4. Contain impact:
   - disable offending job path or perform controlled rollback
5. Recover service.
6. Perform post-incident review and update checklist/report.

---

## G. Recovery Procedures

### G.1 Recovery Validation
After incident/failure:
1. Confirm service restart and route mapping.
2. Validate breaker state sanity.
3. Validate lock release state (no stuck job locks).
4. Run smoke tests for run/validate/rollback.
5. Confirm logs/metrics pipeline restored.

### G.2 Recovery Acceptance Criteria
Recovery accepted only when:
- Service stable for observation window.
- No open Sev-1/Sev-2 linked to migration operations.
- Endpoint contracts behave correctly.
- No partial commit or rollback corruption detected.
- Observability signals (traceId + structured logs) are complete.
