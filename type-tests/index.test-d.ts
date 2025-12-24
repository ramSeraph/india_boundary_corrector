/**
 * Type tests for @india-boundary-corrector packages
 * This file is only type-checked, not executed.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import type { Map as OLMap } from 'ol';

// Test @india-boundary-corrector/data types
import {
  getPmtilesUrl,
  setPmtilesUrl,
  getDataVersion,
  layers,
} from '@india-boundary-corrector/data';

// Verify return types
const pmtilesUrl: string = getPmtilesUrl();
const dataVersion: string = getDataVersion();
const layerNames: {
  toAddOsm: string;
  toDelOsm: string;
  toAddNe: string;
  toDelNe: string;
} = layers;

// setPmtilesUrl returns void
setPmtilesUrl('https://example.com/tiles.pmtiles');

// Test @india-boundary-corrector/layer-configs types
import {
  LayerConfig,
  LayerConfigRegistry,
  layerConfigs,
  osmCartoDark,
  osmCarto,
  type LayerConfigOptions,
} from '@india-boundary-corrector/layer-configs';

// Test LayerConfig construction
const customConfig = new LayerConfig({
  id: 'test-config',
  zoomThreshold: 6,
  tileUrlPattern: /example\.com/,
  osmAddLineColor: '#000',
  osmDelLineColor: '#fff',
  neAddLineColor: '#111',
  neDelLineColor: '#eee',
  addLineDashed: true,
  addLineDashArray: [5, 3],
  addLineHaloRatio: 0.5,
  addLineHaloAlpha: 0.3,
  lineWidthMultiplier: 1.5,
});

// Test LayerConfig properties
const configId: string = customConfig.id;
const configZoom: number = customConfig.zoomThreshold;
const configPattern: RegExp | null = customConfig.tileUrlPattern;
const matchResult: boolean = customConfig.match(['https://example.com/tile.png']);

// Test LayerConfigRegistry
const registry = new LayerConfigRegistry();
registry.register(customConfig);
const retrieved: LayerConfig | undefined = registry.get('test-config');
const detected: LayerConfig | undefined = registry.detectFromUrls(['https://example.com/tile.png']);
const ids: string[] = registry.getAvailableIds();
const removed: boolean = registry.remove('test-config');

// Test built-in configs
const darkConfig: LayerConfig = osmCartoDark;
const cartoConfig: LayerConfig = osmCarto;

// Test @india-boundary-corrector/maplibre types
import {
  BoundaryCorrector as MapLibreBoundaryCorrector,
  addBoundaryCorrector as addMapLibreCorrector,
  removeBoundaryCorrector as removeMapLibreCorrector,
  getBoundaryCorrectorConfig,
  type BoundaryCorrectorOptions as MapLibreOptions,
  type TrackedSource,
  type BoundaryCorrectorConfig,
} from '@india-boundary-corrector/maplibre';

declare const maplibreMap: MapLibreMap;

// Test MapLibre BoundaryCorrector
const maplibreCorrector = new MapLibreBoundaryCorrector(maplibreMap, {
  sourceId: 'raster-source',
  layerId: 'raster-layer',
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  layerConfig: osmCartoDark,
});

maplibreCorrector.init();
const trackedSources: Map<string, TrackedSource> = maplibreCorrector.getTrackedSources();
const hasCorrections: boolean = maplibreCorrector.hasCorrections('source-id');
maplibreCorrector.remove();

// Test addBoundaryCorrector
const corrector2 = addMapLibreCorrector(maplibreMap, { layerConfig: 'osm-carto-dark' });

// Test getBoundaryCorrectorConfig
const config: BoundaryCorrectorConfig | null = getBoundaryCorrectorConfig(maplibreMap, {
  sourceId: 'source',
});

// Test removeBoundaryCorrector
removeMapLibreCorrector(maplibreCorrector);

// Test @india-boundary-corrector/leaflet types
import {
  BoundaryCorrector as LeafletBoundaryCorrector,
  addBoundaryCorrector as addLeafletCorrector,
  removeBoundaryCorrector as removeLeafletCorrector,
  type BoundaryCorrectorOptions as LeafletOptions,
  type TrackedLayer as LeafletTrackedLayer,
} from '@india-boundary-corrector/leaflet';

declare const leafletMap: LeafletMap;
declare const tileLayer: TileLayer;

// Test Leaflet BoundaryCorrector
const leafletCorrector = new LeafletBoundaryCorrector(leafletMap, {
  tileLayer: tileLayer,
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  layerConfig: osmCartoDark,
});

leafletCorrector.init();
const trackedLayers: Map<TileLayer, LeafletTrackedLayer> = leafletCorrector.getTrackedLayers();
const leafletHasCorrections: boolean = leafletCorrector.hasCorrections(tileLayer);
const isInitialized: boolean = leafletCorrector.isInitialized();
leafletCorrector.remove();

// Test addBoundaryCorrector
const leafletCorrector2 = addLeafletCorrector(leafletMap);

// Test removeBoundaryCorrector
removeLeafletCorrector(leafletCorrector2);

// Test @india-boundary-corrector/openlayers types
import {
  BoundaryCorrector as OLBoundaryCorrector,
  addBoundaryCorrector as addOLCorrector,
  removeBoundaryCorrector as removeOLCorrector,
  type BoundaryCorrectorOptions as OLOptions,
  type TrackedLayer as OLTrackedLayer,
} from '@india-boundary-corrector/openlayers';
import type BaseLayer from 'ol/layer/Base';
import type VectorTileLayer from 'ol/layer/VectorTile';

declare const olMap: OLMap;
declare const baseLayer: BaseLayer;

// Test OpenLayers BoundaryCorrector
const olCorrector = new OLBoundaryCorrector(olMap, {
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  layerConfig: 'osm-carto',
});

olCorrector.init();
const olTrackedLayers: Map<BaseLayer, OLTrackedLayer> = olCorrector.getTrackedLayers();
const olHasCorrections: boolean = olCorrector.hasCorrections(baseLayer);
const correctionLayers: { delLayer: VectorTileLayer; addLayer: VectorTileLayer } | null = olCorrector.getCorrectionLayers(baseLayer);
const layerConfig: LayerConfig | null = olCorrector.getLayerConfig(baseLayer);
const olIsInitialized: boolean = olCorrector.isInitialized();
olCorrector.remove();

// Test addBoundaryCorrector
const olCorrector2 = addOLCorrector(olMap);

// Test removeBoundaryCorrector
removeOLCorrector(olCorrector2);
