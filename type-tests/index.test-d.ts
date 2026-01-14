/**
 * Type tests for @india-boundary-corrector packages
 * Uses expect-type for robust type checking.
 * This file is only type-checked, not executed.
 */

import { expectTypeOf } from 'expect-type';
import type maplibregl from 'maplibre-gl';
import type L from 'leaflet';
import type { PMTiles } from 'pmtiles';

// ============================================================================
// @india-boundary-corrector/data
// ============================================================================
import {
  getPmtilesUrl,
  setPmtilesUrl,
  getDataVersion,
  resolvePmtilesUrl,
  DEFAULT_CDN_URL,
} from '@india-boundary-corrector/data';

// Function signatures
expectTypeOf(getPmtilesUrl).toBeFunction();
expectTypeOf(getPmtilesUrl).parameters.toEqualTypeOf<[]>();
expectTypeOf(getPmtilesUrl).returns.toBeString();

expectTypeOf(setPmtilesUrl).toBeFunction();
expectTypeOf(setPmtilesUrl).parameters.toEqualTypeOf<[url: string]>();
expectTypeOf(setPmtilesUrl).returns.toBeVoid();

expectTypeOf(getDataVersion).toBeFunction();
expectTypeOf(getDataVersion).parameters.toEqualTypeOf<[]>();
expectTypeOf(getDataVersion).returns.toBeString();

expectTypeOf(resolvePmtilesUrl).toBeFunction();
expectTypeOf(resolvePmtilesUrl).parameters.toEqualTypeOf<[scriptUrl: string]>();
expectTypeOf(resolvePmtilesUrl).returns.toBeString();

// Exports
expectTypeOf(DEFAULT_CDN_URL).toBeString();

// ============================================================================
// @india-boundary-corrector/layer-configs
// ============================================================================
import {
  LayerConfig,
  LayerConfigRegistry,
  layerConfigs,
  INFINITY,
  MIN_LINE_WIDTH,
  type LayerConfigOptions,
  type LineStyle,
  type TileCoords,
  type ParsedTileUrl,
} from '@india-boundary-corrector/layer-configs';

// Constants
expectTypeOf(INFINITY).toEqualTypeOf<-1>();
expectTypeOf(MIN_LINE_WIDTH).toBeNumber();

// LayerConfig class
expectTypeOf(LayerConfig).toBeConstructibleWith({
  id: 'test',
  lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
});

// LayerConfig instance properties
expectTypeOf<LayerConfig>().toHaveProperty('id').toBeString();
expectTypeOf<LayerConfig>().toHaveProperty('tileUrlTemplates').toEqualTypeOf<string[]>();
expectTypeOf<LayerConfig>().toHaveProperty('lineWidthStops').toEqualTypeOf<Record<number, number>>();
expectTypeOf<LayerConfig>().toHaveProperty('lineStyles').toEqualTypeOf<LineStyle[]>();

// LayerConfig instance methods
expectTypeOf<LayerConfig>().toHaveProperty('getLineStylesForZoom').toBeFunction();
expectTypeOf<LayerConfig['getLineStylesForZoom']>().parameters.toEqualTypeOf<[z: number]>();
expectTypeOf<LayerConfig['getLineStylesForZoom']>().returns.toEqualTypeOf<LineStyle[]>();

expectTypeOf<LayerConfig>().toHaveProperty('getLayerSuffixesForZoom').toBeFunction();
expectTypeOf<LayerConfig['getLayerSuffixesForZoom']>().parameters.toEqualTypeOf<[z: number]>();
expectTypeOf<LayerConfig['getLayerSuffixesForZoom']>().returns.toEqualTypeOf<string[]>();

expectTypeOf<LayerConfig>().toHaveProperty('matchTemplate').toBeFunction();
expectTypeOf<LayerConfig['matchTemplate']>().parameters.toEqualTypeOf<[templates: string | string[]]>();
expectTypeOf<LayerConfig['matchTemplate']>().returns.toBeBoolean();

