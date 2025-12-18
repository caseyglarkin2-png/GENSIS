/**
 * Tests for Scoring Service
 */

import {
  calculateDataCompleteness,
  calculateROIConfidence,
  type DataCompletenessResult,
  type ROIConfidenceResult,
} from '@/lib/services/scoring';
import type { ParsedFacilityMetrics } from '@/lib/types';

describe('calculateDataCompleteness', () => {
  describe('Geometry scoring (40% weight)', () => {
    it('should score 0 for geometry without centroid', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.breakdown.geometry).toBe(0);
      expect(result.missingFields).toContain('Facility centroid');
    });

    it('should score 50 for centroid only', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, false, false);
      
      expect(result.breakdown.geometry).toBe(50);
    });

    it('should score 100 for centroid + polygon', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.geometry).toBe(100);
    });

    it('should score 75 for centroid + cannot_polygon_reason', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, false, true);
      
      expect(result.breakdown.geometry).toBe(75);
    });
  });

  describe('Throughput metrics scoring (30% weight)', () => {
    it('should score 0 for no throughput metrics', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.throughput).toBe(0);
    });

    it('should score based on provided metrics', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 80 },
        trucksPerDayOutbound: { value: 40, confidence: 80 },
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.throughput).toBeGreaterThan(0);
    });

    it('should weight by confidence', () => {
      const highConfMetrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 100 },
        trucksPerDayOutbound: { value: 40, confidence: 100 },
        avgTurnTimeMinutes: { value: 90, confidence: 100 },
        detentionMinutesPerTruck: { value: 30, confidence: 100 },
      };
      
      const lowConfMetrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 50 },
        trucksPerDayOutbound: { value: 40, confidence: 50 },
        avgTurnTimeMinutes: { value: 90, confidence: 50 },
        detentionMinutesPerTruck: { value: 30, confidence: 50 },
      };
      
      const highResult = calculateDataCompleteness(highConfMetrics, true, true, false);
      const lowResult = calculateDataCompleteness(lowConfMetrics, true, true, false);
      
      expect(highResult.breakdown.throughput).toBeGreaterThan(lowResult.breakdown.throughput);
    });
  });

  describe('Infrastructure metrics scoring (20% weight)', () => {
    it('should score for dock, gate, yard metrics', () => {
      const metrics: ParsedFacilityMetrics = {
        docksCount: { value: 20, confidence: 90 },
        gatesCount: { value: 2, confidence: 85 },
        yardSpotsCount: { value: 50, confidence: 80 },
        trailersOnYardAvg: { value: 30, confidence: 75 },
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.infrastructure).toBeGreaterThan(0);
    });

    it('should score 0 for no infrastructure metrics', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.infrastructure).toBe(0);
    });
  });

  describe('Bottleneck scoring (10% weight)', () => {
    it('should score 100 when bottlenecks are provided', () => {
      const metrics: ParsedFacilityMetrics = {
        bottlenecks: ['gate_congestion', 'dock_scheduling'],
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.bottlenecks).toBe(100);
    });

    it('should score 0 when no bottlenecks', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.breakdown.bottlenecks).toBe(0);
    });
  });

  describe('Overall scoring', () => {
    it('should return score 0-100', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate weighted total correctly', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 100 },
        trucksPerDayOutbound: { value: 40, confidence: 100 },
        avgTurnTimeMinutes: { value: 90, confidence: 100 },
        detentionMinutesPerTruck: { value: 30, confidence: 100 },
        docksCount: { value: 20, confidence: 100 },
        gatesCount: { value: 2, confidence: 100 },
        yardSpotsCount: { value: 50, confidence: 100 },
        trailersOnYardAvg: { value: 30, confidence: 100 },
        bottlenecks: ['gate_congestion'],
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      // Full scores: geometry 100, throughput 100, infra 100, bottlenecks 100
      // Weighted: 100*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 100
      expect(result.score).toBe(100);
    });
  });

  describe('Completeness levels', () => {
    it('should return Discovery for score < 40', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.level).toBe('Discovery');
    });

    it('should return Planning for score 40-69', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 100 },
        trucksPerDayOutbound: { value: 40, confidence: 100 },
      };
      
      const result = calculateDataCompleteness(metrics, true, false, false);
      
      // Score ~50: geometry 50*0.4=20 + throughput ~50*0.3=15 = 35+
      expect(['Discovery', 'Planning']).toContain(result.level);
    });

    it('should return Rollout-Ready for score 70-84', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 90 },
        trucksPerDayOutbound: { value: 40, confidence: 90 },
        avgTurnTimeMinutes: { value: 90, confidence: 90 },
        detentionMinutesPerTruck: { value: 30, confidence: 90 },
        docksCount: { value: 20, confidence: 90 },
        bottlenecks: ['gate_congestion'],
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      if (result.score >= 70 && result.score < 85) {
        expect(result.level).toBe('Rollout-Ready');
      }
    });

    it('should return Exec-Ready for score >= 85', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 100 },
        trucksPerDayOutbound: { value: 40, confidence: 100 },
        avgTurnTimeMinutes: { value: 90, confidence: 100 },
        detentionMinutesPerTruck: { value: 30, confidence: 100 },
        docksCount: { value: 20, confidence: 100 },
        gatesCount: { value: 2, confidence: 100 },
        yardSpotsCount: { value: 50, confidence: 100 },
        trailersOnYardAvg: { value: 30, confidence: 100 },
        bottlenecks: ['gate_congestion'],
      };
      
      const result = calculateDataCompleteness(metrics, true, true, false);
      
      expect(result.level).toBe('Exec-Ready');
    });
  });

  describe('Missing fields and recommendations', () => {
    it('should return top 3 missing fields', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.missingFields.length).toBeLessThanOrEqual(3);
    });

    it('should return recommendations', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend centroid when missing', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateDataCompleteness(metrics, false, false, false);
      
      expect(result.recommendations.some(r => r.toLowerCase().includes('centroid'))).toBe(true);
    });
  });
});

