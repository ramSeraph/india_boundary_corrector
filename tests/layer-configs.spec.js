import { test, expect } from '@playwright/test';

test.describe('Layer Configs Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/layer-configs-test.html');
    await page.waitForFunction(() => window.layerConfigsLoaded === true, { timeout: 10000 });
  });

  test.describe('osmCartoDark config', () => {
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
          return window.layerConfigsPackage.osmCartoDark.match(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of invalidDarkUrls) {
      test(`does not match: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.osmCartoDark.match(testUrl);
        }, url);
        expect(matches).toBe(false);
      });
    }

    test('has correct properties', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.osmCartoDark;
        return {
          id: c.id,
          zoomThreshold: c.zoomThreshold,
          osmAddLineColor: c.osmAddLineColor,
          osmDelLineColor: c.osmDelLineColor,
          neAddLineColor: c.neAddLineColor,
          neDelLineColor: c.neDelLineColor,
        };
      });

      expect(config.id).toBe('osm-carto-dark');
      expect(config.zoomThreshold).toBe(5);
      expect(config.osmDelLineColor).toBe('#090909'); // Dark background color
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
          addLineDashed: c.addLineDashed,
          addLineDashArray: c.addLineDashArray,
        };
      });

      expect(config.id).toBe('osm-carto');
      expect(config.zoomThreshold).toBe(1);
      expect(config.addLineDashed).toBe(true);
      expect(config.addLineDashArray).toEqual([10, 1, 2, 1]);
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
      expect(configId).toBe('osm-carto-dark');
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
      expect(configId).toBe('osm-carto-dark');
    });

    test('get returns registered config by id', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.layerConfigs.get('osm-carto-dark');
        return c ? { id: c.id } : null;
      });
      expect(config).toEqual({ id: 'osm-carto-dark' });
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
      expect(ids).toContain('osm-carto-dark');
      expect(ids).toContain('osm-carto');
    });
  });

  test.describe('LayerConfig class', () => {
    test('can create custom config', async ({ page }) => {
      const config = await page.evaluate(() => {
        const custom = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-test',
          zoomThreshold: 7,
          tileUrlPattern: /example\.com.*tiles/,
          osmAddLineColor: '#ff0000',
          osmDelLineColor: '#00ff00',
        });
        return {
          id: custom.id,
          zoomThreshold: custom.zoomThreshold,
          osmAddLineColor: custom.osmAddLineColor,
          osmDelLineColor: custom.osmDelLineColor,
          neAddLineColor: custom.neAddLineColor, // Should fallback to osm color
          neDelLineColor: custom.neDelLineColor,
        };
      });

      expect(config.id).toBe('custom-test');
      expect(config.zoomThreshold).toBe(7);
      expect(config.osmAddLineColor).toBe('#ff0000');
      expect(config.neAddLineColor).toBe('#ff0000'); // Fallback
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

    test('match returns false when no tileUrlPattern', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'no-pattern',
        });
        return config.match('https://example.com/tiles.png');
      });
      expect(matches).toBe(false);
    });

    test('accepts string pattern and converts to RegExp', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'string-pattern',
          tileUrlPattern: 'example\\.com.*tiles',
        });
        return config.match('https://example.com/my/tiles/here.png');
      });
      expect(matches).toBe(true);
    });
  });
});