expectTypeOf<LayerConfig>().toHaveProperty('matchTileUrl').toBeFunction();
expectTypeOf<LayerConfig['matchTileUrl']>().parameters.toEqualTypeOf<[tiles: string | string[]]>();
expectTypeOf<LayerConfig['matchTileUrl']>().returns.toBeBoolean();

expectTypeOf<LayerConfig>().toHaveProperty('extractCoords').toBeFunction();
expectTypeOf<LayerConfig['extractCoords']>().parameters.toEqualTypeOf<[url: string]>();
expectTypeOf<LayerConfig['extractCoords']>().returns.toEqualTypeOf<TileCoords | null>();

expectTypeOf<LayerConfig>().toHaveProperty('getLineWidth').toBeFunction();
expectTypeOf<LayerConfig['getLineWidth']>().parameters.toEqualTypeOf<[zoom: number]>();
expectTypeOf<LayerConfig['getLineWidth']>().returns.toBeNumber();

expectTypeOf<LayerConfig>().toHaveProperty('toJSON').toBeFunction();
expectTypeOf<LayerConfig['toJSON']>().returns.toEqualTypeOf<LayerConfigOptions>();

expectTypeOf(LayerConfig.fromJSON).toBeFunction();
expectTypeOf(LayerConfig.fromJSON).parameters.toEqualTypeOf<[obj: LayerConfigOptions]>();
expectTypeOf(LayerConfig.fromJSON).returns.toEqualTypeOf<LayerConfig>();

// LineStyle interface
expectTypeOf<LineStyle>().toHaveProperty('color').toBeString();
expectTypeOf<LineStyle>().toHaveProperty('layerSuffix').toBeString();
expectTypeOf<LineStyle>().toHaveProperty('widthFraction').toEqualTypeOf<number | undefined>();
expectTypeOf<LineStyle>().toHaveProperty('dashArray').toEqualTypeOf<number[] | undefined>();
expectTypeOf<LineStyle>().toHaveProperty('alpha').toEqualTypeOf<number | undefined>();
expectTypeOf<LineStyle>().toHaveProperty('startZoom').toEqualTypeOf<number | undefined>();
expectTypeOf<LineStyle>().toHaveProperty('endZoom').toEqualTypeOf<number | undefined>();
expectTypeOf<LineStyle>().toHaveProperty('lineExtensionFactor').toEqualTypeOf<number | undefined>();

// TileCoords interface
expectTypeOf<TileCoords>().toEqualTypeOf<{ z: number; x: number; y: number }>();

// LayerConfigRegistry class
expectTypeOf(LayerConfigRegistry).toBeConstructibleWith();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('get').toBeFunction();
expectTypeOf<LayerConfigRegistry['get']>().parameters.toEqualTypeOf<[id: string]>();
expectTypeOf<LayerConfigRegistry['get']>().returns.toEqualTypeOf<LayerConfig | undefined>();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('register').toBeFunction();
expectTypeOf<LayerConfigRegistry['register']>().parameters.toEqualTypeOf<[config: LayerConfig]>();
expectTypeOf<LayerConfigRegistry['register']>().returns.toBeVoid();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('remove').toBeFunction();
expectTypeOf<LayerConfigRegistry['remove']>().parameters.toEqualTypeOf<[id: string]>();
expectTypeOf<LayerConfigRegistry['remove']>().returns.toBeBoolean();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('detectFromTemplates').toBeFunction();
expectTypeOf<LayerConfigRegistry['detectFromTemplates']>().parameters.toEqualTypeOf<[templates: string | string[]]>();
expectTypeOf<LayerConfigRegistry['detectFromTemplates']>().returns.toEqualTypeOf<LayerConfig | undefined>();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('detectFromTileUrls').toBeFunction();
expectTypeOf<LayerConfigRegistry['detectFromTileUrls']>().parameters.toEqualTypeOf<[urls: string | string[]]>();
expectTypeOf<LayerConfigRegistry['detectFromTileUrls']>().returns.toEqualTypeOf<LayerConfig | undefined>();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('getAvailableIds').toBeFunction();
expectTypeOf<LayerConfigRegistry['getAvailableIds']>().parameters.toEqualTypeOf<[]>();
expectTypeOf<LayerConfigRegistry['getAvailableIds']>().returns.toEqualTypeOf<string[]>();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('createMergedRegistry').toBeFunction();
expectTypeOf<LayerConfigRegistry['createMergedRegistry']>().returns.toEqualTypeOf<LayerConfigRegistry>();

