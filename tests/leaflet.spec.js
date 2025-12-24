import { test, expect } from '@playwright/test';

test.describe('Leaflet Package', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    page.on('pageerror', err => {
      console.log('Page error:', err.message);
    });
    
    await page.goto('/tests/fixtures/leaflet-test.html');
    await page.waitForFunction(() => window.leafletLoaded === true, { timeout: 30000 });
  });

  test.describe('addBoundaryCorrector with only map param', () => {
    test('auto-detects CartoDB dark tile layer and adds corrections', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        // Create map with CartoDB dark tiles
        const map = L.map('map').setView([28.6139, 77.2090], 5);
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        // Wait for tile layer to be added
        await new Promise(resolve => setTimeout(resolve, 100));

        // Add boundary corrector with only map param
        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedLayerCount: corrector.getTrackedLayers().size,
          hasCorrectionsForTileLayer: corrector.hasCorrections(tileLayer)
        };
      });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedLayerCount).toBe(1);
      expect(result.hasCorrectionsForTileLayer).toBe(true);
    });

    test('auto-detects OSM standard tile layer and adds corrections', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        // Create map with OSM tiles
        const map = L.map('map').setView([28.6139, 77.2090], 5);
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          subdomains: 'abc'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedLayerCount: corrector.getTrackedLayers().size,
          hasCorrectionsForTileLayer: corrector.hasCorrections(tileLayer)
        };
      });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedLayerCount).toBe(1);
      expect(result.hasCorrectionsForTileLayer).toBe(true);
    });

    test('does not add corrections for unknown tile providers', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        // Create map with unknown tile provider (MapLibre demo tiles)
        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.png').addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = addBoundaryCorrector(map);

        return {
          isInitialized: corrector.isInitialized(),
          trackedLayerCount: corrector.getTrackedLayers().size
        };
      });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedLayerCount).toBe(0);
    });

    test('tracks dynamically added tile layers', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        // Create empty map first
        const map = L.map('map').setView([28.6139, 77.2090], 5);

        // Add corrector before tile layer exists
        const corrector = addBoundaryCorrector(map);
        const initialCount = corrector.getTrackedLayers().size;

        // Now add tile layer
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          initialCount,
          finalCount: corrector.getTrackedLayers().size,
          hasCorrectionsForTileLayer: corrector.hasCorrections(tileLayer)
        };
      });

      expect(result.initialCount).toBe(0);
      expect(result.finalCount).toBe(1);
      expect(result.hasCorrectionsForTileLayer).toBe(true);
    });

    test('removes correction layer when tile layer is removed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = addBoundaryCorrector(map);
        const countBeforeRemove = corrector.getTrackedLayers().size;

        // Remove tile layer
        map.removeLayer(tileLayer);
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          countBeforeRemove,
          countAfterRemove: corrector.getTrackedLayers().size,
          hasCorrectionsForTileLayer: corrector.hasCorrections(tileLayer)
        };
      });

      expect(result.countBeforeRemove).toBe(1);
      expect(result.countAfterRemove).toBe(0);
      expect(result.hasCorrectionsForTileLayer).toBe(false);
    });

    test('removeBoundaryCorrector cleans up all corrections', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector, removeBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = addBoundaryCorrector(map);
        const countBeforeRemove = corrector.getTrackedLayers().size;
        const isInitializedBefore = corrector.isInitialized();

        // Remove corrector
        removeBoundaryCorrector(corrector);

        return {
          countBeforeRemove,
          countAfterRemove: corrector.getTrackedLayers().size,
          isInitializedBefore,
          isInitializedAfter: corrector.isInitialized()
        };
      });

      expect(result.countBeforeRemove).toBe(1);
      expect(result.countAfterRemove).toBe(0);
      expect(result.isInitializedBefore).toBe(true);
      expect(result.isInitializedAfter).toBe(false);
    });
  });

  test.describe('addBoundaryCorrector with options', () => {
    test('respects explicit layerConfig option', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector, layerConfigs } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Use OSM carto config explicitly even though tiles are dark
        const corrector = addBoundaryCorrector(map, { 
          layerConfig: 'osm-carto' 
        });

        const tracked = corrector.getTrackedLayers().get(tileLayer);

        return {
          trackedLayerCount: corrector.getTrackedLayers().size,
          configId: tracked?.config?.id
        };
      });

      expect(result.trackedLayerCount).toBe(1);
      expect(result.configId).toBe('osm-carto');
    });

    test('respects explicit tileLayer option (single layer mode)', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        const darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Add corrector for specific tile layer
        const corrector = addBoundaryCorrector(map, { 
          tileLayer: darkTileLayer 
        });

        // Now add another tile layer - it should NOT be auto-tracked
        const osmTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          subdomains: 'abc'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          trackedLayerCount: corrector.getTrackedLayers().size,
          hasDarkCorrections: corrector.hasCorrections(darkTileLayer),
          hasOsmCorrections: corrector.hasCorrections(osmTileLayer)
        };
      });

      expect(result.trackedLayerCount).toBe(1);
      expect(result.hasDarkCorrections).toBe(true);
      expect(result.hasOsmCorrections).toBe(false);
    });

    test('uses custom pmtilesUrl when provided', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { BoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        const customUrl = '/packages/data/india_boundary_corrections.pmtiles';
        const corrector = new BoundaryCorrector(map, { 
          pmtilesUrl: customUrl 
        });

        return {
          pmtilesUrl: corrector.pmtilesUrl
        };
      });

      expect(result.pmtilesUrl).toBe('/packages/data/india_boundary_corrections.pmtiles');
    });
  });

  test.describe('BoundaryCorrector class', () => {
    test('init() can be called multiple times safely', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { BoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = new BoundaryCorrector(map);
        corrector.init();
        corrector.init(); // Second call should be no-op
        corrector.init(); // Third call should be no-op

        return {
          isInitialized: corrector.isInitialized(),
          trackedLayerCount: corrector.getTrackedLayers().size
        };
      });

      expect(result.isInitialized).toBe(true);
      expect(result.trackedLayerCount).toBe(1);
    });

    test('remove() can be called multiple times safely', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { BoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = new BoundaryCorrector(map);
        corrector.init();
        corrector.remove();
        corrector.remove(); // Second call should be no-op

        return {
          isInitialized: corrector.isInitialized(),
          trackedLayerCount: corrector.getTrackedLayers().size
        };
      });

      expect(result.isInitialized).toBe(false);
      expect(result.trackedLayerCount).toBe(0);
    });

    test('can be re-initialized after remove()', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { BoundaryCorrector } = window.leafletPackage;
        const L = window.L;

        const map = L.map('map').setView([28.6139, 77.2090], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
          subdomains: 'abcd'
        }).addTo(map);

        await new Promise(resolve => setTimeout(resolve, 100));

        const corrector = new BoundaryCorrector(map);
        corrector.init();
        const countAfterFirstInit = corrector.getTrackedLayers().size;

        corrector.remove();
        const countAfterRemove = corrector.getTrackedLayers().size;

        corrector.init();
        const countAfterReInit = corrector.getTrackedLayers().size;

        return {
          countAfterFirstInit,
          countAfterRemove,
          countAfterReInit,
          isInitialized: corrector.isInitialized()
        };
      });

      expect(result.countAfterFirstInit).toBe(1);
      expect(result.countAfterRemove).toBe(0);
      expect(result.countAfterReInit).toBe(1);
      expect(result.isInitialized).toBe(true);
    });
  });

  test.describe('Re-exports', () => {
    test('exports layerConfigs from layer-configs package', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { layerConfigs } = window.leafletPackage;
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
        const { getPmtilesUrl } = window.leafletPackage;
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
