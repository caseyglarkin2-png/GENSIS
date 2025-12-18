/**
 * Tests for validation schemas and utilities
 */

import {
  lngLatSchema,
  geoJSONPointSchema,
  geoJSONPolygonSchema,
  verificationStatusSchema,
  metricSourceSchema,
  bottleneckSchema,
  customerTypeSchema,
  confidenceScoreSchema,
  createNetworkSchema,
  updateNetworkSchema,
  createFacilitySchema,
  updateFacilitySchema,
  verifyGeometrySchema,
  updateMetricsSchema,
  csvFacilityRowSchema,
  forwardGeocodeSchema,
  batchGeocodeSchema,
} from '@/lib/validation';

describe('lngLatSchema', () => {
  it('should accept valid [lng, lat]', () => {
    const result = lngLatSchema.safeParse([-96.8, 32.78]);
    expect(result.success).toBe(true);
  });

  it('should reject invalid longitude', () => {
    const result = lngLatSchema.safeParse([-200, 32.78]);
    expect(result.success).toBe(false);
  });

  it('should reject invalid latitude', () => {
    const result = lngLatSchema.safeParse([-96.8, 100]);
    expect(result.success).toBe(false);
  });

  it('should reject wrong array length', () => {
    const result = lngLatSchema.safeParse([-96.8]);
    expect(result.success).toBe(false);
  });

  it('should reject non-array', () => {
    const result = lngLatSchema.safeParse({ lng: -96.8, lat: 32.78 });
    expect(result.success).toBe(false);
  });

  it('should accept boundary coordinates', () => {
    expect(lngLatSchema.safeParse([-180, 90]).success).toBe(true);
    expect(lngLatSchema.safeParse([180, -90]).success).toBe(true);
    expect(lngLatSchema.safeParse([0, 0]).success).toBe(true);
  });
});

describe('geoJSONPointSchema', () => {
  it('should accept valid GeoJSON Point', () => {
    const result = geoJSONPointSchema.safeParse({
      type: 'Point',
      coordinates: [-96.8, 32.78],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = geoJSONPointSchema.safeParse({
      type: 'Polygon',
      coordinates: [-96.8, 32.78],
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid coordinates', () => {
    const result = geoJSONPointSchema.safeParse({
      type: 'Point',
      coordinates: [-200, 32.78],
    });
    expect(result.success).toBe(false);
  });
});

describe('geoJSONPolygonSchema', () => {
  const validPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-96.81, 32.77],
      [-96.79, 32.77],
      [-96.79, 32.79],
      [-96.81, 32.79],
      [-96.81, 32.77],
    ]],
  };

  it('should accept valid GeoJSON Polygon', () => {
    const result = geoJSONPolygonSchema.safeParse(validPolygon);
    expect(result.success).toBe(true);
  });

  it('should reject polygon with < 4 points', () => {
    const result = geoJSONPolygonSchema.safeParse({
      type: 'Polygon',
      coordinates: [[
        [-96.81, 32.77],
        [-96.79, 32.77],
        [-96.81, 32.77],
      ]],
    });
    expect(result.success).toBe(false);
  });

  it('should reject polygon that does not close', () => {
    const result = geoJSONPolygonSchema.safeParse({
      type: 'Polygon',
      coordinates: [[
        [-96.81, 32.77],
        [-96.79, 32.77],
        [-96.79, 32.79],
        [-96.81, 32.79],
      ]],
    });
    expect(result.success).toBe(false);
  });
});

describe('verificationStatusSchema', () => {
  it('should accept UNVERIFIED', () => {
    const result = verificationStatusSchema.safeParse('UNVERIFIED');
    expect(result.success).toBe(true);
  });

  it('should accept NEEDS_REVIEW', () => {
    const result = verificationStatusSchema.safeParse('NEEDS_REVIEW');
    expect(result.success).toBe(true);
  });

  it('should accept VERIFIED', () => {
    const result = verificationStatusSchema.safeParse('VERIFIED');
    expect(result.success).toBe(true);
  });

  it('should reject PENDING (not in our schema)', () => {
    const result = verificationStatusSchema.safeParse('PENDING');
    expect(result.success).toBe(false);
  });

  it('should reject lowercase', () => {
    const result = verificationStatusSchema.safeParse('verified');
    expect(result.success).toBe(false);
  });
});

describe('metricSourceSchema', () => {
  // Actual enum: 'manual', 'import', 'geocoder', 'estimate', 'integration'
  it('should accept manual', () => {
    const result = metricSourceSchema.safeParse('manual');
    expect(result.success).toBe(true);
  });

  it('should accept import', () => {
    const result = metricSourceSchema.safeParse('import');
    expect(result.success).toBe(true);
  });

  it('should accept geocoder', () => {
    const result = metricSourceSchema.safeParse('geocoder');
    expect(result.success).toBe(true);
  });

  it('should accept estimate', () => {
    const result = metricSourceSchema.safeParse('estimate');
    expect(result.success).toBe(true);
  });

  it('should accept integration', () => {
    const result = metricSourceSchema.safeParse('integration');
    expect(result.success).toBe(true);
  });

  it('should reject invalid source', () => {
    const result = metricSourceSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });
});

