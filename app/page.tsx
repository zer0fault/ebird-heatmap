'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getUserLocation } from '@/lib/geo';
import { fetchObservations } from '@/lib/ebird';
import type { Observation } from '@/lib/types';
import type { FeatureCollection, Point } from 'geojson';
import Legend from '@/components/Legend';

// MapLibre GL JS uses browser APIs — disable SSR
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

/** Group observations by location, count unique species, normalize weight 0–1. */
function buildHeatmapData(observations: Observation[]): FeatureCollection<Point> {
  const locationMap = new Map<string, { lat: number; lng: number; species: Set<string> }>();

  for (const obs of observations) {
    if (!locationMap.has(obs.locId)) {
      locationMap.set(obs.locId, { lat: obs.lat, lng: obs.lng, species: new Set() });
    }
    locationMap.get(obs.locId)!.species.add(obs.speciesCode);
  }

  const locations = Array.from(locationMap.values());
  const maxCount = Math.max(...locations.map((l) => l.species.size), 1);

  return {
    type: 'FeatureCollection',
    features: locations.map(({ lat, lng, species }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { weight: species.size / maxCount, speciesCount: species.size },
    })),
  };
}

export default function Home() {
  const [heatmapData, setHeatmapData] = useState<FeatureCollection<Point> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getUserLocation()
      .then((coords) =>
        fetchObservations({ lat: coords.lat, lng: coords.lng, dist: 50, back: 14, maxResults: 10000 })
      )
      .then((obs) => setHeatmapData(buildHeatmapData(obs)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <MapComponent heatmapData={heatmapData} />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-4 py-2 rounded text-sm">
            Loading observations…
          </div>
        </div>
      )}
      {heatmapData && <Legend />}
    </div>
  );
}
