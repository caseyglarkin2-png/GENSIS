# Frontend Structure - Facility Command Center

## Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **UI**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS + @mapbox/mapbox-gl-draw
- **Forms**: React Hook Form + Zod validation
- **State**: React Context + hooks (no Redux for MVP)
- **Icons**: Heroicons or Lucide React

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with auth provider
│   ├── page.tsx                 # Home: Network list
│   ├── networks/
│   │   ├── page.tsx            # Network list
│   │   ├── new/
│   │   │   └── page.tsx        # Create network
│   │   └── [id]/
│   │       ├── page.tsx        # Network dashboard (MAP VIEW)
│   │       ├── import/
│   │       │   └── page.tsx    # CSV import wizard
│   │       ├── settings/
│   │       │   └── page.tsx    # ROI assumptions editor
│   │       └── facilities/
│   │           └── [facilityId]/
│   │               └── page.tsx # Facility detail
│   └── api/                     # API routes
│       ├── networks/
│       │   ├── route.ts         # GET, POST /api/networks
│       │   └── [id]/
│       │       ├── route.ts     # GET, PATCH, DELETE /api/networks/:id
│       │       ├── facilities/
│       │       │   └── route.ts # GET, POST facilities
│       │       ├── import/
│       │       │   └── csv/
│       │       │       └── route.ts # POST CSV import
│       │       └── roi/
│       │           ├── route.ts     # GET network ROI
│       │           └── assumptions/
│       │               └── route.ts # POST update assumptions
│       ├── facilities/
│       │   └── [id]/
│       │       ├── route.ts     # GET, PATCH, DELETE facility
│       │       ├── verify-geometry/
│       │       │   └── route.ts # POST verify geometry
│       │       ├── metrics/
│       │       │   └── route.ts # PATCH update metrics
│       │       ├── roi/
│       │       │   └── route.ts # GET facility ROI
│       │       ├── completeness/
│       │       │   └── route.ts # GET completeness score
│       │       └── roi-confidence/
│       │           └── route.ts # GET ROI confidence
│       ├── geocode/
│       │   ├── forward/
│       │   │   └── route.ts     # POST forward geocode
│       │   └── batch/
│       │       └── route.ts     # POST batch geocode
│       ├── reports/
│       │   └── network/
│       │       └── [networkId]/
│       │           └── pdf/
│       │               └── route.ts # POST generate PDF
│       └── audit-logs/
│           └── route.ts         # GET audit logs
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── ProgressBar.tsx
│   ├── map/                     # Map-specific components
│   │   ├── MapView.tsx          # Main map container
│   │   ├── FacilityMarker.tsx   # Custom marker component
│   │   ├── FacilityFlyout.tsx   # Click flyout
│   │   ├── GeometryVerification.tsx # Verification overlay
│   │   └── DrawControls.tsx     # Polygon drawing
│   ├── facility/                # Facility components
│   │   ├── FacilityMetricsForm.tsx
│   │   ├── MetricInput.tsx      # Single metric with confidence
│   │   ├── ConfidenceBadge.tsx
│   │   ├── ScoringDisplay.tsx   # Completeness + ROI confidence
│   │   └── AuditLog.tsx
│   ├── network/                 # Network components
│   │   ├── NetworkCard.tsx
│   │   ├── NetworkStats.tsx
│   │   └── ROIAssumptionsForm.tsx
│   ├── import/                  # Import components
│   │   ├── CSVUploader.tsx
│   │   ├── ColumnMapper.tsx
│   │   ├── ImportProgress.tsx
│   │   └── ErrorReport.tsx
│   └── layout/                  # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Breadcrumbs.tsx
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   ├── validation/              # Zod schemas
│   │   ├── coordinates.ts       # Coordinate validation
│   │   ├── facility.ts
│   │   ├── network.ts
│   │   └── roi.ts
│   ├── services/                # Business logic
│   │   ├── geocoding.ts         # Mapbox API integration
│   │   ├── geometry.ts          # GeoJSON validation
│   │   ├── scoring.ts           # Completeness + confidence
│   │   ├── roi.ts               # ROI calculations
│   │   ├── audit.ts             # Audit log service
│   │   └── pdf.ts               # PDF generation
│   ├── utils/                   # Utility functions
│   │   ├── coordinates.ts       # [lng, lat] helpers
│   │   ├── formatting.ts        # Currency, dates, etc.
│   │   └── errors.ts            # Error handling
│   └── types/                   # TypeScript types
│       ├── facility.ts
│       ├── network.ts
│       ├── metrics.ts
│       ├── roi.ts
│       └── api.ts               # API response types
├── hooks/                       # Custom React hooks
│   ├── useNetwork.ts
│   ├── useFacility.ts
│   ├── useMap.ts
│   └── useToast.ts
└── public/
    ├── csv-template.csv         # Download template
    └── images/
