/**
 * Scoring Service
 * 
 * Calculates data completeness and ROI confidence scores for facilities.
 */

import type { ParsedFacilityMetrics } from '../types';

export type CompletenessLevel = 'Discovery' | 'Planning' | 'Rollout-Ready' | 'Exec-Ready';
export type ConfidenceLevel = 'Speculative' | 'Directional' | 'Defensible' | 'Boardroom-Ready';

export interface DataCompletenessResult {
  score: number; // 0-100
  level: CompletenessLevel;
  breakdown: {
    geometry: number; // 0-100
    throughput: number; // 0-100
    infrastructure: number; // 0-100
    bottlenecks: number; // 0-100
  };
  missingFields: string[]; // Top 3 fixes
  recommendations: string[];
}

export interface ROIConfidenceResult {
  score: number; // 0-100
  level: ConfidenceLevel;
  factors: {
    geometry: number; // 0-100
    freshness: number; // 0-100
    metricQuality: number; // 0-100
  };
  topDrivers: string[]; // Top 3 drivers of low confidence
  recommendations: string[];
}

/**
 * Calculate data completeness score (0-100)
 */
export function calculateDataCompleteness(
  metrics: ParsedFacilityMetrics,
  hasCentroid: boolean,
  hasPolygon: boolean,
  hasCannotPolygonReason: boolean
): DataCompletenessResult {
  const missingFields: string[] = [];
  const recommendations: string[] = [];

  // 1. GEOMETRY COMPLETENESS (40% weight - CRITICAL)
  let geometryScore = 0;
  
  if (!hasCentroid) {
    geometryScore = 0; // Hard gate: no centroid = 0
    missingFields.push('Facility centroid');
    recommendations.push('Add facility centroid via map verification');
  } else {
    geometryScore += 50; // Has centroid
    
    if (hasPolygon) {
      geometryScore += 50; // Has polygon
    } else if (hasCannotPolygonReason) {
      geometryScore += 25; // Has reason why no polygon
      recommendations.push('Consider adding polygon if facility geometry has changed');
    } else {
      missingFields.push('Facility polygon or cannot_polygon_reason');
      recommendations.push('Draw facility polygon or document why it cannot be drawn');
    }
  }

  // 2. THROUGHPUT/TIME METRICS (30% weight)
  const throughputMetrics = [
    { key: 'trucksPerDayInbound', name: 'Inbound trucks/day', value: metrics.trucksPerDayInbound },
    { key: 'trucksPerDayOutbound', name: 'Outbound trucks/day', value: metrics.trucksPerDayOutbound },
    { key: 'avgTurnTimeMinutes', name: 'Average turn time', value: metrics.avgTurnTimeMinutes },
    { key: 'detentionMinutesPerTruck', name: 'Detention minutes', value: metrics.detentionMinutesPerTruck },
  ];

  let throughputScore = 0;
  let throughputTotal = 0;
  
  for (const metric of throughputMetrics) {
    if (metric.value && metric.value.value !== null && metric.value.value !== undefined) {
      // Weighted by confidence
      throughputScore += ((metric.value.confidence || 50) / 100) * 25; // 25 points per metric
      throughputTotal += 25;
    } else {
      if (missingFields.length < 3) {
        missingFields.push(metric.name);
      }
    }
  }
  
  // Normalize to 0-100
  throughputScore = throughputTotal > 0 ? (throughputScore / throughputTotal) * 100 : 0;

  if (throughputScore < 50) {
    recommendations.push('Add truck volume and timing metrics for better ROI estimates');
  }

  // 3. INFRASTRUCTURE/YARD COVERAGE (20% weight)
  const infraMetrics = [
    { key: 'docksCount', name: 'Number of docks', value: metrics.docksCount },
    { key: 'gatesCount', name: 'Number of gates', value: metrics.gatesCount },
    { key: 'yardSpotsCount', name: 'Yard spots', value: metrics.yardSpotsCount },
    { key: 'trailersOnYardAvg', name: 'Trailers on yard', value: metrics.trailersOnYardAvg },
  ];

  let infraScore = 0;
  let infraTotal = 0;
  
  for (const metric of infraMetrics) {
    if (metric.value && metric.value.value !== null && metric.value.value !== undefined) {
      infraScore += ((metric.value.confidence || 50) / 100) * 25; // 25 points per metric
      infraTotal += 25;
    } else {
      if (missingFields.length < 3) {
        missingFields.push(metric.name);
      }
    }
  }
  
  infraScore = infraTotal > 0 ? (infraScore / infraTotal) * 100 : 0;

  if (infraScore < 50) {
    recommendations.push('Add infrastructure metrics (docks, gates, yard capacity)');
  }

  // 4. BOTTLENECK CHARACTERIZATION (10% weight)
  let bottleneckScore = 0;
  
  if (metrics.bottlenecks && metrics.bottlenecks.length > 0) {
    bottleneckScore = 100; // Has bottleneck data
  } else {
    if (missingFields.length < 3) {
      missingFields.push('Bottleneck characterization');
    }
    recommendations.push('Identify operational bottlenecks for targeted ROI');
  }

  // WEIGHTED TOTAL SCORE
  const totalScore = 
    geometryScore * 0.4 +
    throughputScore * 0.3 +
    infraScore * 0.2 +
    bottleneckScore * 0.1;

  const score = Math.round(totalScore);

  // Determine level
  let level: CompletenessLevel;
  if (score >= 85) level = 'Exec-Ready';
  else if (score >= 70) level = 'Rollout-Ready';
  else if (score >= 40) level = 'Planning';
  else level = 'Discovery';

  return {
    score,
    level,
    breakdown: {
      geometry: Math.round(geometryScore),
      throughput: Math.round(throughputScore),
      infrastructure: Math.round(infraScore),
      bottlenecks: Math.round(bottleneckScore),
    },
    missingFields: missingFields.slice(0, 3), // Top 3
    recommendations: recommendations.slice(0, 3), // Top 3
  };
}

