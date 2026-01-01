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
});
