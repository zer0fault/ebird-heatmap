'use client';

import { useState, useEffect } from 'react';
import ReactMapGL, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { FALLBACK } from '@/lib/geo';
import { DARK_MATTER_STYLE } from '@/lib/mapStyle';
import HeatmapLayer from '@/components/HeatmapLayer';

interface Props {
  location: { lat: number; lng: number } | null;
  heatmapData: FeatureCollection<Point> | null;
}

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export default function Map({ location, heatmapData }: Props) {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: FALLBACK.lng,
    latitude: FALLBACK.lat,
    zoom: 4,
  });

  // Center the map once when the resolved location arrives
  useEffect(() => {
    if (location) {
      setViewState({ latitude: location.lat, longitude: location.lng, zoom: 9 });
    }
  }, [location]);

  return (
    <ReactMapGL
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle={DARK_MATTER_STYLE}
    >
      <NavigationControl position="top-right" />
      {heatmapData && <HeatmapLayer data={heatmapData} />}
    </ReactMapGL>
  );
}
