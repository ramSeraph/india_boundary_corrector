# -*- coding: utf-8 -*-
"""
Tile interceptor module - runs a local proxy server to intercept and modify tiles.

This approach uses a lightweight HTTP server that:
1. Receives tile requests from QGIS
2. Fetches the original tile from the upstream server
3. Applies boundary corrections
4. Returns the modified tile to QGIS
"""

import os
import re
import threading
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from io import BytesIO

from .layer_configs import LAYER_CONFIGS, match_url, extract_coords
from .tile_fixer import TileFixer


class TileProxyHandler(BaseHTTPRequestHandler):
    """HTTP request handler that proxies and modifies tile requests."""
    
    # Class-level references set by TileInterceptor
    tile_fixer = None
    plugin_dir = None
    
    def log_message(self, format, *args):
        """Suppress default logging."""
        pass
    
    def do_GET(self):
        """Handle GET requests for tiles."""
        # Path format: /proxy/{encoded_url}
        if not self.path.startswith('/proxy/'):
            self.send_error(404, 'Not Found')
            return
        
        # Decode the original URL
        encoded_url = self.path[7:]  # Remove '/proxy/'
        try:
            original_url = urllib.request.unquote(encoded_url)
        except Exception:
            self.send_error(400, 'Invalid URL encoding')
            return
        
        # Fetch original tile
        try:
            req = urllib.request.Request(original_url, headers={
                'User-Agent': 'QGIS India Boundary Corrector'
            })
            with urllib.request.urlopen(req, timeout=30) as response:
                original_data = response.read()
                content_type = response.headers.get('Content-Type', 'image/png')
        except urllib.error.URLError as e:
            self.send_error(502, f'Failed to fetch tile: {e}')
            return
        except Exception as e:
            self.send_error(500, f'Error: {e}')
            return
        
        # Check if URL matches a layer config and apply corrections
        config = match_url(original_url)
        corrected_data = original_data
        
        if config is not None:
            coords = extract_coords(original_url, config)
            if coords is not None:
                z, x, y = coords['z'], coords['x'], coords['y']
                
                # Apply corrections if above start zoom
                if z >= config.get('startZoom', 0):
                    try:
                        fixed = self.tile_fixer.fix_tile(original_data, config, z, x, y)
                        if fixed is not None:
                            corrected_data = fixed
                    except Exception as e:
                        print(f'India Boundary Corrector: Error fixing tile {z}/{x}/{y}: {e}')
        
        # Send response
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', len(corrected_data))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(corrected_data)


class TileInterceptor:
    """Manages tile interception via local proxy server."""

    def __init__(self, plugin_dir):
        """Initialize the interceptor.
        
        :param plugin_dir: Path to plugin directory containing data files
        """
        self.plugin_dir = plugin_dir
        self.tile_fixer = TileFixer(plugin_dir)
        self.server = None
        self.server_thread = None
        self.port = 19876  # Default port for proxy
        
        # Set class-level references for the handler
        TileProxyHandler.tile_fixer = self.tile_fixer
        TileProxyHandler.plugin_dir = plugin_dir

    def enable(self):
        """Start the proxy server."""
        if self.server is not None:
            return  # Already running
        
        # Find an available port
        for port in range(self.port, self.port + 100):
            try:
                self.server = HTTPServer(('127.0.0.1', port), TileProxyHandler)
                self.port = port
                break
            except OSError:
                continue
        else:
            raise RuntimeError('Could not find an available port for tile proxy')
        
        # Start server in background thread
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()
        
        print(f'India Boundary Corrector: Proxy server started on port {self.port}')

    def disable(self):
        """Stop the proxy server."""
        if self.server is not None:
            self.server.shutdown()
            self.server = None
            self.server_thread = None
            print('India Boundary Corrector: Proxy server stopped')

    def get_proxy_url(self, original_url):
        """Get the proxy URL for an original tile URL.
        
        :param original_url: The original tile server URL
        :returns: URL pointing to local proxy
        """
        encoded = urllib.request.quote(original_url, safe='')
        return f'http://127.0.0.1:{self.port}/proxy/{encoded}'

    @property
    def is_running(self):
        """Check if proxy server is running."""
        return self.server is not None

