/**
 * GET /api/facilities/[id]
 * PATCH /api/facilities/[id]
 * 
 * Get or update facility details
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = {
  params: {
    id: string;
  };
};

/**
 * GET /api/facilities/[id]
 * 
 * Get full facility details including metrics and verification history
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id: facilityId } = params;

    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        metrics: true,
        geometryVerifications: {
          orderBy: {
            verifiedAt: 'desc',
          },
          take: 5,
        },
        network: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!facility || facility.deletedAt) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Calculate data completeness
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

    const dataCompleteness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

    return NextResponse.json({
      id: facility.id,
      networkId: facility.networkId,
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
      dataCompleteness,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
      network: facility.network,
      metrics: metrics ? {
        id: metrics.id,
        docksCount: metrics.docksCount,
        docksCountConfidence: metrics.docksCountConfidence,
        gatesCount: metrics.gatesCount,
        gatesCountConfidence: metrics.gatesCountConfidence,
        yardSpotsCount: metrics.yardSpotsCount,
        yardSpotsCountConfidence: metrics.yardSpotsCountConfidence,
        trailersOnYardAvg: metrics.trailersOnYardAvg,
        trailersOnYardAvgConfidence: metrics.trailersOnYardAvgConfidence,
        trucksPerDayInbound: metrics.trucksPerDayInbound,
        trucksPerDayInboundConfidence: metrics.trucksPerDayInboundConfidence,
        trucksPerDayOutbound: metrics.trucksPerDayOutbound,
        trucksPerDayOutboundConfidence: metrics.trucksPerDayOutboundConfidence,
        avgTurnTimeMinutes: metrics.avgTurnTimeMinutes,
        avgTurnTimeMinutesConfidence: metrics.avgTurnTimeMinutesConfidence,
        detentionMinutesPerTruck: metrics.detentionMinutesPerTruck,
        detentionMinutesPerTruckConfidence: metrics.detentionMinutesPerTruckConfidence,
        bottlenecks: metrics.bottlenecks,
        bottlenecksConfidence: metrics.bottlenecksConfidence,
        createdAt: metrics.createdAt,
        updatedAt: metrics.updatedAt,
      } : null,
      verificationHistory: facility.geometryVerifications.map((v) => ({
        id: v.id,
        verifiedBy: v.verifiedByUserId,
        verifiedAt: v.verifiedAt,
        method: v.verificationMethod,
        confidenceScore: v.confidenceScore,
        notes: v.notes,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch facility:', error);
    return NextResponse.json(
      { error: 'Failed to fetch facility' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/facilities/[id]
 * 
 * Update facility basic details (not geometry or metrics)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: facilityId } = params;
    const body = await request.json();
    const { name, facilityType, address, city, state, zipCode, country } = body;

    const existing = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.facility.update({
      where: { id: facilityId },
      data: {
        name: name ?? existing.name,
        facilityType: facilityType ?? existing.facilityType,
        address: address ?? existing.address,
        city: city ?? existing.city,
        state: state ?? existing.state,
        zipCode: zipCode ?? existing.zipCode,
        country: country ?? existing.country,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      facilityType: updated.facilityType,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      zipCode: updated.zipCode,
      country: updated.country,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update facility:', error);
    return NextResponse.json(
      { error: 'Failed to update facility' },
      { status: 500 }
    );
  }
}
