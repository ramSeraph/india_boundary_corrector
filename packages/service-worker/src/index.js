/**
 * Main entry point - exports utilities for registering the service worker
 * from the main thread.
 */

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';
import { MessageTypes } from './constants.js';
export { MessageTypes };

/**
 * Controller for the boundary correction service worker.
 * Use this to register the service worker and communicate with it.
 */
export class CorrectionServiceWorker {
  /**
   * @param {string} workerUrl - URL to the service worker script
   * @param {Object} [options]
   * @param {string} [options.scope] - Service worker scope (defaults to workerUrl directory)
   * @param {string} [options.pmtilesUrl] - PMTiles URL to set after registration
   * @param {number} [options.controllerTimeout=3000] - Timeout in ms to wait for SW to take control
   * @param {boolean} [options.forceReinstall=false] - Unregister existing SW before registering (useful for dev)
   */
  constructor(workerUrl, options = {}) {
    this._workerUrl = workerUrl;
    this._scope = options.scope;
    this._pmtilesUrl = options.pmtilesUrl;
    this._controllerTimeout = options.controllerTimeout ?? 3000;
    this._forceReinstall = options.forceReinstall ?? false;
    this._registration = null;
  }

  /**
   * Register the service worker and wait for it to take control.
   * @returns {Promise<CorrectionServiceWorker>} Returns this instance for chaining
   * @throws {Error} If service workers not supported or registration fails
   */
  async register() {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    // Unregister existing SW if forceReinstall is set
    if (this._forceReinstall) {
      const existingReg = await navigator.serviceWorker.getRegistration(this._scope);
      if (existingReg) {
        await existingReg.unregister();
      }
    }

    const regOptions = this._scope ? { scope: this._scope } : undefined;
    this._registration = await navigator.serviceWorker.register(
      this._workerUrl,
      regOptions
    );

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Wait for controller if not already controlling
    if (!navigator.serviceWorker.controller) {
      await this._waitForController();
    }

    // Reset config to defaults when connecting to an existing service worker
    await this.resetConfig();

    // Set PMTiles URL if provided
    if (this._pmtilesUrl) {
      await this.setPmtilesUrl(this._pmtilesUrl);
    }

    return this;
  }

  /**
   * Wait for the service worker to take control of the page.
   * @returns {Promise<void>}
   * @private
   */
  async _waitForController() {
    return new Promise((resolve) => {
      // Check if already controlling (race condition)
      if (navigator.serviceWorker.controller) {
        resolve();
        return;
      }

      let timeoutId;
      const onControllerChange = () => {
        clearTimeout(timeoutId);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      
      // Timeout fallback - check again in case we missed the event
      timeoutId = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve();
      }, this._controllerTimeout);
    });
  }

  /**
   * Check if the service worker is controlling the page.
   * @returns {boolean}
   */
  isControlling() {
    return !!navigator.serviceWorker.controller;
  }

  /**
   * Unregister the service worker.
   * @returns {Promise<boolean>}
   */
  async unregister() {
    if (this._registration) {
      return this._registration.unregister();
    }
    return false;
  }

  /**
   * Get the active service worker.
   * @returns {ServiceWorker|null}
   */
  getWorker() {
    return this._registration?.active ?? navigator.serviceWorker.controller;
  }

  /**
   * Send a message to the service worker.
   * @param {Object} message
   * @returns {Promise<any>}
   */
  async sendMessage(message) {
    const worker = this.getWorker();
    if (!worker) {
      throw new Error('Service worker not active');
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };
      worker.postMessage(message, [channel.port2]);
    });
  }

  /**
   * Add a layer config to the service worker.
   * @param {Object} layerConfig
   * @returns {Promise<void>}
   */
  async addLayerConfig(layerConfig) {
    // Use toJSON if available to properly serialize the config
    const serialized = typeof layerConfig.toJSON === 'function' 
      ? layerConfig.toJSON() 
      : layerConfig;
    await this.sendMessage({
      type: MessageTypes.ADD_LAYER_CONFIG,
      layerConfig: serialized,
    });
  }

  /**
   * Remove a layer config from the service worker.
   * @param {string} configId
   * @returns {Promise<void>}
   */
  async removeLayerConfig(configId) {
    await this.sendMessage({
      type: MessageTypes.REMOVE_LAYER_CONFIG,
      configId,
    });
  }

  /**
   * Set the PMTiles URL.
   * @param {string} pmtilesUrl
   * @returns {Promise<void>}
   */
  async setPmtilesUrl(pmtilesUrl) {
    await this.sendMessage({
      type: MessageTypes.SET_PMTILES_URL,
      pmtilesUrl,
    });
  }

  /**
   * Enable or disable the correction service.
   * @param {boolean} enabled
   * @returns {Promise<void>}
   */
  async setEnabled(enabled) {
    await this.sendMessage({
      type: MessageTypes.SET_ENABLED,
      enabled,
    });
  }

  /**
   * Set whether to return original tile if corrections fail.
   * @param {boolean} fallbackOnCorrectionFailure
   * @returns {Promise<void>}
   */
  async setFallbackOnCorrectionFailure(fallbackOnCorrectionFailure) {
    await this.sendMessage({
      type: MessageTypes.SET_FALLBACK_ON_CORRECTION_FAILURE,
      fallbackOnCorrectionFailure,
    });
  }

  /**
   * Set maximum features to cache.
   * @param {number} cacheMaxFeatures
   * @returns {Promise<void>}
   */
  async setCacheMaxFeatures(cacheMaxFeatures) {
    await this.sendMessage({
      type: MessageTypes.SET_CACHE_MAX_FEATURES,
      cacheMaxFeatures,
    });
  }

  /**
   * Clear the tile cache.
   * @returns {Promise<void>}
   */
  async clearCache() {
    await this.sendMessage({
      type: MessageTypes.CLEAR_CACHE,
    });
  }

  /**
   * Get the status of the service worker.
   * @returns {Promise<Object>}
   */
  async getStatus() {
    return this.sendMessage({
      type: MessageTypes.GET_STATUS,
    });
  }

  /**
   * Reset the service worker configuration to defaults.
   * Resets pmtilesUrl to default and restores default layer configs.
   * @returns {Promise<void>}
   */
  async resetConfig() {
    await this.sendMessage({
      type: MessageTypes.RESET_CONFIG,
    });
  }
}

/**
 * Register the correction service worker with simplified setup.
 * @param {string} workerUrl - URL to the service worker script
 * @param {Object} [options]
 * @param {string} [options.scope] - Service worker scope
 * @param {string} [options.pmtilesUrl] - PMTiles URL to set
 * @param {number} [options.controllerTimeout] - Timeout in ms to wait for SW control
 * @param {boolean} [options.forceReinstall] - Unregister existing SW before registering
 * @returns {Promise<CorrectionServiceWorker>}
 */
export async function registerCorrectionServiceWorker(workerUrl, options = {}) {
  const sw = new CorrectionServiceWorker(workerUrl, options);
  await sw.register();
  return sw;
}

