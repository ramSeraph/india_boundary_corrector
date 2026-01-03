# @india-boundary-corrector/tilefixer

## 0.0.3

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