```

---

## Page Descriptions

### 1. Home / Network List (`/`)
**Route**: `app/page.tsx`

**Purpose**: List all networks with create button

**Components**:
- `NetworkCard[]` - Grid of network cards
- Create Network button → `/networks/new`

**Data Fetching**: `GET /api/networks`

---

### 2. Create Network (`/networks/new`)
**Route**: `app/networks/new/page.tsx`

**Purpose**: Form to create new network

**Components**:
- Form with fields: name, description, customer_type
- Submit → `POST /api/networks` → redirect to `/networks/[id]`

---

### 3. Network Dashboard (MAP VIEW) (`/networks/[id]`)
**Route**: `app/networks/[id]/page.tsx`

**Purpose**: PRIMARY INTERFACE - Map view with facilities

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Header: Network Name | Import | Settings | PDF │
├─────────────────────────────────────────────────┤
│ Stats Bar: 260 Facilities | 180 Verified | ROI │
├──────────────────────┬──────────────────────────┤
│                      │ Facility Flyout          │
│                      │ ┌──────────────────────┐ │
│                      │ │ Dallas DC            │ │
│   MAPBOX MAP         │ │ Status: VERIFIED     │ │
│   - Facility markers │ │ Completeness: 85%    │ │
│   - Clustering       │ │ ROI: $1.2M/yr        │ │
│   - Click → flyout   │ │ [View Detail]        │ │
│                      │ │ [Verify Geometry]    │ │
│                      │ └──────────────────────┘ │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

**Components**:
- `MapView` - Main map with clustering
- `FacilityFlyout` - Slide-in panel on marker click
- `NetworkStats` - Top stats bar
- Actions:
  - Click facility → open flyout
  - "Verify Geometry" → `GeometryVerification` overlay
  - "View Detail" → navigate to facility page
  - "Import CSV" → `/networks/[id]/import`
  - "Generate PDF" → `POST /api/reports/network/:id/pdf`

**Data Fetching**:
- `GET /api/networks/:id`
- `GET /api/networks/:id/facilities` (all for map)
- `GET /api/networks/:id/roi` (for stats)

---

### 4. CSV Import Wizard (`/networks/[id]/import`)
**Route**: `app/networks/[id]/import/page.tsx`

**Purpose**: Upload and geocode CSV of facilities

**Steps**:
1. **Upload**: Drag-drop CSV file
2. **Preview**: Show first 5 rows, column mapping
3. **Geocode**: Progress bar, show errors
4. **Review**: Summary report with success/error counts

**Components**:
- `CSVUploader` - File dropzone
- `ColumnMapper` - Map CSV columns to fields
- `ImportProgress` - Real-time progress
- `ErrorReport` - Table of failed rows

**Flow**:
- User uploads CSV → `POST /api/networks/:id/import/csv`
- Backend geocodes + inserts facilities
- Show summary → redirect to map

---

### 5. Facility Detail (`/networks/[id]/facilities/[facilityId]`)
**Route**: `app/networks/[id]/facilities/[facilityId]/page.tsx`

**Purpose**: Full facility detail with metrics editing

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Breadcrumbs: Network > Facilities > Dallas DC   │
├──────────────────┬──────────────────────────────┤
│ GEOMETRY         │ SCORING                      │
│ ┌──────────────┐ │ Data Completeness: 85%       │
│ │  Mini Map    │ │ [████████░░] Exec-Ready      │
│ │  + Polygon   │ │ Missing: yard_spots, turn_time│
│ └──────────────┘ │                              │
│ Status: VERIFIED │ ROI Confidence: 78%          │
│ Last: 2025-12-01 │ [███████░░░] Defensible      │
│ [Edit Geometry]  │ Drivers: detention estimate  │
├──────────────────┴──────────────────────────────┤
│ OPERATIONAL METRICS                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ Docks Count: [24] Confidence: [95] ●        │ │
│ │ Source: [manual ▼] Evidence: [+ Add Link]  │ │
│ │ Last Verified: 2025-12-01 by Admin         │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Trucks/Day Inbound: [120] Confidence: [85] │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ AUDIT LOG (last 20 changes)                     │
│ 2025-12-18 10:30 Admin: verification_status...  │
│ 2025-12-18 10:35 Admin: docks_count null → 24   │
└──────────────────────────────────────────────────┘
```

**Components**:
- Mini map with centroid + polygon
- `ScoringDisplay` - Completeness + ROI confidence
- `FacilityMetricsForm` - All metrics with confidence
- `AuditLog` - Change history table

**Data Fetching**:
- `GET /api/facilities/:id` (includes metrics)
- `GET /api/facilities/:id/completeness`
- `GET /api/facilities/:id/roi-confidence`
- `GET /api/audit-logs?entity_type=facility&entity_id=:id`

**Actions**:
- Edit metric → auto-save → `PATCH /api/facilities/:id/metrics`
- Edit geometry → open verification modal
- Add evidence link → update metric

---

### 6. ROI Assumptions Editor (`/networks/[id]/settings`)
**Route**: `app/networks/[id]/settings/page.tsx`

**Purpose**: Edit network-level ROI parameters

**Components**:
- `ROIAssumptionsForm` - All ROI parameters
- Version field + effective date
- "Save as New Version" button

**Data Fetching**:
- `GET /api/networks/:id/roi/assumptions`

