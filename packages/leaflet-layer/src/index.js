import { getPmtilesUrl } from '@india-boundary-corrector/data';
import { layerConfigs } from '@india-boundary-corrector/layer-configs';
import { BoundaryCorrector as TileFixer } from '@india-boundary-corrector/tilefixer';

// Re-export for convenience
export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Extend Leaflet with IndiaBoundaryCorrectedTileLayer.
 * @param {L} L - Leaflet namespace
 */
function extendLeaflet(L) {
  // Avoid re-extending
  if (L.TileLayer.IndiaBoundaryCorrected) {
    return;
  }

  L.TileLayer.IndiaBoundaryCorrected = L.TileLayer.extend({
    options: {
      pmtilesUrl: null,
      layerConfig: null,
      extraLayerConfigs: null,
    },

    initialize: function (url, options) {
      L.TileLayer.prototype.initialize.call(this, url, options);
      
      this._pmtilesUrl = this.options.pmtilesUrl ?? getPmtilesUrl();
      this._tileFixer = new TileFixer(this._pmtilesUrl);
      this._registry = layerConfigs.createMergedRegistry(this.options.extraLayerConfigs);
      
      if (typeof this.options.layerConfig === 'string') {
        this._layerConfig = this._registry.get(this.options.layerConfig);
      } else if (this.options.layerConfig) {
        this._layerConfig = this.options.layerConfig;
      } else {
        this._layerConfig = this._registry.detectFromTemplates([url]);
      }
      
      if (!this._layerConfig) {
        console.warn('[L.TileLayer.IndiaBoundaryCorrected] Could not detect layer config from URL. Corrections will not be applied.');
      }
    },

    createTile: function (coords, done) {
      const tile = document.createElement('img');
      
      tile.alt = '';
      
      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }
      
      if (typeof this.options.referrerPolicy === 'string') {
        tile.referrerPolicy = this.options.referrerPolicy;
      }

      if (!this._layerConfig) {
        tile.onload = () => done(null, tile);
        tile.onerror = (e) => done(e, tile);
        tile.src = this.getTileUrl(coords);
        return tile;
      }

      const tileUrl = this.getTileUrl(coords);
      const z = coords.z;
      const x = coords.x;
      const y = coords.y;
      const tileSize = this.options.tileSize || 256;

      this._tileFixer.fetchAndFixTile(tileUrl, z, x, y, this._layerConfig, { tileSize })
        .then(({ data, correctionsFailed, correctionsError }) => {
          if (correctionsFailed) {
            console.warn('[L.TileLayer.IndiaBoundaryCorrected] Corrections fetch failed:', correctionsError);
            this.fire('correctionerror', { error: correctionsError, coords: { z, x, y }, tileUrl });
          }
          const blob = new Blob([data]);
          tile.src = URL.createObjectURL(blob);
          tile.onload = () => {
            URL.revokeObjectURL(tile.src);
            done(null, tile);
          };
          tile.onerror = (e) => {
            URL.revokeObjectURL(tile.src);
            done(e, tile);
          };
        })
        .catch((err) => {
          console.warn('[L.TileLayer.IndiaBoundaryCorrected] Tile fetch failed:', err);
          done(err, tile);
        });

      return tile;
    },

    getTileFixer: function () {
      return this._tileFixer;
    },

    getLayerConfig: function () {
      return this._layerConfig;
    },
  });

  L.tileLayer.indiaBoundaryCorrected = function (url, options) {
    return new L.TileLayer.IndiaBoundaryCorrected(url, options);
  };
}

// Export for manual extension if needed (e.g., ES modules with imported L)
export { extendLeaflet };
