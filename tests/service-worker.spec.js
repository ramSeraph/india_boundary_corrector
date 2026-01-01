import { test, expect } from '@playwright/test';

test.describe('Service Worker Package', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/fixtures/service-worker-test.html');
    await page.waitForFunction(() => window.serviceWorkerTestLoaded === true, { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: unregister all service workers
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    });
    // Wait a bit for cleanup
    await page.waitForTimeout(500);
  });

  test.describe('CorrectionServiceWorker - API and Exports', () => {
    test('exports CorrectionServiceWorker class', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        return {
          hasCorrectionServiceWorker: typeof CorrectionServiceWorker === 'function',
          isConstructor: CorrectionServiceWorker.prototype.constructor === CorrectionServiceWorker,
        };
      });

      expect(result.hasCorrectionServiceWorker).toBe(true);
      expect(result.isConstructor).toBe(true);
    });

    test('exports MessageTypes', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { MessageTypes } = window;
        
        return {
          hasTypes: !!MessageTypes,
          types: Object.keys(MessageTypes).sort(),
        };
      });

      expect(result.hasTypes).toBe(true);
      expect(result.types).toEqual([
        'ADD_LAYER_CONFIG',
        'CLEAR_CACHE',
        'GET_STATUS',
        'REMOVE_LAYER_CONFIG',
        'RESET_CONFIG',
        'SET_ENABLED',
        'SET_PMTILES_URL',
      ]);
    });

    test('exports helper functions', async ({ page }) => {
      const result = await page.evaluate(() => {
        return {
          hasRegisterFunction: typeof window.registerCorrectionServiceWorker === 'function',
          hasImportSnippet: typeof window.getWorkerImportSnippet === 'function',
          hasLayerConfig: typeof window.LayerConfig === 'function',
        };
      });

      expect(result.hasRegisterFunction).toBe(true);
      expect(result.hasImportSnippet).toBe(true);
      expect(result.hasLayerConfig).toBe(true);
    });
  });

  test.describe('CorrectionServiceWorker - Construction', () => {
    test('constructs with required parameters', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        return {
          hasInstance: sw instanceof CorrectionServiceWorker,
          hasRegisterMethod: typeof sw.register === 'function',
          hasUnregisterMethod: typeof sw.unregister === 'function',
          hasSendMessageMethod: typeof sw.sendMessage === 'function',
        };
      });

      expect(result.hasInstance).toBe(true);
      expect(result.hasRegisterMethod).toBe(true);
      expect(result.hasUnregisterMethod).toBe(true);
      expect(result.hasSendMessageMethod).toBe(true);
    });

    test('constructs with options', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        
        const sw = new CorrectionServiceWorker('/test-sw.js', {
          scope: '/custom/',
          pmtilesUrl: 'https://example.com/tiles.pmtiles',
          controllerTimeout: 5000,
        });
        
        return {
          hasInstance: sw instanceof CorrectionServiceWorker,
        };
      });

      expect(result.hasInstance).toBe(true);
    });
  });

  test.describe('CorrectionServiceWorker - Methods', () => {
    test('isControlling returns boolean', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        return {
          result: sw.isControlling(),
          isBoolean: typeof sw.isControlling() === 'boolean',
        };
      });

      expect(result.isBoolean).toBe(true);
      expect(result.result).toBe(false); // Not registered yet
    });

    test('getWorker returns null before registration', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        return {
          worker: sw.getWorker(),
        };
      });

      expect(result.worker).toBeNull();
    });

    test('has all expected methods', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        return {
          hasRegister: typeof sw.register === 'function',
          hasUnregister: typeof sw.unregister === 'function',
          hasIsControlling: typeof sw.isControlling === 'function',
          hasGetWorker: typeof sw.getWorker === 'function',
          hasSendMessage: typeof sw.sendMessage === 'function',
          hasAddLayerConfig: typeof sw.addLayerConfig === 'function',
          hasRemoveLayerConfig: typeof sw.removeLayerConfig === 'function',
          hasSetPmtilesUrl: typeof sw.setPmtilesUrl === 'function',
          hasSetEnabled: typeof sw.setEnabled === 'function',
          hasClearCache: typeof sw.clearCache === 'function',
          hasGetStatus: typeof sw.getStatus === 'function',
        };
      });

      expect(result.hasRegister).toBe(true);
      expect(result.hasUnregister).toBe(true);
      expect(result.hasIsControlling).toBe(true);
      expect(result.hasGetWorker).toBe(true);
      expect(result.hasSendMessage).toBe(true);
      expect(result.hasAddLayerConfig).toBe(true);
      expect(result.hasRemoveLayerConfig).toBe(true);
      expect(result.hasSetPmtilesUrl).toBe(true);
      expect(result.hasSetEnabled).toBe(true);
      expect(result.hasClearCache).toBe(true);
      expect(result.hasGetStatus).toBe(true);
    });
  });

  test.describe('Helper Functions', () => {
    test('getWorkerImportSnippet generates correct code', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { getWorkerImportSnippet } = window;
        const snippet = getWorkerImportSnippet('https://example.com/worker.global.js');
        
        return {
          snippet,
          isString: typeof snippet === 'string',
          hasImportScripts: snippet.includes('importScripts'),
          hasUrl: snippet.includes('https://example.com/worker.global.js'),
        };
      });

      expect(result.isString).toBe(true);
      expect(result.hasImportScripts).toBe(true);
      expect(result.hasUrl).toBe(true);
      expect(result.snippet).toBe("importScripts('https://example.com/worker.global.js');");
    });

    test('getWorkerImportSnippet handles different URLs', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { getWorkerImportSnippet } = window;
        
        const snippet1 = getWorkerImportSnippet('/local/worker.js');
        const snippet2 = getWorkerImportSnippet('https://cdn.example.com/v1.0.0/worker.js');
        
        return {
          snippet1,
          snippet2,
          bothValid: snippet1.includes('importScripts') && snippet2.includes('importScripts'),
        };
      });

      expect(result.snippet1).toBe("importScripts('/local/worker.js');");
      expect(result.snippet2).toBe("importScripts('https://cdn.example.com/v1.0.0/worker.js');");
      expect(result.bothValid).toBe(true);
    });

    test('registerCorrectionServiceWorker is a function', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { registerCorrectionServiceWorker } = window;
        
        return {
          isFunction: typeof registerCorrectionServiceWorker === 'function',
        };
      });

      expect(result.isFunction).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('sendMessage throws error when worker not active', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionServiceWorker, MessageTypes } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        // Don't register, try to send message
        
        try {
          await sw.sendMessage({ type: MessageTypes.GET_STATUS });
          return { error: null };
        } catch (err) {
          return { error: err.message };
        }
      });

      expect(result.error).toContain('Service worker not active');
    });

    test('unregister returns false when not registered', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        const result = await sw.unregister();
        
        return { result };
      });

      expect(result.result).toBe(false);
    });
  });

  test.describe('Integration - Constructor Options', () => {
    test('accepts pmtilesUrl in constructor', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        
        const sw = new CorrectionServiceWorker('/test-sw.js', {
          pmtilesUrl: 'https://custom.example.com/tiles.pmtiles',
        });
        
        return {
          created: sw instanceof CorrectionServiceWorker,
        };
      });

      expect(result.created).toBe(true);
    });

    test('accepts controllerTimeout in constructor', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        
        const sw = new CorrectionServiceWorker('/test-sw.js', {
          controllerTimeout: 10000,
        });
        
        return {
          created: sw instanceof CorrectionServiceWorker,
        };
      });

      expect(result.created).toBe(true);
    });

    test('accepts multiple options in constructor', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        
        const sw = new CorrectionServiceWorker('/test-sw.js', {
          scope: '/app/',
          pmtilesUrl: 'https://custom.example.com/tiles.pmtiles',
          controllerTimeout: 5000,
        });
        
        return {
          created: sw instanceof CorrectionServiceWorker,
        };
      });

      expect(result.created).toBe(true);
    });
  });

  test.describe('LayerConfig Integration', () => {
    test('LayerConfig is available', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { LayerConfig } = window;
        
        return {
          isFunction: typeof LayerConfig === 'function',
          canConstruct: !!new LayerConfig({ id: 'test', zoomThreshold: 5, tileUrlTemplates: ['https://test.com/{z}/{x}/{y}.png'] }),
        };
      });

      expect(result.isFunction).toBe(true);
      expect(result.canConstruct).toBe(true);
    });

    test('LayerConfig has toJSON method', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { LayerConfig } = window;
        const config = new LayerConfig({ 
          id: 'test-id', 
          zoomThreshold: 7, 
          tileUrlTemplates: ['https://example.com/{z}/{x}/{y}.png'] 
        });
        
        return {
          hasToJSON: typeof config.toJSON === 'function',
          json: config.toJSON(),
        };
      });

      expect(result.hasToJSON).toBe(true);
      expect(result.json).toHaveProperty('id', 'test-id');
      expect(result.json).toHaveProperty('zoomThreshold', 7);
    });
  });

  test.describe('Method Return Types', () => {
    test('register returns Promise', async ({ page }) => {
      const result = await page.evaluate(() => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/fake-sw.js');
        
        const promise = sw.register().catch(e => e);
        
        return {
          isPromise: promise instanceof Promise,
        };
      });

      expect(result.isPromise).toBe(true);
    });

    test('unregister returns Promise', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { CorrectionServiceWorker } = window;
        const sw = new CorrectionServiceWorker('/test-sw.js');
        
        const result = await sw.unregister();
        
        return {
          isBoolean: typeof result === 'boolean',
        };
      });

      expect(result.isBoolean).toBe(true);
    });
  });

  test.describe('Integration - Service Worker Behavior', () => {
    test('registers and controls the page', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        return {
          isControlling: sw.isControlling(),
          hasWorker: sw.getWorker() !== null,
        };
      });

      expect(result.isControlling).toBe(true);
      expect(result.hasWorker).toBe(true);
    });

    test('getStatus returns correct initial state', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        const status = await sw.getStatus();
        
        return {
          enabled: status.enabled,
          hasConfigIds: Array.isArray(status.configIds),
          configIds: status.configIds,
          hasPmtilesUrl: typeof status.pmtilesUrl === 'string',
        };
      });

      expect(result.enabled).toBe(true);
      expect(result.hasConfigIds).toBe(true);
      expect(result.configIds).toContain('osm-carto');
      expect(result.configIds).toContain('cartodb-dark');
      expect(result.hasPmtilesUrl).toBe(true);
    });

    test('setEnabled toggles correction state', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        // Initially enabled
        const status1 = await sw.getStatus();
        
        // Disable
        await sw.setEnabled(false);
        const status2 = await sw.getStatus();
        
        // Re-enable
        await sw.setEnabled(true);
        const status3 = await sw.getStatus();
        
        return {
          initialEnabled: status1.enabled,
          afterDisable: status2.enabled,
          afterReEnable: status3.enabled,
        };
      });

      expect(result.initialEnabled).toBe(true);
      expect(result.afterDisable).toBe(false);
      expect(result.afterReEnable).toBe(true);
    });

    test('addLayerConfig adds new config', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker, LayerConfig } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        const statusBefore = await sw.getStatus();
        
        await sw.addLayerConfig(new LayerConfig({
          id: 'custom-test-config',
          zoomThreshold: 5,
          tileUrlTemplates: ['https://custom.test.com/{z}/{x}/{y}.png'],
        }));
        
        const statusAfter = await sw.getStatus();
        
        return {
          configsBefore: statusBefore.configIds,
          configsAfter: statusAfter.configIds,
        };
      });

      expect(result.configsBefore).not.toContain('custom-test-config');
      expect(result.configsAfter).toContain('custom-test-config');
    });

    test('removeLayerConfig removes config', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker, LayerConfig } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        // Add a config first
        await sw.addLayerConfig(new LayerConfig({
          id: 'to-be-removed',
          zoomThreshold: 5,
          tileUrlTemplates: ['https://remove.test.com/{z}/{x}/{y}.png'],
        }));
        
        const statusBefore = await sw.getStatus();
        
        await sw.removeLayerConfig('to-be-removed');
        
        const statusAfter = await sw.getStatus();
        
        return {
          hadConfig: statusBefore.configIds.includes('to-be-removed'),
          configRemoved: !statusAfter.configIds.includes('to-be-removed'),
        };
      });

      expect(result.hadConfig).toBe(true);
      expect(result.configRemoved).toBe(true);
    });

    test('resetConfig restores default configuration', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker, LayerConfig } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        // Add custom config
        await sw.addLayerConfig(new LayerConfig({
          id: 'custom-config',
          zoomThreshold: 5,
          tileUrlTemplates: ['https://custom.com/{z}/{x}/{y}.png'],
        }));
        
        // Remove a default config
        await sw.removeLayerConfig('osm-carto');
        
        const statusBefore = await sw.getStatus();
        
        // Reset
        await sw.resetConfig();
        
        const statusAfter = await sw.getStatus();
        
        return {
          beforeHadCustom: statusBefore.configIds.includes('custom-config'),
          beforeMissingOsmCarto: !statusBefore.configIds.includes('osm-carto'),
          afterNoCustom: !statusAfter.configIds.includes('custom-config'),
          afterHasOsmCarto: statusAfter.configIds.includes('osm-carto'),
          afterHasCartodbDark: statusAfter.configIds.includes('cartodb-dark'),
        };
      });

      expect(result.beforeHadCustom).toBe(true);
      expect(result.beforeMissingOsmCarto).toBe(true);
      expect(result.afterNoCustom).toBe(true);
      expect(result.afterHasOsmCarto).toBe(true);
      expect(result.afterHasCartodbDark).toBe(true);
    });

    test('setPmtilesUrl changes the PMTiles source', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        const statusBefore = await sw.getStatus();
        
        await sw.setPmtilesUrl('https://example.com/custom.pmtiles');
        
        const statusAfter = await sw.getStatus();
        
        return {
          urlBefore: statusBefore.pmtilesUrl,
          urlAfter: statusAfter.pmtilesUrl,
        };
      });

      expect(result.urlBefore).toContain('india_boundary_corrections.pmtiles');
      expect(result.urlAfter).toBe('https://example.com/custom.pmtiles');
    });

    test('clearCache clears the tile cache', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        // clearCache should not throw
        await sw.clearCache();
        
        return {
          success: true,
        };
      });

      expect(result.success).toBe(true);
    });

    test('unregister removes the service worker', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const { registerCorrectionServiceWorker } = window;
        
        const sw = await registerCorrectionServiceWorker('/tests/fixtures/sw.js', {
          pmtilesUrl: '/packages/data/india_boundary_corrections.pmtiles',
        });
        
        const controllingBefore = sw.isControlling();
        
        const unregistered = await sw.unregister();
        
        // Check registrations
        const registrations = await navigator.serviceWorker.getRegistrations();
        const hasOurSw = registrations.some(r => r.active?.scriptURL.includes('sw.js'));
        
        return {
          controllingBefore,
          unregistered,
          hasOurSw,
        };
      });

      expect(result.controllingBefore).toBe(true);
      expect(result.unregistered).toBe(true);
      expect(result.hasOurSw).toBe(false);
    });
  });
});
