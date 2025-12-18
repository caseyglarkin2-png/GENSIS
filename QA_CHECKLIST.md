# QA Checklist - Facility Command Center v2

## Critical: Geospatial Correctness

### Coordinate Order Validation
- [ ] **Test: Valid [lng, lat] acceptance**
  - Call `validateLngLat([-122.4194, 37.7749])` - should pass
  - Call `validateLngLat([0, 0])` - should pass
  - Call `validateLngLat([-180, -90])` - should pass (boundaries)
  - Call `validateLngLat([180, 90])` - should pass (boundaries)

- [ ] **Test: Invalid longitude rejection**
  - Call `validateLngLat([-181, 37.7749])` - should throw "Longitude"
  - Call `validateLngLat([181, 37.7749])` - should throw "Longitude"

- [ ] **Test: Invalid latitude rejection**
  - Call `validateLngLat([-122.4194, -91])` - should throw "Latitude"
  - Call `validateLngLat([-122.4194, 91])` - should throw "Latitude"

- [ ] **Test: Non-numeric rejection**
  - Call `validateLngLat([NaN, 37.7749])` - should throw "NaN"
  - Call `validateLngLat([-122.4194, Infinity])` - should throw "finite"

### GeoJSON Structure Validation
- [ ] **Test: Valid GeoJSON Point**
  ```json
  {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  }
  ```
  Should pass `validateGeoJSONPoint()`

- [ ] **Test: Valid GeoJSON Polygon**
  - Polygon with 4+ points
  - First and last point are identical (ring closure)
  - Should pass `validateGeoJSONPolygon()`

- [ ] **Test: Polygon ring closure**
  - Polygon where first != last point should throw "must close"

### Database Geometry Storage
- [ ] **Test: Centroid insert and retrieve**
  - Insert facility with centroid via `ST_GeomFromGeoJSON`
  - Query back with `ST_AsText` and parse with `parseWKTPoint`
  - Verify coordinates match original [lng, lat] order

- [ ] **Test: Polygon insert and retrieve**
  - Insert facility with polygon via `ST_GeomFromGeoJSON`
  - Query back with `ST_AsGeoJSON`
  - Verify GeoJSON structure is valid

---

## Verified Geometry Contract

### Verification Status Rules
- [ ] **Test: VERIFIED status**
  - Facility has centroid
  - Facility has polygon OR cannot_polygon_reason
  - Confidence >= 70%
  - Result: verification_status = 'VERIFIED'

- [ ] **Test: NEEDS_REVIEW status**
  - Facility has centroid
  - Confidence < 70% OR (no polygon AND no reason)
  - Result: verification_status = 'NEEDS_REVIEW'

- [ ] **Test: UNVERIFIED status**
  - Facility has no centroid
  - Result: verification_status = 'UNVERIFIED'
  - Data completeness score = 0

### Geometry Verification API
- [ ] **Test: POST /api/facilities/:id/verify-geometry**
  - Payload:
    ```json
    {
      "centroid": [-122.4194, 37.7749],
      "polygon": { "type": "Polygon", "coordinates": [[...]] },
      "confidence": 85,
      "verificationMethod": "manual",
      "notes": "Verified via satellite imagery"
    }
    ```
  - Should update facility_centroid, facility_polygon
  - Should create facility_geometry_verification record
  - Should create audit_log entry with action 'geometry_verified'

- [ ] **Test: Refresh page after verification**
  - Verify facility on map
  - Reload page
  - Confirm centroid and polygon persist correctly
  - Confirm no coordinate drift

---

## CSV Import & Geocoding

### CSV Import Validation
- [ ] **Test: Valid CSV import**
  - Upload CSV with required fields (name, addressLine1, city, state, zip)
  - Should geocode each address
  - Should create facilities with centroids
  - Should set verification_status based on geocode confidence

- [ ] **Test: Missing required fields**
  - Upload CSV with missing name or address
  - Should return error for invalid rows
  - Should still process valid rows

- [ ] **Test: Geocoding enrichment**
  - Import facility "123 Main St, Dallas, TX 75201"
  - Should call Mapbox Geocoding API
  - Should set geocode_method (rooftop/parcel/address)
  - Should set geocode_confidence (0-100)
  - If confidence >= 70, set status = 'NEEDS_REVIEW'
  - If confidence < 70, set status = 'UNVERIFIED'

### Batch Geocoding
- [ ] **Test: Rate limiting**
  - Import 10+ facilities
  - Should add 50ms delay between geocoding requests
  - Should not exceed Mapbox rate limits (10 req/sec)

---

## ROI Calculation

