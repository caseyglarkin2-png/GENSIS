'use client';

/**
 * GeometryEditor Component
 * 
 * Interactive map for geometry verification:
 * - Address search (forward geocode)
 * - Click-to-place centroid
 * - Drag marker refinement
 * - Draw polygon with Mapbox Draw
 * - "Cannot polygon" option with reason
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  centroidLng: number | null;
  centroidLat: number | null;
  polygonWKT: string | null;
  cannotPolygonReason: string | null;
  verificationStatus: string;
}

interface GeometryEditorProps {
  facility: Facility;
  accessToken: string;
  onSave: (geometry: {
    centroidLng: number;
    centroidLat: number;
    polygonWKT?: string;
    cannotPolygonReason?: string;
  }) => Promise<void>;
  saving: boolean;
}

const CANNOT_POLYGON_REASONS = [
  'Shared building - no clear boundary',
  'Public road access only',
  'Complex multi-tenant facility',
  'Industrial park - boundaries unclear',
  'Insufficient satellite imagery',
  'Other (specify in notes)',
];

export default function GeometryEditor({
  facility,
  accessToken,
  onSave,
  saving,
}: GeometryEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [centroid, setCentroid] = useState<[number, number] | null>(
    facility.centroidLng && facility.centroidLat
      ? [facility.centroidLng, facility.centroidLat]
      : null
  );
  const [polygon, setPolygon] = useState<GeoJSON.Polygon | null>(null);
  const [cannotPolygon, setCannotPolygon] = useState(!!facility.cannotPolygonReason);
  const [cannotPolygonReason, setCannotPolygonReason] = useState(
    facility.cannotPolygonReason || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ place_name: string; center: [number, number] }>
  >([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = accessToken;

    // Default center is facility location, or facility address geocode, or USA center
    const defaultCenter: [number, number] = centroid || [-98.5795, 39.8283];
    const defaultZoom = centroid ? 17 : 4;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: defaultCenter,
      zoom: defaultZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Initialize Draw control for polygon
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: 'simple_select',
    });
    map.current.addControl(draw.current, 'top-left');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Listen for polygon drawing
    map.current.on('draw.create', updatePolygon);
    map.current.on('draw.update', updatePolygon);
    map.current.on('draw.delete', () => setPolygon(null));

    // Click to place centroid
    map.current.on('click', (e) => {
      if (draw.current?.getMode() === 'draw_polygon') return;
      placeCentroid([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken]);

  // Initial centroid and polygon setup
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Add existing centroid marker
    if (centroid) {
      placeCentroid(centroid, false);
    }

    // Add existing polygon
    if (facility.polygonWKT && draw.current) {
      const geojson = wktToGeoJSON(facility.polygonWKT);
      if (geojson) {
        draw.current.add(geojson);
        setPolygon(geojson.geometry as GeoJSON.Polygon);
      }
    }

    // Geocode facility address if no centroid
    if (!centroid && facility.address) {
      geocodeAddress(`${facility.address}, ${facility.city}, ${facility.state} ${facility.zipCode}`);
    }
  }, [mapLoaded, facility]);

  function updatePolygon() {
    if (!draw.current) return;
    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const poly = data.features[0];
      if (poly.geometry.type === 'Polygon') {
        setPolygon(poly.geometry);
        setCannotPolygon(false);
        setCannotPolygonReason('');
      }
    }
  }

  function placeCentroid(coords: [number, number], flyTo = true) {
    setCentroid(coords);

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
    }

    if (!map.current) return;

    // Add draggable marker
    marker.current = new mapboxgl.Marker({
      color: '#3b82f6',
      draggable: true,
    })
      .setLngLat(coords)
      .addTo(map.current);

    marker.current.on('dragend', () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        setCentroid([lngLat.lng, lngLat.lat]);
      }
    });

    if (flyTo) {
      map.current.flyTo({
        center: coords,
        zoom: 17,
        essential: true,
      });
    }
  }

  // Geocode address
  async function geocodeAddress(query: string) {
    if (!query.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${accessToken}&types=address,poi&limit=5`
      );
      const data = await res.json();

      if (data.features && data.features.length > 0) {
        setSearchResults(data.features);

        // Auto-select first result if this is initial geocode
        if (!centroid && data.features[0]) {
          const [lng, lat] = data.features[0].center;
          placeCentroid([lng, lat]);
        }
      }
    } catch (err) {
      console.error('Geocode error:', err);
    } finally {
      setSearching(false);
    }
  }

  // Search handler
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await geocodeAddress(searchQuery);
    },
    [searchQuery, accessToken]
  );

  // Select search result
  const selectSearchResult = (result: { center: [number, number] }) => {
    placeCentroid([result.center[0], result.center[1]]);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Convert WKT to GeoJSON
  function wktToGeoJSON(wkt: string): GeoJSON.Feature<GeoJSON.Polygon> | null {
    // Simple WKT polygon parser
    const match = wkt.match(/POLYGON\s*\(\((.+)\)\)/i);
    if (!match) return null;

    const coords = match[1].split(',').map((pair) => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number);
      return [lng, lat] as [number, number];
    });

    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }

  // Convert GeoJSON polygon to WKT
  function polygonToWKT(poly: GeoJSON.Polygon): string {
    const coords = poly.coordinates[0]
      .map(([lng, lat]) => `${lng} ${lat}`)
      .join(', ');
    return `POLYGON((${coords}))`;
  }

  // Save geometry
  const handleSave = async () => {
    if (!centroid) {
      alert('Please set a centroid location first');
      return;
    }

    if (!cannotPolygon && !polygon) {
      const confirmContinue = confirm(
        'No polygon has been drawn. Do you want to specify a reason why a polygon cannot be created?'
      );
      if (confirmContinue) {
        setCannotPolygon(true);
        return;
      }
    }

    const geometry: {
      centroidLng: number;
      centroidLat: number;
      polygonWKT?: string;
      cannotPolygonReason?: string;
    } = {
      centroidLng: centroid[0],
      centroidLat: centroid[1],
    };

    if (polygon) {
      geometry.polygonWKT = polygonToWKT(polygon);
    } else if (cannotPolygon && cannotPolygonReason) {
      geometry.cannotPolygonReason = cannotPolygonReason;
    }

    await onSave(geometry);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an address..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              {searchResults.map((result, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {result.place_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Map container */}
      <div className="relative">
        <div ref={mapContainer} className="h-[500px] rounded-lg" />

        {/* Instructions overlay */}
        <div className="absolute top-2 right-14 bg-white rounded-lg shadow px-3 py-2 text-xs text-gray-600 max-w-xs">
          <p className="font-medium">Instructions:</p>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>Click on map to place centroid</li>
            <li>Drag marker to refine position</li>
            <li>Use polygon tool to draw boundary</li>
            <li>Click Save when complete</li>
          </ol>
        </div>
      </div>

      {/* Status display */}
      <div className="flex items-center gap-4 text-sm">
        <div className={`flex items-center gap-2 ${centroid ? 'text-green-600' : 'text-gray-400'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            {centroid ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            )}
          </svg>
          Centroid: {centroid ? `${centroid[1].toFixed(6)}, ${centroid[0].toFixed(6)}` : 'Not set'}
        </div>
        <div
          className={`flex items-center gap-2 ${
            polygon || cannotPolygon ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            {polygon || cannotPolygon ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            ) : (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            )}
          </svg>
          Polygon:{' '}
          {polygon
            ? `${polygon.coordinates[0].length} points`
            : cannotPolygon
            ? 'Cannot create'
            : 'Not drawn'}
        </div>
      </div>

      {/* Cannot polygon option */}
      <div className="border rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cannotPolygon}
            onChange={(e) => {
              setCannotPolygon(e.target.checked);
              if (e.target.checked && draw.current) {
                draw.current.deleteAll();
                setPolygon(null);
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">
            Cannot create polygon for this facility
          </span>
        </label>

        {cannotPolygon && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-2">Select reason:</label>
            <select
              value={cannotPolygonReason}
              onChange={(e) => setCannotPolygonReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason...</option>
              {CANNOT_POLYGON_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setCentroid(null);
            setPolygon(null);
            setCannotPolygon(false);
            setCannotPolygonReason('');
            if (marker.current) marker.current.remove();
            if (draw.current) draw.current.deleteAll();
          }}
          className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !centroid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Geometry'}
        </button>
      </div>
    </div>
  );
}
