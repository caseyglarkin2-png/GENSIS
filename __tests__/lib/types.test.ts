/**
 * Tests for types validation and type utilities
 */

import type {
  Network,
  Facility,
  VerificationStatus,
  CustomerType,
  FacilityMetrics,
  ROIAssumptions,
  ParsedFacilityMetrics,
  FacilityROI,
  NetworkROI,
  ConfidenceLevel,
  CompletenessLevel,
} from '@/lib/types';

describe('Type Structures', () => {
  describe('Network type', () => {
    it('should allow valid network object', () => {
      const network: Partial<Network> = {
        id: 'network-1',
        name: 'Test Network',
        customerType: 'shipper',
      };

      expect(network.name).toBe('Test Network');
    });

    it('should support all customer types', () => {
      const types: CustomerType[] = ['shipper', 'carrier', '3pl', 'warehouse_network'];
      expect(types).toHaveLength(4);
    });
  });

  describe('Facility type', () => {
    it('should allow valid facility object', () => {
      const facility: Partial<Facility> = {
        id: 'facility-1',
        name: 'Test Facility',
        networkId: 'network-1',
        verificationStatus: 'VERIFIED',
      };

      expect(facility.verificationStatus).toBe('VERIFIED');
    });

    it('should support all verification statuses', () => {
      const statuses: VerificationStatus[] = ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('FacilityMetrics type', () => {
    it('should allow valid metrics object', () => {
      const metrics: Partial<FacilityMetrics> = {
        facilityId: 'facility-1',
        docksCount: 25,
        docksCountConfidence: 90,
        docksCountSource: 'manual',
        trucksPerDayInbound: 100,
        trucksPerDayInboundConfidence: 80,
        trucksPerDayInboundSource: 'integration',
      };

      expect(metrics.docksCount).toBe(25);
      expect(metrics.trucksPerDayInbound).toBe(100);
    });

    it('should support bottlenecks array', () => {
      const metrics: Partial<FacilityMetrics> = {
        facilityId: 'facility-1',
        bottlenecks: ['gate_congestion', 'dock_scheduling'],
        bottlenecksConfidence: 85,
        bottlenecksSource: 'manual',
      };

      expect(metrics.bottlenecks).toHaveLength(2);
    });
  });

  describe('ParsedFacilityMetrics type', () => {
    it('should allow structured metric values', () => {
      const metrics: ParsedFacilityMetrics = {
        facilityId: 'facility-1',
        docksCount: { value: 25, confidence: 90 },
        trucksPerDayInbound: { value: 100, confidence: 80 },
      };

      expect(metrics.docksCount?.value).toBe(25);
      expect(metrics.trucksPerDayInbound?.confidence).toBe(80);
    });

    it('should allow all metric fields to be optional', () => {
      const metrics: ParsedFacilityMetrics = {
        facilityId: 'facility-1',
      };

      expect(metrics.facilityId).toBe('facility-1');
      expect(metrics.docksCount).toBeUndefined();
    });
  });

  describe('FacilityROI type', () => {
    it('should contain all ROI components', () => {
      const roi: FacilityROI = {
        projectedAnnualRoi: 120000,
        projectedMonthlyRoi: 10000,
        delayCostPerMonth: 10000,
        delayCostPerWeek: 2307,
        breakdown: {
          detentionSavings: 50000,
          paperworkReduction: 20000,
          trailerHuntReduction: 30000,
          laborSavings: 10000,
          turnTimeAcceleration: 10000,
        },
        paybackPeriodMonths: 6,
      };

      expect(roi.projectedAnnualRoi).toBe(120000);
      expect(roi.breakdown.detentionSavings).toBe(50000);
    });
  });

  describe('NetworkROI type', () => {
    it('should aggregate facility ROIs', () => {
      const roi: NetworkROI = {
        networkId: 'network-1',
        totalAnnualRoi: 500000,
        totalMonthlyRoi: 41666,
        facilitiesAnalyzed: 5,
        facilitiesWithData: 4,
        averagePerFacilityRoi: 125000,
        aggregatedBreakdown: {
          detentionSavings: 200000,
          paperworkReduction: 100000,
          trailerHuntReduction: 150000,
          laborSavings: 30000,
          turnTimeAcceleration: 20000,
        },
      };

      expect(roi.facilitiesAnalyzed).toBe(5);
      expect(roi.averagePerFacilityRoi).toBe(125000);
    });
  });

  describe('ROIAssumptions type', () => {
    it('should contain global assumptions', () => {
      const assumptions: Partial<ROIAssumptions> = {
        version: '1.0',
        effectiveDate: '2024-01-01',
        globalAssumptions: {
          currency: 'USD',
          detentionCostPerHour: 100,
          laborCostPerHour: 35,
          avgDriverTimeValuePerHour: 75,
          baselineAvgTurnTimeMinutes: 90,
          targetAvgTurnTimeMinutes: 60,
          baselineDetentionMinutesPerTruck: 45,
          targetDetentionMinutesPerTruck: 15,
          baselineTrailerSearchesPerDay: 10,
          targetTrailerSearchesPerDay: 2,
          avgMinutesPerTrailerSearch: 15,
          paperworkMinutesPerTruck: 20,
          targetPaperworkMinutesPerTruck: 5,
          implementationCostPerDoor: 500,
          annualSoftwareCostPerFacility: 2900,
          oneTimeRolloutCostPerFacility: 1000,
          discountRateAnnual: 0.1,
          roiCaptureFactor: 0.65,
        },
        roiComponentsEnabled: {
          detentionSavings: true,
          laborSavings: true,
          turnTimeAcceleration: true,
          paperworkReduction: true,
          trailerHuntReduction: true,
        },
        bottleneckWeights: {
          gateCongest: 1.0,
          yardCongestion: 0.8,
          paperwork: 0.6,
          trailerHunting: 0.9,
          dockScheduling: 0.7,
          driverCheckIn: 0.5,
        },
      };

      expect(assumptions.globalAssumptions?.detentionCostPerHour).toBe(100);
      expect(assumptions.roiComponentsEnabled?.detentionSavings).toBe(true);
    });
  });

  describe('Confidence and Completeness Levels', () => {
    it('should support confidence levels', () => {
      const levels: ConfidenceLevel[] = ['low', 'medium', 'high', 'verified'];
      expect(levels).toHaveLength(4);
    });

    it('should support completeness levels', () => {
      const levels: CompletenessLevel[] = ['minimal', 'partial', 'substantial', 'complete'];
      expect(levels).toHaveLength(4);
    });
  });
});

describe('Type Guard Patterns', () => {
  it('should validate network has required fields', () => {
    const isValidNetwork = (obj: any): obj is Partial<Network> => {
      return typeof obj === 'object' && 
             obj !== null &&
             typeof obj.name === 'string';
    };

    expect(isValidNetwork({ name: 'Test' })).toBe(true);
    expect(isValidNetwork({ id: '1' })).toBe(false);
    expect(isValidNetwork(null)).toBe(false);
  });

  it('should validate facility has required fields', () => {
    const isValidFacility = (obj: any): obj is Partial<Facility> => {
      return typeof obj === 'object' && 
             obj !== null &&
             typeof obj.name === 'string' &&
             typeof obj.networkId === 'string';
    };

    expect(isValidFacility({ name: 'Test', networkId: '1' })).toBe(true);
    expect(isValidFacility({ name: 'Test' })).toBe(false);
    expect(isValidFacility(null)).toBe(false);
  });

  it('should validate verification status', () => {
    const isValidStatus = (status: string): status is VerificationStatus => {
      return ['UNVERIFIED', 'NEEDS_REVIEW', 'VERIFIED'].includes(status);
    };

    expect(isValidStatus('VERIFIED')).toBe(true);
    expect(isValidStatus('PENDING')).toBe(false);
    expect(isValidStatus('verified')).toBe(false);
  });

  it('should validate customer type', () => {
    const isValidCustomerType = (type: string): type is CustomerType => {
      return ['shipper', 'carrier', '3pl', 'warehouse_network'].includes(type);
    };

    expect(isValidCustomerType('shipper')).toBe(true);
    expect(isValidCustomerType('broker')).toBe(false);
  });
});

describe('Type Compatibility', () => {
  it('should allow ROI breakdown fields to be zero', () => {
    const roi: FacilityROI = {
      projectedAnnualRoi: 0,
      projectedMonthlyRoi: 0,
      delayCostPerMonth: 0,
      delayCostPerWeek: 0,
      breakdown: {
        detentionSavings: 0,
        paperworkReduction: 0,
        trailerHuntReduction: 0,
        laborSavings: 0,
        turnTimeAcceleration: 0,
      },
      paybackPeriodMonths: 0,
    };

    expect(roi.projectedAnnualRoi).toBe(0);
    expect(roi.breakdown.detentionSavings).toBe(0);
  });

  it('should allow negative ROI values', () => {
    const roi: FacilityROI = {
      projectedAnnualRoi: -5000,
      projectedMonthlyRoi: -416,
      delayCostPerMonth: -416,
      delayCostPerWeek: -96,
      breakdown: {
        detentionSavings: 0,
        paperworkReduction: 0,
        trailerHuntReduction: 0,
        laborSavings: 0,
        turnTimeAcceleration: 0,
      },
      paybackPeriodMonths: 0,
    };

    expect(roi.projectedAnnualRoi).toBeLessThan(0);
  });

  it('should allow metrics without confidence values', () => {
    const metrics: ParsedFacilityMetrics = {
      facilityId: 'facility-1',
      docksCount: { value: 25 },
    };

    expect(metrics.docksCount?.confidence).toBeUndefined();
  });
});
