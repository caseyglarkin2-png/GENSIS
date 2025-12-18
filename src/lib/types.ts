/**
 * Application Types
 * Augments Prisma types with geometry data
 */

import { Facility, FacilityMetric, Network, User, VerificationStatus, MetricSource } from '@prisma/client';
import type { LngLat, GeoJSONPolygon } from './coordinates';

// Facility with parsed geometry
export interface FacilityWithGeometry extends Omit<Facility, 'facilityCentroid' | 'facilityPolygon'> {
  centroid: LngLat | null;
  polygon: GeoJSONPolygon | null;
}

// Metric with confidence tracking
export interface MetricValue<T = number> {
  value: T | null;
  confidence: number | null;
  source: MetricSource | null;
  lastVerifiedAt: Date | null;
  evidenceLinks: string[];
}

// Parsed facility metrics
export interface ParsedFacilityMetrics {
  facilityId?: string;
  docksCount?: MetricValue<number>;
  gatesCount?: MetricValue<number>;
  yardSpotsCount?: MetricValue<number>;
  trailersOnYardAvg?: MetricValue<number>;
  trucksPerDayInbound?: MetricValue<number>;
  trucksPerDayOutbound?: MetricValue<number>;
  avgTurnTimeMinutes?: MetricValue<number>;
  detentionMinutesPerTruck?: MetricValue<number>;
  bottlenecks?: string[];
  lastVerifiedAt?: Date;
}

// Facility detail (full)
export interface FacilityDetail extends FacilityWithGeometry {
  network: Network;
  metrics: ParsedFacilityMetrics | null;
  scoring: {
    dataCompletenessScore: number;
    dataCompletenessLevel: CompletenessLevel;
    missingFields: MissingField[];
    roiConfidenceScore: number;
    roiConfidenceLevel: ConfidenceLevel;
    confidenceDrivers: string[];
  };
  roi: FacilityROI | null;
}

// Data completeness levels
export type CompletenessLevel = 'Discovery' | 'Planning' | 'Rollout-Ready' | 'Exec-Ready';

// ROI confidence levels
export type ConfidenceLevel = 'Speculative' | 'Directional' | 'Defensible' | 'Boardroom-Ready';

// Missing field
export interface MissingField {
  field: string;
  impact: number;
  category: string;
}

// ROI breakdown
export interface ROIBreakdown {
  detentionSavings: number;
  paperworkReduction: number;
  trailerHuntReduction: number;
  laborSavings?: number;
  turnTimeAcceleration?: number;
}

// Facility ROI
export interface FacilityROI {
  projectedAnnualRoi: number;
  projectedMonthlyRoi: number;
  delayCostPerMonth: number;
  delayCostPerWeek: number;
  breakdown: ROIBreakdown;
  paybackPeriodMonths?: number;
}

// Network ROI
export interface NetworkROI {
  networkId: string;
  totalFacilities: number;
  verifiedFacilities: number;
  verifiedPercentage: number;
  aggregateRoi: FacilityROI;
  confidence: {
    roiConfidenceScore: number;
    roiConfidenceLevel: ConfidenceLevel;
    drivers: string[];
  };
  assumptionsVersion: string;
  assumptionsEffectiveDate: string;
}

// ROI Assumptions (typed)
export interface ROIAssumptions {
  currency: string;
  globalAssumptions: {
    detentionCostPerHour: number;
    laborCostPerHour: number;
    avgDriverTimeValuePerHour: number;
    baselineAvgTurnTimeMinutes: number;
    targetAvgTurnTimeMinutes: number;
    baselineDetentionMinutesPerTruck: number;
    targetDetentionMinutesPerTruck: number;
    baselineTrailerSearchesPerDay: number;
    targetTrailerSearchesPerDay: number;
    avgMinutesPerTrailerSearch: number;
    paperworkMinutesPerTruck: number;
    targetPaperworkMinutesPerTruck: number;
    implementationCostPerDoor: number;
    annualSoftwareCostPerFacility: number;
    oneTimeRolloutCostPerFacility: number;
    discountRateAnnual: number;
    roiCaptureFactor: number;
    rampCurveEnabled?: boolean;
    rampCurveWeekly?: number[];
  };
  roiComponentsEnabled: {
    detentionSavings: boolean;
    laborSavings: boolean;
    turnTimeAcceleration: boolean;
    paperworkReduction: boolean;
    trailerHuntReduction: boolean;
  };
  bottleneckWeights: {
    gateCongest: number;
    yardCongestion: number;
    paperwork: number;
    trailerHunting: number;
    dockScheduling: number;
    driverCheckIn: number;
  };
  facilityOverrideRules?: {
    allowFacilityOverrides: boolean;
    overridePrecedence: string;
  };
}

// Geocoding result
export interface GeocodeCandidate {
  address: string;
  centroid: LngLat;
  confidence: number;
  precision: 'rooftop' | 'street' | 'city' | 'region';
}

// CSV import result
export interface CSVImportResult {
  importBatchId: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
  facilitiesCreated: Array<{
    id: string;
    name: string;
    centroid: LngLat | null;
    verificationStatus: VerificationStatus;
    geocodeConfidence: number | null;
  }>;
}

// API Response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string;
  userName: string;
  changedAt: Date;
}

// Network with stats
export interface NetworkWithStats extends Network {
  facilityCount: number;
  verifiedFacilityCount: number;
  verifiedPercentage: number;
}

// Completeness score breakdown
export interface CompletenessBreakdown {
  geometry: {
    score: number;
    max: number;
    status: VerificationStatus;
  };
  throughput: {
    score: number;
    max: number;
    avgConfidence: number;
  };
  infrastructure: {
    score: number;
    max: number;
    avgConfidence: number;
  };
  bottlenecks: {
    score: number;
    max: number;
    count: number;
  };
  laneData: {
    score: number;
    max: number;
    coverage: number;
  };
}

// ROI confidence factors
export interface ROIConfidenceFactors {
  geometryFactor: {
    score: number;
    status: VerificationStatus;
    confidence: number;
  };
  freshnessFactor: {
    score: number;
    daysSinceVerification: number;
  };
  componentConfidence: {
    score: number;
    breakdown: Record<string, { confidence: number; weight: number }>;
  };
}

// PDF watermark rules
export interface WatermarkRules {
  shouldWatermark: boolean;
  reason: string;
  text: string;
}
