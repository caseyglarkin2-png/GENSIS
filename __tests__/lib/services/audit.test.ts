/**
 * Tests for Audit Service
 */

import { createAuditLog, getAuditTrail, getRecentActivity, type AuditLogEntry, type AuditAction } from '@/lib/services/audit';

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

const mockCreate = prisma.auditLog.create as jest.Mock;
const mockFindMany = prisma.auditLog.findMany as jest.Mock;

describe('createAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create audit log with required fields', async () => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const entry: AuditLogEntry = {
      action: 'facility_created',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'facility_created',
        entityType: 'facility',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    });
  });

  it('should include userId when provided', async () => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const entry: AuditLogEntry = {
      action: 'facility_updated',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
      }),
    });
  });

  it('should include changes when provided', async () => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const changes = {
      name: { old: 'Old Name', new: 'New Name' },
    };
    
    const entry: AuditLogEntry = {
      action: 'facility_updated',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      changes,
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        changes,
      }),
    });
  });

  it('should include metadata when provided', async () => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const metadata = {
      source: 'csv_import',
      batchId: 'batch-123',
    };
    
    const entry: AuditLogEntry = {
      action: 'csv_imported',
      entityType: 'network',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      metadata,
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata,
      }),
    });
  });

  it('should include IP address and user agent', async () => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const entry: AuditLogEntry = {
      action: 'facility_created',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }),
    });
  });

  it('should not throw on database error (silent failure)', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'));
    
    const entry: AuditLogEntry = {
      action: 'facility_created',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
    };
    
    // Should not throw
    await expect(createAuditLog(entry)).resolves.not.toThrow();
  });

  it('should log error on database failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockCreate.mockRejectedValueOnce(new Error('DB error'));
    
    const entry: AuditLogEntry = {
      action: 'facility_created',
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
    };
    
    await createAuditLog(entry);
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('getAuditTrail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch audit logs for entity', async () => {
    const mockLogs = [
      { id: '1', action: 'facility_created', entityType: 'facility', entityId: 'fac-1' },
      { id: '2', action: 'facility_updated', entityType: 'facility', entityId: 'fac-1' },
    ];
    mockFindMany.mockResolvedValueOnce(mockLogs);
    
    const result = await getAuditTrail('facility', 'fac-1');
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        entityType: 'facility',
        entityId: 'fac-1',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
    });
    expect(result).toEqual(mockLogs);
  });

  it('should apply pagination', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getAuditTrail('facility', 'fac-1', { limit: 10, offset: 20 });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 20,
    });
  });

  it('should filter by action types', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getAuditTrail('facility', 'fac-1', {
      actions: ['facility_created', 'facility_updated'],
    });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        entityType: 'facility',
        entityId: 'fac-1',
        action: { in: ['facility_created', 'facility_updated'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
    });
  });
});

describe('getRecentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch recent activity with default limit', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getRecentActivity();
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('should filter by userId', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getRecentActivity({ userId: 'user-123' });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('should filter by action types', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getRecentActivity({ actions: ['pdf_generated', 'csv_imported'] });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { action: { in: ['pdf_generated', 'csv_imported'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('should apply custom limit', async () => {
    mockFindMany.mockResolvedValueOnce([]);
    
    await getRecentActivity({ limit: 25 });
    
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  });
});

describe('Audit action types', () => {
  const validActions: AuditAction[] = [
    'facility_created',
    'facility_updated',
    'facility_deleted',
    'geometry_verified',
    'geometry_updated',
    'metrics_updated',
    'network_created',
    'network_updated',
    'network_deleted',
    'csv_imported',
    'pdf_generated',
  ];

  it.each(validActions)('should accept action type: %s', async (action) => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const entry: AuditLogEntry = {
      action,
      entityType: 'facility',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action }),
    });
  });
});

describe('Entity types', () => {
  const validEntityTypes = ['network', 'facility', 'metric', 'geometry'] as const;

  it.each(validEntityTypes)('should accept entity type: %s', async (entityType) => {
    mockCreate.mockResolvedValueOnce({ id: '123' });
    
    const entry: AuditLogEntry = {
      action: 'facility_created',
      entityType,
      entityId: '550e8400-e29b-41d4-a716-446655440000',
    };
    
    await createAuditLog(entry);
    
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityType }),
    });
  });
});