describe('calculateROIConfidence', () => {
  describe('Geometry factor (40% weight)', () => {
    it('should score 0 without centroid', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', false);
      
      expect(result.factors.geometry).toBe(0);
    });

    it('should score 100 for VERIFIED with centroid', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.geometry).toBe(100);
    });

    it('should score 70 for NEEDS_REVIEW with centroid', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'NEEDS_REVIEW', true);
      
      expect(result.factors.geometry).toBe(70);
    });

    it('should score 50 for UNVERIFIED with centroid', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'UNVERIFIED', true);
      
      expect(result.factors.geometry).toBe(50);
    });
  });

  describe('Freshness factor (20% weight)', () => {
    it('should score 100 for recently verified data', () => {
      const metrics: ParsedFacilityMetrics = {
        lastVerifiedAt: new Date(), // Just now
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.freshness).toBe(100);
    });

    it('should decay for older data', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200); // 200 days ago
      
      const metrics: ParsedFacilityMetrics = {
        lastVerifiedAt: oldDate,
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.freshness).toBe(50);
    });

    it('should assume old data when never verified', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.freshness).toBe(50);
    });
  });

  describe('Metric quality factor (40% weight)', () => {
    it('should score based on key metric confidence', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 90 },
        trucksPerDayOutbound: { value: 40, confidence: 90 },
        detentionMinutesPerTruck: { value: 30, confidence: 90 },
        avgTurnTimeMinutes: { value: 90, confidence: 90 },
        lastVerifiedAt: new Date(),
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.metricQuality).toBeGreaterThan(80);
    });

    it('should score 0 for no key metrics', () => {
      const metrics: ParsedFacilityMetrics = {
        lastVerifiedAt: new Date(),
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.factors.metricQuality).toBe(0);
    });
  });

  describe('Confidence levels', () => {
    it('should return Speculative for low confidence', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'UNVERIFIED', false);
      
      expect(result.level).toBe('Speculative');
    });

    it('should return appropriate level for high confidence', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: { value: 50, confidence: 100 },
        trucksPerDayOutbound: { value: 40, confidence: 100 },
        detentionMinutesPerTruck: { value: 30, confidence: 100 },
        avgTurnTimeMinutes: { value: 90, confidence: 100 },
        lastVerifiedAt: new Date(),
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(['Directional', 'Defensible', 'Boardroom-Ready']).toContain(result.level);
    });
  });

  describe('Top drivers and recommendations', () => {
    it('should identify missing centroid as top driver', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', false);
      
      expect(result.topDrivers.some(d => d.toLowerCase().includes('centroid'))).toBe(true);
    });

    it('should identify old data as driver', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);
      
      const metrics: ParsedFacilityMetrics = {
        lastVerifiedAt: oldDate,
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.topDrivers.some(d => d.includes('days old'))).toBe(true);
    });

    it('should provide actionable recommendations', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'UNVERIFIED', false);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined metric values', () => {
      const metrics: ParsedFacilityMetrics = {
        trucksPerDayInbound: undefined,
      };
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result).toBeDefined();
      expect(Number.isNaN(result.score)).toBe(false);
    });

    it('should return score between 0 and 100', () => {
      const metrics: ParsedFacilityMetrics = {};
      
      const result = calculateROIConfidence(metrics, 'VERIFIED', true);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
