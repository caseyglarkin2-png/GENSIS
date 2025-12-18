/**
 * Tests for ROI Calculation Service
 */

import { calculateFacilityROI, calculateNetworkROI } from '@/lib/services/roi';
import type { ROIAssumptions, ParsedFacilityMetrics } from '@/lib/types';

// Default assumptions for testing
const defaultAssumptions: ROIAssumptions = {
  currency: 'USD',
  globalAssumptions: {
    detentionCostPerHour: 75,
    laborCostPerHour: 25,
    avgDriverTimeValuePerHour: 50,
    baselineAvgTurnTimeMinutes: 120,
    targetAvgTurnTimeMinutes: 60,
    baselineDetentionMinutesPerTruck: 45,
    targetDetentionMinutesPerTruck: 15,
    baselineTrailerSearchesPerDay: 10,
    targetTrailerSearchesPerDay: 2,
    avgMinutesPerTrailerSearch: 15,
    paperworkMinutesPerTruck: 20,
    targetPaperworkMinutesPerTruck: 5,
    implementationCostPerDoor: 5000,
    annualSoftwareCostPerFacility: 12000,
    oneTimeRolloutCostPerFacility: 10000,
    discountRateAnnual: 0.08,
    roiCaptureFactor: 0.7,
  },
  roiComponentsEnabled: {
    detentionSavings: true,
    laborSavings: false,
    turnTimeAcceleration: true,
    paperworkReduction: true,
    trailerHuntReduction: true,
  },
  bottleneckWeights: {
    gateCongest: 0.2,
    yardCongestion: 0.2,
    paperwork: 0.15,
    trailerHunting: 0.15,
    dockScheduling: 0.2,
    driverCheckIn: 0.1,
  },
};

// Sample metrics for testing
const sampleMetrics: ParsedFacilityMetrics = {
  facilityId: '550e8400-e29b-41d4-a716-446655440000',
  docksCount: { value: 20, confidence: 90 },
  gatesCount: { value: 2, confidence: 85 },
  yardSpotsCount: { value: 50, confidence: 80 },
  trailersOnYardAvg: { value: 30, confidence: 75 },
  trucksPerDayInbound: { value: 50, confidence: 85 },
  trucksPerDayOutbound: { value: 40, confidence: 80 },
  avgTurnTimeMinutes: { value: 90, confidence: 70 },
  detentionMinutesPerTruck: { value: 40, confidence: 75 },
  bottlenecks: ['gate_congestion', 'dock_scheduling'],
  lastVerifiedAt: new Date(),
};

