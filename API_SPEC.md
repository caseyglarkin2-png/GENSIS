# API Specification - Facility Command Center

Base URL (local dev): `http://localhost:3000/api`

All endpoints return JSON with structure:
```json
{
  "success": true|false,
  "data": {...},
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field": "fieldName" // optional
  }
}
```

---

## Authentication (MVP: Stub)

All endpoints require admin user. In MVP, this is hardcoded.

**Header**: `Authorization: Bearer <token>` (stub - always accepts)

---

## Networks

### List Networks
`GET /api/networks`

**Query Params**:
- `include_deleted` (boolean, default: false)

**Response**:
```json
{
  "success": true,
  "data": {
    "networks": [
      {
        "id": "uuid",
        "name": "Primo Brands",
        "description": "260 facilities across US",
        "customer_type": "shipper",
        "facility_count": 260,
        "verified_facility_count": 180,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Create Network
`POST /api/networks`

**Body**:
```json
{
  "name": "Primo Brands",
  "description": "National beverage distributor",
  "customer_type": "shipper"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "network": {
      "id": "uuid",
      "name": "Primo Brands",
      "description": "National beverage distributor",
      "customer_type": "shipper",
      "created_by": "uuid",
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Get Network
`GET /api/networks/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "network": {
      "id": "uuid",
      "name": "Primo Brands",
      "description": "...",
      "customer_type": "shipper",
      "facility_count": 260,
      "verified_facility_count": 180,
      "verified_percentage": 69.2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Update Network
`PATCH /api/networks/:id`

**Body**:
```json
{
  "name": "Primo Brands Corporation",
  "description": "Updated description"
}
```

**Response**: Same as Create Network

### Delete Network
`DELETE /api/networks/:id`

Soft delete (sets `deleted_at`).

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Network deleted successfully"
  }
}
```

---

## Facilities

### List Facilities
`GET /api/networks/:networkId/facilities`

**Query Params**:
- `verification_status` (enum: UNVERIFIED | NEEDS_REVIEW | VERIFIED)
- `limit` (int, default: 100)
- `offset` (int, default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": "uuid",
        "network_id": "uuid",
        "name": "Dallas Distribution Center",
        "facility_code": "DAL-001",
        "address_line1": "1234 Main St",
        "city": "Dallas",
        "state": "TX",
        "zip": "75201",
        "centroid": [-96.7970, 32.7767], // [lng, lat]
        "verification_status": "VERIFIED",
        "verification_confidence_score": 95,
        "last_verified_at": "2025-12-01T00:00:00Z",
        "data_completeness_score": 85,
        "roi_confidence_score": 78
      }
    ],
    "total": 260,
    "limit": 100,
    "offset": 0
  }
}
```

### Create Facility
`POST /api/networks/:networkId/facilities`

**Body**:
```json
{
  "name": "Dallas Distribution Center",
  "facility_code": "DAL-001",
  "facility_type": "dc",
  "address_line1": "1234 Main St",
  "city": "Dallas",
  "state": "TX",
  "zip": "75201",
  "country": "USA"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "uuid",
      "network_id": "uuid",
      "name": "Dallas Distribution Center",
      "verification_status": "UNVERIFIED",
      "created_at": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Get Facility Detail
`GET /api/facilities/:id`

**Response**:
```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "uuid",
      "network_id": "uuid",
      "name": "Dallas Distribution Center",
      "facility_code": "DAL-001",
      "facility_type": "dc",
      "address_line1": "1234 Main St",
      "city": "Dallas",
      "state": "TX",
      "zip": "75201",
      "centroid": [-96.7970, 32.7767],
      "polygon": {
        "type": "Polygon",
        "coordinates": [[[-96.798, 32.777], [-96.796, 32.777], ...]]
      },
      "cannot_polygon_reason": null,
      "verification_status": "VERIFIED",
      "verification_confidence_score": 95,
      "last_verified_at": "2025-12-01T00:00:00Z",
      "verified_by_user_id": "uuid",
      "metrics": {
        "docks_count": {
          "value": 24,
          "confidence": 95,
          "source": "manual",
          "last_verified_at": "2025-12-01T00:00:00Z",
          "evidence_links": ["https://..."]
        },
        "trucks_per_day_inbound": {
          "value": 120,
          "confidence": 85,
          "source": "estimate",
          "last_verified_at": "2025-11-15T00:00:00Z",
          "evidence_links": []
        },
        "bottlenecks": {
          "value": ["gate_congestion", "trailer_hunting"],
          "confidence": 90,
          "source": "manual",
          "last_verified_at": "2025-12-01T00:00:00Z",
          "evidence_links": []
        }
      },
      "scoring": {
        "data_completeness_score": 85,
        "data_completeness_level": "Exec-Ready",
        "missing_fields": ["yard_spots_count", "avg_turn_time_minutes"],
        "roi_confidence_score": 78,
        "roi_confidence_level": "Defensible",
        "confidence_drivers": ["Low throughput confidence", "Detention baseline estimated"]
      },
      "roi": {
        "projected_annual_roi": 1200000,
        "projected_monthly_roi": 100000,
        "delay_cost_per_month": 100000,
        "delay_cost_per_week": 23000,
        "breakdown": {
          "detention_savings": 600000,
          "paperwork_reduction": 400000,
          "trailer_hunt_reduction": 200000
        }
      }
    }
  }
}
```

### Update Facility
`PATCH /api/facilities/:id`

**Body**:
```json
{
  "name": "Dallas DC - Updated",
  "facility_type": "warehouse"
}
```

**Response**: Same as Get Facility

### Delete Facility
`DELETE /api/facilities/:id`

Soft delete.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Facility deleted successfully"
  }
}
```

### Verify Geometry
`POST /api/facilities/:id/verify-geometry`

**Body**:
```json
{
  "centroid": [-96.7970, 32.7767], // [lng, lat] REQUIRED
  "polygon": { // OPTIONAL (but must provide cannot_polygon_reason if null)
    "type": "Polygon",
    "coordinates": [[
      [-96.798, 32.777],
      [-96.796, 32.777],
      [-96.796, 32.776],
      [-96.798, 32.776],
      [-96.798, 32.777]
    ]]
  },
  "cannot_polygon_reason": null, // REQUIRED if polygon is null
  "verification_method": "manual_map_placement",
  "confidence_score": 95,
  "notes": "Verified via satellite imagery and street view"
}
```

**Validation**:
- Centroid must be [lng, lat] with lng ∈ [-180, 180], lat ∈ [-90, 90]
- Polygon must be valid GeoJSON (first point = last point)
- Must provide polygon OR cannot_polygon_reason (not both null)
- confidence_score ∈ [0, 100]

**Response**:
```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "uuid",
      "centroid": [-96.7970, 32.7767],
      "polygon": {...},
      "verification_status": "VERIFIED",
      "verification_confidence_score": 95,
      "last_verified_at": "2025-12-18T10:30:00Z"
    },
    "verification_record": {
      "id": "uuid",
      "facility_id": "uuid",
      "verified_by_user_id": "uuid",
      "verified_at": "2025-12-18T10:30:00Z",
      "confidence_score": 95
    }
  }
}
```

---

## Facility Metrics

### Update Metrics
`PATCH /api/facilities/:id/metrics`

**Body** (partial updates ok):
```json
{
  "docks_count": {
    "value": 24,
    "confidence": 95,
    "source": "manual",
    "evidence_links": ["https://docs.example.com/dallas-dc-layout.pdf"]
  },
  "trucks_per_day_inbound": {
    "value": 120,
    "confidence": 85,
    "source": "estimate",
    "evidence_links": []
  },
  "bottlenecks": {
    "value": ["gate_congestion", "trailer_hunting"],
    "confidence": 90,
    "source": "manual",
    "evidence_links": []
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "docks_count": {
        "value": 24,
        "confidence": 95,
        "source": "manual",
        "last_verified_at": "2025-12-18T10:30:00Z",
        "evidence_links": ["https://..."]
      },
      // ... other metrics
    },
    "audit_log_ids": ["uuid1", "uuid2"] // Created audit entries
  }
}
```

---

## Import

### Upload CSV
`POST /api/networks/:networkId/import/csv`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file` (CSV file)

