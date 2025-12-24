import { test, expect } from '@playwright/test';

test.describe('Data Package', () => {
  test.describe('layers constant', () => {
    test('exports correct layer names', async ({ page }) => {
      await page.goto('/tests/fixtures/data-test.html');
      await page.waitForFunction(() => window.dataPackageLoaded === true, { timeout: 10000 });

      const layers = await page.evaluate(() => window.dataPackage.layers);

      expect(layers).toEqual({
        toAddOsm: 'to-add-osm',
        toDelOsm: 'to-del-osm',
        toAddNe: 'to-add-ne',
        toDelNe: 'to-del-ne',
      });
    });
  });

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

      expect(urls.same).toBe(true);
    });
  });

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

      // Expected format: osm_YYYYMMDD_HHMMSS_ne_X.X.X
      expect(version).toMatch(/osm_\d{8}_\d{6}_ne_\d+\.\d+\.\d+/);
    });
  });
});
