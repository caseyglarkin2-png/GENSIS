/**
 * Geospatial Types - Strict [lng, lat] ordering
 * All coordinates MUST be WGS84 (SRID 4326)
 */

// CRITICAL: Always [lng, lat] order
export type LngLat = [number, number];

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: LngLat; // [lng, lat]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: LngLat[][]; // Array of rings, each ring is array of [lng, lat]
}

export type GeoJSON = GeoJSONPoint | GeoJSONPolygon;

// Constants
export const WGS84_SRID = 4326;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;

/**
 * Validates a coordinate pair
 * @throws Error if invalid
 */
export function validateLngLat(coords: unknown): asserts coords is LngLat {
  if (!Array.isArray(coords) || coords.length !== 2) {
    throw new Error('Coordinates must be [lng, lat] array with 2 elements');
  }

  const [lng, lat] = coords;

  if (typeof lng !== 'number' || typeof lat !== 'number') {
    throw new Error('Coordinates must be numbers');
  }

  if (isNaN(lng) || isNaN(lat)) {
    throw new Error('Coordinates cannot be NaN');
  }

  if (!isFinite(lng) || !isFinite(lat)) {
    throw new Error('Coordinates must be finite');
  }

  if (lng < MIN_LONGITUDE || lng > MAX_LONGITUDE) {
    throw new Error(
      `Longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}, got ${lng}`
    );
  }

  if (lat < MIN_LATITUDE || lat > MAX_LATITUDE) {
    throw new Error(
      `Latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}, got ${lat}`
    );
  }
}

/**
 * Validates a GeoJSON Point
 * @throws Error if invalid
 */
export function validateGeoJSONPoint(
  point: unknown
): asserts point is GeoJSONPoint {
  if (typeof point !== 'object' || point === null) {
    throw new Error('Point must be an object');
  }

  const p = point as any;

  if (p.type !== 'Point') {
    throw new Error(`Point type must be "Point", got "${p.type}"`);
  }

  if (!Array.isArray(p.coordinates)) {
    throw new Error('Point coordinates must be an array');
  }

  validateLngLat(p.coordinates);
}

/**
 * Validates a GeoJSON Polygon
 * @throws Error if invalid
 */
export function validateGeoJSONPolygon(
  polygon: unknown
): asserts polygon is GeoJSONPolygon {
  if (typeof polygon !== 'object' || polygon === null) {
    throw new Error('Polygon must be an object');
  }

  const p = polygon as any;

  if (p.type !== 'Polygon') {
    throw new Error(`Polygon type must be "Polygon", got "${p.type}"`);
  }

  if (!Array.isArray(p.coordinates)) {
    throw new Error('Polygon coordinates must be an array');
  }

  if (p.coordinates.length === 0) {
    throw new Error('Polygon must have at least one ring');
  }

  // Validate each ring
  for (let i = 0; i < p.coordinates.length; i++) {
    const ring = p.coordinates[i];

    if (!Array.isArray(ring)) {
      throw new Error(`Polygon ring ${i} must be an array`);
    }

    if (ring.length < 4) {
      throw new Error(
        `Polygon ring ${i} must have at least 4 points (first = last)`
      );
    }

    // Validate each coordinate in ring
    for (let j = 0; j < ring.length; j++) {
      try {
        validateLngLat(ring[j]);
      } catch (err) {
        throw new Error(
          `Polygon ring ${i}, point ${j}: ${(err as Error).message}`
        );
      }
    }

    // Check that first point equals last point
    const first = ring[0];
    const last = ring[ring.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new Error(
        `Polygon ring ${i} must close (first point must equal last point)`
      );
    }
  }

  // Additional validation: exterior ring should be counter-clockwise (CCW)
  // This is a GeoJSON spec requirement but we'll warn rather than error
  const exteriorRing = p.coordinates[0];
  if (!isCounterClockwise(exteriorRing)) {
    console.warn(
      'Warning: Polygon exterior ring is not counter-clockwise (may not render correctly)'
    );
  }
}

/**
 * Checks if a ring is counter-clockwise using shoelace formula
 */
function isCounterClockwise(ring: LngLat[]): boolean {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum < 0; // CCW if negative
}

/**
 * Converts PostGIS WKT point to [lng, lat]
 * Example: "POINT(-122.4194 37.7749)" => [-122.4194, 37.7749]
 */
export function parseWKTPoint(wkt: string): LngLat {
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) {
    throw new Error(`Invalid WKT Point format: ${wkt}`);
  }

  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  const coords: LngLat = [lng, lat];

  validateLngLat(coords);
  return coords;
}

/**
 * Converts [lng, lat] to GeoJSON Point
 */
export function toGeoJSONPoint(coords: LngLat): GeoJSONPoint {
  validateLngLat(coords);
  return {
    type: 'Point',
    coordinates: coords,
  };
}

/**
 * Converts GeoJSON Point to [lng, lat]
 */
export function fromGeoJSONPoint(point: GeoJSONPoint): LngLat {
  validateGeoJSONPoint(point);
  return point.coordinates;
}

/**
 * Calculates distance between two points in meters
 * Uses Haversine formula
 */
export function distanceInMeters(a: LngLat, b: LngLat): number {
  validateLngLat(a);
  validateLngLat(b);

  const R = 6371e3; // Earth radius in meters
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const deltaLat = ((b[1] - a[1]) * Math.PI) / 180;
  const deltaLng = ((b[0] - a[0]) * Math.PI) / 180;

  const x =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * c;
}

/**
 * Checks if two coordinates are equal within tolerance
 * Default tolerance: 0.000001° (~0.11 meters)
 */
export function coordinatesEqual(
  a: LngLat,
  b: LngLat,
  tolerance: number = 0.000001
): boolean {
  return (
    Math.abs(a[0] - b[0]) < tolerance && Math.abs(a[1] - b[1]) < tolerance
  );
}

/**
 * Calculates centroid of a polygon
 * Simple average of all points (works for small polygons)
 */
export function calculatePolygonCentroid(polygon: GeoJSONPolygon): LngLat {
  validateGeoJSONPolygon(polygon);

  const ring = polygon.coordinates[0]; // Use exterior ring
  let sumLng = 0;
  let sumLat = 0;
  let count = ring.length - 1; // Exclude duplicate last point

  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }

  const centroid: LngLat = [sumLng / count, sumLat / count];
  validateLngLat(centroid);
  return centroid;
}
