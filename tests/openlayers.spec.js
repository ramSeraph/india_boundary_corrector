import { test, expect } from '@playwright/test';

test.describe('OpenLayers Package', () => {
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
    
    await page.goto('/tests/fixtures/openlayers-test.html');
    await page.waitForFunction(() => window.openlayersLoaded === true, { timeout: 30000 });
  });

  test.describe('addBoundaryCorrector with only map param', () => {
    test('auto-detects CartoDB dark tile layer and adds corrections', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        // Create tile layer with CartoDB dark tiles
        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        // Create map
        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        // Wait for map to be ready
        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, OSM, fromLonLat } = window.ol;

        // Create tile layer with OSM tiles
        const tileLayer = new TileLayer({
          source: new OSM()
        });

        // Create map
        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        // Create tile layer with unknown provider (MapLibre demo tiles)
        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        // Create empty map first
        const map = new Map({
          target: 'map',
          layers: [],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        // Add corrector before tile layer exists
        const corrector = addBoundaryCorrector(map);
        const initialCount = corrector.getTrackedLayers().size;

        // Now add tile layer
        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });
        map.addLayer(tileLayer);

        await new Promise(resolve => setTimeout(resolve, 200));

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

    test('removes correction layers when tile layer is removed', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        const corrector = addBoundaryCorrector(map);
        const countBeforeRemove = corrector.getTrackedLayers().size;

        // Remove tile layer
        map.removeLayer(tileLayer);
        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { addBoundaryCorrector, removeBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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
    test('respects explicit layerConfig option by string', async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          const { addBoundaryCorrector } = window.olPackage;
          const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

          // Use unknown tile provider - won't auto-detect, but explicit config should still work
          const tileLayer = new TileLayer({
            source: new XYZ({
              url: 'https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.png'
            })
          });

          const map = new Map({
            target: 'map',
            layers: [tileLayer],
            view: new View({
              center: fromLonLat([77.2090, 28.6139]),
              zoom: 5
            })
          });

          await new Promise(resolve => setTimeout(resolve, 200));

          // With explicit config, it should work even for unknown tile providers
          const corrector = addBoundaryCorrector(map, { 
            layerConfig: 'osm-carto' 
          });

          const layerConfig = corrector.getLayerConfig(tileLayer);

          return {
            trackedLayerCount: corrector.getTrackedLayers().size,
            configId: layerConfig?.id
          };
        } catch (err) {
          return { error: err.message, stack: err.stack };
        }
      });

      if (result.error) {
        throw new Error(`Test failed: ${result.error}\n${result.stack}`);
      }
      expect(result.trackedLayerCount).toBe(1);
      expect(result.configId).toBe('osm-carto');
    });

    test('uses custom pmtilesUrl when provided', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { BoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

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
        const { BoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { BoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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
        const { BoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

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

    test('getCorrectionLayers returns del and add layers', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { addBoundaryCorrector } = window.olPackage;
        const { Map, View, TileLayer, XYZ, fromLonLat } = window.ol;

        const tileLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
          })
        });

        const map = new Map({
          target: 'map',
          layers: [tileLayer],
          view: new View({
            center: fromLonLat([77.2090, 28.6139]),
            zoom: 5
          })
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        const corrector = addBoundaryCorrector(map);
        const correctionLayers = corrector.getCorrectionLayers(tileLayer);

        return {
          hasCorrectionLayers: correctionLayers !== null,
          hasDelLayer: correctionLayers?.delLayer !== undefined,
          hasAddLayer: correctionLayers?.addLayer !== undefined
        };
      });

      expect(result.hasCorrectionLayers).toBe(true);
      expect(result.hasDelLayer).toBe(true);
      expect(result.hasAddLayer).toBe(true);
    });
  });

  test.describe('Re-exports', () => {
    test('exports layerConfigs from layer-configs package', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { layerConfigs } = window.olPackage;
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
        const { getPmtilesUrl } = window.olPackage;
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
