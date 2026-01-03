# @india-boundary-corrector/maplibre-protocol

## 0.0.3

### Patch Changes

- ### maplibre-protocol

  - Fix handling of retina tile URLs (@2x, @3x suffixes) in maplibre-protocol
  - Add `extractTileCoordsFromUrl` for generic z/x/y parsing with retina suffix support
  - Update `parseCorrectionsUrl` to use generic parsing when config ID is explicit
  - Fix config ID detection to handle URLs without slashes

  ### layer-configs

  - Add validation to reject LayerConfig IDs containing slashes

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