describe('bottleneckSchema', () => {
  // Actual enum: 'gate_congestion', 'yard_congestion', 'paperwork', 'trailer_hunting', 'dock_scheduling', 'driver_check_in'
  const validBottlenecks = [
    'gate_congestion',
    'yard_congestion',
    'paperwork',
    'trailer_hunting',
    'dock_scheduling',
    'driver_check_in',
  ];

  it.each(validBottlenecks)('should accept %s', (bottleneck) => {
    const result = bottleneckSchema.safeParse(bottleneck);
    expect(result.success).toBe(true);
  });

  it('should reject invalid bottleneck', () => {
    const result = bottleneckSchema.safeParse('invalid_bottleneck');
    expect(result.success).toBe(false);
  });
});

describe('customerTypeSchema', () => {
  // Actual enum: 'shipper', 'carrier', '3pl', 'warehouse_network'
  it('should accept shipper', () => {
    const result = customerTypeSchema.safeParse('shipper');
    expect(result.success).toBe(true);
  });

  it('should accept carrier', () => {
    const result = customerTypeSchema.safeParse('carrier');
    expect(result.success).toBe(true);
  });

  it('should accept 3pl', () => {
    const result = customerTypeSchema.safeParse('3pl');
    expect(result.success).toBe(true);
  });

  it('should accept warehouse_network', () => {
    const result = customerTypeSchema.safeParse('warehouse_network');
    expect(result.success).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = customerTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('confidenceScoreSchema', () => {
  it('should accept 0', () => {
    const result = confidenceScoreSchema.safeParse(0);
    expect(result.success).toBe(true);
  });

  it('should accept 100', () => {
    const result = confidenceScoreSchema.safeParse(100);
    expect(result.success).toBe(true);
  });

  it('should accept 50', () => {
    const result = confidenceScoreSchema.safeParse(50);
    expect(result.success).toBe(true);
  });

  it('should reject negative', () => {
    const result = confidenceScoreSchema.safeParse(-1);
    expect(result.success).toBe(false);
  });

  it('should reject > 100', () => {
    const result = confidenceScoreSchema.safeParse(101);
    expect(result.success).toBe(false);
  });

  it('should reject non-integer', () => {
    const result = confidenceScoreSchema.safeParse(50.5);
    expect(result.success).toBe(false);
  });
});

describe('createNetworkSchema', () => {
  it('should accept valid network data', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Test Network',
      description: 'A test network',
      customerType: 'shipper',
    });
    expect(result.success).toBe(true);
  });

  it('should accept network without optional fields', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Test Network',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createNetworkSchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 255 chars', () => {
    const result = createNetworkSchema.safeParse({
      name: 'a'.repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it('should accept customerType 3pl', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Test Network',
      customerType: '3pl',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateNetworkSchema', () => {
  it('should accept partial update', () => {
    const result = updateNetworkSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = updateNetworkSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid customer type', () => {
    const result = updateNetworkSchema.safeParse({
      customerType: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createFacilitySchema', () => {
  it('should accept valid facility with required fields', () => {
    const result = createFacilitySchema.safeParse({
      name: 'Test Facility',
    });
    expect(result.success).toBe(true);
  });

  it('should accept facility with all fields', () => {
    const result = createFacilitySchema.safeParse({
      name: 'Test Facility',
      facilityCode: 'TF001',
      facilityType: 'dc',
      addressLine1: '123 Main St',
      addressLine2: 'Suite 100',
      city: 'Dallas',
      state: 'TX',
      zip: '75001',
      country: 'USA',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = createFacilitySchema.safeParse({
      city: 'Dallas',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createFacilitySchema.safeParse({
      name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateFacilitySchema', () => {
  it('should accept partial update', () => {
    const result = updateFacilitySchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = updateFacilitySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept only optional fields', () => {
    const result = updateFacilitySchema.safeParse({
      city: 'Dallas',
      state: 'TX',
    });
    expect(result.success).toBe(true);
  });
});

describe('verifyGeometrySchema', () => {
  const validPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-96.81, 32.77],
      [-96.79, 32.77],
      [-96.79, 32.79],
      [-96.81, 32.79],
      [-96.81, 32.77],
    ]],
  };

  it('should accept centroid with polygon', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-96.8, 32.78],
      polygon: validPolygon,
      verificationMethod: 'satellite_review',
      confidenceScore: 95,
    });
    expect(result.success).toBe(true);
  });

  it('should accept centroid with cannotPolygonReason', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-96.8, 32.78],
      cannotPolygonReason: 'Shared facility with unclear boundaries',
      verificationMethod: 'site_visit',
      confidenceScore: 80,
    });
    expect(result.success).toBe(true);
  });

  it('should reject without polygon OR cannotPolygonReason', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-96.8, 32.78],
      verificationMethod: 'satellite_review',
      confidenceScore: 95,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid coordinates', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-200, 32.78],
      cannotPolygonReason: 'test',
      verificationMethod: 'satellite_review',
      confidenceScore: 95,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing verificationMethod', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-96.8, 32.78],
      polygon: validPolygon,
      confidenceScore: 95,
    });
    expect(result.success).toBe(false);
  });

  it('should accept notes field', () => {
    const result = verifyGeometrySchema.safeParse({
      centroid: [-96.8, 32.78],
      polygon: validPolygon,
      verificationMethod: 'satellite_review',
      confidenceScore: 95,
      notes: 'Verified via satellite imagery',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateMetricsSchema', () => {
  it('should accept single metric update', () => {
    const result = updateMetricsSchema.safeParse({
      docksCount: {
        value: 25,
        confidence: 90,
        source: 'manual',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept multiple metrics', () => {
    const result = updateMetricsSchema.safeParse({
      docksCount: { value: 25, confidence: 90, source: 'manual' },
      trucksPerDayInbound: { value: 100, confidence: 80, source: 'integration' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept bottlenecks array metric', () => {
    const result = updateMetricsSchema.safeParse({
      bottlenecks: {
        value: ['gate_congestion', 'dock_scheduling'],
        confidence: 75,
        source: 'manual',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = updateMetricsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept metric with evidence links', () => {
    const result = updateMetricsSchema.safeParse({
      docksCount: {
        value: 25,
        confidence: 90,
        source: 'manual',
        evidenceLinks: ['https://example.com/evidence.pdf'],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('csvFacilityRowSchema', () => {
  it('should accept valid CSV row', () => {
    const result = csvFacilityRowSchema.safeParse({
      name: 'Test Facility',
      address_line1: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zip: '75001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = csvFacilityRowSchema.safeParse({
      address_line1: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zip: '75001',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required address fields', () => {
    const result = csvFacilityRowSchema.safeParse({
      name: 'Test Facility',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = csvFacilityRowSchema.safeParse({
      name: 'Test Facility',
      facility_code: 'TF001',
      facility_type: 'dc',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'Dallas',
      state: 'TX',
      zip: '75001',
      country: 'USA',
    });
    expect(result.success).toBe(true);
  });
});

describe('forwardGeocodeSchema', () => {
  it('should accept valid address', () => {
    const result = forwardGeocodeSchema.safeParse({
      address: '123 Main St, Dallas, TX 75001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty address', () => {
    const result = forwardGeocodeSchema.safeParse({
      address: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing address', () => {
    const result = forwardGeocodeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('batchGeocodeSchema', () => {
  it('should accept valid addresses array', () => {
    const result = batchGeocodeSchema.safeParse({
      addresses: ['123 Main St, Dallas, TX', '456 Oak Ave, Houston, TX'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty array', () => {
    const result = batchGeocodeSchema.safeParse({
      addresses: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject array with empty string', () => {
    const result = batchGeocodeSchema.safeParse({
      addresses: ['123 Main St', ''],
    });
    expect(result.success).toBe(false);
  });

  it('should accept up to 100 addresses', () => {
    const addresses = Array.from({ length: 100 }, (_, i) => `${i} Main St`);
    const result = batchGeocodeSchema.safeParse({ addresses });
    expect(result.success).toBe(true);
  });

  it('should reject more than 100 addresses', () => {
    const addresses = Array.from({ length: 101 }, (_, i) => `${i} Main St`);
    const result = batchGeocodeSchema.safeParse({ addresses });
    expect(result.success).toBe(false);
  });
});

describe('Edge Cases', () => {
  it('should handle Unicode in names', () => {
    const result = createNetworkSchema.safeParse({
      name: 'Café Network 日本語',
    });
    expect(result.success).toBe(true);
  });

  it('should handle special characters in facility names', () => {
    const result = createFacilitySchema.safeParse({
      name: "O'Connor Warehouse #123",
    });
    expect(result.success).toBe(true);
  });

  it('should handle multiple bottlenecks', () => {
    const result = updateMetricsSchema.safeParse({
      bottlenecks: {
        value: [
          'gate_congestion',
          'yard_congestion',
          'paperwork',
          'trailer_hunting',
          'dock_scheduling',
          'driver_check_in',
        ],
        confidence: 85,
      },
    });
    expect(result.success).toBe(true);
  });
});
