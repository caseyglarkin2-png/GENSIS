/**
 * POST /api/networks/[id]/import/csv
 * 
 * Import facilities from CSV data
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logCSVImport } from '@/lib/services/audit';

type Params = {
  params: {
    id: string;
  };
};

interface FacilityImport {
  name: string;
  facilityType?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  centroidLat?: number;
  centroidLng?: number;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: networkId } = params;
    const body = await request.json();
    const { facilities }: { facilities: FacilityImport[] } = body;

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

    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      return NextResponse.json(
        { error: 'No facilities provided' },
        { status: 400 }
      );
    }

    // TODO: Get userId from auth session
    const userId = '00000000-0000-0000-0000-000000000001';

    const errors: string[] = [];
    let imported = 0;

    // Process each facility
    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      const rowNum = i + 1;

      try {
        // Validate required fields
        if (!facility.name?.trim()) {
          errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }
        if (!facility.address?.trim()) {
          errors.push(`Row ${rowNum}: Address is required`);
          continue;
        }
        if (!facility.city?.trim()) {
          errors.push(`Row ${rowNum}: City is required`);
          continue;
        }
        if (!facility.state?.trim()) {
          errors.push(`Row ${rowNum}: State is required`);
          continue;
        }
        if (!facility.zipCode?.trim()) {
          errors.push(`Row ${rowNum}: ZIP code is required`);
          continue;
        }

        // Create facility
        await prisma.facility.create({
          data: {
            networkId: networkId,
            name: facility.name.trim(),
            facilityType: (facility.facilityType?.trim() as any) || 'WAREHOUSE',
            address: facility.address.trim(),
            city: facility.city.trim(),
            state: facility.state.trim(),
            zipCode: facility.zipCode.trim(),
            country: facility.country?.trim() || 'USA',
            centroidLat: facility.centroidLat || null,
            centroidLng: facility.centroidLng || null,
            verificationStatus: facility.centroidLat && facility.centroidLng ? 'NEEDS_REVIEW' : 'UNVERIFIED',
          },
        });

        imported++;
      } catch (err) {
        console.error(`Error importing facility at row ${rowNum}:`, err);
        errors.push(`Row ${rowNum}: Failed to import - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Audit log
    await logCSVImport(
      networkId,
      userId,
      imported,
      errors.length,
      {
        totalRows: facilities.length,
        errorDetails: errors.slice(0, 10), // First 10 errors
      }
    );

    return NextResponse.json({
      message: `Successfully imported ${imported} of ${facilities.length} facilities`,
      imported,
      total: facilities.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to import CSV:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
