/**
 * Prisma Client Singleton
 * Prevents multiple instances in development (hot reload)
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Raw SQL query helper for PostGIS geometry operations
 */
export async function queryGeometry<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}

/**
 * Execute raw SQL (for mutations with PostGIS)
 */
export async function executeGeometry(
  sql: string,
  params: any[] = []
): Promise<number> {
  const result = await prisma.$executeRawUnsafe(sql, ...params);
  return result;
}
