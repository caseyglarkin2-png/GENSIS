/**
 * Tests for geocoding service
 * 
 * These tests mock the Mapbox API responses to test geocoding logic
 */

// Set Mapbox token for tests - must be before imports
process.env.MAPBOX_SECRET_TOKEN = 'test_token';

import {
  geocodeAddress,
  geocodeAddressWithCandidates,
  reverseGeocode,
} from '@/lib/services/geocoding';

// Sample Mapbox response for tests
const createMockFeature = (overrides: Partial<any> = {}) => ({
  id: 'address.123',
  type: 'Feature',
  place_type: ['address'],
  relevance: 0.95,
  place_name: '123 Main St, Dallas, TX 75201, United States',
  center: [-96.8, 32.78],
  properties: {
    accuracy: 'rooftop',
  },
  context: [
    { id: 'postcode.456', text: '75201' },
    { id: 'place.789', text: 'Dallas' },
    { id: 'region.012', text: 'Texas', short_code: 'TX' },
    { id: 'country.345', text: 'United States', short_code: 'us' },
  ],
  ...overrides,
});

const createMockResponse = (features: any[] = [createMockFeature()]) => ({
  type: 'FeatureCollection',
  features,
});

// Store original fetch
const originalFetch = global.fetch;

describe('geocodeAddress', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return geocode result for valid address', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    const result = await geocodeAddress('123 Main St, Dallas, TX');

    expect(result).toBeDefined();
    expect(result.coordinates).toEqual([-96.8, 32.78]);
    expect(result.formattedAddress).toBe('123 Main St, Dallas, TX 75201, United States');
    expect(result.method).toBe('rooftop');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should throw error when no results found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(geocodeAddress('invalid address xyz'))
      .rejects.toThrow('No geocode results found');
  });

  it('should throw error on API failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(geocodeAddress('123 Main St, Dallas, TX'))
      .rejects.toThrow('Mapbox API error');
  });

  it('should include proximity parameter when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    await geocodeAddress('123 Main St', { proximity: [-96.8, 32.78] });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('proximity=-96.8%2C32.78');
  });

  it('should include bbox parameter when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    await geocodeAddress('123 Main St', { 
      bbox: [[-97, 32], [-96, 33]] 
    });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('bbox=-97%2C32%2C-96%2C33');
  });

  it('should include country filter', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    await geocodeAddress('123 Main St', { country: 'ca' });

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('country=ca');
  });

  it('should default to US country filter', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    await geocodeAddress('123 Main St');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('country=us');
  });

  it('should parse context correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    const result = await geocodeAddress('123 Main St, Dallas, TX');

    expect(result.context.postcode).toBe('75201');
    expect(result.context.place).toBe('Dallas');
    expect(result.context.region).toBe('TX');
    expect(result.context.country).toBe('us');
  });
});

describe('geocodeAddressWithCandidates', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return multiple candidates', async () => {
    const features = [
      createMockFeature({ 
        center: [-96.8, 32.78], 
        relevance: 0.95,
        place_name: '123 Main St, Dallas, TX' 
      }),
      createMockFeature({ 
        center: [-96.7, 32.79], 
        relevance: 0.85,
        place_name: '123 Main St, Plano, TX' 
      }),
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(features),
    });

    const candidates = await geocodeAddressWithCandidates('123 Main St');

    expect(candidates).toHaveLength(2);
    expect(candidates[0].relevance).toBe(0.95);
    expect(candidates[1].relevance).toBe(0.85);
  });

  it('should return empty array when no results', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const candidates = await geocodeAddressWithCandidates('invalid address');

    expect(candidates).toEqual([]);
  });

  it('should include matchedAddress', async () => {
    const feature = createMockFeature({
      matching_place_name: '123 Main Street, Dallas, Texas',
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([feature]),
    });

    const candidates = await geocodeAddressWithCandidates('123 Main St');

    expect(candidates[0].matchedAddress).toBe('123 Main Street, Dallas, Texas');
  });

  it('should default to 10 limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    await geocodeAddressWithCandidates('123 Main St');

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain('limit=10');
  });
});

describe('reverseGeocode', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return address for valid coordinates', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse(),
    });

    const result = await reverseGeocode([-96.8, 32.78]);

    expect(result).toBeDefined();
    expect(result.formattedAddress).toBeDefined();
  });

  it('should throw error for invalid coordinates', async () => {
    await expect(reverseGeocode([-200, 32.78]))
      .rejects.toThrow();
  });

  it('should throw error when no results found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });

    await expect(reverseGeocode([-96.8, 32.78]))
      .rejects.toThrow('No reverse geocode results');
  });
});

describe('Geocode Method Detection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should detect rooftop accuracy', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ properties: { accuracy: 'rooftop' } }),
      ]),
    });

    const result = await geocodeAddress('123 Main St');
    expect(result.method).toBe('rooftop');
  });

  it('should detect parcel accuracy', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['address'],
          properties: { accuracy: 'parcel' },
        }),
      ]),
    });

    const result = await geocodeAddress('123 Main St');
    expect(result.method).toBe('parcel');
  });

  it('should detect street-level', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['street'],
          properties: {},
        }),
      ]),
    });

    const result = await geocodeAddress('Main St');
    expect(result.method).toBe('street');
  });

  it('should detect place-level (city)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['place'],
          properties: {},
        }),
      ]),
    });

    const result = await geocodeAddress('Dallas, TX');
    expect(result.method).toBe('place');
  });

  it('should detect POI with rooftop accuracy', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['poi'],
          properties: { accuracy: 'rooftop' },
        }),
      ]),
    });

    const result = await geocodeAddress('Dallas Convention Center');
    expect(result.method).toBe('rooftop');
  });
});

describe('Confidence Scoring', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should calculate confidence based on place type and relevance', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['address'],
          properties: { accuracy: 'rooftop' },
          relevance: 0.95 
        }),
      ]),
    });

    const result = await geocodeAddress('123 Main St');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should factor in relevance score', async () => {
    // High relevance
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['address'],
          properties: { accuracy: 'rooftop' },
          relevance: 1.0 
        }),
      ]),
    });

    const highRelevance = await geocodeAddress('123 Main St');

    // Low relevance
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['address'],
          properties: { accuracy: 'rooftop' },
          relevance: 0.5 
        }),
      ]),
    });

    const lowRelevance = await geocodeAddress('123 Main St');

    expect(highRelevance.confidence).toBeGreaterThan(lowRelevance.confidence);
  });

  it('should score street-level lower than rooftop', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['address'],
          properties: { accuracy: 'rooftop' },
          relevance: 1.0 
        }),
      ]),
    });

    const rooftop = await geocodeAddress('123 Main St');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => createMockResponse([
        createMockFeature({ 
          place_type: ['street'],
          relevance: 1.0 
        }),
      ]),
    });

    const street = await geocodeAddress('Main St');

    expect(rooftop.confidence).toBeGreaterThan(street.confidence);
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(geocodeAddress('123 Main St'))
      .rejects.toThrow('Network error');
  });

  it('should handle malformed API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unexpected: 'response' }),
    });

    await expect(geocodeAddress('123 Main St'))
      .rejects.toThrow('No geocode results found');
  });

  it('should validate coordinates in proximity option', async () => {
    await expect(geocodeAddress('123 Main St', { proximity: [-200, 32.78] }))
      .rejects.toThrow();
  });

  it('should handle API rate limiting (429)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(geocodeAddress('123 Main St'))
      .rejects.toThrow('Mapbox API error: 429');
  });
});
