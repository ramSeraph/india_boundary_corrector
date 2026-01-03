/**
 * Type tests for @india-boundary-corrector packages
 * This file is only type-checked, not executed.
 */

import type { Map as MapLibreMap } from 'maplibre-gl';
import type maplibregl from 'maplibre-gl';
import type { Map as LeafletMap } from 'leaflet';
import type L from 'leaflet';
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
  type LayerConfigOptions,
} from '@india-boundary-corrector/layer-configs';

// Test LayerConfig construction
const customConfig = new LayerConfig({
  id: 'test-config',
  zoomThreshold: 6,
  tileUrlTemplates: ['https://example.com/tiles/{z}/{x}/{y}.png'],
  lineWidthStops: { 1: 0.5, 2: 0.6, 3: 0.7, 4: 1.0, 10: 3.75 },
  lineStyles: [
    { color: '#000' },
    { color: '#111', widthFraction: 0.5, dashArray: [5, 3] },
    { color: '#222', startZoom: 5 },
    { color: '#333', endZoom: 8 },
    { color: '#444', startZoom: 3, endZoom: 6 },
    { color: '#555', alpha: 0.5 },
    { color: '#666', widthFraction: 0.8, alpha: 0.7, startZoom: 4 },
  ],
});

// Test getting configs from registry
const cartoDbDark = layerConfigs.get('cartodb-dark');
const osmCarto = layerConfigs.get('osm-carto');

// Test LayerConfig properties
const configId: string = customConfig.id;
const configZoom: number = customConfig.zoomThreshold;
const configTemplates: string[] = customConfig.tileUrlTemplates;
const matchTemplateResult: boolean = customConfig.matchTemplate(['https://example.com/tiles/{z}/{x}/{y}.png']);
const matchTileUrlResult: boolean = customConfig.matchTileUrl(['https://example.com/tiles/5/10/15.png']);
const coordsResult = customConfig.extractCoords('https://example.com/tiles/5/10/15.png');

// Test LayerConfigRegistry
const registry = new LayerConfigRegistry();
registry.register(customConfig);
const retrieved: LayerConfig | undefined = registry.get('test-config');
const detectedFromTemplates: LayerConfig | undefined = registry.detectFromTemplates(['https://example.com/tiles/{z}/{x}/{y}.png']);
const detectedFromTileUrls: LayerConfig | undefined = registry.detectFromTileUrls(['https://example.com/tiles/5/10/15.png']);
const ids: string[] = registry.getAvailableIds();
const removed: boolean = registry.remove('test-config');

// Test built-in configs from registry
const darkConfig: LayerConfig | undefined = cartoDbDark;
const cartoConfig: LayerConfig | undefined = osmCarto;

// Test @india-boundary-corrector/tilefixer types
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Test TileFixer construction
const tileFixer = new TileFixer('https://example.com/tiles.pmtiles', {
  cacheSize: 128,
});

// Test TileFixer methods
const source = tileFixer.getSource(); // PMTiles
tileFixer.clearCache();

// Test getCorrections
import type { CorrectionResult } from '@india-boundary-corrector/tilefixer';
const corrections: Promise<CorrectionResult> = tileFixer.getCorrections(4, 11, 6);

// Test fixTile
declare const rasterTile: ArrayBuffer;
const fixedTile: Promise<ArrayBuffer> = tileFixer.fixTile(
  await corrections,
  rasterTile,
  customConfig,
  10,
  256
);

// Test fetchAndFixTile
import type { FetchAndFixTileResult, FetchAndFixTileOptions } from '@india-boundary-corrector/tilefixer';
const fetchResult: Promise<FetchAndFixTileResult> = tileFixer.fetchAndFixTile(
  'https://tile.openstreetmap.org/10/512/512.png',
  10,
  512,
  512,
  customConfig,
  { tileSize: 256, mode: 'cors' }
);

// Test fetchAndFixTile result properties
const result = await fetchResult;
const resultData: ArrayBuffer = result.data;
const resultWasFixed: boolean = result.wasFixed;

