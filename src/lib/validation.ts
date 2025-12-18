/**
 * Zod Validation Schemas
 * Runtime validation for all API inputs
 */

import { z } from 'zod';
import {
  MIN_LATITUDE,
  MAX_LATITUDE,
  MIN_LONGITUDE,
  MAX_LONGITUDE,
  validateLngLat,
  validateGeoJSONPoint,
  validateGeoJSONPolygon,
} from './coordinates';

// Coordinate schemas
export const lngLatSchema = z
  .tuple([z.number(), z.number()])
  .refine(
    (coords) => {
      try {
        validateLngLat(coords);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: `Coordinates must be [lng, lat] with lng ∈ [${MIN_LONGITUDE}, ${MAX_LONGITUDE}] and lat ∈ [${MIN_LATITUDE}, ${MAX_LATITUDE}]`,
    }
  );

export const geoJSONPointSchema = z
  .object({
    type: z.literal('Point'),
    coordinates: lngLatSchema,
  })
  .refine(
    (point) => {
      try {
        validateGeoJSONPoint(point);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid GeoJSON Point' }
  );

export const geoJSONPolygonSchema = z
  .object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(lngLatSchema)),
  })
  .refine(
    (polygon) => {
      try {
        validateGeoJSONPolygon(polygon);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid GeoJSON Polygon' }
  );

// Enums
export const verificationStatusSchema = z.enum([
  'UNVERIFIED',
  'NEEDS_REVIEW',
  'VERIFIED',
]);

export const metricSourceSchema = z.enum([
  'manual',
  'import',
  'geocoder',
  'estimate',
  'integration',
]);

export const bottleneckSchema = z.enum([
  'gate_congestion',
  'yard_congestion',
  'paperwork',
  'trailer_hunting',
  'dock_scheduling',
  'driver_check_in',
]);

export const customerTypeSchema = z.enum([
  'shipper',
  'carrier',
  '3pl',
  'warehouse_network',
]);

// Confidence score (0-100)
export const confidenceScoreSchema = z
  .number()
  .int()
  .min(0)
  .max(100);

// Network schemas
export const createNetworkSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  customerType: customerTypeSchema.optional(),
});

export const updateNetworkSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  customerType: customerTypeSchema.optional(),
});

// Facility schemas
export const createFacilitySchema = z.object({
  name: z.string().min(1).max(255),
  facilityCode: z.string().max(100).optional(),
  facilityType: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
});

export const updateFacilitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  facilityCode: z.string().max(100).optional(),
  facilityType: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
});

// Geometry verification schema
export const verifyGeometrySchema = z
  .object({
    centroid: lngLatSchema,
    polygon: geoJSONPolygonSchema.optional(),
    cannotPolygonReason: z.string().optional(),
    verificationMethod: z.string().min(1).max(100),
    confidenceScore: confidenceScoreSchema,
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      // Must have polygon OR cannotPolygonReason
      return data.polygon !== undefined || data.cannotPolygonReason !== undefined;
    },
    {
      message: 'Must provide either polygon or cannotPolygonReason',
      path: ['polygon'],
    }
  );

// Metric value schema (reusable)
const metricValueSchema = z.object({
  value: z.union([z.number().int(), z.array(bottleneckSchema)]), // int or bottlenecks array
  confidence: confidenceScoreSchema.optional(),
  source: metricSourceSchema.optional(),
  evidenceLinks: z.array(z.string().url()).optional(),
});

// Facility metrics schema
export const updateMetricsSchema = z.object({
  docksCount: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  gatesCount: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  yardSpotsCount: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  trailersOnYardAvg: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  trucksPerDayInbound: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  trucksPerDayOutbound: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  avgTurnTimeMinutes: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  detentionMinutesPerTruck: metricValueSchema.extend({ value: z.number().int().min(0) }).optional(),
  bottlenecks: metricValueSchema.extend({ value: z.array(bottleneckSchema) }).optional(),
});

// ROI assumptions schema
export const roiAssumptionsSchema = z.object({
  version: z.string().min(1).max(50),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  assumptionsData: z.object({
    currency: z.string().default('USD'),
    globalAssumptions: z.object({
      detentionCostPerHour: z.number().positive(),
      laborCostPerHour: z.number().positive(),
      avgDriverTimeValuePerHour: z.number().positive(),
      baselineAvgTurnTimeMinutes: z.number().positive(),
      targetAvgTurnTimeMinutes: z.number().positive(),
      baselineDetentionMinutesPerTruck: z.number().nonnegative(),
      targetDetentionMinutesPerTruck: z.number().nonnegative(),
      baselineTrailerSearchesPerDay: z.number().nonnegative(),
      targetTrailerSearchesPerDay: z.number().nonnegative(),
      avgMinutesPerTrailerSearch: z.number().nonnegative(),
      paperworkMinutesPerTruck: z.number().nonnegative(),
      targetPaperworkMinutesPerTruck: z.number().nonnegative(),
      implementationCostPerDoor: z.number().nonnegative(),
      annualSoftwareCostPerFacility: z.number().nonnegative(),
      oneTimeRolloutCostPerFacility: z.number().nonnegative(),
      discountRateAnnual: z.number().min(0).max(1),
      roiCaptureFactor: z.number().min(0).max(1),
      rampCurveEnabled: z.boolean().optional(),
      rampCurveWeekly: z.array(z.number()).optional(),
    }),
    roiComponentsEnabled: z.object({
      detentionSavings: z.boolean(),
      laborSavings: z.boolean(),
      turnTimeAcceleration: z.boolean(),
      paperworkReduction: z.boolean(),
      trailerHuntReduction: z.boolean(),
    }),
    bottleneckWeights: z.object({
      gateCongest: z.number().min(0),
      yardCongestion: z.number().min(0),
      paperwork: z.number().min(0),
      trailerHunting: z.number().min(0),
      dockScheduling: z.number().min(0),
      driverCheckIn: z.number().min(0),
    }),
    facilityOverrideRules: z
      .object({
        allowFacilityOverrides: z.boolean(),
        overridePrecedence: z.string(),
      })
      .optional(),
  }),
});

// Geocoding schemas
export const forwardGeocodeSchema = z.object({
  address: z.string().min(1),
});

export const batchGeocodeSchema = z.object({
  addresses: z.array(z.string().min(1)).min(1).max(100), // Limit batch size
});

// CSV import schema (for individual rows)
export const csvFacilityRowSchema = z.object({
  name: z.string().min(1),
  facility_code: z.string().optional(),
  facility_type: z.string().optional(),
  address_line1: z.string().min(1),
  address_line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  country: z.string().optional(),
});

export type CreateNetworkInput = z.infer<typeof createNetworkSchema>;
export type UpdateNetworkInput = z.infer<typeof updateNetworkSchema>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type VerifyGeometryInput = z.infer<typeof verifyGeometrySchema>;
export type UpdateMetricsInput = z.infer<typeof updateMetricsSchema>;
export type RoiAssumptionsInput = z.infer<typeof roiAssumptionsSchema>;
export type ForwardGeocodeInput = z.infer<typeof forwardGeocodeSchema>;
export type BatchGeocodeInput = z.infer<typeof batchGeocodeSchema>;
export type CsvFacilityRow = z.infer<typeof csvFacilityRowSchema>;
