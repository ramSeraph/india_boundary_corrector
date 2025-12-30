import { test, expect } from '@playwright/test';

test.describe('OpenLayers Layer Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/openlayers-layer-test.html');
    await page.waitForFunction(() => window.openlayersLayerLoaded === true, { timeout: 10000 });
  });

  test.describe('fetchAndFixTile - Success Cases', () => {
    test('returns fixed tile when both raster and corrections are available', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock successful tile and corrections
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101;
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

    test('returns original tile when corrections are empty', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock successful tile but no corrections (tile outside India)
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // Far from India
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          hasBlob: result.blob instanceof Blob,
          wasFixed: result.wasFixed,
          blobSize: result.blob.size,
        };
      });

      expect(result.hasBlob).toBe(true);
      expect(result.wasFixed).toBe(false); // No corrections applied
      expect(result.blobSize).toBeGreaterThan(0);
    });

    test('returns original tile when corrections fail to load', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock successful tile
        const mockTileUrl = window.createMockTileUrl('success');
        
        // Temporarily break corrections by using invalid coordinates
        const z = 999, x = 999999, y = 999999; // Will cause corrections to fail
        const tileSize = 256;
        
        try {
          const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return {
            hasBlob: result.blob instanceof Blob,
            wasFixed: result.wasFixed,
            error: null,
          };
        } catch (err) {
          return {
            hasBlob: false,
            wasFixed: false,
            error: err.message,
          };
        }
      });

      // Either we get the original tile, or an error
      if (result.hasBlob) {
        expect(result.wasFixed).toBe(false);
      } else {
        expect(result.error).toBeTruthy();
      }
    });
  });

  test.describe('fetchAndFixTile - Failure Cases', () => {
    test('throws error when tile fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock failed tile fetch
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return { error: null };
        } catch (err) {
          return { 
            error: err.message,
            hasTileError: !!err.tileError,
          };
        }
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Tile fetch failed');
    });

    test('throws error when both tile and corrections fail', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock both failing
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 999, x = 999999, y = 999999; // Invalid corrections
        const tileSize = 256;
        
        try {
          await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return { error: null };
        } catch (err) {
          return { 
            error: err.message,
            hasTileError: !!err.tileError,
            hasCorrectionsError: !!err.correctionsError,
          };
        }
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Both tile and corrections failed');
    });

    test('handles network timeout for tile fetch', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock timeout
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
  });

  test.describe('fetchAndFixTile - Edge Cases', () => {
    test('handles corrupted tile data gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        // Mock corrupted tile (invalid image data)
        const mockTileUrl = window.createMockTileUrl('corrupted');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
          return {
            hasBlob: result.blob instanceof Blob,
            error: null,
          };
        } catch (err) {
          return { 
            hasBlob: false,
            error: err.message,
          };
        }
      });

      // Should either return corrupted data as blob or throw error
      if (!result.hasBlob) {
        expect(result.error).toBeTruthy();
      }
    });

    test('handles empty corrections object', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // No corrections
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          hasBlob: result.blob instanceof Blob,
          wasFixed: result.wasFixed,
        };
      });

      expect(result.hasBlob).toBe(true);
      expect(result.wasFixed).toBe(false);
    });

    test('handles corrections with empty arrays', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        
        const mockTileUrl = window.createMockTileUrl('success');
        // Use coordinates that return empty correction arrays
        const z = 8, x = 0, y = 0;
        const tileSize = 256;
        
        const result = await fetchAndFixTile(mockTileUrl, z, x, y, tileFixer, layerConfig, tileSize);
        
        return {
          wasFixed: result.wasFixed,
        };
      });

      expect(result.wasFixed).toBe(false);
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

  test.describe('Integration - Parallel Fetching', () => {
    test('handles parallel tile fetches efficiently', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        const mockTileUrl = window.createMockTileUrl('success');
        const tileSize = 256;
        
        // Fetch multiple tiles in parallel
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            fetchAndFixTile(mockTileUrl, 8, 182 + i, 101, tileFixer, layerConfig, tileSize)
          );
        }
        
        const results = await Promise.all(promises);
        
        return {
          count: results.length,
          allSucceeded: results.every(r => r.blob instanceof Blob),
        };
      });

      expect(result.count).toBe(5);
      expect(result.allSucceeded).toBe(true);
    });

    test('handles mixed success/failure in parallel fetches', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { fetchAndFixTile, tileFixer, layerConfig } = window.testContext;
        const tileSize = 256;
        
        // Mix of successful and failed fetches
        const promises = [
          fetchAndFixTile(window.createMockTileUrl('success'), 8, 182, 101, tileFixer, layerConfig, tileSize),
          fetchAndFixTile(window.createMockTileUrl('tile-fail'), 8, 183, 101, tileFixer, layerConfig, tileSize)
            .catch(err => ({ error: err.message })),
          fetchAndFixTile(window.createMockTileUrl('success'), 8, 184, 101, tileFixer, layerConfig, tileSize),
        ];
        
        const results = await Promise.all(promises);
        
        return {
          successCount: results.filter(r => r.blob instanceof Blob).length,
          errorCount: results.filter(r => r.error).length,
        };
      });

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
    });
  });
});
