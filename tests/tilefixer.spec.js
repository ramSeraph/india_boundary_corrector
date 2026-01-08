import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Debug image saving - set TILEFIXER_DEBUG_IMAGES=1 to save intermediate images
const DEBUG_IMAGES = process.env.TILEFIXER_DEBUG_IMAGES === '1';
const DEBUG_DIR = 'test-debug-images';

/**
 * Save a tile image for debugging
 * @param {string} testName - Name of the test (used for folder)
 * @param {string} imageName - Name of the image file
 * @param {Buffer|ArrayBuffer|string} imageData - Image data (Buffer, ArrayBuffer, or base64 string)
 */
async function saveDebugImage(testName, imageName, imageData) {
  if (!DEBUG_IMAGES) return;
  
  // Sanitize test name for folder
  const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const testDir = path.join(DEBUG_DIR, safeName);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, imageName);
  
  // Handle different input types
  let buffer;
  if (typeof imageData === 'string') {
    // Base64 string
    buffer = Buffer.from(imageData, 'base64');
  } else if (imageData instanceof ArrayBuffer) {
    buffer = Buffer.from(imageData);
  } else {
    buffer = imageData;
  }
  
  fs.writeFileSync(filePath, buffer);
  console.log(`  [DEBUG] Saved: ${filePath}`);
}

