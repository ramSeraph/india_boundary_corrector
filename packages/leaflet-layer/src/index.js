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
        this._layerConfig = this._registry.detectFromUrls([url]);
      }
      
      if (!this._layerConfig) {
        console.warn('[L.TileLayer.IndiaBoundaryCorrected] Could not detect layer config from URL. Corrections will not be applied.');
      }
    },

    /**
     * Handle tile fetching and correction application logic.
     * This method is extracted for testability.
     * @param {string} tileUrl - URL of the raster tile
     * @param {number} z - Zoom level
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     * @param {number} tileSize - Tile size in pixels
     * @returns {Promise<{blob: Blob, wasFixed: boolean, error?: Error}>}
     * @private
     */
    _fetchAndFixTile: async function (tileUrl, z, x, y, tileSize) {
      const { data, wasFixed } = await this._tileFixer.fetchAndFixTile(
        tileUrl, z, x, y, this._layerConfig, { tileSize }
      );
      const blob = new Blob([data], { type: wasFixed ? 'image/png' : undefined });
      return { blob, wasFixed };
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

      this._fetchAndFixTile(tileUrl, z, x, y, tileSize)
        .then(({ blob, wasFixed }) => {
          tile.src = URL.createObjectURL(blob);
          tile.onload = () => {
            URL.revokeObjectURL(tile.src);
            done(null, tile);
          };
        })
        .catch((err) => {
          console.warn('[L.TileLayer.IndiaBoundaryCorrected] Error applying corrections, falling back to original:', err);
          tile.onload = () => done(null, tile);
          tile.onerror = (e) => done(e, tile);
          tile.src = tileUrl;
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
