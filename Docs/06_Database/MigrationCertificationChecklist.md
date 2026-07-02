# Migration Certification Checklist (WP-05)

Status values:
- `PASS`
- `FAIL`
- `BLOCKED`
- `N/A`
- `PENDING`

---

## 1. Build Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-BLD-001 | Production build succeeds | `npm run build` output and exit code | Exit code = 0, no TS compile errors | PENDING |
| CERT-BLD-002 | No migration compile regression | Build log filtered for migration files | No errors from `src/modules/migration/**` | PENDING |
| CERT-BLD-003 | Dependency integrity maintained | lockfile diff and package audit note | No unintended dependency changes | PENDING |

---

## 2. Runtime Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-001 | Service starts successfully | startup logs | Nest app starts without fatal exception | PENDING |
| CERT-RT-002 | Migration routes are registered | route mapping logs | `/migration/run`, `/migration/validate`, `/migration/rollback` mapped | PENDING |
| CERT-RT-003 | Runtime stability baseline | 15+ min runtime observation | No crash/restart/unhandled fatal errors | PENDING |

---

## 3. Endpoint Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-API-001 | `/migration/run` happy path | request/response + logs | HTTP 2xx, success envelope, traceId present | PENDING |
| CERT-API-002 | `/migration/validate` happy path | request/response + logs | HTTP 2xx, success envelope, traceId present | PENDING |
| CERT-API-003 | `/migration/rollback` contract behavior | request/response + logs | Controlled envelope (success/failure), traceId present | PENDING |
| CERT-API-004 | Error envelope normalization | 4xx/5xx samples | `success=false,error,message,traceId` contract met | PENDING |

---

## 4. Validation Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-API-005 | Missing `jobId` returns 400 | request `{}` + response | HTTP 400 normalized envelope | PENDING |
| CERT-API-006 | Invalid `jobId` type rejected | `{"jobId":123}` response | HTTP 400 normalized envelope | PENDING |
| CERT-API-007 | Malformed JSON handling | malformed body response | HTTP 400 safe error; no stack leakage | PENDING |

---

## 5. Pipeline Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-004 | Deterministic step order | trace-linked logs | PLAN→VALIDATE→EXECUTE→VERIFY→COMMIT exact order | PENDING |
| CERT-RT-005 | No duplicate/missing steps | per-trace step count | Each step once per successful run | PENDING |
| CERT-RT-006 | Pipeline terminal state integrity | final state logs + response | Committed only on complete success | PENDING |

---

## 6. Rollback Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-007 | Rollback triggers on execution failure | failure injection logs | rollback initiated automatically | PENDING |
| CERT-RT-008 | Reverse execution rollback order | step order logs | rollback sequence is reverse of executed steps | PENDING |
| CERT-RT-009 | No partial commit state | state verification evidence | no partial committed artifact/state | PENDING |
| CERT-RT-010 | Rollback idempotency | repeated rollback evidence | second rollback safe and deterministic | PENDING |

---

## 7. Retry Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-011 | Transient SQL failures retried | retry logs with counters | retries occur up to max policy | PENDING |
| CERT-RT-012 | Retry count bounded | persistent failure evidence | retries stop at configured maximum (3) | PENDING |
| CERT-RT-013 | Retry exhaustion handled safely | response + logs | normalized failure envelope, no crash | PENDING |

---

## 8. Timeout Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-014 | Step timeout enforced | injected slow step logs | timeout at configured threshold (8s) | PENDING |
| CERT-RT-015 | Safe abort on timeout | state + response | aborted safely, no partial commit | PENDING |
| CERT-RT-016 | Timeout triggers rollback | timeout + rollback logs | rollback invoked automatically | PENDING |

---

## 9. Circuit Breaker Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-017 | Breaker opens after threshold | repeated failure logs | OPEN after configured failure count | PENDING |
| CERT-RT-018 | Requests rejected while OPEN | API responses during OPEN | controlled rejection, no execution step starts | PENDING |
| CERT-RT-019 | Cooldown recovery works | time-window + state logs | OPEN→HALF_OPEN transition observed | PENDING |
| CERT-RT-020 | Success closes breaker | successful recovery trace | HALF_OPEN→CLOSED after success | PENDING |

---

## 10. Concurrency Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-021 | 5 parallel same-job requests | concurrent request logs | single effective execution path | PENDING |
| CERT-RT-022 | Duplicate commit prevention | commit logs | commit executed once | PENDING |
| CERT-RT-023 | Lock release verification | repeated parallel runs | no deadlock, lock always released | PENDING |

---

## 11. Observability Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-RT-024 | Required log schema fields present | structured log samples | traceId,jobId,step,status,latencyMs,errorType present | PENDING |
| CERT-RT-025 | traceId propagation end-to-end | request header + logs | same traceId in request, response, logs | PENDING |
| CERT-RT-026 | Latency/status/errorType quality | log quality review | meaningful values, no null-critical fields | PENDING |

---

## 12. Security Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-SEC-001 | No stack trace leakage | error response samples | no stack/internal traces in API response | PENDING |
| CERT-SEC-002 | Sensitive data protection | response/log review | no secrets/PII leakage | PENDING |
| CERT-SEC-003 | Invalid input protection | malformed/invalid input tests | controlled 4xx/normalized response | PENDING |

---

## 13. Production Readiness Certification

| Check ID | Description | Evidence Required | Pass Criteria | Status |
|---|---|---|---|---|
| CERT-SEC-004 | All mandatory certification checks complete | completed checklist | no PENDING/BLOCKED mandatory checks | PENDING |
| CERT-SEC-005 | Sev-1/Sev-2 defects closed | defect tracker report | zero open Sev-1/Sev-2 | PENDING |
| CERT-SEC-006 | Final readiness score threshold met | readiness report score sheet | score qualifies classification target | PENDING |
