import Link from 'next/link';

interface Network {
  id: string;
  name: string;
  description: string | null;
  facilityCount: number;
  verifiedCount: number;
  createdAt: string;
}

async function getNetworks(): Promise<Network[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/networks`,
      { cache: 'no-store' }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.networks || [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const networks = await getNetworks();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Facility Command Center
          </h1>
          <p className="text-lg text-gray-600">
            Model and prioritize facility network rollouts with verified geometry and defensible ROI
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">Networks</h2>
          <Link
            href="/networks/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Network
          </Link>
        </div>

        {networks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No networks yet</p>
            <Link
              href="/networks/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Network
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networks.map((network: any) => (
              <Link
                key={network.id}
                href={`/networks/${network.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {network.name}
                </h3>
                {network.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {network.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{network.facilityCount} facilities</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-600">{network.verifiedCount} verified</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Created {new Date(network.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Quick Start
          </h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Create a network (e.g., &quot;Primo Brands&quot;)</li>
            <li>2. Import facilities via CSV or add manually</li>
            <li>3. Verify geometry on map (centroid + polygon)</li>
            <li>4. Add operational metrics with confidence</li>
            <li>5. Generate executive PDF with ROI hero line</li>
          </ol>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            <strong>Critical Principle:</strong> Verified Geometry Contract
          </p>
          <p className="mt-1">
            Facilities must have centroid + (polygon OR cannot_polygon_reason) with verification metadata
          </p>
        </div>
      </div>
    </div>
  );
}
