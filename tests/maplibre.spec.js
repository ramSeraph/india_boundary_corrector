import { test, expect } from '@playwright/test';

// Toggle between 'mock' and 'real' to switch map implementation
// 'mock' - Uses MockMap (no WebGL required, faster, works in CI)
// 'real' - Uses actual maplibregl.Map (requires WebGL, slower, visual testing)
const MAP_MODE = process.env.MAPLIBRE_TEST_MODE || 'mock';

test.describe('MapLibre Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/maplibre-mock-test.html');
    await page.waitForFunction(() => window.testReady === true, { timeout: 10000 });
  });

  test.describe('addBoundaryCorrector with only map param', () => {
    test('auto-detects CartoDB dark raster source and adds corrections', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedSourceCount: corrector.getTrackedSources().size,
          hasCorrectionsForSource: corrector.hasCorrections('carto-dark')
        };
      }, { mode: MAP_MODE, style });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedSourceCount).toBe(1);
      expect(result.hasCorrectionsForSource).toBe(true);
    });

    test('auto-detects OSM standard raster source and adds corrections', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedSourceCount: corrector.getTrackedSources().size,
          hasCorrectionsForSource: corrector.hasCorrections('osm-tiles')
        };
      }, { mode: MAP_MODE, style });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedSourceCount).toBe(1);
      expect(result.hasCorrectionsForSource).toBe(true);
    });

    test('does not add corrections for unknown tile providers', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'unknown': {
            type: 'raster',
            tiles: ['https://demotiles.maplibre.org/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'unknown-layer',
          type: 'raster',
          source: 'unknown'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedSourceCount: corrector.getTrackedSources().size
        };
      }, { mode: MAP_MODE, style });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedSourceCount).toBe(0);
    });
  });

  test.describe('correction layer behavior', () => {
    const cartoDarkStyle = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256
        }
      },
      layers: [{
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark'
      }]
    };

    test('correction layers are added above raster layers', async ({ page }) => {
      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        addBoundaryCorrector(map);

        const layerIds = map.getStyle().layers.map(l => l.id);
        const rasterIndex = layerIds.findIndex(id => id === 'carto-dark-layer');
        const delNeIndex = layerIds.findIndex(id => id.includes('-del-ne'));
        const addNeIndex = layerIds.findIndex(id => id.includes('-add-ne'));

        return {
          layerIds,
          rasterIndex,
          delNeIndex,
          addNeIndex
        };
      }, { mode: MAP_MODE, style: cartoDarkStyle });

      expect(result.delNeIndex).toBeGreaterThan(result.rasterIndex);
      expect(result.addNeIndex).toBeGreaterThan(result.rasterIndex);
      // Add layers should be above delete layers
      expect(result.addNeIndex).toBeGreaterThan(result.delNeIndex);
    });

    test('correction layers use correct source-layers', async ({ page }) => {
      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        addBoundaryCorrector(map);

        const sourceLayers = map.getStyle().layers
          .filter(l => l['source-layer'])
          .map(l => l['source-layer']);

        return { sourceLayers };
      }, { mode: MAP_MODE, style: cartoDarkStyle });

      expect(result.sourceLayers).toContain('to-del-ne');
      expect(result.sourceLayers).toContain('to-del-osm');
      expect(result.sourceLayers).toContain('to-add-ne');
      expect(result.sourceLayers).toContain('to-add-osm');
    });

    test('zoom thresholds are configured correctly', async ({ page }) => {
      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        addBoundaryCorrector(map);

        const layers = map.getStyle().layers.filter(l => l['source-layer']);
        const neLayers = layers.filter(l => l['source-layer'].includes('-ne'));
        const osmLayers = layers.filter(l => l['source-layer'].includes('-osm'));

        return {
          neLayersHaveMaxzoom: neLayers.every(l => l.maxzoom !== undefined),
          osmLayersHaveMinzoom: osmLayers.every(l => l.minzoom !== undefined)
        };
      }, { mode: MAP_MODE, style: cartoDarkStyle });

      expect(result.neLayersHaveMaxzoom).toBe(true);
      expect(result.osmLayersHaveMinzoom).toBe(true);
    });
  });

  test.describe('removeBoundaryCorrector', () => {
    test('removes all correction layers and sources', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = addBoundaryCorrector(map);
        const layerCountBefore = map.getStyle().layers.length;
        const isInitializedBefore = corrector.isInitialized();

        corrector.remove();

        const layerCountAfter = map.getStyle().layers.length;
        const isInitializedAfter = corrector.isInitialized();

        return {
          layerCountBefore,
          layerCountAfter,
          isInitializedBefore,
          isInitializedAfter
        };
      }, { mode: MAP_MODE, style });

      expect(result.layerCountBefore).toBeGreaterThan(result.layerCountAfter);
      expect(result.isInitializedBefore).toBe(true);
      expect(result.isInitializedAfter).toBe(false);
    });
  });

  test.describe('addBoundaryCorrector with options', () => {
    test('respects explicit layerConfig option', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { addBoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        // Use OSM carto config explicitly even though tiles are dark
        const corrector = addBoundaryCorrector(map, { 
          layerConfig: 'osm-carto' 
        });

        const tracked = corrector.getTrackedSources().get('carto-dark');

        return {
          trackedSourceCount: corrector.getTrackedSources().size,
          configId: tracked?.layerConfig?.id
        };
      }, { mode: MAP_MODE, style });

      expect(result.trackedSourceCount).toBe(1);
      expect(result.configId).toBe('osm-carto');
    });

    test('uses custom pmtilesUrl when provided', async ({ page }) => {
      const style = {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
            tileSize: 256
          }
        },
        layers: [{
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark'
        }]
      };

      const result = await page.evaluate(async ({ mode, style }) => {
        const { BoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const customUrl = '/packages/data/india_boundary_corrections.pmtiles';
        const corrector = new BoundaryCorrector(map, { 
          pmtilesUrl: customUrl 
        });

        return {
          pmtilesUrl: corrector.pmtilesUrl
        };
      }, { mode: MAP_MODE, style });

      expect(result.pmtilesUrl).toBe('/packages/data/india_boundary_corrections.pmtiles');
    });
  });

  test.describe('BoundaryCorrector class', () => {
    const cartoDarkStyle = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
          tileSize: 256
        }
      },
      layers: [{
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark'
      }]
    };

    test('init() can be called multiple times safely', async ({ page }) => {
      const result = await page.evaluate(async ({ mode, style }) => {
        const { BoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = new BoundaryCorrector(map);
        corrector.init();
        corrector.init(); // Second call should be no-op
        corrector.init(); // Third call should be no-op

        return {
          isInitialized: corrector.isInitialized(),
          trackedSourceCount: corrector.getTrackedSources().size
        };
      }, { mode: MAP_MODE, style: cartoDarkStyle });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedSourceCount).toBe(1);
    });

    test('remove() can be called multiple times safely', async ({ page }) => {
      const result = await page.evaluate(async ({ mode, style }) => {
        const { BoundaryCorrector } = window.maplibrePackage;
        const map = await window.createTestMap(mode, { style });

        const corrector = new BoundaryCorrector(map);
        corrector.init();
        corrector.remove();
        corrector.remove(); // Second call should be no-op

        return {
          isInitialized: corrector.isInitialized(),
          trackedSourceCount: corrector.getTrackedSources().size
        };
      }, { mode: MAP_MODE, style: cartoDarkStyle });

      expect(result.isInitialized).toBe(false);
      expect(result.trackedSourceCount).toBe(0);
    });
  });

  test.describe('Re-exports', () => {
    test('exports layerConfigs from layer-configs package', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { layerConfigs } = window.maplibrePackage;
        return {
          hasGet: typeof layerConfigs.get === 'function',
          hasDetectFromUrls: typeof layerConfigs.detectFromUrls === 'function',
          hasOsmCartoDark: layerConfigs.get('osm-carto-dark') !== undefined
        };
      });

      expect(result.hasGet).toBe(true);
      expect(result.hasDetectFromUrls).toBe(true);
      expect(result.hasOsmCartoDark).toBe(true);
    });

    test('exports getPmtilesUrl from data package', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { getPmtilesUrl } = window.maplibrePackage;
        return {
          isFunction: typeof getPmtilesUrl === 'function',
          returnsString: typeof getPmtilesUrl() === 'string'
        };
      });

      expect(result.isFunction).toBe(true);
      expect(result.returnsString).toBe(true);
    });
  });
});
