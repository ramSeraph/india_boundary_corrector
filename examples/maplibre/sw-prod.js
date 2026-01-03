// Service worker wrapper - imports the bundled worker from CDN
// This file exists in the examples directory to allow proper scoping
// NOTE: Using jsdelivr instead of unpkg because importScripts doesn't follow redirects
importScripts('https://cdn.jsdelivr.net/npm/@india-boundary-corrector/service-worker/dist/worker.global.js');
