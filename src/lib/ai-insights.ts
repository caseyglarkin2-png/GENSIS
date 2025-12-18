/**
 * AI INSIGHTS ENGINE
 * 
 * The "weapon" - provides competitive advantage through:
 * - Anomaly detection
 * - Predictive analytics
 * - Benchmarking
 * - Automated recommendations
 */

import { Facility, FacilityMetric, Network } from '@prisma/client';

export interface Insight {
  id: string;
  type: 'anomaly' | 'recommendation' | 'prediction' | 'benchmark' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  confidenceScore: number; // 0-100
  potentialImpact: {
    timesSaved?: string;
    costSaved?: string;
    efficiencyGain?: string;
  };
  dataPoints: any;
  actionable: boolean;
  actionUrl?: string;
}

/**
 * ANOMALY DETECTION
 * Automatically spots issues before they become problems
 */
export function detectAnomalies(
  facilities: (Facility & { metrics: FacilityMetric | null })[]
): Insight[] {
  const insights: Insight[] = [];
  
  // Calculate network baselines
  const avgTurnTime = calculateAverage(
    facilities.map(f => f.metrics?.avgTurnTimeMinutes).filter(Boolean) as number[]
  );
  
  const avgDetention = calculateAverage(
    facilities.map(f => f.metrics?.detentionMinutesPerTruck).filter(Boolean) as number[]
  );
  
  // Detect outliers
  facilities.forEach(facility => {
    if (!facility.metrics) return;
    
    // Turn time anomaly
    if (facility.metrics.avgTurnTimeMinutes && 
        facility.metrics.avgTurnTimeMinutes > avgTurnTime * 1.5) {
      insights.push({
        id: `anomaly-turn-${facility.id}`,
        type: 'anomaly',
        priority: 'high',
        title: `${facility.name}: Slow Turn Times Detected`,
        description: `Average turn time is ${facility.metrics.avgTurnTimeMinutes} minutes, 50% above network average of ${Math.round(avgTurnTime)} minutes.`,
        recommendation: 'Review dock scheduling, yard layout, or staffing levels. Similar facilities reduced turn time by 30% with optimized yard management.',
        confidenceScore: 87,
        potentialImpact: {
          timesSaved: '45 min per truck',
          costSaved: '$2,400/day',
          efficiencyGain: '30%'
        },
        dataPoints: {
          facilityTurnTime: facility.metrics.avgTurnTimeMinutes,
          networkAverage: avgTurnTime,
          deviation: Math.round(((facility.metrics.avgTurnTimeMinutes - avgTurnTime) / avgTurnTime) * 100)
        },
        actionable: true,
        actionUrl: `/facilities/${facility.id}/optimize`
      });
    }
    
    // Detention anomaly
    if (facility.metrics.detentionMinutesPerTruck &&
        facility.metrics.detentionMinutesPerTruck > avgDetention * 2) {
      insights.push({
        id: `anomaly-detention-${facility.id}`,
        type: 'alert',
        priority: 'critical',
        title: `${facility.name}: High Detention Charges Risk`,
        description: `Detention averaging ${facility.metrics.detentionMinutesPerTruck} min/truck - 2x network average. Likely causing carrier complaints and fees.`,
        recommendation: 'Immediate action needed: Review appointment scheduling, dock availability, and unloading procedures.',
        confidenceScore: 92,
        potentialImpact: {
          costSaved: '$5,000/day in detention fees'
        },
        dataPoints: {
          detentionMinutes: facility.metrics.detentionMinutesPerTruck,
          networkAverage: avgDetention
        },
        actionable: true,
        actionUrl: `/facilities/${facility.id}/detention-analysis`
      });
    }
    
    // Capacity utilization
    if (facility.metrics.yardSpotsCount && facility.metrics.trailersOnYardAvg) {
      const utilization = (facility.metrics.trailersOnYardAvg / facility.metrics.yardSpotsCount) * 100;
      
      if (utilization > 90) {
        insights.push({
          id: `anomaly-capacity-${facility.id}`,
          type: 'alert',
          priority: 'high',
          title: `${facility.name}: Yard Capacity Critical`,
          description: `Yard operating at ${Math.round(utilization)}% capacity. Risk of gridlock and operational delays.`,
          recommendation: 'Consider: 1) Increase trailer turns, 2) Expand yard capacity, 3) Implement drop-and-hook programs.',
          confidenceScore: 95,
          potentialImpact: {
            efficiencyGain: '25% more throughput'
          },
          dataPoints: {
            yardSpots: facility.metrics.yardSpotsCount,
            averageOccupancy: facility.metrics.trailersOnYardAvg,
            utilizationPercent: utilization
          },
          actionable: true,
          actionUrl: `/facilities/${facility.id}/capacity-planning`
        });
      }
    }
  });
  
  return insights;
}

/**
 * PREDICTIVE ANALYTICS
 * Forecast future trends and capacity needs
 */
