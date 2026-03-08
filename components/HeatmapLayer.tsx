'use client';

import { Source, Layer } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import type { FeatureCollection, Point } from 'geojson';

interface Props {
  data: FeatureCollection<Point>;
}

const heatmapLayer: LayerProps = {
  id: 'biodiversity-heatmap',
  type: 'heatmap',
  paint: {
    // Weight is our normalized species count (0–1)
    'heatmap-weight': ['get', 'weight'],
    // Increase intensity at higher zoom levels
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
    // Color ramp: transparent → blue → cyan → yellow → orange → red
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,   'rgba(0, 0, 128, 0)',
      0.2, 'rgba(0, 0, 255, 0.6)',
      0.4, 'rgba(0, 200, 255, 0.8)',
      0.6, 'rgba(255, 255, 0, 0.9)',
      0.8, 'rgba(255, 128, 0, 0.95)',
      1,   'rgba(255, 0, 0, 1)',
    ],
    // Radius grows with zoom
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 10, 25, 15, 40],
    'heatmap-opacity': 0.85,
  },
};

export default function HeatmapLayer({ data }: Props) {
  return (
    <Source id="biodiversity" type="geojson" data={data}>
      <Layer {...heatmapLayer} />
    </Source>
  );
}