expectTypeOf<LayerConfigRegistry>().toHaveProperty('parseTileUrl').toBeFunction();
expectTypeOf<LayerConfigRegistry['parseTileUrl']>().parameters.toEqualTypeOf<[url: string]>();
expectTypeOf<LayerConfigRegistry['parseTileUrl']>().returns.toEqualTypeOf<ParsedTileUrl | null>();

// Default registry export
expectTypeOf(layerConfigs).toEqualTypeOf<LayerConfigRegistry>();

// ============================================================================
// @india-boundary-corrector/tilefixer
// ============================================================================
import {
  TileFixer,
  TileFetchError,
  type CorrectionResult,
  type FetchAndFixTileResult,
  type FetchAndFixTileFetchOptions,
  type TileFixerOptions,
  type Feature,
} from '@india-boundary-corrector/tilefixer';

// TileFetchError class
expectTypeOf(TileFetchError).toBeConstructibleWith(404);
expectTypeOf(TileFetchError).toBeConstructibleWith(404, 'https://example.com/tile.png');
expectTypeOf(TileFetchError).toBeConstructibleWith(404, 'https://example.com/tile.png', 'Not found');
expectTypeOf<TileFetchError>().toHaveProperty('status').toBeNumber();
expectTypeOf<TileFetchError>().toHaveProperty('url').toEqualTypeOf<string | undefined>();
expectTypeOf<TileFetchError>().toHaveProperty('body').toEqualTypeOf<string | undefined>();
expectTypeOf(TileFetchError.fromResponse).toBeFunction();
expectTypeOf(TileFetchError.fromResponse).returns.toEqualTypeOf<Promise<TileFetchError>>();

// TileFixer static methods
expectTypeOf(TileFixer.setDefaultCacheMaxFeatures).toBeFunction();
expectTypeOf(TileFixer.setDefaultCacheMaxFeatures).parameters.toEqualTypeOf<[maxFeatures: number]>();
expectTypeOf(TileFixer.setDefaultCacheMaxFeatures).returns.toBeVoid();

expectTypeOf(TileFixer.getOrCreate).toBeFunction();
expectTypeOf(TileFixer.getOrCreate).parameters.toEqualTypeOf<[pmtilesUrl: string]>();
expectTypeOf(TileFixer.getOrCreate).returns.toEqualTypeOf<TileFixer>();

// TileFixer constructor
expectTypeOf(TileFixer).toBeConstructibleWith('https://example.com/tiles.pmtiles');
expectTypeOf(TileFixer).toBeConstructibleWith('https://example.com/tiles.pmtiles', {});
expectTypeOf(TileFixer).toBeConstructibleWith('https://example.com/tiles.pmtiles', { cacheMaxFeatures: 100 });

// TileFixer instance methods
expectTypeOf<TileFixer>().toHaveProperty('getSource').toBeFunction();
expectTypeOf<TileFixer['getSource']>().returns.toEqualTypeOf<PMTiles>();

expectTypeOf<TileFixer>().toHaveProperty('clearCache').toBeFunction();
expectTypeOf<TileFixer['clearCache']>().returns.toBeVoid();

expectTypeOf<TileFixer>().toHaveProperty('getCorrections').toBeFunction();
expectTypeOf<TileFixer['getCorrections']>().parameters.toEqualTypeOf<[z: number, x: number, y: number, signal?: AbortSignal]>();
expectTypeOf<TileFixer['getCorrections']>().returns.toEqualTypeOf<Promise<CorrectionResult>>();

expectTypeOf<TileFixer>().toHaveProperty('fixTile').toBeFunction();
expectTypeOf<TileFixer['fixTile']>().returns.toEqualTypeOf<Promise<ArrayBuffer>>();

expectTypeOf<TileFixer>().toHaveProperty('fetchAndFixTile').toBeFunction();
expectTypeOf<TileFixer['fetchAndFixTile']>().returns.toEqualTypeOf<Promise<FetchAndFixTileResult>>();

