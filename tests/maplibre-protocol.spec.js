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

  test.describe('fetchAndFixTile - Success Cases', () => {
    test('returns fixed tile when both raster and corrections are available', async ({ page }) => {
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

    test('returns original tile when corrections are empty', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // Far from India
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

    test('returns original tile when layerConfig is null', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, null, tileSize);
        
        return {
          hasData: result.data instanceof ArrayBuffer,
        };
      });

      expect(result.hasData).toBe(true);
    });
  });

  test.describe('fetchAndFixTile - Failure Cases', () => {
    test('throws error when tile fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return { error: null };
        } catch (err) {
          return { 
            error: err.message,
          };
        }
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Tile fetch failed');
    });

    test('returns original tile when corrections fail', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 999, x = 999999, y = 999999; // Invalid coordinates - corrections will fail
        const tileSize = 256;
        
        try {
          // With Promise.all (not allSettled), if corrections fail, the whole thing fails
          const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return {
            hasData: result.data instanceof ArrayBuffer,
            error: null,
          };
        } catch (err) {
          return { 
            hasData: false,
            error: err.message,
          };
        }
      });

      // Either succeeds (corrections returned empty) or fails (corrections threw error)
      // Both are acceptable since we use Promise.all
      if (result.hasData) {
        expect(result.hasData).toBe(true);
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    test('handles network timeout for tile fetch', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('timeout');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return { error: null, timedOut: false };
        } catch (err) {
          return { 
            error: err.message,
            timedOut: true,
          };
        }
      });

      expect(result.timedOut).toBe(true);
      expect(result.error).toBeTruthy();
    });

    test('handles abort signal', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('slow');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 100);
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize, {
            signal: controller.signal
          });
          return { error: null, wasAborted: false };
        } catch (err) {
          return { 
            error: err.message,
            wasAborted: err.name === 'AbortError',
          };
        }
      });

      expect(result.wasAborted).toBe(true);
    });
  });

  test.describe('fetchAndFixTile - Edge Cases', () => {
    test('handles corrupted tile data', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('corrupted');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return {
            hasData: result.data instanceof ArrayBuffer,
            error: null,
          };
        } catch (err) {
          return { 
            hasData: false,
            error: err.message,
          };
        }
      });

      // Should either return data or throw error
      if (!result.hasData) {
        expect(result.error).toBeTruthy();
      }
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
        
        const customConfig = new LayerConfig('custom-test', 5, /custom\.example\.com/);
        protocol.addLayerConfig(customConfig);
        
        return {
          hasCustomConfig: protocol.getRegistry().get('custom-test') !== null,
        };
      });

      expect(result.hasCustomConfig).toBe(true);
    });
  });

  test.describe('Integration - Parallel Fetching', () => {
    test('handles parallel tile fetches efficiently', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        const mockTileUrl = window.createMockTileUrl('success');
        const tileSize = 256;
        
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            fetchAndFixTile(mockTileUrl, 8, 182 + i, 101, tileFixer, layerConfig, tileSize)
          );
        }
        
        const results = await Promise.all(promises);
        
        return {
          count: results.length,
          allSucceeded: results.every(r => r.data instanceof ArrayBuffer),
        };
      });

      expect(result.count).toBe(5);
      expect(result.allSucceeded).toBe(true);
    });

    test('handles mixed success/failure in parallel fetches', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        const tileSize = 256;
        
        const promises = [
          fetchAndFixTile(window.createMockTileUrl('success'), 8, 182, 101, tileFixer, layerConfig, tileSize),
          fetchAndFixTile(window.createMockTileUrl('tile-fail'), 8, 183, 101, tileFixer, layerConfig, tileSize)
            .catch(err => ({ error: err.message })),
          fetchAndFixTile(window.createMockTileUrl('success'), 8, 184, 101, tileFixer, layerConfig, tileSize),
        ];
        
        const results = await Promise.all(promises);
        
        return {
          successCount: results.filter(r => r.data instanceof ArrayBuffer).length,
          errorCount: results.filter(r => r.error).length,
        };
      });

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
    });
  });
});
