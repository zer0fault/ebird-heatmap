// react-map-gl pulls in @types/mapbox__point-geometry as a peer dependency.
// That package is a deprecated stub with no index.d.ts, so TypeScript fails
// to resolve it under moduleResolution: "bundler". This shim re-exports the
// real types from @mapbox/point-geometry, which ships its own declarations.
export * from '@mapbox/point-geometry';
