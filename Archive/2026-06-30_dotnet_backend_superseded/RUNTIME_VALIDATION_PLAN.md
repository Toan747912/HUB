# Phase 3 Runtime Validation Plan (Post .NET 8 SDK Installation)

## Scope and Constraints

This document defines the **runtime validation checklist only** for `Apps/backend`, to be executed **after .NET 8 SDK is installed**.

- Planning artifact only.
- No code changes.
- No build/run/test/migration execution in this phase.
- Validation execution is deferred to a later step.

---

## Preconditions (Must Be True Before Execution)

1. .NET 8 SDK installed and available on PATH.
2. Terminal opened at repository root: `e:/Users/ngoqu/LapTrinh/web/hub`.
3. Backend project path available: `Apps/backend`.
4. App settings prepared:
   - `appsettings.Development.json` for `InMemory` mode.
   - `appsettings.json` for `EfCore` mode (valid PostgreSQL connection + JWT settings).
5. A valid JWT token acquisition approach is prepared (for `[Authorize]` endpoints).
6. Port availability confirmed (default ASP.NET Core port from runtime output).

---

## Evidence Collection Requirements (Apply to All Sections)

For every validation step, capture evidence as applicable:

- Full command and terminal output.
- Timestamp and executor.
- HTTP request + response status + body.
- Relevant response headers.
- Startup logs and middleware logs.
- Swagger UI/API screenshot(s), where applicable.
- Error screenshots/log snippets for failure cases.

Use the final report template in section **L**.

---

## A. Environment Validation

### A1. Validate SDK Installation Metadata
- **Command**
  ```bash
  dotnet --info
  ```
- **Expected Result**
  - .NET SDK 8.x listed.
  - Runtime information present (Microsoft.NETCore.App 8.x).
- **Pass Criteria**
  - Command exits successfully and includes SDK 8.x.
- **Fail Criteria**
  - `dotnet` not found OR no 8.x SDK.
- **Evidence**
  - Full terminal output screenshot/text export.

### A2. Validate Installed SDK List
- **Command**
  ```bash
  dotnet --list-sdks
  ```
- **Expected Result**
  - At least one `8.0.xxx` SDK listed.
- **Pass Criteria**
  - SDK list includes major version 8.
- **Fail Criteria**
  - No SDK entries or no 8.x.
- **Evidence**
  - Terminal output.

### A3. Validate Dependency Restore
- **Command**
  ```bash
  dotnet restore Apps/backend/Apps.Backend.csproj
  ```
- **Expected Result**
  - Restore completes without unresolved package errors.
- **Pass Criteria**
  - Exit code 0 and successful restore message.
- **Fail Criteria**
  - NuGet/auth/network/package resolution errors.
- **Evidence**
  - Restore log output.

### A4. Validate Build
- **Command**
  ```bash
  dotnet build Apps/backend/Apps.Backend.csproj -c Debug
  ```
- **Expected Result**
  - Build success (`0 Error(s)`).
- **Pass Criteria**
  - Exit code 0 and successful compilation.
- **Fail Criteria**
  - Any compilation or project configuration error.
- **Evidence**
  - Build output with summary line.

---

## B. Startup Validation

### B1. Application Startup
- **Command**
  ```bash
  dotnet run --project Apps/backend/Apps.Backend.csproj
  ```
- **Expected Result**
  - App starts and listens on HTTP(S) URL(s).
- **Pass Criteria**
  - Startup completes without crash/exception.
- **Fail Criteria**
  - Startup exception (JWT config invalid, DB unavailable in EfCore mode, DI failure, etc.).
- **Evidence**
  - Startup terminal logs including listening address.

### B2. Startup Logs Verification
- **What to Verify**
  - No fatal startup exceptions.
  - Middleware registration effects visible during requests.
  - Environment/development mode behavior consistent.
- **Expected Result**
  - Clean startup and request logs.
- **Pass Criteria**
  - No unhandled startup exception.
- **Fail Criteria**
  - Host terminates at startup.
- **Evidence**
  - Log excerpts.

### B3. Swagger Availability
- **URL**
  - `http://localhost:{port}/swagger` (Development only)
- **Expected Result**
  - Swagger UI loads and displays controllers/endpoints.
- **Pass Criteria**
  - UI accessible and endpoint list visible.
