'use client';

import { useState, useEffect } from 'react';
import { Source, Layer, Popup, useMap } from 'react-map-gl/maplibre';
import type { LayerProps } from 'react-map-gl/maplibre';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';

interface Props {
  data: FeatureCollection<Point>;
}

interface PopupInfo {
  lng: number;
  lat: number;
  comName: string;
  locName: string;
  obsDt: string;
  howMany: number | null;
  obsReviewed: boolean;
}

// Cluster circles — color steps by count
const clusterLayer: LayerProps = {
  id: 'notable-clusters',
  type: 'circle',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#f59e0b', 10,
      '#ef4444', 30,
      '#b91c1c',
    ],
    'circle-radius': ['step', ['get', 'point_count'], 14, 10, 20, 30, 26],
    'circle-opacity': 0.85,
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1,
  },
};

// Count label inside each cluster
const clusterCountLayer: LayerProps = {
  id: 'notable-cluster-count',
  type: 'symbol',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 12,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

// Individual point — yellow = unreviewed, red = reviewed/confirmed rare
const pointLayer: LayerProps = {
  id: 'notable-points',
  type: 'circle',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-radius': 7,
    'circle-color': ['case', ['get', 'obsReviewed'], '#ef4444', '#f59e0b'],
    'circle-stroke-color': '#ffffff',
    'circle-stroke-width': 1.5,
    'circle-opacity': 0.9,
  },
};

export default function NotableMarkersLayer({ data }: Props) {
  const { current: map } = useMap();
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

  useEffect(() => {
    if (!map) return;
    const canvas = map.getCanvas();

    function onPointClick(e: Parameters<Parameters<typeof map.on>[2]>[0]) {
      const features = map.queryRenderedFeatures(e.point, { layers: ['notable-points'] });
      if (!features.length) return;
      const f = features[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      setPopupInfo({
        lng: coords[0],
        lat: coords[1],
        comName: f.properties?.comName ?? '',
        locName: f.properties?.locName ?? '',
        obsDt: f.properties?.obsDt ?? '',
        howMany: f.properties?.howMany ?? null,
        obsReviewed: Boolean(f.properties?.obsReviewed),
      });
    }

    async function onClusterClick(e: Parameters<Parameters<typeof map.on>[2]>[0]) {
      const features = map.queryRenderedFeatures(e.point, { layers: ['notable-clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id as number;
      const source = map.getSource('notable') as GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom });
      } catch {
        // ignore
      }
    }

    function setCursorPointer() { canvas.style.cursor = 'pointer'; }
    function resetCursor() { canvas.style.cursor = ''; }

    map.on('click', onPointClick);
    map.on('click', onClusterClick);
    map.on('mouseenter', 'notable-points', setCursorPointer);
    map.on('mouseleave', 'notable-points', resetCursor);
    map.on('mouseenter', 'notable-clusters', setCursorPointer);
    map.on('mouseleave', 'notable-clusters', resetCursor);

    return () => {
      map.off('click', onPointClick);
      map.off('click', onClusterClick);
      map.off('mouseenter', 'notable-points', setCursorPointer);
      map.off('mouseleave', 'notable-points', resetCursor);
      map.off('mouseenter', 'notable-clusters', setCursorPointer);
      map.off('mouseleave', 'notable-clusters', resetCursor);
    };
  }, [map]);

  return (
    <>
      <Source
        id="notable"
        type="geojson"
        data={data}
        cluster={true}
        clusterMaxZoom={12}
        clusterRadius={40}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
        <Layer {...pointLayer} />
      </Source>

      {popupInfo && (
        <Popup
          longitude={popupInfo.lng}
          latitude={popupInfo.lat}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeButton={true}
          maxWidth="240px"
        >
          <div style={{ padding: '4px 2px', fontSize: '13px', lineHeight: '1.6', color: '#111' }}>
            <div style={{ fontWeight: 700, color: '#000' }}>{popupInfo.comName}</div>
            <div style={{ color: '#333', fontSize: '12px' }}>{popupInfo.locName}</div>
            <div style={{ color: '#333', fontSize: '12px' }}>{popupInfo.obsDt}</div>
            {popupInfo.howMany !== null && (
              <div style={{ color: '#111', fontSize: '12px' }}>Count: {popupInfo.howMany}</div>
            )}
            <div style={{ fontSize: '11px', marginTop: '2px', fontWeight: 600, color: popupInfo.obsReviewed ? '#dc2626' : '#b45309' }}>
              {popupInfo.obsReviewed ? '● Confirmed rare' : '● Pending review'}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