**Actions**:
- Edit assumptions → `POST /api/networks/:id/roi/assumptions`
- Creates new version, deactivates old

---

## Key Components

### `MapView.tsx`

```tsx
interface MapViewProps {
  networkId: string;
  facilities: Facility[];
  onFacilityClick: (facility: Facility) => void;
  onVerifyClick?: (facility: Facility) => void;
}

// Features:
// - Mapbox GL with clustering (supercluster)
// - Color-coded markers: green=VERIFIED, yellow=NEEDS_REVIEW, red=UNVERIFIED
// - Flyout on click
// - Search bar for address autocomplete
```

### `GeometryVerification.tsx`

```tsx
interface GeometryVerificationProps {
  facilityId: string;
  initialCentroid?: [number, number]; // [lng, lat]
  initialPolygon?: GeoJSON.Polygon;
  onSave: (data: VerificationData) => void;
  onCancel: () => void;
}

// Features:
// - Address search → forward geocode → place marker
// - Draggable marker
// - Mapbox Draw for polygon
// - Confidence slider
// - Notes textarea
// - Save → POST /api/facilities/:id/verify-geometry
```

### `FacilityMetricsForm.tsx`

```tsx
interface FacilityMetricsFormProps {
  facilityId: string;
  initialMetrics: FacilityMetrics;
  onUpdate: (metrics: Partial<FacilityMetrics>) => void;
}

// Features:
// - Each metric has: value input, confidence slider, source dropdown, evidence links
// - Auto-save on blur
// - Visual indicator of confidence (color-coded)
// - "Last verified" timestamp
```

### `ScoringDisplay.tsx`

```tsx
interface ScoringDisplayProps {
  facilityId: string;
}

// Features:
// - Data completeness gauge (0-100) with level badge
// - ROI confidence gauge (0-100) with level badge
// - "Top 3 missing fields" expandable section
// - "Top 3 confidence drivers" expandable section
// - Fetches from /api/facilities/:id/completeness and /roi-confidence
```

### `CSVUploader.tsx`

```tsx
interface CSVUploaderProps {
  networkId: string;
  onUploadComplete: (summary: ImportSummary) => void;
}

// Features:
// - Drag-drop CSV file
// - Show preview of first 5 rows
// - Column mapping UI (map CSV columns to required fields)
// - Validate required columns
// - Upload → POST /api/networks/:id/import/csv
// - Show progress bar (could use polling or WebSocket future)
```

---

## State Management

**Approach**: Context + hooks (no Redux for MVP)

### Contexts:

1. **AuthContext** (stub for MVP)
   - Current user (always admin)
   - User role (always admin)

2. **ToastContext**
   - Show success/error toasts
   - `useToast()` hook

3. **MapContext** (optional, if needed)
   - Map instance ref
   - Current zoom/center

### Custom Hooks:

1. **`useNetwork(networkId: string)`**
   - Fetches network data
   - Returns `{ network, loading, error, refetch }`

2. **`useFacility(facilityId: string)`**
   - Fetches facility detail + metrics + scoring
   - Returns `{ facility, metrics, scoring, loading, error, update }`

3. **`useMap(containerId: string, options: MapOptions)`**
   - Initializes Mapbox map
   - Returns `{ map, isLoaded }`

4. **`useToast()`**
   - Returns `{ showToast }`

---

## Styling Guidelines

**Tailwind Theme**:
- Primary color: Blue (`blue-600`)
- Success: Green (`green-600`)
- Warning: Yellow (`yellow-500`)
- Danger: Red (`red-600`)
- Neutral: Gray (`gray-600`)

**Verification Status Colors**:
- `VERIFIED`: Green background, green text
- `NEEDS_REVIEW`: Yellow background, yellow-dark text
- `UNVERIFIED`: Red background, red text

**Confidence Score Colors**:
- 85-100: Green
- 70-84: Yellow
- 0-69: Red

**Typography**:
- Headings: `font-bold`
- Body: `font-normal`
- Small: `text-sm`
- Tiny: `text-xs`

---

## Responsive Design

**MVP**: Desktop-first (1280px+)
**Future**: Mobile breakpoints

**Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

---

## Performance Considerations

1. **Map Clustering**: Use Supercluster for 300+ facilities
2. **Virtual Scrolling**: For facility lists > 100 items (react-window)
3. **Debounced Search**: 300ms delay on address search
4. **Lazy Loading**: Code-split map components (dynamic import)
5. **Image Optimization**: Use Next.js Image component

---

## Accessibility

- All buttons have `aria-label`
- Forms use proper `<label>` elements
- Color not sole indicator (use icons + text)
- Keyboard navigation for map controls
- Focus management in modals

---

## Testing Strategy

**Unit Tests** (Jest + Testing Library):
- Validation functions
- Coordinate helpers
- Formatting utils

**Component Tests**:
- `MetricInput` with confidence tracking
- `ConfidenceBadge` color logic
- `ScoringDisplay` rendering

**Integration Tests**:
- CSV import flow
- Geometry verification save/refresh
- Metric update → audit log creation

**E2E Tests** (Playwright - future):
- Full import flow
- Verify geometry + refresh
- Generate PDF
