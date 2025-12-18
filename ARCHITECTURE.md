# Facility Command Center - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React + TypeScript)                          │
│  - Map UI (Mapbox GL JS)                                        │
│  - Network/Facility Management                                   │
│  - Verification Workflows                                        │
│  - Metrics Forms with Confidence Tracking                        │
│  - Tailwind CSS                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTPS/REST
             │
┌────────────▼────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (Node.js)                                   │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Network API      │  │ Facility API     │                    │
│  │ - CRUD           │  │ - CRUD           │                    │
│  │ - ROI Calc       │  │ - Import CSV     │                    │
│  └──────────────────┘  │ - Geocoding      │                    │
│                        │ - Verification   │                    │
│  ┌──────────────────┐  └──────────────────┘                    │
│  │ Reporting API    │                                           │
│  │ - PDF Generation │  ┌──────────────────┐                    │
│  │ - Playwright     │  │ Scoring Engine   │                    │
│  └──────────────────┘  │ - Completeness   │                    │
│                        │ - ROI Confidence │                    │
│                        │ - Priority       │                    │
│                        └──────────────────┘                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             │
┌────────────▼────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 14+ with PostGIS 3.3+                               │
│                                                                  │
│  Tables:                                                         │
│  - networks                                                      │
│  - facilities                                                    │
│  - facility_metrics (confidence tracked)                         │
│  - facility_geometry_verification                                │
│  - roi_assumptions                                               │
│  - audit_logs                                                    │
│  - users (stub for MVP)                                          │
│                                                                  │
│  PostGIS Types:                                                  │
│  - GEOMETRY(Point, 4326) for centroids                          │
│  - GEOMETRY(Polygon, 4326) for geofences                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             │
┌────────────▼────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  - Mapbox Geocoding API (forward geocode, place search)         │
│  - Mapbox GL JS (map tiles, clustering)                         │
│  - Mapbox Draw (polygon drawing)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Frontend (Next.js Client)

**Pages/Routes**:
- `/` - Home/Network List
- `/networks/[id]` - Network Dashboard (Map View)
- `/networks/[id]/facilities/[facilityId]` - Facility Detail
- `/networks/[id]/import` - CSV Import Wizard
- `/networks/[id]/settings` - ROI Assumptions Editor

**Key Components**:

1. **MapView**
   - Renders Mapbox GL map with facilities
   - Clustering for 100+ markers
   - Facility flyouts on click
   - Verification mode overlay

2. **GeometryVerification**
   - Address search + geocode candidates
   - Click-to-place centroid
   - Draggable marker refinement
   - Mapbox Draw integration for polygons
   - Save verification metadata

3. **FacilityMetricsForm**
   - Operational metrics inputs
   - Confidence score selector (0-100)
   - Source dropdown (manual|import|estimate|integration)
   - Evidence link manager (URLs)
   - Last verified timestamp display

4. **ScoringDisplay**
   - Data completeness gauge (0-100) + level badge
   - ROI confidence gauge (0-100) + level badge
   - "Top 3 missing fields" callout
   - "Top 3 confidence drivers" callout

5. **CSVImport**
   - File upload dropzone
   - Column mapping UI
   - Geocoding progress bar
   - Error/validation report

6. **AuditLog**
   - Paginated table of changes
   - Timestamp, user, field, old→new

### Backend (Next.js API Routes)

**API Endpoints**:

**Networks**:
- `GET /api/networks` - List all networks
- `POST /api/networks` - Create network
- `GET /api/networks/:id` - Get network details
- `PATCH /api/networks/:id` - Update network
- `DELETE /api/networks/:id` - Soft delete network

