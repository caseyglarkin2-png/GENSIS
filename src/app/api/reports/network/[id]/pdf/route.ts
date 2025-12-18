/**
 * POST /api/reports/network/[id]/pdf
 * 
 * Generate executive PDF report for a network
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateNetworkReportPDF } from '@/lib/services/pdf';
import { logPDFGenerated } from '@/lib/services/audit';

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: networkId } = params;
    const body = await request.json();
    const { includeWatermark = 'auto' } = body;

    // Fetch network with facilities and metrics
    const network = await prisma.network.findUnique({
      where: { id: networkId },
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

    // Fetch facilities with metrics
    const facilities = await prisma.facility.findMany({
      where: {
        networkId: networkId,
        deletedAt: null,
      },
      include: {
        metrics: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate verification stats
    const verifiedCount = facilities.filter((f) => f.verificationStatus === 'VERIFIED').length;
    const verifiedPercent = facilities.length > 0 ? (verifiedCount / facilities.length) * 100 : 0;

    // Calculate average data completeness
    const avgCompleteness = facilities.length > 0
      ? facilities.reduce((sum, f) => {
          let totalFields = 6; // name, address, city, state, zip, country
          let filledFields = 0;
          if (f.name) filledFields++;
          if (f.address) filledFields++;
          if (f.city) filledFields++;
          if (f.state) filledFields++;
          if (f.zipCode) filledFields++;
          if (f.country) filledFields++;
          
          totalFields += 2;
          if (f.centroidLat && f.centroidLng) filledFields += 2;

          totalFields++;
          if (f.polygonWKT || f.cannotPolygonReason) filledFields++;

          return sum + (filledFields / totalFields) * 100;
        }, 0) / facilities.length
      : 0;

    // Determine if watermark should be applied
    const shouldWatermark =
      includeWatermark === 'always' ||
      (includeWatermark === 'auto' && (avgCompleteness < 70 || verifiedPercent < 70));

    // Calculate simple ROI estimate based on facility count and detention
    // This is a simplified calculation - proper ROI uses calculateFacilityROI for each facility
    const avgDetention = facilities.length > 0
      ? facilities.reduce((sum, f) => sum + (f.metrics?.detentionMinutesPerTruck || 45), 0) / facilities.length
      : 45;
    const avgTrucks = facilities.length > 0
      ? facilities.reduce((sum, f) => sum + (f.metrics?.trucksPerDayInbound || 10), 0) / facilities.length
      : 10;
    
    const detentionCostPerHour = 75;
    const annualSavingsPerFacility = (avgDetention / 60) * avgTrucks * 260 * detentionCostPerHour * 0.3; // 30% reduction
    const projectedAnnualROI = facilities.length * annualSavingsPerFacility;
    const delayCostPerMonth = projectedAnnualROI / 12;

    // TODO: Get userId from auth session
    const userId = '00000000-0000-0000-0000-000000000001';

    // Get assumptions version
    const assumptions = network.roiAssumptions[0];
    const assumptionsVersion = assumptions?.version || '1.0.0';

    // Build NetworkROI object
    const networkROI = {
      networkId: network.id,
      totalFacilities: facilities.length,
      verifiedFacilities: verifiedCount,
      verifiedPercentage: verifiedPercent,
      aggregateRoi: {
        projectedAnnualRoi: Math.round(projectedAnnualROI),
        projectedMonthlyRoi: Math.round(projectedAnnualROI / 12),
        delayCostPerMonth: Math.round(delayCostPerMonth),
        delayCostPerWeek: Math.round(delayCostPerMonth / 4),
        breakdown: {
          detentionSavings: Math.round(projectedAnnualROI * 0.6),
          paperworkReduction: Math.round(projectedAnnualROI * 0.2),
          trailerHuntReduction: Math.round(projectedAnnualROI * 0.2),
        },
        paybackPeriodMonths: 6,
      },
      confidence: {
        roiConfidenceScore: Math.round(avgCompleteness),
        roiConfidenceLevel: (avgCompleteness >= 85 ? 'Boardroom-Ready' : avgCompleteness >= 70 ? 'Defensible' : avgCompleteness >= 50 ? 'Directional' : 'Speculative') as 'Speculative' | 'Directional' | 'Defensible' | 'Boardroom-Ready',
        drivers: avgCompleteness < 70 ? ['Incomplete facility data'] : [],
      },
      assumptionsVersion,
      assumptionsEffectiveDate: assumptions?.effectiveDate?.toISOString() || new Date().toISOString(),
    };

    // Build facility data for report
    const facilitiesForReport = facilities.map((f) => {
      // Calculate individual facility completeness
      let totalFields = 9;
      let filledFields = 0;
      if (f.name) filledFields++;
      if (f.address) filledFields++;
      if (f.city) filledFields++;
      if (f.state) filledFields++;
      if (f.zipCode) filledFields++;
      if (f.country) filledFields++;
      if (f.centroidLat && f.centroidLng) filledFields += 2;
      if (f.polygonWKT || f.cannotPolygonReason) filledFields++;
      
      const completenessScore = Math.round((filledFields / totalFields) * 100);
      const facilityROI = Math.round(annualSavingsPerFacility);
      
      return {
        id: f.id,
        name: f.name,
        city: f.city || '',
        state: f.state || '',
        verificationStatus: f.verificationStatus as 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED',
        projectedAnnualROI: facilityROI,
        dataCompletenessScore: completenessScore,
        roiConfidenceScore: completenessScore,
      };
    });

    // Generate PDF with correct NetworkReportData structure
    const pdfBuffer = await generateNetworkReportPDF({
      networkId: network.id,
      networkName: network.name,
      facilityCoun: facilities.length,
      verifiedCount,
      networkROI,
      avgROIConfidence: Math.round(avgCompleteness),
      avgDataCompleteness: Math.round(avgCompleteness),
      assumptionsVersion,
      scoringVersion: '1.0.0',
      facilities: facilitiesForReport,
    });

    // Audit log
    await logPDFGenerated(
      'network',
      networkId,
      userId,
      'network-executive',
      {
        facilitiesIncluded: facilities.length,
        hasWatermark: shouldWatermark,
        avgCompleteness: Math.round(avgCompleteness),
        projectedROI: Math.round(projectedAnnualROI),
      }
    );

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${network.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
