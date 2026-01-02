import { test, expect } from '@playwright/test';

test.describe('MapLibre Protocol Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/maplibre-protocol-test.html');
    await page.waitForFunction(() => window.maplibreProtocolLoaded === true, { timeout: 10000 });
  });

  test.describe('parseCorrectionsUrl', () => {
    test('parses URL without config ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://https://tile.openstreetmap.org/8/182/101.png');
      });

      expect(result.configId).toBeNull();
      expect(result.tileUrl).toBe('https://tile.openstreetmap.org/8/182/101.png');
      expect(result.z).toBe(8);
      expect(result.x).toBe(182);
      expect(result.y).toBe(101);
    });

    test('parses URL with config ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://tile.openstreetmap.org/8/182/101.png');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.tileUrl).toBe('https://tile.openstreetmap.org/8/182/101.png');
      expect(result.z).toBe(8);
      expect(result.x).toBe(182);
      expect(result.y).toBe(101);
    });

    test('parses URL with path segments before tile coords', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://https://example.com/tiles/osm/8/182/101.png');
      });

      expect(result.z).toBe(8);
      expect(result.x).toBe(182);
      expect(result.y).toBe(101);
    });
  });

  test.describe('fetchAndFixTile - Wrapper Behavior', () => {
    test('returns ArrayBuffer data', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          dataSize: result.data.byteLength,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.dataSize).toBeGreaterThan(0);
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

  test.describe('CorrectionProtocol Configuration', () => {
    test('initializes with default PMTiles URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const protocol = window.testProtocol;
        return {
          hasTileFixer: !!protocol.getTileFixer(),
          hasRegistry: !!protocol.getRegistry(),
        };
      });

      expect(result.hasTileFixer).toBe(true);
      expect(result.hasRegistry).toBe(true);
    });

    test('initializes with custom PMTiles URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionProtocol } = window;
        const customUrl = 'https://custom.example.com/tiles.pmtiles';
        const protocol = new CorrectionProtocol({ pmtilesUrl: customUrl });
        
        return {
          hasTileFixer: !!protocol.getTileFixer(),
        };
      });

      expect(result.hasTileFixer).toBe(true);
    });

    test('allows adding custom layer configs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionProtocol, LayerConfig } = window;
        const protocol = new CorrectionProtocol();
        
        const customConfig = new LayerConfig({
          id: 'custom-test',
          zoomThreshold: 5,
          tileUrlTemplates: ['https://custom.example.com/{z}/{x}/{y}.png'],
          lineStyles: [{ color: 'red' }],
        });
        protocol.addLayerConfig(customConfig);
        
        return {
          hasCustomConfig: protocol.getRegistry().get('custom-test') !== undefined,
        };
      });

      expect(result.hasCustomConfig).toBe(true);
    });
  });

  test.describe('correctionerror Event', () => {
    test('fires correctionerror event when PMTiles fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionProtocol } = window;
        
        // Create protocol with a broken PMTiles URL
        const protocol = new CorrectionProtocol({
          pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
        });

        // Listen for correction error event
        let errorEvent = null;
        protocol.on('correctionerror', (e) => {
          errorEvent = {
            hasError: !!e.error,
            hasCoords: !!e.coords,
            hasTileUrl: !!e.tileUrl,
            coords: e.coords,
          };
        });

        // Call the load function directly - PMTiles will fail, should emit event and fallback
        const loadFn = protocol._loadFn;
        
        try {
          await loadFn({ url: `ibc://osm-carto@https://tile.openstreetmap.org/8/182/101.png` });
        } catch (err) {
          // Error may be caught internally
        }

        // Wait for the async error event
        await new Promise(resolve => setTimeout(resolve, 100));

        return errorEvent;
      });

      expect(result).not.toBeNull();
      expect(result.hasError).toBe(true);
      expect(result.hasCoords).toBe(true);
      expect(result.hasTileUrl).toBe(true);
      expect(result.coords).toEqual({ z: 8, x: 182, y: 101 });
    });

    test('on/off methods work correctly', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionProtocol } = window;
        const protocol = new CorrectionProtocol();

        let callCount = 0;
        const listener = () => { callCount++; };

        // Add listener
        protocol.on('correctionerror', listener);
        protocol._emit('correctionerror', { error: new Error('test') });
        const countAfterOn = callCount;

        // Remove listener
        protocol.off('correctionerror', listener);
        protocol._emit('correctionerror', { error: new Error('test2') });
        const countAfterOff = callCount;

        return { countAfterOn, countAfterOff };
      });

      expect(result.countAfterOn).toBe(1);
      expect(result.countAfterOff).toBe(1); // Should not increase after off()
    });

    test('falls back to original tile when correction fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionProtocol } = window;
        
        // Create protocol with a broken PMTiles URL
        const protocol = new CorrectionProtocol({
          pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
        });

        // Call the load function directly - should fallback to original tile
        const loadFn = protocol._loadFn;
        
        const response = await loadFn({ url: `ibc://osm-carto@https://tile.openstreetmap.org/8/182/101.png` });

        return {
          hasData: response.data instanceof ArrayBuffer,
          dataSize: response.data.byteLength,
        };
      });

      // Should still return data (fallback to original tile)
      expect(result.hasData).toBe(true);
      expect(result.dataSize).toBeGreaterThan(0);
    });
  });
});
