import { LayerConfig } from '@india-boundary-corrector/layer-configs';

export { layerConfigs, LayerConfig } from '@india-boundary-corrector/layer-configs';
export { getPmtilesUrl } from '@india-boundary-corrector/data';

/**
 * Message types for communication with service worker
 */
export declare const MessageTypes: {
  ADD_LAYER_CONFIG: 'ADD_LAYER_CONFIG';
  REMOVE_LAYER_CONFIG: 'REMOVE_LAYER_CONFIG';
  SET_PMTILES_URL: 'SET_PMTILES_URL';
  SET_ENABLED: 'SET_ENABLED';
  CLEAR_CACHE: 'CLEAR_CACHE';
  GET_STATUS: 'GET_STATUS';
  RESET_CONFIG: 'RESET_CONFIG';
};

/**
 * Options for CorrectionServiceWorker
 */
export interface CorrectionServiceWorkerOptions {
  /** Service worker scope (defaults to workerUrl directory) */
  scope?: string;
  /** PMTiles URL to set after registration */
  pmtilesUrl?: string;
  /** Timeout in ms to wait for SW to take control (default: 3000) */
  controllerTimeout?: number;
}

/**
 * Status returned by getStatus()
 */
export interface ServiceWorkerStatus {
  enabled: boolean;
  pmtilesUrl: string;
  configIds: string[];
}

/**
 * Controller for the boundary correction service worker.
 */
export declare class CorrectionServiceWorker {
  constructor(workerUrl: string, options?: CorrectionServiceWorkerOptions);
  
  /** Register the service worker and wait for it to take control */
  register(): Promise<CorrectionServiceWorker>;
  
  /** Check if the service worker is controlling the page */
  isControlling(): boolean;
  
  /** Unregister the service worker */
  unregister(): Promise<boolean>;
  
  /** Get the active service worker */
  getWorker(): ServiceWorker | null;
  
  /** Send a message to the service worker */
  sendMessage(message: object): Promise<any>;
  
  /** Add a layer config to the service worker */
  addLayerConfig(layerConfig: LayerConfig): Promise<void>;
  
  /** Remove a layer config from the service worker */
  removeLayerConfig(configId: string): Promise<void>;
  
  /** Set the PMTiles URL */
  setPmtilesUrl(pmtilesUrl: string): Promise<void>;
  
  /** Enable or disable the correction service */
  setEnabled(enabled: boolean): Promise<void>;
  
  /** Clear the tile cache */
  clearCache(): Promise<void>;
  
  /** Get the status of the service worker */
  getStatus(): Promise<ServiceWorkerStatus>;
  
  /** Reset configuration to defaults (pmtilesUrl and layer configs) */
  resetConfig(): Promise<void>;
}

/**
 * Register the correction service worker.
 */
export declare function registerCorrectionServiceWorker(
  workerUrl: string,
  options?: CorrectionServiceWorkerOptions
): Promise<CorrectionServiceWorker>;
