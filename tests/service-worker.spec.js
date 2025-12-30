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
          canConstruct: !!new LayerConfig({ id: 'test', zoomThreshold: 5, tileUrlPattern: /test/ }),
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
          tileUrlPattern: /example\.com/ 
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
});