- **Fail Criteria**
  - 404/500 or security/config block.
- **Evidence**
  - Browser screenshot of Swagger UI and endpoint list.

---

## C. Infrastructure Validation

### C1. Health Endpoint Availability
- **Request**
  ```http
  GET /api/health
  ```
- **Expected Result**
  - `200 OK` with payload including:
    - `status`
    - `modulesLoaded`
    - `authStatus`
    - `persistenceMode`
- **Pass Criteria**
  - Response fields present and values coherent.
- **Fail Criteria**
  - Non-200 or missing required fields.
- **Evidence**
  - HTTP response capture.

### C2. Middleware Pipeline Behavior
- **What to Validate**
  - `GlobalExceptionMiddleware` handles exceptions uniformly.
  - `RequestLoggingMiddleware` logs request metadata.
- **Method**
  - Trigger successful and failing endpoint requests.
- **Expected Result**
  - Structured logs and standardized error responses.
- **Pass Criteria**
  - Logging + exception handling observed as designed.
- **Fail Criteria**
  - Missing logs or raw/unhandled exceptions exposed.
- **Evidence**
  - Log lines and failure response samples.

### C3. JWT Configuration Loading
- **What to Validate**
  - JWT settings loaded:
    - Issuer
    - Audience
    - SigningKey
    - AccessTokenExpirationMinutes
- **Expected Result**
  - App starts and auth works with token validation.
- **Pass Criteria**
  - No startup exception from JWT config and protected routes enforce auth.
- **Fail Criteria**
  - Startup `InvalidOperationException` for JWT settings.
- **Evidence**
  - Startup logs + auth endpoint response behavior.

### C4. Persistence Mode Loading
- **What to Validate**
  - Active mode from config:
    - Development default currently `InMemory`.
    - Base appsettings currently `EfCore`.
- **Expected Result**
  - `/api/health` reports `persistenceMode` consistent with active profile.
- **Pass Criteria**
  - Mode in response matches expected environment config.
- **Fail Criteria**
  - Mismatch indicates config binding/environment issue.
- **Evidence**
  - Health response + launch profile/environment notes.

---

## D. Identity Validation

### D1. Identity Health Endpoint
- **Request**
  ```http
  GET /api/identity/health
  ```
- **Expected Result**
  - `200 OK` with text: `Identity module alive`.
- **Pass Criteria**
  - Endpoint responds successfully.
- **Fail Criteria**
  - Non-200 response.
- **Evidence**
  - Response body capture.

### D2. Authenticated Endpoint Success
- **Request**
  ```http
  GET /api/identity/me
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - `200 OK` with `userId`, `email`, `role`.
- **Pass Criteria**
  - Valid token returns identity payload.
- **Fail Criteria**
  - 401/403 with valid token.
- **Evidence**
  - Request headers (masked token), response payload.

### D3. Unauthorized Behavior
- **Requests**
  - No token.
  - Malformed/expired token.
- **Expected Result**
  - `401 Unauthorized` (or framework-consistent auth challenge).
- **Pass Criteria**
  - Protected endpoint blocks unauthorized access.
- **Fail Criteria**
  - Endpoint accessible without valid auth.
- **Evidence**
  - Failure response captures.

---

## E. Knowledge Validation

Protected base route: `/api/knowledge` (Authorize required).

### E1. Create Node
- **Request**
  ```http
  POST /api/knowledge/node
  Authorization: Bearer {valid_token}
  Content-Type: application/json
  ```
  Body should match `CreateKnowledgeNodeRequest`.
- **Expected Result**
  - Success (2xx) with created node payload containing node identifier.
- **Pass Criteria**
  - Node created and response shape valid.
- **Fail Criteria**
  - 4xx/5xx for valid payload/token.
- **Evidence**
  - Request/response capture.

### E2. Link Node
- **Request**
  ```http
  POST /api/knowledge/link
  Authorization: Bearer {valid_token}
  ```
  Body should match `LinkKnowledgeNodeRequest`.
- **Expected Result**
  - Success (2xx), link persisted.
- **Pass Criteria**
  - Relationship creation accepted.
- **Fail Criteria**
  - Invalid reference handling incorrect or server error.
- **Evidence**
  - Link request/response.

### E3. Read Node
- **Request**
  ```http
  GET /api/knowledge/node/{id}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - `200 OK` with node details for existing ID.