**Facilities**:
- `GET /api/networks/:networkId/facilities` - List facilities
- `POST /api/networks/:networkId/facilities` - Create facility
- `GET /api/facilities/:id` - Get facility detail
- `PATCH /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Soft delete facility
- `POST /api/facilities/:id/verify-geometry` - Save centroid + polygon + metadata

**Import**:
- `POST /api/networks/:networkId/import/csv` - Upload + geocode CSV

**Geocoding**:
- `POST /api/geocode/forward` - Forward geocode address
- `POST /api/geocode/batch` - Batch geocode array of addresses

**ROI**:
- `GET /api/networks/:networkId/roi` - Network-wide ROI summary
- `GET /api/facilities/:id/roi` - Facility-level ROI calculation
- `POST /api/networks/:networkId/roi/assumptions` - Update ROI assumptions

**Scoring**:
- `GET /api/facilities/:id/completeness` - Data completeness score + breakdown
- `GET /api/facilities/:id/roi-confidence` - ROI confidence score + drivers

**Reports**:
- `POST /api/reports/network/:networkId/pdf` - Generate Network Rollout Brief

**Service Modules**:

1. **geocodingService.ts**
   - `forwardGeocode(address, options)` → candidates with confidence
   - `batchGeocode(addresses)` → results array with errors
   - Mapbox API integration with rooftop preference

2. **geometryService.ts**
   - `validateCoordinates([lng, lat])` → throws if invalid
   - `validateGeoJSON(polygon)` → validates ring closure, winding order
   - `calculateCentroid(polygon)` → returns centroid [lng, lat]

3. **scoringService.ts**
   - `calculateCompletenessScore(facility)` → {score, level, missing_fields}
   - `calculateROIConfidence(facility, roi)` → {score, level, drivers}
   - `calculatePriorityScore(facility, assumptions)` → {score, factors} (stub for MVP)

4. **roiService.ts**
   - `calculateFacilityROI(facility, assumptions)` → detailed ROI breakdown
   - `calculateNetworkROI(facilities, assumptions)` → aggregated ROI
   - `calculateDelayCost(roi, timeframe)` → monthly/weekly delay cost

5. **pdfService.ts**
   - `generateNetworkBrief(network, facilities, roi)` → PDF buffer
   - Uses Playwright to render HTML template → PDF
   - Applies watermark rules based on confidence

6. **auditService.ts**
   - `logChange(user_id, entity_type, entity_id, field, old_value, new_value)`
   - `getAuditLog(entity_type, entity_id, limit)` → recent entries

### Database (Postgres + PostGIS)

**Schema Design Principles**:
- Strong typing for all coordinates (GEOMETRY types)
- Confidence tracking via JSONB columns
- Soft deletes (deleted_at timestamps)
- Foreign key constraints enforced
- Audit logging for all mutations
- ROI assumptions versioned via effective_date + version

**Key Tables** (see DATABASE_SCHEMA.md for full DDL):
- `networks` - Customer/shipper networks
- `facilities` - Individual facilities with geometry
- `facility_metrics` - Operational data with confidence
- `facility_geometry_verification` - Verification audit trail
- `roi_assumptions` - Network-level ROI parameters
- `audit_logs` - Change history
- `users` - User accounts (stub for MVP)

---

## Data Flow Examples

### 1. CSV Import Flow
```
User uploads CSV
  ↓
POST /api/networks/:networkId/import/csv
  ↓
Parse CSV → validate columns
  ↓
For each row:
  - Extract address fields
  - Call Mapbox Geocoding API
  - Validate coordinates
  - Insert facility with geometry = UNVERIFIED
  - Log import in audit_logs
  ↓
Return {success_count, error_count, errors[]}
  ↓
Frontend displays import report
```

### 2. Geometry Verification Flow
```
User clicks "Verify Geometry" on facility
  ↓
Frontend opens map in verification mode
  ↓
User searches address
  ↓
POST /api/geocode/forward → returns candidates
  ↓
User selects candidate → marker placed
  ↓
User drags marker to refine
  ↓
User draws polygon geofence
  ↓
User clicks "Save Verification"
  ↓
POST /api/facilities/:id/verify-geometry
  {
    centroid: [lng, lat],
    polygon: {type: "Polygon", coordinates: [[[...]]]},
    verification_method: "manual_map_placement",
    confidence_score: 95,
    verified_by_user_id: 1
  }
  ↓
Backend validates:
  - Coordinates in valid range
  - Polygon ring closes
  - GeoJSON valid
  ↓
UPDATE facilities SET
  facility_centroid = ST_GeomFromGeoJSON(...),
  facility_polygon = ST_GeomFromGeoJSON(...),
  verification_status = 'VERIFIED'
  ↓
INSERT INTO facility_geometry_verification (...)
  ↓
INSERT INTO audit_logs (...)
  ↓
Return updated facility
  ↓
Frontend refreshes → shows VERIFIED badge
```

### 3. PDF Generation Flow
```
User clicks "Generate PDF" on network dashboard
  ↓
POST /api/reports/network/:networkId/pdf
  ↓
Backend:
  - Fetch network + all facilities
  - Calculate network-wide ROI
  - Calculate completeness scores
  - Calculate ROI confidence scores
  - Determine verified facility %
  - Check watermark rules
  ↓
