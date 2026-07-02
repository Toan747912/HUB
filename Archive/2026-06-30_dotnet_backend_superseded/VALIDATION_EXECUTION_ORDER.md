# Runtime Validation Execution Order (Strict Sequence)

This document defines the exact execution order for runtime validation after .NET 8 installation.  
No step should be skipped unless explicitly marked optional.

---

## Execution Rules

1. Execute steps in strict numerical order.
2. Respect dependencies before moving forward.
3. If a stop condition is met, halt and log blocker.
4. Apply rollback/recovery action, then re-run failed step.
5. Do not continue to downstream module validation on unresolved upstream failure.

---

## Step-by-Step Sequence

## Phase 0 — Preparation

### Step 0.1 Confirm Working Directory
- **Action**: Ensure terminal context supports project path `Apps/backend`.
- **Dependency**: None.
- **Stop Condition**: Project path inaccessible.
- **Recovery**: Correct repository path and retry.

### Step 0.2 Prepare Evidence Workspace
- **Action**: Create/identify location for logs, screenshots, response captures.
- **Dependency**: 0.1.
- **Stop Condition**: Cannot capture evidence.
- **Recovery**: Configure writable artifact folder.

---

## Phase 1 — Environment Validation (Section A)

### Step 1.1 `dotnet --info`
- **Dependency**: 0.1.
- **Stop Condition**: .NET command unavailable or SDK 8 missing.
- **Recovery**: Install/fix PATH for .NET 8, rerun Step 1.1.

### Step 1.2 `dotnet --list-sdks`
- **Dependency**: 1.1.
- **Stop Condition**: No 8.x SDK.
- **Recovery**: Install .NET 8 SDK, rerun 1.1 and 1.2.

### Step 1.3 `dotnet restore Apps/backend/Apps.Backend.csproj`
- **Dependency**: 1.2.
- **Stop Condition**: Restore failure (network/NuGet/auth/package).
- **Recovery**: Resolve feed/connectivity/package issue, rerun 1.3.

### Step 1.4 `dotnet build Apps/backend/Apps.Backend.csproj -c Debug`
- **Dependency**: 1.3.
- **Stop Condition**: Build errors.
- **Recovery**: Resolve compile/config issue, rerun 1.4.

---

## Phase 2 — Startup Validation (Section B)

### Step 2.1 Launch App
- **Command**: `dotnet run --project Apps/backend/Apps.Backend.csproj`
- **Dependency**: 1.4.
- **Stop Condition**: Startup exception or host termination.
- **Recovery**:
  - Validate JWT settings (issuer/audience/signing key/expiration).
  - Validate persistence mode config and connection strings.
  - Resolve DI exceptions.
  - Rerun 2.1.

### Step 2.2 Verify Startup Logs
- **Dependency**: 2.1 successful host start.
- **Stop Condition**: Critical errors in startup logs.
- **Recovery**: Fix blocker category (Config/DI/Persistence), restart 2.1.

### Step 2.3 Verify Swagger
- **Dependency**: 2.1 and Development environment behavior.
- **Stop Condition**: Swagger unavailable in expected Development runtime.
- **Recovery**:
  - Confirm ASPNETCORE_ENVIRONMENT=Development.
  - Confirm app started correctly.
  - Retry URL and capture.

---

## Phase 3 — Infrastructure Validation (Section C)

### Step 3.1 Validate `/api/health`
- **Dependency**: 2.1.
- **Stop Condition**: Health endpoint non-200.
- **Recovery**: Inspect routing/middleware/startup logs; resolve and retest 3.1.

### Step 3.2 Validate Middleware Pipeline
- **Dependency**: 3.1.
- **Stop Condition**: Missing request logs or unhandled exception behavior.
- **Recovery**: Confirm middleware registration order in startup; restart and retest.

### Step 3.3 Validate JWT Config Loading
- **Dependency**: 2.1 + 3.1.
- **Stop Condition**: Invalid JWT behavior or startup config error.
- **Recovery**: Correct JWT configuration values; restart at 2.1.

### Step 3.4 Validate Persistence Mode Loading
- **Dependency**: 3.1.
- **Stop Condition**: `persistenceMode` mismatch against expected environment settings.
- **Recovery**: Validate active config source/environment and rerun from 2.1.

---

## Phase 4 — Identity Validation (Section D)

### Step 4.1 `GET /api/identity/health`
- **Dependency**: 3.x complete.
- **Stop Condition**: Non-200.
- **Recovery**: Verify controller mapping/startup logs and retest.

### Step 4.2 `GET /api/identity/me` with valid token
- **Dependency**: 4.1 + valid JWT.
- **Stop Condition**: 401/403 for valid token.
- **Recovery**: Validate token issuer/audience/signature/expiry; rerun 4.2.

### Step 4.3 Unauthorized behavior checks
- **Dependency**: 4.2.
- **Stop Condition**: Protected endpoint accessible without valid auth.
- **Recovery**: Investigate auth middleware/order/config; rerun 2.1 onward.

---

## Phase 5 — Domain API Validation (Sections E–I)

