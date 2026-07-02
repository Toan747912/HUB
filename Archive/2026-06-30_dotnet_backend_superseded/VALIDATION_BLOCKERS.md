# Runtime Validation Blockers Register

This register lists blockers that can prevent successful runtime validation execution.  
Severity definitions:

- **Critical**: Validation must halt immediately.
- **High**: Major scope blocked; limited continuation possible.
- **Medium**: Partial impact; continuation possible with constraints.

---

## Category: Environment

## ENV-001 — .NET SDK 8 Not Installed
- **Description**: Required .NET 8 SDK is missing.
- **Detection Method**:
  - `dotnet --info` does not show SDK 8.x.
  - `dotnet --list-sdks` has no 8.x entry.
- **Severity**: Critical
- **Mitigation**:
  - Install .NET 8 SDK.
  - Reopen terminal and verify PATH.
- **Can Validation Continue?**: No

## ENV-002 — `dotnet` Not in PATH
- **Description**: CLI not recognized.
- **Detection Method**:
  - `dotnet` command not found.
- **Severity**: Critical
- **Mitigation**:
  - Correct PATH / reinstall SDK / restart terminal.
- **Can Validation Continue?**: No

## ENV-003 — Network/NuGet Feed Unavailable
- **Description**: Package restore cannot reach feeds.
- **Detection Method**:
  - `dotnet restore` fails with feed/network errors.
- **Severity**: High
- **Mitigation**:
  - Restore connectivity, verify NuGet source config, retry.
- **Can Validation Continue?**: No (until restore succeeds)

## ENV-004 — Port Conflict on Startup
- **Description**: App port already in use.
- **Detection Method**:
  - Startup log reports address already in use.
- **Severity**: High
- **Mitigation**:
  - Stop conflicting process or use alternate port.
- **Can Validation Continue?**: No (startup-dependent phases blocked)

---

## Category: Configuration

## CFG-001 — Invalid JWT Configuration Values
- **Description**: Missing/invalid Issuer, Audience, SigningKey, or Expiration.
- **Detection Method**:
  - Startup `InvalidOperationException` for JWT config.
- **Severity**: Critical
- **Mitigation**:
  - Populate valid `Authentication:Jwt` values in active config.
- **Can Validation Continue?**: No

## CFG-002 — Wrong Active Environment/Profile
- **Description**: Unexpected appsettings source loaded.
- **Detection Method**:
  - Behavior inconsistent with expected mode (e.g., Swagger absent in intended Development, wrong persistence mode in health output).
- **Severity**: High
- **Mitigation**:
  - Verify `ASPNETCORE_ENVIRONMENT` and config layering.
- **Can Validation Continue?**: Partial (non-dependent checks only)

## CFG-003 — Missing/Invalid PostgreSQL Connection String (EfCore Mode)
- **Description**: `ConnectionStrings:PostgreSQL` absent/invalid for EfCore.
- **Detection Method**:
  - Startup exception: connection string required or DB connection errors.
- **Severity**: Critical (for EfCore branch)
- **Mitigation**:
  - Set valid PostgreSQL connection string and credentials.
- **Can Validation Continue?**:
  - InMemory branch: Yes
  - EfCore branch: No

## CFG-004 — Placeholder Secrets Used in Runtime
- **Description**: Default placeholder values remain in config.
- **Detection Method**:
  - Config values still contain `YOUR_...` placeholders.
  - Auth/token validation failures.
- **Severity**: High
- **Mitigation**:
  - Replace placeholders with real environment-specific secrets.
- **Can Validation Continue?**: Partial (public endpoints only)

---

## Category: Authentication

## AUTH-001 — No Valid JWT Token Available
- **Description**: Cannot test `[Authorize]` endpoints positively.
- **Detection Method**:
  - All protected requests return 401; no known valid token source.
- **Severity**: High
- **Mitigation**:
  - Obtain valid token from configured identity provider/test issuer.
- **Can Validation Continue?**:
  - Public endpoint checks only: Yes
  - Full validation: No

## AUTH-002 — Token Claims Mismatch (Issuer/Audience)
- **Description**: Token issued with incompatible issuer/audience.
- **Detection Method**:
  - 401 with token validation errors in logs.
- **Severity**: High
- **Mitigation**:
  - Align token source and JWT validation config.
- **Can Validation Continue?**: Partial

## AUTH-003 — Expired/Invalid Signature Token
- **Description**: Token lifetime/signature invalid.
- **Detection Method**:
  - 401 + signature/lifetime validation errors.
- **Severity**: Medium
- **Mitigation**:
  - Refresh token / fix signing key alignment.
- **Can Validation Continue?**: Partial

---

## Category: Persistence

## PER-001 — InMemory Mode Not Active When Expected
- **Description**: Health reports unexpected mode in Development validation.
- **Detection Method**:
  - `/api/health` shows wrong `persistenceMode`.
- **Severity**: High
- **Mitigation**:
  - Correct active settings/environment and restart.
- **Can Validation Continue?**: Partial (mode-specific checks blocked)