Render HTML template with data:
  - Cover page with hero line
  - Confidence badges
  - Executive summary
  - Map snapshot (static Mapbox image)
  - ROI breakdown table
  - Data health chart
  - Assumptions table
  ↓
Launch Playwright headless browser
  ↓
Load HTML → page.pdf()
  ↓
If watermark needed, overlay "DIRECTIONAL ESTIMATE"
  ↓
Return PDF buffer
  ↓
Frontend downloads as
  Network_Rollout_Brief_Primo_Brands_2025-12-18.pdf
```

---

## Security Model (MVP)

**Authentication**: 
- Single hardcoded admin user for MVP
- Session stored in HTTP-only cookie (NextAuth.js stub)
- API routes check `req.user` existence (always returns admin)

**Authorization** (designed but not enforced in MVP):
- Roles: admin, network_manager, viewer
- Permissions: create/read/update/delete networks/facilities
- Future: row-level security on networks table

**Data Validation**:
- Zod schemas for all API inputs
- Coordinate validation at API boundary
- SQL injection prevention via parameterized queries (Prisma/pg)

---

## Deployment Architecture (Future)

```
┌──────────────────────┐
│   Vercel/Railway     │
│   Next.js App        │
│   - Frontend SSR     │
│   - API Routes       │
│   - Playwright       │
└──────────┬───────────┘
           │
           │
┌──────────▼───────────┐
│   Railway/Render     │
│   PostgreSQL+PostGIS │
│   - Automated backups│
│   - Connection pool  │
└──────────────────────┘
```

**MVP**: Local dev with Docker Compose (postgres + app)

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | Next.js 14+ (App Router) | SSR, API routes, TypeScript support |
| UI Library | React 18+ | Component-based, hooks, ecosystem |
| Styling | Tailwind CSS | Utility-first, rapid prototyping |
| Maps | Mapbox GL JS | Superior clustering, GeoJSON support |
| Drawing | @mapbox/mapbox-gl-draw | Polygon geofence drawing |
| Database | PostgreSQL 14+ | ACID, relational, mature |
| Geospatial | PostGIS 3.3+ | Industry standard, ST_* functions |
| ORM | Prisma 5+ | Type-safe, migrations, DX |
| Validation | Zod | Runtime + compile-time safety |
| PDF Generation | Playwright | Headless Chrome, reliable rendering |
| Geocoding | Mapbox Geocoding API | Rooftop accuracy, global coverage |
| Testing | Jest + Testing Library | Unit + integration tests |
| Type Safety | TypeScript 5+ | Static analysis, refactor safety |

---

## Performance Optimizations

1. **Map Clustering**: Use Supercluster algorithm for 1000+ markers
2. **Facility List**: Virtual scrolling for 300+ items
3. **Geocoding**: Batch API calls (50 at a time) with rate limiting
4. **Database**: Indexes on facility_name, network_id, coordinates
5. **PDF**: Generate async with job queue (future: BullMQ)
6. **Caching**: Redis for ROI calculations (future)

---

## Error Handling Strategy

**API Layer**:
- All endpoints return consistent structure:
  ```json
  {
    "success": true|false,
    "data": {...},
    "error": {
      "code": "INVALID_COORDINATES",
      "message": "Latitude must be between -90 and 90",
      "field": "centroid"
    }
  }
  ```

**Frontend**:
- Toast notifications for errors
- Form-level validation errors
- Retry logic for network failures

**Database**:
- Constraint violations return 400 Bad Request
- Foreign key errors return meaningful messages
- Transaction rollback on failures

---

## Monitoring & Observability (Future)

- **Logging**: Structured JSON logs (pino)
- **Metrics**: API latency, geocoding success rate, PDF generation time
- **Alerts**: Failed geocodes > 10%, PDF generation > 30s
- **Tracing**: OpenTelemetry for request flows

---

## Scalability Considerations

**Current (MVP)**: Handles 1 network with 300 facilities
**Future**:
- 100+ networks with 50,000+ total facilities
- Postgres read replicas for reporting
- CDN for static map tiles
- Background jobs for PDF generation
- Horizontal scaling of API layer

---

## Development Workflow

1. Local: Docker Compose (postgres + next dev)
2. Migrations: `prisma migrate dev`
3. Seed: `npm run seed`
4. Test: `npm test`
5. Build: `npm run build`
6. Deploy: `git push` → Vercel auto-deploy
