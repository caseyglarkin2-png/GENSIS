'use client';

/**
 * FacilityList Component
 * 
 * Sidebar list of facilities with search, filter, and sort.
 * Shows verification status, completeness, and links to detail pages.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { FacilityMapData } from './MapView';

interface FacilityListProps {
  facilities: FacilityMapData[];
  networkId: string;
  selectedFacilityId?: string | null;
  onFacilitySelect?: (facility: FacilityMapData) => void;
  className?: string;
}

type SortOption = 'name' | 'status' | 'completeness';
type StatusFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'NEEDS_REVIEW' | 'UNVERIFIED';

const STATUS_ORDER = {
  UNVERIFIED: 0,
  NEEDS_REVIEW: 1,
  PENDING: 2,
  VERIFIED: 3,
};

const STATUS_COLORS = {
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  NEEDS_REVIEW: 'bg-orange-100 text-orange-800',
  UNVERIFIED: 'bg-red-100 text-red-800',
};

export default function FacilityList({
  facilities,
  networkId,
  selectedFacilityId,
  onFacilitySelect,
  className = '',
}: FacilityListProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let filtered = facilities;

    // Search filter - includes address, city, state, zip code
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.city.toLowerCase().includes(searchLower) ||
          f.state.toLowerCase().includes(searchLower) ||
          f.zipCode.toLowerCase().includes(searchLower) ||
          f.address.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((f) => f.verificationStatus === statusFilter);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return STATUS_ORDER[a.verificationStatus] - STATUS_ORDER[b.verificationStatus];
        case 'completeness':
          return b.dataCompleteness - a.dataCompleteness;
        default:
          return 0;
      }
    });
  }, [facilities, search, sortBy, statusFilter]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: facilities.length,
      VERIFIED: 0,
      PENDING: 0,
      NEEDS_REVIEW: 0,
      UNVERIFIED: 0,
    };
    facilities.forEach((f) => {
      counts[f.verificationStatus as StatusFilter]++;
    });
    return counts;
  }, [facilities]);

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, address, city, state, or zip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {search && (
          <p className="mt-2 text-xs text-gray-500">
            {filteredFacilities.length} {filteredFacilities.length === 1 ? 'result' : 'results'} found
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 border-b space-y-3">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'UNVERIFIED', 'PENDING', 'VERIFIED'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
              <span className="ml-1 opacity-75">({statusCounts[status]})</span>
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="completeness">Completeness</option>
          </select>
        </div>
      </div>

      {/* Facility list */}
      <div className="flex-1 overflow-y-auto">
        {filteredFacilities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No facilities found</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-blue-600 text-sm hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredFacilities.map((facility) => (
              <li key={facility.id}>
                <button
                  onClick={() => onFacilitySelect?.(facility)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedFacilityId === facility.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {facility.name}
                      </h3>
                      {facility.address && (
                        <p className="text-xs text-gray-500 truncate">
                          {facility.address}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 truncate">
                        {facility.city}, {facility.state} {facility.zipCode}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_COLORS[facility.verificationStatus]
                      }`}
                    >
                      {facility.verificationStatus === 'NEEDS_REVIEW'
                        ? 'Review'
                        : facility.verificationStatus.charAt(0) +
                          facility.verificationStatus.slice(1).toLowerCase()}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Data completeness</span>
                      <span>{facility.dataCompleteness}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          facility.dataCompleteness >= 70
                            ? 'bg-green-500'
                            : facility.dataCompleteness >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${facility.dataCompleteness}%` }}
                      />
                    </div>
                  </div>

                  {/* Location indicator */}
                  {!facility.centroidLng && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      No location set
                    </div>
                  )}
                </button>

                {/* View detail link */}
                {selectedFacilityId === facility.id && (
                  <div className="px-4 pb-3 bg-blue-50">
                    <Link
                      href={`/networks/${networkId}/facilities/${facility.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Summary footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredFacilities.length} of {facilities.length}
          </span>
          <Link
            href={`/networks/${networkId}/import`}
            className="text-blue-600 hover:underline"
          >
            Import facilities
          </Link>
        </div>
      </div>
    </div>
  );
}
