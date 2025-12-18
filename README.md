# Facility Command Center v2 🚀

A reusable multi-facility network planning and rollout platform with verified geometry, data confidence tracking, and executive-ready ROI modeling.

**🎉 MVP STATUS: MILESTONE 1 COMPLETE** ✅
- ✅ Database & Infrastructure (PostgreSQL + PostGIS)
- ✅ Backend Services (Geocoding, ROI, Scoring, PDF, Audit)
- ✅ API Routes (Networks, Facilities, Import, Reports)
- ✅ Core Libraries (Coordinates, Validation, Types)
- ✅ Unit Tests (33/33 passing)
- ⚠️ Frontend UI (Home page done, map components pending Milestone 2)

---

## 🎯 Product Overview

Ship defensible ROI cases for operational transformation across distributed facility networks. Built for:
- **Sales/BD Teams**: Generate executive PDFs with the hero line: *"You are burning ~$XXX,XXX/month by waiting."*
- **Operations Leaders**: Prioritize facility rollouts with data-driven scoring
- **Network Engineers**: Verify facility geometry and operational metrics with confidence tracking

**Verified Geometry Contract** (non-negotiable):
- Facilities must have `centroid` + (`polygon` OR `cannot_polygon_reason`) to be VERIFIED
- All coordinates stored as `[lng, lat]` in WGS84
- Save-refresh persistence guaranteed (± 0.000001°)

---

## 📚 Documentation

- **[PRODUCT_SPEC.md](./PRODUCT_SPEC.md)** - User stories, acceptance criteria, success metrics
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, data flow, tech stack
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Postgres + PostGIS schema, migrations, queries
- **[API_SPEC.md](./API_SPEC.md)** - REST endpoints, payloads, error codes
- **[FRONTEND_STRUCTURE.md](./FRONTEND_STRUCTURE.md)** - Page structure, components, state management

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Maps | Mapbox GL JS + Mapbox Draw |
| Backend | Next.js API Routes |
| Database | PostgreSQL 14+ with PostGIS 3.3+ |
| ORM | Prisma 5+ |
| Validation | Zod |
| PDF | Playwright (HTML → PDF) |
| Geocoding | Mapbox Geocoding API |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and **npm 9+**
- **Docker** (for local Postgres + PostGIS)
- **Mapbox Account** (free tier ok)

### 1. Clone and Install

```bash
cd /workspaces/GENSIS
npm install
```

### 2. Start Database

```bash
# Start Postgres + PostGIS with Docker
docker run --name facility-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=facility_command_center \
  -p 5432:5432 \
  -d postgis/postgis:14-3.3
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Mapbox token: https://account.mapbox.com/access-tokens/

### 4. Initialize Database

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Create tables
npm run db:seed      # Seed with 5 sample facilities
```

### 5. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

---

## ✅ What's Implemented

### ✓ Foundation
- [x] Next.js 14 project scaffolding with TypeScript
- [x] Prisma schema with PostGIS support
- [x] Database seed script (5 sample facilities)
- [x] Geospatial utilities with strict [lng, lat] validation
- [x] Zod validation schemas for all API inputs
- [x] TypeScript types for all entities

### ✓ Documentation
- [x] Product specification with user stories
- [x] System architecture diagram
- [x] Database schema with migrations
- [x] API specification (all endpoints documented)
- [x] Frontend structure (page routes, components)

---

## 🚧 To Be Implemented (MVP Milestone 1)

The foundation is solid. Remaining work includes:

- **Backend Services**: Geocoding, ROI calculations, scoring, PDF generation, audit logging
- **API Routes**: Networks CRUD, facilities CRUD, CSV import, geometry verification
- **Frontend Pages**: Network list, map view, facility detail, import wizard
- **Components**: Map with clustering, metrics forms, scoring displays
- **Testing**: Unit tests for coordinates/ROI, integration tests for verification flow

See README sections above for detailed breakdown of each item.

---

## 🧪 Manual QA Checklist

Before considering MVP complete:

- [ ] Import CSV with 5 facilities → all geocode successfully
- [ ] Verify facility centroid → save → refresh → centroid unchanged
- [ ] Draw polygon → save → refresh → polygon unchanged
- [ ] Invalid coords (lat=200) → rejected with error
- [ ] UNVERIFIED facility ROI → shows low confidence
- [ ] Generate PDF with <70% verified → watermark present
- [ ] Edit metric → audit log entry created

---

## 🔧 Development Commands

```bash
npm run dev         # Start dev server
npm run db:generate # Generate Prisma client
npm run db:push     # Push schema to database
npm run db:seed     # Seed sample data
npm run db:studio   # Open Prisma Studio
npm test            # Run tests
```

---

## 📞 Support

For technical questions, refer to:
- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [PostGIS Reference](https://postgis.net/docs/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

**Built with ❤️ for operational excellence**