import { test, expect } from '@playwright/test';

test.describe('Layer Configs Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/layer-configs-test.html');
    await page.waitForFunction(() => window.layerConfigsLoaded === true, { timeout: 10000 });
  });

  test.describe('configs.json validation', () => {
    test('all configs in configs.json are valid', async ({ page }) => {
      const result = await page.evaluate(() => {
        const errors = [];
        const configsJson = window.layerConfigsPackage.configsJson;
        
        for (let i = 0; i < configsJson.length; i++) {
          const config = configsJson[i];
          try {
            window.layerConfigsPackage.LayerConfig.validateJSON(config);
          } catch (e) {
            errors.push({ index: i, id: config.id, error: e.message });
          }
        }
        
        return { count: configsJson.length, errors };
      });
      
      expect(result.errors).toEqual([]);
      expect(result.count).toBeGreaterThan(0);
    });
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

    // Template URLs should use matchTemplate
    const templateUrls = validDarkUrls.filter(url => url.includes('{z}'));
    // Actual tile URLs should use matchTileUrl  
    const tileUrls = validDarkUrls.filter(url => !url.includes('{z}'));

    for (const url of templateUrls) {
      test(`matchTemplate: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.cartoDbDark.matchTemplate(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of tileUrls) {
      test(`matchTileUrl: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.cartoDbDark.matchTileUrl(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of invalidDarkUrls) {
      test(`does not match: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          const config = window.layerConfigsPackage.cartoDbDark;
          // Test both methods - neither should match
          return config.matchTemplate(testUrl) || config.matchTileUrl(testUrl);
        }, url);
        expect(matches).toBe(false);
      });
    }

    test('has correct properties', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.cartoDbDark;
        return {
          id: c.id,
          lineStyles: c.lineStyles.map(s => ({ color: s.color, layerSuffix: s.layerSuffix })),
        };
      });

      expect(config.id).toBe('cartodb-dark');
      expect(config.lineStyles.length).toBeGreaterThan(0);
      // Should have both ne and osm layer suffixes
      const suffixes = config.lineStyles.map(s => s.layerSuffix);
      expect(suffixes).toContain('ne');
      expect(suffixes).toContain('osm');
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

    // Template URLs should use matchTemplate
    const templateUrls = validOsmUrls.filter(url => url.includes('{z}'));
    // Actual tile URLs should use matchTileUrl
    const tileUrls = validOsmUrls.filter(url => !url.includes('{z}'));

    for (const url of templateUrls) {
      test(`matchTemplate: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.osmCarto.matchTemplate(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of tileUrls) {
      test(`matchTileUrl: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          return window.layerConfigsPackage.osmCarto.matchTileUrl(testUrl);
        }, url);
        expect(matches).toBe(true);
      });
    }

    for (const url of invalidOsmUrls) {
      test(`does not match: ${url}`, async ({ page }) => {
        const matches = await page.evaluate((testUrl) => {
          const config = window.layerConfigsPackage.osmCarto;
          return config.matchTemplate(testUrl) || config.matchTileUrl(testUrl);
        }, url);
        expect(matches).toBe(false);
      });
    }

    test('has correct properties', async ({ page }) => {
      const config = await page.evaluate(() => {
        const c = window.layerConfigsPackage.osmCarto;
        return {
          id: c.id,
          lineWidthStops: c.lineWidthStops,
          lineStyles: c.lineStyles.map(s => ({ color: s.color, layerSuffix: s.layerSuffix, dashArray: s.dashArray })),
        };
      });

      expect(config.id).toBe('osm-carto');
      expect(config.lineStyles).toHaveLength(2);
      expect(config.lineStyles[0].color).toBe('rgb(200, 180, 200)');
      expect(config.lineStyles[0].layerSuffix).toBe('osm');
      expect(config.lineStyles[1].dashArray).toEqual([30, 2, 8, 2]);
    });
  });

  test.describe('LayerConfigRegistry', () => {
    test('detectFromTemplates returns correct config for CartoDB dark', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromTemplates(
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        );
        return config?.id;
      });
      expect(configId).toBe('cartodb-dark');
    });

    test('detectFromTemplates returns correct config for OSM standard', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromTemplates(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        );
        return config?.id;
      });
      expect(configId).toBe('osm-carto');
    });

    test('detectFromTemplates returns undefined for unknown URLs', async ({ page }) => {
      const config = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.detectFromTemplates(
          'https://example.com/tiles/{z}/{x}/{y}.png'
        );
      });
      expect(config).toBeUndefined();
    });

    test('detectFromTemplates works with array of URLs', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromTemplates([
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        ]);
        return config?.id;
      });
      expect(configId).toBe('cartodb-dark');
    });

    test('detectFromTileUrls returns correct config for CartoDB dark', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromTileUrls(
          'https://a.basemaps.cartocdn.com/dark_all/5/10/15.png'
        );
        return config?.id;
      });
      expect(configId).toBe('cartodb-dark');
    });

    test('detectFromTileUrls returns correct config for OSM standard', async ({ page }) => {
      const configId = await page.evaluate(() => {
        const config = window.layerConfigsPackage.layerConfigs.detectFromTileUrls(
          'https://tile.openstreetmap.org/8/128/96.png'
        );
        return config?.id;
      });
      expect(configId).toBe('osm-carto');
    });

    test('detectFromTileUrls returns undefined for unknown URLs', async ({ page }) => {
      const config = await page.evaluate(() => {
        return window.layerConfigsPackage.layerConfigs.detectFromTileUrls(
          'https://example.com/tiles/5/10/15.png'
        );
      });
      expect(config).toBeUndefined();
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

    test('createMergedRegistry includes original configs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const merged = window.layerConfigsPackage.layerConfigs.createMergedRegistry();
        return {
          hasCartodb: !!merged.get('cartodb-dark'),
          hasOsm: !!merged.get('osm-carto'),
          ids: merged.getAvailableIds(),
        };
      });
      expect(result.hasCartodb).toBe(true);
      expect(result.hasOsm).toBe(true);
      expect(result.ids).toContain('cartodb-dark');
      expect(result.ids).toContain('osm-carto');
    });

    test('createMergedRegistry includes extra configs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const customConfig = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-merged',
          tileUrlTemplates: 'https://custom.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        const merged = window.layerConfigsPackage.layerConfigs.createMergedRegistry([customConfig]);
        return {
          hasCustom: !!merged.get('custom-merged'),
          hasCartodb: !!merged.get('cartodb-dark'),
          ids: merged.getAvailableIds(),
        };
      });
      expect(result.hasCustom).toBe(true);
      expect(result.hasCartodb).toBe(true);
      expect(result.ids).toContain('custom-merged');
      expect(result.ids).toContain('cartodb-dark');
    });

    test('createMergedRegistry does not modify original registry', async ({ page }) => {
      const result = await page.evaluate(() => {
        const customConfig = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-should-not-appear',
          tileUrlTemplates: 'https://custom2.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'blue', layerSuffix: 'osm' }],
        });
        const original = window.layerConfigsPackage.layerConfigs;
        const merged = original.createMergedRegistry([customConfig]);
        return {
          originalHasCustom: !!original.get('custom-should-not-appear'),
          mergedHasCustom: !!merged.get('custom-should-not-appear'),
        };
      });
      expect(result.originalHasCustom).toBe(false);
      expect(result.mergedHasCustom).toBe(true);
    });

    test('createMergedRegistry detects from extra configs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const customConfig = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-detect',
          tileUrlTemplates: 'https://detect.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'green', layerSuffix: 'osm' }],
        });
        const merged = window.layerConfigsPackage.layerConfigs.createMergedRegistry([customConfig]);
        const detected = merged.detectFromTemplates('https://detect.example.com/{z}/{x}/{y}.png');
        return detected?.id;
      });
      expect(result).toBe('custom-detect');
    });

    test('createMergedRegistry with null/undefined extra configs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const mergedNull = window.layerConfigsPackage.layerConfigs.createMergedRegistry(null);
        const mergedUndefined = window.layerConfigsPackage.layerConfigs.createMergedRegistry(undefined);
        const mergedEmpty = window.layerConfigsPackage.layerConfigs.createMergedRegistry([]);
        return {
          nullIds: mergedNull.getAvailableIds(),
          undefinedIds: mergedUndefined.getAvailableIds(),
          emptyIds: mergedEmpty.getAvailableIds(),
        };
      });
      // All should have the original configs
      expect(result.nullIds).toContain('cartodb-dark');
      expect(result.undefinedIds).toContain('cartodb-dark');
      expect(result.emptyIds).toContain('cartodb-dark');
    });
  });

  test.describe('LayerConfig class', () => {
    test('can create custom config', async ({ page }) => {
      const config = await page.evaluate(() => {
        const custom = new window.layerConfigsPackage.LayerConfig({
          id: 'custom-test',
          tileUrlTemplates: ['https://example.com/tiles/{z}/{x}/{y}.png'],
          lineStyles: [{ color: '#ff0000', layerSuffix: 'osm' }],
        });
        return {
          id: custom.id,
          lineStyles: custom.lineStyles.map(s => ({ color: s.color, layerSuffix: s.layerSuffix })),
        };
      });

      expect(config.id).toBe('custom-test');
      expect(config.lineStyles[0].color).toBe('#ff0000');
      expect(config.lineStyles[0].layerSuffix).toBe('osm');
    });

    test('fromJSON throws error when lineStyles is missing', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'invalid-config',
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });

      expect(error).toContain('lineStyles');
    });

    test('fromJSON throws error when id is missing', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({});
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-empty string');
    });

    test('fromJSON throws error when id is empty string', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({ id: '' });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-empty string');
    });

    test('fromJSON throws error when id is not a string', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({ id: 123 });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-empty string');
    });

    test('fromJSON throws error when id contains slashes', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({ id: 'my/custom/config' });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('cannot contain slashes');
    });

    test('fromJSON throws error when lineWidthStops is not an object', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: 'invalid',
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('lineWidthStops must be an object');
    });

    test('fromJSON throws error when lineWidthStops is an array', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: [1, 2],
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('lineWidthStops must be an object');
    });

    test('fromJSON throws error when lineWidthStops has fewer than 2 entries', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: { 1: 0.5 },
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('at least 2 entries');
    });

    test('fromJSON throws error when lineWidthStops has non-integer key', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: { 'abc': 0.5, 10: 2.5 },
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-negative integers');
    });

    test('fromJSON throws error when lineWidthStops has negative key', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: { '-1': 0.5, 10: 2.5 },
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-negative integers');
    });

    test('fromJSON throws error when lineWidthStops has non-positive value', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineWidthStops: { 1: 0, 10: 2.5 },
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('positive numbers');
    });

    test('fromJSON throws error when lineStyles is not an array', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineStyles: { color: 'red' },
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-empty array');
    });

    test('fromJSON throws error when lineStyles is empty array', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineStyles: [],
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('non-empty array');
    });

    test('fromJSON throws error when lineStyles entry is not an object', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineStyles: ['red'],
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('must be an object');
    });

    test('fromJSON throws error when lineStyles entry has no color', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineStyles: [{ widthFraction: 1.0 }],
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('color must be a non-empty string');
    });

    test('fromJSON throws error when lineStyles entry has empty color', async ({ page }) => {
      const error = await page.evaluate(() => {
        try {
          window.layerConfigsPackage.LayerConfig.fromJSON({
            id: 'test',
            lineStyles: [{ color: '' }],
          });
          return null;
        } catch (e) {
          return e.message;
        }
      });
      expect(error).toContain('color must be a non-empty string');
    });

    test('matchTemplate: {s} placeholder matches {a-c} style template', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test-s-placeholder',
          tileUrlTemplates: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('matchTemplate: {a-c} placeholder matches {s} style template', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test-ac-placeholder',
          tileUrlTemplates: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('matchTemplate: {s} placeholder matches actual subdomain', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test-s-actual',
          tileUrlTemplates: 'https://{s}.tile.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://a.tile.example.com/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('matchTemplate: {a-c} placeholder matches actual subdomain', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test-ac-actual',
          tileUrlTemplates: 'https://{a-c}.tile.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://b.tile.example.com/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('matchTemplate: {1-4} numeric placeholder matches {s} style template', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test-14-placeholder',
          tileUrlTemplates: 'https://tile{1-4}.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://tile{s}.example.com/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('matchTemplate returns false when no tileUrlTemplates', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'no-pattern',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://example.com/tiles/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(false);
    });

    test('matchTileUrl returns false when no tileUrlTemplates', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'no-pattern',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTileUrl('https://example.com/tiles/5/10/15.png');
      });
      expect(matches).toBe(false);
    });

    test('accepts tileUrlTemplates string and matchTileUrl works', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'template-config',
          tileUrlTemplates: 'https://example.com/tiles/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTileUrl('https://example.com/tiles/5/10/15.png');
      });
      expect(matches).toBe(true);
    });

    test('accepts tileUrlTemplates string and matchTemplate works', async ({ page }) => {
      const matches = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'template-config',
          tileUrlTemplates: 'https://example.com/tiles/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.matchTemplate('https://example.com/tiles/{z}/{x}/{y}.png');
      });
      expect(matches).toBe(true);
    });

    test('lineStyles get startZoom and endZoom defaults', async ({ page }) => {
      const result = await page.evaluate(() => {
        const INFINITY = window.layerConfigsPackage.INFINITY;
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          lineStyles: [
            { color: 'red', layerSuffix: 'osm' },
            { color: 'blue', layerSuffix: 'osm', startZoom: 5 },
            { color: 'green', layerSuffix: 'osm', endZoom: 8 },
            { color: 'yellow', layerSuffix: 'osm', startZoom: 3, endZoom: 6 },
          ],
        });
        // Use toJSON to get serialized form for comparison
        return {
          styles: config.lineStyles.map(s => s.toJSON()),
          INFINITY,
        };
      });
      const { styles, INFINITY } = result;
      // startZoom defaults to 0, endZoom defaults to INFINITY (-1), delWidthFactor defaults to 1.5
      expect(styles[0]).toEqual({ color: 'red', layerSuffix: 'osm', widthFraction: 1.0, dashArray: undefined, alpha: 1.0, startZoom: 0, endZoom: INFINITY, lineExtensionFactor: 0.5, delWidthFactor: 1.5 });
      expect(styles[1]).toEqual({ color: 'blue', layerSuffix: 'osm', widthFraction: 1.0, dashArray: undefined, alpha: 1.0, startZoom: 5, endZoom: INFINITY, lineExtensionFactor: 0.5, delWidthFactor: 1.5 });
      expect(styles[2]).toEqual({ color: 'green', layerSuffix: 'osm', widthFraction: 1.0, dashArray: undefined, alpha: 1.0, startZoom: 0, endZoom: 8, lineExtensionFactor: 0.5, delWidthFactor: 1.5 });
      expect(styles[3]).toEqual({ color: 'yellow', layerSuffix: 'osm', widthFraction: 1.0, dashArray: undefined, alpha: 1.0, startZoom: 3, endZoom: 6, lineExtensionFactor: 0.5, delWidthFactor: 1.5 });
    });

    test('getLineStylesForZoom returns active styles', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          lineStyles: [
            { color: 'red', layerSuffix: 'osm', startZoom: 1 },           // z1+
            { color: 'blue', layerSuffix: 'osm', startZoom: 5 },          // z5+
            { color: 'green', layerSuffix: 'osm', startZoom: 1, endZoom: 4 },  // z1-4
            { color: 'yellow', layerSuffix: 'osm', startZoom: 3, endZoom: 6 }, // z3-6
          ],
        });
        return {
          z1: config.getLineStylesForZoom(1).map(s => s.color),
          z3: config.getLineStylesForZoom(3).map(s => s.color),
          z5: config.getLineStylesForZoom(5).map(s => s.color),
          z7: config.getLineStylesForZoom(7).map(s => s.color),
        };
      });
      expect(result.z1).toEqual(['red', 'green']);
      expect(result.z3).toEqual(['red', 'green', 'yellow']);
      expect(result.z5).toEqual(['red', 'blue', 'yellow']);
      expect(result.z7).toEqual(['red', 'blue']);
    });

    test('toJSON and fromJSON roundtrip preserves config', async ({ page }) => {
      const result = await page.evaluate(() => {
        const original = new window.layerConfigsPackage.LayerConfig({
          id: 'roundtrip-test',
          tileUrlTemplates: ['https://example.com/{z}/{x}/{y}.png'],
          lineWidthStops: { 1: 0.5, 10: 3.0 },
          lineStyles: [
            // Was: { color: 'red' } with startZoom:2, zoomThreshold:6, lineExtensionFactor:0.75
            // Now split into ne (z2-5) and osm (z6+), with lineExtensionFactor and delWidthFactor on each
            { color: 'red', layerSuffix: 'ne', startZoom: 2, endZoom: 5, lineExtensionFactor: 0.75, delWidthFactor: 2.0 },
            { color: 'red', layerSuffix: 'osm', startZoom: 6, lineExtensionFactor: 0.75, delWidthFactor: 2.0 },
            { color: 'blue', layerSuffix: 'ne', startZoom: 2, endZoom: 5, widthFraction: 0.5, dashArray: [10, 5], lineExtensionFactor: 0.75, delWidthFactor: 2.0 },
            { color: 'blue', layerSuffix: 'osm', startZoom: 6, widthFraction: 0.5, dashArray: [10, 5], lineExtensionFactor: 0.75, delWidthFactor: 2.0 },
          ],
        });

        const json = original.toJSON();
        const restored = window.layerConfigsPackage.LayerConfig.fromJSON(json);

        return {
          original: {
            id: original.id,
            tileUrlTemplates: original.tileUrlTemplates,
            lineWidthStops: original.lineWidthStops,
            lineStyles: original.lineStyles.map(s => s.toJSON()),
          },
          restored: {
            id: restored.id,
            tileUrlTemplates: restored.tileUrlTemplates,
            lineWidthStops: restored.lineWidthStops,
            lineStyles: restored.lineStyles.map(s => s.toJSON()),
          },
          // Verify restored config still works
          matchesUrl: restored.matchTileUrl('https://example.com/5/10/15.png'),
          extractedCoords: restored.extractCoords('https://example.com/5/10/15.png'),
        };
      });

      expect(result.original).toEqual(result.restored);
      expect(result.matchesUrl).toBe(true);
      expect(result.extractedCoords).toEqual({ z: 5, x: 10, y: 15 });
    });

    test('fromJSON creates functional config from plain object', async ({ page }) => {
      const result = await page.evaluate(() => {
        const plainObject = {
          id: 'from-plain',
          tileUrlTemplates: ['https://{s}.tiles.test.com/{z}/{x}/{y}.png'],
          lineWidthStops: { 1: 0.25, 8: 2.0 },
          // Was: startZoom:1, zoomThreshold:5, lineStyles:[{color:'green'}]
          // Now split into ne (z1-4) and osm (z5+)
          lineStyles: [
            { color: 'green', layerSuffix: 'ne', startZoom: 1, endZoom: 4 },
            { color: 'green', layerSuffix: 'osm', startZoom: 5 },
          ],
        };

        const config = window.layerConfigsPackage.LayerConfig.fromJSON(plainObject);

        return {
          id: config.id,
          matchesUrl: config.matchTileUrl('https://a.tiles.test.com/3/4/5.png'),
          extractedCoords: config.extractCoords('https://b.tiles.test.com/7/100/200.png'),
          stylesAtZoom3: config.getLineStylesForZoom(3).map(s => s.color),
        };
      });

      expect(result.id).toBe('from-plain');
      expect(result.matchesUrl).toBe(true);
      expect(result.extractedCoords).toEqual({ z: 7, x: 100, y: 200 });
      expect(result.stylesAtZoom3).toEqual(['green']);
    });

    test.describe('color validation', () => {
      const validColors = [
        // Named colors
        'red', 'green', 'blue', 'black', 'white', 'transparent',
        'rebeccapurple', 'darkslategray',
        // Hex colors
        '#fff', '#FFF', '#ffffff', '#FFFFFF', '#ff0000', '#00ff00cc',
        // rgb/rgba
        'rgb(255, 0, 0)', 'rgb(0,0,0)', 'rgba(255, 0, 0, 0.5)', 'rgba(0, 0, 0, 1)',
        // hsl/hsla
        'hsl(120, 100%, 50%)', 'hsla(120, 100%, 50%, 0.5)',
      ];

      const invalidColors = [
        'notacolor',
        '#gg0000',
        '#12345',
        'rgb()',
      ];

      for (const color of validColors) {
        test(`fromJSON accepts valid color: ${color}`, async ({ page }) => {
          const result = await page.evaluate((testColor) => {
            try {
              window.layerConfigsPackage.LayerConfig.fromJSON({
                id: 'color-test',
                lineStyles: [{ color: testColor, layerSuffix: 'osm' }],
              });
              return { success: true };
            } catch (e) {
              return { success: false, error: e.message };
            }
          }, color);
          expect(result.success).toBe(true);
        });
      }

      for (const color of invalidColors) {
        test(`fromJSON rejects invalid color: "${color}"`, async ({ page }) => {
          const error = await page.evaluate((testColor) => {
            try {
              window.layerConfigsPackage.LayerConfig.fromJSON({
                id: 'color-test',
                lineStyles: [{ color: testColor, layerSuffix: 'osm' }],
              });
              return null;
            } catch (e) {
              return e.message;
            }
          }, color);
          expect(error).toContain('not a valid CSS color');
        });
      }

      test('fromJSON rejects empty string color', async ({ page }) => {
        const error = await page.evaluate(() => {
          try {
            window.layerConfigsPackage.LayerConfig.fromJSON({
              id: 'color-test',
              lineStyles: [{ color: '', layerSuffix: 'osm' }],
            });
            return null;
          } catch (e) {
            return e.message;
          }
        });
        expect(error).toContain('color must be a non-empty string');
      });

      test('fromJSON rejects whitespace-only color', async ({ page }) => {
        const error = await page.evaluate(() => {
          try {
            window.layerConfigsPackage.LayerConfig.fromJSON({
              id: 'color-test',
              lineStyles: [{ color: '   ', layerSuffix: 'osm' }],
            });
            return null;
          } catch (e) {
            return e.message;
          }
        });
        expect(error).toContain('not a valid CSS color');
      });
    });
  });

  test.describe('extractCoords', () => {
    test('extracts z/x/y from simple template', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          coords: config.extractCoords('https://tiles.example.com/5/15/12.png'),
          noMatch: config.extractCoords('https://other.com/5/15/12.png'),
        };
      });
      expect(result.coords).toEqual({ z: 5, x: 15, y: 12 });
      expect(result.noMatch).toBeNull();
    });

    test('extracts coords with {s} subdomain placeholder', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://{s}.tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          coordsA: config.extractCoords('https://a.tiles.example.com/5/10/15.png'),
          coordsB: config.extractCoords('https://b.tiles.example.com/8/100/200.png'),
          noSubdomain: config.extractCoords('https://tiles.example.com/5/10/15.png'),
        };
      });
      expect(result.coordsA).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.coordsB).toEqual({ z: 8, x: 100, y: 200 });
      expect(result.noSubdomain).toBeNull(); // {s} requires a subdomain
    });

    test('extracts coords with {a-c} OpenLayers subdomain placeholder', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://{a-c}.tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          coordsA: config.extractCoords('https://a.tiles.example.com/5/10/15.png'),
          coordsC: config.extractCoords('https://c.tiles.example.com/8/100/200.png'),
          noSubdomain: config.extractCoords('https://tiles.example.com/5/10/15.png'),
        };
      });
      expect(result.coordsA).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.coordsC).toEqual({ z: 8, x: 100, y: 200 });
      expect(result.noSubdomain).toBeNull();
    });

    test('extracts coords with {1-4} numeric subdomain placeholder', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tile{1-4}.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          coords1: config.extractCoords('https://tile1.example.com/5/10/15.png'),
          coords3: config.extractCoords('https://tile3.example.com/8/100/200.png'),
        };
      });
      expect(result.coords1).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.coords3).toEqual({ z: 8, x: 100, y: 200 });
    });

    test('extracts coords with {r} retina placeholder', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tiles.example.com/{z}/{x}/{y}{r}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          noRetina: config.extractCoords('https://tiles.example.com/5/10/15.png'),
          retina2x: config.extractCoords('https://tiles.example.com/5/10/15@2x.png'),
          retina3x: config.extractCoords('https://tiles.example.com/5/10/15@3x.png'),
        };
      });
      expect(result.noRetina).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.retina2x).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.retina3x).toEqual({ z: 5, x: 10, y: 15 });
    });

    test('extracts coords with query parameters', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return config.extractCoords('https://tiles.example.com/8/128/96.png?apikey=abc&v=1');
      });
      expect(result).toEqual({ z: 8, x: 128, y: 96 });
    });

    test('handles edge cases for zoom levels', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          zoom0: config.extractCoords('https://tiles.example.com/0/0/0.png'),
          zoom18: config.extractCoords('https://tiles.example.com/18/131072/87381.png'),
        };
      });
      expect(result.zoom0).toEqual({ z: 0, x: 0, y: 0 });
      expect(result.zoom18).toEqual({ z: 18, x: 131072, y: 87381 });
    });

    test('matches http and https for https template', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: 'https://tiles.example.com/{z}/{x}/{y}.png',
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          https: config.extractCoords('https://tiles.example.com/5/10/15.png'),
          http: config.extractCoords('http://tiles.example.com/5/10/15.png'),
        };
      });
      expect(result.https).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.http).toEqual({ z: 5, x: 10, y: 15 });
    });

    test('multiple templates - matches first applicable', async ({ page }) => {
      const result = await page.evaluate(() => {
        const config = new window.layerConfigsPackage.LayerConfig({
          id: 'test',
          tileUrlTemplates: [
            'https://{s}.tiles.example.com/{z}/{x}/{y}.png',
            'https://tiles.example.com/{z}/{x}/{y}.png',
          ],
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
        });
        return {
          withSubdomain: config.extractCoords('https://a.tiles.example.com/5/10/15.png'),
          withoutSubdomain: config.extractCoords('https://tiles.example.com/3/2/1.png'),
        };
      });
      expect(result.withSubdomain).toEqual({ z: 5, x: 10, y: 15 });
      expect(result.withoutSubdomain).toEqual({ z: 3, x: 2, y: 1 });
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
          lineStyles: [{ color: 'red', layerSuffix: 'osm' }],
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