// FetchAndFixTileResult interface
expectTypeOf<FetchAndFixTileResult>().toHaveProperty('data').toEqualTypeOf<ArrayBuffer>();
expectTypeOf<FetchAndFixTileResult>().toHaveProperty('wasFixed').toBeBoolean();
expectTypeOf<FetchAndFixTileResult>().toHaveProperty('correctionsFailed').toEqualTypeOf<boolean | undefined>();
expectTypeOf<FetchAndFixTileResult>().toHaveProperty('correctionsError').toEqualTypeOf<Error | null | undefined>();

// FetchAndFixTileFetchOptions interface
expectTypeOf<FetchAndFixTileFetchOptions>().toHaveProperty('signal').toEqualTypeOf<AbortSignal | undefined>();
expectTypeOf<FetchAndFixTileFetchOptions>().toHaveProperty('mode').toEqualTypeOf<RequestMode | undefined>();
expectTypeOf<FetchAndFixTileFetchOptions>().toHaveProperty('credentials').toEqualTypeOf<RequestCredentials | undefined>();
expectTypeOf<FetchAndFixTileFetchOptions>().toHaveProperty('referrer').toEqualTypeOf<string | undefined>();
expectTypeOf<FetchAndFixTileFetchOptions>().toHaveProperty('referrerPolicy').toEqualTypeOf<ReferrerPolicy | undefined>();

// TileFixerOptions interface
expectTypeOf<TileFixerOptions>().toHaveProperty('cacheMaxFeatures').toEqualTypeOf<number | undefined>();
expectTypeOf<TileFixerOptions>().toHaveProperty('maxDataZoom').toEqualTypeOf<number | undefined>();

// Feature interface
expectTypeOf<Feature>().toHaveProperty('id').toEqualTypeOf<number | undefined>();
expectTypeOf<Feature>().toHaveProperty('type').toBeNumber();
expectTypeOf<Feature>().toHaveProperty('properties').toEqualTypeOf<Record<string, unknown>>();
expectTypeOf<Feature>().toHaveProperty('geometry').toEqualTypeOf<Array<Array<{ x: number; y: number }>>>();
expectTypeOf<Feature>().toHaveProperty('extent').toBeNumber();

// CorrectionResult type
expectTypeOf<CorrectionResult>().toEqualTypeOf<Record<string, Feature[]>>();

// ============================================================================
// @india-boundary-corrector/leaflet-layer
// ============================================================================
import {
  extendLeaflet,
  type IndiaBoundaryCorrectedTileLayerOptions,
  type IndiaBoundaryCorrectedTileLayer,
} from '@india-boundary-corrector/leaflet-layer';

// extendLeaflet function
expectTypeOf(extendLeaflet).toBeFunction();
expectTypeOf(extendLeaflet).parameters.toEqualTypeOf<[L: typeof L]>();
expectTypeOf(extendLeaflet).returns.toBeVoid();

// IndiaBoundaryCorrectedTileLayerOptions interface
expectTypeOf<IndiaBoundaryCorrectedTileLayerOptions>().toHaveProperty('pmtilesUrl').toEqualTypeOf<string | undefined>();
expectTypeOf<IndiaBoundaryCorrectedTileLayerOptions>().toHaveProperty('layerConfig').toEqualTypeOf<LayerConfig | string | undefined>();
expectTypeOf<IndiaBoundaryCorrectedTileLayerOptions>().toHaveProperty('extraLayerConfigs').toEqualTypeOf<LayerConfig[] | undefined>();
expectTypeOf<IndiaBoundaryCorrectedTileLayerOptions>().toHaveProperty('fallbackOnCorrectionFailure').toEqualTypeOf<boolean | undefined>();

// IndiaBoundaryCorrectedTileLayer interface
expectTypeOf<IndiaBoundaryCorrectedTileLayer>().toHaveProperty('getTileFixer').toBeFunction();
expectTypeOf<IndiaBoundaryCorrectedTileLayer['getTileFixer']>().returns.toEqualTypeOf<TileFixer>();
expectTypeOf<IndiaBoundaryCorrectedTileLayer>().toHaveProperty('getLayerConfig').toBeFunction();
expectTypeOf<IndiaBoundaryCorrectedTileLayer['getLayerConfig']>().returns.toEqualTypeOf<LayerConfig | null>();

