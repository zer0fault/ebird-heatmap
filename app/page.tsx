'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getUserLocation } from '@/lib/geo';
import { fetchObservations, fetchSpecies, fetchNotable } from '@/lib/ebird';
import { getCached, setCached, type CacheInfo } from '@/lib/cache';
import type { Observation, TaxonomyEntry } from '@/lib/types';
import type { FeatureCollection, Point } from 'geojson';
import Legend from '@/components/Legend';
import ControlPanel, { type Mode } from '@/components/ControlPanel';

// MapLibre GL JS uses browser APIs — disable SSR
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

const MAX_RESULTS = 10000;

/** Round coords to 4 decimal places (~11m) to avoid cache misses from float drift. */
function makeCacheKey(mode: string, lat: number, lng: number, dist: number, back: number, extra?: string): string {
  const base = `ebird:${mode}:${lat.toFixed(4)}:${lng.toFixed(4)}:${dist}:${back}`;
  return extra ? `${base}:${extra}` : base;
}

/**
 * Check cache first; on miss, call fetcher, store the result, and return it.
 * Pass forceRefresh=true to skip the cache read (still writes after fetching).
 */
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  forceRefresh = false,
): Promise<{ data: T; fromCache: boolean; ts: number }> {
  if (!forceRefresh) {
    const cached = await getCached<T>(key);
    if (cached) return { data: cached.data, fromCache: true, ts: cached.ts };
  }
  const data = await fetcher();
  const ts = await setCached(key, data);
  return { data, fromCache: false, ts };
}

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