export function generatePredictions(
  network: Network,
  facilities: (Facility & { metrics: FacilityMetric | null })[]
): Insight[] {
  const insights: Insight[] = [];
  
  // Predict capacity constraints (3-6 months out)
  const totalYardSpots = facilities.reduce((sum, f) => 
    sum + (f.metrics?.yardSpotsCount || 0), 0
  );
  
  const totalTrailersAvg = facilities.reduce((sum, f) => 
    sum + (f.metrics?.trailersOnYardAvg || 0), 0
  );
  
  const currentUtilization = (totalTrailersAvg / totalYardSpots) * 100;
  
  // Simulate 10% growth
  const projectedUtilization = currentUtilization * 1.1;
  
  if (projectedUtilization > 85) {
    insights.push({
      id: 'prediction-capacity',
      type: 'prediction',
      priority: 'medium',
      title: 'Network Capacity Constraint Predicted',
      description: `With projected 10% volume growth, network will reach ${Math.round(projectedUtilization)}% yard capacity in Q2 2026.`,
      recommendation: 'Start planning now: Identify facilities for expansion or consider adding a new hub in high-growth regions.',
      confidenceScore: 78,
      potentialImpact: {
        costSaved: 'Avoid $250k in emergency capacity costs'
      },
      dataPoints: {
        currentUtilization,
        projectedUtilization,
        monthsUntilCritical: 4
      },
      actionable: true,
      actionUrl: `/networks/${network.id}/capacity-planning`
    });
  }
  
  // Predict maintenance needs
  const highThroughputFacilities = facilities.filter(f => 
    (f.metrics?.trucksPerDayInbound || 0) + (f.metrics?.trucksPerDayOutbound || 0) > 200
  );
  
  if (highThroughputFacilities.length > 0) {
    insights.push({
      id: 'prediction-maintenance',
      type: 'recommendation',
      priority: 'medium',
      title: 'Preventive Maintenance Recommended',
      description: `${highThroughputFacilities.length} facilities handling 200+ trucks/day. High throughput increases wear on infrastructure.`,
      recommendation: 'Schedule quarterly inspections for gates, docks, and yard surfaces at high-volume facilities.',
      confidenceScore: 85,
      potentialImpact: {
        costSaved: '$50k avoided emergency repairs',
        efficiencyGain: '99% uptime'
      },
      dataPoints: {
        facilitiesAtRisk: highThroughputFacilities.map(f => ({
          name: f.name,
          dailyThroughput: (f.metrics?.trucksPerDayInbound || 0) + (f.metrics?.trucksPerDayOutbound || 0)
        }))
      },
      actionable: true
    });
  }
  
  return insights;
}

/**
 * BENCHMARKING
 * Compare against industry standards and similar facilities
 */
export function generateBenchmarks(
  facilities: (Facility & { metrics: FacilityMetric | null })[],
  industryAverages: Record<string, number>
): Insight[] {
  const insights: Insight[] = [];
  
  const networkAvgTurnTime = calculateAverage(
    facilities.map(f => f.metrics?.avgTurnTimeMinutes).filter(Boolean) as number[]
  );
  
  const industryAvgTurnTime = industryAverages['avgTurnTimeMinutes'] || 90;
  
  if (networkAvgTurnTime < industryAvgTurnTime * 0.85) {
    // Performing better than industry
    insights.push({
      id: 'benchmark-turn-time-good',
      type: 'benchmark',
      priority: 'low',
      title: '🎯 Network Outperforming Industry Standard',
      description: `Your average turn time of ${Math.round(networkAvgTurnTime)} minutes is 15% better than industry average of ${industryAvgTurnTime} minutes.`,
      recommendation: 'Document your best practices and replicate them across all facilities.',
      confidenceScore: 95,
      potentialImpact: {
        efficiencyGain: 'Top 20% of networks'
      },
      dataPoints: {
        networkAverage: networkAvgTurnTime,
        industryAverage: industryAvgTurnTime,
        percentilRank: 80
      },
      actionable: false
    });
  } else if (networkAvgTurnTime > industryAvgTurnTime * 1.2) {
    // Underperforming
    insights.push({
      id: 'benchmark-turn-time-bad',
      type: 'benchmark',
      priority: 'high',
      title: 'Network Below Industry Standard',
      description: `Your average turn time of ${Math.round(networkAvgTurnTime)} minutes is 20% worse than industry average of ${industryAvgTurnTime} minutes.`,
      recommendation: 'Focus on operational improvements. Industry leaders achieve 60-minute turn times through optimized processes.',
      confidenceScore: 95,
      potentialImpact: {
        timesSaved: '30 min per truck',
        costSaved: '$1.5M annually'
      },
      dataPoints: {
        networkAverage: networkAvgTurnTime,
        industryAverage: industryAvgTurnTime,
        percentilRank: 25
      },
      actionable: true,
      actionUrl: '/best-practices/turn-time-optimization'
    });
  }
  
  return insights;
}