// ============================================================================
// @india-boundary-corrector/openlayers-layer
// ============================================================================
import {
  IndiaBoundaryCorrectedTileLayer as OLCorrectedTileLayer,
  indiaBoundaryCorrectedTileLayer,
  type IndiaBoundaryCorrectedTileLayerOptions as OLOptions,
} from '@india-boundary-corrector/openlayers-layer';

// Constructor
expectTypeOf(OLCorrectedTileLayer).toBeConstructibleWith({
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
});

// Instance methods
expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>>().toHaveProperty('getTileFixer').toBeFunction();
expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>['getTileFixer']>().returns.toEqualTypeOf<TileFixer>();

expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>>().toHaveProperty('getLayerConfig').toBeFunction();
expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>['getLayerConfig']>().returns.toEqualTypeOf<LayerConfig | null>();

expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>>().toHaveProperty('getRegistry').toBeFunction();
expectTypeOf<InstanceType<typeof OLCorrectedTileLayer>['getRegistry']>().returns.toEqualTypeOf<LayerConfigRegistry>();

// Factory function
expectTypeOf(indiaBoundaryCorrectedTileLayer).toBeFunction();
expectTypeOf(indiaBoundaryCorrectedTileLayer).returns.toEqualTypeOf<InstanceType<typeof OLCorrectedTileLayer>>();

// Options interface
expectTypeOf<OLOptions>().toHaveProperty('url').toBeString();
expectTypeOf<OLOptions>().toHaveProperty('pmtilesUrl').toEqualTypeOf<string | undefined>();
expectTypeOf<OLOptions>().toHaveProperty('layerConfig').toEqualTypeOf<LayerConfig | string | undefined>();
expectTypeOf<OLOptions>().toHaveProperty('extraLayerConfigs').toEqualTypeOf<LayerConfig[] | undefined>();
expectTypeOf<OLOptions>().toHaveProperty('tileSize').toEqualTypeOf<number | undefined>();
expectTypeOf<OLOptions>().toHaveProperty('fallbackOnCorrectionFailure').toEqualTypeOf<boolean | undefined>();

// ============================================================================
// @india-boundary-corrector/maplibre-protocol
// ============================================================================
import {
  CorrectionProtocol,
  registerCorrectionProtocol,
  type CorrectionProtocolOptions,
  type CorrectionErrorEvent,
} from '@india-boundary-corrector/maplibre-protocol';

// CorrectionProtocol constructor
expectTypeOf(CorrectionProtocol).toBeConstructibleWith();
expectTypeOf(CorrectionProtocol).toBeConstructibleWith({});
expectTypeOf(CorrectionProtocol).toBeConstructibleWith({ pmtilesUrl: 'https://example.com/tiles.pmtiles' });

// CorrectionProtocol instance methods
expectTypeOf<CorrectionProtocol>().toHaveProperty('addLayerConfig').toBeFunction();
expectTypeOf<CorrectionProtocol['addLayerConfig']>().parameters.toEqualTypeOf<[layerConfig: LayerConfig]>();
expectTypeOf<CorrectionProtocol['addLayerConfig']>().returns.toEqualTypeOf<CorrectionProtocol>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('getRegistry').toBeFunction();
expectTypeOf<CorrectionProtocol['getRegistry']>().returns.toEqualTypeOf<LayerConfigRegistry>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('getTileFixer').toBeFunction();
expectTypeOf<CorrectionProtocol['getTileFixer']>().returns.toEqualTypeOf<TileFixer>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('register').toBeFunction();
expectTypeOf<CorrectionProtocol['register']>().returns.toEqualTypeOf<CorrectionProtocol>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('unregister').toBeFunction();
expectTypeOf<CorrectionProtocol['unregister']>().returns.toEqualTypeOf<CorrectionProtocol>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('on').toBeFunction();
expectTypeOf<CorrectionProtocol['on']>().returns.toEqualTypeOf<CorrectionProtocol>();

