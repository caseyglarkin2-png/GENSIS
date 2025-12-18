/**
 * Audit Logging Service
 * 
 * Records all mutations to facilities, geometry, and metrics for compliance and debugging.
 */

import { prisma } from '../db';

export type AuditAction = 
  | 'facility_created'
  | 'facility_updated'
  | 'facility_deleted'
  | 'geometry_verified'
  | 'geometry_updated'
  | 'metrics_updated'
  | 'network_created'
  | 'network_updated'
  | 'network_deleted'
  | 'csv_imported'
  | 'pdf_generated';

export interface AuditLogEntry {
  action: AuditAction;
  entityType: 'network' | 'facility' | 'metric' | 'geometry';
  entityId: string;
  userId?: string;
  changes?: Record<string, any>; // JSON diff of before/after
  metadata?: Record<string, any>; // Additional context
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
        changes: entry.changes || {},
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Log but don't throw - audit failures shouldn't break operations
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit trail for a specific entity
 */
export async function getAuditTrail(
  entityType: 'network' | 'facility' | 'metric' | 'geometry',
  entityId: string,
  options: {
    limit?: number;
    offset?: number;
    actions?: AuditAction[];
  } = {}
) {
  const where: any = {
    entityType: entityType,
    entityId: entityId,
  };

  if (options.actions && options.actions.length > 0) {
    where.action = { in: options.actions };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: options.limit || 50,
    skip: options.offset || 0,
  });

  return logs;
}

/**
 * Get recent activity across all entities (for admin dashboard)
 */
export async function getRecentActivity(
  options: {
    limit?: number;
    userId?: string;
    actions?: AuditAction[];
  } = {}
) {
  const where: any = {};

  if (options.userId) {
    where.userId = options.userId;
  }

  if (options.actions && options.actions.length > 0) {
    where.action = { in: options.actions };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: options.limit || 100,
  });

  return logs;
}

/**
 * Helper: Log facility creation
 */
export async function logFacilityCreated(
  facilityId: string,
  userId: string | undefined,
  data: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action: 'facility_created',
    entityType: 'facility',
    entityId: facilityId,
    userId,
    changes: { after: data },
    metadata,
  });
}

/**
 * Helper: Log facility update
 */
export async function logFacilityUpdated(
  facilityId: string,
  userId: string | undefined,
  before: Record<string, any>,
  after: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  // Calculate diff
  const changes: Record<string, any> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }

  await createAuditLog({
    action: 'facility_updated',
    entityType: 'facility',
    entityId: facilityId,
    userId,
    changes,
    metadata,
  });
}

/**
 * Helper: Log geometry verification
 */
export async function logGeometryVerified(
  facilityId: string,
  userId: string | undefined,
  centroid: [number, number],
  hasPolygon: boolean,
  confidence: number,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action: 'geometry_verified',
    entityType: 'geometry',
    entityId: facilityId,
    userId,
    changes: {
      centroid,
      hasPolygon,
      confidence,
    },
    metadata,
  });
}

/**
 * Helper: Log metrics update
 */
export async function logMetricsUpdated(
  facilityId: string,
  userId: string | undefined,
  updatedMetrics: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action: 'metrics_updated',
    entityType: 'metric',
    entityId: facilityId,
    userId,
    changes: updatedMetrics,
    metadata,
  });
}

/**
 * Helper: Log CSV import
 */
export async function logCSVImport(
  networkId: string,
  userId: string | undefined,
  facilitiesCreated: number,
  errors: number,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action: 'csv_imported',
    entityType: 'network',
    entityId: networkId,
    userId,
    metadata: {
      ...metadata,
      facilitiesCreated,
      errors,
    },
  });
}

/**
 * Helper: Log PDF generation
 */
export async function logPDFGenerated(
  entityType: 'network' | 'facility',
  entityId: string,
  userId: string | undefined,
  reportType: string,
  metadata?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    action: 'pdf_generated',
    entityType,
    entityId,
    userId,
    metadata: {
      ...metadata,
      reportType,
    },
  });
}
