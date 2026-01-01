import { test, expect } from '@playwright/test';

test.describe('Layer Configs Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/layer-configs-test.html');
    await page.waitForFunction(() => window.layerConfigsLoaded === true, { timeout: 10000 });
  });

  test.describe('cartoDbDark config', () => {
    // Various URL formats used for CartoDB dark tiles
    const validDarkUrls = [
      // Standard CartoDB URLs
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      // With retina
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      // Without subdomain prefix
      'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      'https://cartodb-basemaps-b.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
      // HTTP variant
      'http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      // With query params
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?v=1',
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?apikey=API_KEY',
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?v=1&apikey=API_KEY',
    ];

    const invalidDarkUrls = [
      // Light variant (not dark)
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      // Voyager variant
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      // OSM standard
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      // Random URL
      'https://example.com/tiles/{z}/{x}/{y}.png',
    ];

    for (const url of validDarkUrls) {
      test(`matches: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.cartoDbDark.match(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of invalidDarkUrls) {
      test(`does not match: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.cartoDbDark.match(testUrl);
        }, url);
        expect(matches).toBe(false);
      });
    }

    test('has correct properties', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.cartoDbDark;
        return {
          id: c.id,
          zoomThreshold: c.zoomThreshold,
          osmAddLineColor: c.osmAddLineColor,
          neAddLineColor: c.neAddLineColor,
        };
      });

      expect(config.id).toBe('cartodb-dark');
      expect(config.zoomThreshold).toBe(5);
    });
  });

  test.describe('osmCarto config', () => {
    // Various URL formats used for OSM standard tiles
    const validOsmUrls = [
      // Standard OSM URLs
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      // HTTP variant
      'http://tile.openstreetmap.org/{z}/{x}/{y}.png',
      // With actual coordinates
      'https://tile.openstreetmap.org/5/23/14.png',
      'https://a.tile.openstreetmap.org/10/512/341.png',
      // With query parameters
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png?apikey=API_KEY',
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png?v=1&apikey=API_KEY',
    ];

    const invalidOsmUrls = [
      // CartoDB tiles
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      // OSM but not standard style
      'https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png',
      // Random URL
      'https://example.com/tiles/{z}/{x}/{y}.png',
      // OSM domain but not tile URL (no .png)
      'https://tile.openstreetmap.org/about',
    ];

    for (const url of validOsmUrls) {
      test(`matches: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.osmCarto.match(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of invalidOsmUrls) {
      test(`does not match: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.osmCarto.match(testUrl);
        }, url);
        expect(matches).toBe(false);
      });
    }

    test('has correct properties', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.osmCarto;
        return {
          id: c.id,
          zoomThreshold: c.zoomThreshold,
          lineWidthStops: c.lineWidthStops,
          lineStyles: c.lineStyles,
        };
      });

      expect(config.id).toBe('osm-carto');
      expect(config.zoomThreshold).toBe(1);
      expect(config.lineStyles).toHaveLength(2);
      expect(config.lineStyles[0].color).toBe('rgb(200, 180, 200)');
      expect(config.lineStyles[1].dashArray).toEqual([30, 2, 8, 2]);
    });
  });

  test.describe('LayerConfigRegistry', () => {
    test('detectFromUrls returns correct config for CartoDB dark', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromUrls(
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        );
        return config?.id;
      });
      expect(configId).toBe('cartodb-dark');
    });

    test('detectFromUrls returns correct config for OSM standard', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromUrls(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        );
        return config?.id;
      });
      expect(configId).toBe('osm-carto');
    });

    test('detectFromUrls returns undefined for unknown URLs', async ({ page }) => {
      const config = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.detectFromUrls(
          'https://example.com/tiles/{z}/{x}/{y}.png'
        );
      });
      expect(config).toBeUndefined();
    });

    test('detectFromUrls works with array of URLs', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromUrls([
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        ]);
        return config?.id;
      });
      expect(configId).toBe('cartodb-dark');
    });

    test('get returns registered config by id', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.layerConfigs.get('cartodb-dark');
        return c ? { id: c.id } : null;
      });
      expect(config).toEqual({ id: 'cartodb-dark' });
    });

    test('get returns undefined for unknown id', async ({ page }) => {
      const config = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.get('unknown-config');
      });
      expect(config).toBeUndefined();
    });

    test('getAvailableIds returns all registered config ids', async ({ page }) => {
      const ids = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.getAvailableIds();
      });
      expect(ids).toContain('cartodb-dark');
      expect(ids).toContain('osm-carto');
    });
  });

  test.describe('LayerConfig class', () => {
    test('can create custom config', async ({ page }) => {
      const config = await page.evaluate(() => {
        const custom = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-test',
          zoomThreshold: 7,
          tileUrlTemplates: ['https://example.com/tiles/{z}/{x}/{y}.png'],
          lineStyles: [{ color: '#ff0000' }],
        });
        return {
          id: custom.id,
          zoomThreshold: custom.zoomThreshold,
          lineStyles: custom.lineStyles,
        };
      });

      expect(config.id).toBe('custom-test');
      expect(config.zoomThreshold).toBe(7);
      expect(config.lineStyles[0].color).toBe('#ff0000');
    });

    test('throws error when startZoom > zoomThreshold', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          new window.layerConfigsPackage.LayerConfig({
            id: 'invalid-config',
            startZoom: 10,
            zoomThreshold: 5,
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });

      expect(error).toContain('startZoom');
      expect(error).toContain('zoomThreshold');
    });

    test('match returns false when no tileUrlTemplates', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'no-pattern',
        });
        return config.match('https://example.com/tiles.png');
      });
      expect(matches).toBe(false);
    });

    test('accepts tileUrlTemplates string and works', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'template-config',
          tileUrlTemplates: 'https://example.com/tiles/{z}/{x}/{y}.png',
        });
        return config.match('https://example.com/tiles/5/10/15.png');
      });
      expect(matches).toBe(true);
    });
  });

  test.describe('extractCoords', () => {
    test('extracts coordinates from standard z/x/y pattern', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://tile.openstreetmap.org/5/15/12.png'
        );
      });
      expect(coords).toEqual({ z: 5, x: 15, y: 12 });
    });

    test('extracts coordinates with subdomain', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://a.tile.openstreetmap.org/10/512/341.png'
        );
      });
      expect(coords).toEqual({ z: 10, x: 512, y: 341 });
    });

    test('extracts coordinates from CartoDB URL', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.cartoDbDark.extractCoords(
          'https://a.basemaps.cartocdn.com/dark_all/3/4/2.png'
        );
      });
      expect(coords).toEqual({ z: 3, x: 4, y: 2 });
    });

    test('extracts coordinates with retina suffix', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.cartoDbDark.extractCoords(
          'https://a.basemaps.cartocdn.com/dark_all/7/64/42@2x.png'
        );
      });
      expect(coords).toEqual({ z: 7, x: 64, y: 42 });
    });

    test('extracts coordinates with query parameters in URL', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://tile.openstreetmap.org/8/128/96.png?v=1'
        );
      });
      expect(coords).toEqual({ z: 8, x: 128, y: 96 });
    });

    test('handles high zoom levels (z=18)', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://tile.openstreetmap.org/18/131072/87381.png'
        );
      });
      expect(coords).toEqual({ z: 18, x: 131072, y: 87381 });
    });

    test('handles zoom level 0', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://tile.openstreetmap.org/0/0/0.png'
        );
      });
      expect(coords).toEqual({ z: 0, x: 0, y: 0 });
    });

    test('returns null for non-matching URL', async ({ page }) => {
      const coords = await page.evaluate(() => {
        return window.layerConfigsPackage.osmCarto.extractCoords(
          'https://example.com/other/5/15/12.png'
        );
      });
      expect(coords).toBeNull();
    });

    test('extracts from custom template', async ({ page }) => {
      const coords = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'custom',
          tileUrlTemplates: 'https://example.com/api/v1/tiles/dark/{z}/{x}/{y}.png',
        });
        return config.extractCoords(
          'https://example.com/api/v1/tiles/dark/5/15/12.png'
        );
      });
      expect(coords).toEqual({ z: 5, x: 15, y: 12 });
    });

    test('supports OpenLayers {a-c} subdomain format', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'openlayers-style',
          tileUrlTemplates: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        });
        return {
          matchesWithSubdomain: config.match('https://a.tile.openstreetmap.org/5/10/15.png'),
          matchesWithoutSubdomain: config.match('https://tile.openstreetmap.org/5/10/15.png'),
          matchesTemplate: config.match('https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
          coordsA: config.extractCoords('https://a.tile.openstreetmap.org/5/10/15.png'),
          coordsB: config.extractCoords('https://b.tile.openstreetmap.org/8/100/200.png'),
          coordsNoSubdomain: config.extractCoords('https://tile.openstreetmap.org/3/2/1.png'),
        };
      });
      expect(result.matchesWithSubdomain).toBe(true);
      expect(result.matchesWithoutSubdomain).toBe(true);
      expect(result.matchesTemplate).toBe(true);
      expect(result.coordsA).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.coordsB).toEqual({ z: 8, x: 100, y: 200 });
      expect(result.coordsNoSubdomain).toEqual({ z: 3, x: 2, y: 1 });
    });

    test('supports OpenLayers {1-4} numeric subdomain format', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'numeric-subdomain',
          tileUrlTemplates: 'https://tile{1-4}.example.com/{z}/{x}/{y}.png',
        });
        return {
          matches1: config.match('https://tile1.example.com/5/10/15.png'),
          matches2: config.match('https://tile2.example.com/5/10/15.png'),
          coords: config.extractCoords('https://tile3.example.com/8/100/200.png'),
        };
      });
      expect(result.matches1).toBe(true);
      expect(result.matches2).toBe(true);
      expect(result.coords).toEqual({ z: 8, x: 100, y: 200 });
    });
  });

  test.describe('parseTileUrl', () => {
    test('parses OSM tile URL with coords and config', async ({ page }) => {
      const result = await page.evaluate(() => {
        const parsed = window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://tile.openstreetmap.org/5/15/12.png'
        );
        return parsed ? {
          configId: parsed.layerConfig.id,
          coords: parsed.coords,
        } : null;
      });
      expect(result).toEqual({
        configId: 'osm-carto',
        coords: { z: 5, x: 15, y: 12 },
      });
    });

    test('parses CartoDB tile URL with coords and config', async ({ page }) => {
      const result = await page.evaluate(() => {
        const parsed = window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://a.basemaps.cartocdn.com/dark_all/3/4/2.png'
        );
        return parsed ? {
          configId: parsed.layerConfig.id,
          coords: parsed.coords,
        } : null;
      });
      expect(result).toEqual({
        configId: 'cartodb-dark',
        coords: { z: 3, x: 4, y: 2 },
      });
    });

    test('returns null for unknown tile provider', async ({ page }) => {
      const result = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://unknown.example.com/tiles/5/15/12.png'
        );
      });
      expect(result).toBeNull();
    });

    test('returns null when URL has no coordinates', async ({ page }) => {
      const result = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://tile.openstreetmap.org/about'
        );
      });
      expect(result).toBeNull();
    });

    test('works with template URLs containing {z}/{x}/{y}', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Even though this is a template, the pattern should match for config
        // but coords extraction will fail, so should return null
        return window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        );
      });
      expect(result).toBeNull(); // No actual numeric coords
    });

    test('works with custom registry', async ({ page }) => {
      const result = await page.evaluate(() => {
        // Create custom registry with custom config
        const customRegistry = new window.layerConfigsPackage.LayerConfigRegistry();
        const customConfig = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-tiles',
          tileUrlTemplates: 'https://custom.example.com/tiles/{z}/{x}/{y}.png',
        });
        customRegistry.register(customConfig);

        const parsed = customRegistry.parseTileUrl(
          'https://custom.example.com/tiles/5/15/12.png'
        );
        return parsed ? {
          configId: parsed.layerConfig.id,
          coords: parsed.coords,
        } : null;
      });
      expect(result).toEqual({
        configId: 'custom-tiles',
        coords: { z: 5, x: 15, y: 12 },
      });
    });

    test('parses retina tiles correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const parsed = window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://a.basemaps.cartocdn.com/dark_all/7/64/42@2x.png'
        );
        return parsed ? {
          configId: parsed.layerConfig.id,
          coords: parsed.coords,
        } : null;
      });
      expect(result).toEqual({
        configId: 'cartodb-dark',
        coords: { z: 7, x: 64, y: 42 },
      });
    });

    test('handles URLs with query parameters', async ({ page }) => {
      const result = await page.evaluate(() => {
        const parsed = window.layerConfigsPackage.layerConfigs.parseTileUrl(
          'https://tile.openstreetmap.org/8/128/96.png?v=1&key=value'
        );
        return parsed ? {
          configId: parsed.layerConfig.id,
          coords: parsed.coords,
        } : null;
      });
      expect(result).toEqual({
        configId: 'osm-carto',
        coords: { z: 8, x: 128, y: 96 },
      });
    });
  });
});
