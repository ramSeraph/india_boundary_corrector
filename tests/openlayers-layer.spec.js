import { test, expect } from '@playwright/test';

test.describe('OpenLayers Layer Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/openlayers-layer-test.html');
    await page.waitForFunction(() => window.openlayersLayerLoaded === true, { timeout: 10000 });
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

        // Get the source and trigger a tile load
        const source = layer.getSource();
        const tileLoadFn = source.getTileLoadFunction();
        
        // Create a mock tile with the expected interface
        const mockTileUrl = window.createMockTileUrl('success');
        const mockImage = new Image();
        const mockTile = {
          getTileCoord: () => [8, 182, 101],
          getImage: () => mockImage
        };
        
        // Call the tile load function directly
        await tileLoadFn(mockTile, mockTileUrl);

        return errorEvent;
      });

      expect(result).not.toBeNull();
      expect(result.hasError).toBe(true);
      expect(result.hasCoords).toBe(true);
      expect(result.hasTileUrl).toBe(true);
    });
  });
});
