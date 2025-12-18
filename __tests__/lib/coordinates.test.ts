/**
 * Tests for coordinate validation
 * CRITICAL: Ensures [lng, lat] order and valid ranges
 */

import {
  validateLngLat,
  validateGeoJSONPoint,
  validateGeoJSONPolygon,
  distanceInMeters,
  coordinatesEqual,
  calculatePolygonCentroid,
  parseWKTPoint,
  MIN_LATITUDE,
  MAX_LATITUDE,
  MIN_LONGITUDE,
  MAX_LONGITUDE,
} from '@/lib/coordinates';
import type { LngLat, GeoJSONPoint, GeoJSONPolygon } from '@/lib/coordinates';

describe('validateLngLat', () => {
  it('should accept valid [lng, lat]', () => {
    expect(() => validateLngLat([-122.4194, 37.7749])).not.toThrow();
    expect(() => validateLngLat([0, 0])).not.toThrow();
    expect(() => validateLngLat([-180, -90])).not.toThrow();
    expect(() => validateLngLat([180, 90])).not.toThrow();
  });

  it('should reject invalid longitude', () => {
    expect(() => validateLngLat([-181, 37.7749])).toThrow(/Longitude/);
    expect(() => validateLngLat([181, 37.7749])).toThrow(/Longitude/);
    expect(() => validateLngLat([200, 37.7749])).toThrow(/Longitude/);
  });

  it('should reject invalid latitude', () => {
    expect(() => validateLngLat([-122.4194, -91])).toThrow(/Latitude/);
    expect(() => validateLngLat([-122.4194, 91])).toThrow(/Latitude/);
    expect(() => validateLngLat([-122.4194, 200])).toThrow(/Latitude/);
  });

  it('should reject non-array', () => {
    expect(() => validateLngLat({} as any)).toThrow(/must be.*array/);
    expect(() => validateLngLat('invalid' as any)).toThrow(/must be.*array/);
  });

  it('should reject wrong array length', () => {
    expect(() => validateLngLat([1] as any)).toThrow(/2 elements/);
    expect(() => validateLngLat([1, 2, 3] as any)).toThrow(/2 elements/);
  });

  it('should reject non-numeric values', () => {
    expect(() => validateLngLat(['a', 'b'] as any)).toThrow(/must be numbers/);
    expect(() => validateLngLat([null, null] as any)).toThrow(/must be numbers/);
  });

  it('should reject NaN', () => {
    expect(() => validateLngLat([NaN, 37.7749])).toThrow(/NaN/);
    expect(() => validateLngLat([-122.4194, NaN])).toThrow(/NaN/);
  });

  it('should reject Infinity', () => {
    expect(() => validateLngLat([Infinity, 37.7749])).toThrow(/finite/);
    expect(() => validateLngLat([-122.4194, -Infinity])).toThrow(/finite/);
  });
});

describe('validateGeoJSONPoint', () => {
  it('should accept valid GeoJSON Point', () => {
    const point: GeoJSONPoint = {
      type: 'Point',
      coordinates: [-122.4194, 37.7749],
    };
    expect(() => validateGeoJSONPoint(point)).not.toThrow();
  });

  it('should reject invalid type', () => {
    const point = {
      type: 'LineString',
      coordinates: [-122.4194, 37.7749],
    };
    expect(() => validateGeoJSONPoint(point as any)).toThrow(/type must be "Point"/);
  });

  it('should reject invalid coordinates', () => {
    const point = {
      type: 'Point',
      coordinates: [200, 37.7749], // Invalid lng
    };
    expect(() => validateGeoJSONPoint(point as any)).toThrow(/Longitude/);
  });

  it('should reject non-object', () => {
    expect(() => validateGeoJSONPoint('invalid' as any)).toThrow(/must be an object/);
  });
});

describe('validateGeoJSONPolygon', () => {
  it('should accept valid GeoJSON Polygon', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[
        [-122.4, 37.8],
        [-122.3, 37.8],
        [-122.3, 37.7],
        [-122.4, 37.7],
        [-122.4, 37.8], // Closes ring
      ]],
    };
    expect(() => validateGeoJSONPolygon(polygon)).not.toThrow();
  });

  it('should reject polygon with < 4 points', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [-122.4, 37.8],
        [-122.3, 37.8],
        [-122.4, 37.8], // Only 3 points
      ]],
    };
    expect(() => validateGeoJSONPolygon(polygon as any)).toThrow(/at least 4 points/);
  });

  it('should reject polygon that does not close', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [-122.4, 37.8],
        [-122.3, 37.8],
        [-122.3, 37.7],
        [-122.4, 37.7],
        [-122.5, 37.9], // Does NOT equal first point
      ]],
    };
    expect(() => validateGeoJSONPolygon(polygon as any)).toThrow(/must close/);
  });

  it('should reject polygon with invalid coordinates', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [[
        [200, 37.8], // Invalid lng
        [-122.3, 37.8],
        [-122.3, 37.7],
        [-122.4, 37.7],
        [200, 37.8],
      ]],
    };
    expect(() => validateGeoJSONPolygon(polygon as any)).toThrow(/Longitude/);
  });
});

