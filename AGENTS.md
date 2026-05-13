# FTTH SaaS - Agent Guide

## Stack

- **Backend**: Node.js 20 + TypeScript, Express, PostgreSQL/PostGIS
- **Frontend**: Next.js 16 (React 19, Tailwind CSS 4) — PWA for field technicians
- **Async Jobs**: BullMQ + Redis
- **Auth**: JWT with multi-tenant RLS isolation at database level
- **Dev**: Docker Compose orchestrates all services

## Development Commands

```bash
# Full stack (all services)
docker-compose up --build -d

# Backend only (dev mode with hot reload)
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev

# Backend tests/build
cd backend && npm run build
```

**Ports**: Frontend 3000, Backend 3333, PostgreSQL 5432, Redis 6379

## Multi-Tenant Security (Critical)

Tenant isolation is enforced at the **database level via RLS**, not application code:

1. `tenant_id` is extracted from JWT by the API, never from frontend request body/params
2. Every DB transaction runs `SET LOCAL app.current_tenant_id = '<id>'` before queries
3. Do NOT pass `tenant_id` from frontend — reject any such attempts

See: `backend/src/middleware/auth.ts`, `backend/src/db.ts`, `backend/db/init.sql`

## Async Network Calculations

Network recalculations (dBm propagation) run async via BullMQ:

- Trigger: `POST /api/network/calculate` (returns `jobId`)
- Monitor: `GET /api/jobs/:id`
- Never run heavy calculations synchronously in HTTP handlers

## Next.js 16

This project uses Next.js 16 with breaking changes from older versions. Before writing React components, check `node_modules/next/dist/docs/` for current API conventions.

## Database

- Schema auto-initializes via `backend/db/init.sql` (mounted in docker-compose)
- GIST spatial indexes on `network_nodes.geom` and `cables.geom` are required for performance
- Two distance metrics on cables: `calculated_distance_km` (map geometry) vs `measured_distance_km` (OTDR/field)

## Key Files

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `backend/db/init.sql` | PostGIS schema + RLS policies |
| `backend/src/middleware/auth.ts` | JWT validation + tenant extraction |
| `backend/src/db.ts` | RLS query wrapper |
| `backend/src/jobs/networkWorker.ts` | BullMQ job processor |
| `frontend/src/components/HelpIcon.tsx` | Contextual help for technicians |
| `.env.example` | Environment variables template |

## Mock Auth for Testing

```bash
# Get a test JWT (dev only)
curl -X POST http://localhost:3333/api/auth/mock \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"00000000-0000-0000-0000-000000000001","user_id":"user1"}'
```