- **Pass Criteria**
  - Read returns previously created node.
- **Fail Criteria**
  - 404 for existing node or malformed response.
- **Evidence**
  - GET response payload.

### E4. Error Cases
- Invalid GUID.
- Non-existing node ID.
- Invalid payload model.
- Missing auth.
- **Expected Result**
  - Proper 4xx/validation responses, no unhandled exception.
- **Pass Criteria**
  - Stable, predictable error contracts.
- **Evidence**
  - Error response + logs.

---

## F. Evidence Validation

Protected base route: `/api/evidence` (Authorize required).

### F1. Create Evidence
- **Request**
  ```http
  POST /api/evidence/create
  Authorization: Bearer {valid_token}
  ```
  Body must match `CreateEvidenceRequest`.
- **Expected Result**
  - Success response with created evidence ID/details.
- **Pass Criteria**
  - Entity created successfully.
- **Fail Criteria**
  - Unexpected 4xx/5xx for valid request.
- **Evidence**
  - Request/response capture.

### F2. Read Evidence by Session
- **Request**
  ```http
  GET /api/evidence/session/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - `200 OK` with evidence collection (possibly empty when appropriate).
- **Pass Criteria**
  - Correctly scoped retrieval.
- **Fail Criteria**
  - Retrieval fails for valid session.
- **Evidence**
  - Response payload.

### F3. Error Cases
- Invalid sessionId format.
- Missing token.
- Invalid payload on create.
- **Expected Result**
  - Proper auth/validation errors.
- **Pass Criteria**
  - Safe failures with meaningful response.
- **Evidence**
  - Error response samples + logs.

---

## G. Assessment Validation

Protected base route: `/api/assessment`.

### G1. Run Assessment
- **Request**
  ```http
  POST /api/assessment/run/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - Success (2xx), assessment result produced/stored.
- **Pass Criteria**
  - Response contains assessment output structure.
- **Fail Criteria**
  - 5xx or invalid data contract.
- **Evidence**
  - Request/response pair.

### G2. Read Assessment
- **Request**
  ```http
  GET /api/assessment/session/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - `200 OK` with assessment record(s).
- **Pass Criteria**
  - Data retrievable after run.
- **Fail Criteria**
  - No retrievable result after successful run.
- **Evidence**
  - Output payload.

---

## H. Recommendation Validation

Protected base route: `/api/recommendation`.

### H1. Generate Recommendation
- **Request**
  ```http
  POST /api/recommendation/generate/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - Recommendation generated and returned.
- **Pass Criteria**
  - Success response with recommendation data.
- **Fail Criteria**
  - Failure for valid preconditions.
- **Evidence**
  - Response payload.

