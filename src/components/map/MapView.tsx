'use client';

/**
 * MapView Component
 * 
 * Primary map interface for the Facility Command Center.
 * Renders Mapbox GL JS map with facility markers, clustering,
 * and interactive popups.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types for facility data
export interface FacilityMapData {
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
}

interface MapViewProps {
  facilities: FacilityMapData[];
  accessToken: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  onFacilityClick?: (facility: FacilityMapData) => void;
  onFacilityHover?: (facility: FacilityMapData | null) => void;
  selectedFacilityId?: string | null;
  className?: string;
}

// Verification status colors
const STATUS_COLORS: Record<string, string> = {
  VERIFIED: '#22c55e',     // green-500
  PENDING: '#eab308',      // yellow-500
  NEEDS_REVIEW: '#f97316', // orange-500
  UNVERIFIED: '#ef4444',   // red-500
};

export default function MapView({
  facilities,
  accessToken,
  initialCenter = [-98.5795, 39.8283], // Center of USA
  initialZoom = 4,
  onFacilityClick,
  onFacilityHover,
  selectedFacilityId,
  className = '',
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convert facilities to GeoJSON
  const facilitiesGeoJSON = useCallback(() => {
    const features = facilities
      .filter((f) => f.centroidLng !== null && f.centroidLat !== null)
      .map((facility) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [facility.centroidLng!, facility.centroidLat!],
        },
        properties: {
          id: facility.id,
          name: facility.name,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          verificationStatus: facility.verificationStatus,
          dataCompleteness: facility.dataCompleteness,
          hasPolygon: facility.hasPolygon,
          color: STATUS_COLORS[facility.verificationStatus] || STATUS_COLORS.UNVERIFIED,
        },
      }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [facilities]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = accessToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    );

    popup.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken, initialCenter, initialZoom]);

  // Add/update facility layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const geojson = facilitiesGeoJSON();

    // Add or update source
    const source = map.current.getSource('facilities') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    } else {
      map.current.addSource('facilities', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'facilities',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6', // < 10: light blue
            10,
            '#f1f075', // 10-50: yellow
            50,
            '#f28cb1', // 50+: pink
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            50,
            40,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'facilities',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
      });

      // Individual facility points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'facilities',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'case',
            ['==', ['get', 'id'], selectedFacilityId || ''],
            12,
            8,
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'id'], selectedFacilityId || ''],
            3,
            2,
          ],
          'circle-stroke-color': '#fff',
        },
      });

      // Click on cluster to zoom
      map.current.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters'],
        });
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current!.getSource('facilities') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.current!.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom!,
          });
        });
      });

      // Click on individual facility
      map.current.on('click', 'unclustered-point', (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties;
        if (props && onFacilityClick) {
          const facility = facilities.find((f) => f.id === props.id);
          if (facility) {
            onFacilityClick(facility);
          }
        }
      });

      // Hover effects
      map.current.on('mouseenter', 'unclustered-point', (e) => {
        if (!map.current || !e.features?.[0]) return;
        
        map.current.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        // Show popup
        popup.current?.setLngLat(coords).setHTML(`
          <div class="p-2 min-w-[200px]">
            <div class="font-semibold text-gray-900">${props?.name || 'Unknown'}</div>
            <div class="text-sm text-gray-600">${props?.address || ''}</div>
            <div class="text-sm text-gray-600">${props?.city || ''}, ${props?.state || ''}</div>
            <div class="mt-2 flex items-center gap-2">
              <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${props?.color}"></span>
              <span class="text-xs font-medium capitalize">${props?.verificationStatus?.toLowerCase().replace('_', ' ') || 'Unknown'}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Data Completeness: ${props?.dataCompleteness || 0}%
            </div>
          </div>
        `).addTo(map.current);

        if (onFacilityHover) {
          const facility = facilities.find((f) => f.id === props?.id);
          onFacilityHover(facility || null);
        }
      });

      map.current.on('mouseleave', 'unclustered-point', () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.current?.remove();
        if (onFacilityHover) {
          onFacilityHover(null);
        }
      });

      // Change cursor on cluster hover
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }
  }, [mapLoaded, facilities, facilitiesGeoJSON, onFacilityClick, onFacilityHover, selectedFacilityId]);

  // Update selected facility highlight
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (map.current.getLayer('unclustered-point')) {
      map.current.setPaintProperty('unclustered-point', 'circle-radius', [
        'case',
        ['==', ['get', 'id'], selectedFacilityId || ''],
        12,
        8,
      ]);
      map.current.setPaintProperty('unclustered-point', 'circle-stroke-width', [
        'case',
        ['==', ['get', 'id'], selectedFacilityId || ''],
        3,
        2,
      ]);
    }
  }, [selectedFacilityId, mapLoaded]);

  // Fly to selected facility
  useEffect(() => {
    if (!map.current || !selectedFacilityId) return;

    const facility = facilities.find((f) => f.id === selectedFacilityId);
    if (facility && facility.centroidLng && facility.centroidLat) {
      map.current.flyTo({
        center: [facility.centroidLng, facility.centroidLat],
        zoom: 15,
        essential: true,
      });
    }
  }, [selectedFacilityId, facilities]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-xs font-semibold text-gray-700 mb-2">Verification Status</div>
        <div className="space-y-1">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {status.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Facility count badge */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
        <div className="text-sm font-medium text-gray-900">
          {facilities.filter((f) => f.centroidLng && f.centroidLat).length} / {facilities.length}
        </div>
        <div className="text-xs text-gray-500">Facilities mapped</div>
      </div>
    </div>
  );
}
