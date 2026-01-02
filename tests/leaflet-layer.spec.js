import { test, expect } from '@playwright/test';

test.describe('Leaflet Layer Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/leaflet-layer-test.html');
    await page.waitForFunction(() => window.leafletLayerLoaded === true, { timeout: 10000 });
  });

  test.describe('_fetchAndFixTile - Wrapper Behavior', () => {
    test('returns Blob with correct type when fixed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const layer = window.testLayer;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101; // Tile with corrections
        const tileSize = 256;
        
        const result = await layer._fetchAndFixTile(mockTileUrl, z, x, y, tileSize);
        
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
        const layer = window.testLayer;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // Tile without corrections
        const tileSize = 256;
        
        const result = await layer._fetchAndFixTile(mockTileUrl, z, x, y, tileSize);
        
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
        const layer = window.testLayer;
        
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        const tileSize = 256;
        
        try {
          await layer._fetchAndFixTile(mockTileUrl, z, x, y, tileSize);
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
          hasTileFixer: !!layer._tileFixer,
          hasLayerConfig: !!layer._layerConfig,
          pmtilesUrl: layer._pmtilesUrl,
        };
      });

      expect(result.hasTileFixer).toBe(true);
      expect(result.hasLayerConfig).toBe(true);
      expect(result.pmtilesUrl).toBeTruthy();
    });

    test('initializes with custom PMTiles URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const customUrl = 'https://custom.example.com/tiles.pmtiles';
        const L = window.L;
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          { pmtilesUrl: customUrl }
        );
        
        return {
          pmtilesUrl: layer._pmtilesUrl,
        };
      });

      expect(result.pmtilesUrl).toBe('https://custom.example.com/tiles.pmtiles');
    });

    test('detects layer config from URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const L = window.L;
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        );
        
        return {
          hasLayerConfig: !!layer._layerConfig,
          configId: layer._layerConfig?.id,
        };
      });

      expect(result.hasLayerConfig).toBe(true);
      expect(result.configId).toBeTruthy();
    });

    test('uses specified layer config by ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const L = window.L;
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          { layerConfig: 'osm-carto' }
        );
        
        return {
          hasLayerConfig: !!layer._layerConfig,
          configId: layer._layerConfig?.id,
        };
      });

      expect(result.hasLayerConfig).toBe(true);
      expect(result.configId).toBe('osm-carto');
    });

    test('warns when layer config cannot be detected', async ({ page }) => {
      const result = await page.evaluate(() => {
        const L = window.L;
        
        // Capture console warnings
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));
        
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://unknown.example.com/{z}/{x}/{y}.png'
        );
        
        console.warn = originalWarn;
        
        return {
          hasLayerConfig: !!layer._layerConfig,
          hadWarning: warnings.some(w => w.includes('Could not detect layer config')),
        };
      });

      expect(result.hasLayerConfig).toBe(false);
      expect(result.hadWarning).toBe(true);
    });
  });

  test.describe('correctionerror Event', () => {
    test('fires correctionerror event when PMTiles fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const L = window.L;
        
        // Create layer with a broken PMTiles URL
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          { 
            layerConfig: 'osm-carto',
            pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
          }
        );

        // Listen for correction error event
        let errorEvent = null;
        layer.on('correctionerror', (e) => {
          errorEvent = {
            hasError: !!e.error,
            hasCoords: !!e.coords,
            hasTileUrl: !!e.tileUrl,
            coords: e.coords,
          };
        });

        // Use a mock tile URL that succeeds (so only PMTiles fails)
        const mockTileUrl = window.createMockTileUrl('success');
        
        // Override getTileUrl to return our mock URL
        layer.getTileUrl = () => mockTileUrl;
        
        // Create a tile - PMTiles will fail, triggering correctionerror
        const coords = { z: 8, x: 182, y: 101 };
        layer.createTile(coords, () => {});

        // Wait for the async error to fire
        await new Promise(resolve => setTimeout(resolve, 1000));

        return errorEvent;
      });

      expect(result).not.toBeNull();
      expect(result.hasError).toBe(true);
      expect(result.hasCoords).toBe(true);
      expect(result.hasTileUrl).toBe(true);
      expect(result.coords).toEqual({ z: 8, x: 182, y: 101 });
    });

    test('falls back to original tile data when corrections fail', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const L = window.L;
        
        // Create layer with a broken PMTiles URL
        const layer = L.tileLayer.indiaBoundaryCorrected(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          { 
            layerConfig: 'osm-carto',
            pmtilesUrl: 'https://nonexistent.example.com/broken.pmtiles'
          }
        );

        // Use a mock tile URL that succeeds
        const mockTileUrl = window.createMockTileUrl('success');
        
        // Call _fetchAndFixTile directly - should return tile data even when corrections fail
        const result = await layer._fetchAndFixTile(mockTileUrl, 8, 182, 101, 256);

        return { 
          hasBlob: result.blob instanceof Blob,
          blobSize: result.blob.size,
          correctionsFailed: result.correctionsFailed,
        };
      });

      // Tile data should be returned even when corrections fail
      expect(result.hasBlob).toBe(true);
      expect(result.blobSize).toBeGreaterThan(0);
      expect(result.correctionsFailed).toBe(true);
    });
  });
});