**CSV Format**:
```csv
name,facility_code,address_line1,city,state,zip,country
Dallas DC,DAL-001,1234 Main St,Dallas,TX,75201,USA
Houston DC,HOU-001,5678 Oak Ave,Houston,TX,77001,USA
```

**Required Columns**: `name`, `address_line1`, `city`, `state`, `zip`

**Response**:
```json
{
  "success": true,
  "data": {
    "import_batch_id": "uuid",
    "total_rows": 260,
    "success_count": 250,
    "error_count": 10,
    "errors": [
      {
        "row": 15,
        "name": "Phoenix DC",
        "error": "Geocoding failed: Address not found"
      },
      {
        "row": 42,
        "name": "Seattle DC",
        "error": "Invalid coordinates returned"
      }
    ],
    "facilities_created": [
      {
        "id": "uuid",
        "name": "Dallas DC",
        "centroid": [-96.7970, 32.7767],
        "verification_status": "UNVERIFIED",
        "geocode_confidence": 0.95
      }
    ]
  }
}
```

**Process**:
1. Parse CSV
2. Validate required columns
3. For each row:
   - Concatenate address fields
   - Call Mapbox Geocoding API
   - Validate coordinates
   - Insert facility with `verification_status = 'UNVERIFIED'`
   - Log in audit_logs