describe('distanceInMeters', () => {
  it('should calculate distance between SF and LA', () => {
    const sf: LngLat = [-122.4194, 37.7749];
    const la: LngLat = [-118.2437, 34.0522];
    const distance = distanceInMeters(sf, la);
    
    // SF to LA is ~550-600 km
    expect(distance).toBeGreaterThan(500000); // > 500 km
    expect(distance).toBeLessThan(650000);    // < 650 km
  });

  it('should return 0 for same point', () => {
    const point: LngLat = [-122.4194, 37.7749];
    expect(distanceInMeters(point, point)).toBe(0);
  });

  it('should calculate short distances accurately', () => {
    const a: LngLat = [-122.4194, 37.7749];
    const b: LngLat = [-122.4184, 37.7749]; // ~0.001° lng difference
    const distance = distanceInMeters(a, b);
    
    // ~0.001° at SF latitude ≈ 80-90 meters
    expect(distance).toBeGreaterThan(70);
    expect(distance).toBeLessThan(100);
  });
});

describe('coordinatesEqual', () => {
  it('should return true for identical coordinates', () => {
    expect(coordinatesEqual([0, 0], [0, 0])).toBe(true);
    expect(coordinatesEqual([-122.4194, 37.7749], [-122.4194, 37.7749])).toBe(true);
  });

  it('should return true for coordinates within tolerance', () => {
    const a: LngLat = [-122.4194, 37.7749];
    const b: LngLat = [-122.41940001, 37.77490001];
    expect(coordinatesEqual(a, b)).toBe(true);
  });

  it('should return false for coordinates outside tolerance', () => {
    const a: LngLat = [-122.4194, 37.7749];
    const b: LngLat = [-122.4195, 37.7750]; // 0.0001° difference
    expect(coordinatesEqual(a, b)).toBe(false);
  });

  it('should respect custom tolerance', () => {
    const a: LngLat = [-122.4194, 37.7749];
    const b: LngLat = [-122.4195, 37.7750];
    expect(coordinatesEqual(a, b, 0.001)).toBe(true);
    expect(coordinatesEqual(a, b, 0.00001)).toBe(false);
  });
});

describe('calculatePolygonCentroid', () => {
  it('should calculate centroid of square', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]],
    };

    const centroid = calculatePolygonCentroid(polygon);
    expect(centroid[0]).toBeCloseTo(0.5, 5);
    expect(centroid[1]).toBeCloseTo(0.5, 5);
  });

  it('should calculate centroid of triangle', () => {
    const polygon: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [[
        [0, 0],
        [2, 0],
        [1, 2],
        [0, 0],
      ]],
    };

    const centroid = calculatePolygonCentroid(polygon);
    expect(centroid[0]).toBeCloseTo(1.0, 5);
    expect(centroid[1]).toBeCloseTo(0.666, 2); // Simple average: (0+0+2)/3
  });
});

describe('parseWKTPoint', () => {
  it('should parse valid WKT Point', () => {
    const wkt = 'POINT(-122.4194 37.7749)';
    const coords = parseWKTPoint(wkt);
    expect(coords).toEqual([-122.4194, 37.7749]);
  });

  it('should parse WKT Point with extra whitespace', () => {
    const wkt = 'POINT(  -122.4194   37.7749  )';
    const coords = parseWKTPoint(wkt);
    expect(coords).toEqual([-122.4194, 37.7749]);
  });

  it('should parse WKT Point case-insensitive', () => {
    const wkt = 'point(-122.4194 37.7749)';
    const coords = parseWKTPoint(wkt);
    expect(coords).toEqual([-122.4194, 37.7749]);
  });

  it('should reject invalid WKT format', () => {
    expect(() => parseWKTPoint('INVALID')).toThrow(/Invalid WKT Point format/);
    expect(() => parseWKTPoint('LINESTRING(0 0, 1 1)')).toThrow(/Invalid WKT Point format/);
  });

  it('should reject WKT with invalid coordinates', () => {
    expect(() => parseWKTPoint('POINT(200 37.7749)')).toThrow(/Longitude/);
    expect(() => parseWKTPoint('POINT(-122.4194 200)')).toThrow(/Latitude/);
  });
});

describe('Edge cases', () => {
  it('should handle coordinates at boundaries', () => {
    expect(() => validateLngLat([MIN_LONGITUDE, MIN_LATITUDE])).not.toThrow();
    expect(() => validateLngLat([MAX_LONGITUDE, MAX_LATITUDE])).not.toThrow();
    expect(() => validateLngLat([MIN_LONGITUDE - 0.0001, MIN_LATITUDE])).toThrow();
    expect(() => validateLngLat([MAX_LONGITUDE + 0.0001, MAX_LATITUDE])).toThrow();
  });

  it('should handle very small numbers', () => {
    const tiny: LngLat = [0.000001, 0.000001];
    expect(() => validateLngLat(tiny)).not.toThrow();
  });

  it('should handle negative zero', () => {
    expect(() => validateLngLat([-0, -0])).not.toThrow();
  });
});
