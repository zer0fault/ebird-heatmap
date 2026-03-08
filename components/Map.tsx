'use client';

import { useState, useEffect } from 'react';
import ReactMapGL, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { getUserLocation, FALLBACK } from '@/lib/geo';
import { DARK_MATTER_STYLE } from '@/lib/mapStyle';
import HeatmapLayer from '@/components/HeatmapLayer';

interface Props {
  heatmapData: FeatureCollection<Point> | null;
}

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

const DEFAULT_VIEW: ViewState = {
  longitude: FALLBACK.lng,
  latitude: FALLBACK.lat,
  zoom: 4,
};

export default function Map({ heatmapData }: Props) {
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);

  useEffect(() => {
    getUserLocation().then(({ lat, lng }) => {
      setViewState({ latitude: lat, longitude: lng, zoom: 9 });
    });
  }, []);

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
