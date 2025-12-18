/**
 * GET /api/networks/[id]
 * PATCH /api/networks/[id]
 * DELETE /api/networks/[id]
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = {
  params: {
    id: string;
  };
};

/**
 * GET /api/networks/[id]
 * 
 * Get network details with facilities and ROI assumptions
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = params;

    const network = await prisma.network.findUnique({
      where: { id },
      include: {
        roiAssumptions: {
          orderBy: {
            effectiveDate: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!network || network.deletedAt) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    // Get facility counts
    const facilityCount = await prisma.facility.count({
      where: {
        networkId: id,
        deletedAt: null,
      },
    });

    const verifiedCount = await prisma.facility.count({
      where: {
        networkId: id,
        deletedAt: null,
        verificationStatus: 'VERIFIED',
      },
    });

    return NextResponse.json({
      id: network.id,
      name: network.name,
      description: network.description,
      createdAt: network.createdAt,
      updatedAt: network.updatedAt,
      facilityCount,
      verifiedCount,
      roiAssumptions: network.roiAssumptions[0] || null,
    });
  } catch (error) {
    console.error('Failed to fetch network:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/networks/[id]
 * 
 * Update network details
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description } = body;

    const existing = await prisma.network.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.network.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update network:', error);
    return NextResponse.json(
      { error: 'Failed to update network' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/[id]
 * 
 * Soft delete network
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;

    const existing = await prisma.network.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    await prisma.network.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Network deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete network:', error);
    return NextResponse.json(
      { error: 'Failed to delete network' },
      { status: 500 }
    );
  }
}
