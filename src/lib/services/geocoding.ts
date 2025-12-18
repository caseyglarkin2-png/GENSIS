/**
 * Geocoding Service
 * 
 * Integrates with Mapbox Geocoding API for address → coordinate conversion
 * with rooftop preference and confidence scoring.
 */

import { validateLngLat } from '../coordinates';
import type { LngLat } from '../coordinates';

const MAPBOX_API_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export type GeocodeMethod = 'rooftop' | 'parcel' | 'address' | 'street' | 'place' | 'region' | 'country';

export interface GeocodeResult {
  coordinates: LngLat;
  formattedAddress: string;
  method: GeocodeMethod;
  confidence: number; // 0-100
  boundingBox?: [LngLat, LngLat]; // [southwest, northeast]
  placeType: string;
  context: {
    address?: string;
    postcode?: string;
    place?: string;
    region?: string;
    country?: string;
  };
  raw: any; // Original Mapbox response for evidence
}

export interface GeocodeCandidate extends GeocodeResult {
  relevance: number; // 0-1 from Mapbox
  matchedAddress: string;
}

export interface BatchGeocodeResult {
  address: string;
  success: boolean;
  result?: GeocodeResult;
  error?: string;
  candidates?: GeocodeCandidate[];
}

/**
 * Forward geocode a single address with rooftop preference
 */
