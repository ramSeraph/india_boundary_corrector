/**
 * Main entry point - exports utilities for registering the service worker
 * from the main thread.
 */

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Message types for communication with service worker
 */
export const MessageTypes = {
  ADD_LAYER_CONFIG: 'ADD_LAYER_CONFIG',
  REMOVE_LAYER_CONFIG: 'REMOVE_LAYER_CONFIG',
  SET_PMTILES_URL: 'SET_PMTILES_URL',
  SET_ENABLED: 'SET_ENABLED',
  CLEAR_CACHE: 'CLEAR_CACHE',
  GET_STATUS: 'GET_STATUS',
  RESET_CONFIG: 'RESET_CONFIG',
};

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
   */
  constructor(workerUrl, options = {}) {
    this._workerUrl = workerUrl;
    this._scope = options.scope;
    this._pmtilesUrl = options.pmtilesUrl;
    this._controllerTimeout = options.controllerTimeout ?? 3000;
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
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      // Timeout fallback - SW may already be controlling after registration
      setTimeout(resolve, this._controllerTimeout);
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
 * @returns {Promise<CorrectionServiceWorker>}
 */
export async function registerCorrectionServiceWorker(workerUrl, options = {}) {
  const sw = new CorrectionServiceWorker(workerUrl, options);
  await sw.register();
  return sw;
}

/**
 * Get the importScripts snippet for a service worker file.
 * This can be used to create a minimal sw.js file.
 * @param {string} workerGlobalUrl - URL to the worker.global.js file
 * @returns {string} JavaScript code to put in sw.js
 * @example
 * // Create sw.js with:
 * // importScripts('https://unpkg.com/@india-boundary-corrector/service-worker/dist/worker.global.js');
 */
export function getWorkerImportSnippet(workerGlobalUrl) {
  return `importScripts('${workerGlobalUrl}');`;
}
