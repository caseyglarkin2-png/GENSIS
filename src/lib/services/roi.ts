/**
 * ROI Calculation Service
 * 
 * Calculates Return on Investment for facility improvements based on
 * detention savings, paperwork reduction, trailer hunt elimination, etc.
 */

import type { 
  ROIAssumptions, 
  FacilityROI, 
  NetworkROI,
  ParsedFacilityMetrics,
  ConfidenceLevel
} from '../types';

export interface ROIComponent {
  name: string;
  annualSavings: number;
  monthlySavings: number;
  weeklySavings: number;
  confidence: number; // 0-100
  enabled: boolean;
  calculation: string; // Human-readable formula
}

export interface FacilityROICalculation extends FacilityROI {
  components: ROIComponent[];
  roiConfidence: number; // 0-100
  missingInputs: string[]; // What data is missing
}

/**
 * Calculate ROI for a single facility
 */
export function calculateFacilityROI(
  metrics: ParsedFacilityMetrics,
  assumptions: ROIAssumptions,
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED'
): FacilityROICalculation {
  const components: ROIComponent[] = [];
  let totalAnnualSavings = 0;
  const missingInputs: string[] = [];

  // 1. DETENTION SAVINGS
  if (assumptions.roiComponentsEnabled.detentionSavings) {
    const detentionComponent = calculateDetentionSavings(metrics, assumptions);
    components.push(detentionComponent);
    if (detentionComponent.enabled) {
      totalAnnualSavings += detentionComponent.annualSavings;
    } else {
      missingInputs.push('Detention minutes per truck');
    }
  }

  // 2. PAPERWORK REDUCTION
  if (assumptions.roiComponentsEnabled.paperworkReduction) {
    const paperworkComponent = calculatePaperworkSavings(metrics, assumptions);
    components.push(paperworkComponent);
    if (paperworkComponent.enabled) {
      totalAnnualSavings += paperworkComponent.annualSavings;
    } else {
      missingInputs.push('Trucks per day (inbound + outbound)');
    }
  }

  // 3. TRAILER HUNT ELIMINATION
  if (assumptions.roiComponentsEnabled.trailerHuntReduction) {
    const trailerHuntComponent = calculateTrailerHuntSavings(metrics, assumptions);
    components.push(trailerHuntComponent);
    if (trailerHuntComponent.enabled) {
      totalAnnualSavings += trailerHuntComponent.annualSavings;
    } else {
      missingInputs.push('Trailer hunt frequency data');
    }
  }

  // 4. TURN TIME ACCELERATION
  if (assumptions.roiComponentsEnabled.turnTimeAcceleration) {
    const turnTimeComponent = calculateTurnTimeSavings(metrics, assumptions);
    components.push(turnTimeComponent);
    if (turnTimeComponent.enabled) {
      totalAnnualSavings += turnTimeComponent.annualSavings;
    } else {
      missingInputs.push('Average turn time minutes');
    }
  }

  // Apply ROI capture factor (accounts for realistic adoption/ramp)
  const capturedAnnualSavings = totalAnnualSavings * assumptions.globalAssumptions.roiCaptureFactor;

  // Calculate costs
  const implementationCost = 
    (metrics.docksCount?.value || 0) * assumptions.globalAssumptions.implementationCostPerDoor +
    assumptions.globalAssumptions.oneTimeRolloutCostPerFacility;

  const annualOngoingCost = assumptions.globalAssumptions.annualSoftwareCostPerFacility;

  // Net ROI
  const netAnnualROI = capturedAnnualSavings - annualOngoingCost;
  const monthlyROI = netAnnualROI / 12;
  const weeklyROI = netAnnualROI / 52;

  // Delay cost (what you're losing per month by waiting)
  const delayCostPerMonth = monthlyROI;
  const delayCostPerWeek = weeklyROI;

  // Payback period (months to recover implementation cost)
  const paybackMonths = implementationCost > 0 && monthlyROI > 0
    ? implementationCost / monthlyROI
    : 0;

  // ROI confidence (based on data quality and verification status)
  const roiConfidence = calculateROIConfidence(metrics, verificationStatus, components);

  // Build breakdown from components
  const breakdown = {
    detentionSavings: components.find(c => c.name === 'Detention Savings')?.annualSavings || 0,
    paperworkReduction: components.find(c => c.name === 'Paperwork Reduction')?.annualSavings || 0,
    trailerHuntReduction: components.find(c => c.name === 'Trailer Hunt Elimination')?.annualSavings || 0,
    laborSavings: 0,
    turnTimeAcceleration: components.find(c => c.name === 'Turn Time Acceleration')?.annualSavings || 0,
  };

  return {
    projectedAnnualRoi: Math.round(netAnnualROI),
    projectedMonthlyRoi: Math.round(monthlyROI),
    delayCostPerMonth: Math.round(delayCostPerMonth),
    delayCostPerWeek: Math.round(delayCostPerWeek),
    breakdown,
    paybackPeriodMonths: Math.round(paybackMonths * 10) / 10,
    components,
    roiConfidence,
    missingInputs,
  };
}

