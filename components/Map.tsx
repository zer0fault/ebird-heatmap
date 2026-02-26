'use client';

import { useState, useEffect } from 'react';
import ReactMapGL, { NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getUserLocation } from '@/lib/geo';

// CartoDB DarkMatter — free, no account required
const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark' }],
};

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

const DEFAULT_VIEW: ViewState = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 4,
};

export default function Map() {
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
      mapStyle={MAP_STYLE}
    >
      <NavigationControl position="top-right" />
    </ReactMapGL>
  );
}
