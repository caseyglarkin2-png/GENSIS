'use client';

/**
 * Network Dashboard Page
 * 
 * Main view for a network showing:
 * - Map with all facilities
 * - Facility list sidebar
 * - Network stats header
 * - Quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import FacilityList from '@/components/map/FacilityList';
import type { FacilityMapData } from '@/components/map/MapView';

// Dynamic import for MapView to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface Network {
  id: string;
  name: string;
  description: string | null;
  facilityCount: number;
  verifiedCount: number;
}

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  centroidLng: number | null;
  centroidLat: number | null;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'NEEDS_REVIEW';
  dataCompleteness: number;
  hasPolygon: boolean;
  metrics: {
    turnsPerDay: number | null;
    avgDetentionMinutes: number | null;
  } | null;
}

export default function NetworkDashboard() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.id as string;

  const [network, setNetwork] = useState<Network | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch network and facilities
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch network details
        const networkRes = await fetch(`/api/networks/${networkId}`);
        if (!networkRes.ok) {
          throw new Error('Network not found');
        }
        const networkData = await networkRes.json();
        setNetwork(networkData);

        // Fetch facilities
        const facilitiesRes = await fetch(`/api/networks/${networkId}/facilities`);
        if (!facilitiesRes.ok) {
          throw new Error('Failed to fetch facilities');
        }
        const facilitiesData = await facilitiesRes.json();
        setFacilities(facilitiesData.facilities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (networkId) {
      fetchData();
    }
  }, [networkId]);

  // Transform facilities for map
  const mapFacilities: FacilityMapData[] = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    address: f.address,
    city: f.city,
    state: f.state,
    centroidLng: f.centroidLng,
    centroidLat: f.centroidLat,
    verificationStatus: f.verificationStatus,
    dataCompleteness: f.dataCompleteness,
    hasPolygon: f.hasPolygon,
  }));

  const handleFacilityClick = useCallback((facility: FacilityMapData) => {
    setSelectedFacilityId(facility.id);
  }, []);

  const handleFacilitySelect = useCallback((facility: FacilityMapData) => {
    setSelectedFacilityId(facility.id);
  }, []);

  // Stats calculations
  const verifiedCount = facilities.filter((f) => f.verificationStatus === 'VERIFIED').length;
  const mappedCount = facilities.filter((f) => f.centroidLng && f.centroidLat).length;
  const avgCompleteness = facilities.length > 0
    ? Math.round(facilities.reduce((sum, f) => sum + f.dataCompleteness, 0) / facilities.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading network...</p>
        </div>
      </div>
    );
  }

  if (error || !network) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Network not found'}
          </h2>
          <Link href="/" className="text-blue-600 hover:underline">
            Back to networks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{network.name}</h1>
              {network.description && (
                <p className="text-sm text-gray-500">{network.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/networks/${networkId}/import`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
            >
              Import CSV
            </Link>
            <Link
              href={`/networks/${networkId}/report`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Generate Report
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-8 mt-4 pt-4 border-t">
          <div>
            <div className="text-2xl font-bold text-gray-900">{facilities.length}</div>
            <div className="text-sm text-gray-500">Total Facilities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
            <div className="text-sm text-gray-500">Verified</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{mappedCount}</div>
            <div className="text-sm text-gray-500">Mapped</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{avgCompleteness}%</div>
            <div className="text-sm text-gray-500">Avg Completeness</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Progress:</span>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${facilities.length > 0 ? (verifiedCount / facilities.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {facilities.length > 0 ? Math.round((verifiedCount / facilities.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 z-20 bg-white rounded-r-lg shadow-lg p-1 border border-l-0 transform -translate-y-1/2"
          style={{ left: sidebarOpen ? '384px' : 0 }}
        >
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Sidebar */}
        <aside
          className={`bg-white border-r transition-all duration-300 overflow-hidden ${
            sidebarOpen ? 'w-96' : 'w-0'
          }`}
        >
          <FacilityList
            facilities={mapFacilities}
            networkId={networkId}
            selectedFacilityId={selectedFacilityId}
            onFacilitySelect={handleFacilitySelect}
            className="h-full"
          />
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <MapView
            facilities={mapFacilities}
            accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
            onFacilityClick={handleFacilityClick}
            selectedFacilityId={selectedFacilityId}
            className="h-full"
          />
        </main>
      </div>
    </div>
  );
}