/**
 * Calculate detention cost savings
 */
function calculateDetentionSavings(
  metrics: ParsedFacilityMetrics,
  assumptions: ROIAssumptions
): ROIComponent {
  const trucksPerDay = 
    (metrics.trucksPerDayInbound?.value || 0) + 
    (metrics.trucksPerDayOutbound?.value || 0);

  const baselineDetention = metrics.detentionMinutesPerTruck?.value || 
    assumptions.globalAssumptions.baselineDetentionMinutesPerTruck;

  const targetDetention = assumptions.globalAssumptions.targetDetentionMinutesPerTruck;

  const enabled = trucksPerDay > 0 && baselineDetention > targetDetention;

  if (!enabled) {
    return {
      name: 'Detention Savings',
      annualSavings: 0,
      monthlySavings: 0,
      weeklySavings: 0,
      confidence: 0,
      enabled: false,
      calculation: 'Missing: trucks per day or detention minutes',
    };
  }

  const minutesSavedPerTruck = baselineDetention - targetDetention;
  const hoursSavedPerTruck = minutesSavedPerTruck / 60;
  const annualTrucks = trucksPerDay * 260; // 260 working days
  const annualSavings = annualTrucks * hoursSavedPerTruck * assumptions.globalAssumptions.detentionCostPerHour;

  const confidence = Math.min(
    metrics.trucksPerDayInbound?.confidence || 50,
    metrics.trucksPerDayOutbound?.confidence || 50,
    metrics.detentionMinutesPerTruck?.confidence || 50
  );

  return {
    name: 'Detention Savings',
    annualSavings: Math.round(annualSavings),
    monthlySavings: Math.round(annualSavings / 12),
    weeklySavings: Math.round(annualSavings / 52),
    confidence,
    enabled: true,
    calculation: `${trucksPerDay} trucks/day × ${minutesSavedPerTruck} min saved × $${assumptions.globalAssumptions.detentionCostPerHour}/hr × 260 days`,
  };
}

/**
 * Calculate paperwork reduction savings
 */
function calculatePaperworkSavings(
  metrics: ParsedFacilityMetrics,
  assumptions: ROIAssumptions
): ROIComponent {
  const trucksPerDay = 
    (metrics.trucksPerDayInbound?.value || 0) + 
    (metrics.trucksPerDayOutbound?.value || 0);

  const baselinePaperworkMinutes = assumptions.globalAssumptions.paperworkMinutesPerTruck;
  const targetPaperworkMinutes = assumptions.globalAssumptions.targetPaperworkMinutesPerTruck;

  const enabled = trucksPerDay > 0;

  if (!enabled) {
    return {
      name: 'Paperwork Reduction',
      annualSavings: 0,
      monthlySavings: 0,
      weeklySavings: 0,
      confidence: 0,
      enabled: false,
      calculation: 'Missing: trucks per day',
    };
  }

  const minutesSavedPerTruck = baselinePaperworkMinutes - targetPaperworkMinutes;
  const hoursSavedPerTruck = minutesSavedPerTruck / 60;
  const annualTrucks = trucksPerDay * 260;
  const annualSavings = annualTrucks * hoursSavedPerTruck * assumptions.globalAssumptions.laborCostPerHour;

  const confidence = Math.min(
    metrics.trucksPerDayInbound?.confidence || 50,
    metrics.trucksPerDayOutbound?.confidence || 50
  );

  return {
    name: 'Paperwork Reduction',
    annualSavings: Math.round(annualSavings),
    monthlySavings: Math.round(annualSavings / 12),
    weeklySavings: Math.round(annualSavings / 52),
    confidence,
    enabled: true,
    calculation: `${trucksPerDay} trucks/day × ${minutesSavedPerTruck} min saved × $${assumptions.globalAssumptions.laborCostPerHour}/hr × 260 days`,
  };
}