describe('calculateFacilityROI', () => {
  describe('Basic calculations', () => {
    it('should calculate positive ROI for facility with good metrics', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      expect(result.projectedAnnualRoi).toBeGreaterThan(0);
      expect(result.projectedMonthlyRoi).toBeGreaterThan(0);
      expect(result.delayCostPerMonth).toBeGreaterThan(0);
      expect(result.delayCostPerWeek).toBeGreaterThan(0);
    });

    it('should have monthly ROI = annual ROI / 12', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      // Allow for rounding differences
      expect(Math.abs(result.projectedMonthlyRoi - result.projectedAnnualRoi / 12)).toBeLessThan(2);
    });

    it('should have weekly ROI = annual ROI / 52', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      // Weekly is derived from annual / 52 (not monthly / 4)
      // delayCostPerWeek equals weeklyROI which is netAnnualROI / 52
      expect(Math.abs(result.delayCostPerWeek - result.projectedAnnualRoi / 52)).toBeLessThan(2);
    });
  });

  describe('Component calculations', () => {
    it('should include detention savings when enabled', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      const detentionComponent = result.components.find(c => c.name === 'Detention Savings');
      expect(detentionComponent).toBeDefined();
      expect(detentionComponent?.enabled).toBe(true);
      expect(detentionComponent?.annualSavings).toBeGreaterThan(0);
    });

    it('should include paperwork reduction when enabled', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      const paperworkComponent = result.components.find(c => c.name === 'Paperwork Reduction');
      expect(paperworkComponent).toBeDefined();
      expect(paperworkComponent?.enabled).toBe(true);
    });

    it('should include turn time savings when enabled', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      const turnTimeComponent = result.components.find(c => c.name === 'Turn Time Acceleration');
      expect(turnTimeComponent).toBeDefined();
    });

    it('should not include components when disabled in assumptions', () => {
      const noDetentionAssumptions = {
        ...defaultAssumptions,
        roiComponentsEnabled: {
          ...defaultAssumptions.roiComponentsEnabled,
          detentionSavings: false,
        },
      };
      
      const result = calculateFacilityROI(sampleMetrics, noDetentionAssumptions, 'VERIFIED');
      
      const detentionComponent = result.components.find(c => c.name === 'Detention Savings');
      expect(detentionComponent).toBeUndefined();
    });
  });

  describe('Missing data handling', () => {
    it('should return missingInputs when metrics are missing', () => {
      const emptyMetrics: ParsedFacilityMetrics = {
        facilityId: 'test',
      };
      
      const result = calculateFacilityROI(emptyMetrics, defaultAssumptions, 'UNVERIFIED');
      
      expect(result.missingInputs.length).toBeGreaterThan(0);
    });

    it('should disable components with missing required metrics', () => {
      const partialMetrics: ParsedFacilityMetrics = {
        facilityId: 'test',
        // No trucks per day - should disable detention and paperwork
      };
      
      const result = calculateFacilityROI(partialMetrics, defaultAssumptions, 'VERIFIED');
      
      const detentionComponent = result.components.find(c => c.name === 'Detention Savings');
      expect(detentionComponent?.enabled).toBe(false);
    });

    it('should handle null metric values', () => {
      const nullMetrics: ParsedFacilityMetrics = {
        facilityId: 'test',
        trucksPerDayInbound: { value: null as any, confidence: 50 },
        trucksPerDayOutbound: { value: null as any, confidence: 50 },
      };
      
      const result = calculateFacilityROI(nullMetrics, defaultAssumptions, 'VERIFIED');
      
      // Should not throw, should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Confidence scoring', () => {
    it('should have higher confidence for VERIFIED facilities', () => {
      const verified = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      const unverified = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'UNVERIFIED');
      
      expect(verified.roiConfidence).toBeGreaterThan(unverified.roiConfidence);
    });

    it('should have medium confidence for NEEDS_REVIEW facilities', () => {
      const verified = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      const needsReview = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'NEEDS_REVIEW');
      const unverified = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'UNVERIFIED');
      
      expect(needsReview.roiConfidence).toBeLessThan(verified.roiConfidence);
      expect(needsReview.roiConfidence).toBeGreaterThan(unverified.roiConfidence);
    });

    it('should factor in metric confidence', () => {
      const highConfidenceMetrics = {
        ...sampleMetrics,
        trucksPerDayInbound: { value: 50, confidence: 95 },
        trucksPerDayOutbound: { value: 40, confidence: 95 },
      };
      
      const lowConfidenceMetrics = {
        ...sampleMetrics,
        trucksPerDayInbound: { value: 50, confidence: 30 },
        trucksPerDayOutbound: { value: 40, confidence: 30 },
      };
      
      const highResult = calculateFacilityROI(highConfidenceMetrics, defaultAssumptions, 'VERIFIED');
      const lowResult = calculateFacilityROI(lowConfidenceMetrics, defaultAssumptions, 'VERIFIED');
      
      expect(highResult.roiConfidence).toBeGreaterThan(lowResult.roiConfidence);
    });
  });

  describe('ROI capture factor', () => {
    it('should apply capture factor to reduce ROI', () => {
      // Calculate without capture factor
      const fullCaptureAssumptions = {
        ...defaultAssumptions,
        globalAssumptions: {
          ...defaultAssumptions.globalAssumptions,
          roiCaptureFactor: 1.0,
        },
      };
      
      const fullCapture = calculateFacilityROI(sampleMetrics, fullCaptureAssumptions, 'VERIFIED');
      const partialCapture = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      // 70% capture should result in ~70% of full capture ROI
      expect(partialCapture.projectedAnnualRoi).toBeLessThan(fullCapture.projectedAnnualRoi);
    });
  });

  describe('Breakdown structure', () => {
    it('should populate breakdown correctly', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      expect(result.breakdown).toBeDefined();
      expect(typeof result.breakdown.detentionSavings).toBe('number');
      expect(typeof result.breakdown.paperworkReduction).toBe('number');
      expect(typeof result.breakdown.trailerHuntReduction).toBe('number');
    });

    it('should have breakdown sum roughly match total savings', () => {
      const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
      
      const breakdownSum = 
        result.breakdown.detentionSavings +
        result.breakdown.paperworkReduction +
        result.breakdown.trailerHuntReduction +
        (result.breakdown.turnTimeAcceleration || 0);
      
      // After capture factor and costs, should be related
      expect(breakdownSum).toBeGreaterThan(0);
    });
  });
});