### Component Calculations
- [ ] **Test: Detention savings**
  - Facility with 100 trucks/day, 30 min detention
  - Assumptions: target = 5 min, cost = $75/hr
  - Expected: (30-5)/60 * 100 * 260 * 75 = $812,500/year

- [ ] **Test: Paperwork reduction**
  - Facility with 100 trucks/day
  - Assumptions: baseline = 6 min, target = 1 min, cost = $28/hr
  - Expected: (6-1)/60 * 100 * 260 * 28 = $60,667/year

- [ ] **Test: Trailer hunt elimination**
  - Facility with bottleneck 'trailer_hunting'
  - Assumptions: 10 searches/day eliminated, 8 min each, cost = $28/hr
  - Expected: 10 * 8/60 * 260 * 28 = $9,707/year

- [ ] **Test: Network aggregation**
  - Network with 5 facilities, each $100k/year ROI
  - Expected totalAnnualROI: $500k
  - Expected totalMonthlyROI: $41,667
  - Expected delayCostPerMonth: $41,667

### Confidence Factors
- [ ] **Test: Geometry factor**
  - VERIFIED geometry → 1.0
  - NEEDS_REVIEW geometry → 0.7
  - UNVERIFIED geometry → 0.5
  - Missing centroid → 0.0

- [ ] **Test: Freshness factor**
  - Data < 30 days old → 1.0
  - Data 30-90 days old → 0.9
  - Data 90-180 days old → 0.7
  - Data > 180 days old → 0.5

---

## Data Completeness Scoring

### Score Calculation
- [ ] **Test: Geometry completeness (40% weight)**
  - No centroid → 0 (hard gate)
  - Has centroid only → 50
  - Has centroid + polygon → 100
  - Has centroid + cannot_polygon_reason → 75

- [ ] **Test: Throughput metrics (30% weight)**
  - All 4 metrics present with 100% confidence → 100
  - 2 metrics with 80% confidence → ~53
  - No metrics → 0

- [ ] **Test: Infrastructure metrics (20% weight)**
  - All 4 metrics present → 100
  - No metrics → 0

- [ ] **Test: Bottleneck characterization (10% weight)**
  - Has bottlenecks array with items → 100
  - Empty or missing → 0

### Completeness Levels
- [ ] **Test: Level thresholds**
  - Score 0-39 → 'Discovery'
  - Score 40-69 → 'Planning'
  - Score 70-84 → 'Rollout-Ready'
  - Score 85-100 → 'Exec-Ready'

---

## PDF Generation

