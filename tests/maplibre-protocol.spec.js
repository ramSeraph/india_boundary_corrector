import { test, expect } from '@playwright/test';

test.describe('MapLibre Protocol Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/maplibre-protocol-test.html');
    await page.waitForFunction(() => window.maplibreProtocolLoaded === true, { timeout: 10000 });
  });

  test.describe('parseCorrectionsUrl', () => {
    test('parses registered URL without config ID', async ({ page }) => {
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

    test('parses registered URL with retina suffix (@2x) without config ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://https://b.basemaps.cartocdn.com/dark_all/4/12/5@2x.png');
      });

      expect(result.configId).toBeNull();
      expect(result.tileUrl).toBe('https://b.basemaps.cartocdn.com/dark_all/4/12/5@2x.png');
      expect(result.z).toBe(4);
      expect(result.x).toBe(12);
      expect(result.y).toBe(5);
    });

    test('returns undefined coords for unregistered URL without config ID', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://https://example.com/tiles/8/182/101.png');
      });

      expect(result.configId).toBeNull();
      expect(result.tileUrl).toBe('https://example.com/tiles/8/182/101.png');
      expect(result.z).toBeUndefined();
      expect(result.x).toBeUndefined();
      expect(result.y).toBeUndefined();
    });

    test('parses URL with config ID - standard tile URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://custom-tiles.example.com/8/182/101.png');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.tileUrl).toBe('https://custom-tiles.example.com/8/182/101.png');
      expect(result.z).toBe(8);
      expect(result.x).toBe(182);
      expect(result.y).toBe(101);
    });

    test('parses URL with config ID - retina suffix @2x', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto-dark@https://custom-tiles.example.com/4/12/5@2x.png');
      });

      expect(result.configId).toBe('osm-carto-dark');
      expect(result.tileUrl).toBe('https://custom-tiles.example.com/4/12/5@2x.png');
      expect(result.z).toBe(4);
      expect(result.x).toBe(12);
      expect(result.y).toBe(5);
    });

    test('parses URL with config ID - retina suffix @3x', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://example.com/10/500/300@3x.png');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.z).toBe(10);
      expect(result.x).toBe(500);
      expect(result.y).toBe(300);
    });

    test('parses URL with config ID - path segments before coords', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://example.com/api/v1/tiles/osm/8/182/101.png');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.z).toBe(8);
      expect(result.x).toBe(182);
      expect(result.y).toBe(101);
    });

    test('parses URL with config ID - .jpg extension', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://example.com/5/10/15.jpg');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.z).toBe(5);
      expect(result.x).toBe(10);
      expect(result.y).toBe(15);
    });

    test('parses URL with config ID - .webp extension', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://example.com/tiles/6/20/25.webp');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.z).toBe(6);
      expect(result.x).toBe(20);
      expect(result.y).toBe(25);
    });

    test('returns undefined coords with config ID - invalid z/x/y pattern', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@https://example.com/invalid/path.png');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.tileUrl).toBe('https://example.com/invalid/path.png');
      expect(result.z).toBeUndefined();
      expect(result.x).toBeUndefined();
      expect(result.y).toBeUndefined();
    });

    test('returns undefined coords with config ID - invalid URL', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { parseCorrectionsUrl } = window.testContext;
        return parseCorrectionsUrl('ibc://osm-carto@not-a-valid-url');
      });

      expect(result.configId).toBe('osm-carto');
      expect(result.z).toBeUndefined();
      expect(result.x).toBeUndefined();
      expect(result.y).toBeUndefined();
    });
  });

  test.describe('Invalid URL Handling', () => {
    test('falls back to original tile when coords cannot be parsed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionProtocol } = window;
        const protocol = new CorrectionProtocol();
        
        // Capture console warnings
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));
        
        const loadFn = protocol._loadFn;
        
        // URL without valid z/x/y pattern - use mock URL so fallback fetch works
        const mockUrl = window.createMockTileUrl('success');
        const response = await loadFn({ url: `ibc://${mockUrl.replace(/\/\d+\/\d+\/\d+\.png$/, '/invalid/path.png')}` });
        
        console.warn = originalWarn;
        
        return {
          hasData: response.data instanceof ArrayBuffer,
          dataSize: response.data.byteLength,
          hadWarning: warnings.some(w => w.includes('Could not parse tile coordinates')),
        };
      });

      // Should fallback to fetching original tile
      expect(result.hasData).toBe(true);
      expect(result.dataSize).toBeGreaterThan(0);
      expect(result.hadWarning).toBe(true);
    });

    test('falls back to original tile for unregistered tile URL', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionProtocol } = window;
        const protocol = new CorrectionProtocol();
        
        // Capture console warnings
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = (...args) => warnings.push(args.join(' '));
        
        const loadFn = protocol._loadFn;
        
        // Valid z/x/y pattern but unregistered domain - use mock URL
        const mockUrl = window.createMockTileUrl('success');
        const response = await loadFn({ url: `ibc://${mockUrl}` });
        
        console.warn = originalWarn;
        
        return {
          hasData: response.data instanceof ArrayBuffer,
          dataSize: response.data.byteLength,
          hadWarning: warnings.some(w => w.includes('Could not parse tile coordinates')),
        };
      });

      // Should fallback to fetching original tile (unregistered URL can't be parsed)
      expect(result.hasData).toBe(true);
      expect(result.dataSize).toBeGreaterThan(0);
      expect(result.hadWarning).toBe(true);
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
          tileUrlTemplates: ['https://custom.example.com/{z}/{x}/{y}.png'],
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        protocol.addLayerConfig(customConfig);
        
        return {
          hasCustomConfig: protocol.getRegistry().get('custom-test') !== undefined,
        };
      });

      expect(result.hasCustomConfig).toBe(true);
    });

    test('auto-detects layer config from tile URL when no configId provided', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { parseCorrectionsUrl } = window.testContext;
        const { CorrectionProtocol: CP } = window;
        const protocol = new CP();
        
        // Parse URL without configId - should auto-detect from tile URL
        const parsed = parseCorrectionsUrl('ibc://https://tile.openstreetmap.org/8/182/101.png');
        
        // Verify no configId in URL
        const hasNoConfigId = parsed.configId === null;
        
        // The registry should be able to detect from the tile URL
        const detectedConfig = protocol.getRegistry().detectFromTileUrls([parsed.tileUrl]);
        
        return {
          hasNoConfigId,
          detectedConfigId: detectedConfig?.id,
        };
      });

      expect(result.hasNoConfigId).toBe(true);
      expect(result.detectedConfigId).toBe('osm-carto');
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
