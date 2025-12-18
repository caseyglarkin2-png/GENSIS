/**
 * PATCH /api/facilities/[id]/metrics
 * 
 * Update facility operational metrics with confidence tracking
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logMetricsUpdated } from '@/lib/services/audit';

type Params = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: facilityId } = params;
    const body = await request.json();

    // Check facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      include: {
        metrics: true,
      },
    });

    if (!facility || facility.deletedAt) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Get existing metrics
    const existing = facility.metrics;

    // Build update data with proper camelCase field names
    const metricsData: Record<string, unknown> = {
      facilityId: facilityId,
    };

    // Map incoming body to Prisma camelCase fields
    if (body.docksCount !== undefined) {
      metricsData.docksCount = body.docksCount.value ?? body.docksCount;
      metricsData.docksCountConfidence = body.docksCount.confidence ?? body.docksCountConfidence ?? 50;
      metricsData.docksCountSource = body.docksCount.source ?? body.docksCountSource ?? 'MANUAL';
      metricsData.docksCountEvidenceLinks = body.docksCount.evidenceLinks ?? [];
      metricsData.docksCountLastVerifiedAt = new Date();
    }

    if (body.gatesCount !== undefined) {
      metricsData.gatesCount = body.gatesCount.value ?? body.gatesCount;
      metricsData.gatesCountConfidence = body.gatesCount.confidence ?? body.gatesCountConfidence ?? 50;
      metricsData.gatesCountSource = body.gatesCount.source ?? body.gatesCountSource ?? 'MANUAL';
      metricsData.gatesCountEvidenceLinks = body.gatesCount.evidenceLinks ?? [];
      metricsData.gatesCountLastVerifiedAt = new Date();
    }

    if (body.yardSpotsCount !== undefined) {
      metricsData.yardSpotsCount = body.yardSpotsCount.value ?? body.yardSpotsCount;
      metricsData.yardSpotsCountConfidence = body.yardSpotsCount.confidence ?? body.yardSpotsCountConfidence ?? 50;
      metricsData.yardSpotsCountSource = body.yardSpotsCount.source ?? body.yardSpotsCountSource ?? 'MANUAL';
      metricsData.yardSpotsCountEvidenceLinks = body.yardSpotsCount.evidenceLinks ?? [];
      metricsData.yardSpotsCountLastVerifiedAt = new Date();
    }

    if (body.trailersOnYardAvg !== undefined) {
      metricsData.trailersOnYardAvg = body.trailersOnYardAvg.value ?? body.trailersOnYardAvg;
      metricsData.trailersOnYardAvgConfidence = body.trailersOnYardAvg.confidence ?? body.trailersOnYardAvgConfidence ?? 50;
      metricsData.trailersOnYardAvgSource = body.trailersOnYardAvg.source ?? body.trailersOnYardAvgSource ?? 'MANUAL';
      metricsData.trailersOnYardAvgEvidenceLinks = body.trailersOnYardAvg.evidenceLinks ?? [];
      metricsData.trailersOnYardAvgLastVerifiedAt = new Date();
    }

    if (body.trucksPerDayInbound !== undefined) {
      metricsData.trucksPerDayInbound = body.trucksPerDayInbound.value ?? body.trucksPerDayInbound;
      metricsData.trucksPerDayInboundConfidence = body.trucksPerDayInbound.confidence ?? body.trucksPerDayInboundConfidence ?? 50;
      metricsData.trucksPerDayInboundSource = body.trucksPerDayInbound.source ?? body.trucksPerDayInboundSource ?? 'MANUAL';
      metricsData.trucksPerDayInboundEvidenceLinks = body.trucksPerDayInbound.evidenceLinks ?? [];
      metricsData.trucksPerDayInboundLastVerifiedAt = new Date();
    }

    if (body.trucksPerDayOutbound !== undefined) {
      metricsData.trucksPerDayOutbound = body.trucksPerDayOutbound.value ?? body.trucksPerDayOutbound;
      metricsData.trucksPerDayOutboundConfidence = body.trucksPerDayOutbound.confidence ?? body.trucksPerDayOutboundConfidence ?? 50;
      metricsData.trucksPerDayOutboundSource = body.trucksPerDayOutbound.source ?? body.trucksPerDayOutboundSource ?? 'MANUAL';
      metricsData.trucksPerDayOutboundEvidenceLinks = body.trucksPerDayOutbound.evidenceLinks ?? [];
      metricsData.trucksPerDayOutboundLastVerifiedAt = new Date();
    }

    if (body.avgTurnTimeMinutes !== undefined) {
      metricsData.avgTurnTimeMinutes = body.avgTurnTimeMinutes.value ?? body.avgTurnTimeMinutes;
      metricsData.avgTurnTimeMinutesConfidence = body.avgTurnTimeMinutes.confidence ?? body.avgTurnTimeMinutesConfidence ?? 50;
      metricsData.avgTurnTimeMinutesSource = body.avgTurnTimeMinutes.source ?? body.avgTurnTimeMinutesSource ?? 'MANUAL';
      metricsData.avgTurnTimeMinutesEvidenceLinks = body.avgTurnTimeMinutes.evidenceLinks ?? [];
      metricsData.avgTurnTimeMinutesLastVerifiedAt = new Date();
    }

    if (body.detentionMinutesPerTruck !== undefined) {
      metricsData.detentionMinutesPerTruck = body.detentionMinutesPerTruck.value ?? body.detentionMinutesPerTruck;
      metricsData.detentionMinutesPerTruckConfidence = body.detentionMinutesPerTruck.confidence ?? body.detentionMinutesPerTruckConfidence ?? 50;
      metricsData.detentionMinutesPerTruckSource = body.detentionMinutesPerTruck.source ?? body.detentionMinutesPerTruckSource ?? 'MANUAL';
      metricsData.detentionMinutesPerTruckEvidenceLinks = body.detentionMinutesPerTruck.evidenceLinks ?? [];
      metricsData.detentionMinutesPerTruckLastVerifiedAt = new Date();
    }

    if (body.bottlenecks !== undefined) {
      metricsData.bottlenecks = body.bottlenecks;
      metricsData.bottlenecksConfidence = body.bottlenecksConfidence ?? 50;
      metricsData.bottlenecksSource = body.bottlenecksSource ?? 'MANUAL';
      metricsData.bottlenecksLastVerifiedAt = new Date();
    }

    // TODO: Get userId from auth session
    const userId = '00000000-0000-0000-0000-000000000001';

    // Create or update metrics - use upsert
    const metrics = await prisma.facilityMetric.upsert({
      where: { facilityId },
      create: metricsData as any,
      update: metricsData as any,
    });

    // Audit log
    await logMetricsUpdated(
      facilityId,
      userId,
      body,
      {
        metricsId: metrics.id,
      }
    );

    return NextResponse.json({
      message: 'Metrics updated successfully',
      metricsId: metrics.id,
    });
  } catch (error) {
    console.error('Failed to update metrics:', error);
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    );
  }
}