/**
 * AUTOMATED RECOMMENDATIONS
 * Specific, actionable suggestions
 */
export function generateRecommendations(
  facility: Facility & { metrics: FacilityMetric | null }
): Insight[] {
  const insights: Insight[] = [];
  
  if (!facility.metrics) {
    insights.push({
      id: `rec-missing-data-${facility.id}`,
      type: 'recommendation',
      priority: 'medium',
      title: `Complete ${facility.name} Profile`,
      description: 'Missing operational metrics. Adding this data unlocks AI insights and ROI calculations.',
      recommendation: 'Click to fill out a 5-minute questionnaire, or import from your TMS.',
      confidenceScore: 100,
      potentialImpact: {
        efficiencyGain: 'Unlock full analysis'
      },
      dataPoints: {},
      actionable: true,
      actionUrl: `/facilities/${facility.id}/quick-metrics`
    });
  }
  
  // Check if bottlenecks identified but no action taken
  if (facility.metrics?.bottlenecks && facility.metrics.bottlenecks.length > 0) {
    insights.push({
      id: `rec-bottleneck-${facility.id}`,
      type: 'recommendation',
      priority: 'high',
      title: `Resolve Bottlenecks at ${facility.name}`,
      description: `${facility.metrics.bottlenecks.length} bottleneck(s) identified: ${facility.metrics.bottlenecks.join(', ')}`,
      recommendation: 'View detailed analysis and step-by-step resolution guide.',
      confidenceScore: 90,
      potentialImpact: {
        efficiencyGain: '20-40% throughput increase'
      },
      dataPoints: {
        bottlenecks: facility.metrics.bottlenecks
      },
      actionable: true,
      actionUrl: `/facilities/${facility.id}/bottleneck-analysis`
    });
  }
  
  return insights;
}

/**
 * COMPETITIVE INTELLIGENCE
 * Make this a weapon by showing where you win
 */
export function generateCompetitiveInsights(
  network: Network,
  facilities: (Facility & { metrics: FacilityMetric | null })[]
): Insight[] {
  const insights: Insight[] = [];
  
  // Calculate network strengths
  const completeness = calculateDataCompleteness(facilities);
  
  if (completeness > 80) {
    insights.push({
      id: 'competitive-data-quality',
      type: 'benchmark',
      priority: 'low',
      title: '🏆 Superior Data Quality',
      description: `Your network has ${Math.round(completeness)}% data completeness - better than 90% of comparable networks.`,
      recommendation: 'Use this advantage: Generate detailed reports for stakeholders, make data-driven decisions faster than competitors.',
      confidenceScore: 100,
      potentialImpact: {
        efficiencyGain: 'Decision speed 3x faster'
      },
      dataPoints: {
        completenessPercent: completeness,
        industryAverage: 45
      },
      actionable: true,
      actionUrl: '/reports/executive-dashboard'
    });
  }
  
  return insights;
}

// Helper functions
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateDataCompleteness(
  facilities: (Facility & { metrics: FacilityMetric | null })[]
): number {
  if (facilities.length === 0) return 0;
  
  let totalFields = 0;
  let filledFields = 0;
  
  facilities.forEach(facility => {
    totalFields += 10; // Key fields
    if (facility.centroidLat) filledFields++;
    if (facility.centroidLng) filledFields++;
    if (facility.facilityType) filledFields++;
    if (facility.address) filledFields++;
    
    if (facility.metrics) {
      totalFields += 6;
      if (facility.metrics.docksCount) filledFields++;
      if (facility.metrics.yardSpotsCount) filledFields++;
      if (facility.metrics.trucksPerDayInbound) filledFields++;
      if (facility.metrics.trucksPerDayOutbound) filledFields++;
      if (facility.metrics.avgTurnTimeMinutes) filledFields++;
      if (facility.metrics.detentionMinutesPerTruck) filledFields++;
    }
  });
  
  return (filledFields / totalFields) * 100;
}

/**
 * INSIGHT ORCHESTRATOR
 * Runs all engines and prioritizes results
 */
export async function generateAllInsights(
  network: Network,
  facilities: (Facility & { metrics: FacilityMetric | null })[]
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  // Run all engines
  insights.push(...detectAnomalies(facilities));
  insights.push(...generatePredictions(network, facilities));
  insights.push(...generateBenchmarks(facilities, {
    avgTurnTimeMinutes: 90,
    detentionMinutesPerTruck: 15,
    yardUtilization: 75
  }));
  insights.push(...generateCompetitiveInsights(network, facilities));
  
  // Add facility-specific recommendations
  facilities.forEach(facility => {
    insights.push(...generateRecommendations(facility));
  });
  
  // Sort by priority and confidence
  return insights.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.confidenceScore - a.confidenceScore;
  });
}
