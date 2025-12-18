/**
 * GET /api/networks/[id]/facilities
 * 
 * List all facilities in a network with basic info and status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  try {
    const { id: networkId } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Verify network exists
    const network = await prisma.network.findUnique({
      where: { id: networkId },
    });

    if (!network || network.deletedAt) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    // Build search filter
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { state: { contains: search, mode: 'insensitive' as const } },
            { zipCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Fetch facilities
    const facilities = await prisma.facility.findMany({
      where: {
        networkId: networkId,
        deletedAt: null,
        ...searchFilter,
      },
      include: {
        metrics: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate data completeness for each facility
    const facilitiesWithStats = facilities.map((facility) => {
      let completeness = 0;
      let totalFields = 0;
      let filledFields = 0;

      // Check address fields
      const addressFields = ['address', 'city', 'state', 'zipCode'];
      addressFields.forEach((field) => {
        totalFields++;
        if (facility[field as keyof typeof facility]) filledFields++;
      });

      // Check geometry
      totalFields += 2;
      if (facility.centroidLat && facility.centroidLng) filledFields += 2;

      // Check polygon or cannot_polygon_reason
      totalFields++;
      if (facility.polygonWKT || facility.cannotPolygonReason) filledFields++;

      // Check metrics if exists
      const metrics = facility.metrics;
      if (metrics) {
        const metricFields = [
          'docksCount',
          'trucksPerDayInbound',
          'avgTurnTimeMinutes',
          'detentionMinutesPerTruck',
        ];
        metricFields.forEach((field) => {
          totalFields++;
          if (metrics[field as keyof typeof metrics] !== null) filledFields++;
        });
      } else {
        totalFields += 4;
      }

      completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

      return {
        id: facility.id,
        name: facility.name,
        facilityType: facility.facilityType,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zipCode: facility.zipCode,
        country: facility.country,
        centroidLng: facility.centroidLng,
        centroidLat: facility.centroidLat,
        polygonWKT: facility.polygonWKT,
        cannotPolygonReason: facility.cannotPolygonReason,
        verificationStatus: facility.verificationStatus,
        dataCompleteness: completeness,
        hasPolygon: !!facility.polygonWKT,
        createdAt: facility.createdAt,
        updatedAt: facility.updatedAt,
      };
    });

    return NextResponse.json({
      facilities: facilitiesWithStats,
      total: facilitiesWithStats.length,
      network: {
        id: network.id,
        name: network.name,
      },
    });
  } catch (error) {
    console.error('Failed to fetch facilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    );
  }
}