### H2. Read Recommendation
- **Request**
  ```http
  GET /api/recommendation/session/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - `200 OK` with recommendation data set.
- **Pass Criteria**
  - Read consistency with generate operation.
- **Fail Criteria**
  - Missing/inconsistent record.
- **Evidence**
  - Retrieval response.

---

## I. Intervention Validation

Protected base route: `/api/intervention`.

### I1. Apply Intervention
- **Request**
  ```http
  POST /api/intervention/apply/{recommendationId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - Intervention applied and returned.
- **Pass Criteria**
  - Success response and valid intervention record.
- **Fail Criteria**
  - Server error or invalid state handling.
- **Evidence**
  - Response payload + related identifiers.

### I2. Read Intervention
- **Request**
  ```http
  GET /api/intervention/session/{sessionId}
  Authorization: Bearer {valid_token}
  ```
- **Expected Result**
  - Session interventions returned.
- **Pass Criteria**
  - Read reflects prior apply operation.
- **Fail Criteria**
  - Missing expected intervention.
- **Evidence**
  - Response payload.

---

## J. Persistence Validation

## J1. InMemory Mode Validation
(Using Development settings where `Persistence.Mode = InMemory`)

### J1.1 Startup
- **Expected Result**
  - App starts without DB dependency.
- **Pass Criteria**
  - No DB connection requirement/error at startup.
- **Evidence**
  - Startup log + `/api/health` => `persistenceMode: "inmemory"`.

### J1.2 CRUD Behavior
- **Expected Result**
  - Runtime CRUD works during process lifetime.
- **Pass Criteria**
  - Create/read flows succeed.
- **Fail Criteria**
  - Persistence instability during runtime.
- **Evidence**
  - API request chain showing create then read.

## J2. EfCore Mode Validation
(Using base settings where `Persistence.Mode = EfCore`)

### J2.1 Startup
- **Expected Result**
  - App starts with valid PostgreSQL connection string.
- **Pass Criteria**
  - No startup exception regarding `PostgreSQL` connection string.
- **Fail Criteria**
  - InvalidOperationException or DB provider errors.
- **Evidence**
  - Startup logs.

### J2.2 DbContext Resolution
- **Expected Result**
  - `ApplicationDbContext` resolves from DI without runtime activation errors.
- **Pass Criteria**
  - Endpoints requiring repositories function.
- **Fail Criteria**
  - DI activation failures for DbContext.
- **Evidence**
  - Request success logs + absence of DI exceptions.

### J2.3 Repository Resolution
- **Expected Result**
  - EfCore repositories are active for module operations.
- **Pass Criteria**
  - CRUD endpoints operate in EfCore mode.
- **Fail Criteria**
  - Missing service registration/constructor injection errors.
- **Evidence**
  - Endpoint results and logs.

---

## K. DI Validation

### K1. Repository Resolution
- **What to Validate**
  - Module repository interfaces resolve according to persistence mode.
- **Expected Result**
  - No unresolved service errors at controller execution.
- **Pass Criteria**
  - Endpoints execute successfully across modules.
- **Fail Criteria**
  - `Unable to resolve service for type...`.
- **Evidence**
  - Successful endpoint traces and no DI exceptions.

### K2. UnitOfWork Resolution
- **What to Validate**
  - InMemory: `NoOpUnitOfWork`
  - EfCore: `EfCoreUnitOfWork`
- **Expected Result**
  - Service operations complete with correct UoW.
- **Pass Criteria**
  - No unit-of-work DI/runtime failures.
- **Fail Criteria**
  - Missing registration/runtime errors.
- **Evidence**
  - Operation logs + error absence.

### K3. Controller Activation
- **What to Validate**
  - All API controllers activate through DI.
- **Expected Result**
  - Controller routes available in Swagger and callable.
- **Pass Criteria**
  - No activation exceptions.
- **Fail Criteria**
  - Any controller instantiation failure.
- **Evidence**
  - Swagger endpoint visibility + request outcomes.

---

## L. Final Validation Report Template

Use this template after execution:

```md
# Runtime Validation Report

## Metadata
- Date:
- Executor:
- Environment:
- Branch/Commit:
- .NET SDK Version:
- Persistence Mode Tested: InMemory / EfCore / Both

## Summary
- Total Checks:
- Passed:
- Failed:
- Blocked:
- Overall Status: PASS / FAIL / PARTIAL

## Section Results

### A. Environment Validation
- A1:
- A2:
- A3:
- A4:

### B. Startup Validation
- B1:
- B2:
- B3:

### C. Infrastructure Validation
- C1:
- C2:
- C3:
- C4:

### D. Identity Validation
- D1:
- D2:
- D3:

### E. Knowledge Validation
- E1:
- E2:
- E3:
- E4:

### F. Evidence Validation
- F1:
- F2:
- F3:

### G. Assessment Validation
- G1:
- G2:

### H. Recommendation Validation
- H1:
- H2:

### I. Intervention Validation
- I1:
- I2:

### J. Persistence Validation
- J1 InMemory:
- J2 EfCore:

### K. DI Validation
- K1:
- K2:
- K3:

## Failures and Blockers
- Blocker ID:
- Description:
- Impact:
- Mitigation Attempted:
- Current State:

## Evidence Index
- EVID-001: (path/link)
- EVID-002: (path/link)
- EVID-003: (path/link)

## Sign-off
- Prepared by:
- Reviewed by:
- Approval:
```

---

## Suggested API Test Data Strategy (Execution Time)

- Use deterministic GUID mapping per module test case.
- Keep one canonical `sessionId` for cross-module chaining:
  - Evidence -> Assessment -> Recommendation -> Intervention.
- Record created entity IDs immediately for downstream steps.