// Test @india-boundary-corrector/leaflet-layer types
import { extendLeaflet } from '@india-boundary-corrector/leaflet-layer';

declare const leaflet: typeof L;

// Test extendLeaflet
extendLeaflet(leaflet);

// After extension, L.TileLayer.IndiaBoundaryCorrected and L.tileLayer.indiaBoundaryCorrected are available
// These are runtime types that TypeScript can't fully verify

// Test @india-boundary-corrector/openlayers-layer types
import {
  IndiaBoundaryCorrectedTileLayer,
  indiaBoundaryCorrectedTileLayer,
} from '@india-boundary-corrector/openlayers-layer';

// Test IndiaBoundaryCorrectedTileLayer construction
const olLayer = new IndiaBoundaryCorrectedTileLayer({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  layerConfig: 'osm-carto',
  extraLayerConfigs: [customConfig],
  tileSize: 256,
});

// Test IndiaBoundaryCorrectedTileLayer methods
const olTileFixer: TileFixer = olLayer.getTileFixer();
const olLayerConfig: LayerConfig | null = olLayer.getLayerConfig();
const olRegistry: LayerConfigRegistry = olLayer.getRegistry();

// Test factory function
const olLayer2 = indiaBoundaryCorrectedTileLayer({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
});

// Test @india-boundary-corrector/maplibre-protocol types
import {
  CorrectionProtocol,
  registerCorrectionProtocol,
} from '@india-boundary-corrector/maplibre-protocol';

declare const maplibreGl: typeof maplibregl;

// Test CorrectionProtocol construction
const protocol = new CorrectionProtocol({
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  tileSize: 256,
});

// Test CorrectionProtocol methods
protocol.addLayerConfig(customConfig);
const protocolRegistry: LayerConfigRegistry = protocol.getRegistry();
const protocolTileFixer: TileFixer = protocol.getTileFixer();
protocol.register(maplibreGl);
protocol.unregister(maplibreGl);

// Test registerCorrectionProtocol
const protocol2: CorrectionProtocol = registerCorrectionProtocol(maplibreGl, {
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
});

// Test @india-boundary-corrector/service-worker types
import {
  CorrectionServiceWorker,
  registerCorrectionServiceWorker,
  MessageTypes,
} from '@india-boundary-corrector/service-worker';

// Test MessageTypes
const msgTypes: {
  ADD_LAYER_CONFIG: string;
  REMOVE_LAYER_CONFIG: string;
  SET_PMTILES_URL: string;
  SET_ENABLED: string;
  CLEAR_CACHE: string;
  GET_STATUS: string;
} = MessageTypes;

// Test CorrectionServiceWorker construction
const sw = new CorrectionServiceWorker('./sw.js', {
  scope: './',
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
  controllerTimeout: 5000,
});

// Test CorrectionServiceWorker methods
const registerPromise: Promise<CorrectionServiceWorker> = sw.register();
const isControlling: boolean = sw.isControlling();
const unregisterPromise: Promise<boolean> = sw.unregister();
const worker: ServiceWorker | null = sw.getWorker();
const sendMsgPromise: Promise<unknown> = sw.sendMessage({ type: 'test' });
const addConfigPromise: Promise<void> = sw.addLayerConfig(customConfig);
const removeConfigPromise: Promise<void> = sw.removeLayerConfig('test-config');
const setPmtilesPromise: Promise<void> = sw.setPmtilesUrl('https://example.com/tiles.pmtiles');
const setEnabledPromise: Promise<void> = sw.setEnabled(true);
const clearCachePromise: Promise<void> = sw.clearCache();
const getStatusPromise: Promise<object> = sw.getStatus();

// Test registerCorrectionServiceWorker
const swPromise: Promise<CorrectionServiceWorker> = registerCorrectionServiceWorker('./sw.js', {
  scope: './',
  pmtilesUrl: 'https://example.com/tiles.pmtiles',
});