4. Return batch summary

---

## Geocoding

### Forward Geocode
`POST /api/geocode/forward`

**Body**:
```json
{
  "address": "1234 Main St, Dallas, TX 75201"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "address": "1234 Main Street, Dallas, TX 75201, USA",
        "centroid": [-96.7970, 32.7767],
        "confidence": 0.95,
        "precision": "rooftop" // rooftop | street | city
      },
      {
        "address": "1234 Main Street, Dallas, TX 75202, USA",
        "centroid": [-96.7980, 32.7770],
        "confidence": 0.85,
        "precision": "street"
      }
    ]
  }
}
```

### Batch Geocode
`POST /api/geocode/batch`

**Body**:
```json
{
  "addresses": [
    "1234 Main St, Dallas, TX 75201",
    "5678 Oak Ave, Houston, TX 77001"
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "address": "1234 Main St, Dallas, TX 75201",
        "centroid": [-96.7970, 32.7767],
        "confidence": 0.95,
        "precision": "rooftop"
      },
      {
        "address": "5678 Oak Ave, Houston, TX 77001",
        "centroid": [-95.3698, 29.7604],
        "confidence": 0.90,
        "precision": "rooftop"
      }
    ],
    "errors": []
  }
}
```

---

## ROI

### Get Network ROI
`GET /api/networks/:networkId/roi`

**Response**:
```json
{
  "success": true,
  "data": {
    "network_id": "uuid",
    "total_facilities": 260,
    "verified_facilities": 180,
    "verified_percentage": 69.2,
    "aggregate_roi": {
      "projected_annual_roi": 312000000,
      "projected_monthly_roi": 26000000,
      "delay_cost_per_month": 26000000,
      "delay_cost_per_week": 6000000,
      "breakdown": {
        "detention_savings": 156000000,
        "paperwork_reduction": 104000000,
        "trailer_hunt_reduction": 52000000
      }
    },
    "confidence": {
      "roi_confidence_score": 65,
      "roi_confidence_level": "Directional",
      "drivers": [
        "40% of facilities have unverified geometry",
        "Throughput metrics estimated for 30% of facilities",
        "Baseline detention data > 90 days old for 25% of facilities"
      ]
    },
    "assumptions_version": "1.0.0",
    "assumptions_effective_date": "2025-01-01"
  }
}
```

