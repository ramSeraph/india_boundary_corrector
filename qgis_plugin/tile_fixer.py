# -*- coding: utf-8 -*-
"""
Tile fixer module - applies boundary corrections to raster tiles.

Uses PMTiles for correction data and PIL/Pillow for image manipulation.
"""

import os
import struct
import gzip
from io import BytesIO

try:
    from PIL import Image, ImageDraw
except ImportError:
    Image = None
    ImageDraw = None

from .layer_configs import get_line_styles_for_zoom, get_line_width


class TileFixer:
    """Applies boundary corrections to raster tiles."""
    
    def __init__(self, plugin_dir):
        """Initialize the tile fixer.
        
        :param plugin_dir: Path to plugin directory containing data files
        """
        self.plugin_dir = plugin_dir
        self.pmtiles_path = os.path.join(plugin_dir, 'india_boundary_corrections.pmtiles')
        self._pmtiles = None
        self._header = None
        self._cache = {}
        
    def _ensure_pmtiles(self):
        """Ensure PMTiles file is loaded."""
        if self._pmtiles is not None:
            return
        
        if not os.path.exists(self.pmtiles_path):
            raise FileNotFoundError(f'PMTiles file not found: {self.pmtiles_path}')
        
        self._pmtiles = open(self.pmtiles_path, 'rb')
        self._header = self._read_header()
    
    def _read_header(self):
        """Read PMTiles header."""
        self._pmtiles.seek(0)
        magic = self._pmtiles.read(7)
        if magic != b'PMTiles':
            raise ValueError('Invalid PMTiles file')
        
        version = struct.unpack('<B', self._pmtiles.read(1))[0]
        if version != 3:
            raise ValueError(f'Unsupported PMTiles version: {version}')
        
        # Read header fields
        header_data = self._pmtiles.read(119)  # Rest of 127-byte header
        
        root_dir_offset = struct.unpack('<Q', header_data[0:8])[0]
        root_dir_length = struct.unpack('<Q', header_data[8:16])[0]
        json_metadata_offset = struct.unpack('<Q', header_data[16:24])[0]
        json_metadata_length = struct.unpack('<Q', header_data[24:32])[0]
        leaf_dirs_offset = struct.unpack('<Q', header_data[32:40])[0]
        leaf_dirs_length = struct.unpack('<Q', header_data[40:48])[0]
        tile_data_offset = struct.unpack('<Q', header_data[48:56])[0]
        tile_data_length = struct.unpack('<Q', header_data[56:64])[0]
        
        return {
            'root_dir_offset': root_dir_offset,
            'root_dir_length': root_dir_length,
            'json_metadata_offset': json_metadata_offset,
            'json_metadata_length': json_metadata_length,
            'leaf_dirs_offset': leaf_dirs_offset,
            'leaf_dirs_length': leaf_dirs_length,
            'tile_data_offset': tile_data_offset,
            'tile_data_length': tile_data_length,
            'internal_compression': header_data[71],
            'tile_compression': header_data[72],
            'tile_type': header_data[73],
            'min_zoom': header_data[74],
            'max_zoom': header_data[75],
        }
    
    def get_corrections(self, z, x, y):
        """Get correction features for a tile.
        
        :param z: Zoom level
        :param x: Tile X coordinate
        :param y: Tile Y coordinate
        :returns: Dict with layer names as keys and feature lists as values
        """
        cache_key = (z, x, y)
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            self._ensure_pmtiles()
            
            # For now, return empty corrections
            # Full PMTiles parsing with directory traversal is complex
            # TODO: Implement proper PMTiles tile lookup and MVT parsing
            corrections = {
                'to-add-osm': [],
                'to-del-osm': [],
                'to-add-ne': [],
                'to-del-ne': [],
            }
            
            self._cache[cache_key] = corrections
            return corrections
            
        except Exception as e:
            print(f'Error loading corrections for {z}/{x}/{y}: {e}')
            return {}
    
    def fix_tile(self, tile_data, config, z, x, y, tile_size=256):
        """Apply corrections to a raster tile.
        
        :param tile_data: Original tile image data (bytes)
        :param config: Layer config dict
        :param z: Zoom level
        :param x: Tile X coordinate
        :param y: Tile Y coordinate
        :param tile_size: Tile size in pixels
        :returns: Corrected tile data (bytes) or None if no corrections
        """
        if Image is None:
            print('PIL/Pillow not available - cannot apply corrections')
            return None
        
        # Get corrections for this tile
        corrections = self.get_corrections(z, x, y)
        if not corrections:
            return None
        
        # Determine which data source to use based on zoom
        zoom_threshold = config.get('zoomThreshold', 5)
        use_osm = z >= zoom_threshold
        add_layer = 'to-add-osm' if use_osm else 'to-add-ne'
        del_layer = 'to-del-osm' if use_osm else 'to-del-ne'
        
        add_features = corrections.get(add_layer, [])
        del_features = corrections.get(del_layer, [])
        
        # Skip if no corrections to apply
        if not add_features and not del_features:
            return None
        
        # Load the original tile image
        try:
            img = Image.open(BytesIO(tile_data))
            img = img.convert('RGBA')
        except Exception as e:
            print(f'Error loading tile image: {e}')
            return None
        
        draw = ImageDraw.Draw(img)
        
        # Get styling
        line_width_stops = config.get('lineWidthStops', {'1': 0.5, '10': 2.5})
        base_width = get_line_width(z, line_width_stops)
        del_width_factor = config.get('delWidthFactor', 1.5)
        
        # Apply deletion blur (simplified - just draw background color)
        # TODO: Implement proper median blur along path
        if del_features:
            del_width = base_width * del_width_factor
            for feature in del_features:
                self._draw_feature(draw, feature, (128, 128, 128, 255), del_width, tile_size)
        
        # Draw addition lines
        if add_features:
            line_styles = get_line_styles_for_zoom(config, z)
            for style in line_styles:
                color = self._parse_color(style.get('color', 'green'))
                width_fraction = style.get('widthFraction', 1.0)
                width = base_width * width_fraction
                
                for feature in add_features:
                    self._draw_feature(draw, feature, color, width, tile_size)
        
        # Save to bytes
        output = BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
    
    def _draw_feature(self, draw, feature, color, width, tile_size):
        """Draw a feature on the image.
        
        :param draw: PIL ImageDraw object
        :param feature: GeoJSON-like feature dict
        :param color: RGBA color tuple
        :param width: Line width
        :param tile_size: Tile size in pixels
        """
        geometry = feature.get('geometry', {})
        geom_type = geometry.get('type', '')
        coords = geometry.get('coordinates', [])
        
        if geom_type == 'LineString':
            self._draw_linestring(draw, coords, color, width, tile_size)
        elif geom_type == 'MultiLineString':
            for line in coords:
                self._draw_linestring(draw, line, color, width, tile_size)
    
    def _draw_linestring(self, draw, coords, color, width, tile_size):
        """Draw a linestring on the image.
        
        :param draw: PIL ImageDraw object
        :param coords: List of [x, y] coordinates (in tile space 0-extent)
        :param color: RGBA color tuple
        :param width: Line width
        :param tile_size: Tile size in pixels
        """
        if len(coords) < 2:
            return
        
        # Convert coordinates to pixel space
        # MVT coordinates are typically 0-4096, scale to tile_size
        extent = 4096
        points = []
        for coord in coords:
            x = coord[0] * tile_size / extent
            y = coord[1] * tile_size / extent
            points.append((x, y))
        
        # Draw line
        draw.line(points, fill=color, width=max(1, int(width)))
    
    def _parse_color(self, color_str):
        """Parse a CSS color string to RGBA tuple.
        
        :param color_str: CSS color string (rgb(), hex, or named)
        :returns: RGBA tuple
        """
        import re
        
        # Handle rgb() format
        rgb_match = re.match(r'rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', color_str)
        if rgb_match:
            return (int(rgb_match.group(1)), int(rgb_match.group(2)), int(rgb_match.group(3)), 255)
        
        # Handle hex format
        if color_str.startswith('#'):
            hex_color = color_str[1:]
            if len(hex_color) == 3:
                hex_color = ''.join(c * 2 for c in hex_color)
            if len(hex_color) == 6:
                return (int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16), 255)
        
        # Named colors (basic)
        named_colors = {
            'red': (255, 0, 0, 255),
            'green': (0, 128, 0, 255),
            'blue': (0, 0, 255, 255),
            'black': (0, 0, 0, 255),
            'white': (255, 255, 255, 255),
            'gray': (128, 128, 128, 255),
            'grey': (128, 128, 128, 255),
        }
        return named_colors.get(color_str.lower(), (0, 128, 0, 255))
    
    def close(self):
        """Close the PMTiles file."""
        if self._pmtiles is not None:
            self._pmtiles.close()
            self._pmtiles = None