/**
 * Calculate trailer hunt elimination savings
 */
function calculateTrailerHuntSavings(
  metrics: ParsedFacilityMetrics,
  assumptions: ROIAssumptions
): ROIComponent {
  const baselineSearches = assumptions.globalAssumptions.baselineTrailerSearchesPerDay;
  const targetSearches = assumptions.globalAssumptions.targetTrailerSearchesPerDay;
  const minutesPerSearch = assumptions.globalAssumptions.avgMinutesPerTrailerSearch;

  const hasTrailerHuntBottleneck = metrics.bottlenecks?.includes('trailer_hunting');

  // Use bottleneck as a multiplier if present
  const searchMultiplier = hasTrailerHuntBottleneck ? 1.5 : 1.0;
  const searchesEliminated = (baselineSearches - targetSearches) * searchMultiplier;

  const enabled = searchesEliminated > 0;

  if (!enabled) {
    return {
      name: 'Trailer Hunt Elimination',
      annualSavings: 0,
      monthlySavings: 0,
      weeklySavings: 0,
      confidence: 0,
      enabled: false,
      calculation: 'No trailer hunt issue identified',
    };
  }

  const minutesSavedPerDay = searchesEliminated * minutesPerSearch;
  const hoursSavedPerDay = minutesSavedPerDay / 60;
  const annualSavings = hoursSavedPerDay * 260 * assumptions.globalAssumptions.laborCostPerHour;

  const confidence = hasTrailerHuntBottleneck ? 70 : 50;

  return {
    name: 'Trailer Hunt Elimination',
    annualSavings: Math.round(annualSavings),
    monthlySavings: Math.round(annualSavings / 12),
    weeklySavings: Math.round(annualSavings / 52),
    confidence,
    enabled: true,
    calculation: `${searchesEliminated.toFixed(1)} searches/day × ${minutesPerSearch} min × $${assumptions.globalAssumptions.laborCostPerHour}/hr × 260 days`,
  };
}

/**
 * Calculate turn time acceleration savings
 */
function calculateTurnTimeSavings(
  metrics: ParsedFacilityMetrics,
  assumptions: ROIAssumptions
): ROIComponent {
  const trucksPerDay = 
    (metrics.trucksPerDayInbound?.value || 0) + 
    (metrics.trucksPerDayOutbound?.value || 0);

  const baselineTurnTime = metrics.avgTurnTimeMinutes?.value || 
    assumptions.globalAssumptions.baselineAvgTurnTimeMinutes;

  const targetTurnTime = assumptions.globalAssumptions.targetAvgTurnTimeMinutes;

  const enabled = trucksPerDay > 0 && baselineTurnTime > targetTurnTime;

  if (!enabled) {
    return {
      name: 'Turn Time Acceleration',
      annualSavings: 0,
      monthlySavings: 0,
      weeklySavings: 0,
      confidence: 0,
      enabled: false,
      calculation: 'Missing: trucks per day or turn time data',
    };
  }

  const minutesSavedPerTruck = baselineTurnTime - targetTurnTime;
  const hoursSavedPerTruck = minutesSavedPerTruck / 60;
  const annualTrucks = trucksPerDay * 260;
  const annualSavings = annualTrucks * hoursSavedPerTruck * assumptions.globalAssumptions.avgDriverTimeValuePerHour;

  const confidence = Math.min(
    metrics.trucksPerDayInbound?.confidence || 50,
    metrics.trucksPerDayOutbound?.confidence || 50,
    metrics.avgTurnTimeMinutes?.confidence || 50
  );

  return {
    name: 'Turn Time Acceleration',
    annualSavings: Math.round(annualSavings),
    monthlySavings: Math.round(annualSavings / 12),
    weeklySavings: Math.round(annualSavings / 52),
    confidence,
    enabled: true,
    calculation: `${trucksPerDay} trucks/day × ${minutesSavedPerTruck} min saved × $${assumptions.globalAssumptions.avgDriverTimeValuePerHour}/hr × 260 days`,
  };
}

/**
 * Calculate overall ROI confidence score
 */