/** Map each notable observation to a GeoJSON point with popup properties. */
function buildNotableData(observations: Observation[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: observations.map((obs) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [obs.lng, obs.lat] },
      properties: {
        comName: obs.comName,
        locName: obs.locName,
        obsDt: obs.obsDt,
        howMany: obs.howMany,
        obsReviewed: obs.obsReviewed,
      },
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
      properties: { weight: count / maxCount, individualCount: count },
    })),
  };
}

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [biodiversityData, setBiodiversityData] = useState<FeatureCollection<Point> | null>(null);
  const [speciesData, setSpeciesData] = useState<FeatureCollection<Point> | null>(null);
  const [notableData, setNotableData] = useState<FeatureCollection<Point> | null>(null);
  const [mode, setMode] = useState<Mode>('biodiversity');
  const [selectedSpecies, setSelectedSpecies] = useState<TaxonomyEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [back, setBack] = useState(14);
  const [dist, setDist] = useState(50);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  const heatmapData = mode === 'notable' ? null : (mode === 'biodiversity' ? biodiversityData : speciesData);
  const resultCount = mode === 'species' && speciesData ? speciesData.features.length : null;

  // Load biodiversity data on mount
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const coords = await getUserLocation();
        setLocation(coords);
        const key = makeCacheKey('biodiversity', coords.lat, coords.lng, dist, back);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchObservations({ lat: coords.lat, lng: coords.lng, dist, back, maxResults: MAX_RESULTS })
        );
        setBiodiversityData(buildBiodiversityData(data));
        setCacheInfo({ fromCache, ts });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSpeciesSelect(species: TaxonomyEntry) {
    if (!location) return;
    setSelectedSpecies(species);
    setSpeciesData(null);
    setIsLoading(true);
    try {
      const key = makeCacheKey('species', location.lat, location.lng, dist, back, species.speciesCode);
      const { data, fromCache, ts } = await fetchWithCache(key, () =>
        fetchSpecies({ lat: location.lat, lng: location.lng, dist, back, maxResults: MAX_RESULTS, speciesCode: species.speciesCode })
      );
      setSpeciesData(buildSpeciesData(data));
      setCacheInfo({ fromCache, ts });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleModeChange(newMode: Mode) {
    setMode(newMode);
    if (newMode === 'biodiversity') {
      setSelectedSpecies(null);
      setSpeciesData(null);
      setCacheInfo(null); // biodiversity cacheInfo was lost; clear until next fetch
      return;
    }
    if (newMode === 'species') {
      setCacheInfo(null); // will update when a species is selected
    }
    if (newMode === 'notable' && location && !notableData) {
      setIsLoading(true);
      try {
        const key = makeCacheKey('notable', location.lat, location.lng, dist, back);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchNotable({ lat: location.lat, lng: location.lng, dist, back, maxResults: MAX_RESULTS })
        );
        setNotableData(buildNotableData(data));
        setCacheInfo({ fromCache, ts });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function handleFilterChange(newBack: number, newDist: number) {
    if (!location) return;
    setBack(newBack);
    setDist(newDist);
    setBiodiversityData(null);
    setSpeciesData(null);
    setNotableData(null);
    setCacheInfo(null);

    if (mode === 'biodiversity') {
      setIsLoading(true);
      try {
        const key = makeCacheKey('biodiversity', location.lat, location.lng, newDist, newBack);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchObservations({ lat: location.lat, lng: location.lng, dist: newDist, back: newBack, maxResults: MAX_RESULTS })
        );
        setBiodiversityData(buildBiodiversityData(data));
        setCacheInfo({ fromCache, ts });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'species' && selectedSpecies) {
      setIsLoading(true);
      try {
        const key = makeCacheKey('species', location.lat, location.lng, newDist, newBack, selectedSpecies.speciesCode);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchSpecies({ lat: location.lat, lng: location.lng, dist: newDist, back: newBack, maxResults: MAX_RESULTS, speciesCode: selectedSpecies.speciesCode })
        );
        setSpeciesData(buildSpeciesData(data));
        setCacheInfo({ fromCache, ts });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else if (mode === 'notable') {
      setIsLoading(true);
      try {
        const key = makeCacheKey('notable', location.lat, location.lng, newDist, newBack);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchNotable({ lat: location.lat, lng: location.lng, dist: newDist, back: newBack, maxResults: MAX_RESULTS })
        );
        setNotableData(buildNotableData(data));
        setCacheInfo({ fromCache, ts });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    // mode === 'species' with no species selected: cache cleared, no fetch needed
  }

  async function handleRefresh() {
    if (!location) return;
    // forceRefresh=true in fetchWithCache overwrites the key — no need to clear all
    setBiodiversityData(null);
    setSpeciesData(null);
    setNotableData(null);
    setCacheInfo(null);
    setIsLoading(true);
    try {
      if (mode === 'biodiversity') {
        const key = makeCacheKey('biodiversity', location.lat, location.lng, dist, back);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchObservations({ lat: location.lat, lng: location.lng, dist, back, maxResults: MAX_RESULTS }), true
        );
        setBiodiversityData(buildBiodiversityData(data));
        setCacheInfo({ fromCache, ts });
      } else if (mode === 'species' && selectedSpecies) {
        const key = makeCacheKey('species', location.lat, location.lng, dist, back, selectedSpecies.speciesCode);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchSpecies({ lat: location.lat, lng: location.lng, dist, back, maxResults: MAX_RESULTS, speciesCode: selectedSpecies.speciesCode }), true
        );
        setSpeciesData(buildSpeciesData(data));
        setCacheInfo({ fromCache, ts });
      } else if (mode === 'notable') {
        const key = makeCacheKey('notable', location.lat, location.lng, dist, back);
        const { data, fromCache, ts } = await fetchWithCache(key, () =>
          fetchNotable({ lat: location.lat, lng: location.lng, dist, back, maxResults: MAX_RESULTS }), true
        );
        setNotableData(buildNotableData(data));
        setCacheInfo({ fromCache, ts });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative w-screen h-screen">
      <MapComponent location={location} heatmapData={heatmapData} notableData={mode === 'notable' ? notableData : null} />
      <ControlPanel
        mode={mode}
        onModeChange={handleModeChange}
        onSpeciesSelect={handleSpeciesSelect}
        selectedSpecies={selectedSpecies}
        resultCount={resultCount}
        back={back}
        dist={dist}
        onFilterChange={handleFilterChange}
        cacheInfo={cacheInfo}
        onRefresh={handleRefresh}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-4 py-2 rounded text-sm">
            Loading observations…
          </div>
        </div>
      )}
      {heatmapData && mode !== 'notable' && <Legend />}
    </div>
  );
}