expectTypeOf<CorrectionProtocol>().toHaveProperty('off').toBeFunction();
expectTypeOf<CorrectionProtocol['off']>().returns.toEqualTypeOf<CorrectionProtocol>();

// CorrectionProtocolOptions interface
expectTypeOf<CorrectionProtocolOptions>().toHaveProperty('pmtilesUrl').toEqualTypeOf<string | undefined>();
expectTypeOf<CorrectionProtocolOptions>().toHaveProperty('fallbackOnCorrectionFailure').toEqualTypeOf<boolean | undefined>();

// CorrectionErrorEvent interface
expectTypeOf<CorrectionErrorEvent>().toHaveProperty('error').toEqualTypeOf<Error>();
expectTypeOf<CorrectionErrorEvent>().toHaveProperty('coords').toEqualTypeOf<{ z: number; x: number; y: number }>();
expectTypeOf<CorrectionErrorEvent>().toHaveProperty('tileUrl').toBeString();

// registerCorrectionProtocol function
expectTypeOf(registerCorrectionProtocol).toBeFunction();
expectTypeOf(registerCorrectionProtocol).returns.toEqualTypeOf<CorrectionProtocol>();

// ============================================================================
// @india-boundary-corrector/service-worker
// ============================================================================
import {
  CorrectionServiceWorker,
  registerCorrectionServiceWorker,
  MessageTypes,
  type CorrectionServiceWorkerOptions,
  type ServiceWorkerStatus,
} from '@india-boundary-corrector/service-worker';

// MessageTypes - verify all keys exist
expectTypeOf(MessageTypes).toHaveProperty('ADD_LAYER_CONFIG').toEqualTypeOf<'ADD_LAYER_CONFIG'>();
expectTypeOf(MessageTypes).toHaveProperty('REMOVE_LAYER_CONFIG').toEqualTypeOf<'REMOVE_LAYER_CONFIG'>();
expectTypeOf(MessageTypes).toHaveProperty('SET_PMTILES_URL').toEqualTypeOf<'SET_PMTILES_URL'>();
expectTypeOf(MessageTypes).toHaveProperty('SET_ENABLED').toEqualTypeOf<'SET_ENABLED'>();
expectTypeOf(MessageTypes).toHaveProperty('SET_FALLBACK_ON_CORRECTION_FAILURE').toEqualTypeOf<'SET_FALLBACK_ON_CORRECTION_FAILURE'>();
expectTypeOf(MessageTypes).toHaveProperty('SET_CACHE_MAX_FEATURES').toEqualTypeOf<'SET_CACHE_MAX_FEATURES'>();
expectTypeOf(MessageTypes).toHaveProperty('CLEAR_CACHE').toEqualTypeOf<'CLEAR_CACHE'>();
expectTypeOf(MessageTypes).toHaveProperty('GET_STATUS').toEqualTypeOf<'GET_STATUS'>();
expectTypeOf(MessageTypes).toHaveProperty('RESET_CONFIG').toEqualTypeOf<'RESET_CONFIG'>();
expectTypeOf(MessageTypes).toHaveProperty('CLAIM_CLIENTS').toEqualTypeOf<'CLAIM_CLIENTS'>();

// CorrectionServiceWorker constructor
expectTypeOf(CorrectionServiceWorker).toBeConstructibleWith('./sw.js');
expectTypeOf(CorrectionServiceWorker).toBeConstructibleWith('./sw.js', {});
expectTypeOf(CorrectionServiceWorker).toBeConstructibleWith('./sw.js', { scope: './' });

