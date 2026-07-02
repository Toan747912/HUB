# Apps — Generic Scaffold

> **Status:** This is a generic, domain-agnostic implementation scaffold (frontend, backend,
> ai-service), built per Founder request on 2026-06-30 to get a runnable critical path end to
> end. It is **not** wired to the locked domain model in [Docs/](../Docs/Project_Index.md)
> (Knowledge Graph, Evidence Engine, Assessment, Learning Session, etc.) — that integration is
> future work, tracked separately. The previous `Apps/backend` (.NET/EF Core implementation
> aligned to the locked domain) was moved to
> [Archive/2026-06-30_dotnet_backend_superseded](../Archive/2026-06-30_dotnet_backend_superseded/SUPERSEDED_NOTICE.md).

## Stack

| App | Tech | Port |
|---|---|---|
| `frontend` | Next.js 14 (App Router) | 3000 |
| `backend` | Express (Node 20) | 4000 |
| `ai-service` | FastAPI (Python 3.11) | 8000 |

## Local setup

### Backend

```bash
cd Apps/backend
npm install
npm start          # http://localhost:4000
npm test           # critical-path tests (Jest + Supertest)
```

### AI service

```bash
cd Apps/ai-service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
pytest                          # critical-path tests
```

### Frontend

```bash
cd Apps/frontend
npm install
npm run dev         # http://localhost:3000 (expects backend on :4000)
npm test            # critical-path tests (Jest + React Testing Library)
```

Set `NEXT_PUBLIC_BACKEND_URL` if the backend isn't on `http://localhost:4000`.

## Docker Compose (all three together)

From the repo root:

```bash
docker compose up --build
```

- frontend: http://localhost:3000
- backend: http://localhost:4000
- ai-service: http://localhost:8000

## What's implemented

- **backend**: `GET /api/health`, `GET/POST/DELETE /api/items` (in-memory store)
- **ai-service**: `GET /api/health`, `POST /api/echo`
- **frontend**: single page that lists items from the backend and lets you add one (exercises the full fetch → render → submit → refetch flow)

## Tests

Each app has a `critical-path` test suite covering its primary endpoints / main UI flow only,
per the approved "Critical-path testing" scope — not exhaustive coverage.