export async function geocodeAddress(
  address: string,
  options: {
    proximity?: LngLat; // Bias results near this location
    bbox?: [LngLat, LngLat]; // Limit results to bounding box
    country?: string; // ISO 3166-1 alpha-2 country code (e.g., 'us')
    types?: string[]; // e.g., ['address', 'poi']
    limit?: number; // Max candidates (default 5)
  } = {}
): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token not configured');
  }

  const { proximity, bbox, country = 'us', types = ['address', 'poi'], limit = 5 } = options;

  // Build query params
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country,
    types: types.join(','),
    limit: limit.toString(),
    autocomplete: 'false',
  });

  if (proximity) {
    validateLngLat(proximity);
    params.set('proximity', `${proximity[0]},${proximity[1]}`);
  }

  if (bbox) {
    validateLngLat(bbox[0]);
    validateLngLat(bbox[1]);
    params.set('bbox', `${bbox[0][0]},${bbox[0][1]},${bbox[1][0]},${bbox[1][1]}`);
  }

  const url = `${MAPBOX_API_BASE}/${encodeURIComponent(address)}.json?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`No geocode results found for address: ${address}`);
  }

  // Select best candidate (first result, already sorted by relevance)
  const feature = data.features[0];
  const [lng, lat] = feature.center;
  const coordinates: LngLat = [lng, lat];
  validateLngLat(coordinates);

  // Determine geocode method based on place_type and accuracy
  const placeType = feature.place_type[0];
  const method = determineGeocodeMethod(feature);
  const confidence = calculateConfidence(feature);

  // Parse context
  const context: GeocodeResult['context'] = {};
  if (feature.context) {
    for (const ctx of feature.context) {
      const [type] = ctx.id.split('.');
      if (type === 'postcode') context.postcode = ctx.text;
      else if (type === 'place') context.place = ctx.text;
      else if (type === 'region') context.region = ctx.short_code || ctx.text;
      else if (type === 'country') context.country = ctx.short_code || ctx.text;
    }
  }
  if (feature.address) context.address = feature.address;

  // Parse bounding box if present
  let boundingBox: [LngLat, LngLat] | undefined;
  if (feature.bbox) {
    boundingBox = [
      [feature.bbox[0], feature.bbox[1]], // southwest
      [feature.bbox[2], feature.bbox[3]], // northeast
    ];
  }

  return {
    coordinates,
    formattedAddress: feature.place_name,
    method,
    confidence,
    boundingBox,
    placeType,
    context,
    raw: feature,
  };
}

/**
 * Get multiple candidate results for an address (for user selection)
 */
export async function geocodeAddressWithCandidates(
  address: string,
  options: Parameters<typeof geocodeAddress>[1] = {}
): Promise<GeocodeCandidate[]> {
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token not configured');
  }

  const { proximity, bbox, country = 'us', types = ['address', 'poi'], limit = 10 } = options;

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country,
    types: types.join(','),
    limit: limit.toString(),
    autocomplete: 'false',
  });

  if (proximity) {
    validateLngLat(proximity);
    params.set('proximity', `${proximity[0]},${proximity[1]}`);
  }

  if (bbox) {
    validateLngLat(bbox[0]);
    validateLngLat(bbox[1]);
    params.set('bbox', `${bbox[0][0]},${bbox[0][1]},${bbox[1][0]},${bbox[1][1]}`);
  }

  const url = `${MAPBOX_API_BASE}/${encodeURIComponent(address)}.json?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    return [];
  }

  return data.features.map((feature: any) => {
    const [lng, lat] = feature.center;
    const coordinates: LngLat = [lng, lat];
    validateLngLat(coordinates);

    const method = determineGeocodeMethod(feature);
    const confidence = calculateConfidence(feature);

    const context: GeocodeResult['context'] = {};
    if (feature.context) {
      for (const ctx of feature.context) {
        const [type] = ctx.id.split('.');
        if (type === 'postcode') context.postcode = ctx.text;
        else if (type === 'place') context.place = ctx.text;
        else if (type === 'region') context.region = ctx.short_code || ctx.text;
        else if (type === 'country') context.country = ctx.short_code || ctx.text;
      }
    }
    if (feature.address) context.address = feature.address;

    let boundingBox: [LngLat, LngLat] | undefined;
    if (feature.bbox) {
      boundingBox = [
        [feature.bbox[0], feature.bbox[1]],
        [feature.bbox[2], feature.bbox[3]],
      ];
    }

    return {
      coordinates,
      formattedAddress: feature.place_name,
      method,
      confidence,
      boundingBox,
      placeType: feature.place_type[0],
      context,
      raw: feature,
      relevance: feature.relevance,
      matchedAddress: feature.matching_place_name || feature.place_name,
    };
  });
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocode(
  addresses: string[],
  options: Parameters<typeof geocodeAddress>[1] = {}
): Promise<BatchGeocodeResult[]> {
  const results: BatchGeocodeResult[] = [];

  // Process sequentially to avoid rate limits (10 req/sec for Mapbox)
  for (const address of addresses) {
    try {
      const result = await geocodeAddress(address, options);
      const candidates = await geocodeAddressWithCandidates(address, { ...options, limit: 3 });
      results.push({
        address,
        success: true,
        result,
        candidates,
      });
    } catch (error) {
      results.push({
        address,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Rate limit: 50ms delay between requests
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return results;
}

/**
 * Determine geocode method based on Mapbox feature properties
 */
function determineGeocodeMethod(feature: any): GeocodeMethod {
  const placeType = feature.place_type[0];
  const accuracy = feature.properties?.accuracy;

  // Rooftop: address with rooftop accuracy or POI
  if (placeType === 'poi' || placeType === 'address') {
    if (accuracy === 'rooftop' || accuracy === 'point') {
      return 'rooftop';
    }
    if (accuracy === 'parcel' || accuracy === 'interpolated') {
      return 'parcel';
    }
    return 'address';
  }

  // Street-level
  if (placeType === 'street' || placeType === 'neighborhood') {
    return 'street';
  }

  // Place-level (city)
  if (placeType === 'place' || placeType === 'locality') {
    return 'place';
  }

  // Region-level (state)
  if (placeType === 'region') {
    return 'region';
  }

  // Country-level
  if (placeType === 'country') {
    return 'country';
  }

  return 'address'; // Default
}

/**
 * Calculate confidence score (0-100) based on geocode quality
 */
function calculateConfidence(feature: any): number {
  const placeType = feature.place_type[0];
  const relevance = feature.relevance || 0; // 0-1
  const accuracy = feature.properties?.accuracy;

  let baseScore = 0;

  // Base score by place type (higher = more precise)
  if (placeType === 'poi') {
    baseScore = 95;
  } else if (placeType === 'address') {
    if (accuracy === 'rooftop' || accuracy === 'point') {
      baseScore = 90;
    } else if (accuracy === 'parcel') {
      baseScore = 80;
    } else if (accuracy === 'interpolated') {
      baseScore = 70;
    } else {
      baseScore = 75;
    }
  } else if (placeType === 'street') {
    baseScore = 60;
  } else if (placeType === 'place' || placeType === 'locality') {
    baseScore = 40;
  } else if (placeType === 'region') {
    baseScore = 20;
  } else if (placeType === 'country') {
    baseScore = 10;
  } else {
    baseScore = 50; // Default
  }

  // Adjust by relevance (how well the result matches the query)
  const adjustedScore = baseScore * relevance;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(adjustedScore)));
}

/**
 * Reverse geocode: coordinates → address
 */
export async function reverseGeocode(coordinates: LngLat): Promise<GeocodeResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token not configured');
  }

  validateLngLat(coordinates);

  const [lng, lat] = coordinates;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    types: 'address,poi',
    limit: '1',
  });

  const url = `${MAPBOX_API_BASE}/${lng},${lat}.json?${params}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error(`No reverse geocode results found for coordinates: ${coordinates}`);
  }

  const feature = data.features[0];
  const [rLng, rLat] = feature.center;
  const resultCoordinates: LngLat = [rLng, rLat];
  validateLngLat(resultCoordinates);

  const method = determineGeocodeMethod(feature);
  const confidence = calculateConfidence(feature);

  const context: GeocodeResult['context'] = {};
  if (feature.context) {
    for (const ctx of feature.context) {
      const [type] = ctx.id.split('.');
      if (type === 'postcode') context.postcode = ctx.text;
      else if (type === 'place') context.place = ctx.text;
      else if (type === 'region') context.region = ctx.short_code || ctx.text;
      else if (type === 'country') context.country = ctx.short_code || ctx.text;
    }
  }
  if (feature.address) context.address = feature.address;

  let boundingBox: [LngLat, LngLat] | undefined;
  if (feature.bbox) {
    boundingBox = [
      [feature.bbox[0], feature.bbox[1]],
      [feature.bbox[2], feature.bbox[3]],
    ];
  }

  return {
    coordinates: resultCoordinates,
    formattedAddress: feature.place_name,
    method,
    confidence,
    boundingBox,
    placeType: feature.place_type[0],
    context,
    raw: feature,
  };
}