// CorrectionServiceWorker instance methods
expectTypeOf<CorrectionServiceWorker>().toHaveProperty('register').toBeFunction();
expectTypeOf<CorrectionServiceWorker['register']>().returns.toEqualTypeOf<Promise<CorrectionServiceWorker>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('isControlling').toBeFunction();
expectTypeOf<CorrectionServiceWorker['isControlling']>().returns.toBeBoolean();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('unregister').toBeFunction();
expectTypeOf<CorrectionServiceWorker['unregister']>().returns.toEqualTypeOf<Promise<boolean>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('getWorker').toBeFunction();
expectTypeOf<CorrectionServiceWorker['getWorker']>().returns.toEqualTypeOf<ServiceWorker | null>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('sendMessage').toBeFunction();
expectTypeOf<CorrectionServiceWorker['sendMessage']>().parameters.toEqualTypeOf<[message: object]>();
expectTypeOf<CorrectionServiceWorker['sendMessage']>().returns.toEqualTypeOf<Promise<any>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('addLayerConfig').toBeFunction();
expectTypeOf<CorrectionServiceWorker['addLayerConfig']>().parameters.toEqualTypeOf<[layerConfig: LayerConfig]>();
expectTypeOf<CorrectionServiceWorker['addLayerConfig']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('removeLayerConfig').toBeFunction();
expectTypeOf<CorrectionServiceWorker['removeLayerConfig']>().parameters.toEqualTypeOf<[configId: string]>();
expectTypeOf<CorrectionServiceWorker['removeLayerConfig']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('setPmtilesUrl').toBeFunction();
expectTypeOf<CorrectionServiceWorker['setPmtilesUrl']>().parameters.toEqualTypeOf<[pmtilesUrl: string]>();
expectTypeOf<CorrectionServiceWorker['setPmtilesUrl']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('setEnabled').toBeFunction();
expectTypeOf<CorrectionServiceWorker['setEnabled']>().parameters.toEqualTypeOf<[enabled: boolean]>();
expectTypeOf<CorrectionServiceWorker['setEnabled']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('setFallbackOnCorrectionFailure').toBeFunction();
expectTypeOf<CorrectionServiceWorker['setFallbackOnCorrectionFailure']>().parameters.toEqualTypeOf<[fallbackOnCorrectionFailure: boolean]>();
expectTypeOf<CorrectionServiceWorker['setFallbackOnCorrectionFailure']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('setCacheMaxFeatures').toBeFunction();
expectTypeOf<CorrectionServiceWorker['setCacheMaxFeatures']>().parameters.toEqualTypeOf<[cacheMaxFeatures: number]>();
expectTypeOf<CorrectionServiceWorker['setCacheMaxFeatures']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('clearCache').toBeFunction();
expectTypeOf<CorrectionServiceWorker['clearCache']>().returns.toEqualTypeOf<Promise<void>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('getStatus').toBeFunction();
expectTypeOf<CorrectionServiceWorker['getStatus']>().returns.toEqualTypeOf<Promise<ServiceWorkerStatus>>();

expectTypeOf<CorrectionServiceWorker>().toHaveProperty('resetConfig').toBeFunction();
expectTypeOf<CorrectionServiceWorker['resetConfig']>().returns.toEqualTypeOf<Promise<void>>();

// CorrectionServiceWorkerOptions interface
expectTypeOf<CorrectionServiceWorkerOptions>().toHaveProperty('scope').toEqualTypeOf<string | undefined>();
expectTypeOf<CorrectionServiceWorkerOptions>().toHaveProperty('pmtilesUrl').toEqualTypeOf<string | undefined>();
expectTypeOf<CorrectionServiceWorkerOptions>().toHaveProperty('controllerTimeout').toEqualTypeOf<number | undefined>();
expectTypeOf<CorrectionServiceWorkerOptions>().toHaveProperty('forceReinstall').toEqualTypeOf<boolean | undefined>();

// ServiceWorkerStatus interface
expectTypeOf<ServiceWorkerStatus>().toHaveProperty('enabled').toBeBoolean();
expectTypeOf<ServiceWorkerStatus>().toHaveProperty('fallbackOnCorrectionFailure').toBeBoolean();
expectTypeOf<ServiceWorkerStatus>().toHaveProperty('pmtilesUrl').toBeString();
expectTypeOf<ServiceWorkerStatus>().toHaveProperty('configIds').toEqualTypeOf<string[]>();

// registerCorrectionServiceWorker function
expectTypeOf(registerCorrectionServiceWorker).toBeFunction();
expectTypeOf(registerCorrectionServiceWorker).returns.toEqualTypeOf<Promise<CorrectionServiceWorker>>();