### Network Rollout Brief
- [ ] **Test: Cover page hero line**
  - Generate PDF for network with $50k/month delay cost
  - Cover should display:
    ```
    You are burning
    ~$50,000/month
    by waiting.
    ```
  - Font size: 48px for text, 72px for amount
  - Color: Red (#dc2626)

- [ ] **Test: Confidence badges**
  - Cover should show:
    - ROI Confidence: [Level] ([Score]/100)
    - Data Readiness: [Level] ([Score]/100)
    - Verified Facilities: [X]/[Total] ([%]%)

- [ ] **Test: Watermark rules**
  - If ROI confidence < 70% → watermark "DIRECTIONAL ESTIMATE — VALIDATE INPUTS"
  - If verified % < 70% → watermark "DIRECTIONAL ESTIMATE — VALIDATE INPUTS"
  - Watermark: 72px, rotated -45deg, rgba(220, 38, 38, 0.1)

- [ ] **Test: Executive summary section**
  - Top 10 facilities table with:
    - Rank, Facility, Location, Status, Annual ROI, Data Score
  - Sorted by projectedAnnualROI descending

- [ ] **Test: Metadata footer**
  - Network name
  - Assumptions version
  - Scoring model version
  - Generated timestamp

### Facility One-Pager
- [ ] **Test: Facility detail PDF**
  - Should show facility name, address
  - ROI metrics grid (annual, monthly delay cost, confidence, completeness)
  - ROI components table (detention, paperwork, trailer hunt, turn time)
  - Watermark if geometry UNVERIFIED

---

## API Endpoints

### Networks
- [ ] **GET /api/networks** - List all networks with facility counts
- [ ] **POST /api/networks** - Create network (name required)
- [ ] **GET /api/networks/:id** - Get network with ROI assumptions
- [ ] **PATCH /api/networks/:id** - Update network name/description
- [ ] **DELETE /api/networks/:id** - Soft delete (set deleted_at)

### Facilities
- [ ] **GET /api/networks/:id/facilities** - List facilities with filters
- [ ] **GET /api/facilities/:id** - Get full facility details with metrics
- [ ] **PATCH /api/facilities/:id** - Update basic info (not geometry/metrics)
- [ ] **POST /api/facilities/:id/verify-geometry** - Save centroid + polygon
- [ ] **PATCH /api/facilities/:id/metrics** - Update operational metrics

### Import & Reports
- [ ] **POST /api/networks/:id/import/csv** - Batch import with geocoding
- [ ] **POST /api/reports/network/:id/pdf** - Generate executive PDF

---

## Audit Logging

### Audit Trail
- [ ] **Test: Facility created**
  - Create facility
  - Verify audit_log entry: action='facility_created', entity_type='facility'

- [ ] **Test: Geometry verified**
  - Verify facility geometry
  - Verify audit_log entry: action='geometry_verified', changes include centroid

- [ ] **Test: Metrics updated**
  - Update facility metrics
  - Verify audit_log entry: action='metrics_updated', changes include updated fields

- [ ] **Test: CSV imported**
  - Import CSV with 5 facilities
  - Verify audit_log entry: action='csv_imported', metadata includes facilitiesCreated=5

- [ ] **Test: PDF generated**
  - Generate network PDF
  - Verify audit_log entry: action='pdf_generated', metadata includes reportType

---

## Unit Tests

### Coordinate Validation Tests
- [ ] **Run: `npm test -- __tests__/lib/coordinates.test.ts`**
  - All 50+ test cases should pass
  - Coverage: validateLngLat, validateGeoJSONPoint, validateGeoJSONPolygon
  - Coverage: distanceInMeters, coordinatesEqual, calculatePolygonCentroid
  - Coverage: parseWKTPoint, edge cases

---

## Manual QA Workflow

### End-to-End: New Network → PDF Export
1. [ ] **Create network**
   - Go to http://localhost:3000
   - Click "New Network"
   - Enter name: "Test Network"
   - Save

2. [ ] **Import facilities**
   - Click network card
   - Click "Import CSV"
   - Upload CSV with 3-5 facilities
   - Verify facilities appear with geocoded centroids
   - Check verification_status (NEEDS_REVIEW or UNVERIFIED)

3. [ ] **Verify geometry**
   - Click facility
   - Click "Verify Geometry"
   - Confirm centroid on map
   - Draw polygon around facility
   - Save with confidence 85%
   - Verify status changes to VERIFIED

4. [ ] **Add metrics**
   - Click "Edit Metrics"
   - Add:
     - Trucks/day inbound: 50 (confidence 80%)
     - Trucks/day outbound: 50 (confidence 80%)
     - Detention minutes: 30 (confidence 75%)
     - Avg turn time: 60 (confidence 70%)
   - Add evidence link (URL)
   - Save

5. [ ] **Generate PDF**
   - Click "Generate PDF Report"
   - PDF downloads
   - Open PDF and verify:
     - Hero line shows delay cost
     - Confidence badges show scores
     - Top facilities table populated
     - Watermark applied if needed

6. [ ] **Refresh page**
   - Reload network page
   - Verify all data persists
   - Verify map shows facilities correctly
   - Verify no coordinate drift

---

## Performance Checks

- [ ] **Geocoding API calls** - Should complete in <2s per address
- [ ] **Database queries** - Facility list query <500ms for 100 facilities
- [ ] **PDF generation** - Network report <10s for 50 facilities
- [ ] **Map rendering** - 100+ facilities should cluster smoothly

---

## Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)

---

## Deployment Checklist

- [ ] Environment variables configured (.env)
- [ ] Mapbox tokens set (public + secret)
- [ ] Database migrations applied
- [ ] Seed data created (optional)
- [ ] Docker PostgreSQL running
- [ ] Next.js dev server running on :3000
- [ ] No console errors on page load
- [ ] API endpoints return 200 for valid requests

---

## Known Limitations (MVP)

- [ ] **Authentication**: Stub userId for audit logs (implement in Milestone 2)
- [ ] **Map UI**: Frontend map components not yet built (Milestone 2)
- [ ] **Facility detail page**: Full UI pending (Milestone 2)
- [ ] **Priority scoring**: Basic implementation, full model in Milestone 2
- [ ] **Waves/phasing**: Not implemented (Milestone 2)

---

## Success Criteria

✅ **MVP Complete When:**
1. Can create network via API
2. Can import facilities from CSV with geocoding
3. Can verify geometry via API (centroid + polygon)
4. Can add metrics with confidence via API
5. Can generate PDF with hero line and watermark rules
6. All coordinate validation tests pass
7. Geometry persists correctly after page refresh
8. Audit logs capture all mutations
9. No lat/lng order bugs in storage or display
10. PDF downloads with correct ROI calculations and confidence badges