/**
 * Calculate ROI confidence score (0-100)
 */
export function calculateROIConfidence(
  metrics: ParsedFacilityMetrics,
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED',
  hasCentroid: boolean
): ROIConfidenceResult {
  const topDrivers: string[] = [];
  const recommendations: string[] = [];

  // 1. GEOMETRY FACTOR (40% weight)
  let geometryScore = 0;
  
  if (!hasCentroid) {
    geometryScore = 0;
    topDrivers.push('Missing facility centroid (0% geometry confidence)');
    recommendations.push('CRITICAL: Verify facility location on map');
  } else {
    if (verificationStatus === 'VERIFIED') {
      geometryScore = 100;
    } else if (verificationStatus === 'NEEDS_REVIEW') {
      geometryScore = 70;
      topDrivers.push('Geometry needs review (70% geometry confidence)');
      recommendations.push('Review and verify facility geometry');
    } else {
      geometryScore = 50;
      topDrivers.push('Unverified geometry (50% geometry confidence)');
      recommendations.push('Verify facility location and draw polygon');
    }
  }

  // 2. FRESHNESS FACTOR (20% weight)
  const daysSinceVerified = metrics.lastVerifiedAt 
    ? Math.floor((Date.now() - metrics.lastVerifiedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 365; // Assume 1 year if never verified

  let freshnessScore = 0;
  if (daysSinceVerified < 30) {
    freshnessScore = 100;
  } else if (daysSinceVerified < 90) {
    freshnessScore = 90;
  } else if (daysSinceVerified < 180) {
    freshnessScore = 70;
  } else {
    freshnessScore = 50;
    topDrivers.push(`Data is ${daysSinceVerified} days old`);
    recommendations.push('Update facility metrics and re-verify location');
  }

  // 3. METRIC QUALITY (40% weight)
  // Average confidence of key ROI-driving metrics
  const keyMetrics = [
    metrics.trucksPerDayInbound,
    metrics.trucksPerDayOutbound,
    metrics.detentionMinutesPerTruck,
    metrics.avgTurnTimeMinutes,
  ];

  const validMetrics = keyMetrics.filter(m => m && m.value !== null && m.value !== undefined);
  
  if (validMetrics.length === 0) {
    topDrivers.push('Missing all key ROI metrics');
    recommendations.push('Add truck volume and timing data');
  }

  const avgMetricConfidence = validMetrics.length > 0
    ? validMetrics.reduce((sum, m) => sum + (m?.confidence || 0), 0) / validMetrics.length
    : 0;

  const metricQualityScore = avgMetricConfidence;

  // Check for low-confidence metrics
  const lowConfMetrics = validMetrics.filter(m => (m?.confidence || 0) < 60);
  if (lowConfMetrics.length > 0 && topDrivers.length < 3) {
    topDrivers.push(`${lowConfMetrics.length} metrics have <60% confidence`);
    recommendations.push('Improve confidence by adding evidence links and sources');
  }

  // WEIGHTED TOTAL SCORE
  const totalScore = 
    geometryScore * 0.4 +
    freshnessScore * 0.2 +
    metricQualityScore * 0.4;

  const score = Math.round(totalScore);

  // Determine level
  let level: ConfidenceLevel;
  if (score >= 85) level = 'Boardroom-Ready';
  else if (score >= 70) level = 'Defensible';
  else if (score >= 40) level = 'Directional';
  else level = 'Speculative';

  return {
    score,
    level,
    factors: {
      geometry: Math.round(geometryScore),
      freshness: Math.round(freshnessScore),
      metricQuality: Math.round(metricQualityScore),
    },
    topDrivers: topDrivers.slice(0, 3), // Top 3
    recommendations: recommendations.slice(0, 3), // Top 3
  };
}

/**
 * Calculate priority score for facility rollout sequencing
 * (Stub for Milestone 2 - basic implementation based on ROI and volume)
 */
export function calculatePriorityScore(
  projectedAnnualROI: number,
  trucksPerDay: number,
  dataCompletenessScore: number,
  weights = {
    roi: 0.5,
    volume: 0.3,
    readiness: 0.2,
  }
): number {
  // Normalize values to 0-1 scale (using reasonable max values)
  const normalizedROI = Math.min(projectedAnnualROI / 500000, 1); // Max $500k
  const normalizedVolume = Math.min(trucksPerDay / 200, 1); // Max 200 trucks/day
  const normalizedReadiness = dataCompletenessScore / 100;

  const score = 
    normalizedROI * weights.roi +
    normalizedVolume * weights.volume +
    normalizedReadiness * weights.readiness;

  return Math.round(score * 100); // 0-100
}

/**
 * Get explainability for priority score
 */
export interface PriorityScoreExplanation {
  score: number;
  topFactors: Array<{
    factor: string;
    contribution: number; // 0-100
    description: string;
  }>;
}

export function explainPriorityScore(
  projectedAnnualROI: number,
  trucksPerDay: number,
  dataCompletenessScore: number,
  weights = {
    roi: 0.5,
    volume: 0.3,
    readiness: 0.2,
  }
): PriorityScoreExplanation {
  const normalizedROI = Math.min(projectedAnnualROI / 500000, 1);
  const normalizedVolume = Math.min(trucksPerDay / 200, 1);
  const normalizedReadiness = dataCompletenessScore / 100;

  const roiContribution = normalizedROI * weights.roi * 100;
  const volumeContribution = normalizedVolume * weights.volume * 100;
  const readinessContribution = normalizedReadiness * weights.readiness * 100;

  const score = Math.round(roiContribution + volumeContribution + readinessContribution);

  const factors = [
    {
      factor: 'ROI Impact',
      contribution: Math.round(roiContribution),
      description: `Projected annual ROI of $${projectedAnnualROI.toLocaleString()}`,
    },
    {
      factor: 'Facility Volume',
      contribution: Math.round(volumeContribution),
      description: `${trucksPerDay} trucks per day`,
    },
    {
      factor: 'Data Readiness',
      contribution: Math.round(readinessContribution),
      description: `${dataCompletenessScore}% data completeness`,
    },
  ];

  // Sort by contribution descending
  factors.sort((a, b) => b.contribution - a.contribution);

  return {
    score,
    topFactors: factors,
  };
}
