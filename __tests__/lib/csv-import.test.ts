/**
 * Tests for CSV import utilities
 */

import {
  csvFacilityRowSchema,
} from '@/lib/validation';

describe('CSV Import Validation', () => {
  describe('csvFacilityRowSchema', () => {
    it('should validate complete row', () => {
      const row = {
        name: 'Test Facility',
        facility_code: 'TF001',
        facility_type: 'dc',
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
        country: 'USA',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const row = {
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should require address_line1', () => {
      const row = {
        name: 'Test Facility',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should require city', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should require state', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should require zip', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should allow optional facility_code', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      expect(result.data?.facility_code).toBeUndefined();
    });

    it('should allow optional facility_type', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      expect(result.data?.facility_type).toBeUndefined();
    });

    it('should allow optional address_line2', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      expect(result.data?.address_line2).toBeUndefined();
    });

    it('should allow optional country', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
      expect(result.data?.country).toBeUndefined();
    });
  });

  describe('CSV Edge Cases', () => {
    it('should handle names with special characters', () => {
      const row = {
        name: "O'Connor & Sons, LLC #5",
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should handle international zip codes', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Toronto',
        state: 'ON',
        zip: 'M5V 1A1',
        country: 'Canada',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should handle PO Box addresses', () => {
      const row = {
        name: 'Test Facility',
        address_line1: 'PO Box 12345',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should handle long facility names', () => {
      const row = {
        name: 'A'.repeat(200), // Long name
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001',
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should handle numeric strings in zip', () => {
      const row = {
        name: 'Test Facility',
        address_line1: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75001-1234', // ZIP+4
      };

      const result = csvFacilityRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });
  });
});
