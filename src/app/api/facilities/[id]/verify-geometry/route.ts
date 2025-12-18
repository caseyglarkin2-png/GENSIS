/**
 * POST /api/facilities/[id]/verify-geometry
 * 
 * Verify facility geometry (centroid + optional polygon)
 * This is the core geometry verification endpoint enforcing the
 * "Verified Geometry Contract": centroid + (polygon OR cannot_polygon_reason)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logGeometryVerified } from '@/lib/services/audit';

type Params = {
  params: {
    id: string;
  };
};

interface VerifyGeometryBody {
  centroidLng: number;
  centroidLat: number;
  polygonWKT?: string;
  cannotPolygonReason?: string;
  notes?: string;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: facilityId } = params;
    const body: VerifyGeometryBody = await request.json();
    const { centroidLng, centroidLat, polygonWKT, cannotPolygonReason, notes } = body;

    // Validate required fields
    if (centroidLng === undefined || centroidLat === undefined) {
      return NextResponse.json(
        { error: 'Centroid coordinates are required' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (centroidLng < -180 || centroidLng > 180) {
      return NextResponse.json(
        { error: 'Longitude must be between -180 and 180' },
        { status: 400 }
      );
    }

    if (centroidLat < -90 || centroidLat > 90) {
      return NextResponse.json(
        { error: 'Latitude must be between -90 and 90' },
        { status: 400 }
      );
    }

    // Verify Geometry Contract: must have polygon OR cannot_polygon_reason
    if (!polygonWKT && !cannotPolygonReason) {
      return NextResponse.json(
        { error: 'Must provide either polygon or cannot_polygon_reason' },
        { status: 400 }
      );
    }

    // Check facility exists
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility || facility.deletedAt) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Determine change type for audit
    const isNew = !facility.centroidLng && !facility.centroidLat;
    const changeType = isNew ? 'INITIAL' : 'CORRECTION';

    // TODO: Get userId from auth session
    const userId = '00000000-0000-0000-0000-000000000001';

    // Update facility with raw SQL to handle PostGIS geometry
    await prisma.$executeRaw`
      UPDATE facilities 
      SET 
        centroid_lat = ${centroidLat},
        centroid_lng = ${centroidLng},
        centroid = ST_SetSRID(ST_MakePoint(${centroidLng}, ${centroidLat}), 4326),
        polygon_wkt = ${polygonWKT || null},
        polygon = ${polygonWKT ? prisma.$queryRaw`ST_GeomFromText(${polygonWKT}, 4326)` : null},
        cannot_polygon_reason = ${cannotPolygonReason || null},
        verification_status = 'VERIFIED',
        updated_at = NOW()
      WHERE id = ${facilityId}::uuid
    `;

    // Create verification record
    await prisma.facilityGeometryVerification.create({
      data: {
        facilityId: facilityId,
        cannotPolygonReason: cannotPolygonReason || null,
        verifiedByUserId: userId,
        verifiedAt: new Date(),
        verificationMethod: changeType === 'INITIAL' ? 'manual_initial' : 'manual_correction',
        notes: notes || null,
        confidenceScore: polygonWKT ? 95 : 80, // Higher confidence if polygon drawn
      },
    });

    // Audit log
    await logGeometryVerified(
      facilityId,
      userId,
      [centroidLng, centroidLat],
      !!polygonWKT,
      polygonWKT ? 95 : 80,
      { cannotPolygonReason }
    );

    // Fetch updated facility
    const updated = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    return NextResponse.json({
      message: 'Geometry verified successfully',
      centroidLng: updated?.centroidLng,
      centroidLat: updated?.centroidLat,
      hasPolygon: !!updated?.polygonWKT,
      cannotPolygonReason: updated?.cannotPolygonReason,
      verificationStatus: updated?.verificationStatus,
    });
  } catch (error) {
    console.error('Failed to verify geometry:', error);
    return NextResponse.json(
      { error: 'Failed to verify geometry' },
      { status: 500 }
    );
  }
}
