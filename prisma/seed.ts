/**
 * Database Seed Script
 * Creates admin user + sample network with 5 facilities
 */

import { PrismaClient } from '@prisma/client';
import type { ROIAssumptions } from '../src/lib/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@facilitycommand.com' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@facilitycommand.com',
      name: 'Admin User',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // 2. Create platform admin organization (Freightroll)
  const freightroll = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Freightroll',
      type: 'PLATFORM_ADMIN',
      planTier: 'enterprise',
      features: ['ai_insights', 'templates', 'api_access', 'white_label'],
      isActive: true,
    },
  });

  console.log('✅ Created platform admin org:', freightroll.name);

  // 3. Link admin user to organization
  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: freightroll.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      organizationId: freightroll.id,
      userId: admin.id,
      role: 'PLATFORM_ADMIN',
      joinedAt: new Date(),
    },
  });

  console.log('✅ Linked admin to organization');

  // 4. Create sample network
  const network = await prisma.network.create({
    data: {
      name: 'Primo Brands (Sample)',
      description: 'Sample beverage distributor network with 5 facilities for testing',
      customerType: 'shipper',
      organizationId: freightroll.id,
      createdBy: admin.id,
    },
  });

  console.log('✅ Created network:', network.name);

  // 5. Create ROI assumptions
  const defaultAssumptions: ROIAssumptions = {
    currency: 'USD',
    globalAssumptions: {
      detentionCostPerHour: 75,
      laborCostPerHour: 28,
      avgDriverTimeValuePerHour: 60,
      baselineAvgTurnTimeMinutes: 60,
      targetAvgTurnTimeMinutes: 18,
      baselineDetentionMinutesPerTruck: 30,
      targetDetentionMinutesPerTruck: 5,
      baselineTrailerSearchesPerDay: 10,
      targetTrailerSearchesPerDay: 0,
      avgMinutesPerTrailerSearch: 8,
      paperworkMinutesPerTruck: 6,
      targetPaperworkMinutesPerTruck: 1,
      implementationCostPerDoor: 2000,
      annualSoftwareCostPerFacility: 0,
      oneTimeRolloutCostPerFacility: 0,
      discountRateAnnual: 0.1,
      roiCaptureFactor: 1.0,
      rampCurveEnabled: false,
    },
    roiComponentsEnabled: {
      detentionSavings: true,
      laborSavings: true,
      turnTimeAcceleration: true,
      paperworkReduction: true,
      trailerHuntReduction: true,
    },
    bottleneckWeights: {
      gateCongest: 1.0,
      yardCongestion: 1.0,
      paperwork: 1.0,
      trailerHunting: 1.0,
      dockScheduling: 1.0,
      driverCheckIn: 1.0,
    },
  };

  await prisma.roiAssumption.create({
    data: {
      networkId: network.id,
      version: '1.0.0',
      effectiveDate: new Date('2025-01-01'),
      isActive: true,
      assumptionsData: defaultAssumptions as any,
      createdBy: admin.id,
    },
  });

  console.log('✅ Created ROI assumptions v1.0.0');

  // 6. Create sample facilities with geometry
  const facilities = [
    {
      name: 'Dallas Distribution Center',
      code: 'DAL-001',
      type: 'dc',
      isPriority: true,
      priorityRank: 1,
      priorityReason: 'Highest volume hub - ideal for Phase 1 pilot deployment',
      address: {
        line1: '2501 N Stemmons Fwy',
        city: 'Dallas',
        state: 'TX',
        zip: '75207',
      },
      centroid: [-96.8217, 32.7942], // [lng, lat]
      metrics: {
        docksCount: 24,
        gatesCount: 4,
        yardSpotsCount: 100,
        trucksPerDayInbound: 120,
        trucksPerDayOutbound: 110,
        detentionMinutesPerTruck: 35,
        bottlenecks: ['gate_congestion', 'trailer_hunting'],
      },
    },
    {
      name: 'Houston Warehouse',
      code: 'HOU-001',
      type: 'warehouse',
      isPriority: true,
      priorityRank: 3,
      priorityReason: 'Growing market - strong carrier partner interest',
      address: {
        line1: '8610 Park Ten Blvd',
        city: 'Houston',
        state: 'TX',
        zip: '77084',
      },
      centroid: [-95.6636, 29.8597],
      metrics: {
        docksCount: 18,
        gatesCount: 2,
        yardSpotsCount: 75,
        trucksPerDayInbound: 80,
        trucksPerDayOutbound: 75,
        detentionMinutesPerTruck: 28,
        bottlenecks: ['yard_congestion', 'paperwork'],
      },
    },
    {
      name: 'Phoenix Terminal',
      code: 'PHX-001',
      type: 'terminal',
      isPriority: false,
      priorityRank: null,
      priorityReason: null,
      address: {
        line1: '4750 W Van Buren St',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85043',
      },
      centroid: [-112.1726, 33.4527],
      metrics: {
        docksCount: 12,
        gatesCount: 3,
        yardSpotsCount: 60,
        trucksPerDayInbound: 60,
        trucksPerDayOutbound: 58,
        detentionMinutesPerTruck: 22,
        bottlenecks: ['dock_scheduling'],
      },
    },
    {
      name: 'Atlanta DC',
      code: 'ATL-001',
      type: 'dc',
      isPriority: true,
      priorityRank: 2,
      priorityReason: 'Southeast hub - critical for East Coast distribution network',
      address: {
        line1: '1000 Distribution Dr',
        city: 'Atlanta',
        state: 'GA',
        zip: '30336',
      },
      centroid: [-84.4733, 33.6868],
      metrics: {
        docksCount: 32,
        gatesCount: 5,
        yardSpotsCount: 150,
        trucksPerDayInbound: 180,
        trucksPerDayOutbound: 175,
        detentionMinutesPerTruck: 40,
        bottlenecks: ['gate_congestion', 'yard_congestion', 'trailer_hunting'],
      },
    },
    {
      name: 'Chicago Plant',
      code: 'CHI-001',
      type: 'plant',
      isPriority: false,
      priorityRank: null,
      priorityReason: null,
      address: {
        line1: '1550 S Blue Island Ave',
        city: 'Chicago',
        state: 'IL',
        zip: '60608',
      },
      centroid: [-87.6623, 41.8565],
      metrics: {
        docksCount: 16,
        gatesCount: 3,
        yardSpotsCount: 80,
        trucksPerDayInbound: 90,
        trucksPerDayOutbound: 88,
        detentionMinutesPerTruck: 25,
        bottlenecks: ['paperwork', 'driver_check_in'],
      },
    },
  ];

  for (const fac of facilities) {
    // Insert facility with PostGIS geometry
    const facility = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO facilities (
        network_id, name, facility_code, facility_type,
        is_priority, priority_rank, priority_reason,
        address_line1, city, state, zip, country,
        facility_centroid,
        verification_status, verification_confidence_score,
        import_source, geocode_method, geocode_confidence,
        created_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        ST_GeomFromGeoJSON($13),
        $14::verification_status, $15, $16, $17, $18,
        NOW(), NOW()
      )
      RETURNING id, name;
    `,
      network.id,
      fac.name,
      fac.code,
      fac.type,
      fac.isPriority,
      fac.priorityRank,
      fac.priorityReason,
      fac.address.line1,
      fac.address.city,
      fac.address.state,
      fac.address.zip,
      'USA',
      JSON.stringify({ type: 'Point', coordinates: fac.centroid }),
      'UNVERIFIED', // Start as unverified for testing
      null,
      'seed',
      'rooftop',
      0.95
    );

    const facilityId = facility[0].id;
    console.log(`✅ Created facility: ${fac.name}`);

    // Insert metrics
    await prisma.facilityMetric.create({
      data: {
        facilityId,
        docksCount: fac.metrics.docksCount,
        docksCountConfidence: 90,
        docksCountSource: 'manual',
        docksCountLastVerifiedAt: new Date(),
        docksCountEvidenceLinks: [],

        gatesCount: fac.metrics.gatesCount,
        gatesCountConfidence: 90,
        gatesCountSource: 'manual',
        gatesCountLastVerifiedAt: new Date(),
        gatesCountEvidenceLinks: [],

        yardSpotsCount: fac.metrics.yardSpotsCount,
        yardSpotsCountConfidence: 85,
        yardSpotsCountSource: 'estimate',
        yardSpotsCountLastVerifiedAt: new Date(),
        yardSpotsCountEvidenceLinks: [],

        trucksPerDayInbound: fac.metrics.trucksPerDayInbound,
        trucksPerDayInboundConfidence: 85,
        trucksPerDayInboundSource: 'estimate',
        trucksPerDayInboundLastVerifiedAt: new Date(),
        trucksPerDayInboundEvidenceLinks: [],

        trucksPerDayOutbound: fac.metrics.trucksPerDayOutbound,
        trucksPerDayOutboundConfidence: 85,
        trucksPerDayOutboundSource: 'estimate',
        trucksPerDayOutboundLastVerifiedAt: new Date(),
        trucksPerDayOutboundEvidenceLinks: [],

        detentionMinutesPerTruck: fac.metrics.detentionMinutesPerTruck,
        detentionMinutesPerTruckConfidence: 75,
        detentionMinutesPerTruckSource: 'estimate',
        detentionMinutesPerTruckLastVerifiedAt: new Date(),
        detentionMinutesPerTruckEvidenceLinks: [],

        bottlenecks: fac.metrics.bottlenecks,
        bottlenecksConfidence: 90,
        bottlenecksSource: 'manual',
        bottlenecksLastVerifiedAt: new Date(),
        bottlenecksEvidenceLinks: [],
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'facility_created',
        entityType: 'facility',
        entityId: facilityId,
        changes: { name: fac.name },
        metadata: { source: 'seed' },
        userId: admin.id,
      },
    });
  }

  console.log('✅ Created 5 sample facilities with metrics');
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Start the dev server: npm run dev');
  console.log('  2. Open http://localhost:3000');
  console.log('  3. View sample network and facilities');
  console.log('  4. Test geometry verification workflow');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
