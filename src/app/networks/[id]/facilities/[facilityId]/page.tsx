'use client';

/**
 * Facility Detail Page
 * 
 * Shows facility details with:
 * - Geometry verification map
 * - Metrics form with confidence sliders
 * - Audit log
 * - ROI calculations
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic imports for map components
const GeometryEditor = dynamic(() => import('@/components/map/GeometryEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

interface Facility {
  id: string;
  networkId: string;
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  centroidLng: number | null;
  centroidLat: number | null;
  polygonWKT: string | null;
  cannotPolygonReason: string | null;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'NEEDS_REVIEW';
  dataCompleteness: number;
  createdAt: string;
  updatedAt: string;
  metrics: {
    turnsPerDay: number | null;
    turnsConfidence: number;
    avgDetentionMinutes: number | null;
    detentionConfidence: number;
    avgDwellMinutes: number | null;
    dwellConfidence: number;
    missedAppointmentsPerWeek: number | null;
    missedApptsConfidence: number;
    trailerSearchMinutes: number | null;
    trailerSearchConfidence: number;
    paperworkHoursPerWeek: number | null;
    paperworkConfidence: number;
    hasDropTrailer: boolean;
    hasLiveUnload: boolean;
    hasAppointmentSystem: boolean;
    notes: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  changes: Record<string, unknown>;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export default function FacilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.id as string;
  const facilityId = params.facilityId as string;

  const [facility, setFacility] = useState<Facility | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'geometry' | 'metrics' | 'audit'>('geometry');

  // Form state for metrics
  const [metricsForm, setMetricsForm] = useState({
    turnsPerDay: '',
    turnsConfidence: 50,
    avgDetentionMinutes: '',
    detentionConfidence: 50,
    avgDwellMinutes: '',
    dwellConfidence: 50,
    missedAppointmentsPerWeek: '',
    missedApptsConfidence: 50,
    trailerSearchMinutes: '',
    trailerSearchConfidence: 50,
    paperworkHoursPerWeek: '',
    paperworkConfidence: 50,
    hasDropTrailer: false,
    hasLiveUnload: false,
    hasAppointmentSystem: false,
    notes: '',
  });

  // Fetch facility data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/facilities/${facilityId}`);
        if (!res.ok) {
          throw new Error('Facility not found');
        }
        const data = await res.json();
        setFacility(data);

        // Initialize metrics form
        if (data.metrics) {
          setMetricsForm({
            turnsPerDay: data.metrics.turnsPerDay?.toString() || '',
            turnsConfidence: data.metrics.turnsConfidence || 50,
            avgDetentionMinutes: data.metrics.avgDetentionMinutes?.toString() || '',
            detentionConfidence: data.metrics.detentionConfidence || 50,
            avgDwellMinutes: data.metrics.avgDwellMinutes?.toString() || '',
            dwellConfidence: data.metrics.dwellConfidence || 50,
            missedAppointmentsPerWeek: data.metrics.missedAppointmentsPerWeek?.toString() || '',
            missedApptsConfidence: data.metrics.missedApptsConfidence || 50,
            trailerSearchMinutes: data.metrics.trailerSearchMinutes?.toString() || '',
            trailerSearchConfidence: data.metrics.trailerSearchConfidence || 50,
            paperworkHoursPerWeek: data.metrics.paperworkHoursPerWeek?.toString() || '',
            paperworkConfidence: data.metrics.paperworkConfidence || 50,
            hasDropTrailer: data.metrics.hasDropTrailer || false,
            hasLiveUnload: data.metrics.hasLiveUnload || false,
            hasAppointmentSystem: data.metrics.hasAppointmentSystem || false,
            notes: data.metrics.notes || '',
          });
        }

        // TODO: Fetch audit logs
        // const auditRes = await fetch(`/api/facilities/${facilityId}/audit`);
        // if (auditRes.ok) {
        //   const auditData = await auditRes.json();
        //   setAuditLogs(auditData.logs || []);
        // }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (facilityId) {
      fetchData();
    }
  }, [facilityId]);

  // Handle geometry save
  const handleGeometrySave = useCallback(
    async (geometry: { centroidLng: number; centroidLat: number; polygonWKT?: string; cannotPolygonReason?: string }) => {
      try {
        setSaving(true);
        const res = await fetch(`/api/facilities/${facilityId}/verify-geometry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geometry),
        });

        if (!res.ok) {
          throw new Error('Failed to save geometry');
        }

        const updated = await res.json();
        setFacility((prev) => (prev ? { ...prev, ...updated } : null));
        
        // Show success toast
        alert('Geometry saved successfully!');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save geometry');
      } finally {
        setSaving(false);
      }
    },
    [facilityId]
  );

  // Handle metrics save
  const handleMetricsSave = useCallback(async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/facilities/${facilityId}/metrics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnsPerDay: metricsForm.turnsPerDay ? parseFloat(metricsForm.turnsPerDay) : null,
          turnsConfidence: metricsForm.turnsConfidence,
          avgDetentionMinutes: metricsForm.avgDetentionMinutes ? parseFloat(metricsForm.avgDetentionMinutes) : null,
          detentionConfidence: metricsForm.detentionConfidence,
          avgDwellMinutes: metricsForm.avgDwellMinutes ? parseFloat(metricsForm.avgDwellMinutes) : null,
          dwellConfidence: metricsForm.dwellConfidence,
          missedAppointmentsPerWeek: metricsForm.missedAppointmentsPerWeek
            ? parseFloat(metricsForm.missedAppointmentsPerWeek)
            : null,
          missedApptsConfidence: metricsForm.missedApptsConfidence,
          trailerSearchMinutes: metricsForm.trailerSearchMinutes ? parseFloat(metricsForm.trailerSearchMinutes) : null,
          trailerSearchConfidence: metricsForm.trailerSearchConfidence,
          paperworkHoursPerWeek: metricsForm.paperworkHoursPerWeek
            ? parseFloat(metricsForm.paperworkHoursPerWeek)
            : null,
          paperworkConfidence: metricsForm.paperworkConfidence,
          hasDropTrailer: metricsForm.hasDropTrailer,
          hasLiveUnload: metricsForm.hasLiveUnload,
          hasAppointmentSystem: metricsForm.hasAppointmentSystem,
          notes: metricsForm.notes || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save metrics');
      }

      const updated = await res.json();
      setFacility((prev) => (prev ? { ...prev, metrics: updated, dataCompleteness: updated.dataCompleteness } : null));
      
      alert('Metrics saved successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save metrics');
    } finally {
      setSaving(false);
    }
  }, [facilityId, metricsForm]);

  const updateMetric = (field: keyof typeof metricsForm, value: string | number | boolean) => {
    setMetricsForm((prev) => ({ ...prev, [field]: value }));
  };

  // Confidence level label
  const getConfidenceLabel = (value: number) => {
    if (value < 30) return 'Speculative';
    if (value < 50) return 'Estimate';
    if (value < 70) return 'Directional';
    if (value < 90) return 'Defensible';
    return 'Verified';
  };

  const getConfidenceColor = (value: number) => {
    if (value < 30) return 'text-red-600';
    if (value < 50) return 'text-orange-600';
    if (value < 70) return 'text-yellow-600';
    if (value < 90) return 'text-green-600';
    return 'text-green-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading facility...</p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Facility not found'}
          </h2>
          <Link href={`/networks/${networkId}`} className="text-blue-600 hover:underline">
            Back to network
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/networks/${networkId}`} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{facility.name}</h1>
              <p className="text-sm text-gray-500">
                {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${
                facility.verificationStatus === 'VERIFIED'
                  ? 'bg-green-100 text-green-800'
                  : facility.verificationStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : facility.verificationStatus === 'NEEDS_REVIEW'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {facility.verificationStatus.replace('_', ' ')}
            </span>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{facility.dataCompleteness}%</div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <nav className="flex gap-8 px-6">
          {(['geometry', 'metrics', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'geometry' && 'Geometry Verification'}
              {tab === 'metrics' && 'Facility Metrics'}
              {tab === 'audit' && 'Audit Log'}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="p-6">
        {activeTab === 'geometry' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Verify Geometry</h2>
              <p className="text-sm text-gray-500 mt-1">
                Verify the facility&apos;s centroid location and optionally draw a polygon boundary.
              </p>
            </div>
            <div className="p-6">
              <GeometryEditor
                facility={facility}
                accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
                onSave={handleGeometrySave}
                saving={saving}
              />
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Facility Metrics</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter operational metrics with confidence levels. Higher confidence = more reliable ROI calculations.
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Turns per Day */}
                <MetricInput
                  label="Turns per Day"
                  value={metricsForm.turnsPerDay}
                  onChange={(v) => updateMetric('turnsPerDay', v)}
                  confidence={metricsForm.turnsConfidence}
                  onConfidenceChange={(v) => updateMetric('turnsConfidence', v)}
                  placeholder="e.g., 12"
                  unit="turns"
                />

                {/* Avg Detention */}
                <MetricInput
                  label="Average Detention"
                  value={metricsForm.avgDetentionMinutes}
                  onChange={(v) => updateMetric('avgDetentionMinutes', v)}
                  confidence={metricsForm.detentionConfidence}
                  onConfidenceChange={(v) => updateMetric('detentionConfidence', v)}
                  placeholder="e.g., 45"
                  unit="minutes"
                />

                {/* Avg Dwell */}
                <MetricInput
                  label="Average Dwell Time"
                  value={metricsForm.avgDwellMinutes}
                  onChange={(v) => updateMetric('avgDwellMinutes', v)}
                  confidence={metricsForm.dwellConfidence}
                  onConfidenceChange={(v) => updateMetric('dwellConfidence', v)}
                  placeholder="e.g., 120"
                  unit="minutes"
                />

                {/* Missed Appointments */}
                <MetricInput
                  label="Missed Appointments"
                  value={metricsForm.missedAppointmentsPerWeek}
                  onChange={(v) => updateMetric('missedAppointmentsPerWeek', v)}
                  confidence={metricsForm.missedApptsConfidence}
                  onConfidenceChange={(v) => updateMetric('missedApptsConfidence', v)}
                  placeholder="e.g., 5"
                  unit="per week"
                />

                {/* Trailer Search */}
                <MetricInput
                  label="Trailer Search Time"
                  value={metricsForm.trailerSearchMinutes}
                  onChange={(v) => updateMetric('trailerSearchMinutes', v)}
                  confidence={metricsForm.trailerSearchConfidence}
                  onConfidenceChange={(v) => updateMetric('trailerSearchConfidence', v)}
                  placeholder="e.g., 15"
                  unit="minutes"
                />

                {/* Paperwork Hours */}
                <MetricInput
                  label="Paperwork Time"
                  value={metricsForm.paperworkHoursPerWeek}
                  onChange={(v) => updateMetric('paperworkHoursPerWeek', v)}
                  confidence={metricsForm.paperworkConfidence}
                  onConfidenceChange={(v) => updateMetric('paperworkConfidence', v)}
                  placeholder="e.g., 10"
                  unit="hours/week"
                />
              </div>

              {/* Boolean flags */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Facility Capabilities</h3>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metricsForm.hasDropTrailer}
                      onChange={(e) => updateMetric('hasDropTrailer', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Drop Trailer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metricsForm.hasLiveUnload}
                      onChange={(e) => updateMetric('hasLiveUnload', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Live Unload</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={metricsForm.hasAppointmentSystem}
                      onChange={(e) => updateMetric('hasAppointmentSystem', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Appointment System</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 pt-6 border-t">
                <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
                <textarea
                  value={metricsForm.notes}
                  onChange={(e) => updateMetric('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional observations or context..."
                />
              </div>

              {/* Save button */}
              <div className="mt-6 pt-6 border-t flex justify-end">
                <button
                  onClick={handleMetricsSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Metrics'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Audit Log</h2>
              <p className="text-sm text-gray-500 mt-1">
                Complete history of changes made to this facility.
              </p>
            </div>
            <div className="p-6">
              {auditLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No audit logs available yet.</p>
              ) : (
                <ul className="divide-y">
                  {auditLogs.map((log) => (
                    <li key={log.id} className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.user?.name || 'System'} • {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Metric input component with confidence slider
function MetricInput({
  label,
  value,
  onChange,
  confidence,
  onConfidenceChange,
  placeholder,
  unit,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  confidence: number;
  onConfidenceChange: (value: number) => void;
  placeholder: string;
  unit: string;
}) {
  const getConfidenceLabel = (v: number) => {
    if (v < 30) return 'Speculative';
    if (v < 50) return 'Estimate';
    if (v < 70) return 'Directional';
    if (v < 90) return 'Defensible';
    return 'Verified';
  };

  const getConfidenceColor = (v: number) => {
    if (v < 30) return 'text-red-600';
    if (v < 50) return 'text-orange-600';
    if (v < 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Confidence</span>
          <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}% - {getConfidenceLabel(confidence)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={confidence}
          onChange={(e) => onConfidenceChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}
