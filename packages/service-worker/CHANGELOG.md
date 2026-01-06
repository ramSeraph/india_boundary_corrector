# @india-boundary-corrector/service-worker

## 0.0.4

### Patch Changes

- ### @india-boundary-corrector/data

  - Improved CDN detection and PMTiles URL resolution
  - Added `resolvePmtilesUrl()` export for testing URL resolution
  - Added unpkg.com to CDN fallback list (serves PMTiles with issues)
  - Added bundling guide documentation

  ### @india-boundary-corrector/layer-configs

  - Fixed missing `lineExtensionFactor` in TypeScript definitions

  ### @india-boundary-corrector/tilefixer

  - **Renamed**: `BoundaryCorrector` → `TileFixer`
  - Added `TileFixer.getOrCreate(pmtilesUrl)` factory for instance reuse
  - Added `TileFetchError` class with HTTP status and body for error handling
  - Added `fallbackOnCorrectionFailure` option to return original tile when corrections fail
  - Changed cache eviction from tile-count to feature-count based
  - Tile size is now derived from the image (removed `tileSize` parameter from `fixTile`)
  - Fixed TypeScript definitions for `lineExtensionFactor`, `correctionsFailed`, `correctionsError`

  ### @india-boundary-corrector/leaflet-layer

  - Simplified implementation using `tileFixer.fetchAndFixTile()`
  - Added `fallbackOnCorrectionFailure` option
  - Added `correctionerror` event when corrections fail to load

  ### @india-boundary-corrector/openlayers-layer

  - Simplified implementation using `tileFixer.fetchAndFixTile()`
  - Added `fallbackOnCorrectionFailure` option
  - Added `correctionerror` event when corrections fail to load

  ### @india-boundary-corrector/maplibre-protocol

  - Simplified implementation using `tileFixer.fetchAndFixTile()`
  - Added `fallbackOnCorrectionFailure` option
  - Added `on()`/`off()` methods for `correctionerror` event
  - Fixed TypeScript definitions for event methods

  ### @india-boundary-corrector/service-worker

  - Added per-client configuration isolation (each tab has independent config)
  - Added `resetConfig()` to restore default configuration
  - Added `setFallbackOnCorrectionFailure()` and `setCacheMaxFeatures()` methods
  - Added `forceReinstall` option to unregister existing SW before registering
  - Improved hard reload handling with claim mechanism
  - Extracted `MessageTypes` to shared constants module
  - Fixed TypeScript definitions for `ServiceWorkerStatus`

- Updated dependencies
  - @india-boundary-corrector/data@0.0.4
  - @india-boundary-corrector/layer-configs@0.0.4
  - @india-boundary-corrector/tilefixer@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies
  - @india-boundary-corrector/layer-configs@0.0.3
  - @india-boundary-corrector/data@0.0.3
  - @india-boundary-corrector/tilefixer@0.0.3

## 0.0.2

### Patch Changes

- ### @india-boundary-corrector/data

  - Fix fallback to unpkg PMTiles URL when being used from esm.sh (CDNs that don't host static files)

  ### @india-boundary-corrector/tilefixer

  - Reuse OffscreenCanvas instances instead of creating new ones per tile
  - Add `willReadFrequently` hint to canvas contexts for better performance

  ### @india-boundary-corrector/maplibre-protocol

  - Properly propagate AbortError instead of swallowing it
  - Only emit `correctionerror` for PMTiles/correction failures, not tile fetch errors

  ### @india-boundary-corrector/openlayers-layer

  - Only emit `correctionerror` for PMTiles/correction failures, not tile fetch errors

- Updated dependencies
  - @india-boundary-corrector/data@0.0.2
  - @india-boundary-corrector/layer-configs@0.0.2
  - @india-boundary-corrector/tilefixer@0.0.2
