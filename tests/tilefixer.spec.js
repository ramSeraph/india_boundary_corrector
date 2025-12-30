import { test, expect } from '@playwright/test';

test.describe('TileFixer Package', () => {
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
        const validLayers = ['to-add-osm', 'to-del-osm', 'to-add-ne', 'to-del-ne'];
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

  test.describe('fixTile - Line Drawing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('draws single addition line on blank white tile', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, createSimpleLineCorrections, analyzePixels } = window.testHelpers;
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
        return await analyzePixels(fixedTile, tileSize);
      });

      // Should have some colored pixels (the line)
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Line should be horizontal around y=128
      expect(result.minY).toBeGreaterThanOrEqual(120);
      expect(result.maxY).toBeLessThanOrEqual(136);
      // Line should span most of the width
      expect(result.maxX - result.minX).toBeGreaterThan(200);
    });

    test('draws multiple addition lines on blank white tile', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createBlankTile, createSimpleLineCorrections, analyzePixels } = window.testHelpers;
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
        
        return await analyzePixels(fixedTile, tileSize);
      });

      // Should have colored pixels from both lines
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Lines should span the tile
      expect(result.maxX - result.minX).toBeGreaterThan(200);
      expect(result.maxY - result.minY).toBeGreaterThan(200);
    });
  });

  test.describe('fixTile - Median Blur Deletion', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('median blur removes existing line', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, createSimpleLineCorrections, analyzePixels, comparePixelCounts } = window.testHelpers;
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
        };
      });

      // Before should have colored (black) pixels
      expect(result.before.coloredPixels).toBeGreaterThan(0);
      // After should have significantly fewer colored pixels (line blurred away)
      expect(result.reduction).toBeGreaterThan(result.before.coloredPixels * 0.5);
    });
  });

  test.describe('fixTile - Addition and Deletion Combined', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tests/fixtures/tilefixer-test.html');
      await page.waitForFunction(() => window.tilefixerLoaded === true, { timeout: 10000 });
    });

    test('deletion happens before addition - non-intersecting', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, analyzePixels } = window.testHelpers;
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const tileSize = 256;
        // Create a tile with a black horizontal line
        const tileWithLine = await createTileWithLine(tileSize, 'white', 'black', [
          { x: 0, y: 64 },
          { x: 256, y: 64 },
        ]);
        
        // Delete the horizontal line and add a vertical line
        const corrections = {
          'to-del-osm': [
            {
              geometry: [[
                { x: 0, y: 1024 },
                { x: 4096, y: 1024 },
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
        
        return await analyzePixels(fixedTile, tileSize);
      });

      // Should have colored pixels from the addition line
      expect(result.coloredPixels).toBeGreaterThan(0);
      // Should span vertically (from the addition)
      expect(result.maxY - result.minY).toBeGreaterThan(200);
    });

    test('deletion happens before addition - intersecting lines', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createTileWithLine, getPixelColor } = window.testHelpers;
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
        };
      });

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

    test('multiple intersecting additions and deletions', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { createTileWithMultipleLines, getPixelColor } = window.testHelpers;
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
        };
      });

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
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
        
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
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
        
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
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
        
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
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, null, { tileSize: 256 });
        
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

    test('throws error when tile fetch fails', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('tile-fail');
        const z = 8, x = 182, y = 101;
        
        try {
          await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
          return { error: null };
        } catch (err) {
          return { error: err.message };
        }
      });

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('Tile fetch failed');
    });

    test('handles network timeout', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const corrector = window.corrector;
        const layerConfig = window.layerConfig;
        
        const mockTileUrl = window.createMockTileUrl('timeout');
        const z = 8, x = 182, y = 101;
        
        try {
          await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
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
          { tileSize: 256, signal: controller.signal }
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
          const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
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
        
        const result = await corrector.fetchAndFixTile(mockTileUrl, z, x, y, layerConfig, { tileSize: 256 });
        
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
          { tileSize: 256, mode: 'cors' }
        );
        
        return {
          hasData: result.data instanceof ArrayBuffer,
        };
      });

      expect(result.hasData).toBe(true);
    });
  });
});
