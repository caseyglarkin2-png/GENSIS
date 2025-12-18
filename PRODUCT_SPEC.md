# Facility Command Center v2 - Product Specification

## Product Vision
A reusable multi-facility network planning and rollout platform that enables executives and operations teams to model, verify, prioritize, and export defensible ROI cases for operational transformation across distributed networks.

## Target Users
1. **Sales/BD Teams**: Generate executive-ready PDFs with defensible ROI
2. **Operations Leaders**: Prioritize facility rollouts based on data-driven scoring
3. **Network Engineers**: Verify facility geometry and operational metrics
4. **Executives**: Review network-wide opportunity and delay costs

## MVP Milestone 1 - Core Features

### 1. Network Management
**User Story**: As a user, I want to create and manage facility networks (e.g., Primo Brands, NFI Industries) so I can organize facilities by customer/shipper.

**Acceptance Criteria**:
- Create network with name, description, customer type
- List all networks with facility counts
- Select active network for operations
- Delete network (with confirmation)

### 2. Facility Import & Geocoding
**User Story**: As a user, I want to bulk import facilities from CSV with automatic geocoding so I can quickly onboard a network.

**Acceptance Criteria**:
- Upload CSV with required fields: name, address, city, state, zip
- System geocodes each facility using Mapbox API with rooftop preference
- System validates coordinates (lat [-90,90], lng [-180,180])
- Import shows progress + errors
- Facilities marked UNVERIFIED after import until geometry verified
- Download CSV template with example data

### 3. Verified Geometry Contract (Critical)
**User Story**: As a network engineer, I need to verify each facility's location and boundary so ROI calculations are trustworthy.

**Acceptance Criteria**:
- Facility cannot be "verified" without both centroid AND (polygon OR cannot_polygon_reason)
- UI displays UNVERIFIED badge until verification complete
- Verification captures: timestamp, user_id, method, confidence_score
- Centroid stored as [lng, lat] in WGS84
- Polygon stored as GeoJSON with exterior ring validation
- System rejects invalid coordinates at API boundary

**Verification Workflow**:
1. Search address → forward geocode → show candidates with confidence
2. Click "Set Centroid" → place marker on map
3. Drag marker to refine position
4. Draw polygon geofence using Mapbox Draw
5. Save → store centroid + polygon + metadata
6. Status changes from UNVERIFIED → VERIFIED

### 4. Map View with Facility Management
**User Story**: As a user, I want to see all facilities on a map with clustering and verification tools.

**Acceptance Criteria**:
- Map shows facilities with clustering at low zoom
- Click facility → open flyout with name, address, verification status
- Color-coded markers: green=verified, yellow=needs review, red=unverified
- Facility flyout actions: "Verify Geometry", "Edit Details", "View Full"
- Map persists zoom/center in session
- Search bar for address/facility name with autocomplete

### 5. Facility Detail Page
**User Story**: As a network engineer, I want to capture operational metrics with confidence tracking so ROI is defensible.

**Acceptance Criteria**:
**Geometry Section**:
- Display centroid coordinates [lng, lat]
- Show polygon on mini-map (if exists)
- "Edit Geometry" button → opens verification workflow
- Verification metadata: date, user, method, confidence

**Operational Metrics** (all with confidence tracking):
- docks_count (int, confidence, source, last_verified_at, evidence_links)
- gates_count (int, confidence, source, last_verified_at, evidence_links)
- yard_spots_count (int, confidence, source, last_verified_at, evidence_links)
- trailers_on_yard_avg (int, confidence, source, last_verified_at, evidence_links)
- trucks_per_day_inbound (int, confidence, source, last_verified_at, evidence_links)
- trucks_per_day_outbound (int, confidence, source, last_verified_at, evidence_links)
- avg_turn_time_minutes (int, confidence, source, last_verified_at, evidence_links)
- detention_minutes_per_truck (int, confidence, source, last_verified_at, evidence_links)
- bottlenecks (multi-select): gate_congestion, yard_congestion, paperwork, trailer_hunting, dock_scheduling, driver_check_in

