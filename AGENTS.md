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
docker compose up --build -d

# Backend only (build + restart)
cd backend && npm run build && docker compose up -d backend

# Frontend only (build + restart)
cd frontend && npm run build && docker compose up -d frontend

# Rebuild both
docker compose build frontend backend && docker compose up -d frontend backend

# Database access
docker compose exec db psql -U ftth_admin -d ftth_saas

# Backend logs
docker compose logs backend --tail=50 -f
```

**Ports**: Frontend 3000, Backend 3333, PostgreSQL 5432, Redis 6379

## Multi-Tenant Security (Critical)

Tenant isolation is enforced at the **database level via RLS**, not application code:

1. `tenant_id` is extracted from JWT by the API, never from frontend request body/params
2. Every DB transaction runs `SET LOCAL app.current_tenant_id = '<id>'` before queries
3. Do NOT pass `tenant_id` from frontend — reject any such attempts

See: `backend/src/middleware/auth.ts`, `backend/src/db.ts`, `backend/db/init.sql`

## Map Editor

Map at `/map` features:
- **Draw Path**: Multi-point cable drawing (like Google Earth) with right-click undo
- **Cable Types**: Configurable color, stroke width, dashed/solid per cable type in Catalog
- **Satellite View**: Toggle between OpenStreetMap and ESRI satellite tiles
- **Geocoding Search**: Search by address (Nominatim), coordinates (decimal/DMS), or node name
- **Search Marker**: Pin appears on searched location
- **Project Tree**: Folder view of projects/areas on the left panel
- **Collapsible Panels**: Layers, legend, and tools minimize to avoid overlap
- **Role-based UI**: Editing tools visible only for admin/superadmin users

## KML Import

- **Preview step**: Upload → Analyze → See structure → Confirm import
- All Point placemarks become CTOs, LineStrings become cables
- KML folder hierarchy becomes Projects (city) and Areas (neighborhood)
- Max file size: 50MB

## Database Migrations

`init.sql` only runs on first DB container startup. For existing databases, run ALTER TABLE statements manually. Key migrations needed for old DBs:

```sql
ALTER TABLE cables ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE cables ADD COLUMN IF NOT EXISTS cable_type_id UUID REFERENCES catalog_cable_type(id);
ALTER TABLE catalog_cable_type ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE catalog_cable_type ADD COLUMN IF NOT EXISTS stroke_width INTEGER DEFAULT 3;
ALTER TABLE catalog_cable_type ADD COLUMN IF NOT EXISTS dashed BOOLEAN DEFAULT false;
ALTER TABLE splice_trays ADD COLUMN IF NOT EXISTS name VARCHAR(255);
```

See the migration DO block at the end of `backend/db/init.sql`.

## Key Files

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `backend/db/init.sql` | PostGIS schema + RLS policies + migrations |
| `backend/src/middleware/auth.ts` | JWT validation + tenant extraction |
| `backend/src/db.ts` | RLS query wrapper |
| `backend/src/routes/kml.ts` | KML import/export (preview + import) |
| `frontend/src/app/(app)/map/page.tsx` | Map editor main page |
| `frontend/src/app/(app)/map/MapView.tsx` | Leaflet map component |
| `frontend/src/app/(app)/catalogs/page.tsx` | Cable type catalog with visual config |
| `frontend/src/app/(app)/catalogs/page.tsx` | Cable type catalog with visual config |

## Login

- **Admin**: admin@infotecmg.net / admin123
- Login stores token + userRole in localStorage
- Superadmin access via /superadmin (promote user role in DB)
