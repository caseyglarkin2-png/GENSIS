# Database Schema - Facility Command Center

## Technology
- **PostgreSQL 14+** with **PostGIS 3.3+**
- ORM: **Prisma 5+**
- Coordinate System: **WGS84 (SRID 4326)**

---

## Schema Overview

```
networks (1) ──────── (∞) facilities
                            │
                            ├─── (∞) facility_metrics
                            │
                            └─── (∞) facility_geometry_verification

roi_assumptions (∞) ──── (1) networks

audit_logs (∞) ──── (1) users

users (1) ──────── (∞) audit_logs
```

---

## DDL (SQL)

### Enable PostGIS Extension

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

---

### Table: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin | network_manager | viewer
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Seed admin user for MVP
INSERT INTO users (id, email, name, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@facilitycommand.com', 'Admin User', 'admin');
```

---

### Table: `networks`

```sql
CREATE TABLE networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  customer_type VARCHAR(50), -- shipper | carrier | 3pl | warehouse_network
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_networks_name ON networks(name);
CREATE INDEX idx_networks_deleted_at ON networks(deleted_at) WHERE deleted_at IS NULL;
```

---

### Table: `facilities`

**Core principle**: A facility is NOT verified until `verification_status = 'VERIFIED'` AND `facility_centroid IS NOT NULL` AND (`facility_polygon IS NOT NULL` OR `cannot_polygon_reason IS NOT NULL`).

```sql
CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED');

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  facility_code VARCHAR(100), -- customer's internal code
  facility_type VARCHAR(50), -- dc | warehouse | plant | terminal
  
  -- Address (raw input)
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  
  -- Geometry (WGS84, SRID 4326)
  -- CRITICAL: Store as [lng, lat] via ST_GeomFromGeoJSON
  facility_centroid GEOMETRY(Point, 4326),
  facility_polygon GEOMETRY(Polygon, 4326),
  cannot_polygon_reason TEXT, -- "No fence visible", "Private property", etc.
  
  -- Verification
  verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED',
  verification_confidence_score INT CHECK (verification_confidence_score >= 0 AND verification_confidence_score <= 100),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_user_id UUID REFERENCES users(id),
  
  -- Import metadata
  import_source VARCHAR(50), -- csv | manual | api
  import_batch_id UUID,
  geocode_method VARCHAR(50), -- rooftop | street | city
  geocode_confidence FLOAT, -- from Mapbox API
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_facilities_network_id ON facilities(network_id);
CREATE INDEX idx_facilities_name ON facilities(name);
CREATE INDEX idx_facilities_verification_status ON facilities(verification_status);
CREATE INDEX idx_facilities_deleted_at ON facilities(deleted_at) WHERE deleted_at IS NULL;

-- Spatial indexes for fast geospatial queries
CREATE INDEX idx_facilities_centroid ON facilities USING GIST(facility_centroid);
CREATE INDEX idx_facilities_polygon ON facilities USING GIST(facility_polygon);

-- Constraint: Must have centroid if VERIFIED
-- Note: Postgres CHECK constraints can't reference other columns easily,
-- so enforce this in application logic + validation tests
```

---

### Table: `facility_metrics`

All operational metrics with confidence tracking.

```sql
CREATE TYPE metric_source AS ENUM ('manual', 'import', 'geocoder', 'estimate', 'integration');

CREATE TABLE facility_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Infrastructure
  docks_count INT,
  docks_count_confidence INT CHECK (docks_count_confidence >= 0 AND docks_count_confidence <= 100),
  docks_count_source metric_source,
  docks_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  docks_count_evidence_links TEXT[], -- Array of URLs
  
  gates_count INT,
  gates_count_confidence INT CHECK (gates_count_confidence >= 0 AND gates_count_confidence <= 100),
  gates_count_source metric_source,
  gates_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  gates_count_evidence_links TEXT[],
  
  yard_spots_count INT,
  yard_spots_count_confidence INT CHECK (yard_spots_count_confidence >= 0 AND yard_spots_count_confidence <= 100),
  yard_spots_count_source metric_source,
  yard_spots_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  yard_spots_count_evidence_links TEXT[],
  
  trailers_on_yard_avg INT,
  trailers_on_yard_avg_confidence INT CHECK (trailers_on_yard_avg_confidence >= 0 AND trailers_on_yard_avg_confidence <= 100),
  trailers_on_yard_avg_source metric_source,
  trailers_on_yard_avg_last_verified_at TIMESTAMP WITH TIME ZONE,
  trailers_on_yard_avg_evidence_links TEXT[],
  
  -- Throughput
  trucks_per_day_inbound INT,
  trucks_per_day_inbound_confidence INT CHECK (trucks_per_day_inbound_confidence >= 0 AND trucks_per_day_inbound_confidence <= 100),
  trucks_per_day_inbound_source metric_source,
  trucks_per_day_inbound_last_verified_at TIMESTAMP WITH TIME ZONE,
  trucks_per_day_inbound_evidence_links TEXT[],
  
  trucks_per_day_outbound INT,
  trucks_per_day_outbound_confidence INT CHECK (trucks_per_day_outbound_confidence >= 0 AND trucks_per_day_outbound_confidence <= 100),
  trucks_per_day_outbound_source metric_source,
  trucks_per_day_outbound_last_verified_at TIMESTAMP WITH TIME ZONE,
  trucks_per_day_outbound_evidence_links TEXT[],
  
  -- Performance
  avg_turn_time_minutes INT,
  avg_turn_time_minutes_confidence INT CHECK (avg_turn_time_minutes_confidence >= 0 AND avg_turn_time_minutes_confidence <= 100),
  avg_turn_time_minutes_source metric_source,
  avg_turn_time_minutes_last_verified_at TIMESTAMP WITH TIME ZONE,
  avg_turn_time_minutes_evidence_links TEXT[],
  
  detention_minutes_per_truck INT,
  detention_minutes_per_truck_confidence INT CHECK (detention_minutes_per_truck_confidence >= 0 AND detention_minutes_per_truck_confidence <= 100),
  detention_minutes_per_truck_source metric_source,
  detention_minutes_per_truck_last_verified_at TIMESTAMP WITH TIME ZONE,
  detention_minutes_per_truck_evidence_links TEXT[],
  
  -- Bottlenecks (array of enums stored as TEXT[])
  bottlenecks TEXT[], -- gate_congestion, yard_congestion, paperwork, trailer_hunting, dock_scheduling, driver_check_in
  bottlenecks_confidence INT CHECK (bottlenecks_confidence >= 0 AND bottlenecks_confidence <= 100),
  bottlenecks_source metric_source,
  bottlenecks_last_verified_at TIMESTAMP WITH TIME ZONE,
  bottlenecks_evidence_links TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facility_metrics_facility_id ON facility_metrics(facility_id);
```

---

### Table: `facility_geometry_verification`

Audit trail for geometry verification events.

```sql
CREATE TABLE facility_geometry_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Geometry snapshot
  centroid_snapshot GEOMETRY(Point, 4326),
  polygon_snapshot GEOMETRY(Polygon, 4326),
  cannot_polygon_reason TEXT,
  
  -- Verification details
  verification_method VARCHAR(100), -- manual_map_placement | geocoder_rooftop | geocoder_street | satellite_imagery
  confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  notes TEXT,
  
  -- Who/when
  verified_by_user_id UUID NOT NULL REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facility_geometry_verification_facility_id ON facility_geometry_verification(facility_id);
CREATE INDEX idx_facility_geometry_verification_verified_at ON facility_geometry_verification(verified_at DESC);
```

---

### Table: `roi_assumptions`

Network-level ROI calculation parameters with versioning.

```sql
CREATE TABLE roi_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- Versioning
  version VARCHAR(50) NOT NULL, -- "1.0.0", "1.1.0", etc.
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Only one active per network
  
  -- ROI Parameters (stored as JSONB for flexibility)
  assumptions_data JSONB NOT NULL,
  -- Example structure (see ARCHITECTURE.md for full schema):
  -- {
  --   "currency": "USD",
  --   "global_assumptions": {
  --     "detention_cost_per_hour": 75,
  --     "labor_cost_per_hour": 28,
  --     ...
  --   },
  --   "roi_components_enabled": {...},
  --   "bottleneck_weights": {...}
  -- }
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roi_assumptions_network_id ON roi_assumptions(network_id);
CREATE INDEX idx_roi_assumptions_active ON roi_assumptions(network_id, is_active) WHERE is_active = TRUE;

-- Constraint: Only one active assumptions per network
CREATE UNIQUE INDEX idx_roi_assumptions_one_active_per_network 
  ON roi_assumptions(network_id) 
  WHERE is_active = TRUE;
```

---

### Table: `audit_logs`

Change history for all entities.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  entity_type VARCHAR(50) NOT NULL, -- network | facility | facility_metrics | roi_assumptions
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  -- Who/when
  user_id UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Context
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis(version: "3.3")]
}

model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email     String   @unique
  name      String
  role      String   @default("viewer") // admin | network_manager | viewer
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  networks  Network[]
  auditLogs AuditLog[]
  geometryVerifications FacilityGeometryVerification[]
  roiAssumptions RoiAssumption[]
  
  @@map("users")
  @@index([email])
  @@index([deletedAt])
}

model Network {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String
  description  String?  @db.Text
  customerType String?  @map("customer_type") // shipper | carrier | 3pl | warehouse_network
  createdBy    String   @map("created_by") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")
  
  creator      User     @relation(fields: [createdBy], references: [id])
  facilities   Facility[]
  roiAssumptions RoiAssumption[]
  
  @@map("networks")
  @@index([name])
  @@index([deletedAt])
}

enum VerificationStatus {
  UNVERIFIED
  NEEDS_REVIEW
  VERIFIED
  
  @@map("verification_status")
}

model Facility {
  id                String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  networkId         String             @map("network_id") @db.Uuid
  
  // Basic Info
  name              String
  facilityCode      String?            @map("facility_code")
  facilityType      String?            @map("facility_type")
  
  // Address
  addressLine1      String?            @map("address_line1")
  addressLine2      String?            @map("address_line2")
  city              String?
  state             String?
  zip               String?
  country           String?            @default("USA")
  
  // Geometry (stored as Unsupported type in Prisma, use raw queries)
  facilityCentroid  Unsupported("GEOMETRY(Point, 4326)")? @map("facility_centroid")
  facilityPolygon   Unsupported("GEOMETRY(Polygon, 4326)")? @map("facility_polygon")
  cannotPolygonReason String?          @map("cannot_polygon_reason") @db.Text
  
  // Verification
  verificationStatus VerificationStatus @default(UNVERIFIED) @map("verification_status")
  verificationConfidenceScore Int?     @map("verification_confidence_score")
  lastVerifiedAt    DateTime?          @map("last_verified_at")
  verifiedByUserId  String?            @map("verified_by_user_id") @db.Uuid
  
  // Import metadata
  importSource      String?            @map("import_source")
  importBatchId     String?            @map("import_batch_id") @db.Uuid
  geocodeMethod     String?            @map("geocode_method")
  geocodeConfidence Float?             @map("geocode_confidence")
  
  // Timestamps
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  deletedAt         DateTime?          @map("deleted_at")
  
  network           Network            @relation(fields: [networkId], references: [id], onDelete: Cascade)
  metrics           FacilityMetric?
  geometryVerifications FacilityGeometryVerification[]
  
  @@map("facilities")
  @@index([networkId])
  @@index([name])
  @@index([verificationStatus])
  @@index([deletedAt])
}

enum MetricSource {
  manual
  import
  geocoder
  estimate
  integration
  
  @@map("metric_source")
}

model FacilityMetric {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facilityId String   @unique @map("facility_id") @db.Uuid
  
  // Infrastructure (all follow pattern: value, confidence, source, last_verified_at, evidence_links)
  docksCount                          Int?        @map("docks_count")
  docksCountConfidence                Int?        @map("docks_count_confidence")
  docksCountSource                    MetricSource? @map("docks_count_source")
  docksCountLastVerifiedAt            DateTime?   @map("docks_count_last_verified_at")
  docksCountEvidenceLinks             String[]    @map("docks_count_evidence_links")
  
  gatesCount                          Int?        @map("gates_count")
  gatesCountConfidence                Int?        @map("gates_count_confidence")
  gatesCountSource                    MetricSource? @map("gates_count_source")
  gatesCountLastVerifiedAt            DateTime?   @map("gates_count_last_verified_at")
  gatesCountEvidenceLinks             String[]    @map("gates_count_evidence_links")
  
  yardSpotsCount                      Int?        @map("yard_spots_count")
  yardSpotsCountConfidence            Int?        @map("yard_spots_count_confidence")
  yardSpotsCountSource                MetricSource? @map("yard_spots_count_source")
  yardSpotsCountLastVerifiedAt        DateTime?   @map("yard_spots_count_last_verified_at")
  yardSpotsCountEvidenceLinks         String[]    @map("yard_spots_count_evidence_links")
  
  trailersOnYardAvg                   Int?        @map("trailers_on_yard_avg")
  trailersOnYardAvgConfidence         Int?        @map("trailers_on_yard_avg_confidence")
  trailersOnYardAvgSource             MetricSource? @map("trailers_on_yard_avg_source")
  trailersOnYardAvgLastVerifiedAt     DateTime?   @map("trailers_on_yard_avg_last_verified_at")
  trailersOnYardAvgEvidenceLinks      String[]    @map("trailers_on_yard_avg_evidence_links")
  
  // Throughput
  trucksPerDayInbound                 Int?        @map("trucks_per_day_inbound")
  trucksPerDayInboundConfidence       Int?        @map("trucks_per_day_inbound_confidence")
  trucksPerDayInboundSource           MetricSource? @map("trucks_per_day_inbound_source")
  trucksPerDayInboundLastVerifiedAt   DateTime?   @map("trucks_per_day_inbound_last_verified_at")
  trucksPerDayInboundEvidenceLinks    String[]    @map("trucks_per_day_inbound_evidence_links")
  
  trucksPerDayOutbound                Int?        @map("trucks_per_day_outbound")
  trucksPerDayOutboundConfidence      Int?        @map("trucks_per_day_outbound_confidence")
  trucksPerDayOutboundSource          MetricSource? @map("trucks_per_day_outbound_source")
  trucksPerDayOutboundLastVerifiedAt  DateTime?   @map("trucks_per_day_outbound_last_verified_at")
  trucksPerDayOutboundEvidenceLinks   String[]    @map("trucks_per_day_outbound_evidence_links")
  
  // Performance
  avgTurnTimeMinutes                  Int?        @map("avg_turn_time_minutes")
  avgTurnTimeMinutesConfidence        Int?        @map("avg_turn_time_minutes_confidence")
  avgTurnTimeMinutesSource            MetricSource? @map("avg_turn_time_minutes_source")
  avgTurnTimeMinutesLastVerifiedAt    DateTime?   @map("avg_turn_time_minutes_last_verified_at")
  avgTurnTimeMinutesEvidenceLinks     String[]    @map("avg_turn_time_minutes_evidence_links")
  
  detentionMinutesPerTruck            Int?        @map("detention_minutes_per_truck")
  detentionMinutesPerTruckConfidence  Int?        @map("detention_minutes_per_truck_confidence")
  detentionMinutesPerTruckSource      MetricSource? @map("detention_minutes_per_truck_source")
  detentionMinutesPerTruckLastVerifiedAt DateTime? @map("detention_minutes_per_truck_last_verified_at")
  detentionMinutesPerTruckEvidenceLinks String[]  @map("detention_minutes_per_truck_evidence_links")
  
  // Bottlenecks
  bottlenecks                         String[]    @default([])
  bottlenecksConfidence               Int?        @map("bottlenecks_confidence")
  bottlenecksSource                   MetricSource? @map("bottlenecks_source")
  bottlenecksLastVerifiedAt           DateTime?   @map("bottlenecks_last_verified_at")
  bottlenecksEvidenceLinks            String[]    @map("bottlenecks_evidence_links")
  
  createdAt                           DateTime    @default(now()) @map("created_at")
  updatedAt                           DateTime    @updatedAt @map("updated_at")
  
  facility                            Facility    @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  
  @@map("facility_metrics")
}

model FacilityGeometryVerification {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  facilityId          String   @map("facility_id") @db.Uuid
  
  // Geometry snapshot
  centroidSnapshot    Unsupported("GEOMETRY(Point, 4326)")? @map("centroid_snapshot")
  polygonSnapshot     Unsupported("GEOMETRY(Polygon, 4326)")? @map("polygon_snapshot")
  cannotPolygonReason String?  @map("cannot_polygon_reason") @db.Text
  
  // Verification details
  verificationMethod  String   @map("verification_method")
  confidenceScore     Int      @map("confidence_score")
  notes               String?  @db.Text
  
  // Who/when
  verifiedByUserId    String   @map("verified_by_user_id") @db.Uuid
  verifiedAt          DateTime @default(now()) @map("verified_at")
  
  facility            Facility @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  verifiedBy          User     @relation(fields: [verifiedByUserId], references: [id])
  
  @@map("facility_geometry_verification")
  @@index([facilityId])
  @@index([verifiedAt])
}

model RoiAssumption {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  networkId       String   @map("network_id") @db.Uuid
  
  // Versioning
  version         String
  effectiveDate   DateTime @map("effective_date") @db.Date
  isActive        Boolean  @default(true) @map("is_active")
  
  // ROI Parameters (JSONB)
  assumptionsData Json     @map("assumptions_data")
  
  // Metadata
  createdBy       String   @map("created_by") @db.Uuid
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  network         Network  @relation(fields: [networkId], references: [id], onDelete: Cascade)
  creator         User     @relation(fields: [createdBy], references: [id])
  
  @@map("roi_assumptions")
  @@index([networkId])
  @@index([networkId, isActive])
}

model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  
  // What changed
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id") @db.Uuid
  fieldName   String   @map("field_name")
  oldValue    String?  @map("old_value") @db.Text
  newValue    String?  @map("new_value") @db.Text
  
  // Who/when
  userId      String   @map("user_id") @db.Uuid
  changedAt   DateTime @default(now()) @map("changed_at")
  
  // Context
  ipAddress   String?  @map("ip_address") @db.Inet
  userAgent   String?  @map("user_agent") @db.Text
  
  user        User     @relation(fields: [userId], references: [id])
  
  @@map("audit_logs")
  @@index([entityType, entityId])
  @@index([changedAt])
  @@index([userId])
}
```

---

## Migration Files

### Migration 1: Initial Schema

```sql
-- migrations/001_initial_schema.sql

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- Seed admin user
INSERT INTO users (id, email, name, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@facilitycommand.com', 'Admin User', 'admin');

-- Networks table
CREATE TABLE networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  customer_type VARCHAR(50),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_networks_name ON networks(name);
CREATE INDEX idx_networks_deleted_at ON networks(deleted_at) WHERE deleted_at IS NULL;

-- Verification status enum
CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED');

-- Facilities table
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  facility_code VARCHAR(100),
  facility_type VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  facility_centroid GEOMETRY(Point, 4326),
  facility_polygon GEOMETRY(Polygon, 4326),
  cannot_polygon_reason TEXT,
  verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED',
  verification_confidence_score INT CHECK (verification_confidence_score >= 0 AND verification_confidence_score <= 100),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_user_id UUID REFERENCES users(id),
  import_source VARCHAR(50),
  import_batch_id UUID,
  geocode_method VARCHAR(50),
  geocode_confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_facilities_network_id ON facilities(network_id);
CREATE INDEX idx_facilities_name ON facilities(name);
CREATE INDEX idx_facilities_verification_status ON facilities(verification_status);
CREATE INDEX idx_facilities_deleted_at ON facilities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_facilities_centroid ON facilities USING GIST(facility_centroid);
CREATE INDEX idx_facilities_polygon ON facilities USING GIST(facility_polygon);

-- Metric source enum
CREATE TYPE metric_source AS ENUM ('manual', 'import', 'geocoder', 'estimate', 'integration');

-- Facility metrics table
CREATE TABLE facility_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL UNIQUE REFERENCES facilities(id) ON DELETE CASCADE,
  docks_count INT,
  docks_count_confidence INT CHECK (docks_count_confidence >= 0 AND docks_count_confidence <= 100),
  docks_count_source metric_source,
  docks_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  docks_count_evidence_links TEXT[],
  gates_count INT,
  gates_count_confidence INT CHECK (gates_count_confidence >= 0 AND gates_count_confidence <= 100),
  gates_count_source metric_source,
  gates_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  gates_count_evidence_links TEXT[],
  yard_spots_count INT,
  yard_spots_count_confidence INT CHECK (yard_spots_count_confidence >= 0 AND yard_spots_count_confidence <= 100),
  yard_spots_count_source metric_source,
  yard_spots_count_last_verified_at TIMESTAMP WITH TIME ZONE,
  yard_spots_count_evidence_links TEXT[],
  trailers_on_yard_avg INT,
  trailers_on_yard_avg_confidence INT CHECK (trailers_on_yard_avg_confidence >= 0 AND trailers_on_yard_avg_confidence <= 100),
  trailers_on_yard_avg_source metric_source,
  trailers_on_yard_avg_last_verified_at TIMESTAMP WITH TIME ZONE,
  trailers_on_yard_avg_evidence_links TEXT[],
  trucks_per_day_inbound INT,
  trucks_per_day_inbound_confidence INT CHECK (trucks_per_day_inbound_confidence >= 0 AND trucks_per_day_inbound_confidence <= 100),
  trucks_per_day_inbound_source metric_source,
  trucks_per_day_inbound_last_verified_at TIMESTAMP WITH TIME ZONE,
  trucks_per_day_inbound_evidence_links TEXT[],
  trucks_per_day_outbound INT,
  trucks_per_day_outbound_confidence INT CHECK (trucks_per_day_outbound_confidence >= 0 AND trucks_per_day_outbound_confidence <= 100),
  trucks_per_day_outbound_source metric_source,
  trucks_per_day_outbound_last_verified_at TIMESTAMP WITH TIME ZONE,
  trucks_per_day_outbound_evidence_links TEXT[],
  avg_turn_time_minutes INT,
  avg_turn_time_minutes_confidence INT CHECK (avg_turn_time_minutes_confidence >= 0 AND avg_turn_time_minutes_confidence <= 100),
  avg_turn_time_minutes_source metric_source,
  avg_turn_time_minutes_last_verified_at TIMESTAMP WITH TIME ZONE,
  avg_turn_time_minutes_evidence_links TEXT[],
  detention_minutes_per_truck INT,
  detention_minutes_per_truck_confidence INT CHECK (detention_minutes_per_truck_confidence >= 0 AND detention_minutes_per_truck_confidence <= 100),
  detention_minutes_per_truck_source metric_source,
  detention_minutes_per_truck_last_verified_at TIMESTAMP WITH TIME ZONE,
  detention_minutes_per_truck_evidence_links TEXT[],
  bottlenecks TEXT[],
  bottlenecks_confidence INT CHECK (bottlenecks_confidence >= 0 AND bottlenecks_confidence <= 100),
  bottlenecks_source metric_source,
  bottlenecks_last_verified_at TIMESTAMP WITH TIME ZONE,
  bottlenecks_evidence_links TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facility_metrics_facility_id ON facility_metrics(facility_id);

-- Geometry verification audit table
CREATE TABLE facility_geometry_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  centroid_snapshot GEOMETRY(Point, 4326),
  polygon_snapshot GEOMETRY(Polygon, 4326),
  cannot_polygon_reason TEXT,
  verification_method VARCHAR(100),
  confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  notes TEXT,
  verified_by_user_id UUID NOT NULL REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facility_geometry_verification_facility_id ON facility_geometry_verification(facility_id);
CREATE INDEX idx_facility_geometry_verification_verified_at ON facility_geometry_verification(verified_at DESC);

-- ROI assumptions table
CREATE TABLE roi_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assumptions_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roi_assumptions_network_id ON roi_assumptions(network_id);
CREATE INDEX idx_roi_assumptions_active ON roi_assumptions(network_id, is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_roi_assumptions_one_active_per_network ON roi_assumptions(network_id) WHERE is_active = TRUE;

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
```

---

## Key Design Decisions

1. **PostGIS for Geometry**: Industry standard, rich spatial functions (ST_Distance, ST_Within, etc.)
2. **JSONB for ROI Assumptions**: Flexible schema evolution without migrations
3. **Confidence Tracking**: Every metric has 5 attributes (value, confidence, source, timestamp, evidence)
4. **Soft Deletes**: All tables have `deleted_at` for audit trail
5. **Audit Logs**: Separate table for full change history
6. **Foreign Key Cascades**: Deleting network cascades to facilities (data integrity)
7. **Unique Constraint**: Only one active ROI assumption per network
8. **Spatial Indexes**: GIST indexes on geometry columns for fast spatial queries
9. **Array Types**: TEXT[] for evidence links and bottlenecks (Postgres native)

---

## Example Queries

### Get facilities within 50km of a point
```sql
SELECT id, name, ST_AsGeoJSON(facility_centroid) as centroid
FROM facilities
WHERE ST_DWithin(
  facility_centroid::geography,
  ST_GeomFromText('POINT(-122.4194 37.7749)', 4326)::geography,
  50000 -- meters
);
```

### Get facility with centroid as [lng, lat]
```sql
SELECT 
  id,
  name,
  ST_X(facility_centroid) as longitude,
  ST_Y(facility_centroid) as latitude,
  ST_AsGeoJSON(facility_polygon) as polygon_geojson
FROM facilities
WHERE id = $1;
```

### Insert facility with GeoJSON centroid
```sql
INSERT INTO facilities (
  network_id, 
  name, 
  facility_centroid
) VALUES (
  $1, 
  $2, 
  ST_GeomFromGeoJSON($3) -- Pass {"type":"Point","coordinates":[-122.4194,37.7749]}
);
```

### Get average data completeness by network
```sql
WITH facility_scores AS (
  SELECT 
    f.network_id,
    f.id,
    -- Geometry score (30% weight)
    CASE 
      WHEN f.verification_status = 'VERIFIED' THEN 30
      WHEN f.verification_status = 'NEEDS_REVIEW' THEN 21
      ELSE 15
    END as geo_score,
    -- Metrics score (70% weight, simplified)
    CASE 
      WHEN m.trucks_per_day_inbound IS NOT NULL 
        AND m.detention_minutes_per_truck IS NOT NULL THEN 70
      ELSE 35
    END as metrics_score
  FROM facilities f
  LEFT JOIN facility_metrics m ON f.id = m.facility_id
  WHERE f.deleted_at IS NULL
)
SELECT 
  network_id,
  AVG(geo_score + metrics_score) as avg_completeness_score
FROM facility_scores
GROUP BY network_id;
```