function calculateROIConfidence(
  metrics: ParsedFacilityMetrics,
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED',
  components: ROIComponent[]
): number {
  // Geometry factor
  const geometryFactor = verificationStatus === 'VERIFIED' ? 1.0 
    : verificationStatus === 'NEEDS_REVIEW' ? 0.7 
    : 0.5;

  // Component confidence (weighted average of enabled components)
  const enabledComponents = components.filter(c => c.enabled);
  const componentConfidence = enabledComponents.length > 0
    ? enabledComponents.reduce((sum, c) => sum + c.confidence, 0) / enabledComponents.length
    : 0;

  // Freshness factor (decay confidence if data is old)
  const daysSinceVerified = metrics.lastVerifiedAt 
    ? Math.floor((Date.now() - metrics.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 365; // Assume 1 year old if never verified

  const freshnessFactor = daysSinceVerified < 30 ? 1.0
    : daysSinceVerified < 90 ? 0.9
    : daysSinceVerified < 180 ? 0.7
    : 0.5;

  // Combine factors
  const overallConfidence = geometryFactor * (componentConfidence / 100) * freshnessFactor * 100;

  return Math.round(overallConfidence);
}

/**
 * Map confidence score to level
 */
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 85) return 'Boardroom-Ready';
  if (score >= 70) return 'Defensible';
  if (score >= 50) return 'Directional';
  return 'Speculative';
}

/**
 * Calculate aggregated network-level ROI
 */
export function calculateNetworkROI(
  facilityROIs: FacilityROICalculation[],
  networkId: string,
  assumptionsVersion: string
): NetworkROI {
  const totalAnnualROI = facilityROIs.reduce((sum, f) => sum + f.projectedAnnualRoi, 0);
  const totalMonthlyROI = facilityROIs.reduce((sum, f) => sum + f.projectedMonthlyRoi, 0);
  const totalDelayCostPerMonth = facilityROIs.reduce((sum, f) => sum + f.delayCostPerMonth, 0);
  const totalDelayCostPerWeek = facilityROIs.reduce((sum, f) => sum + f.delayCostPerWeek, 0);

  // Aggregate breakdown
  const totalBreakdown = {
    detentionSavings: facilityROIs.reduce((sum, f) => sum + f.breakdown.detentionSavings, 0),
    paperworkReduction: facilityROIs.reduce((sum, f) => sum + f.breakdown.paperworkReduction, 0),
    trailerHuntReduction: facilityROIs.reduce((sum, f) => sum + f.breakdown.trailerHuntReduction, 0),
    laborSavings: facilityROIs.reduce((sum, f) => sum + (f.breakdown.laborSavings || 0), 0),
    turnTimeAcceleration: facilityROIs.reduce((sum, f) => sum + (f.breakdown.turnTimeAcceleration || 0), 0),
  };

  const avgPaybackMonths = facilityROIs.length > 0
    ? facilityROIs.reduce((sum, f) => sum + (f.paybackPeriodMonths || 0), 0) / facilityROIs.length
    : 0;

  const avgROIConfidence = facilityROIs.length > 0
    ? Math.round(facilityROIs.reduce((sum, f) => sum + f.roiConfidence, 0) / facilityROIs.length)
    : 0;

  const verifiedCount = 0; // Would need to pass this in

  return {
    networkId,
    totalFacilities: facilityROIs.length,
    verifiedFacilities: verifiedCount,
    verifiedPercentage: facilityROIs.length > 0 ? (verifiedCount / facilityROIs.length) * 100 : 0,
    aggregateRoi: {
      projectedAnnualRoi: Math.round(totalAnnualROI),
      projectedMonthlyRoi: Math.round(totalMonthlyROI),
      delayCostPerMonth: Math.round(totalDelayCostPerMonth),
      delayCostPerWeek: Math.round(totalDelayCostPerWeek),
      breakdown: totalBreakdown,
      paybackPeriodMonths: Math.round(avgPaybackMonths * 10) / 10,
    },
    confidence: {
      roiConfidenceScore: avgROIConfidence,
      roiConfidenceLevel: getConfidenceLevel(avgROIConfidence),
      drivers: avgROIConfidence < 70 ? ['Incomplete facility data'] : [],
    },
    assumptionsVersion,
    assumptionsEffectiveDate: new Date().toISOString(),
  };
}