test.describe('TileFixer Package', () => {
  test.describe('getLineWidth', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('returns exact value for matching zoom', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 1: 0.5, 5: 1.0, 10: 2.5 };
        return {
          z1: getLineWidth(1, stops),
          z5: getLineWidth(5, stops),
          z10: getLineWidth(10, stops),
        };
      });

      expect(result.z1).toBe(0.5);
      expect(result.z5).toBe(1.0);
      expect(result.z10).toBe(2.5);
    });

    test('interpolates between stops', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 0: 1.0, 10: 3.0 };
        return {
          z0: getLineWidth(0, stops),
          z5: getLineWidth(5, stops),
          z10: getLineWidth(10, stops),
        };
      });

      expect(result.z0).toBe(1.0);
      expect(result.z5).toBe(2.0); // midpoint between 1.0 and 3.0
      expect(result.z10).toBe(3.0);
    });

    test('interpolates between non-zero start stops', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 4: 1.0, 8: 3.0 };
        return {
          z5: getLineWidth(5, stops),
          z6: getLineWidth(6, stops),
          z7: getLineWidth(7, stops),
        };
      });

      expect(result.z5).toBe(1.5);  // 1/4 of the way
      expect(result.z6).toBe(2.0);  // 1/2 of the way
      expect(result.z7).toBe(2.5);  // 3/4 of the way
    });

    test('extrapolates below lowest zoom', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 4: 1.0, 8: 2.0 };
        // slope = (2.0 - 1.0) / (8 - 4) = 0.25
        // z2: 1.0 + 0.25 * (2 - 4) = 1.0 - 0.5 = 0.5
        // z0: 1.0 + 0.25 * (0 - 4) = 1.0 - 1.0 = 0.0 -> clamped to 0.5
        return {
          z2: getLineWidth(2, stops),
          z0: getLineWidth(0, stops),
        };
      });

      expect(result.z2).toBeCloseTo(0.5, 5);
      expect(result.z0).toBe(0.5); // clamped to minimum 0.5
    });

    test('extrapolates above highest zoom', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 4: 1.0, 8: 2.0 };
        // slope = (2.0 - 1.0) / (8 - 4) = 0.25
        // z10: 2.0 + 0.25 * (10 - 8) = 2.0 + 0.5 = 2.5
        // z12: 2.0 + 0.25 * (12 - 8) = 2.0 + 1.0 = 3.0
        return {
          z10: getLineWidth(10, stops),
          z12: getLineWidth(12, stops),
        };
      });

      expect(result.z10).toBeCloseTo(2.5, 5);
      expect(result.z12).toBeCloseTo(3.0, 5);
    });

    test('clamps extrapolated values to minimum 0.5', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        // Decreasing slope that would go negative
        const stops = { 5: 1.0, 10: 0.5 };
        // slope = (0.5 - 1.0) / (10 - 5) = -0.1
        // z0: 1.0 + (-0.1) * (0 - 5) = 1.0 + 0.5 = 1.5 (extrapolates up going backwards)
        // z15: 0.5 + (-0.1) * (15 - 10) = 0.5 - 0.5 = 0.0 -> clamped to 0.5
        return {
          z0: getLineWidth(0, stops),
          z15: getLineWidth(15, stops),
        };
      });

      expect(result.z0).toBeCloseTo(1.5, 5);
      expect(result.z15).toBe(0.5); // clamped to minimum
    });

    test('handles multiple stops correctly', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        const stops = { 1: 0.5, 4: 1.0, 8: 2.0, 12: 4.0 };
        return {
          z1: getLineWidth(1, stops),
          z2: getLineWidth(2, stops),   // between 1 and 4
          z6: getLineWidth(6, stops),   // between 4 and 8
          z10: getLineWidth(10, stops), // between 8 and 12
          z14: getLineWidth(14, stops), // extrapolate above 12
        };
      });

      expect(result.z1).toBe(0.5);
      // z2: between z1(0.5) and z4(1.0), t = (2-1)/(4-1) = 1/3
      // 0.5 + (1/3) * (1.0 - 0.5) = 0.5 + 0.167 = 0.667
      expect(result.z2).toBeCloseTo(0.667, 2);
      // z6: between z4(1.0) and z8(2.0), t = (6-4)/(8-4) = 0.5
      expect(result.z6).toBe(1.5);
      // z10: between z8(2.0) and z12(4.0), t = (10-8)/(12-8) = 0.5
      expect(result.z10).toBe(3.0);
      // z14: extrapolate from z8-z12 slope = (4-2)/(12-8) = 0.5
      // 4.0 + 0.5 * (14 - 12) = 5.0
      expect(result.z14).toBe(5.0);
    });

    test('handles unsorted stops', async ({ page }) => {
      const result = await page.evaluate(() => {
        const getLineWidth = window.getLineWidth;
        // Stops provided in non-sorted order
        const stops = { 10: 2.5, 1: 0.5, 5: 1.0 };
        return {
          z1: getLineWidth(1, stops),
          z3: getLineWidth(3, stops),
          z5: getLineWidth(5, stops),
          z10: getLineWidth(10, stops),
        };
      });

      expect(result.z1).toBe(0.5);
      expect(result.z5).toBe(1.0);
      expect(result.z10).toBe(2.5);
      // z3: between z1(0.5) and z5(1.0), t = (3-1)/(5-1) = 0.5
      expect(result.z3).toBe(0.75);
    });
  });

  test.describe('getCorrections', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('retrieves existing tiles from PMTiles file', async ({ page }) => {
      // Test that we can fetch some known tiles that exist in the data
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Test a few known tiles at different zoom levels
        // Kashmir region tiles that exist in the PMTiles
        const tiles = [
          { z: 4, x: 11, y: 6 },  // Low zoom - should have NE data
          { z: 8, x: 182, y: 101 }, // Mid zoom - should have OSM data
        ];
        
        const results = [];
        for (const { z, x, y } of tiles) {
          const corrections = await corrector.getCorrections(z, x, y);
          const hasData = Object.keys(corrections).length > 0;
          const layers = Object.keys(corrections);
          results.push({ z, x, y, hasData, layers });
        }
        
        return results;
      });

      // At least some tiles should have data
      const tilesWithData = result.filter(r => r.hasData);
      expect(tilesWithData.length).toBeGreaterThan(0);
      
      // Tiles with data should have expected layer names
      for (const tile of tilesWithData) {
        const validLayers = ['to-add-osm', 'to-del-osm', 'to-add-osm-disp', 'to-del-osm-disp', 'to-add-osm-internal', 'to-del-osm-internal', 'to-add-ne', 'to-del-ne', 'to-add-ne-disp', 'to-del-ne-disp'];
        for (const layer of tile.layers) {
          expect(validLayers).toContain(layer);
        }
      }
    });

    test('returns empty for non-existent tiles', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Test tiles that are clearly outside India's boundaries
        const tiles = [
          { z: 4, x: 0, y: 0 },    // Far from India
          { z: 8, x: 0, y: 0 },    // Far from India
          { z: 10, x: 1023, y: 1023 }, // Far corner
        ];
        
        const results = [];
        for (const { z, x, y } of tiles) {
          const corrections = await corrector.getCorrections(z, x, y);
          const isEmpty = Object.keys(corrections).length === 0;
          results.push({ z, x, y, isEmpty });
        }
        
        return results;
      });

      // All these tiles should be empty
      for (const tile of result) {
        expect(tile.isEmpty).toBe(true);
      }
    });

    test('missing tiles do not cause correction errors', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        // Tile outside India - no corrections in PMTiles
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 4, x = 0, y = 0;
        
        try {
          const result = await corrector.fetchAndFixTile(
            mockTileUrl, z, x, y, layerConfig, {}, false
          );
          
          return {
            success: true,
            hasData: result.data instanceof ArrayBuffer,
            wasFixed: result.wasFixed,
            correctionsFailed: result.correctionsFailed ?? false,
          };
        } catch (err) {
          return {
            success: false,
            error: err.message,
          };
        }
      });

      // Should succeed without throwing, even with fallbackOnCorrectionFailure: false
      // because missing tiles are not an error - they just have no corrections
      expect(result.success).toBe(true);
      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
      expect(result.correctionsFailed).toBe(false);
    });

    test('overzoom z15: children tiles match parent z14 tile', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Find a z14 tile that has data
        // Kashmir region tiles
        const z14Tiles = [
          { x: 11671, y: 6503 },
          { x: 11672, y: 6503 },
          { x: 11671, y: 6504 },
        ];
        
        let z14Tile = null;
        for (const coords of z14Tiles) {
          const corrections = await corrector.getCorrections(14, coords.x, coords.y);
          if (Object.keys(corrections).length > 0) {
            z14Tile = { ...coords, corrections };
            break;
          }
        }
        
        if (!z14Tile) {
          return { error: 'Could not find z14 tile with data' };
        }
        
        // Get all 4 children at z15
        const z15Children = [];
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const x = z14Tile.x * 2 + dx;
            const y = z14Tile.y * 2 + dy;
            const corrections = await corrector.getCorrections(15, x, y);
            z15Children.push({ x, y, dx, dy, corrections });
          }
        }
        
        // For each layer in parent, check that children combine to match
        const layers = Object.keys(z14Tile.corrections);
        const results = {};
        
        for (const layerName of layers) {
          const parentFeatures = z14Tile.corrections[layerName];
          if (!parentFeatures || parentFeatures.length === 0) continue;
          
          // Collect all child features for this layer
          const childFeatures = [];
          for (const child of z15Children) {
            const features = child.corrections[layerName] || [];
            childFeatures.push(...features);
          }
          
          results[layerName] = {
            parentFeatureCount: parentFeatures.length,
            childFeatureCount: childFeatures.length,
            parentExtent: parentFeatures[0]?.extent,
            // Check if child features cover the parent tile
            hasChildData: childFeatures.length > 0,
          };
        }
        
        return { z14Tile: { x: z14Tile.x, y: z14Tile.y }, layers: results };
      });

      if (result.error) {
        console.log('Note:', result.error);
        test.skip();
        return;
      }

      // Children should have data if parent has data
      const layerNames = Object.keys(result.layers);
      expect(layerNames.length).toBeGreaterThan(0);
      
      for (const [layerName, data] of Object.entries(result.layers)) {
        expect(data.hasChildData).toBe(true);
        // Children might have different feature counts due to splitting
        expect(data.childFeatureCount).toBeGreaterThan(0);
      }
    });

    test('overzoom z16: grandchildren tiles match parent z14 tile', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Find a z14 tile that has data
        const z14Tiles = [
          { x: 11671, y: 6503 },
          { x: 11672, y: 6503 },
        ];
        
        let z14Tile = null;
        for (const coords of z14Tiles) {
          const corrections = await corrector.getCorrections(14, coords.x, coords.y);
          if (Object.keys(corrections).length > 0) {
            z14Tile = { ...coords, corrections };
            break;
          }
        }
        
        if (!z14Tile) {
          return { error: 'Could not find z14 tile with data' };
        }
        
        // Get all 16 grandchildren at z16
        const z16Grandchildren = [];
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 4; dx++) {
            const x = z14Tile.x * 4 + dx;
            const y = z14Tile.y * 4 + dy;
            const corrections = await corrector.getCorrections(16, x, y);
            z16Grandchildren.push({ x, y, dx, dy, corrections });
          }
        }
        
        // For each layer in parent, check that grandchildren combine to match
        const layers = Object.keys(z14Tile.corrections);
        const results = {};
        
        for (const layerName of layers) {
          const parentFeatures = z14Tile.corrections[layerName];
          if (!parentFeatures || parentFeatures.length === 0) continue;
          
          // Collect all grandchild features for this layer
          const grandchildFeatures = [];
          for (const grandchild of z16Grandchildren) {
            const features = grandchild.corrections[layerName] || [];
            grandchildFeatures.push(...features);
          }
          
          results[layerName] = {
            parentFeatureCount: parentFeatures.length,
            grandchildFeatureCount: grandchildFeatures.length,
            hasGrandchildData: grandchildFeatures.length > 0,
          };
        }
        
        return { z14Tile: { x: z14Tile.x, y: z14Tile.y }, layers: results };
      });

      if (result.error) {
        console.log('Note:', result.error);
        test.skip();
        return;
      }

      // Grandchildren should have data if parent has data
      const layerNames = Object.keys(result.layers);
      expect(layerNames.length).toBeGreaterThan(0);
      
      for (const [layerName, data] of Object.entries(result.layers)) {
        expect(data.hasGrandchildData).toBe(true);
        expect(data.grandchildFeatureCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('clearCache', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('clearCache removes cached tiles', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Fetch a tile to populate cache
        const z = 4, x = 11, y = 6;
        await corrector.getCorrections(z, x, y);
        
        // Get cache size before clear (access internal state)
        const cacheSizeBefore = corrector.correctionsSource.cache.size;
        
        // Clear cache
        corrector.clearCache();
        
        // Get cache size after clear
        const cacheSizeAfter = corrector.correctionsSource.cache.size;
        
        return {
          cacheSizeBefore,
          cacheSizeAfter,
        };
      });

      // Cache should have had at least one entry before
      expect(result.cacheSizeBefore).toBeGreaterThan(0);
      // Cache should be empty after clear
      expect(result.cacheSizeAfter).toBe(0);
    });

    test('empty tile results are cached', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        // Clear cache first
        corrector.clearCache();
        
        // Track fetch calls to PMTiles
        let fetchCount = 0;
        const originalGetZxy = corrector.correctionsSource.pmtiles.getZxy.bind(corrector.correctionsSource.pmtiles);
        corrector.correctionsSource.pmtiles.getZxy = async (...args) => {
          fetchCount++;
          return originalGetZxy(...args);
        };
        
        // Fetch a tile outside India (will be empty)
        const z = 4, x = 0, y = 0;
        const firstResult = await corrector.getCorrections(z, x, y);
        const fetchCountAfterFirst = fetchCount;
        
        // Fetch again - should come from cache, no network request
        const secondResult = await corrector.getCorrections(z, x, y);
        const fetchCountAfterSecond = fetchCount;
        
        // Check cache state
        const cacheKey = `${x}:${y}:${z}`;
        const isCached = corrector.correctionsSource.cache.has(cacheKey);
        
        return {
          firstIsEmpty: Object.keys(firstResult).length === 0,
          secondIsEmpty: Object.keys(secondResult).length === 0,
          fetchCountAfterFirst,
          fetchCountAfterSecond,
          isCached,
        };
      });

      // Both results should be empty
      expect(result.firstIsEmpty).toBe(true);
      expect(result.secondIsEmpty).toBe(true);
      // Empty result should be cached
      expect(result.isCached).toBe(true);
      // First fetch should make one network request
      expect(result.fetchCountAfterFirst).toBe(1);
      // Second fetch should NOT make a network request (served from cache)
      expect(result.fetchCountAfterSecond).toBe(1);
    });

    test('getCorrections still works after clearCache', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        const z = 4, x = 11, y = 6;
        
        // Fetch tile, clear cache, fetch again
        const firstResult = await corrector.getCorrections(z, x, y);
        corrector.clearCache();
        const secondResult = await corrector.getCorrections(z, x, y);
        
        return {
          firstHasData: Object.keys(firstResult).length > 0,
          secondHasData: Object.keys(secondResult).length > 0,
          firstLayers: Object.keys(firstResult),
          secondLayers: Object.keys(secondResult),
        };
      });

      // Both fetches should succeed
      expect(result.firstHasData).toBe(true);
      expect(result.secondHasData).toBe(true);
      // Both should return same layers
      expect(result.firstLayers).toEqual(result.secondLayers);
    });

    test('evicts LRU entries when cache exceeds max features', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { TileFixer } = window.tilefixerExports;
        const { getPmtilesUrl } = await import('@india-boundary-corrector/data');
        
        // Create a corrector with small cache (1000 features max)
        // Note: each tile may have features across 10 layers (to-add/to-del for osm, osm-disp, osm-internal, ne, ne-disp)
        // Individual tiles can have several hundred features, so cache must be larger than single tile
        const smallCacheCorrector = new TileFixer(getPmtilesUrl(), { cacheMaxFeatures: 1000 });
        
        // Fetch multiple tiles with data to fill and exceed cache
        const tiles = [
          { z: 4, x: 11, y: 6 },   // Has corrections
          { z: 5, x: 22, y: 12 },  // Has corrections
          { z: 6, x: 45, y: 25 },  // Has corrections
        ];
        
        const results = [];
        for (const { z, x, y } of tiles) {
          await smallCacheCorrector.getCorrections(z, x, y);
          results.push({
            z, x, y,
            cacheSize: smallCacheCorrector.correctionsSource.cache.size,
            cachedFeatureCount: smallCacheCorrector.correctionsSource.cachedFeatureCount,
          });
        }
        
        return {
          results,
          finalCacheSize: smallCacheCorrector.correctionsSource.cache.size,
          finalFeatureCount: smallCacheCorrector.correctionsSource.cachedFeatureCount,
          maxFeatures: smallCacheCorrector.correctionsSource.cacheMaxFeatures,
        };
      });

      // Cache should have evicted entries to stay under limit
      expect(result.finalFeatureCount).toBeLessThanOrEqual(result.maxFeatures);
      // Should have at least one entry (the most recent)
      expect(result.finalCacheSize).toBeGreaterThan(0);
    });
  });

  test.describe('fixTile - Line Drawing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('draws single addition line on blank white tile', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, createSimpleLineCorrections, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');
        
        // Create a horizontal line across the middle
        // Points in vector tile coordinates (0-4096 extent)
        const corrections = createSimpleLineCorrections([
          { x: 0, y: 2048 },
          { x: 4096, y: 2048 },
        ], 'to-add-osm');
        
        const fixedTile = await corrector.fixTile(corrections, blankTile, layerConfig, 10, tileSize);
        
        // Analyze the pixels
        const analysis = await analyzePixels(fixedTile, tileSize);
        
        return {
          ...analysis,
          inputBase64: arrayBufferToBase64(blankTile),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Should have some colored pixels (the line)
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Line should be horizontal around y=128
      expect(result.minY).toBeGreaterThanOrEqual(120);
      expect(result.maxY).toBeLessThanOrEqual(136);
      // Line should span most of the width
      expect(result.maxX - result.minX).toBeGreaterThan(200);
    });

    test('draws multiple addition lines on blank white tile', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');
        
        // Create two lines: one horizontal, one vertical
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
            {
              geometry: [[
                { x: 2048, y: 0 },
                { x: 2048, y: 4096 },
              ]],
              extent: 4096,
            },
          ],
        };
        
        const fixedTile = await corrector.fixTile(corrections, blankTile, layerConfig, 10, tileSize);
        
        const analysis = await analyzePixels(fixedTile, tileSize);
        return {
          ...analysis,
          inputBase64: arrayBufferToBase64(blankTile),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Should have colored pixels from both lines
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Lines should span the tile
      expect(result.maxX - result.minX).toBeGreaterThan(200);
      expect(result.maxY - result.minY).toBeGreaterThan(200);
    });

    test('respects alpha in lineStyles for semi-transparent lines', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, getPixelColor, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;

        // Config with fully opaque black line
        const opaqueConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [
            { color: 'rgb(0, 0, 0)', layerSuffix: 'osm', alpha: 1.0, delWidthFactor: 3 },
          ],
        });

        // Config with semi-transparent black line (50% opacity)
        const semiTransparentConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [
            { color: 'rgb(0, 0, 0)', layerSuffix: 'osm', alpha: 0.5, delWidthFactor: 3 },
          ],
        });

        const opaqueTile = await corrector.fixTile(corrections, blankTile, opaqueConfig, 6, tileSize);
        const opaqueCenter = await getPixelColor(opaqueTile, tileSize, 128, 128);

        const semiTransparentTile = await corrector.fixTile(corrections, blankTile, semiTransparentConfig, 6, tileSize);
        const semiTransparentCenter = await getPixelColor(semiTransparentTile, tileSize, 128, 128);

        return { 
          opaqueCenter, 
          semiTransparentCenter,
          inputBase64: arrayBufferToBase64(blankTile),
          opaqueBase64: arrayBufferToBase64(opaqueTile),
          semiTransparentBase64: arrayBufferToBase64(semiTransparentTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-opaque.png', result.opaqueBase64);
      await saveDebugImage(testInfo.title, '3-semi-transparent.png', result.semiTransparentBase64);

      // Opaque line should be near black
      expect(result.opaqueCenter.r).toBeLessThan(50);
      expect(result.opaqueCenter.g).toBeLessThan(50);
      expect(result.opaqueCenter.b).toBeLessThan(50);

      // Semi-transparent line should be grayish (blended with white background)
      // Black at 50% opacity on white = ~128
      expect(result.semiTransparentCenter.r).toBeGreaterThan(100);
      expect(result.semiTransparentCenter.r).toBeLessThan(180);
      expect(result.semiTransparentCenter.g).toBeGreaterThan(100);
      expect(result.semiTransparentCenter.b).toBeGreaterThan(100);
    });

    test('respects lineStyles startZoom and endZoom with plain object config', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, getPixelColor, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Create a horizontal line in both OSM and NE layers
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
          'to-add-ne': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
        };

        // Plain object config with lineStyles that have zoom constraints
        // Only one style active at each zoom to make testing clear
        const plainConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 1, 10: 2, 14: 3 },
          lineStyles: [
            { color: 'rgb(255, 0, 0)', layerSuffix: 'osm', startZoom: 6, endZoom: 7, delWidthFactor: 3 }, // z6-7 only
          ],
        });

        // Test at z5: should NOT have the line (below startZoom 6)
        const z5Tile = await corrector.fixTile(corrections, blankTile, plainConfig, 5, tileSize);
        const z5Center = await getPixelColor(z5Tile, tileSize, 128, 128);

        // Test at z6: should have the line (within z6-7)
        const z6Tile = await corrector.fixTile(corrections, blankTile, plainConfig, 6, tileSize);
        const z6Center = await getPixelColor(z6Tile, tileSize, 128, 128);

        // Test at z8: should NOT have the line (above endZoom 7)
        const z8Tile = await corrector.fixTile(corrections, blankTile, plainConfig, 8, tileSize);
        const z8Center = await getPixelColor(z8Tile, tileSize, 128, 128);

        return { z5Center, z6Center, z8Center };
      });

      // z5 should NOT have colored pixel (below startZoom)
      expect(result.z5Center.isColored).toBe(false);

      // z6 should have colored pixel (within range)
      expect(result.z6Center.isColored).toBe(true);

      // z8 should NOT have colored pixel (above endZoom)
      expect(result.z8Center.isColored).toBe(false);
    });

    test('lineStyles with endZoom are not drawn at higher zooms', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, getPixelColor } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
        };

        // Config with only one style that ends at z5
        const plainConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 1, 10: 2, 14: 3 },
          lineStyles: [
            { color: 'red', layerSuffix: 'osm', startZoom: 1, endZoom: 5, delWidthFactor: 3 }, // Only z1-5
          ],
        });

        // Test at z5: should have the line
        const z5Tile = await corrector.fixTile(corrections, blankTile, plainConfig, 5, tileSize);
        const z5Center = await getPixelColor(z5Tile, tileSize, 128, 128);

        // Test at z6: should NOT have the line (beyond endZoom)
        const z6Tile = await corrector.fixTile(corrections, blankTile, plainConfig, 6, tileSize);
        const z6Center = await getPixelColor(z6Tile, tileSize, 128, 128);

        return { z5Center, z6Center };
      });

      // z5 should have colored pixel (line drawn)
      expect(result.z5Center.isColored).toBe(true);

      // z6 should NOT have colored pixel (line NOT drawn, beyond endZoom)
      expect(result.z6Center.isColored).toBe(false);
    });
  });

  test.describe('fixTile - Line Extension', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('extends line ending inside tile (not at edge) when lineExtensionFactor > 0', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, getPixelColor, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Line that starts at edge (x=0) but ends inside the tile (x=2048 = middle)
        // Without extension, the line would end at pixel x=128
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },     // Start at left edge
                { x: 2048, y: 2048 },  // End in middle of tile
              ]],
              extent: 4096,
            },
          ],
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 1024 },
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;

        // Config with extension enabled (default 0.5)
        const configWithExtension = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0.5, delWidthFactor: 3 }],
        });

        // Config with extension disabled
        const configNoExtension = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0, delWidthFactor: 3 }],
        });

        const tileWithExtension = await corrector.fixTile(corrections, blankTile, configWithExtension, 6, tileSize);
        const tileNoExtension = await corrector.fixTile(corrections, blankTile, configNoExtension, 6, tileSize);

        // Check pixels beyond the original end point (x=128)
        // With extension, there should be colored pixels at x=135
        // Without extension, x=135 should be white
        const extendedPixel = await getPixelColor(tileWithExtension, tileSize, 135, 128);
        const noExtendedPixel = await getPixelColor(tileNoExtension, tileSize, 135, 128);

        return {
          extendedPixel,
          noExtendedPixel,
          withExtensionBase64: arrayBufferToBase64(tileWithExtension),
          noExtensionBase64: arrayBufferToBase64(tileNoExtension),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-with-extension.png', result.withExtensionBase64);
      await saveDebugImage(testInfo.title, '2-no-extension.png', result.noExtensionBase64);

      // With extension, the pixel beyond original endpoint should be colored
      expect(result.extendedPixel.isColored).toBe(true);
      // Without extension, the pixel beyond original endpoint should NOT be colored
      expect(result.noExtendedPixel.isColored).toBe(false);
    });

    test('does not extend line ending at tile edge', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Line that spans full tile width (starts and ends at edges)
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },     // Start at left edge
                { x: 4096, y: 2048 },  // End at right edge
              ]],
              extent: 4096,
            },
          ],
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 1024 },
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;
        const configWithExtension = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0.5, delWidthFactor: 3 }],
        });

        const tile = await corrector.fixTile(corrections, blankTile, configWithExtension, 6, tileSize);
        const analysis = await analyzePixels(tile, tileSize);

        return {
          minX: analysis.minX,
          maxX: analysis.maxX,
          outputBase64: arrayBufferToBase64(tile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-output.png', result.outputBase64);

      // Line should not extend beyond tile boundaries
      // minX should be close to 0, maxX close to 255
      expect(result.minX).toBeLessThanOrEqual(5);
      expect(result.maxX).toBeGreaterThanOrEqual(250);
    });

    test('extension length scales with deletion line width', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Line ending in middle of tile
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 2048, y: 2048 },  // End in middle
              ]],
              extent: 4096,
            },
          ],
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 1024 },
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;

        // Thin deletion line
        const thinConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 2, 10: 2, 14: 2 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0.5, delWidthFactor: 2 }],  // delLineWidth = 2 * 2 = 4, extension = 4 * 0.5 = 2 pixels
        });

        // Thick deletion line
        const thickConfig = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 8, 10: 8, 14: 8 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0.5, delWidthFactor: 2 }],  // delLineWidth = 8 * 2 = 16, extension = 16 * 0.5 = 8 pixels
        });

        const thinTile = await corrector.fixTile(corrections, blankTile, thinConfig, 6, tileSize);
        const thickTile = await corrector.fixTile(corrections, blankTile, thickConfig, 6, tileSize);

        const thinAnalysis = await analyzePixels(thinTile, tileSize);
        const thickAnalysis = await analyzePixels(thickTile, tileSize);

        return {
          thinMaxX: thinAnalysis.maxX,
          thickMaxX: thickAnalysis.maxX,
          thinBase64: arrayBufferToBase64(thinTile),
          thickBase64: arrayBufferToBase64(thickTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-thin.png', result.thinBase64);
      await saveDebugImage(testInfo.title, '2-thick.png', result.thickBase64);

      // Thick config should extend further than thin config
      expect(result.thickMaxX).toBeGreaterThan(result.thinMaxX);
    });

    test('no extension when no deletion features exist', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Only addition, no deletion
        const corrections = {
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 2048, y: 2048 },  // End in middle
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;
        const config = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [{ color: 'rgb(0, 0, 0)', layerSuffix: 'osm', startZoom: 1, lineExtensionFactor: 0.5, delWidthFactor: 3 }],
        });

        const tile = await corrector.fixTile(corrections, blankTile, config, 6, tileSize);
        const analysis = await analyzePixels(tile, tileSize);

        return {
          maxX: analysis.maxX,
          outputBase64: arrayBufferToBase64(tile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-output.png', result.outputBase64);

      // Without deletion features, extension should not happen
      // Line ends at x=128 (middle), with line width ~4, maxX should be around 130-135
      expect(result.maxX).toBeLessThanOrEqual(135);
    });
  });

  test.describe('fixTile - startZoom and zoomThreshold', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('returns original tile unchanged when zoom < startZoom', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        const corrections = {
          'to-add-ne': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
        };

        // Config with startZoom = 3 on line style
        const LayerConfig = window.LayerConfig;
        const config = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [{ color: 'rgb(255, 0, 0)', layerSuffix: 'ne', startZoom: 3, delWidthFactor: 3 }],
        });

        // Test at z2 (below startZoom) - should NOT draw
        const z2Tile = await corrector.fixTile(corrections, blankTile, config, 2, tileSize);
        const z2Analysis = await analyzePixels(z2Tile, tileSize);

        // Test at z3 (at startZoom) - should draw
        const z3Tile = await corrector.fixTile(corrections, blankTile, config, 3, tileSize);
        const z3Analysis = await analyzePixels(z3Tile, tileSize);

        // Test at z4 (above startZoom) - should draw
        const z4Tile = await corrector.fixTile(corrections, blankTile, config, 4, tileSize);
        const z4Analysis = await analyzePixels(z4Tile, tileSize);

        return {
          z2Colored: z2Analysis.coloredPixels,
          z3Colored: z3Analysis.coloredPixels,
          z4Colored: z4Analysis.coloredPixels,
          z2Base64: arrayBufferToBase64(z2Tile),
          z3Base64: arrayBufferToBase64(z3Tile),
          z4Base64: arrayBufferToBase64(z4Tile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-z2-below-startZoom.png', result.z2Base64);
      await saveDebugImage(testInfo.title, '2-z3-at-startZoom.png', result.z3Base64);
      await saveDebugImage(testInfo.title, '3-z4-above-startZoom.png', result.z4Base64);

      // z2 should have NO colored pixels (below startZoom)
      expect(result.z2Colored).toBe(0);
      // z3 should have colored pixels (at startZoom)
      expect(result.z3Colored).toBeGreaterThan(0);
      // z4 should have colored pixels (above startZoom)
      expect(result.z4Colored).toBeGreaterThan(0);
    });

    test('uses NE layers below zoomThreshold and OSM layers at/above', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        const blankTile = await createBlankTile(tileSize, 'white');

        // Corrections with different data in NE vs OSM layers
        // NE layer: horizontal line at y=64 (top quarter)
        // OSM layer: horizontal line at y=192 (bottom quarter)
        const corrections = {
          'to-add-ne': [
            {
              geometry: [[
                { x: 0, y: 1024 },  // y = 1024/4096 * 256 = 64
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 3072 },  // y = 3072/4096 * 256 = 192
                { x: 4096, y: 3072 },
              ]],
              extent: 4096,
            },
          ],
        };

        // Config with zoomThreshold = 5 split into two lineStyles
        // NE layer for z < 5 (z1-4), OSM layer for z >= 5 (z5+)
        const LayerConfig = window.LayerConfig;
        const config = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [
            { color: 'rgb(255, 0, 0)', layerSuffix: 'ne', startZoom: 1, endZoom: 4, delWidthFactor: 3 },
            { color: 'rgb(255, 0, 0)', layerSuffix: 'osm', startZoom: 5, delWidthFactor: 3 },
          ],
        });

        // Test at z4 (below zoomThreshold) - should use NE layer (line at y=64)
        const z4Tile = await corrector.fixTile(corrections, blankTile, config, 4, tileSize);
        const z4Analysis = await analyzePixels(z4Tile, tileSize);

        // Test at z5 (at zoomThreshold) - should use OSM layer (line at y=192)
        const z5Tile = await corrector.fixTile(corrections, blankTile, config, 5, tileSize);
        const z5Analysis = await analyzePixels(z5Tile, tileSize);

        // Test at z6 (above zoomThreshold) - should use OSM layer (line at y=192)
        const z6Tile = await corrector.fixTile(corrections, blankTile, config, 6, tileSize);
        const z6Analysis = await analyzePixels(z6Tile, tileSize);

        return {
          z4MinY: z4Analysis.minY,
          z4MaxY: z4Analysis.maxY,
          z5MinY: z5Analysis.minY,
          z5MaxY: z5Analysis.maxY,
          z6MinY: z6Analysis.minY,
          z6MaxY: z6Analysis.maxY,
          z4Base64: arrayBufferToBase64(z4Tile),
          z5Base64: arrayBufferToBase64(z5Tile),
          z6Base64: arrayBufferToBase64(z6Tile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-z4-NE-layer.png', result.z4Base64);
      await saveDebugImage(testInfo.title, '2-z5-OSM-layer.png', result.z5Base64);
      await saveDebugImage(testInfo.title, '3-z6-OSM-layer.png', result.z6Base64);

      // z4 should have line near y=64 (NE layer)
      expect(result.z4MinY).toBeGreaterThanOrEqual(58);
      expect(result.z4MaxY).toBeLessThanOrEqual(72);

      // z5 should have line near y=192 (OSM layer)
      expect(result.z5MinY).toBeGreaterThanOrEqual(186);
      expect(result.z5MaxY).toBeLessThanOrEqual(200);

      // z6 should have line near y=192 (OSM layer)
      expect(result.z6MinY).toBeGreaterThanOrEqual(186);
      expect(result.z6MaxY).toBeLessThanOrEqual(200);
    });

    test('deletion also respects zoomThreshold for layer selection', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;

        const tileSize = 256;
        
        // Create tile with TWO black lines - one at y=64, one at y=192
        const canvas = new OffscreenCanvas(tileSize, tileSize);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tileSize, tileSize);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 64);
        ctx.lineTo(256, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 192);
        ctx.lineTo(256, 192);
        ctx.stroke();
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const tileWithLines = await blob.arrayBuffer();

        // Deletion corrections: NE deletes at y=64, OSM deletes at y=192
        const corrections = {
          'to-del-ne': [
            {
              geometry: [[
                { x: 0, y: 1024 },  // y = 64
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 3072 },  // y = 192
                { x: 4096, y: 3072 },
              ]],
              extent: 4096,
            },
          ],
        };

        const LayerConfig = window.LayerConfig;
        const config = LayerConfig.fromJSON({ id: 'test',
          lineWidthStops: { 0: 4, 10: 4, 14: 4 },
          lineStyles: [
            { color: 'rgb(255, 0, 0)', layerSuffix: 'ne', startZoom: 1, endZoom: 4, delWidthFactor: 3 },
            { color: 'rgb(255, 0, 0)', layerSuffix: 'osm', startZoom: 5, delWidthFactor: 3 },
          ],
        });

        // At z4 (below threshold), should delete NE layer (y=64 line removed)
        const z4Tile = await corrector.fixTile(corrections, tileWithLines, config, 4, tileSize);
        const z4Analysis = await analyzePixels(z4Tile, tileSize);

        // At z6 (above threshold), should delete OSM layer (y=192 line removed)
        const z6Tile = await corrector.fixTile(corrections, tileWithLines, config, 6, tileSize);
        const z6Analysis = await analyzePixels(z6Tile, tileSize);

        return {
          // At z4: line at y=64 should be blurred, line at y=192 should remain
          z4HasLineAt64: z4Analysis.minY <= 70,
          z4HasLineAt192: z4Analysis.maxY >= 186,
          // At z6: line at y=192 should be blurred, line at y=64 should remain
          z6HasLineAt64: z6Analysis.minY <= 70,
          z6HasLineAt192: z6Analysis.maxY >= 186,
          inputBase64: arrayBufferToBase64(tileWithLines),
          z4Base64: arrayBufferToBase64(z4Tile),
          z6Base64: arrayBufferToBase64(z6Tile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input-two-lines.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-z4-NE-deletion.png', result.z4Base64);
      await saveDebugImage(testInfo.title, '3-z6-OSM-deletion.png', result.z6Base64);

      // At z4: NE deletion should blur y=64, but y=192 line remains
      expect(result.z4HasLineAt64).toBe(false);  // y=64 line blurred away
      expect(result.z4HasLineAt192).toBe(true);  // y=192 line remains

      // At z6: OSM deletion should blur y=192, but y=64 line remains
      expect(result.z6HasLineAt64).toBe(true);   // y=64 line remains
      expect(result.z6HasLineAt192).toBe(false); // y=192 line blurred away
    });
  });

  test.describe('fixTile - Median Blur Deletion', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('median blur removes existing line', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, createSimpleLineCorrections, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        // Create a tile with a black line
        // Line coordinates in pixel space
        const tileWithLine = await createTileWithLine(tileSize, 'white', 'black', [
          { x: 0, y: 128 },
          { x: 256, y: 128 },
        ]);
        
        // Analyze before deletion
        const beforeAnalysis = await analyzePixels(tileWithLine, tileSize);
        
        // Apply deletion along the same line
        // Deletion coordinates in vector tile space (0-4096)
        const corrections = createSimpleLineCorrections([
          { x: 0, y: 2048 },
          { x: 4096, y: 2048 },
        ], 'to-del-osm');
        
        const fixedTile = await corrector.fixTile(corrections, tileWithLine, layerConfig, 10, tileSize);
        
        // Analyze after deletion
        const afterAnalysis = await analyzePixels(fixedTile, tileSize);
        
        return {
          before: beforeAnalysis,
          after: afterAnalysis,
          reduction: beforeAnalysis.coloredPixels - afterAnalysis.coloredPixels,
          inputBase64: arrayBufferToBase64(tileWithLine),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Before should have colored (black) pixels
      expect(result.before.coloredPixels).toBeGreaterThan(0);
      // After should have significantly fewer colored pixels (line blurred away)
      expect(result.reduction).toBeGreaterThan(result.before.coloredPixels * 0.5);
    });

    test('median blur removes curved serpentine line', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        
        // Create a serpentine/wavy curve in pixel space
        // Sine wave pattern: y = 128 + 80*sin(x * 4π / 256)
        const pixelPoints = [];
        for (let x = 0; x <= 256; x += 4) {
          const y = 128 + 80 * Math.sin(x * 4 * Math.PI / 256);
          pixelPoints.push({ x, y });
        }
        
        const tileWithCurve = await createTileWithLine(tileSize, 'white', 'black', pixelPoints);
        
        // Analyze before deletion
        const beforeAnalysis = await analyzePixels(tileWithCurve, tileSize);
        
        // Create matching curve in vector tile space (0-4096)
        // Scale: pixel * 16 = vector coordinate
        const vectorPoints = [];
        for (let x = 0; x <= 4096; x += 64) {
          const y = 2048 + 1280 * Math.sin(x * 4 * Math.PI / 4096);
          vectorPoints.push({ x, y });
        }
        
        const corrections = {
          'to-del-osm': [
            {
              geometry: [vectorPoints],
              extent: 4096,
              type: 2,
              properties: {},
            },
          ],
        };
        
        const fixedTile = await corrector.fixTile(corrections, tileWithCurve, layerConfig, 10, tileSize);
        
        // Analyze after deletion
        const afterAnalysis = await analyzePixels(fixedTile, tileSize);
        
        return {
          before: beforeAnalysis,
          after: afterAnalysis,
          reduction: beforeAnalysis.coloredPixels - afterAnalysis.coloredPixels,
          reductionPercent: ((beforeAnalysis.coloredPixels - afterAnalysis.coloredPixels) / beforeAnalysis.coloredPixels) * 100,
          inputBase64: arrayBufferToBase64(tileWithCurve),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Before should have colored (black) pixels from the serpentine curve
      expect(result.before.coloredPixels).toBeGreaterThan(500);
      // After should have significantly fewer colored pixels (curve blurred away)
      // Curved lines are harder to fully remove, so expect at least 40% reduction
      expect(result.reductionPercent).toBeGreaterThan(40);
    });
  });

  test.describe('fixTile - Addition and Deletion Combined', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('deletion happens before addition - non-intersecting', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, analyzePixels, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        // Create a tile with a black horizontal line at y=64 (top quarter)
        const tileWithLine = await createTileWithLine(tileSize, 'white', 'black', [
          { x: 0, y: 64 },
          { x: 256, y: 64 },
        ]);
        
        // Delete the horizontal line at y=64 and add a horizontal line at y=192 (bottom quarter)
        // These lines are parallel and don't intersect
        const corrections = {
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 1024 },      // y=1024/4096*256 = 64
                { x: 4096, y: 1024 },
              ]],
              extent: 4096,
            },
          ],
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 3072 },      // y=3072/4096*256 = 192
                { x: 4096, y: 3072 },
              ]],
              extent: 4096,
            },
          ],
        };
        
        const fixedTile = await corrector.fixTile(corrections, tileWithLine, layerConfig, 10, tileSize);
        
        const analysis = await analyzePixels(fixedTile, tileSize);
        return {
          ...analysis,
          inputBase64: arrayBufferToBase64(tileWithLine),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Should have colored pixels from the addition line
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Addition line should be around y=192, not spanning full height
      expect(result.minY).toBeGreaterThan(180);
      expect(result.maxY).toBeLessThan(210);
    });

    test('deletion happens before addition - intersecting lines', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, getPixelColor, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        // Create a tile with a black horizontal line at y=128
        const tileWithLine = await createTileWithLine(tileSize, 'white', 'black', [
          { x: 0, y: 128 },
          { x: 256, y: 128 },
        ]);
        
        // Delete the horizontal line and add a vertical line - they intersect at center
        const corrections = {
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
          'to-add-osm': [
            {
              geometry: [[
                { x: 2048, y: 0 },
                { x: 2048, y: 4096 },
              ]],
              extent: 4096,
            },
          ],
        };
        
        const fixedTile = await corrector.fixTile(corrections, tileWithLine, layerConfig, 10, tileSize);
        
        // Check the intersection point (128, 128)
        const intersectionColor = await getPixelColor(fixedTile, tileSize, 128, 128);
        
        // Check points on the vertical line away from intersection
        const verticalTop = await getPixelColor(fixedTile, tileSize, 128, 64);
        const verticalBottom = await getPixelColor(fixedTile, tileSize, 128, 192);
        
        // Check points on the horizontal line away from intersection
        const horizontalLeft = await getPixelColor(fixedTile, tileSize, 64, 128);
        const horizontalRight = await getPixelColor(fixedTile, tileSize, 192, 128);
        
        return {
          intersection: intersectionColor,
          verticalTop,
          verticalBottom,
          horizontalLeft,
          horizontalRight,
          inputBase64: arrayBufferToBase64(tileWithLine),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // At intersection: should show addition color (deletion happened first)
      expect(result.intersection.isColored).toBe(true);
      
      // On vertical line (addition): should be colored
      expect(result.verticalTop.isColored).toBe(true);
      expect(result.verticalBottom.isColored).toBe(true);
      
      // On horizontal line (deletion): should be blurred/white (deleted)
      // These might be slightly colored due to blur but should be much closer to white
      expect(result.horizontalLeft.r).toBeGreaterThan(200);
      expect(result.horizontalRight.r).toBeGreaterThan(200);
    });

    test('multiple intersecting additions and deletions', async ({ page }, testInfo) => {
      const result = await page.evaluate(async () => {
        const { createTileWithMultipleLines, getPixelColor, arrayBufferToBase64 } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        // Create a tile with two black lines forming an X
        const tileWithLines = await createTileWithMultipleLines(tileSize, 'white', 'black', [
          [{ x: 0, y: 0 }, { x: 256, y: 256 }],     // Diagonal \
          [{ x: 0, y: 256 }, { x: 256, y: 0 }],     // Diagonal /
        ]);
        
        // Delete one diagonal and add a horizontal line
        const corrections = {
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 0 },
                { x: 4096, y: 4096 },
              ]],
              extent: 4096,
            },
          ],
          'to-add-osm': [
            {
              geometry: [[
                { x: 0, y: 2048 },
                { x: 4096, y: 2048 },
              ]],
              extent: 4096,
            },
          ],
        };
        
        const fixedTile = await corrector.fixTile(corrections, tileWithLines, layerConfig, 10, tileSize);
        
        // Check various points
        const center = await getPixelColor(fixedTile, tileSize, 128, 128);
        const onAddedLine = await getPixelColor(fixedTile, tileSize, 64, 128);
        const onDeletedLine = await getPixelColor(fixedTile, tileSize, 64, 64);
        const onRemainingLine = await getPixelColor(fixedTile, tileSize, 64, 192);
        
        return {
          center,
          onAddedLine,
          onDeletedLine,
          onRemainingLine,
          inputBase64: arrayBufferToBase64(tileWithLines),
          outputBase64: arrayBufferToBase64(fixedTile),
        };
      });

      // Save debug images
      await saveDebugImage(testInfo.title, '1-input.png', result.inputBase64);
      await saveDebugImage(testInfo.title, '2-output.png', result.outputBase64);

      // Center and added line should be colored
      expect(result.center.isColored).toBe(true);
      expect(result.onAddedLine.isColored).toBe(true);
      
      // Deleted diagonal should be blurred away
      expect(result.onDeletedLine.r).toBeGreaterThan(200);
      
      // Remaining diagonal (not in deletions) should still be there
      expect(result.onRemainingLine.isColored).toBe(true);
    });
  });

  test.describe('fetchAndFixTile - Success Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('returns fixed tile when corrections are available', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101; // Tile with corrections
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
          dataSize: result.data.byteLength,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(true);
      expect(result.dataSize).toBeGreaterThan(0);
    });

    test('returns original tile when no corrections exist', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0; // Tile outside India - no corrections
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
          dataSize: result.data.byteLength,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
      expect(result.dataSize).toBeGreaterThan(0);
    });

    test('returns original tile when corrections fail to load', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 999, x = 999999, y = 999999; // Invalid coords cause correction failure
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
    });

    test('returns original tile when layerConfig is null', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101;
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, null, {});
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
    });
  });

  test.describe('fetchAndFixTile - Failure Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('throws TileFetchError with status when tile fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        const { TileFetchError } = window.tilefixerExports;
        
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        
        try {
          await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
          return { error: null };
        } catch (err) {
          return { 
            error: err.message,
            name: err.name,
            status: err.status,
            isTileFetchError: err instanceof TileFetchError
          };
        }
      });

      expect(result.error).toContain('Tile fetch failed');
      expect(result.name).toBe('TileFetchError');
      expect(result.status).toBe(404);
      expect(result.isTileFetchError).toBe(true);
    });

    test('handles network timeout', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('timeout');
        const z = 8, x = 182, y = 101;
        
        try {
          await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
          return { error: null, timedOut: false };
        } catch (err) {
          return { error: err.message, timedOut: true };
        }
      });

      expect(result.timedOut).toBe(true);
      expect(result.error).toBeTruthy();
    });

    test('handles abort signal', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('abort');
        const z = 8, x = 182, y = 101;
        
        const controller = new AbortController();
        
        const fetchPromise = corrector.fetchAndFixTile(
          mockTileUrl, z, x, y, layerConfig, 
          { signal: controller.signal }
        );
        
        // Abort after a short delay
        setTimeout(() => controller.abort(), 50);
        
        try {
          await fetchPromise;
          return { aborted: false, error: null };
        } catch (err) {
          return { aborted: err.name === 'AbortError', error: err.message };
        }
      });

      expect(result.aborted).toBe(true);
    });
  });

  test.describe('fetchAndFixTile - Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('handles corrupted tile data gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('corrupted');
        const z = 8, x = 182, y = 101;
        
        try {
          const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
          return { success: true, hasData: result.data instanceof ArrayBuffer };
        } catch (err) {
          return { success: false, error: err.message };
        }
      });

      // Either succeeds with data or fails gracefully
      if (result.success) {
        expect(result.hasData).toBe(true);
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    test('handles empty corrections object', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 1, x = 0, y = 0; // Very low zoom, likely no corrections
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, {});
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
    });

    test('respects mode option for CORS', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 0, y = 0;
        
        // This should work with cors mode
        const result = await corrector.fetchAndFixTile(
          mockTileUrl, z, x, y, layerConfig, 
          { mode: 'cors' }
        );
        
        return {
          hasData: result.data instanceof ArrayBuffer,
        };
      });

      expect(result.hasData).toBe(true);
    });

    test('throws when corrections fail and fallbackOnCorrectionFailure is false', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { TileFixer } = window.tilefixerExports;
        const layerConfig = window.layerConfig;
        
        // Create a TileFixer with a broken PMTiles URL
        const brokenCorrector = new TileFixer('/broken.pmtiles');
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101; // Tile that would have corrections
        
        try {
          await brokenCorrector.fetchAndFixTile(
            mockTileUrl, z, x, y, layerConfig, {}, false
          );
          return { threw: false };
        } catch (err) {
          return { 
            threw: true,
            errorMessage: err.message,
          };
        }
      });

      expect(result.threw).toBe(true);
      expect(result.errorMessage).toBeTruthy();
    });

    test('returns original tile when corrections fail and fallbackOnCorrectionFailure is true (default)', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { TileFixer } = window.tilefixerExports;
        const layerConfig = window.layerConfig;
        
        // Create a TileFixer with a broken PMTiles URL
        const brokenCorrector = new TileFixer('/broken.pmtiles');
        
        const mockTileUrl = window.createMockTileUrl('success');
        const z = 8, x = 182, y = 101; // Tile that would have corrections
        
        const result = await brokenCorrector.fetchAndFixTile(
          mockTileUrl, z, x, y, layerConfig, 
          {} // fallbackOnCorrectionFailure defaults to true
        );
        
        return {
          hasData: result.data instanceof ArrayBuffer,
          wasFixed: result.wasFixed,
          correctionsFailed: result.correctionsFailed,
        };
      });

      expect(result.hasData).toBe(true);
      expect(result.wasFixed).toBe(false);
      expect(result.correctionsFailed).toBe(true);
    });
  });
});