### Get Facility ROI
`GET /api/facilities/:id/roi`

**Response**:
```json
{
  "success": true,
  "data": {
    "facility_id": "uuid",
    "facility_name": "Dallas DC",
    "roi": {
      "projected_annual_roi": 1200000,
      "projected_monthly_roi": 100000,
      "delay_cost_per_month": 100000,
      "delay_cost_per_week": 23000,
      "breakdown": {
        "detention_savings": 600000,
        "paperwork_reduction": 400000,
        "trailer_hunt_reduction": 200000
      },
      "payback_period_months": 18
    },
    "confidence": {
      "roi_confidence_score": 78,
      "roi_confidence_level": "Defensible",
      "drivers": [
        "Throughput confidence: 85%",
        "Detention baseline: estimate (60% confidence)",
        "Geometry: VERIFIED (95% confidence)"
      ]
    },
    "assumptions_used": {
      "version": "1.0.0",
      "detention_cost_per_hour": 75,
      "baseline_detention_minutes_per_truck": 30,
      "target_detention_minutes_per_truck": 5
    }
  }
}
```

### Update ROI Assumptions
`POST /api/networks/:networkId/roi/assumptions`

**Body**:
```json
{
  "version": "1.1.0",
  "effective_date": "2025-01-01",
  "assumptions_data": {
    "currency": "USD",
    "global_assumptions": {
      "detention_cost_per_hour": 80,
      "labor_cost_per_hour": 30,
      "avg_driver_time_value_per_hour": 65,
      "baseline_avg_turn_time_minutes": 60,
      "target_avg_turn_time_minutes": 18,
      "baseline_detention_minutes_per_truck": 30,
      "target_detention_minutes_per_truck": 5,
      "baseline_trailer_searches_per_day": 10,
      "target_trailer_searches_per_day": 0,
      "avg_minutes_per_trailer_search": 8,
      "paperwork_minutes_per_truck": 6,
      "target_paperwork_minutes_per_truck": 1,
      "implementation_cost_per_door": 2000,
      "annual_software_cost_per_facility": 0,
      "one_time_rollout_cost_per_facility": 0,
      "discount_rate_annual": 0.1,
      "roi_capture_factor": 1.0
    },
    "roi_components_enabled": {
      "detention_savings": true,
      "labor_savings": true,
      "turn_time_acceleration": true,
      "paperwork_reduction": true,
      "trailer_hunt_reduction": true
    },
    "bottleneck_weights": {
      "gate_congestion": 1.0,
      "yard_congestion": 1.0,
      "paperwork": 1.0,
      "trailer_hunting": 1.0,
      "dock_scheduling": 1.0,
      "driver_check_in": 1.0
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "roi_assumption": {
      "id": "uuid",
      "network_id": "uuid",
      "version": "1.1.0",
      "effective_date": "2025-01-01",
      "is_active": true,
      "created_at": "2025-12-18T10:30:00Z"
    },
    "previous_version_deactivated": "1.0.0"
  }
}
```

---

## Scoring

### Get Facility Completeness
`GET /api/facilities/:id/completeness`

**Response**:
```json
{
  "success": true,
  "data": {
    "facility_id": "uuid",
    "data_completeness_score": 85,
    "data_completeness_level": "Exec-Ready",
    "breakdown": {
      "geometry": {
        "score": 30,
        "max": 30,
        "status": "VERIFIED"
      },
      "throughput": {
        "score": 25,
        "max": 30,
        "avg_confidence": 83
      },
      "infrastructure": {
        "score": 18,
        "max": 20,
        "avg_confidence": 90
      },
      "bottlenecks": {
        "score": 10,
        "max": 10,
        "count": 2
      },
      "lane_data": {
        "score": 2,
        "max": 10,
        "coverage": 20
      }
    },
    "missing_fields": [
      {
        "field": "yard_spots_count",
        "impact": 5,
        "category": "infrastructure"
      },
      {
        "field": "avg_turn_time_minutes",
        "impact": 4,
        "category": "throughput"
      },
      {
        "field": "trailers_on_yard_avg",
        "impact": 3,
        "category": "infrastructure"
      }
    ]
  }
}
```