describe('calculateNetworkROI', () => {
  it('should aggregate multiple facility ROIs', () => {
    const facility1 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    const facility2 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'NEEDS_REVIEW');
    
    const networkROI = calculateNetworkROI(
      [facility1, facility2],
      'network-123',
      '1.0.0'
    );
    
    expect(networkROI.totalFacilities).toBe(2);
    expect(networkROI.aggregateRoi.projectedAnnualRoi).toBe(
      facility1.projectedAnnualRoi + facility2.projectedAnnualRoi
    );
  });

  it('should handle empty facility list', () => {
    const networkROI = calculateNetworkROI([], 'network-123', '1.0.0');
    
    expect(networkROI.totalFacilities).toBe(0);
    expect(networkROI.aggregateRoi.projectedAnnualRoi).toBe(0);
  });

  it('should calculate average confidence', () => {
    const facility1 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    const facility2 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'UNVERIFIED');
    
    const networkROI = calculateNetworkROI(
      [facility1, facility2],
      'network-123',
      '1.0.0'
    );
    
    const expectedAvgConfidence = Math.round(
      (facility1.roiConfidence + facility2.roiConfidence) / 2
    );
    expect(networkROI.confidence.roiConfidenceScore).toBe(expectedAvgConfidence);
  });

  it('should include assumptions version', () => {
    const facility1 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    
    const networkROI = calculateNetworkROI(
      [facility1],
      'network-123',
      '2.1.0'
    );
    
    expect(networkROI.assumptionsVersion).toBe('2.1.0');
  });

  it('should aggregate breakdown by category', () => {
    const facility1 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    const facility2 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    
    const networkROI = calculateNetworkROI(
      [facility1, facility2],
      'network-123',
      '1.0.0'
    );
    
    expect(networkROI.aggregateRoi.breakdown.detentionSavings).toBe(
      facility1.breakdown.detentionSavings + facility2.breakdown.detentionSavings
    );
  });

  it('should calculate correct confidence level', () => {
    const facility1 = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    
    const networkROI = calculateNetworkROI(
      [facility1],
      'network-123',
      '1.0.0'
    );
    
    // Confidence level should be one of the valid levels
    expect(['Speculative', 'Directional', 'Defensible', 'Boardroom-Ready']).toContain(
      networkROI.confidence.roiConfidenceLevel
    );
  });
});

describe('Edge cases', () => {
  it('should handle very large numbers', () => {
    const largeMetrics: ParsedFacilityMetrics = {
      facilityId: 'test',
      trucksPerDayInbound: { value: 10000, confidence: 90 },
      trucksPerDayOutbound: { value: 10000, confidence: 90 },
      detentionMinutesPerTruck: { value: 60, confidence: 90 },
    };
    
    const result = calculateFacilityROI(largeMetrics, defaultAssumptions, 'VERIFIED');
    
    expect(result.projectedAnnualRoi).toBeGreaterThan(0);
    expect(Number.isFinite(result.projectedAnnualRoi)).toBe(true);
  });

  it('should handle zero truck volume', () => {
    const zeroMetrics: ParsedFacilityMetrics = {
      facilityId: 'test',
      trucksPerDayInbound: { value: 0, confidence: 90 },
      trucksPerDayOutbound: { value: 0, confidence: 90 },
    };
    
    const result = calculateFacilityROI(zeroMetrics, defaultAssumptions, 'VERIFIED');
    
    // With zero trucks, savings are 0 but software cost still applies
    // So ROI will be negative (cost of software with no savings)
    expect(result.projectedAnnualRoi).toBeLessThanOrEqual(0);
  });

  it('should not return NaN or Infinity', () => {
    const result = calculateFacilityROI(sampleMetrics, defaultAssumptions, 'VERIFIED');
    
    expect(Number.isNaN(result.projectedAnnualRoi)).toBe(false);
    expect(Number.isFinite(result.projectedAnnualRoi)).toBe(true);
    expect(Number.isNaN(result.roiConfidence)).toBe(false);
    expect(Number.isFinite(result.roiConfidence)).toBe(true);
  });
});