## PER-002 — EfCore DB Connectivity Failure
- **Description**: DB host/credentials/network reject connection.
- **Detection Method**:
  - Startup/runtime EF/Npgsql exceptions.
- **Severity**: Critical (EfCore branch)
- **Mitigation**:
  - Validate DB endpoint, firewall, credentials, SSL settings.
- **Can Validation Continue?**:
  - InMemory branch: Yes
  - EfCore branch: No

## PER-003 — DbContext Registration/Resolution Failure
- **Description**: `ApplicationDbContext` cannot resolve in DI.
- **Detection Method**:
  - Runtime `Unable to resolve service` or activation exception.
- **Severity**: Critical
- **Mitigation**:
  - Fix DI registration and constructor chain; restart.
- **Can Validation Continue?**: No (for dependent endpoints)

## PER-004 — Repository Binding Mismatch for Active Mode
- **Description**: Incorrect repository implementation bound for mode.
- **Detection Method**:
  - Endpoint failures with DI/service activation errors.
- **Severity**: High
- **Mitigation**:
  - Correct mode-based registration mapping.
- **Can Validation Continue?**: Partial

---

## Category: DI/Startup

## DI-001 — Controller Activation Failure
- **Description**: Controller dependencies unresolved.
- **Detection Method**:
  - Runtime activation exception when hitting endpoints or during startup metadata generation.
- **Severity**: Critical
- **Mitigation**:
  - Resolve missing/incorrect service registrations.
- **Can Validation Continue?**: No for affected controllers

## DI-002 — UnitOfWork Resolution Failure
- **Description**: `IUnitOfWork` implementation not resolvable.
- **Detection Method**:
  - DI error in service execution path.
- **Severity**: High
- **Mitigation**:
  - Ensure correct registration by persistence mode.
- **Can Validation Continue?**: Partial (read-only/public may continue)

## DI-003 — Application Startup Crash
- **Description**: Host fails before accepting requests.
- **Detection Method**:
  - `dotnet run` exits with fatal exception.
- **Severity**: Critical
- **Mitigation**:
  - Resolve top exception (Config/Auth/Persistence/DI), relaunch.
- **Can Validation Continue?**: No

---

## Category: API

## API-001 — Swagger Not Accessible
- **Description**: Swagger UI unavailable when expected.
- **Detection Method**:
  - `/swagger` returns 404/500 in intended Development run.
- **Severity**: Medium
- **Mitigation**:
  - Verify Development environment and startup.
- **Can Validation Continue?**: Yes (manual API calls)

## API-002 — Route Mismatch / Endpoint Not Found
- **Description**: Called route does not match controller mapping.
- **Detection Method**:
  - 404 for expected endpoint.
- **Severity**: High
- **Mitigation**:
  - Cross-check route templates and HTTP verbs.
- **Can Validation Continue?**: Partial

## API-003 — Contract Validation Failures for Nominal Payloads
- **Description**: Valid request unexpectedly rejected.
- **Detection Method**:
  - 400/422 on expected valid payload.
- **Severity**: High
- **Mitigation**:
  - Correct test payload according to DTO contracts.
- **Can Validation Continue?**: Partial

## API-004 — Cascading Data Dependency Break
- **Description**: Downstream endpoints fail due to missing upstream artifacts.
- **Detection Method**:
  - Assessment/recommendation/intervention fail after earlier module errors.
- **Severity**: High
- **Mitigation**:
  - Re-establish upstream chain (Knowledge/Evidence/Assessment) before retry.
- **Can Validation Continue?**: Partial (independent checks only)

---

## Category: Infrastructure

## INF-001 — Health Endpoint Failing
- **Description**: `/api/health` not returning expected status/payload.
- **Detection Method**:
  - Non-200 or missing expected fields.
- **Severity**: Critical
- **Mitigation**:
  - Resolve startup, routing, and options binding issues.
- **Can Validation Continue?**: No (baseline unstable)

## INF-002 — Request Logging Middleware Not Observed
- **Description**: Expected request logs absent.
- **Detection Method**:
  - No request log entries for executed API calls.
- **Severity**: Medium
- **Mitigation**:
  - Validate middleware ordering and logging levels.
- **Can Validation Continue?**: Yes (functional checks continue; observability impacted)

## INF-003 — Global Exception Middleware Not Handling Failures
- **Description**: Exceptions bypass standardized handling.
- **Detection Method**:
  - Unhandled exception traces/raw errors returned.
- **Severity**: High
- **Mitigation**:
  - Verify middleware registration order; retest error paths.
- **Can Validation Continue?**: Partial (unsafe baseline)

---

## Blocker Handling Workflow

1. Assign blocker ID and category.
2. Capture evidence (logs, response, screenshot).
3. Mark severity and continuation status.
4. Apply mitigation.
5. Re-run failed step only after mitigation.
6. Update final report with blocker history and resolution state.

---

## Continuation Policy Summary

- **Cannot continue**: Critical unresolved blockers.
- **Can continue partially**: High/Medium blockers with unaffected independent checks.
- **Must halt**: Any blocker that prevents startup, baseline health, or environment prerequisites.