**Data Confidence Display**:
- Each metric shows confidence score badge (0-100)
- Source dropdown: manual | import | geocoder | estimate | integration
- Evidence links (URLs to docs/screenshots)
- "Last verified" timestamp with user name

**Scoring Display**:
- Data Completeness Score: XX/100 (Discovery|Planning|Rollout-Ready|Exec-Ready)
- Missing fields: "Top 3 fixes to improve completeness"
- ROI Confidence Score: XX/100 (Speculative|Directional|Defensible|Boardroom-Ready)
- ROI drivers: "Top 3 inputs impacting confidence"

**Audit Log**:
- Show last 20 changes with timestamp, user, field, old→new value

### 6. ROI Calculation Engine
**User Story**: As a sales leader, I need to calculate defensible ROI with transparent assumptions so I can present to executives.

**Acceptance Criteria**:
- Network has ROI assumptions template (JSON) with version
- Assumptions cover: detention cost/hr, labor cost/hr, baseline/target times, implementation costs
- System calculates per-facility:
  - projected_annual_roi (detention + labor + paperwork + trailer hunt savings)
  - projected_monthly_roi
  - projected_weekly_roi
  - delay_cost_per_month (opportunity cost of waiting)
  - delay_cost_per_week
- ROI includes confidence score + completeness + top 3 drivers
- If confidence < 70% (Defensible), flag as "DIRECTIONAL"

**ROI Components** (MVP):
1. Detention savings: (baseline_detention_min - target_detention_min) × trucks_per_day × detention_cost_per_hour
2. Paperwork reduction: (paperwork_min - target_paperwork_min) × trucks_per_day × labor_cost_per_hour
3. Trailer hunt reduction: (baseline_searches × avg_search_min - 0) × labor_cost_per_hour

### 7. Data Completeness Scoring
**User Story**: As a user, I need to know how complete facility data is so I can prioritize data collection.

**Acceptance Criteria**:
- Completeness score (0-100) with breakdown:
  - Geometry: 30% weight (VERIFIED=100, NEEDS_REVIEW=70, UNVERIFIED=50, missing=0)
  - Throughput metrics: 30% weight (avg confidence of trucks/day, turn time, detention)
  - Infrastructure: 20% weight (docks, gates, yard spots confidence)
  - Bottlenecks: 10% weight (1+ selected)
  - Lane data: 10% weight (optional in MVP)
- Completeness level enum:
  - 0-39: Discovery
  - 40-69: Planning
  - 70-84: Rollout-Ready
  - 85-100: Exec-Ready
- Display top 3 missing fields with biggest score impact

### 8. ROI Confidence Scoring
**User Story**: As a sales leader, I need to know if ROI is defensible before presenting to C-suite.

**Acceptance Criteria**:
- ROI confidence (0-100) calculated from:
  - geometry_factor: VERIFIED=1.0, NEEDS_REVIEW=0.7, UNVERIFIED=0.5, missing=0.0
  - freshness_factor: days_since_verification (decay curve)
  - component_confidence: weighted avg of input metrics by ROI contribution
- Confidence level enum:
  - 0-39: Speculative
  - 40-69: Directional
  - 70-84: Defensible
  - 85-100: Boardroom-Ready
- Display top 3 drivers of low confidence (specific missing/low inputs)

### 9. Executive PDF Export
**User Story**: As a sales leader, I want to generate a branded PDF with the "burning cost" hero line for executive presentations.

**Acceptance Criteria**:
**Network Rollout Brief**:
- Cover page with:
  - Hero line: "You are burning ~$XXX,XXX/month by waiting."
  - Subline: "Delay tax: ~$XX,XXX/week • Annual opportunity: ~$X.XM/year"
  - Confidence badges: ROI Confidence, Data Readiness, Verified Facilities %
  - Footer: Assumptions version, Scoring model version, Generated timestamp
- Executive Summary (1 page): Top 10 facilities by priority, what's missing
- Map snapshot: Facilities with top 10 highlighted
- ROI breakdown: By component (detention, paperwork, trailer hunt) + delay cost
- Data Health: Completeness distribution chart + "Top missing inputs" list
- Assumptions summary: Key parameters + methodology disclaimer