Execution order is intentionally chained to support realistic flow.

### Step 5.1 Knowledge (E)
1. Create node  
2. Link node  
3. Read node  
4. Error cases  
- **Dependency**: 4.x and valid auth.
- **Stop Condition**: Core create/read broken.
- **Recovery**: Fix request contract/auth/dependency issue, rerun 5.1.

### Step 5.2 Evidence (F)
1. Create evidence  
2. Read evidence by session  
3. Error cases  
- **Dependency**: 5.1 (session/data context available).
- **Stop Condition**: Core create/read broken.
- **Recovery**: Resolve endpoint contract/repo issues, rerun 5.2.

### Step 5.3 Assessment (G)
1. Run assessment  
2. Read assessment  
- **Dependency**: 5.2.
- **Stop Condition**: Cannot run/retrieve assessment.
- **Recovery**: Validate prerequisites/session ownership logic, rerun 5.3.

### Step 5.4 Recommendation (H)
1. Generate recommendation  
2. Read recommendation  
- **Dependency**: 5.3.
- **Stop Condition**: Generation/retrieval failure.
- **Recovery**: Validate upstream assessment data and service dependencies; rerun 5.4.

### Step 5.5 Intervention (I)
1. Apply intervention  
2. Read intervention  
- **Dependency**: 5.4.
- **Stop Condition**: Apply/read failure.
- **Recovery**: Validate recommendation linkage and repository path; rerun 5.5.

---

## Phase 6 — Persistence Mode Validation (Section J)

## Branch 6A — InMemory Validation
### Step 6A.1 Start app with Development settings (InMemory expected)
- **Dependency**: 2.x baseline.
- **Stop Condition**: Health reports non-InMemory mode or startup fails.
- **Recovery**: Check active environment/config layering; restart 2.1.

### Step 6A.2 Validate CRUD runtime behavior
- **Dependency**: 6A.1.
- **Stop Condition**: Basic runtime CRUD instability.
- **Recovery**: Investigate in-memory service registrations and retry API checks.

## Branch 6B — EfCore Validation
### Step 6B.1 Start app with EfCore settings and valid PostgreSQL string
- **Dependency**: 2.x baseline + valid DB config.
- **Stop Condition**: Startup/db connection failure.
- **Recovery**: Correct connection string/network/db credentials, rerun 6B.1.

### Step 6B.2 Validate DbContext resolution
- **Dependency**: 6B.1.
- **Stop Condition**: DI activation failures involving `ApplicationDbContext`.
- **Recovery**: Resolve DI/DbContext registration issue; rerun 6B.1–6B.2.

### Step 6B.3 Validate EfCore repository resolution
- **Dependency**: 6B.2.
- **Stop Condition**: Repository/service activation failures.
- **Recovery**: Fix registration mismatch; rerun 6B.1 onward.

---

## Phase 7 — DI Validation (Section K)

### Step 7.1 Repository Resolution
- **Dependency**: 6A and/or 6B relevant mode.
- **Stop Condition**: Unresolved repository service.
- **Recovery**: Resolve registration and restart from startup.

### Step 7.2 UnitOfWork Resolution
- **Dependency**: 7.1.
- **Stop Condition**: UoW not resolvable / invalid implementation bound.
- **Recovery**: Validate mode-based registration and retest.

### Step 7.3 Controller Activation
- **Dependency**: 7.1–7.2.
- **Stop Condition**: Any controller activation error.
- **Recovery**: Resolve constructor dependency chain and retest.

---

## Phase 8 — Finalization (Section L)

### Step 8.1 Compile Validation Outcomes
- **Dependency**: All completed/blocked steps documented.

### Step 8.2 Produce Final Runtime Validation Report
- **Dependency**: 8.1.
- **Output**: Completed report based on `RUNTIME_VALIDATION_PLAN.md` template.

---

## Global Stop Conditions (Hard Halt)

Validation must halt when any of the following occur:

1. .NET 8 SDK not available.
2. Restore/build cannot succeed.
3. Application cannot start.
4. Critical authentication configuration invalid.
5. Persistence mode required for current branch cannot initialize.
6. Unhandled exceptions indicate unstable runtime baseline.
7. Evidence capture process unavailable (cannot prove results).

---

## Rollback/Recovery Guidelines

- **Configuration rollback**: Revert temporary config changes to known-good baseline.
- **Environment rollback**: Reset environment variables affecting startup.
- **Mode rollback**:
  - If EfCore fails, revert to InMemory for baseline continuity.
  - Continue EfCore branch only after blocker resolution.
- **Server process reset**: Stop app process cleanly and relaunch before retesting.
- **Data rollback (when needed)**: Use isolated test IDs/sessions to avoid cross-test contamination.

---

## Dependency Graph (Condensed)

- A (Environment) -> B (Startup) -> C (Infrastructure) -> D (Identity) -> E/F/G/H/I (Domain Chain) -> J (Persistence branches) -> K (DI) -> L (Final report)

No downstream phase is valid if upstream phase has unresolved critical failure.
