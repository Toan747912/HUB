# Migration Observability Guide (WP-05)

## A. Logging Standards

### A.1 Log Format
- Structured JSON logs only.
- One event per significant migration transition/action.
- No sensitive payload leakage (credentials, secrets, private tokens).

### A.2 Required Fields
Every migration log entry must include:
- `traceId`
- `jobId`
- `step`
- `status`
- `latencyMs`
- `errorType`

Recommended additional fields:
- `timestamp`
- `module` (`MigrationModule`)
- `endpoint`
- `message`
- `retryCount`
- `circuitState`

### A.3 Field Semantics
- `traceId`: request-level correlation identifier.
- `jobId`: migration job identifier.
- `step`: pipeline step (`PLAN`, `VALIDATE`, `EXECUTE`, `VERIFY`, `COMMIT`, `ROLLBACK`).
- `status`: `SUCCESS`, `FAILED`, `REJECTED`, `TIMEOUT`.
- `latencyMs`: measured step latency in milliseconds.
- `errorType`: normalized error class/code (if any).

---

## B. Correlation Rules

1. Client sends `x-trace-id` header when possible.
2. Service must generate fallback traceId if absent.
3. Same traceId must appear in:
   - request context
   - response envelope
   - all logs for that request
4. Correlate by `(traceId, jobId)` for multi-step investigations.
5. For parallel runs, include per-request timestamp and endpoint for disambiguation.

---

## C. Metrics

### C.1 Core Reliability Metrics
- Migration success rate (%)
- Migration failure rate (%)
- Rollback rate (%)
- Retry occurrence rate
- Timeout rate
- Circuit breaker OPEN rate

### C.2 Performance Metrics
- P50 / P95 / P99 latency by endpoint
- Step-level latency (`PLAN`, `VALIDATE`, `EXECUTE`, `VERIFY`, `COMMIT`, `ROLLBACK`)
- End-to-end migration duration

### C.3 Concurrency Metrics
- Parallel requests per jobId
- Lock contention frequency
- Duplicate execution prevention count

---

## D. Alerting Rules

### D.1 High Severity Alerts
- Service startup failure or route mapping absent
- Error rate spike above threshold (e.g., >10% over 5 min)
- Timeout rate spike
- Circuit breaker OPEN sustained beyond cooldown windows
- Rollback failures

### D.2 Medium Severity Alerts
- Elevated retries with eventual success
- Increased p95 latency above SLO target
- Repeated validation failures indicating API misuse/contract drift

### D.3 Alert Payload Requirements
Each alert payload must include:
- `service`
- `environment`
- `traceId` (if available)
- `jobId` (if available)
- `errorType`
- first seen / last seen timestamps
- sample evidence link (logs/dashboards)

---

## E. Dashboard Design

### E.1 Executive Reliability Dashboard
Panels:
- Success vs failure trend
- Circuit breaker state distribution
- Retry and timeout trends
- Rollback invocation trend

### E.2 Pipeline Health Dashboard
Panels:
- Step-level latency distributions
- Step failure heatmap
- Pipeline completion ratio
- Deterministic order anomaly count

### E.3 API Contract Dashboard
Panels:
- Endpoint response code distribution
- 400 validation trends
- Normalized envelope compliance ratio
- traceId propagation compliance

### E.4 Security/Compliance Dashboard
Panels:
- Stack leakage detection count
- Sensitive field leakage detection count
- malformed input handling trend

---

## F. Failure Investigation Workflow

1. Start from incident alert.
2. Identify `traceId` and `jobId`.
3. Pull all correlated logs.
4. Determine failure class:
   - validation
   - execution
   - timeout
   - retry exhaustion
   - circuit breaker rejection
5. Verify state transitions and rollback behavior.
6. Confirm API contract response safety.
7. Record root cause and corrective action in incident tracker.
8. Add regression test/update checklist item if needed.

---

## G. Audit Logging Requirements

1. Log retention:
   - keep migration operational logs for compliance window defined by platform policy.
2. Tamper evidence:
   - logs stored in immutable or append-only sink where possible.
3. Access controls:
   - least-privilege access to operational logs.
4. Audit traceability:
   - each certification test case references log evidence by traceId.
5. Privacy and security:
   - redact or avoid sensitive payload fields.
6. Exportability:
   - logs and metrics exportable for audit-grade evidence packages.

---

## H. Observability Acceptance Criteria
Observability for MigrationModule is accepted when:
- Required log fields are present in all sampled paths.
- traceId propagation success is 100% in tested paths.
- Alerts fire correctly for injected failure scenarios.
- Dashboards provide actionable visibility for operations and QA.
- Audit log practices meet platform compliance standards.
