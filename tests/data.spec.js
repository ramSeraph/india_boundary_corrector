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
   * Tests for resolvePmtilesUrl().
   * Resolves PMTiles URL from a given script URL.
   * JS-only CDNs (esm.sh, skypack) should fall back to jsDelivr.
   */
  test.describe('resolvePmtilesUrl', () => {
    test('resolves relative to jsdelivr URL', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => 
        window.dataPackage.resolvePmtilesUrl('https://cdn.jsdelivr.net/npm/@india-boundary-corrector/data@0.0.3/index.js')
      );
      expect(result).toBe('https://cdn.jsdelivr.net/npm/@india-boundary-corrector/data@0.0.3/india_boundary_corrections.pmtiles');
    });

    test('resolves relative to unpkg URL', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => 
        window.dataPackage.resolvePmtilesUrl('https://unpkg.com/@india-boundary-corrector/data@0.0.3/index.js')
      );
      expect(result).toBe('https://unpkg.com/@india-boundary-corrector/data@0.0.3/india_boundary_corrections.pmtiles');
    });

    test('falls back to default CDN for esm.sh', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => 
        window.dataPackage.resolvePmtilesUrl('https://esm.sh/@india-boundary-corrector/data@0.0.3')
      );
      expect(result).toBe(await page.evaluate(() => window.dataPackage.DEFAULT_CDN_URL));
    });

    test('falls back to default CDN for skypack.dev', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => 
        window.dataPackage.resolvePmtilesUrl('https://cdn.skypack.dev/@india-boundary-corrector/data@0.0.3')
      );
      expect(result).toBe(await page.evaluate(() => window.dataPackage.DEFAULT_CDN_URL));
    });

    test('resolves relative to localhost URL', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const result = await page.evaluate(() => 
        window.dataPackage.resolvePmtilesUrl('http://localhost:8080/packages/data/index.js')
      );
      expect(result).toBe('http://localhost:8080/packages/data/india_boundary_corrections.pmtiles');
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
