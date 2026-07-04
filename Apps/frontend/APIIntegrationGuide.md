# API Integration & Swagger Client Generation

This document details the build-time generation pipeline and runtime HTTP interceptor contracts between the frontend and NestJS backend.

## Compilation Pipeline

To align endpoints and DTO schemas with the backend domain models, we implement a self-contained generation script:

```
[NestJS Application]
       │ (Bootstraps with mongodb-memory-server)
       ▼
[swagger-spec.json]
       │ (Compiled inside scripts/)
       ▼
[swagger-typescript-api]
       │ (Generates types, endpoints, and requests)
       ▼
[src/shared/services/api/client.ts]
```

## Development Workflow

Whenever a backend controller, DTO, or route changes:

```
Backend API changed?
       │
       ▼  (Apps/ai-backend)  npm run openapi:generate
       │
       ▼  (Apps/frontend)    npm run sdk:generate
       │
       ▼  npm test (frontend)
       │
       ▼  commit swagger-spec.json + client.ts together with the change
```

This is a manual, two-command workflow by design (see ADR-060 and CI-004 below) — there is
no CI step running it automatically yet.

1. Under `Apps/ai-backend`, compile the Swagger spec:
   ```bash
   npm run openapi:generate
   ```
2. Under `Apps/frontend`, rebuild the client models:
   ```bash
   npm run sdk:generate
   ```

## Axios Interceptor Pipeline

We register request and response interceptors directly onto the generated API client inside `index.ts`:

- **Bearer Injection**: Adds `Authorization: Bearer <Token>` headers using local memory state.
- **Concurrent Queueing**: If a 401 is received, it registers all pending requests onto a waiting queue, launches a token refresh query, and replays all failed items sequentially once the refresh succeeds.