### Get ROI Confidence
`GET /api/facilities/:id/roi-confidence`

**Response**:
```json
{
  "success": true,
  "data": {
    "facility_id": "uuid",
    "roi_confidence_score": 78,
    "roi_confidence_level": "Defensible",
    "factors": {
      "geometry_factor": {
        "score": 1.0,
        "status": "VERIFIED",
        "confidence": 95
      },
      "freshness_factor": {
        "score": 0.9,
        "days_since_verification": 15
      },
      "component_confidence": {
        "score": 0.82,
        "breakdown": {
          "detention_savings": {
            "confidence": 75,
            "weight": 0.5
          },
          "paperwork_reduction": {
            "confidence": 90,
            "weight": 0.3
          },
          "trailer_hunt_reduction": {
            "confidence": 85,
            "weight": 0.2
          }
        }
      }
    },
    "drivers": [
      {
        "factor": "Detention baseline confidence",
        "current": 75,
        "impact": "high",
        "fix": "Verify baseline detention with historical data"
      },
      {
        "factor": "Freshness (15 days old)",
        "current": 90,
        "impact": "medium",
        "fix": "Re-verify geometry if > 30 days"
      },
      {
        "factor": "Throughput estimate",
        "current": 85,
        "impact": "medium",
        "fix": "Obtain actual gate count data"
      }
    ]
  }
}
```

---

## Reports

### Generate Network Rollout Brief PDF
`POST /api/reports/network/:networkId/pdf`

**Query Params**:
- `include_facility_details` (boolean, default: false) - Include per-facility pages

**Response**:
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="Network_Rollout_Brief_Primo_Brands_2025-12-18.pdf"`

**PDF Structure**:
1. Cover Page (hero line + confidence badges)
2. Executive Summary
3. Map Snapshot
4. ROI Breakdown
5. Data Health
6. Assumptions Summary
7. (Optional) Facility One-Pagers

**Watermark Logic**:
- If `roi_confidence_score < 70` OR `verified_percentage < 70%`:
  - Apply "DIRECTIONAL ESTIMATE — VALIDATE INPUTS" across all pages

---

## Audit Logs

### Get Audit Log
`GET /api/audit-logs`

**Query Params**:
- `entity_type` (string: network | facility | facility_metrics)
- `entity_id` (uuid)
- `limit` (int, default: 20)
- `offset` (int, default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "audit_logs": [
      {
        "id": "uuid",
        "entity_type": "facility",
        "entity_id": "uuid",
        "field_name": "verification_status",
        "old_value": "UNVERIFIED",
        "new_value": "VERIFIED",
        "user_id": "uuid",
        "user_name": "Admin User",
        "changed_at": "2025-12-18T10:30:00Z"
      },
      {
        "id": "uuid",
        "entity_type": "facility_metrics",
        "entity_id": "uuid",
        "field_name": "docks_count",
        "old_value": null,
        "new_value": "24",
        "user_id": "uuid",
        "user_name": "Admin User",
        "changed_at": "2025-12-18T10:35:00Z"
      }
    ],
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body validation failed |
| `INVALID_COORDINATES` | 400 | Coordinates outside valid range |
| `INVALID_GEOJSON` | 400 | GeoJSON polygon invalid |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `NETWORK_NOT_FOUND` | 404 | Network ID doesn't exist |
| `FACILITY_NOT_FOUND` | 404 | Facility ID doesn't exist |
| `GEOCODING_FAILED` | 500 | External geocoding API failed |
| `DATABASE_ERROR` | 500 | Database query failed |
| `PDF_GENERATION_FAILED` | 500 | PDF rendering failed |

---

## Rate Limiting (Future)

- Geocoding: 60 requests/minute per user
- PDF Generation: 10 requests/hour per network
- All other endpoints: 1000 requests/minute per user
