import { test, expect } from '@playwright/test';

/**
 * Tests for the @india-boundary-corrector/data package.
 * 
 * This package provides:
 * - The PMTiles file URL containing boundary correction vectors
 * - Layer name constants for accessing correction data
 * - Version information about the bundled data
 */
test.describe('Data Package', () => {
  /**
   * Tests for the `layers` constant export.
   * The layers object maps friendly names to actual layer names in the PMTiles file.
   * These layer names are used by tilefixer to extract the correct features.
   */
  test.describe('layers constant', () => {
    test('exports correct layer names', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const layers = await page.evaluate(() => window.dataPackage.layers);

      // Four layers: add/delete for OSM data (high zoom) and Natural Earth data (low zoom)
      expect(layers).toEqual({
        toAddOsm: 'to-add-osm',
        toDelOsm: 'to-del-osm',
        toAddNe: 'to-add-ne',
        toDelNe: 'to-del-ne',
      });
    });
  });

  /**
   * Tests for getPmtilesUrl().
   * This function returns the URL to the bundled PMTiles file.
   * By default, it derives the URL from the module's location (import.meta.url).
   */
  test.describe('getPmtilesUrl', () => {
    test('returns URL derived from import.meta.url by default', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const url = await page.evaluate(() => window.dataPackage.getPmtilesUrl());

      // Should be relative to the module location
      expect(url).toContain('india_boundary_corrections.pmtiles');
      expect(url).toContain('/packages/data/');
    });

    test('caches the URL on subsequent calls', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const urls = await page.evaluate(() => {
        const url1 = window.dataPackage.getPmtilesUrl();
        const url2 = window.dataPackage.getPmtilesUrl();
        return { url1, url2, same: url1 === url2 };
      });

      // URL should be computed once and cached
      expect(urls.same).toBe(true);
    });
  });

  /**
   * Tests for setPmtilesUrl().
   * Allows users to override the default PMTiles URL, useful for:
   * - Self-hosting the PMTiles file on a CDN
   * - Using a different version of the data
   */
  test.describe('setPmtilesUrl', () => {
    test('allows manual override of the URL', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const customUrl = 'https://my-custom-cdn.com/tiles.pmtiles';
      
      const result = await page.evaluate((url) => {
        window.dataPackage.setPmtilesUrl(url);
        return window.dataPackage.getPmtilesUrl();
      }, customUrl);

      expect(result).toBe(customUrl);
    });
  });

  /**
   * Tests for shouldUseCdnFallback().
   * Checks if a hostname should fall back to unpkg CDN.
   * Some CDNs like esm.sh only serve JS modules, not static files.
   */
  test.describe('shouldUseCdnFallback', () => {
    test('returns true for esm.sh hostname', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => window.dataPackage.shouldUseCdnFallback('esm.sh'));
      expect(result).toBe(true);
    });

    test('returns false for unpkg.com hostname', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => window.dataPackage.shouldUseCdnFallback('unpkg.com'));
      expect(result).toBe(false);
    });

    test('returns false for localhost', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => window.dataPackage.shouldUseCdnFallback('localhost'));
      expect(result).toBe(false);
    });

    test('returns false for custom domains', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => window.dataPackage.shouldUseCdnFallback('my-cdn.example.com'));
      expect(result).toBe(false);
    });
  });

  /**
   * Tests for getDataVersion().
   * Returns version information about the bundled boundary data.
   * Useful for cache busting and debugging data freshness.
   */
  test.describe('getDataVersion', () => {
    test('returns a version string', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const version = await page.evaluate(() => window.dataPackage.getDataVersion());

      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    test('version contains expected format (osm timestamp and ne version)', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const version = await page.evaluate(() => window.dataPackage.getDataVersion());

      // Format: osm_YYYYMMDD_HHMMSS_ne_X.X.X
      // - osm timestamp indicates when OSM data was extracted
      // - ne version indicates Natural Earth data version used
      expect(version).toMatch(/osm_\d{8}_\d{6}_ne_\d+\.\d+\.\d+/);
    });
  });
});