**Watermark Rules**:
- If ROI confidence < 70% OR verified % < 70%: watermark "DIRECTIONAL ESTIMATE — VALIDATE INPUTS" on all pages
- If facility geometry UNVERIFIED: add "UNVERIFIED GEOMETRY" badge + "Improve Confidence" checklist

**Technical**:
- Server-side generation via Playwright (HTML → PDF)
- Endpoint: POST /api/reports/network/:networkId/pdf
- Returns: PDF blob with filename: `Network_Rollout_Brief_${network_name}_${date}.pdf`

---

## Non-Functional Requirements

### Geospatial Correctness (Non-Negotiable)
1. **Coordinate Order**: All map UI uses [lng, lat], storage is WGS84
2. **Validation**: Reject lat outside [-90,90], lng outside [-180,180] at API boundary
3. **Strong Typing**: TypeScript interfaces enforce [number, number] for LngLat
4. **Runtime Validation**: Zod schemas validate coordinates on all inputs
5. **No Drift**: Centroid/polygon save-refresh must return identical coordinates (± 0.000001°)
6. **GeoJSON Validity**: Polygons must close (first point = last point), exterior ring CCW

### Performance
- Facility list with 300+ items loads in < 2s
- Map renders 300 markers with clustering in < 1s
- Geocoding batch of 50 facilities completes in < 60s
- PDF generation completes in < 10s
- Geometry verification save/refresh roundtrip < 500ms

### Data Integrity
- All writes logged in audit_logs table
- Facility updates create audit entries with user_id + timestamp
- Soft delete for networks/facilities (deleted_at)
- Foreign key constraints enforced

### Security (MVP: Local Dev Auth)
- Single admin user for MVP
- Design schema for roles: admin, network_manager, viewer
- API routes validate user exists (stub full auth for Milestone 2)

---

## Out of Scope for MVP (Milestone 2+)
- Multi-user authentication (SSO, RBAC)
- Facility scoring/prioritization algorithm (stub in MVP)
- Wave planning UI (manual grouping ok)
- Real-time lane intelligence integrations
- Historical trend analysis
- Mobile app
- Facility One-Pager PDF (optional if time)
- Advanced ROI modeling (ramp curves, seasonality)

---

## Success Metrics
- **Speed**: Import and verify 10 facilities in < 10 minutes
- **Correctness**: 0 lat/lng swap bugs in QA checklist
- **Usability**: Sales team can generate exec PDF without eng support
- **Defensibility**: ROI confidence ≥ 70% for ≥ 50% of facilities after verification

---

## Technical Debt Allowed in MVP
- Hardcoded single admin user
- Simple ROI calculation (3 components only)
- No wave planning algorithm (Top 10 list ok)
- No real-time integrations (manual data entry)
- Basic UI styling (Tailwind defaults ok, no custom branding)

---

## Manual QA Checklist (Required Before Ship)
1. Import CSV with 5 facilities → all geocode successfully
2. Verify facility centroid via map → save → refresh page → centroid unchanged
3. Draw polygon → save → refresh → polygon unchanged
4. Import facility with invalid coords (lat=200) → rejected with error
5. Calculate ROI for facility with UNVERIFIED geometry → shows low confidence + watermark in PDF
6. Generate PDF for network with < 70% verified → watermark present
7. Generate PDF for network with ≥ 70% verified + high confidence → no watermark
8. Edit facility metric → audit log shows entry
9. Inspect DB: facility_centroid stored as [lng, lat] in valid range
10. Run unit tests for coordinate validation → all pass

---

## Glossary
- **Verified Geometry**: Facility has centroid + (polygon OR cannot_polygon_reason) + verification metadata
- **Confidence Score**: 0-100 metric for data reliability (source, freshness, verification)
- **Completeness Score**: 0-100 metric for data coverage (what % of fields populated)
- **ROI Confidence**: Combined score from geometry + freshness + input confidence
- **Delay Cost**: Opportunity cost per time period (week/month) of not implementing
- **Rooftop Geocoding**: Highest precision geocode (building-level vs street-level)
