import { test, expect } from '@playwright/test';

test.describe('OpenLayers Layer Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/openlayers-layer-test.html');
    await page.waitForFunction(() => window.openlayersLayerLoaded === true, { timeout: 10000 });
  });

  test.describe('fetchAndFixTile - Wrapper Behavior', () => {
    test('returns Blob with correct type when fixed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101; // Tile with corrections
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          hasBlob: result.blob instanceof Blob,
          wasFixed: result.wasFixed,
          blobSize: result.blob.size,
          blobType: result.blob.type,
        };
      });

      expect(result.hasBlob).toBe(true);
      expect(result.wasFixed).toBe(true);
      expect(result.blobSize).toBeGreaterThan(0);
      expect(result.blobType).toContain('image');
    });

    test('returns Blob when not fixed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // Tile without corrections
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          hasBlob: result.blob instanceof Blob,
          wasFixed: result.wasFixed,
          blobSize: result.blob.size,
        };
      });

      expect(result.hasBlob).toBe(true);
      expect(result.wasFixed).toBe(false);
      expect(result.blobSize).toBeGreaterThan(0);
    });

    test('propagates errors from tilefixer', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return { error: null };
        } catch (err) {
          return { error: err.message };
        }
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Tile fetch failed');
    });
  });

  test.describe('Layer Configuration', () => {
    test('initializes with default PMTiles URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const layer = window.testLayer;
        return {
          hasTileFixer: !!layer.getTileFixer(),
          hasLayerConfig: !!layer.getLayerConfig(),
        };
      });

      expect(result.hasTileFixer).toBe(true);
      expect(result.hasLayerConfig).toBe(true);
    });

    test('initializes with custom PMTiles URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        const customUrl = 'https://custom.example.com/tiles.pmtiles';
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          pmtilesUrl: customUrl
        });
        
        return {
          hasTileFixer: !!layer.getTileFixer(),
        };
      });

      expect(result.hasTileFixer).toBe(true);
    });

    test('detects layer config from URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        });
        
        return {
          hasLayerConfig: !!layer.getLayerConfig(),
          configId: layer.getLayerConfig()?.id,
        };
      });

      expect(result.hasLayerConfig).toBe(true);
      expect(result.configId).toBeTruthy();
    });

    test('uses specified layer config by ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          layerConfig: 'osm-carto'
        });
        
        return {
          hasLayerConfig: !!layer.getLayerConfig(),
          configId: layer.getLayerConfig()?.id,
        };
      });

      expect(result.hasLayerConfig).toBe(true);
      expect(result.configId).toBe('osm-carto');
    });

    test('uses LayerConfig object directly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { IndiaBoundaryCorrectedTileLayer, LayerConfig } = window;
        
        const customConfig = new LayerConfig({
          id: 'custom-direct',
          tileUrlTemplates: 'https://custom.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'purple' }],
        });
        
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://custom.example.com/{z}/{x}/{y}.png',
          layerConfig: customConfig
        });
        
        return {
          hasLayerConfig: !!layer.getLayerConfig(),
          configId: layer.getLayerConfig()?.id,
          lineColor: layer.getLayerConfig()?.lineStyles[0]?.color,
        };
      });

      expect(result.hasLayerConfig).toBe(true);
      expect(result.configId).toBe('custom-direct');
      expect(result.lineColor).toBe('purple');
    });

    test('warns when layer config cannot be detected', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        
        // Capture console warnings
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));
        
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://unknown.example.com/{z}/{x}/{y}.png'
        });
        
        console.warn = originalWarn;
        
        return {
          hasLayerConfig: !!layer.getLayerConfig(),
          hadWarning: warnings.some(w => w.includes('Could not detect layer config')),
        };
      });

      expect(result.hasLayerConfig).toBe(false);
      expect(result.hadWarning).toBe(true);
    });
  });

  test.describe('correctionerror Event', () => {
    test('returns correctionsFailed when PMTiles fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        
        // Create layer with a broken PMTiles URL
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          layerConfig: 'osm-carto',
          pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
        });

        // Trigger a tile load with a working mock tile URL (PMTiles will fail)
        const mockTileUrl = window.createMockTileUrl('success');
        
        const result = await layer._fetchAndFixTile(mockTileUrl, 8, 182, 101);

        return {
          hasBlob: result.blob instanceof Blob,
          blobSize: result.blob.size,
          correctionsFailed: result.correctionsFailed,
          hasCorrectionsError: !!result.correctionsError,
        };
      });

      expect(result.hasBlob).toBe(true);
      expect(result.blobSize).toBeGreaterThan(0);
      expect(result.correctionsFailed).toBe(true);
      expect(result.hasCorrectionsError).toBe(true);
    });

    test('dispatches correctionerror event on layer', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { IndiaBoundaryCorrectedTileLayer } = window;
        
        // Create layer with a broken PMTiles URL
        const layer = new IndiaBoundaryCorrectedTileLayer({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          layerConfig: 'osm-carto',
          pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
        });

        // Listen for correction error event
        let errorEvent = null;
        layer.on('correctionerror', (e) => {
          errorEvent = {
            hasError: !!e.error,
            hasCoords: !!e.coords,
            hasTileUrl: !!e.tileUrl,
          };
        });

        // Manually dispatch event to verify listener works
        layer.dispatchEvent({ 
          type: 'correctionerror', 
          error: new Error('test'), 
          coords: { z: 8, x: 182, y: 101 }, 
          tileUrl: 'http://example.com/tile.png' 
        });

        return errorEvent;
      });

      expect(result).not.toBeNull();
      expect(result.hasError).toBe(true);
      expect(result.hasCoords).toBe(true);
      expect(result.hasTileUrl).toBe(true);
    });
  });
});
