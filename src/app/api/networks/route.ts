/**
 * GET /api/networks
 * 
 * List all networks with basic stats
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const networks = await prisma.network.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            facilities: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add verified count for each network
    const networksWithStats = await Promise.all(
      networks.map(async (network) => {
        const verifiedCount = await prisma.facility.count({
          where: {
            networkId: network.id,
            deletedAt: null,
            verificationStatus: 'VERIFIED',
          },
        });

        return {
          id: network.id,
          name: network.name,
          description: network.description,
          createdAt: network.createdAt,
          updatedAt: network.updatedAt,
          facilityCount: network._count.facilities,
          verifiedCount,
        };
      })
    );

    return NextResponse.json({
      networks: networksWithStats,
      total: networksWithStats.length,
    });
  } catch (error) {
    console.error('Failed to fetch networks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch networks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/networks
 * 
 * Create a new network
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Network name is required' },
        { status: 400 }
      );
    }

    const network = await prisma.network.create({
      data: {
        name,
        description,
        organizationId: '00000000-0000-0000-0000-000000000010', // TODO: Get from auth session
        createdBy: '00000000-0000-0000-0000-000000000001', // TODO: Get from auth session
      },
    });

    // TODO: Get userId from auth session
    // await logNetworkCreated(network.id, userId, { name, description });

    return NextResponse.json({
      network: {
        id: network.id,
        name: network.name,
        description: network.description,
        createdAt: network.createdAt,
        updatedAt: network.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create network:', error);
    return NextResponse.json(
      { error: 'Failed to create network' },
      { status: 500 }
    );
  }
}
