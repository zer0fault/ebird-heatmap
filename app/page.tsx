'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getUserLocation } from '@/lib/geo';
import { fetchObservations, fetchSpecies } from '@/lib/ebird';
import type { Observation, TaxonomyEntry } from '@/lib/types';
import type { FeatureCollection, Point } from 'geojson';
import Legend from '@/components/Legend';
import ControlPanel, { type Mode } from '@/components/ControlPanel';

// MapLibre GL JS uses browser APIs — disable SSR
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

/** Group by location, count unique species, normalize weight 0–1. */
function buildBiodiversityData(observations: Observation[]): FeatureCollection<Point> {
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

/** Group by location, sum howMany counts, normalize weight 0–1. */
function buildSpeciesData(observations: Observation[]): FeatureCollection<Point> {
  const locationMap = new Map<string, { lat: number; lng: number; count: number }>();

  for (const obs of observations) {
    const count = obs.howMany ?? 1;
    const existing = locationMap.get(obs.locId);
    if (existing) {
      existing.count += count;
    } else {
      locationMap.set(obs.locId, { lat: obs.lat, lng: obs.lng, count });
    }
  }

  const locations = Array.from(locationMap.values());
  const maxCount = Math.max(...locations.map((l) => l.count), 1);

  return {
    type: 'FeatureCollection',
    features: locations.map(({ lat, lng, count }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: { weight: count / maxCount, speciesCount: count },
    })),
  };
}

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [biodiversityData, setBiodiversityData] = useState<FeatureCollection<Point> | null>(null);
  const [speciesData, setSpeciesData] = useState<FeatureCollection<Point> | null>(null);
  const [mode, setMode] = useState<Mode>('biodiversity');
  const [selectedSpecies, setSelectedSpecies] = useState<TaxonomyEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const heatmapData = mode === 'biodiversity' ? biodiversityData : speciesData;
  const resultCount = mode === 'species' && speciesData ? speciesData.features.length : null;

  // Load biodiversity data on mount
  useEffect(() => {
    setIsLoading(true);
    getUserLocation()
      .then((coords) => {
        setLocation(coords);
        return fetchObservations({ lat: coords.lat, lng: coords.lng, dist: 50, back: 14, maxResults: 10000 });
      })
      .then((obs) => setBiodiversityData(buildBiodiversityData(obs)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  function handleSpeciesSelect(species: TaxonomyEntry) {
    if (!location) return;
    setSelectedSpecies(species);
    setSpeciesData(null);
    setIsLoading(true);
    fetchSpecies({
      lat: location.lat,
      lng: location.lng,
      dist: 50,
      back: 14,
      maxResults: 10000,
      speciesCode: species.speciesCode,
    })
      .then((obs) => setSpeciesData(buildSpeciesData(obs)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    if (newMode === 'biodiversity') {
      setSelectedSpecies(null);
      setSpeciesData(null);
    }
  }

  return (
    <div className="relative w-screen h-screen">
      <MapComponent location={location} heatmapData={heatmapData} />
      <ControlPanel
        mode={mode}
        onModeChange={handleModeChange}
        onSpeciesSelect={handleSpeciesSelect}
        selectedSpecies={selectedSpecies}
        resultCount={resultCount}
      />
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
